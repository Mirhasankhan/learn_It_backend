import ApiError from "../../../errors/ApiErrors";
import {
  generateSessionId,
  generateTransactionId,
} from "../../../helpers/generateOtp";

import { generateRoomId } from "../../../helpers/generateRoomId";
import { mergeDateAndTimeToISO } from "../../../helpers/mergerDateTime";
import {
  fifteenMinuteQueue,
  markExpiredQueue,
  oneHourQueue,
} from "../../../queues/subscription.queue";
import prisma from "../../../shared/prisma";
import { jobIdForSubscription } from "../susbscription/subscription.service";

const getMockSessionDataFromDB = async () => {
  const mockSession = await prisma.service.findFirst({
    where: { serviceType: "MockInterview" },
    select: {
      id: true,
      price: true,
      duration: true,
    },
  });

  return mockSession;
};

const updateMockSessionDetailsIntoDB = async (payload: any) => {
  const mockSession = await prisma.service.findFirst({
    where: { serviceType: "MockInterview" },
  });

  if (!mockSession) {
    throw new ApiError(404, "Mock session not found");
  }

  await prisma.service.updateMany({
    where: { serviceType: "MockInterview" },
    data: {
      duration: payload.duration || mockSession.duration,
      price: payload.price || mockSession.price,
    },
  });
  return;
};

const createMockSessionIntoDB = async (userId: string, payload: any) => {
  return prisma.$transaction(async (tx) => {
    const { serviceId, date, startTime, expertId } = payload;

    await tx.user.findUniqueOrThrow({
      where: { id: userId },
    });

    const userSubscription = await tx.userSubscription.findUnique({
      where: { userId },
    });

    const service = await tx.service.findUniqueOrThrow({
      where: {
        id: serviceId,
        serviceType: "MockInterview",
      },
    });

    const hasFreeSession =
      userSubscription && userSubscription.availableFreeSession > 0;

    const isPayment = hasFreeSession ? true : false;
    const orderId = generateSessionId();
    const transactionid = generateTransactionId();
    const booking = await tx.booking.create({
      data: {
        userId,
        serviceId,
        orderId,
        expertId,
        transactionid,
        roomId: generateRoomId(),
        price: service.price,
        sessionDuration: service.duration,
        date,
        startTime,
        isPayment: isPayment,
        moyasarId: hasFreeSession ? "Used Free Session" : null,
        paymentMethod: hasFreeSession ? "Free Session" : null,
      },
    });

    if (hasFreeSession) {
      await tx.userSubscription.update({
        where: { userId },
        data: {
          availableFreeSession: {
            decrement: 1,
          },
        },
      });
    }

    if (hasFreeSession && booking.date) {
      await prisma.room.create({
        data: {
          bookingId: booking.id,
          senderId: booking.userId,
          receiverId: booking.expertId,
        },
      });

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

    return {
      id: booking.id,
      isPayment: isPayment,
    };
  });
};

export const mockSessionServices = {
  getMockSessionDataFromDB,
  updateMockSessionDetailsIntoDB,
  createMockSessionIntoDB,
};
