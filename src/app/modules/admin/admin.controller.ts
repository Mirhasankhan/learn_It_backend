import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { adminServices } from "./admin.service";
import {
  BookingStatus,
  FaqKey,
  PrivacyKey,
  TermsKey,
  WithdrawStatus,
} from "@prisma/client";
import prisma from "../../../shared/prisma";
import ApiError from "../../../errors/ApiErrors";

//get users
const sendLoginOTP = catchAsync(async (req: Request, res: Response) => {
  const result = await adminServices.sendLoginOtpToPhone(req.body);

  sendResponse(res, {
    success: result.success,
    statusCode: result.statusCode,
    message: `${result.message}`,
  });
});
const verifyOtp = catchAsync(async (req: Request, res: Response) => {
  const { phoneNumber, otp } = req.body;
  const result = await adminServices.verifyLoginOtpFromDB(phoneNumber, otp);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Logged In Successfully",
    data: result,
  });
});
const createAdmin = catchAsync(async (req: Request, res: Response) => {
  await adminServices.createNewAdminIntoDB(req);
  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "Admin created Successfully",
  });
});
const allJobSeekers = catchAsync(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const search = req.query.search as string;
  const result = await adminServices.getAllJobSeekerFromDB(page, search);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Job seekers retrieved Successfully",
    data: result,
  });
});
const allSessions = catchAsync(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const status = req.query.status;
  const date = req.query.date;
  const search = req.query.search as string;
  const result = await adminServices.getAllSessionsFromDB(
    page,
    date,
    status,
    search,
  );
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Sessions retrieved Successfully",
    data: result,
  });
});
const allOrders = catchAsync(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const status = req.query.status as BookingStatus;
  const date = req.query.date;
  const search = req.query.search as string;
  const result = await adminServices.getAllOrdersFromDB(
    page,
    date,
    status,
    search,
  );
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Orders retrieved Successfully",
    data: result,
  });
});
const allReviews = catchAsync(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const rating = parseInt(req.query.rating as string);

  const result = await adminServices.getAllReviewsFromDB(page, rating);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Reviews retrieved Successfully",
    data: result,
  });
});
const allReports = catchAsync(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;

  const result = await adminServices.getAllReportsFromDB(page);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Reports retrieved Successfully",
    data: result,
  });
});
const allUserReports = catchAsync(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;

  const result = await adminServices.getAllUserReportsFromDB(page);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "User Reports retrieved Successfully",
    data: result,
  });
});
const allExpertReports = catchAsync(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;

  const result = await adminServices.getAllExperReportsFromDB(page);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Expert Reports retrieved Successfully",
    data: result,
  });
});
const allFeedbacks = catchAsync(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;

  const result = await adminServices.getAllFeedbacksFromDB(page);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Feedbacks retrieved Successfully",
    data: result,
  });
});
const allExperts = catchAsync(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const search = req.query.search as string;
  const result = await adminServices.getAllExpertsFromDB(page, search);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Experts retrieved Successfully",
    data: result,
  });
});
const allExpertsApplication = catchAsync(
  async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const search = req.query.search as string;
    const result = await adminServices.getAllApplicationsFromDB(page, search);
    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: "Experts applications retrieved Successfully",
      data: result,
    });
  },
);
const toggleDeactivateUser = catchAsync(async (req: Request, res: Response) => {
  const userId = req.params.id;
  const adminId = req.user.id;
  const result = await adminServices.toggleDeactivateUserIntoDB(
    userId,
    adminId,
  );
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: `${result}`,
  });
});
const acceptApplicatoin = catchAsync(async (req: Request, res: Response) => {
  const userId = req.params.id;
  const adminId = req.user.id;
  await adminServices.acceptExpertApplication(userId, adminId);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: `Expert application accepted`,
  });
});
const suspendUser = catchAsync(async (req: Request, res: Response) => {
  const { userId, day } = req.body;
  const adminId = req.user.id;
  const result = await adminServices.suspendUserIntoDB(userId, day, adminId);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: `User suspended successfully`,
    data: result,
  });
});
const deleteUser = catchAsync(async (req: Request, res: Response) => {
  const userId = req.params.id;
  const adminId = req.user.id;
  await adminServices.deleteUserFromDB(userId, adminId);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: `User deleted successfully`,
  });
});
const jobSeekerDetails = catchAsync(async (req: Request, res: Response) => {
  const userId = req.params.id;
  const result = await adminServices.getJobSeekerDetailsFromDB(userId);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: `User details retrieved successfully`,
    data: result,
  });
});
const expertDetails = catchAsync(async (req: Request, res: Response) => {
  const expertId = req.params.id;
  const result = await adminServices.getExpertDetailsFromDB(expertId);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: `Expert details retrieved successfully`,
    data: result,
  });
});

const allWithdrawRequests = catchAsync(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const status = req.query.status as WithdrawStatus;
  const result = await adminServices.getAllWithdrawRequestsFromDB(page, status);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Withdraw requests retrieved Successfully",
    data: result,
  });
});
const adminBookingEarnings = catchAsync(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;

  const result = await adminServices.getAdminsBookingEarningFromDB(page);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Admin earnings retrieved Successfully",
    data: result,
  });
});
const adminSubscriptionEarnings = catchAsync(
  async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;

    const result = await adminServices.getAdminsSubscriptionEarningFromDB(page);
    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: "Admin earnings retrieved Successfully",
      data: result,
    });
  },
);
const allAdmins = catchAsync(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const status = req.query.status as WithdrawStatus;
  const result = await adminServices.getAllAdminsFromDB(page, status);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Admins retrieved Successfully",
    data: result,
  });
});
const allTransactions = catchAsync(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const result = await adminServices.getAllTransactiosFromDB(page);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Transactions retrieved Successfully",
    data: result,
  });
});
const allSubscribers = catchAsync(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;

  const result = await adminServices.getAllSubscriberFromDB(page);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Subscribers retrieved Successfully",
    data: result,
  });
});
const acceptWithdrawRequest = catchAsync(
  async (req: Request, res: Response) => {
    const withdrawId = req.params.id;
    const adminId = req.user.id;

    const result = await adminServices.acceptWithdrawRequestIntoDB(
      withdrawId,
      adminId,
    );
    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: result.message,
    });
  },
);
const rejectWithdrawRequest = catchAsync(
  async (req: Request, res: Response) => {
    const withdrawId = req.params.id;
    const adminId = req.user.id;

    await adminServices.rejectWithdrawRequestFromDB(withdrawId, adminId);
    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: "Withdraw request rejected successfully",
    });
  },
);
const withdrawRequestDetails = catchAsync(
  async (req: Request, res: Response) => {
    const withdrawId = req.params.id;

    const result =
      await adminServices.getWithdrawRequestDetailsFromDB(withdrawId);
    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: "Withdraw request details retrieved successfully",
      data: result,
    });
  },
);
const deleteAdmin = catchAsync(async (req: Request, res: Response) => {
  const adminId = req.params.id;
  const superAdminId = req.user.id;

  await adminServices.deleteAdminFromDB(adminId, superAdminId);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Admin deleted successfully",
  });
});
const createFaq = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body;
  const adminId = req.user.id;

  await adminServices.createFaqIntoDB(payload, adminId);
  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "FAQ created successfully",
  });
});
const getFaqs = catchAsync(async (req: Request, res: Response) => {
  const result = await adminServices.getAllFaqsFromDB(req.query.key as FaqKey);
  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "FAQs retrived successfully",
    data: result,
  });
});
const getFaq = catchAsync(async (req: Request, res: Response) => {
  const result = await adminServices.getSingleFaqFromDB(req.params.id);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "FAQ retrived successfully",
    data: result,
  });
});
const deleteFaq = catchAsync(async (req: Request, res: Response) => {
  await adminServices.deleteFaqFromDB(req.params.id, req.user.id);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "FAQ deleted successfully",
  });
});
const updateFaq = catchAsync(async (req: Request, res: Response) => {
  await adminServices.updateFaqIntoDB(req.body);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "FAQ updated successfully",
  });
});

const createTermsAndCondition = catchAsync(
  async (req: Request, res: Response) => {
    await adminServices.createTermsAndCondition(req.body);
    sendResponse(res, {
      statusCode: 201,
      success: true,
      message: "Terms & conditions updated successfully",
    });
  },
);
const getAllTermsAndCondition = catchAsync(
  async (req: Request, res: Response) => {
    const key = req.query.key;
    const result = await adminServices.getAllTermsAndCondition(key as TermsKey);
    sendResponse(res, {
      statusCode: 200,
      success: true,
      message: " all terms and condition get  successfully",
      data: result,
    });
  },
);

const createPrivacyPolicy = catchAsync(async (req: Request, res: Response) => {
  await adminServices.createPrivacyPolicy(req.body);
  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Privacy policy updated  successfully",
  });
});

const getPrivacyPolicy = catchAsync(async (req: Request, res: Response) => {
  const key = req.query.key;
  const result = await adminServices.getPrivacyPolicy(key as PrivacyKey);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Privacy policy retrieved successfully",
    data: result,
  });
});
const createSubscriptionPlan = catchAsync(async (req: any, res: any) => {
  await adminServices.createSubscriptionPlanIntoDB(req.body);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Subscription plan created successfully",
  });
});
const updateSubscriptionPlan = catchAsync(async (req: any, res: any) => {
  await adminServices.updateUserSubscriptionPlan(req.body, req.user.id);

  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Subscription plan updated successfully",
  });
});

const createExpertPlan = catchAsync(async (req: Request, res: Response) => {
  await adminServices.createExpertSubscriptionPlanIntoDB(req.body);
  sendResponse(res, {
    statusCode: 201,
    success: true,
    message: "Experts subscription plan created successfully",
  });
});

const updateExpertSubscriptionPlan = catchAsync(async (req: any, res: any) => {
  await adminServices.updateExpertSubscriptionPlan(req.body, req.user.id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Subscription plan updated successfully",
  });
});
const updateAdminDetails = catchAsync(async (req: any, res: any) => {
  await adminServices.updateAdminDetailsIntoDB(req);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Profile updated successfully",
  });
});
const updateAdminDetailsByAdmin = catchAsync(async (req: any, res: any) => {
  await adminServices.updateAdminDetailsByAdmin(req);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Admin details updated successfully",
  });
});
const getDashboardOverview = catchAsync(async (req: any, res: any) => {
  const result = await adminServices.getDashboardOverviewFromDB();

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Overview retrieved successfully",
    data: result,
  });
});
const getAllChats = catchAsync(async (req: any, res: any) => {
  const result = await adminServices.getAllChatsBetweenUsers(
    req.query.search as string,
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Chats retrieved successfully",
    data: result,
  });
});
const getAllplansUser = catchAsync(async (req: any, res: any) => {
  const result = await adminServices.getAllSubscriptionPlansFromDB();

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "User subscription plans retrieved successfully",
    data: result,
  });
});
const getAllExpertplan = catchAsync(async (req: any, res: any) => {
  const result = await adminServices.getAllExpertPlansFromDB();

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Expert subscription plans retrieved successfully",
    data: result,
  });
});
const getAdminEarningSummary = catchAsync(async (req: any, res: any) => {
  const type = req.query.type as "weekly" | "monthly";
  const result = await adminServices.getAdminEarningSummaryFromDB(type);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Earnings summary retrieved successfully",
    data: result,
  });
});
const getSessionSummary = catchAsync(async (req: any, res: any) => {
  const type = req.query.type as "weekly" | "monthly";
  const result = await adminServices.getSessionSummaryFromDB(type);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Session summary retrieved successfully",
    data: result,
  });
});

const allActivities = catchAsync(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;

  const search = req.query.search as string;
  const result = await adminServices.getAllActivityFromDB(page, search);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Activities retrieved Successfully",
    data: result,
  });
});
const deleteActivity = catchAsync(async (req: Request, res: Response) => {
  await adminServices.deleteActivityFromDB(req.params.id);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Activity deleted Successfully",
  });
});
const sendNotifications = catchAsync(async (req: Request, res: Response) => {
  await adminServices.sendNotificationsToUsers(req.body, req.user.id);
  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "Notification sent Successfully",
  });
});
const unsuspenduser = catchAsync(async (req: Request, res: Response) => {
  await adminServices.unsuspendUserFromDB(req.user.id, req.params.id);
  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "Unsuspended Successfully",
  });
});
const adminProfile = catchAsync(async (req: Request, res: Response) => {
  const result = await adminServices.getAdminProfileFromDB(req.user.id);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Profile retrieved Successfully",
    data: result,
  });
});
const adminDetails = catchAsync(async (req: Request, res: Response) => {
  const result = await adminServices.getAdminDetailsFromDB(req.params.id);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Details retrieved Successfully",
    data: result,
  });
});
const getUsers = catchAsync(async (req: Request, res: Response) => {
  const result = await adminServices.getAllUsersFromDB();
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Users retrieved Successfully",
    data: result,
  });
});
const getAdminNotifications = catchAsync(
  async (req: Request, res: Response) => {
    const page = parseInt(req.query.page as string) || 1;
    const result = await adminServices.getSentNotificationsFromDB(page);
    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: "Notifications retrieved Successfully",
      data: result,
    });
  },
);
const getRefunds = catchAsync(async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const result = await adminServices.getAllRefundsFromDB(page);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Refunds retrieved Successfully",
    data: result,
  });
});
const deleteAdminNotification = catchAsync(
  async (req: Request, res: Response) => {
    await adminServices.deleteSentNotificationFromDB(req.params.id);
    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: "Notification deleted Successfully",
    });
  },
);
const deleteReview = catchAsync(async (req: Request, res: Response) => {
  await adminServices.deleteReviewFromDB(req.params.id);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Review deleted Successfully",
  });
});
const responseUserReport = catchAsync(async (req: Request, res: Response) => {
  await adminServices.responseUserReportIntoDB(req.body);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Responded Successfully",
  });
});
const responseExpertReport = catchAsync(async (req: Request, res: Response) => {
  await adminServices.responseToExpertReportIntoDB(req.body);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Responded Successfully",
  });
});
const exxpertsBookingAndWithdrawHistory = catchAsync(
  async (req: Request, res: Response) => {
    const result = await adminServices.getExpertsBookingAndWithdrawHistory(
      req.params.id,
    );
    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: "Responded Successfully",
      data: result,
    });
  },
);

export const adminController = {
  exxpertsBookingAndWithdrawHistory,
  responseUserReport,
  responseExpertReport,
  getSessionSummary,
  sendLoginOTP,
  createSubscriptionPlan,
  deleteReview,
  deleteAdminNotification,
  adminProfile,
  allUserReports,
  allExpertReports,
  getUsers,
  getRefunds,
  getAdminNotifications,
  getAllChats,
  allActivities,
  updateAdminDetails,
  unsuspenduser,
  adminDetails,
  updateExpertSubscriptionPlan,
  getAllplansUser,
  allTransactions,
  getAllExpertplan,
  deleteActivity,
  getAdminEarningSummary,
  getDashboardOverview,
  verifyOtp,
  adminBookingEarnings,
  adminSubscriptionEarnings,
  getFaq,
  updateFaq,
  getPrivacyPolicy,
  createTermsAndCondition,
  getAllTermsAndCondition,
  updateAdminDetailsByAdmin,
  allReviews,
  createExpertPlan,
  createPrivacyPolicy,
  allSubscribers,
  deleteFaq,
  createAdmin,
  allOrders,
  allJobSeekers,
  updateSubscriptionPlan,
  sendNotifications,
  getFaqs,
  acceptWithdrawRequest,
  withdrawRequestDetails,
  allFeedbacks,
  deleteAdmin,
  createFaq,
  rejectWithdrawRequest,
  allReports,
  allAdmins,
  expertDetails,
  allExpertsApplication,
  allWithdrawRequests,
  allExperts,
  deleteUser,
  jobSeekerDetails,
  allSessions,
  acceptApplicatoin,
  suspendUser,
  toggleDeactivateUser,
};
