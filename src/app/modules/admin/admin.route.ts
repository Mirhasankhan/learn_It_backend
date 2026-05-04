import express from "express";
import { adminController } from "./admin.controller";
import { AdminRole, UserRole } from "@prisma/client";
import auth from "../../middlewares/auth";
import { fileUploader } from "../../../helpers/fileUploadHelper";
import { parseBodyData } from "../../middlewares/parseBodyData";
import validateRequest from "../../middlewares/validateRequest";
import { adminValidation } from "./admin.validation";

const router = express.Router();

router.post("/send-login/otp", adminController.sendLoginOTP);
router.post("/verify-otp", adminController.verifyOtp);
router.post(
  "/create",
  auth(AdminRole.SuperAdmin),
  fileUploader.profileImage,
  parseBodyData,
  validateRequest(adminValidation.adminValidationSchema),
  adminController.createAdmin
);
router.get(
  "/job-seekers",
  auth(AdminRole.SuperAdmin, AdminRole.UserAdmin),
  adminController.allJobSeekers
);
router.get(
  "/sessions",
  auth(AdminRole.SuperAdmin, AdminRole.UserAdmin),
  adminController.allSessions
);
router.get(
  "/orders",
  auth(AdminRole.SuperAdmin, AdminRole.UserAdmin),
  adminController.allOrders
);
router.get(
  "/reviews",
  auth(AdminRole.SuperAdmin, AdminRole.DisputeAdmin),
  adminController.allReviews
);
router.get(
  "/reports",
  auth(AdminRole.SuperAdmin, AdminRole.ContentAdmin),
  adminController.allReports
);
router.get(
  "/user-reports",
  auth(AdminRole.SuperAdmin, AdminRole.DisputeAdmin),
  adminController.allUserReports
);
router.get(
  "/expert-reports",
  auth(AdminRole.SuperAdmin, AdminRole.DisputeAdmin),
  adminController.allExpertReports
);
router.get(
  "/feedbacks",
  auth(AdminRole.SuperAdmin, AdminRole.DisputeAdmin),
  adminController.allFeedbacks
);
router.get(
  "/experts",
  auth(AdminRole.SuperAdmin, AdminRole.UserAdmin),
  adminController.allExperts
);
router.get(
  "/all-admins",
  auth(AdminRole.SuperAdmin),
  adminController.allAdmins
);
router.get(
  "/all-transactions",
  auth(AdminRole.SuperAdmin, AdminRole.FinanceAdmin),
  adminController.allTransactions
);
router.get(
  "/admin-earnings/bookings",
  auth(AdminRole.SuperAdmin, AdminRole.FinanceAdmin),
  adminController.adminBookingEarnings
);
router.get(
  "/admin-earnings/subscriptions",
  auth(AdminRole.SuperAdmin, AdminRole.FinanceAdmin),
  adminController.adminSubscriptionEarnings
);
router.get(
  "/experts-applications",
  auth(AdminRole.SuperAdmin, AdminRole.UserAdmin),
  adminController.allExpertsApplication
);
router.patch(
  "/toggle-user/deactivate/:id",
  auth(AdminRole.SuperAdmin, AdminRole.UserAdmin),
  adminController.toggleDeactivateUser
);
router.patch(
  "/accept-application/:id",
  auth(AdminRole.SuperAdmin, AdminRole.UserAdmin),
  adminController.acceptApplicatoin
);
router.patch(
  "/suspend-user",
  auth(AdminRole.SuperAdmin, AdminRole.UserAdmin),
  adminController.suspendUser
);
router.patch(
  "/unsuspend-user/:id",
  auth(AdminRole.SuperAdmin, AdminRole.UserAdmin),
  adminController.unsuspenduser
);
router.delete(
  "/delete-user/:id",
  auth(AdminRole.SuperAdmin, AdminRole.UserAdmin),
  adminController.deleteUser
);
router.delete(
  "/delete-admin/:id",
  auth(AdminRole.SuperAdmin),
  adminController.deleteAdmin
);
router.get(
  "/user-details/:id",
  auth(AdminRole.SuperAdmin, AdminRole.UserAdmin),
  adminController.jobSeekerDetails
);
router.get(
  "/expert-details/:id",
  auth(AdminRole.SuperAdmin, AdminRole.UserAdmin),
  adminController.expertDetails
);
router.get(
  "/withdraw-requests",
  auth(AdminRole.SuperAdmin, AdminRole.FinanceAdmin),
  adminController.allWithdrawRequests
);
router.get(
  "/withdraw-request/:id",
  auth(AdminRole.SuperAdmin, AdminRole.FinanceAdmin, UserRole.EXPERT),
  adminController.withdrawRequestDetails
);
router.post(
  "/withdraw-request/accept/:id",
  auth(AdminRole.SuperAdmin, AdminRole.FinanceAdmin),
  adminController.acceptWithdrawRequest
);
router.delete(
  "/withdraw-request/reject/:id",
  auth(AdminRole.SuperAdmin, AdminRole.FinanceAdmin),
  adminController.rejectWithdrawRequest
);
router.post(
  "/faq-create",
  auth(AdminRole.SuperAdmin, AdminRole.ContentAdmin),
  validateRequest(adminValidation.faqValiationSchema),
  adminController.createFaq
);
router.get(
  "/all-faqs",
  // auth(AdminRole.SuperAdmin, AdminRole.ContentAdmin),
  adminController.getFaqs
);
router.get(
  "/faq/:id",
  // auth(AdminRole.SuperAdmin, AdminRole.ContentAdmin),
  adminController.getFaq
);
router.delete(
  "/faq/:id",
  auth(AdminRole.SuperAdmin, AdminRole.ContentAdmin),
  adminController.deleteFaq
);
router.put(
  "/faq/update",
  auth(AdminRole.SuperAdmin, AdminRole.ContentAdmin),
  adminController.updateFaq
);

router.post(
  "/create-terms-and-condition",
  validateRequest(adminValidation.termsValidationSchema),
  auth(AdminRole.SuperAdmin, AdminRole.ContentAdmin),
  adminController.createTermsAndCondition
);
router.get(
  "/get-all-terms-and-condition",
  adminController.getAllTermsAndCondition
);

router.post(
  "/create-privacy-policy",
  auth(AdminRole.SuperAdmin, AdminRole.ContentAdmin),
  adminController.createPrivacyPolicy
);

router.get("/privacy-policy", adminController.getPrivacyPolicy);

router.post(
  "/user-plan/create",
  auth(AdminRole.SuperAdmin, AdminRole.FinanceAdmin),
  validateRequest(adminValidation.subscriptionValidationSchema),
  adminController.createSubscriptionPlan
);
router.put(
  "/user-plan/update",
  auth(AdminRole.SuperAdmin, AdminRole.FinanceAdmin),
  validateRequest(adminValidation.subscriptionUpdateSchema),
  adminController.updateSubscriptionPlan
);

router.post(
  "/expert-plan/create",
  auth(AdminRole.SuperAdmin, AdminRole.FinanceAdmin),
  validateRequest(adminValidation.expertPlanValidationSchema),
  adminController.createExpertPlan
);

router.put(
  "/expert-plan/update",
  auth(AdminRole.SuperAdmin, AdminRole.FinanceAdmin),
  validateRequest(adminValidation.expertPlanUpdateSchema),
  adminController.updateExpertSubscriptionPlan
);
router.put(
  "/profile/update",
  auth(
    AdminRole.SuperAdmin,
    AdminRole.ContentAdmin,
    AdminRole.DisputeAdmin,
    AdminRole.FinanceAdmin,
    AdminRole.UserAdmin
  ),
  fileUploader.profileImage,
  parseBodyData,
  adminController.updateAdminDetails
);
router.put(
  "/details/update",
  auth(AdminRole.SuperAdmin),
  fileUploader.profileImage,
  parseBodyData,
  adminController.updateAdminDetailsByAdmin
);
router.get(
  "/dashboard-overview",
  auth(AdminRole.SuperAdmin),

  adminController.getDashboardOverview
);
router.get(
  "/all-chats",
  auth(AdminRole.SuperAdmin, AdminRole.DisputeAdmin),
  adminController.getAllChats
);
router.get(
  "/subscription-plan/user",
  auth(AdminRole.SuperAdmin, AdminRole.FinanceAdmin),
  adminController.getAllplansUser
);
router.get(
  "/subscription-plan/expert",
  auth(AdminRole.SuperAdmin, AdminRole.FinanceAdmin),
  adminController.getAllExpertplan
);
router.get(
  "/subscribers",
  auth(AdminRole.SuperAdmin, AdminRole.FinanceAdmin),
  adminController.allSubscribers
);
router.get(
  "/earnings-summary",
  auth(AdminRole.SuperAdmin),
  adminController.getAdminEarningSummary
);
router.get(
  "/session-summary",
  auth(AdminRole.SuperAdmin),
  adminController.getSessionSummary
);
router.get(
  "/activities",
  auth(AdminRole.SuperAdmin),
  adminController.allActivities
);
router.get("/profile", auth(), adminController.adminProfile);
router.get(
  "/details/:id",
  auth(AdminRole.SuperAdmin),
  adminController.adminDetails
);
router.get(
  "/all-users",
  auth(AdminRole.SuperAdmin, AdminRole.ContentAdmin),
  adminController.getUsers
);
router.get(
  "/all-notifications",
  auth(AdminRole.SuperAdmin, AdminRole.ContentAdmin),
  adminController.getAdminNotifications
);
router.get(
  "/booking-withdraw-history/:id",
  auth(AdminRole.SuperAdmin, AdminRole.UserAdmin),
  adminController.exxpertsBookingAndWithdrawHistory
);
router.get(
  "/refunds",
  auth(AdminRole.SuperAdmin, AdminRole.UserAdmin, AdminRole.FinanceAdmin),
  adminController.getRefunds
);
router.delete(
  "/activity/:id",
  auth(AdminRole.SuperAdmin),
  adminController.deleteActivity
);
router.delete(
  "/notification/:id",
  auth(AdminRole.SuperAdmin, AdminRole.ContentAdmin),
  adminController.deleteAdminNotification
);
router.delete(
  "/review/:id",
  auth(AdminRole.SuperAdmin, AdminRole.DisputeAdmin),
  adminController.deleteReview
);
router.post(
  "/send-notification",
  auth(AdminRole.SuperAdmin, AdminRole.ContentAdmin),
  validateRequest(adminValidation.adminNotificationSchema),
  adminController.sendNotifications
);
router.put(
  "/response/user-report",
  auth(AdminRole.SuperAdmin, AdminRole.DisputeAdmin),
  validateRequest(adminValidation.userReportResponseSchema),
  adminController.responseUserReport
);
router.put(
  "/response/expert-report",
  auth(AdminRole.SuperAdmin, AdminRole.DisputeAdmin),
  validateRequest(adminValidation.expertReportResponseSchema),
  adminController.responseExpertReport
);

export const adminRoutes = router;
