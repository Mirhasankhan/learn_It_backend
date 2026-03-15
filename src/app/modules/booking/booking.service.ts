import prisma from "../../../shared/prisma";
import ApiError from "../../../errors/ApiErrors";
import { refundMoyasarPayment } from "../../../helpers/moyasar.payment";
import { Request } from "express";
import { uploadInSpace } from "../../../shared/UploadHelper";
import { BookingStatus, UserRole } from "@prisma/client";
import { generateRoomId } from "../../../helpers/generateRoomId";
import { sendSingleNotification } from "../notifications/notification.services";
import { formatDate } from "../../../helpers/formatDate";
import {
  generateOrderId,
  generateSessionId,
  generateTransactionId,
} from "../../../helpers/generateOtp";
import {
  fifteenMinuteQueue,
  markExpiredQueue,
  oneHourQueue,
} from "../../../queues/subscription.queue";
import { jobIdForSubscription } from "../susbscription/subscription.service";
import { mergeDateAndTimeToISO } from "../../../helpers/mergerDateTime";

const createBookingIntoDB = async (req: Request) => {
  const payload = req.body;
  const file = req.file;
  const userId = req.user.id;

  const { serviceId } = payload;

  await prisma.user.findUniqueOrThrow({
    where: { id: userId },
  });
  const service = await prisma.service.findUniqueOrThrow({
    where: {
      id: serviceId,
    },
  });

  const processImage = async (file: Express.Multer.File, folder: string) => {
    if (!file) return null;
    return uploadInSpace(file, `courses/${folder}`);
  };

  const cvUrl = file ? await processImage(file, "cvUrl") : null;

  if (service.serviceType == "Cv" && !cvUrl) {
    throw new ApiError(400, "Cv is required");
  }
  if (service.serviceType == "LinkedIn" && !payload.linkedInUrl) {
    throw new ApiError(400, "LInkedin url is required");
  }
  // if (service.serviceType !== "Career" && !payload.note) {
  //   throw new ApiError(400, "Note is required");
  // }
  if (service.serviceType == "Career" && !payload.startTime) {
    throw new ApiError(400, "Date & start time is required");
  }

  // const orderId = generateReportId();
  const orderId =
    service.serviceType == "Career" ? generateSessionId() : generateOrderId();
  const transactionid = generateTransactionId();

  let deliveryTime = null;

  if (service.serviceType === "Cv" || service.serviceType === "LinkedIn") {
    const now = new Date();

    if (service.delivery === "Within 24 Hours") {
      deliveryTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    } else if (service.delivery === "Within 3 Days") {
      deliveryTime = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    } else if (service.delivery === "Within 7 Days") {
      deliveryTime = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }

    if (deliveryTime) {
      deliveryTime = deliveryTime.toISOString();
    }
  }

  let roomId = null;

  if (service.serviceType === "Career") {
    roomId = generateRoomId();
  }

  // Create booking
  const booking = await prisma.booking.create({
    data: {
      userId,
      serviceId,
      cvUrl,
      orderId,
      roomId,
      price: service.price,
      sessionDuration: service.duration ?? null,
      date: payload.date,
      transactionid,
      deliveryTime,
      startTime: payload.startTime,
      note: payload.note,
      linkedInUrl: payload.linkedInUrl,
      expertId: service.expertId as string,
    },
  });

  if (!booking) {
    throw new ApiError(400, "Booking failed");
  }

  return booking.id;
};

const rescheduleSessionIntoDB = async (payload: any) => {
  const session = await prisma.booking.findUniqueOrThrow({
    where: {
      id: payload.sessionId,
      service: { serviceType: { in: ["Career", "MockInterview"] } },
    },
    include: {
      service: true,
    },
  });

  // Calculate time difference to original session
  const now = new Date();
  const currentSessionDate = mergeDateAndTimeToISO(
    session.date as Date,
    session.startTime as string,
  );
  const diffHours = (currentSessionDate.getTime() - now.getTime()) / 3600000;

  // Store original date/time if rescheduling within 24 hours and not already stored
  const updateData: any = {
    date: payload.date ? payload.date : session.date,
    startTime: payload.startTime ? payload.startTime : session.startTime,
  };

  if (diffHours < 24 && !session.originalDate) {
    updateData.originalDate = session.date;
    updateData.originalStartTime = session.startTime;
  }

  await prisma.booking.update({
    where: { id: payload.sessionId },
    data: updateData,
  });

  // Remove old queue jobs and add new ones for rescheduled time
  if (session.date && payload.date) {
    const service = session.service;
    const oldMergedDate = mergeDateAndTimeToISO(
      session.date,
      session.startTime as string,
    );
    const newMergedDate = mergeDateAndTimeToISO(
      payload.date,
      payload.startTime || (session.startTime as string),
    );

    const fifteenMinutes = 195 * 60 * 1000;
    const oneHour = 4 * 60 * 60 * 1000;
    const durationMinutes = Number(service.duration?.split(" ")[0] ?? 0);

    // Remove old jobs
    const oldFifteenReminderAt = oldMergedDate.getTime() - fifteenMinutes;
    const oldOneHourReminderAt = oldMergedDate.getTime() - oneHour;
    const oldSessionExpiryAt =
      oldMergedDate.getTime() + durationMinutes * 60 * 1000 - 180 * 60 * 1000;

    await fifteenMinuteQueue.remove(
      jobIdForSubscription(session.id, oldFifteenReminderAt),
    );
    await oneHourQueue.remove(
      jobIdForSubscription(session.id, oldOneHourReminderAt),
    );
    await markExpiredQueue.remove(
      jobIdForSubscription(session.id, oldSessionExpiryAt),
    );

    // Add new jobs
    const newFifteenReminderAt = newMergedDate.getTime() - fifteenMinutes;
    const newFifteenDelay = newFifteenReminderAt - Date.now();
    const newOneHourReminderAt = newMergedDate.getTime() - oneHour;
    const newOneHourDelay = newOneHourReminderAt - Date.now();
    const newSessionExpiryAt =
      newMergedDate.getTime() + durationMinutes * 60 * 1000 - 180 * 60 * 1000;
    const newSessionExpiryDelay = newSessionExpiryAt - Date.now();

    await fifteenMinuteQueue.add(
      "fifteenMinuteReminder",
      { bookingId: session.id },
      {
        jobId: jobIdForSubscription(session.id, newFifteenReminderAt),
        delay: newFifteenDelay,
        attempts: 2,
        backoff: { type: "exponential", delay: 60 * 1000 },
      },
    );
    await oneHourQueue.add(
      "oneHourReminder",
      { bookingId: session.id },
      {
        jobId: jobIdForSubscription(session.id, newOneHourReminderAt),
        delay: newOneHourDelay,
        attempts: 2,
        backoff: { type: "exponential", delay: 60 * 1000 },
      },
    );
    await markExpiredQueue.add(
      "markExpired",
      { bookingId: session.id },
      {
        jobId: jobIdForSubscription(session.id, newSessionExpiryAt),
        delay: newSessionExpiryDelay,
        attempts: 2,
        backoff: { type: "exponential", delay: 60 * 1000 },
      },
    );
  }

  const userNotify = await prisma.notifyOption.findUniqueOrThrow({
    where: { userId: session.expertId },
  });
  const formattedDate = formatDate(payload.date);
  if (userNotify.all || userNotify.rescheduled) {
    try {
      await sendSingleNotification(
        "Session",
        session.expertId,
        `The user has rescheduled the session to ${formattedDate}.`,
        session.userId,
        "Session Rescheduled",
      );
    } catch (notificationError) {
      console.error("Notification failed:", notificationError);
    }
  }

  return;
};

const verifyPaymentStatus = async (
  status: string,
  bookingId: string,
  moyasarId: string,
  paymentMethod: string,
) => {
  const booking = await prisma.booking.findFirst({
    where: { id: bookingId },
  });

  if (!booking) {
    throw new ApiError(404, "Booking not found");
  }

  const service = await prisma.service.findUniqueOrThrow({
    where: { id: booking.serviceId },
  });

  const type = booking.startTime ? "Session" : "Order";

  if (status === "paid") {
    await prisma.booking.update({
      where: { id: booking.id },
      data: { isPayment: true, moyasarId, paymentMethod },
    });

    await prisma.room.create({
      data: {
        bookingId: booking.id,
        senderId: booking.userId,
        receiverId: booking.expertId,
      },
    });

    if (booking.date) {
      const fifteenMinutes = 195 * 60 * 1000;
      const oneHour = 4 * 60 * 60 * 1000;

      const mergedDate = mergeDateAndTimeToISO(booking.date, booking.startTime);

      const durationMinutes = Number(service.duration?.split(" ")[0] ?? 0);
      const sessionExpiryAt =
        mergedDate.getTime() + durationMinutes * 60 * 1000 - 180 * 60 * 1000;

      const fifteenReminderAt = mergedDate.getTime() - fifteenMinutes;
      const fifteenDelay = fifteenReminderAt - Date.now();
      const oneHourReminderAt = mergedDate.getTime() - oneHour;
      const oneHourDelay = oneHourReminderAt - Date.now();
      const sessionExpiryDelay = sessionExpiryAt - Date.now();

      await fifteenMinuteQueue.add(
        "fifteenMinuteReminder",
        { bookingId: booking.id },
        {
          jobId: jobIdForSubscription(booking.id, fifteenReminderAt),
          delay: fifteenDelay,
          attempts: 2,
          backoff: { type: "exponential", delay: 60 * 1000 },
        },
      );
      await markExpiredQueue.add(
        "markExpired",
        { bookingId: booking.id },
        {
          jobId: jobIdForSubscription(booking.id, sessionExpiryAt),
          delay: sessionExpiryDelay,
          attempts: 2,
          backoff: { type: "exponential", delay: 60 * 1000 },
        },
      );
      await oneHourQueue.add(
        "oneHourReminder",
        { bookingId: booking.id },
        {
          jobId: jobIdForSubscription(booking.id, oneHourReminderAt),
          delay: oneHourDelay,
          attempts: 2,
          backoff: { type: "exponential", delay: 60 * 1000 },
        },
      );
    }

    const userNotify = await prisma.notifyOption.findUniqueOrThrow({
      where: { userId: booking.expertId },
    });

    if (userNotify.all || userNotify.newSession) {
      try {
        await sendSingleNotification(
          type,
          booking.expertId,
          type === "Session"
            ? `Great News! You’ve received a new Session. Take note and get ready to follow up.`
            : `Great News! You’ve received a new Order. Review the details and start processing it.`,
          booking.userId,
          `New ${type === "Session" ? "Session Booking" : "Order Booking"}`,
          booking.id,
        );
      } catch (notificationError) {
        console.error("Notification failed:", notificationError);
      }
    }
  } else {
    await prisma.booking.delete({
      where: { id: booking.id },
    });
  }

  return;
};

const createBookingUsingFreeSessionIntoDB = async (
  userId: string,
  payload: any,
) => {
  await prisma.user.findUniqueOrThrow({
    where: { id: userId, role: "USER" },
  });
  const service = await prisma.service.findUniqueOrThrow({
    where: { id: payload.serviceId, serviceType: "Career" },
  });

  const userSubscription = await prisma.userSubscription.findUniqueOrThrow({
    where: { userId, status: true },
  });

  if (userSubscription.availableFreeSession < 1) {
    throw new ApiError(400, "You don't have any free session");
  }

  const booking = await prisma.booking.create({
    data: {
      userId,
      date: payload.date,
      orderId: "sdfsdf",
      startTime: payload.startTime,
      expertId: service.expertId as string,
      serviceId: payload.serviceId,
      price: service.price,
      isPayment: true,
      paymentMethod: "Free-Session",
    },
  });

  // Create chat room for this booking
  // senderId = job seeker (userId), receiverId = expert (expertId)
  await prisma.room.create({
    data: {
      bookingId: booking.id,
      senderId: userId, // Job seeker
      receiverId: service.expertId as string, // Expert
    },
  });

  await prisma.userSubscription.update({
    where: { id: userSubscription.id },
    data: {
      availableFreeSession: { decrement: 1 },
    },
  });
  return;
};

const getJobSeekerWiseOrdersFromDB = async (userId: string) => {
  await prisma.user.findUniqueOrThrow({
    where: { id: userId, role: "USER" },
  });

  const orders = await prisma.booking.findMany({
    where: {
      userId,
      isPayment: true,
      service: {
        serviceType: {
          in: ["Cv", "LinkedIn"],
        },
      },
    },
    select: {
      id: true,
      expert: {
        select: {
          id: true,
          userName: true,
          profileImage: true,
        },
      },
      status: true,
      orderId: true,
      createdAt: true,
      isReviewed: true,
      service: {
        select: {
          serviceName: true,
        },
      },
      rooms: {
        select: {
          isFlagged: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return orders;
};

const getExpertWiseOrdersFromDB = async (expertId: string) => {
  await prisma.user.findUniqueOrThrow({
    where: { id: expertId, role: "EXPERT" },
  });

  const orders = await prisma.booking.findMany({
    where: {
      expertId,
      isPayment: true,
      service: {
        serviceType: {
          in: ["Cv", "LinkedIn"],
        },
      },
    },
    select: {
      id: true,
      seeker: {
        select: {
          id: true,
          userName: true,
          profileImage: true,
        },
      },
      status: true,
      createdAt: true,
      orderId: true,
      service: {
        select: {
          serviceName: true,
        },
      },
      rooms: {
        select: {
          isFlagged: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return orders;
};

const getJobSeekerWiseSessionsFromDB = async (
  userId: string,
  status?: BookingStatus,
) => {
  await prisma.user.findUniqueOrThrow({
    where: { id: userId, role: "USER" },
  });

  const orders = await prisma.booking.findMany({
    where: {
      userId,
      isPayment: true,
      service: {
        serviceType: {
          in: ["Career", "MockInterview"],
        },
      },
      ...(status && { status }),
    },
    select: {
      id: true,
      date: true,
      startTime: true,
      roomId: true,
      price: true,
      paymentMethod: true,
      sessionDuration: true,
      originalDate: true,
      originalStartTime: true,
      orderId: true,
      cancelledBy: true,
      refundedAmount: true,
      isReviewed: true,
      expert: {
        select: {
          id: true,
          userName: true,
          profileImage: true,
          avgRating: true,
          ExpertProfile: {
            select: {
              experience: true,
              targetIndustry: true,
            },
          },
        },
      },
      feedbacks: {
        select: {
          id: true,
        },
      },
      status: true,
      createdAt: true,
      service: {
        select: {
          serviceName: true,
          duration: true,
        },
      },
      recordings: {
        select: {
          userDuration: true,
        },
      },
      rooms: {
        select: {
          isFlagged: true,
        },
      },
    },

    orderBy: {
      createdAt: "desc",
    },
  });

  return orders;
};
const getExpertWiseSessionsFromDB = async (
  expertId: string,
  status?: BookingStatus,
) => {
  await prisma.user.findUniqueOrThrow({
    where: { id: expertId, role: "EXPERT" },
  });

  const orders = await prisma.booking.findMany({
    where: {
      expertId,
      isPayment: true,
      service: {
        serviceType: {
          in: ["Career", "MockInterview"],
        },
      },
      ...(status && { status }),
    },
    select: {
      id: true,
      date: true,
      startTime: true,
      orderId: true,
      price: true,
      roomId: true,
      originalDate: true,
      originalStartTime: true,
      sessionDuration: true,
      compensationAmount: true,
      cancelledBy: true,
      penaltyAmount: true,
      isFeedbackGiven: true,
      paymentMethod: true,
      seeker: {
        select: {
          id: true,
          userName: true,
          profileImage: true,
          avgRating: true,
          ExpertProfile: {
            select: {
              experience: true,
              targetIndustry: true,
            },
          },
        },
      },
      feedbacks: {
        select: {
          id: true,
        },
      },
      status: true,
      createdAt: true,
      service: {
        select: {
          serviceName: true,
        },
      },
      recordings: {
        select: {
          expertDuration: true,
        },
      },
      rooms: {
        select: {
          isFlagged: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return orders;
};

const getOrderDetailsFromDB = async (userId: string, orderId: string) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
  });

  const relationKey = user.role === "USER" ? "expert" : "seeker";
  // const profileKey = user.role === "USER" ? "ExpertProfile" : "UserProfile";

  const select: any = {
    id: true,
    status: true,
    createdAt: true,
    cvUrl: true,
    linkedInUrl: true,
    deliveryTime: true,
    orderId: true,
    isReviewed: true,
    updatedAt: true,
    note: true,
    service: {
      select: {
        serviceName: true,
        serviceType: true,
      },
    },
    rooms: {
      select: {
        isFlagged: true,
      },
    },
  };

  select[relationKey] = {
    select: {
      id: true,
      userName: true,
      profileImage: true,
    },
  };

  const order = await prisma.booking.findUniqueOrThrow({
    where: { id: orderId },
    select,
  });

  return order;
};
const getSessionDetailsFromDB = async (userId: string, sessionId: string) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
  });

  const relationKey = user.role === "USER" ? "expert" : "seeker";
  const profileKey = user.role === "USER" ? "ExpertProfile" : "UserProfile";

  const select: any = {
    id: true,
    status: true,
    createdAt: true,
    updatedAt: true,
    startTime: true,
    refundedAmount: true,
    compensationAmount: true,
    cancelledBy: true,
    sessionDuration: true,
    penaltyAmount: true,
    originalDate: true,
    originalStartTime: true,
    date: true,
    service: {
      select: {
        serviceName: true,
        duration: true,
      },
    },
    rooms: {
      select: {
        isFlagged: true,
      },
    },
    recordings: {
      select: {
        userfileUrl: true,
        createdAt: true,
        userDuration: true,
        expertDuration: true,
        expertfileUrl: true,
        userFileExpireAt: true,
      },
    },
    feedbacks: true,
  };

  select[relationKey] = {
    select: {
      id: true,
      userName: true,
      avgRating: true,
      profileImage: true,
      [profileKey]: {
        select: {
          experience: true,
          targetIndustry: true,
        },
      },
    },
  };

  const session = await prisma.booking.findUniqueOrThrow({
    where: {
      id: sessionId,
      service: {
        serviceType: {
          in: ["Career", "MockInterview"],
        },
      },
    },
    select,
  });

  return session;
};

const giveFeedbackToSession = async (payload: any) => {
  const booking = await prisma.booking.findUniqueOrThrow({
    where: {
      id: payload.bookingId,
      service: {
        serviceType: {
          in: ["Career", "MockInterview"],
        },
      },
    },
  });

  await prisma.feedback.create({
    data: {
      ...payload,
    },
  });

  await prisma.booking.update({
    where: { id: payload.bookingId },
    data: { isFeedbackGiven: true },
  });

  const userNotify = await prisma.notifyOption.findUniqueOrThrow({
    where: { userId: booking.userId },
  });
  if (userNotify.all || userNotify.review) {
    try {
      await sendSingleNotification(
        "Feedback",
        booking.userId,
        `Your expert has shared fresh insights on your recent session. Tap to review and improve your next steps.`,
        booking.expertId,
        "New Feedback from Your Expert!",
        booking.id,
      );
    } catch (notificationError) {
      console.error("Notification failed:", notificationError);
    }
  }
  return;
};

const markOrderCompletedIntoDB = async (bookingId: string) => {
  const booking = await prisma.booking.findUniqueOrThrow({
    where: { id: bookingId },
  });

  if (booking.status === "Completed" || booking.status === "Cancelled") {
    throw new ApiError(409, `Order already ${booking.status.toLowerCase()}.`);
  }

  const expert = await prisma.user.findUniqueOrThrow({
    where: { id: booking.expertId },
  });

  let amount = 0;

  if (expert.subscriptionType == "Free") {
    amount = Math.round(booking.price * 0.85);
  } else if (expert.subscriptionType == "Monthly") {
    amount = Math.round(booking.price * 0.9);
  } else if (expert.subscriptionType == "Yearly") {
    amount = Math.round(booking.price * 0.95);
  }

  await prisma.$transaction(async (tx) => {
    await tx.service.findUniqueOrThrow({
      where: { id: booking.serviceId },
    });

    await tx.booking.update({
      where: { id: bookingId },
      data: { status: "Completed" },
    });

    await tx.expertProfile.update({
      where: { userId: booking.expertId },
      data: {
        currentEarnings: { increment: amount },
        allTimeEarnings: { increment: amount },
      },
    });

    await tx.earnings.create({
      data: {
        expertId: booking.expertId,
        bookingId: booking.id,
        amount: amount,
      },
    });
    await tx.adminEarnings.create({
      data: {
        bookingId: booking.id,
        earningType: "Order",
        amount: booking.price - amount,
      },
    });
  });

  const userNotify = await prisma.notifyOption.findUniqueOrThrow({
    where: { userId: booking.userId },
  });

  if (userNotify.all || userNotify.cancelled) {
    try {
      await sendSingleNotification(
        "Order",
        booking.userId,
        `Expert has marked your order as completed`,
        booking.expertId,
        `Order Completed`,
        booking.id,
      );
    } catch (notificationError) {
      console.error("Notification failed:", notificationError);
    }
  }

  return;
};

const markSessionRecordingInProgress = async (bookingId: string) => {
  await prisma.booking.findUniqueOrThrow({
    where: { id: bookingId, status: "In_Progress" },
  });

  await prisma.booking.update({
    where: { id: bookingId },
    data: { status: "Recording_Progress" },
  });

  return;
};

const markSessionCompletedIntoDB = async (bookingId: string) => {
  return await prisma.$transaction(async (tx) => {
    const booking = await tx.booking.findUniqueOrThrow({
      where: { id: bookingId },
    });

    if (booking.status === "Completed" || booking.status === "Cancelled") {
      throw new ApiError(409, `Order already ${booking.status.toLowerCase()}.`);
    }
    const expert = await prisma.user.findUniqueOrThrow({
      where: { id: booking.expertId },
    });

    const service = await prisma.service.findUniqueOrThrow({
      where: { id: booking.serviceId },
    });

    let amount = 0;

    if (expert.subscriptionType == "Free") {
      if (service.serviceType == "MockInterview") {
        amount = Math.round(booking.price * 0.6);
      } else {
        amount = Math.round(booking.price * 0.85);
      }
    } else if (expert.subscriptionType == "Monthly") {
      if (service.serviceType == "MockInterview") {
        amount = Math.round(booking.price * 0.75);
      } else {
        amount = Math.round(booking.price * 0.9);
      }
    } else if (expert.subscriptionType == "Yearly") {
      if (service.serviceType == "MockInterview") {
        amount = Math.round(booking.price * 0.8);
      } else {
        amount = Math.round(booking.price * 0.95);
      }
    }

    await tx.service.findUniqueOrThrow({
      where: { id: booking.serviceId },
    });

    await tx.booking.update({
      where: { id: bookingId },
      data: { status: "Completed" },
    });

    await tx.expertProfile.update({
      where: { userId: booking.expertId },
      data: {
        currentEarnings: { increment: amount },
        allTimeEarnings: { increment: amount },
      },
    });

    await tx.earnings.create({
      data: {
        expertId: booking.expertId,
        amount: amount,
        bookingId: booking.id,
      },
    });
    await tx.adminEarnings.create({
      data: {
        bookingId: booking.id,
        earningType: "Session",
        amount: booking.price - amount,
      },
    });
  });
};

const cancelOrderFromDB = async (orderId: string) => {
  const order = await prisma.booking.findUniqueOrThrow({
    where: {
      id: orderId,
      service: { serviceType: { not: "Career" } },
      status: "In_Progress",
    },
  });

  const response = await refundMoyasarPayment(order.moyasarId as string);

  if (response.status == "refunded") {
    await prisma.booking.update({
      where: { id: orderId },
      data: { status: "Cancelled", refundedAmount: order.price },
    });
    await prisma.refund.create({
      data: {
        bookingId: order.id,
        amount: order.price,
      },
    });
    const userNotify = await prisma.notifyOption.findUniqueOrThrow({
      where: { userId: order.expertId },
    });

    if (userNotify.all || userNotify.cancelled) {
      try {
        await sendSingleNotification(
          "Order",
          order.userId,
          `Your order has been marked as cancelled by the expert.`,
          order.expertId,
          "Order Cancelled",
          order.id,
        );
      } catch (notificationError) {
        console.error("Notification failed:", notificationError);
      }
    }
    return;
  } else {
    throw new ApiError(400, `${response.message}`);
  }
};

const cancelSessionFromDB = async (sessionId: string, userId: string) => {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

  const session = await prisma.booking.findUniqueOrThrow({
    where: { id: sessionId },
    include: {
      expert: true,
      service: true,
    },
  });

  if (!session.date) throw new ApiError(404, "Session not found");

  const cancelledBy = user.role as UserRole;

  const mergedDate = mergeDateAndTimeToISO(session.date, session.startTime);

  const fifteenMinutes = 195 * 60 * 1000;
  const oneHour = 4 * 60 * 60 * 1000;
  const durationMinutes = Number(session.service.duration?.split(" ")[0] ?? 0);

  const fifteenReminderAt = mergedDate.getTime() - fifteenMinutes;
  const oneHourReminderAt = mergedDate.getTime() - oneHour;
  const sessionExpiryAt = mergedDate.getTime() + durationMinutes * 60 * 1000;

  const fifteenJobId = jobIdForSubscription(session.id, fifteenReminderAt);
  const oneHourJobId = jobIdForSubscription(session.id, oneHourReminderAt);
  const expiredJobId = jobIdForSubscription(session.id, sessionExpiryAt);

  if (session.paymentMethod === "Free Session") {
    await prisma.booking.update({
      where: { id: sessionId },
      data: {
        status: "Cancelled",
        cancelledBy,
      },
    });

    await prisma.userSubscription.update({
      where: { userId: session.userId },
      data: { availableFreeSession: { increment: 1 } },
    });

    await fifteenMinuteQueue.remove(fifteenJobId);
    await oneHourQueue.remove(oneHourJobId);
    await markExpiredQueue.remove(expiredJobId);

    return;
  }

  const now = new Date();

  // Use original date/time if exists (was rescheduled within 24 hours), otherwise use current
  const dateForPenalty = session.originalDate || session.date;
  const timeForPenalty = session.originalStartTime || session.startTime;

  const sessionDate = mergeDateAndTimeToISO(dateForPenalty, timeForPenalty);
  const diffHours = (sessionDate.getTime() - now.getTime()) / 3600000;

  // -------- STEP 1: penalty calculation --------
  let penaltyAmount = 0;

  if (cancelledBy === "USER") {
    if (diffHours < 6) penaltyAmount = Math.round(session.price);
    else if (diffHours < 12) penaltyAmount = Math.round(session.price * 0.5);
    else if (diffHours < 24) penaltyAmount = Math.round(session.price * 0.25);
  }

  if (cancelledBy === "EXPERT") {
    if (diffHours < 6) penaltyAmount = Math.round(session.price * 0.5);
    else if (diffHours < 12) penaltyAmount = Math.round(session.price * 0.25);
    else if (diffHours < 24) penaltyAmount = Math.round(session.price * 0.1);
  }

  // -------- STEP 2: settlement amounts --------
  let userRefund = 0;
  let expertCompensation = 0;
  let adminEarnings = 0;

  if (cancelledBy === "USER") {
    userRefund = session.price - penaltyAmount;

    if (penaltyAmount > 0) {
      const expert = session.expert;
      const service = session.service;

      let compensationRate = 0;

      if (expert.subscriptionType === "Free") {
        compensationRate = service.serviceType === "MockInterview" ? 0.6 : 0.85;
      } else if (expert.subscriptionType === "Monthly") {
        compensationRate = service.serviceType === "MockInterview" ? 0.75 : 0.9;
      } else {
        compensationRate = service.serviceType === "MockInterview" ? 0.8 : 0.95;
      }

      expertCompensation = Math.round(penaltyAmount * compensationRate);
      expertCompensation = Math.min(expertCompensation, penaltyAmount);
    }
  }

  if (cancelledBy === "EXPERT") {
    userRefund = session.price;
    adminEarnings = penaltyAmount;
  }

  adminEarnings = Math.round(session.price - userRefund - expertCompensation);

  // -------- STEP 3: refund first --------
  const refundResponse = await refundMoyasarPayment(
    session.moyasarId as string,
    userRefund * 100,
  );

  if (refundResponse.status !== "refunded") {
    throw new ApiError(400, refundResponse.message);
  }

  // -------- STEP 4: transactional state update --------
  await prisma.$transaction(async (tx) => {
    if (cancelledBy === "EXPERT" && penaltyAmount > 0) {
      const profile = await tx.expertProfile.findUniqueOrThrow({
        where: { userId: session.expertId },
      });

      if (profile.currentEarnings < penaltyAmount) {
        throw new ApiError(400, "Not enough balance for penalty deduction");
      }

      await tx.expertProfile.update({
        where: { userId: session.expertId },
        data: {
          currentEarnings: { decrement: penaltyAmount },
          allTimeEarnings: { decrement: penaltyAmount },
        },
      });
    }

    if (expertCompensation > 0) {
      await tx.earnings.create({
        data: {
          amount: expertCompensation,
          bookingId: session.id,
          expertId: session.expertId,
        },
      });

      await tx.expertProfile.update({
        where: { userId: session.expertId },
        data: {
          currentEarnings: { increment: expertCompensation },
          allTimeEarnings: { increment: expertCompensation },
        },
      });
    }

    if (adminEarnings > 0) {
      await tx.adminEarnings.create({
        data: {
          amount: adminEarnings,
          earningType: "Session",
          bookingId: session.id,
        },
      });
    }

    await tx.booking.update({
      where: { id: sessionId },
      data: {
        status: "Cancelled",
        cancelledBy,
        refundedAmount: userRefund,
        penaltyAmount: user.role == "EXPERT" ? penaltyAmount : 0,
        compensationAmount: expertCompensation,
      },
    });

    if (userRefund > 0) {
      await tx.refund.create({
        data: {
          bookingId: session.id,
          amount: userRefund,
        },
      });
    }
  });

  // -------- STEP 5: notification --------
  const notifyID = cancelledBy === "USER" ? session.expertId : session.userId;

  const notify = await prisma.notifyOption.findUniqueOrThrow({
    where: { userId: notifyID },
  });

  if (notify.all || notify.cancelled) {
    await sendSingleNotification(
      "Session",
      notifyID,
      `${user.userName} cancelled the session`,
      user.id,
      "Session Cancelled",
      session.id,
    );
  }

  //remove the scheduled jobs

  await fifteenMinuteQueue.remove(fifteenJobId);
  await oneHourQueue.remove(oneHourJobId);
  await markExpiredQueue.remove(expiredJobId);
  return;
};

export const bookingServices = {
  createBookingIntoDB,
  cancelSessionFromDB,
  getJobSeekerWiseOrdersFromDB,
  getExpertWiseOrdersFromDB,
  getJobSeekerWiseSessionsFromDB,
  markSessionCompletedIntoDB,
  getExpertWiseSessionsFromDB,
  getSessionDetailsFromDB,
  createBookingUsingFreeSessionIntoDB,
  markSessionRecordingInProgress,
  rescheduleSessionIntoDB,
  getOrderDetailsFromDB,
  cancelOrderFromDB,
  markOrderCompletedIntoDB,
  giveFeedbackToSession,
  verifyPaymentStatus,
};

// const rescheduleSessionIntoDB = async (payload: any) => {
//   const session = await prisma.booking.findUniqueOrThrow({
//     where: {
//       id: payload.sessionId,
//       service: { serviceType: { in: ["Career", "MockInterview"] } },
//     },
//   });

//   await prisma.booking.update({
//     where: { id: payload.sessionId },
//     data: {
//       date: payload.date ? payload.date : session.date,
//       startTime: payload.startTime ? payload.startTime : session.startTime,
//     },
//   });

//   const userNotify = await prisma.notifyOption.findUniqueOrThrow({
//     where: { userId: session.expertId },
//   });
//   const formattedDate = formatDate(payload.date);
//   if (userNotify.all || userNotify.rescheduled) {
//     try {
//       await sendSingleNotification(
//         "Session",
//         session.expertId,
//         `The user has rescheduled the session to ${formattedDate}.`,
//         session.userId,
//         "Session Rescheduled",
//       );
//     } catch (notificationError) {
//       console.error("Notification failed:", notificationError);
//     }
//   }

//   return;
// };

// const cancelSessionFromDB = async (sessionId: string, userId: string) => {
//   const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

//   const session = await prisma.booking.findUniqueOrThrow({
//     where: { id: sessionId },
//     include: {
//       expert: true,
//       service: true,
//     },
//   });

//   if (!session.date) throw new ApiError(404, "Session not found");

//   const cancelledBy = user.role as UserRole;

//   const mergedDate = mergeDateAndTimeToISO(session.date, session.startTime);

//   const fifteenMinutes = 195 * 60 * 1000;
//   const oneHour = 4 * 60 * 60 * 1000;

//   const fifteenReminderAt = mergedDate.getTime() - fifteenMinutes;
//   const oneHourReminderAt = mergedDate.getTime() - oneHour;

//   const fifteenJobId = jobIdForSubscription(session.id, fifteenReminderAt);
//   const oneHourJobId = jobIdForSubscription(session.id, oneHourReminderAt);

//   if (session.paymentMethod === "Free Session") {
//     await prisma.booking.update({
//       where: { id: sessionId },
//       data: {
//         status: "Cancelled",
//         cancelledBy,
//       },
//     });

//     await prisma.userSubscription.update({
//       where: { userId: session.userId },
//       data: { availableFreeSession: { increment: 1 } },
//     });

//     await fifteenMinuteQueue.remove(fifteenJobId);
//     await oneHourQueue.remove(oneHourJobId);

//     return;
//   }

//   const now = new Date();
//   const sessionDate = mergeDateAndTimeToISO(session.date, session.startTime);
//   const diffHours = (sessionDate.getTime() - now.getTime()) / 3600000;

//   // -------- STEP 1: penalty calculation --------
//   let penaltyAmount = 0;

//   if (cancelledBy === "USER") {
//     if (diffHours < 6) penaltyAmount = Math.round(session.price);
//     else if (diffHours < 12) penaltyAmount = Math.round(session.price * 0.5);
//     else if (diffHours < 24) penaltyAmount = Math.round(session.price * 0.25);
//   }

//   if (cancelledBy === "EXPERT") {
//     if (diffHours < 6) penaltyAmount = Math.round(session.price * 0.5);
//     else if (diffHours < 12) penaltyAmount = Math.round(session.price * 0.25);
//     else if (diffHours < 24) penaltyAmount = Math.round(session.price * 0.1);
//   }

//   // -------- STEP 2: settlement amounts --------
//   let userRefund = 0;
//   let expertCompensation = 0;
//   let adminEarnings = 0;

//   if (cancelledBy === "USER") {
//     userRefund = session.price - penaltyAmount;

//     if (penaltyAmount > 0) {
//       const expert = session.expert;
//       const service = session.service;

//       let compensationRate = 0;

//       if (expert.subscriptionType === "Free") {
//         compensationRate = service.serviceType === "MockInterview" ? 0.6 : 0.85;
//       } else if (expert.subscriptionType === "Monthly") {
//         compensationRate = service.serviceType === "MockInterview" ? 0.75 : 0.9;
//       } else {
//         compensationRate = service.serviceType === "MockInterview" ? 0.8 : 0.95;
//       }

//       expertCompensation = Math.round(penaltyAmount * compensationRate);
//       expertCompensation = Math.min(expertCompensation, penaltyAmount);
//     }
//   }

//   if (cancelledBy === "EXPERT") {
//     userRefund = session.price;
//     adminEarnings = penaltyAmount;
//   }

//   adminEarnings = Math.round(session.price - userRefund - expertCompensation);

//   // -------- STEP 3: refund first --------
//   const refundResponse = await refundMoyasarPayment(
//     session.moyasarId as string,
//     userRefund * 100,
//   );

//   if (refundResponse.status !== "refunded") {
//     throw new ApiError(400, refundResponse.message);
//   }

//   // -------- STEP 4: transactional state update --------
//   await prisma.$transaction(async (tx) => {
//     if (cancelledBy === "EXPERT" && penaltyAmount > 0) {
//       const profile = await tx.expertProfile.findUniqueOrThrow({
//         where: { userId: session.expertId },
//       });

//       if (profile.currentEarnings < penaltyAmount) {
//         throw new ApiError(400, "Not enough balance for penalty deduction");
//       }

//       await tx.expertProfile.update({
//         where: { userId: session.expertId },
//         data: {
//           currentEarnings: { decrement: penaltyAmount },
//           allTimeEarnings: { decrement: penaltyAmount },
//         },
//       });
//     }

//     if (expertCompensation > 0) {
//       await tx.earnings.create({
//         data: {
//           amount: expertCompensation,
//           bookingId: session.id,
//           expertId: session.expertId,
//         },
//       });

//       await tx.expertProfile.update({
//         where: { userId: session.expertId },
//         data: {
//           currentEarnings: { increment: expertCompensation },
//           allTimeEarnings: { increment: expertCompensation },
//         },
//       });
//     }

//     if (adminEarnings > 0) {
//       await tx.adminEarnings.create({
//         data: {
//           amount: adminEarnings,
//           earningType: "Session",
//           bookingId: session.id,
//         },
//       });
//     }

//     await tx.booking.update({
//       where: { id: sessionId },
//       data: {
//         status: "Cancelled",
//         cancelledBy,
//         refundedAmount: userRefund,
//         penaltyAmount: user.role == "EXPERT" ? penaltyAmount : 0,
//         compensationAmount: expertCompensation,
//       },
//     });

//     if (userRefund > 0) {
//       await tx.refund.create({
//         data: {
//           bookingId: session.id,
//           amount: userRefund,
//         },
//       });
//     }
//   });

//   // -------- STEP 5: notification --------
//   const notifyID = cancelledBy === "USER" ? session.expertId : session.userId;

//   const notify = await prisma.notifyOption.findUniqueOrThrow({
//     where: { userId: notifyID },
//   });

//   if (notify.all || notify.cancelled) {
//     await sendSingleNotification(
//       "Session",
//       notifyID,
//       `${user.userName} cancelled the session`,
//       user.id,
//       "Session Cancelled",
//       session.id,
//     );
//   }

//   //remove the scheduled jobs

//   await fifteenMinuteQueue.remove(fifteenJobId);
//   await oneHourQueue.remove(oneHourJobId);
//   return;
// };

// const cancelSessionByJobSeekerFromDB = async (
//   sessionId: string,
//   userId: string,
// ) => {
//   const user = await prisma.user.findUniqueOrThrow({
//     where: { id: userId, role: "USER" },
//   });

//   const session = await prisma.booking.findUniqueOrThrow({
//     where: { id: sessionId },
//     include: {
//       expert: true,
//       service: true,
//     },
//   });

//   if (!session.date) throw new ApiError(404, "Session not found");

//   const cancelledBy = "USER" as UserRole;

//   const mergedDate = mergeDateAndTimeToISO(session.date, session.startTime);

//   const fifteenMinutes = 195 * 60 * 1000;
//   const oneHour = 4 * 60 * 60 * 1000;

//   const fifteenReminderAt = mergedDate.getTime() - fifteenMinutes;
//   const oneHourReminderAt = mergedDate.getTime() - oneHour;

//   const fifteenJobId = jobIdForSubscription(session.id, fifteenReminderAt);
//   const oneHourJobId = jobIdForSubscription(session.id, oneHourReminderAt);

//   if (session.paymentMethod === "Free Session") {
//     await prisma.booking.update({
//       where: { id: sessionId },
//       data: {
//         status: "Cancelled",
//         cancelledBy,
//       },
//     });

//     await fifteenMinuteQueue.remove(fifteenJobId);
//     await oneHourQueue.remove(oneHourJobId);

//     await prisma.userSubscription.update({
//       where: { userId: session.userId },
//       data: { availableFreeSession: { increment: 1 } },
//     });

//     return;
//   }

//   const now = new Date();
//   const sessionDate = mergeDateAndTimeToISO(session.date, session.startTime);
//   const diffHours = (sessionDate.getTime() - now.getTime()) / 3600000;

//   // -------- STEP 1: penalty calculation (USER) --------
//   let penaltyAmount = 0;

//   if (diffHours < 6) penaltyAmount = Math.round(session.price);
//   else if (diffHours < 12) penaltyAmount = Math.round(session.price * 0.5);
//   else if (diffHours < 24) penaltyAmount = Math.round(session.price * 0.25);

//   // -------- STEP 2: settlement amounts --------
//   let userRefund = session.price - penaltyAmount;
//   let expertCompensation = 0;

//   if (penaltyAmount > 0) {
//     const expert = session.expert;
//     const service = session.service;

//     let compensationRate = 0;

//     if (expert.subscriptionType === "Free") {
//       compensationRate = service.serviceType === "MockInterview" ? 0.6 : 0.85;
//     } else if (expert.subscriptionType === "Monthly") {
//       compensationRate = service.serviceType === "MockInterview" ? 0.75 : 0.9;
//     } else {
//       compensationRate = service.serviceType === "MockInterview" ? 0.8 : 0.95;
//     }

//     expertCompensation = Math.round(penaltyAmount * compensationRate);
//     expertCompensation = Math.min(expertCompensation, penaltyAmount);
//   }

//   const adminEarnings = Math.round(
//     session.price - userRefund - expertCompensation,
//   );

//   // -------- STEP 3: refund first --------
//   const refundResponse = await refundMoyasarPayment(
//     session.moyasarId as string,
//     userRefund * 100,
//   );

//   if (refundResponse.status !== "refunded") {
//     throw new ApiError(400, refundResponse.message);
//   }

//   // -------- STEP 4: transactional state update --------
//   await prisma.$transaction(async (tx) => {
//     if (expertCompensation > 0) {
//       await tx.earnings.create({
//         data: {
//           amount: expertCompensation,
//           bookingId: session.id,
//           expertId: session.expertId,
//         },
//       });

//       await tx.expertProfile.update({
//         where: { userId: session.expertId },
//         data: {
//           currentEarnings: { increment: expertCompensation },
//           allTimeEarnings: { increment: expertCompensation },
//         },
//       });
//     }

//     if (adminEarnings > 0) {
//       await tx.adminEarnings.create({
//         data: {
//           amount: adminEarnings,
//           earningType: "Session",
//           bookingId: session.id,
//         },
//       });
//     }

//     await tx.booking.update({
//       where: { id: sessionId },
//       data: {
//         status: "Cancelled",
//         cancelledBy,
//         refundedAmount: userRefund,
//         penaltyAmount: 0,
//         compensationAmount: expertCompensation,
//       },
//     });

//     if (userRefund > 0) {
//       await tx.refund.create({
//         data: {
//           bookingId: session.id,
//           amount: userRefund,
//         },
//       });
//     }
//   });

//   // -------- STEP 5: notification --------
//   const notify = await prisma.notifyOption.findUniqueOrThrow({
//     where: { userId: session.expertId },
//   });

//   if (notify.all || notify.cancelled) {
//     await sendSingleNotification(
//       "Session",
//       session.expertId,
//       `${user.userName} cancelled the session`,
//       user.id,
//       "Session Cancelled",
//       session.id,
//     );
//   }

//   //remove the scheduled jobs

//   await fifteenMinuteQueue.remove(fifteenJobId);
//   await oneHourQueue.remove(oneHourJobId);
//   return;
// };

// const cancelSessionByExpertFromDB = async (
//   sessionId: string,
//   userId: string,
// ) => {
//   const user = await prisma.user.findUniqueOrThrow({
//     where: { id: userId, role: "EXPERT" },
//   });

//   const session = await prisma.booking.findUniqueOrThrow({
//     where: { id: sessionId },
//     include: {
//       expert: true,
//       service: true,
//     },
//   });

//   if (!session.date) throw new ApiError(404, "Session not found");

//   const cancelledBy = "EXPERT" as UserRole;

//   if (session.paymentMethod === "Free Session") {
//     await prisma.booking.update({
//       where: { id: sessionId },
//       data: {
//         status: "Cancelled",
//         cancelledBy,
//       },
//     });

//     await prisma.userSubscription.update({
//       where: { userId: session.userId },
//       data: { availableFreeSession: { increment: 1 } },
//     });

//     return;
//   }

//   const now = new Date();
//   const sessionDate = mergeDateAndTimeToISO(session.date, session.startTime);
//   const diffHours = (sessionDate.getTime() - now.getTime()) / 3600000;

//   // -------- STEP 1: penalty calculation (EXPERT) --------
//   let penaltyAmount = 0;

//   if (diffHours < 6) penaltyAmount = Math.round(session.price * 0.5);
//   else if (diffHours < 12) penaltyAmount = Math.round(session.price * 0.25);
//   else if (diffHours < 24) penaltyAmount = Math.round(session.price * 0.1);

//   // -------- STEP 2: settlement amounts --------
//   const userRefund = session.price;
//   const expertCompensation = 0;
//   const adminEarnings = penaltyAmount;

//   // -------- STEP 3: refund first --------
//   const refundResponse = await refundMoyasarPayment(
//     session.moyasarId as string,
//     userRefund * 100,
//   );

//   if (refundResponse.status !== "refunded") {
//     throw new ApiError(400, refundResponse.message);
//   }

//   // -------- STEP 4: transactional state update --------
//   await prisma.$transaction(async (tx) => {
//     if (penaltyAmount > 0) {
//       const profile = await tx.expertProfile.findUniqueOrThrow({
//         where: { userId: session.expertId },
//       });

//       if (profile.currentEarnings < penaltyAmount) {
//         throw new ApiError(400, "Not enough balance for penalty deduction");
//       }

//       await tx.expertProfile.update({
//         where: { userId: session.expertId },
//         data: {
//           currentEarnings: { decrement: penaltyAmount },
//           allTimeEarnings: { decrement: penaltyAmount },
//         },
//       });
//     }

//     if (adminEarnings > 0) {
//       await tx.adminEarnings.create({
//         data: {
//           amount: adminEarnings,
//           earningType: "Session",
//           bookingId: session.id,
//         },
//       });
//     }

//     await tx.booking.update({
//       where: { id: sessionId },
//       data: {
//         status: "Cancelled",
//         cancelledBy,
//         refundedAmount: userRefund,
//         penaltyAmount: penaltyAmount,
//         compensationAmount: expertCompensation,
//       },
//     });

//     if (userRefund > 0) {
//       await tx.refund.create({
//         data: {
//           bookingId: session.id,
//           amount: userRefund,
//         },
//       });
//     }
//   });

//   // -------- STEP 5: notification --------
//   const notify = await prisma.notifyOption.findUniqueOrThrow({
//     where: { userId: session.userId },
//   });

//   if (notify.all || notify.cancelled) {
//     await sendSingleNotification(
//       "Session",
//       session.userId,
//       `${user.userName} cancelled the session`,
//       user.id,
//       "Session Cancelled",
//       session.id,
//     );
//   }

//   //remove the scheduled jobs
//   const mergedDate = mergeDateAndTimeToISO(session.date, session.startTime);

//   const fifteenMinutes = 195 * 60 * 1000;
//   const oneHour = 4 * 60 * 60 * 1000;

//   const fifteenReminderAt = mergedDate.getTime() - fifteenMinutes;
//   const oneHourReminderAt = mergedDate.getTime() - oneHour;

//   const fifteenJobId = jobIdForSubscription(session.id, fifteenReminderAt);
//   const oneHourJobId = jobIdForSubscription(session.id, oneHourReminderAt);

//   await fifteenMinuteQueue.remove(fifteenJobId);
//   await oneHourQueue.remove(oneHourJobId);
//   return;
// };
