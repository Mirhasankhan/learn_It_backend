import ApiError from "../../../errors/ApiErrors";
import {
  sendOtpAuthentica,
  verifyOtpAuthentica,
} from "../../../helpers/sendSms";
import { jwtHelpers } from "../../../helpers/jwtHelpers";
import prisma from "../../../shared/prisma";
import config from "../../../config";
import { Request } from "express";
import { uploadInSpace } from "../../../shared/UploadHelper";
import {
  AdminNotifications,
  BookingStatus,
  Faq,
  FaqKey,
  Prisma,
  TermsKey,
  WithdrawStatus,
} from "@prisma/client";
import {
  createPayout,
  refundMoyasarPayment,
} from "../../../helpers/moyasar.payment";
import {
  sendNotifications,
  sendSingleNotification,
} from "../notifications/notification.services";
import {
  startOfWeek,
  endOfWeek,
  startOfYear,
  endOfYear,
  getDay,
  getMonth,
} from "date-fns";
const SAUDI_OFFSET_HOURS = 3;

const sendLoginOtpToPhone = async (payload: any) => {
  await prisma.admin.findUniqueOrThrow({
    where: { phoneNumber: payload.phoneNumber },
  });

  // const response = await sendOtpAuthentica(payload.phoneNumber, "sms");
  const response = { success: true, message: "Otp sent successfully" };

  if (response.success == true) {
    return { success: true, message: response.message, statusCode: 200 };
  } else {
    return { success: false, message: response.message, statusCode: 400 };
  }
};

const verifyLoginOtpFromDB = async (phoneNumber: string, otp: string) => {
  const existingAdmin = await prisma.admin.findUniqueOrThrow({
    where: { phoneNumber },
  });
  // const response = await verifyOtpAuthentica(phoneNumber, "phone", otp);
  const response = { status: true, message: "Verification successfull", otp };

  if (response.status === false) {
    throw new ApiError(404, `${response.message}`);
  }

  const accessToken = jwtHelpers.generateToken(
    {
      id: existingAdmin.id,
      role: existingAdmin.role,
      phoneNumber: existingAdmin.phoneNumber,
    },
    config.jwt.jwt_secret as string,
    config.jwt.expires_in as string,
  );

  return {
    accessToken,
    role: existingAdmin.role,
  };
};

const createNewAdminIntoDB = async (req: Request) => {
  const file = req.file;
  const payload = req.body;
  const existingAdmin = await prisma.admin.findFirst({
    where: { phoneNumber: payload.phoneNumber },
  });

  if (existingAdmin) {
    throw new ApiError(409, "Admin already exists");
  }

  const processImage = async (file: Express.Multer.File, folder: string) => {
    if (!file) return null;
    return uploadInSpace(file, `courses/${folder}`);
  };

  const profileImage = file ? await processImage(file, "profileImage") : null;
  if (!profileImage) {
    throw new ApiError(404, "Image is required");
  }

  const newAdmin = await prisma.admin.create({
    data: {
      phoneNumber: payload.phoneNumber,
      profileImage: profileImage,
      role: payload.role,
      name: payload.name,
    },
  });
  return newAdmin;
};
const getAllJobSeekerFromDB = async (page: number = 1, search?: string) => {
  const whereCondition: Prisma.UserWhereInput = {
    role: "USER",
    ...(search && {
      OR: [
        { userName: { contains: search, mode: "insensitive" } },
        { phoneNumber: { contains: search, mode: "insensitive" } },
        { uniqueId: { contains: search, mode: "insensitive" } },
      ],
    }),
  };

  const totalJobSeekers = await prisma.user.count({
    where: { role: "USER" },
  });

  const filteredJobSeekersCount = await prisma.user.count({
    where: whereCondition,
  });

  const totalPages = Math.ceil(filteredJobSeekersCount / 10);

  const jobSeekers = await prisma.user.findMany({
    where: whereCondition,
    skip: (page - 1) * 10,
    take: 10,
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      profileImage: true,
      userName: true,
      uniqueId: true,
      phoneNumber: true,
      subscriptionType: true,
      createdAt: true,
      status: true,
      suspendUntil: true,
    },
  });

  return {
    meta: {
      totalJobSeekers,
      filteredJobSeekers: filteredJobSeekersCount,
      totalPages,
      currentPage: page,
    },
    jobSeekers,
  };
};
const getAdminsBookingEarningFromDB = async (page: number = 1) => {
  const totalInstance = await prisma.adminEarnings.count({
    where: { earningType: { in: ["Order", "Session"] } },
  });
  const filteredInstanceCount = await prisma.adminEarnings.count({
    where: { earningType: { in: ["Order", "Session"] } },
  });

  const totalPages = Math.ceil(filteredInstanceCount / 10);

  const adminEarnings = await prisma.adminEarnings.findMany({
    where: { earningType: { in: ["Order", "Session"] } },
    skip: (page - 1) * 10,
    take: 10,
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      amount: true,
      earningType: true,
      createdAt: true,
      booking: {
        select: {
          orderId: true,
        },
      },
    },
  });

  const result = await prisma.adminEarnings.aggregate({
    where: { earningType: { in: ["Order", "Session"] } },
    _sum: {
      amount: true,
    },
  });

  return {
    meta: {
      totalInstance,
      filteredInstancess: filteredInstanceCount,
      totalPages,
      currentPage: page,
    },
    adminEarnings,
    totalBookingEarnings: result._sum.amount,
  };
};
const getAdminsSubscriptionEarningFromDB = async (page: number = 1) => {
  const totalInstance = await prisma.adminEarnings.count({
    where: { earningType: "Subscription" },
  });
  const filteredInstanceCount = await prisma.adminEarnings.count({
    where: { earningType: "Subscription" },
  });

  const totalPages = Math.ceil(filteredInstanceCount / 10);

  const adminEarnings = await prisma.adminEarnings.findMany({
    where: { earningType: "Subscription" },
    skip: (page - 1) * 10,
    take: 10,
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      amount: true,
      earningType: true,
      createdAt: true,
      userSubscription: {
        select: {
          subscription: {
            select: {
              fee: true,
              type: true,
            },
          },
          user: {
            select: {
              userName: true,
              uniqueId: true,
            },
          },
        },
      },
      expertSubscription: {
        select: {
          subscriptionPlan: {
            select: {
              type: true,
              fee: true,
            },
          },
          expert: {
            select: {
              userName: true,
              uniqueId: true,
            },
          },
        },
      },
    },
  });

  const result = await prisma.adminEarnings.aggregate({
    where: { earningType: "Subscription" },
    _sum: {
      amount: true,
    },
  });

  return {
    meta: {
      totalInstance,
      filteredInstancess: filteredInstanceCount,
      totalPages,
      currentPage: page,
    },
    adminEarnings,
    totalSubEarnings: result._sum.amount,
  };
};
const getAllExpertsFromDB = async (page: number = 1, search?: string) => {
  const whereCondition: Prisma.UserWhereInput = {
    role: "EXPERT",
    status: { not: "PENDING" },
    ...(search && {
      OR: [
        { userName: { contains: search, mode: "insensitive" } },
        { phoneNumber: { contains: search, mode: "insensitive" } },
        { uniqueId: { contains: search, mode: "insensitive" } },
      ],
    }),
  };

  const totalExperts = await prisma.user.count({
    where: { role: "EXPERT", status: { not: "PENDING" } },
  });

  const filteredExpertsCount = await prisma.user.count({
    where: whereCondition,
  });

  const totalPages = Math.ceil(filteredExpertsCount / 10);

  const experts = await prisma.user.findMany({
    where: whereCondition,
    skip: (page - 1) * 10,
    take: 10,
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      profileImage: true,
      userName: true,
      uniqueId: true,
      phoneNumber: true,
      createdAt: true,
      status: true,
      subscriptionType: true,
      suspendUntil: true,
    },
  });

  return {
    meta: {
      totalExperts,
      filteredExperts: filteredExpertsCount,
      totalPages,
      currentPage: page,
    },
    experts,
  };
};
const getAllApplicationsFromDB = async (page: number = 1, search?: string) => {
  const whereCondition: Prisma.UserWhereInput = {
    role: "EXPERT",
    status: "PENDING",
    ...(search && {
      OR: [
        { userName: { contains: search, mode: "insensitive" } },
        { phoneNumber: { contains: search, mode: "insensitive" } },
        { uniqueId: { contains: search, mode: "insensitive" } },
      ],
    }),
  };

  const totalExperts = await prisma.user.count({
    where: { role: "EXPERT", status: "PENDING" },
  });

  const filteredExpertsCount = await prisma.user.count({
    where: whereCondition,
  });

  const totalPages = Math.ceil(filteredExpertsCount / 10);

  const experts = await prisma.user.findMany({
    where: whereCondition,
    skip: (page - 1) * 10,
    take: 10,
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      profileImage: true,
      userName: true,
      uniqueId: true,
      phoneNumber: true,
      createdAt: true,
      status: true,
    },
  });

  return {
    meta: {
      totalExperts,
      filteredExperts: filteredExpertsCount,
      totalPages,
      currentPage: page,
    },
    experts,
  };
};
const getAllAdminsFromDB = async (page: number = 1, search?: string) => {
  const whereCondition: Prisma.AdminWhereInput = {
    role: { not: "SuperAdmin" },
    ...(search && {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { phoneNumber: { contains: search, mode: "insensitive" } },
      ],
    }),
  };

  const totalAdmins = await prisma.admin.count();

  const filteredAdminsCount = await prisma.admin.count({
    where: whereCondition,
  });

  const totalPages = Math.ceil(filteredAdminsCount / 10);

  const admins = await prisma.admin.findMany({
    where: whereCondition,
    skip: (page - 1) * 10,
    take: 10,
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      profileImage: true,
      name: true,
      phoneNumber: true,
      role: true,
      createdAt: true,
    },
  });

  return {
    meta: {
      totalAdmins,
      filteredJobSeekers: filteredAdminsCount,
      totalPages,
      currentPage: page,
    },
    admins,
  };
};
const getAllRefundsFromDB = async (page: number = 1) => {
  const totalRefunds = await prisma.refund.count();

  const filteredRefundCount = await prisma.refund.count();

  const totalPages = Math.ceil(filteredRefundCount / 10);

  const refunds = await prisma.refund.findMany({
    skip: (page - 1) * 10,
    take: 10,
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      amount: true,
      booking: {
        select: {
          orderId: true,
          seeker: {
            select: {
              uniqueId: true,
              userName: true,
            },
          },
          expert: {
            select: {
              uniqueId: true,
              userName: true,
            },
          },
        },
      },
      createdAt: true,
    },
  });

  return {
    meta: {
      totalRefunds,
      filteredRefunds: filteredRefundCount,
      totalPages,
      currentPage: page,
    },
    refunds,
  };
};
const getAllTransactiosFromDB = async (page: number = 1) => {
  const whereCondition: Prisma.BookingWhereInput = {
    isPayment: true,
    paymentMethod: { not: "Free Session" },
  };

  const totalBookingAmount = await prisma.booking.aggregate({
    where: whereCondition,
    _sum: {
      price: true,
    },
  });
  const totalRefundAmount = await prisma.refund.aggregate({
    _sum: {
      amount: true,
    },
  });

  const result = await prisma.adminEarnings.aggregate({
    where: { earningType: "Subscription" },
    _sum: {
      amount: true,
    },
  });

  const bookingEarnings = await prisma.adminEarnings.aggregate({
    where: { earningType: { in: ["Order", "Session"] } },
    _sum: {
      amount: true,
    },
  });

  const susbEarnings = await prisma.adminEarnings.aggregate({
    where: { earningType: "Subscription" },
    _sum: {
      amount: true,
    },
  });

  const incomingMoney =
    (result?._sum?.amount || 0) + (totalBookingAmount?._sum?.price || 0);

  const transactionsCount = await prisma.booking.count({
    where: whereCondition,
  });

  const transactions = await prisma.booking.findMany({
    skip: (page - 1) * 10,
    take: 10,
    where: whereCondition,
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      moyasarId: true,
      price: true,
      transactionid: true,
      orderId: true,
      service: {
        select: {
          serviceType: true,
        },
      },
      seeker: {
        select: {
          userName: true,
          uniqueId: true,
        },
      },
      paymentMethod: true,
      createdAt: true,
    },
  });

  const totalPages = Math.ceil(transactionsCount / 10);

  return {
    transactions,
    totalBookingAmount: totalBookingAmount._sum.price,
    incomingMoney,
    bookingEarnings: bookingEarnings._sum.amount,
    subEarnings: susbEarnings._sum.amount,
    refundAmount: totalRefundAmount._sum.amount || 0,
    meta: {
      totalPages,
      transactionsCount,
      currentPage: page,
    },
  };
};
const getAllSessionsFromDB = async (
  page: number = 1,
  date?: any,
  status?: any,
  search?: any,
) => {
  const whereCondition: Prisma.BookingWhereInput = {
    isPayment: true,
    service: {
      serviceType: {
        in: ["Career", "MockInterview"],
      },
    },
    ...(search && {
      OR: [
        { orderId: { contains: search, mode: "insensitive" } },
        {
          seeker: {
            OR: [
              { userName: { contains: search, mode: "insensitive" } },
              { phoneNumber: { contains: search, mode: "insensitive" } },
              { uniqueId: { contains: search, mode: "insensitive" } },
            ],
          },
        },
        {
          expert: {
            OR: [
              { userName: { contains: search, mode: "insensitive" } },
              { phoneNumber: { contains: search, mode: "insensitive" } },
              { uniqueId: { contains: search, mode: "insensitive" } },
            ],
          },
        },
      ],
    }),
  };

  if (status) {
    whereCondition.status = status;
  }

  if (date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    whereCondition.date = {
      gte: startOfDay,
      lte: endOfDay,
    };
  }

  const filteredSessionsCount = await prisma.booking.count({
    where: whereCondition,
  });

  const totalPages = Math.ceil(filteredSessionsCount / 10);

  const sessions = await prisma.booking.findMany({
    where: whereCondition,
    skip: (page - 1) * 10,
    take: 10,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      createdAt: true,
      status: true,
      date: true,
      startTime: true,
      orderId: true,
      price: true,
      service: {
        select: {
          serviceType: true,
        },
      },
      paymentMethod: true,
      seeker: { select: { userName: true, uniqueId: true } },
      expert: { select: { userName: true, uniqueId: true } },
      recordings: {
        select: {
          userfileUrl: true,
          userDuration: true,
          userJoinedAt: true,
          userLeftAt: true,
          expertJoinedAt: true,
          expertLeftAt: true,
          expertfileUrl: true,
          expertDuration: true,
        },
      },
    },
  });

  return {
    meta: {
      totalSessions: await prisma.booking.count({
        where: {
          service: {
            serviceType: {
              in: ["Career", "MockInterview"],
            },
          },
        },
      }),
      filteredSessions: filteredSessionsCount,
      totalPages,
      currentPage: page,
    },
    sessions,
  };
};
const getAllOrdersFromDB = async (
  page: number = 1,
  date?: any,
  status?: BookingStatus,
  search?: string,
) => {
  const whereCondition: Prisma.BookingWhereInput = {
    isPayment: true,
    service: {
      serviceType: {
        in: ["Cv", "LinkedIn"],
      },
    },
    ...(search && {
      OR: [
        { orderId: { contains: search, mode: "insensitive" } },
        {
          seeker: {
            OR: [
              { userName: { contains: search, mode: "insensitive" } },
              { phoneNumber: { contains: search, mode: "insensitive" } },
              { uniqueId: { contains: search, mode: "insensitive" } },
            ],
          },
        },
        {
          expert: {
            OR: [
              { userName: { contains: search, mode: "insensitive" } },
              { phoneNumber: { contains: search, mode: "insensitive" } },
              { uniqueId: { contains: search, mode: "insensitive" } },
            ],
          },
        },
      ],
    }),
  };

  if (status) {
    whereCondition.status = status;
  }

  if (date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    whereCondition.date = {
      gte: startOfDay,
      lte: endOfDay,
    };
  }

  const filteredOrdersCount = await prisma.booking.count({
    where: whereCondition,
  });

  const totalPages = Math.ceil(filteredOrdersCount / 10);

  const orders = await prisma.booking.findMany({
    where: whereCondition,
    skip: (page - 1) * 10,
    take: 10,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      createdAt: true,
      status: true,
      date: true,
      cvUrl: true,
      linkedInUrl: true,
      deliveryTime: true,
      note: true,
      orderId: true,
      price: true,
      service: {
        select: {
          serviceType: true,
        },
      },
      paymentMethod: true,
      seeker: { select: { userName: true, uniqueId: true } },
      expert: { select: { userName: true, uniqueId: true } },
    },
  });

  return {
    meta: {
      totalOrders: await prisma.booking.count({
        where: {
          service: {
            serviceType: {
              in: ["Cv", "LinkedIn"],
            },
          },
        },
      }),
      filteredOrders: filteredOrdersCount,
      totalPages,
      currentPage: page,
    },
    orders,
  };
};
const getAllReviewsFromDB = async (page: number = 1, rating?: number) => {
  const whereCondition: Prisma.ReviewWhereInput = {
    ...(rating && {
      OR: [{ rating: { equals: rating } }],
    }),
  };

  const totalReviews = await prisma.review.count();

  const filteredReviewCount = await prisma.review.count({
    where: whereCondition,
  });

  const totalPages = Math.ceil(filteredReviewCount / 10);

  const reviews = await prisma.review.findMany({
    where: whereCondition,
    skip: (page - 1) * 10,
    take: 10,
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      createdAt: true,
      rating: true,
      comment: true,
      booking: {
        select: {
          orderId: true,
        },
      },
      seeeker: {
        select: {
          uniqueId: true,
          userName: true,
        },
      },
      expert: {
        select: {
          uniqueId: true,
          userName: true,
        },
      },
    },
  });

  return {
    meta: {
      totalReviews,
      filteredJobSeekers: filteredReviewCount,
      totalPages,
      currentPage: page,
    },
    reviews,
  };
};
const getAllReportsFromDB = async (page: number = 1) => {
  const totalReports = await prisma.report.count();

  const filteredReportsCount = await prisma.report.count();

  const totalPages = Math.ceil(filteredReportsCount / 10);

  const reports = await prisma.report.findMany({
    skip: (page - 1) * 10,
    take: 10,
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      createdAt: true,
      adminsReply: true,
      description: true,
      subject: true,
      isResponded: true,
      booking: {
        select: {
          seeker: {
            select: {
              userName: true,
            },
          },
          expert: {
            select: {
              userName: true,
            },
          },
          service: {
            select: {
              serviceType: true,
            },
          },
        },
      },
    },
  });

  return {
    meta: {
      totalPages,
      filteredJobSeekers: filteredReportsCount,
      totalReports,
      currentPage: page,
    },
    reports,
  };
};
const getAllUserReportsFromDB = async (page: number = 1) => {
  const totalUserReports = await prisma.userReport.count();
  const filteredUserReportsCount = await prisma.userReport.count();
  const totalPages = Math.ceil(filteredUserReportsCount / 10);

  const userReports = await prisma.userReport.findMany({
    skip: (page - 1) * 10,
    take: 10,
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      createdAt: true,
      adminsReply: true,
      description: true,
      reportId: true,
      fileUrl: true,
      orderId: true,
      subject: true,
      status: true,
      isResponded: true,
      booking: {
        select: {
          expert: {
            select: {
              userName: true,
              uniqueId: true,
            },
          },
          service: {
            select: {
              serviceType: true,
            },
          },
        },
      },
    },
  });

  return {
    meta: {
      totalPages,
      filteredReports: filteredUserReportsCount,
      totalUserReports,
      currentPage: page,
    },
    userReports,
  };
};

const getAllExperReportsFromDB = async (page: number = 1) => {
  const totalExpertReports = await prisma.expertReport.count();
  const filteredExpertReportsCount = await prisma.expertReport.count();
  const totalPages = Math.ceil(filteredExpertReportsCount / 10);

  const expertReports = await prisma.expertReport.findMany({
    skip: (page - 1) * 10,
    take: 10,
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      createdAt: true,
      adminsReply: true,
      reportId: true,
      description: true,
      fileUrl: true,
      orderId: true,
      subject: true,
      status: true,
      isResponded: true,
      booking: {
        select: {
          seeker: {
            select: {
              userName: true,
              uniqueId: true,
            },
          },
          service: {
            select: {
              serviceType: true,
            },
          },
        },
      },
    },
  });

  return {
    meta: {
      totalPages,
      filteredReports: filteredExpertReportsCount,
      totalExpertReports,
      currentPage: page,
    },
    expertReports,
  };
};
const getAllFeedbacksFromDB = async (page: number = 1) => {
  const totalFeedbacks = await prisma.feedback.count();

  const filteredFeedbackCount = await prisma.feedback.count();

  const totalPages = Math.ceil(filteredFeedbackCount / 10);

  const reviews = await prisma.feedback.findMany({
    skip: (page - 1) * 10,
    take: 10,
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      createdAt: true,
      confidence: true,
      management: true,
      overall: true,
      speaking: true,
      thinking: true,
      professionalism: true,
      comment: true,
      technique: true,
      booking: {
        select: {
          expert: {
            select: {
              userName: true,
              uniqueId: true,
            },
          },
          seeker: {
            select: {
              userName: true,
              uniqueId: true,
            },
          },
        },
      },
    },
  });

  return {
    meta: {
      totalFeedbacks,
      filteredReviews: filteredFeedbackCount,
      totalPages,
      currentPage: page,
    },
    reviews,
  };
};

const toggleDeactivateUserIntoDB = async (userId: string, adminId: string) => {
  const admin = await prisma.admin.findUniqueOrThrow({
    where: { id: adminId },
  });
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
  });

  const actionLabel = user.status === "DEACTIVATE" ? "ACTIVATE" : "DEACTIVATE";

  await prisma.activity.create({
    data: {
      work: `${user.userName} ${actionLabel}D by ${admin.name}`,
      adminId,
    },
  });

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { status: user.status == "DEACTIVATE" ? "ACTIVE" : "DEACTIVATE" },
  });
  const message = `User has been ${
    updatedUser.status === "ACTIVE" ? "activated" : "deactivated"
  }.`;
  return message;
};

const acceptExpertApplication = async (userId: string, adminId: string) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId, role: "EXPERT" },
  });

  const admin = await prisma.admin.findUniqueOrThrow({
    where: { id: adminId },
  });

  await prisma.activity.create({
    data: {
      work: `Expert application accepted by ${admin.name}`,
      adminId,
    },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { status: "ACTIVE" },
  });

  try {
    await sendSingleNotification(
      "Admin",
      user.id,
      `Congratulations! Your account is now active`,
      admin.id,
      `Account Activated`,
    );
  } catch (notificationError) {
    console.error("Notification failed:", notificationError);
  }

  return;
};
const suspendUserIntoDB = async (
  userId: string,
  day: number,
  adminId: string,
) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
  });

  const nowUTC = new Date();
  const saOffset = 3 * 60;
  const nowSA = new Date(nowUTC.getTime() + saOffset * 60 * 1000);
  const suspendUntil = new Date(nowSA.getTime() + day * 24 * 60 * 60 * 1000);

  const admin = await prisma.admin.findUniqueOrThrow({
    where: { id: adminId },
  });

  await prisma.activity.create({
    data: {
      work: `${user.role} suspended until ${suspendUntil} by ${admin.name}`,
      adminId,
    },
  });

  await prisma.user.update({
    where: { id: userId },
    data: { suspendUntil },
  });

  return suspendUntil;
};

const unsuspendUserFromDB = async (adminId: string, userId: string) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
  });
  const admin = await prisma.admin.findUniqueOrThrow({
    where: { id: adminId },
  });

  await prisma.activity.create({
    data: {
      work: `${user.role} unsuspended by ${admin.name}`,
      adminId,
    },
  });

  const nowUTC = new Date();

  await prisma.user.update({
    where: { id: userId },
    data: {
      suspendUntil: nowUTC,
    },
  });
};

const deleteUserFromDB = async (userId: string, adminId: string) => {
  const admin = await prisma.admin.findUniqueOrThrow({
    where: { id: adminId },
  });

  await prisma.activity.create({
    data: {
      work: `Account deleted by ${admin.name}`,
      adminId,
    },
  });

  await prisma.user.delete({
    where: { id: userId },
  });
  return;
};

const getJobSeekerDetailsFromDB = async (userId: string) => {
  const jobSeeker = await prisma.user.findUniqueOrThrow({
    where: { id: userId, role: "USER" },
    select: {
      id: true,
      userName: true,
      phoneNumber: true,
      createdAt: true,
      cvUrl: true,
      UserProfile: {
        select: {
          experience: true,
        },
      },
    },
  });
  const sessionBookingCount = await prisma.booking.count({
    where: {
      userId: userId,
      service: { serviceType: "Career" },
    },
  });
  const orderBookingCount = await prisma.booking.count({
    where: {
      userId: userId,
      service: { serviceType: { not: "Career" } },
    },
  });
  return {
    jobSeeker,
    sessionBookingCount,
    orderBookingCount,
  };
};

const getExpertDetailsFromDB = async (expertId: string) => {
  const expert = await prisma.user.findUniqueOrThrow({
    where: { id: expertId, role: "EXPERT" },
    select: {
      id: true,
      userName: true,
      avgRating: true,
      phoneNumber: true,
      totalReview: true,
      createdAt: true,
      profileImage: true,
      ExpertProfile: {
        select: {
          experience: true,
          introVideo: true,
          certificates: true,
          targetIndustry: true,
          about: true,
        },
      },
      Experience: {
        select: {
          title: true,
          companyName: true,
          duration: true,
          description: true,
        },
      },
      Service: {
        select: {
          id: true,
          serviceImage: true,
          serviceType: true,
          serviceName: true,
          price: true,
          about: true,
        },
      },
      Availability: {
        select: {
          dayOfWeek: true,
          slots: {
            select: {
              startTime: true,
              endTime: true,
            },
          },
        },
      },
    },
  });

  const sessionConductCount = await prisma.booking.count({
    where: {
      expertId: expertId,
      service: { serviceType: "Career" },
      status: "Completed",
    },
  });
  const orderDeliveredCount = await prisma.booking.count({
    where: {
      expertId: expertId,
      service: { serviceType: { not: "Career" } },
      status: "Completed",
    },
  });
  const reportCount = await prisma.expertReport.findMany({
    where: { expertId },
  });
  console.log(reportCount?.length);
  return {
    sessionConductCount,
    reportCount: reportCount.length,
    orderDeliveredCount,
    expert,
  };
};

const getAllWithdrawRequestsFromDB = async (
  page: number = 1,
  status?: WithdrawStatus,
) => {
  const whereCondition: Prisma.WithdrawWhereInput = {
    status: status ? status : {},
  };

  const totalRequests = await prisma.withdraw.count();
  const totalTransferredMoney = await prisma.withdraw.aggregate({
    where: {
      status: "Accepted",
    },
    _sum: {
      amount: true,
    },
  });

  const total = totalTransferredMoney._sum.amount || 0;
  const totalPendingRequestMoney = await prisma.withdraw.aggregate({
    where: {
      status: "Pending",
    },
    _sum: {
      amount: true,
    },
  });

  const pendingTotal = totalPendingRequestMoney._sum.amount || 0;
  const totalCurrentEarnings = await prisma.expertProfile.aggregate({
    _sum: {
      allTimeEarnings: true,
    },
  });

  const totalRequested = pendingTotal + total;

  const currentEarnings =
    (totalCurrentEarnings._sum.allTimeEarnings ?? 0) - totalRequested;

  const filteredWithdrawsCount = await prisma.withdraw.count({
    where: whereCondition,
  });

  const totalPages = Math.ceil(filteredWithdrawsCount / 10);

  const withdraws = await prisma.withdraw.findMany({
    where: whereCondition,
    skip: (page - 1) * 10,
    take: 10,
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      status: true,
      amount: true,
      withdrawId: true,
      createdAt: true,
      expert: {
        select: {
          uniqueId: true,
          userName: true,
        },
      },
    },
  });

  return {
    meta: {
      totalRequests,
      filteredWithdraws: filteredWithdrawsCount,
      totalPages,
      currentPage: page,
      totalTransferred: total,
      pendingRequestMoney: pendingTotal,
      currentEarnings: currentEarnings,
    },
    withdraws,
  };
};

const acceptWithdrawRequestIntoDB = async (
  withdrawId: string,
  adminId: string,
) => {
  const withdraw = await prisma.withdraw.findUniqueOrThrow({
    where: { id: withdrawId, status: "Pending" },
  });

  const admin = await prisma.admin.findUniqueOrThrow({
    where: { id: adminId },
  });

  const payoutAccount = await prisma.payoutAccount.findUniqueOrThrow({
    where: { id: withdraw.payoutId },
  });

  if (!payoutAccount) {
    throw new ApiError(404, "Payout account not found");
  }

  const response = await createPayout({
    amount: Math.round(withdraw.amount * 100),
    source_id: withdraw.sourceId,
    destination: {
      city: payoutAccount?.city,
      country: "Saudi Arabia",
      iban: payoutAccount.iban,
      mobile: payoutAccount.mobile,
      name: payoutAccount.name,
      type: "bank",
    },
    metadata: {
      withdrawId,
    },
  });

  if (response.status == "initiated") {
    await prisma.activity.create({
      data: {
        work: `Withdraw request accepted by ${admin.name}`,
        adminId,
      },
    });

    await prisma.withdraw.update({
      where: { id: withdrawId },
      data: { status: "In_Progress" },
    });
    return { message: `${response.message}` };
  } else {
    return { message: `${response.message}` };
  }
};

const verifyPayoutRequest = async (withdrawId: string, status: string) => {
  const withdraw = await prisma.withdraw.findUniqueOrThrow({
    where: { id: withdrawId, status: "In_Progress" },
  });

  const expertProfile = await prisma.expertProfile.findUniqueOrThrow({
    where: { userId: withdraw.expertId },
  });

  if (status == "paid") {
    await prisma.withdraw.update({
      where: { id: withdrawId },
      data: { status: "Accepted" },
    });

    await prisma.expertProfile.update({
      where: { id: expertProfile.id },
      data: { currentEarnings: { decrement: withdraw.amount } },
    });

    const userNotify = await prisma.notifyOption.findUniqueOrThrow({
      where: { userId: withdraw.expertId },
    });

    if (userNotify.all || userNotify.review) {
      try {
        await sendSingleNotification(
          "Earning",
          withdraw.expertId,
          `Congratulations! Your withdraw request has been accepted and earning transferred to your account.`,
          withdraw.expertId,
          `Withdraw request accepted`,
        );
      } catch (notificationError) {
        console.error("Notification failed:", notificationError);
      }
    }

    return;
  } else if (status == "failed") {
    await prisma.withdraw.update({
      where: { id: withdrawId },
      data: { status: "Pending" },
    });
    return;
  }
};

const rejectWithdrawRequestFromDB = async (
  withdrawId: string,
  adminId: string,
) => {
  const admin = await prisma.admin.findUniqueOrThrow({
    where: { id: adminId },
  });

  const withdraw = await prisma.withdraw.findUniqueOrThrow({
    where: { id: withdrawId },
  });
  await prisma.withdraw.delete({
    where: { id: withdrawId, status: "Pending" },
  });

  await prisma.activity.create({
    data: {
      work: `Withdraw request rejected by ${admin.name}`,
      adminId,
    },
  });

  const userNotify = await prisma.notifyOption.findUniqueOrThrow({
    where: { userId: withdraw.expertId },
  });

  if (userNotify.all || userNotify.cancelled) {
    try {
      await sendSingleNotification(
        "Earning",
        withdraw.expertId,
        `Admin has rejected your withdraw request!`,
        withdraw.expertId,
        `Withdraw Request Rejected`,
      );
    } catch (notificationError) {
      console.error("Notification failed:", notificationError);
    }
  }
  return;
};

const getWithdrawRequestDetailsFromDB = async (withdrawId: string) => {
  const withdraw = await prisma.withdraw.findUniqueOrThrow({
    where: { id: withdrawId },
    select: {
      id: true,
      amount: true,
      createdAt: true,
      status: true,
      payoutAccount: {
        select: {
          city: true,
          mobile: true,
          name: true,
          iban: true,
          createdAt: true,
        },
      },
    },
  });
  return withdraw;
};

const deleteAdminFromDB = async (adminId: string, superAdminId: string) => {
  const admin = await prisma.admin.findUniqueOrThrow({
    where: { id: superAdminId },
  });

  await prisma.activity.create({
    data: {
      work: `Admin deleted by ${admin.name}`,
      adminId,
    },
  });

  await prisma.admin.delete({
    where: { id: adminId },
  });
  return;
};

const createFaqIntoDB = async (payload: Faq, adminId: string) => {
  const existing = await prisma.faq.findFirst({
    where: { question: payload.question.trim(), faqType: payload.faqType },
  });

  if (existing) {
    throw new ApiError(400, "This question already exists");
  }

  const admin = await prisma.admin.findUniqueOrThrow({
    where: { id: adminId },
  });

  await prisma.activity.create({
    data: {
      work: `New FAQ created by ${admin.name}`,
      adminId,
    },
  });

  await prisma.faq.create({
    data: {
      question: payload.question,
      answer: payload.answer,
      faqType: payload.faqType,
    },
  });
  return;
};

const getAllFaqsFromDB = async (faqType: FaqKey) => {
  const faqs = await prisma.faq.findMany({
    where: { faqType },
    select: {
      id: true,
      question: true,
      answer: true,
    },
  });
  return faqs;
};

const getSingleFaqFromDB = async (id: string) => {
  const faq = await prisma.faq.findUniqueOrThrow({
    where: { id },
    select: {
      id: true,
      answer: true,
      question: true,
    },
  });
  return faq;
};

const deleteFaqFromDB = async (id: string, adminId: string) => {
  const admin = await prisma.admin.findUniqueOrThrow({
    where: { id: adminId },
  });

  await prisma.activity.create({
    data: {
      work: `FAQ deleted by ${admin.name}`,
      adminId,
    },
  });
  await prisma.faq.delete({ where: { id } });
  return;
};

const updateFaqIntoDB = async (payload: any) => {
  const existingFaq = await prisma.faq.findUniqueOrThrow({
    where: { id: payload.faqId },
  });
  const newQuestion = payload.question || existingFaq.question;

  const duplicate = await prisma.faq.findFirst({
    where: {
      question: newQuestion,
      NOT: { id: payload.faqId },
    },
  });

  if (duplicate) {
    throw new ApiError(400, "Another FAQ already uses this question");
  }

  await prisma.faq.update({
    where: { id: payload.faqId },
    data: {
      question: newQuestion,
      answer: payload.answer || existingFaq.answer,
    },
  });

  return;
};

const createTermsAndCondition = async (data: any) => {
  await prisma.termsAndCondition.upsert({
    where: {
      key: data.key,
    },
    create: {
      content: data.content,
      key: data.key,
    },
    update: {
      content: data.content,
    },
  });
  return;
};
const getAllTermsAndCondition = async (key: TermsKey) => {
  const result = await prisma.termsAndCondition.findMany({
    where: { key },
    select: {
      id: true,
      content: true,
      key: true,
    },
  });
  return result;
};

const createPrivacyPolicy = async (data: any) => {
  await prisma.privacyPolicy.upsert({
    where: {
      key: data.key,
    },
    create: {
      content: data.content,
      key: data.key,
    },
    update: {
      content: data.content,
    },
  });
  return;
};

const getPrivacyPolicy = async (key: TermsKey) => {
  const result = await prisma.privacyPolicy.findMany({
    where: { key },
    select: {
      id: true,
      content: true,
      key: true,
    },
  });
  return result;
};

const createSubscriptionPlanIntoDB = async (payload: any) => {
  const existingPlan = await prisma.subscription.findUnique({
    where: { type: payload.type },
  });

  if (existingPlan) {
    throw new ApiError(400, "Subscription plan already exists");
  }

  await prisma.subscription.create({
    data: {
      features: payload.features,
      freeSession: payload.freeSession,
      fee: payload.fee,
      title: payload.title,
      type: payload.type,
    },
  });
  return;
};

const createExpertSubscriptionPlanIntoDB = async (payload: any) => {
  const existingPlan = await prisma.expertPlan.findUnique({
    where: { type: payload.type },
  });

  if (existingPlan) {
    throw new ApiError(400, "Subscription plan already exists");
  }

  await prisma.expertPlan.create({
    data: {
      features: payload.features,
      fee: payload.fee,
      title: payload.title,
      type: payload.type,
      mockCut: payload.mockCut,
      serviceCut: payload.serviceCut,
    },
  });
  return;
};

const updateUserSubscriptionPlan = async (payload: any, adminId: string) => {
  const plan = await prisma.subscription.findUniqueOrThrow({
    where: { id: payload.planId },
  });

  const admin = await prisma.admin.findUniqueOrThrow({
    where: { id: adminId },
  });

  await prisma.activity.create({
    data: {
      work: `User's subscription plan has updated by ${admin.name}`,
      adminId,
    },
  });

  await prisma.subscription.update({
    where: {
      id: payload.planId,
    },
    data: {
      title: payload.title || plan.title,
      features: payload.features || plan.features,
      fee: payload.fee || plan.fee,
      freeSession: payload.freeSession || plan.freeSession,
    },
  });
  return;
};
const updateExpertSubscriptionPlan = async (payload: any, adminId: string) => {
  const plan = await prisma.expertPlan.findUniqueOrThrow({
    where: { id: payload.planId },
  });

  const admin = await prisma.admin.findUniqueOrThrow({
    where: { id: adminId },
  });

  await prisma.activity.create({
    data: {
      work: `Expert's subscription plan has updated by ${admin.name}`,
      adminId,
    },
  });

  await prisma.expertPlan.update({
    where: {
      id: payload.planId,
    },
    data: {
      title: payload.title || plan.title,
      features: payload.features || plan.features,
      fee: payload.fee || plan.fee,
      mockCut: payload.mockCut || plan.mockCut,
      serviceCut: payload.serviceCut || plan.serviceCut,
    },
  });
  return;
};

const updateAdminDetailsIntoDB = async (req: Request) => {
  const file = req.file;
  const adminId = req.user.id;
  const payload = req.body;

  const admin = await prisma.admin.findUniqueOrThrow({
    where: { id: adminId },
  });

  await prisma.activity.create({
    data: {
      work: `${admin.name} updated his profile details.`,
      adminId,
    },
  });

  const processImage = async (file: Express.Multer.File, folder: string) => {
    if (!file) return null;
    return uploadInSpace(file, `courses/${folder}`);
  };

  const profileImage = file ? await processImage(file, "profileImage") : null;

  await prisma.admin.update({
    where: { id: adminId },
    data: {
      role: payload.role || admin.role,
      profileImage: profileImage || admin.profileImage,
    },
  });
};

const updateAdminDetailsByAdmin = async (req: Request) => {
  const file = req.file;
  const payload = req.body;

  const admin = await prisma.admin.findUniqueOrThrow({
    where: { id: payload.adminId },
  });

  const processImage = async (file: Express.Multer.File, folder: string) => {
    if (!file) return null;
    return uploadInSpace(file, `courses/${folder}`);
  };

  const profileImage = file ? await processImage(file, "profileImage") : null;

  await prisma.admin.update({
    where: { id: payload.adminId },
    data: {
      name: payload.name || admin.name,
      phoneNumber: payload.phoneNumber || admin.phoneNumber,
      role: payload.role || admin.role,
      profileImage: profileImage || admin.profileImage,
    },
  });
};

const getDashboardOverviewFromDB = async () => {
  const totalJobSeekers = await prisma.user.count({
    where: { role: "USER" },
  });
  const totalExperts = await prisma.user.count({
    where: { role: "EXPERT" },
  });

  const totalApplication = await prisma.user.count({
    where: {
      role: "EXPERT",
      status: "PENDING",
    },
  });

  const totalCareerConsultation = await prisma.booking.count({
    where: { service: { serviceType: "Career" }, isPayment: true },
  });
  const totalCvOptimizatoin = await prisma.booking.count({
    where: { service: { serviceType: "Cv" }, isPayment: true },
  });
  const totalLinkedInOptimizatoin = await prisma.booking.count({
    where: { service: { serviceType: "LinkedIn" }, isPayment: true },
  });

  const totalBookingAmount = await prisma.booking.aggregate({
    where: { isPayment: true, paymentMethod: { not: "Free Session" } },
    _sum: {
      price: true,
    },
  });

  const result = await prisma.adminEarnings.aggregate({
    where: { earningType: "Subscription" },
    _sum: {
      amount: true,
    },
  });

  const incomingMoney =
    (result?._sum?.amount || 0) + (totalBookingAmount?._sum?.price || 0);

  return {
    totalJobSeekers,
    totalExperts,
    totalApplication,
    totalCareerConsultation,
    totalCvOptimizatoin,
    incomingMoney,
    totalLinkedInOptimizatoin,
  };
};

const getAllChatsBetweenUsers = async (search?: string) => {
  const rooms = await prisma.room.findMany({
    where: search
      ? {
          OR: [
            {
              user1: {
                OR: [
                  { userName: { contains: search, mode: "insensitive" } },
                  { uniqueId: { contains: search, mode: "insensitive" } },
                ],
              },
            },
            {
              user2: {
                OR: [
                  { userName: { contains: search, mode: "insensitive" } },
                  { uniqueId: { contains: search, mode: "insensitive" } },
                ],
              },
            },
            {
              booking: {
                OR: [{ orderId: { contains: search, mode: "insensitive" } }],
              },
            },
          ],
        }
      : undefined,

    select: {
      id: true,
      isFlagged: true,
      user1: {
        select: {
          id: true,
          role: true,
          userName: true,
          uniqueId: true,
          phoneNumber: true,
          profileImage: true,
        },
      },
      user2: {
        select: {
          id: true,
          role: true,
          userName: true,
          uniqueId: true,
          phoneNumber: true,
          profileImage: true,
        },
      },
      booking: {
        select: {
          orderId: true,
        },
      },
    },
  });

  return rooms;
};

const getAllSubscriptionPlansFromDB = async () => {
  const subscriptionPlans = await prisma.subscription.findMany();

  return subscriptionPlans;
};

const getAllExpertPlansFromDB = async () => {
  const subscriptionPlans = await prisma.expertPlan.findMany();

  return subscriptionPlans;
};

const getAllSubscriberFromDB = async (page: number = 1) => {
  const totalSubscriberCount = await prisma.user.count({
    where: {
      subscriptionType: {
        notIn: ["Free"],
        not: null,
      },
    },
  });

  const totalPages = Math.ceil(totalSubscriberCount / 10);

  const subscribers = await prisma.user.findMany({
    where: {
      subscriptionType: {
        notIn: ["Free"],
        not: null,
      },
    },
    skip: (page - 1) * 10,
    take: 10,
    select: {
      id: true,
      userName: true,
      role: true,
      profileImage: true,
      phoneNumber: true,
      userSubscription: {
        select: {
          createdAt: true,
          nextPayment: true,
          type: true,
        },
      },
      expertSubscription: {
        select: {
          createdAt: true,
          nextPayment: true,
          type: true,
        },
      },
    },
  });

  return {
    meta: {
      totalSubscriberCount,
      totalPages,
      currentPage: page,
    },
    subscribers,
  };
};

type SummaryType = "weekly" | "monthly";

export const getSessionSummaryFromDB = async (type: SummaryType) => {
  const sessions = await prisma.booking.findMany({
    where: {
      isPayment: true,
      service: {
        serviceType: { in: ["Career", "MockInterview"] },
      },
    },
    select: {
      status: true,
      createdAt: true,
    },
  });

  if (type === "monthly") {
    const monthMap: Record<string, any> = {};

    sessions.forEach(({ status, createdAt }) => {
      const month = createdAt.toLocaleString("en-US", { month: "short" });

      if (!monthMap[month]) {
        monthMap[month] = {
          month,
          completed: 0,
          active: 0,
          rejected: 0,
        };
      }

      if (status === "Completed") monthMap[month].completed++;
      else if (status === "In_Progress") monthMap[month].active++;
      else if (status === "Cancelled") monthMap[month].rejected++;
    });

    return Object.values(monthMap);
  }

  // WEEKLY
  const dayOrder = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const dayMap: Record<string, any> = {};

  sessions.forEach(({ status, createdAt }) => {
    const day = createdAt.toLocaleString("en-US", { weekday: "short" });

    if (!dayMap[day]) {
      dayMap[day] = {
        day,
        completed: 0,
        active: 0,
        rejected: 0,
      };
    }

    if (status === "Completed") dayMap[day].completed++;
    else if (status === "In_Progress") dayMap[day].active++;
    else if (status === "Cancelled") dayMap[day].rejected++;
  });

  // ensure consistent Mon–Sun order
  return dayOrder.filter((d) => dayMap[d]).map((d) => dayMap[d]);
};

const getAdminEarningSummaryFromDB = async (type: "weekly" | "monthly") => {
  const days = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"];
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  let chartData: any[] = [];

  if (type === "weekly") {
    const start = startOfWeek(new Date(), { weekStartsOn: 6 }); // Saturday start
    const end = endOfWeek(new Date(), { weekStartsOn: 6 }); // Friday end

    const weekEarnings = await prisma.adminEarnings.findMany({
      where: {
        createdAt: { gte: start, lte: end },
      },
      select: { amount: true, createdAt: true },
    });

    const weeklyData = Array(7).fill(0);

    for (const e of weekEarnings) {
      const localDate = new Date(
        e.createdAt.getTime() + SAUDI_OFFSET_HOURS * 60 * 60 * 1000,
      );
      const dayIndex = getDay(localDate); // 0=Sun, 1=Mon, ... 6=Sat
      const mappedIndex = (dayIndex - 6 + 7) % 7; // shift so Sat=0, Sun=1, ..., Fri=6
      weeklyData[mappedIndex] += e.amount;
    }

    chartData = days.map((day, idx) => ({
      day,
      earnings: weeklyData[idx],
    }));
  }

  if (type === "monthly") {
    const start = startOfYear(new Date());
    const end = endOfYear(new Date());

    const monthEarnings = await prisma.adminEarnings.findMany({
      where: {
        createdAt: { gte: start, lte: end },
      },
      select: { amount: true, createdAt: true },
    });

    const monthlyData = Array(12).fill(0);

    for (const e of monthEarnings) {
      const localDate = new Date(
        e.createdAt.getTime() + SAUDI_OFFSET_HOURS * 60 * 60 * 1000,
      );
      const monthIndex = getMonth(localDate); // 0=Jan, 11=Dec
      monthlyData[monthIndex] += e.amount;
    }

    chartData = months.map((month, idx) => ({
      month,
      earnings: monthlyData[idx],
    }));
  }

  return {
    chartData,
  };
};

export default getAdminEarningSummaryFromDB;

const getAllActivityFromDB = async (page: number = 1, search?: string) => {
  const whereCondition: Prisma.ActivityWhereInput = {
    ...(search && {
      OR: [{ work: { contains: search, mode: "insensitive" } }],
    }),
  };

  const totalActivity = await prisma.activity.count();

  const filteredActivitiesCount = await prisma.activity.count({
    where: whereCondition,
  });

  const totalPages = Math.ceil(filteredActivitiesCount / 10);

  const activities = await prisma.activity.findMany({
    where: whereCondition,
    skip: (page - 1) * 10,
    take: 10,
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      work: true,
      createdAt: true,
      admin: {
        select: {
          id: true,
          profileImage: true,
          name: true,
        },
      },
    },
  });

  return {
    meta: {
      totalActivity,
      filteredActivities: filteredActivitiesCount,
      totalPages,
      currentPage: page,
    },
    activities,
  };
};

const deleteActivityFromDB = async (id: string) => {
  await prisma.activity.delete({
    where: { id },
  });
  return;
};

const sendNotificationsToUsers = async (
  payload: AdminNotifications,
  adminId: string,
) => {
  if (payload.receiver == "SingleUser" && !payload.userId) {
    throw new ApiError(409, "UserId is required");
  }

  const admin = await prisma.admin.findUniqueOrThrow({
    where: { id: adminId },
  });

  await prisma.activity.create({
    data: {
      work: `${admin.name} send notification to ${payload.receiver}`,
      adminId,
    },
  });

  await prisma.adminNotifications.create({
    data: {
      content: payload.content,
      receiver: payload.receiver,
      userId: payload.userId,
    },
  });

  let receiver = "";

  if (payload.receiver == "Experts") {
    receiver = "EXPERT";
  } else if (payload.receiver == "Seekers") {
    receiver = "USER";
  }
  if (payload.receiver == "SingleUser") {
    try {
      await sendSingleNotification(
        "Admin",
        payload.userId as string,
        `${payload.content}`,
        admin.id,
        `Notification from Sefr`,
      );
      return;
    } catch (notificationError) {
      console.error("Notification failed:", notificationError);
      return;
    }
  }

  await sendNotifications(payload.content, "Notification from Sefr", receiver);

  return;
};

const getAdminProfileFromDB = async (id: string) => {
  const admin = await prisma.admin.findUniqueOrThrow({
    where: { id },
  });

  return admin;
};
const getAdminDetailsFromDB = async (id: string) => {
  const admin = await prisma.admin.findUniqueOrThrow({
    where: { id },
  });

  return admin;
};

const getAllUsersFromDB = async () => {
  const user = await prisma.user.findMany({
    where: { status: "ACTIVE" },
    select: {
      id: true,
      userName: true,
      profileImage: true,
    },
  });

  return user;
};

const getSentNotificationsFromDB = async (page: number = 1) => {
  const totalNotifications = await prisma.adminNotifications.count();

  const filteredNotificationCount = await prisma.adminNotifications.count({});

  const totalPages = Math.ceil(filteredNotificationCount / 10);

  const adminNotifications = await prisma.adminNotifications.findMany({
    skip: (page - 1) * 10,
    take: 10,
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      receiver: true,
      content: true,
      user: {
        select: {
          userName: true,
          profileImage: true,
        },
      },
      createdAt: true,
    },
  });

  return {
    meta: {
      totalNotifications,
      filteredNotifications: filteredNotificationCount,
      totalPages,
      currentPage: page,
    },
    adminNotifications,
  };
};

const deleteSentNotificationFromDB = async (id: string) => {
  await prisma.adminNotifications.delete({
    where: { id },
  });
  return;
};

const deleteReviewFromDB = async (reviewId: string) => {
  const result = await prisma.$transaction(async (tx) => {
    const review = await tx.review.findUniqueOrThrow({
      where: { id: reviewId },
    });

    await tx.review.delete({
      where: { id: reviewId },
    });

    const stats = await tx.review.aggregate({
      where: { expertId: review.expertId },
      _count: { _all: true },
      _avg: { rating: true },
    });

    await tx.user.update({
      where: { id: review.expertId },
      data: {
        totalReview: stats._count._all,
        avgRating: parseFloat((stats._avg.rating || 0).toFixed(1)),
      },
    });

    try {
      await sendSingleNotification(
        "Admin",
        review.expertId,
        `A review for one of your order has been deleted by Sefr.`,
        review.expertId,
        `Review Deleted`,
      );
    } catch (notificationError) {
      console.error("Notification failed:", notificationError);
    }

    return review;
  });

  return result;
};

const responseUserReportIntoDB = async (payload: any) => {
  const report = await prisma.userReport.findUniqueOrThrow({
    where: { id: payload.reportId, isResponded: false },
  });

  const booking = await prisma.booking.findUniqueOrThrow({
    where: { id: report.bookingId },
  });

  if (
    payload.status === "No_Refund" ||
    payload.status === "Formal_Warning" ||
    payload.status === "Account_Suspend"
  ) {
    await prisma.userReport.update({
      where: { id: payload.reportId },
      data: {
        isResponded: true,
        status: payload.status,
        adminsReply: payload.adminsReply,
      },
    });

    return;
  }

  /**
   * -------------------------
   * PARTIAL REFUND VALIDATION
   * -------------------------
   */
  if (payload.status === "Partial_Refund") {
    if (!payload.refundRate || payload.refundRate <= 0) {
      throw new ApiError(
        422,
        "Partial refund requires a valid refund percentage",
      );
    }

    if (booking.paymentMethod === "Free Session") {
      throw new ApiError(
        409,
        "Partial refund is not allowed for free session bookings",
      );
    }

    if (booking.status !== "Completed") {
      throw new ApiError(
        409,
        "Partial refund is only allowed for completed bookings",
      );
    }
  }

  /**
   * -------------------------
   * FULL REFUND – FREE SESSION
   * -------------------------
   */
  if (
    payload.status === "Full_Refund" &&
    booking.paymentMethod === "Free Session"
  ) {
    await prisma.userSubscription.update({
      where: { userId: booking.userId },
      data: { availableFreeSession: { increment: 1 } },
    });

    if (booking.status === "Completed") {
      const earnings = await prisma.earnings.findUniqueOrThrow({
        where: { bookingId: booking.id },
      });

      await prisma.expertProfile.update({
        where: { userId: booking.expertId },
        data: {
          allTimeEarnings: { decrement: earnings.amount },
          currentEarnings: { decrement: earnings.amount },
        },
      });
      await prisma.earnings.delete({
        where: { bookingId: booking.id },
      });
      await prisma.booking.update({
        where: { id: report.bookingId },
        data: {
          status: "Resolved_In_Dispute",
          refundedAmount: booking.price,
        },
      });
    }
  }

  /**
   * -------------------------
   * PAID BOOKINGS (FULL / PARTIAL)
   * -------------------------
   */
  if (booking.paymentMethod !== "Free Session") {
    const refundAmount =
      payload.status === "Full_Refund"
        ? booking.price
        : (booking.price * payload.refundRate!) / 100;

    const response = await refundMoyasarPayment(
      booking.moyasarId as string,
      Math.round(refundAmount * 100),
    );

    if (response.status !== "refunded") {
      throw new ApiError(502, response.message || "Refund failed");
    }

    if (booking.status === "Completed") {
      const earnings = await prisma.earnings.findUniqueOrThrow({
        where: { bookingId: booking.id },
      });

      const expertRefundCut =
        payload.status === "Full_Refund"
          ? earnings.amount
          : (earnings.amount * payload.refundRate!) / 100;

      await prisma.expertProfile.update({
        where: { userId: booking.expertId },
        data: {
          allTimeEarnings: { decrement: expertRefundCut },
          currentEarnings: { decrement: expertRefundCut },
        },
      });
      await prisma.earnings.update({
        where: { bookingId: booking.id },
        data: { amount: { decrement: expertRefundCut } },
      });
      await prisma.booking.update({
        where: { id: report.bookingId },
        data: {
          status: "Resolved_In_Dispute",
          refundedAmount: expertRefundCut,
        },
      });
    }
  }

  /**
   * -------------------------
   * FINAL REPORT UPDATE
   * -------------------------
   */

  await prisma.userReport.update({
    where: { id: payload.reportId },
    data: {
      isResponded: true,
      status: payload.status,
      adminsReply: payload.adminsReply,
    },
  });
};

const responseToExpertReportIntoDB = async (payload: any) => {
  const report = await prisma.expertReport.findUniqueOrThrow({
    where: { id: payload.reportId, isResponded: false },
  });

  const booking = await prisma.booking.findUniqueOrThrow({
    where: { id: report.bookingId },
  });

  if (
    payload.status === "Review_Removed" ||
    payload.status === "Formal_Warning" ||
    payload.status === "Account_Suspend"
  ) {
    await prisma.expertReport.update({
      where: { id: payload.reportId },
      data: {
        isResponded: true,
        status: payload.status,
        adminsReply: payload.adminsReply,
      },
    });

    return;
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
      amount = booking.price * 0.6;
    } else {
      amount = booking.price * 0.85;
    }
  } else if (expert.subscriptionType == "Monthly") {
    if (service.serviceType == "MockInterview") {
      amount = booking.price * 0.75;
    } else {
      amount = booking.price * 0.9;
    }
  } else if (expert.subscriptionType == "Yearly") {
    if (service.serviceType == "MockInterview") {
      amount = booking.price * 0.8;
    } else {
      amount = booking.price * 0.95;
    }
  }

  if (payload.status === "Release_Payment" && booking.status !== "Completed") {
    await prisma.earnings.create({
      data: {
        amount,
        bookingId: booking.id,
        expertId: booking.expertId,
      },
    });

    await prisma.expertProfile.update({
      where: { userId: booking.expertId },
      data: {
        currentEarnings: { increment: amount },
        allTimeEarnings: { increment: amount },
      },
    });
    await prisma.booking.update({
      where: { id: booking.id },
      data: { status: "Resolved_In_Dispute" },
    });
  }

  await prisma.expertReport.update({
    where: { id: payload.reportId },
    data: {
      isResponded: true,
      status: payload.status,
      adminsReply: payload.adminsReply,
    },
  });
  return;
};

const getExpertsBookingAndWithdrawHistory = async (expertId: string) => {
  await prisma.user.findUniqueOrThrow({
    where: { id: expertId, role: "EXPERT" },
  });

  const expertProfile = await prisma.expertProfile.findUniqueOrThrow({
    where: { userId: expertId },
  });

  const booking = await prisma.booking.findMany({
    where: { expertId, isPayment: true },
    select: {
      id: true,
      orderId: true,
      price: true,
      deliveryTime: true,
      date: true,
      status: true,
      refundedAmount: true,
      penaltyAmount: true,
      service: {
        select: {
          serviceType: true,
        },
      },
      seeker: {
        select: {
          id: true,
          uniqueId: true,
        },
      },
      earnings: {
        select: {
          amount: true,
        },
      },
      adminEarnings: {
        select: {
          amount: true,
        },
      },
    },
  });

  const withdraw = await prisma.withdraw.findMany({
    where: { expertId },
    include: {
      payoutAccount: {
        select: {
          name: true,
          mobile: true,
          city: true,
        },
      },
    },
  });

  const pendingWithdrawAmount = await prisma.withdraw.aggregate({
    where: { expertId, status: "Pending" },
    _sum: {
      amount: true,
    },
  });

  const meta = {
    totalEarnings: expertProfile.allTimeEarnings,
    currentEarnings: expertProfile.currentEarnings,
    pendingWithdrawAmount: pendingWithdrawAmount._sum.amount || 0,
  };

  return { booking, withdraw, meta };
};

export const adminServices = {
  getExpertsBookingAndWithdrawHistory,
  responseUserReportIntoDB,
  responseToExpertReportIntoDB,
  deleteReviewFromDB,
  sendLoginOtpToPhone,
  verifyLoginOtpFromDB,
  deleteSentNotificationFromDB,
  getAllRefundsFromDB,
  getAdminProfileFromDB,
  updateExpertSubscriptionPlan,
  sendNotificationsToUsers,
  getAllActivityFromDB,
  updateAdminDetailsIntoDB,
  getAllSubscriberFromDB,
  getAllUsersFromDB,
  getAllChatsBetweenUsers,
  createPrivacyPolicy,
  createTermsAndCondition,
  getAllReportsFromDB,
  getAllTermsAndCondition,
  getAdminsBookingEarningFromDB,
  createExpertSubscriptionPlanIntoDB,
  createSubscriptionPlanIntoDB,
  updateUserSubscriptionPlan,
  getAllSubscriptionPlansFromDB,
  getAdminEarningSummaryFromDB,
  getAdminDetailsFromDB,
  getAllFeedbacksFromDB,
  getSentNotificationsFromDB,
  getAllTransactiosFromDB,
  unsuspendUserFromDB,
  getAllExpertPlansFromDB,
  getPrivacyPolicy,
  getSingleFaqFromDB,
  updateFaqIntoDB,
  deleteFaqFromDB,
  deleteAdminFromDB,
  createFaqIntoDB,
  getAllFaqsFromDB,
  deleteUserFromDB,
  getExpertDetailsFromDB,
  acceptWithdrawRequestIntoDB,
  updateAdminDetailsByAdmin,
  getDashboardOverviewFromDB,
  getSessionSummaryFromDB,
  getAllReviewsFromDB,
  getAllUserReportsFromDB,
  getAllExperReportsFromDB,
  getAllAdminsFromDB,
  rejectWithdrawRequestFromDB,
  getWithdrawRequestDetailsFromDB,
  verifyPayoutRequest,
  createNewAdminIntoDB,
  toggleDeactivateUserIntoDB,
  deleteActivityFromDB,
  getAllOrdersFromDB,
  acceptExpertApplication,
  getJobSeekerDetailsFromDB,
  getAllSessionsFromDB,
  getAllApplicationsFromDB,
  suspendUserIntoDB,
  getAllJobSeekerFromDB,
  getAllExpertsFromDB,
  getAllWithdrawRequestsFromDB,
  getAdminsSubscriptionEarningFromDB,
};
