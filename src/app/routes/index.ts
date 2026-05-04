import express from "express";
import { userRoutes } from "../modules/user/user.route";
import { authRoutes } from "../modules/auth/auth.route";
import { availabilityRoutes } from "../modules/availability/availability.route";
import { serviceRoutes } from "../modules/service/service.route";
import { expertRoutes } from "../modules/expert/expert.route";
import { bookingRoutes } from "../modules/booking/booking.route";
import { messageRoute } from "../modules/message/message.routes";
import { adminRoutes } from "../modules/admin/admin.route";
import { reviewRoutes } from "../modules/review/review.route";
import { notificationsRoute } from "../modules/notifications/notification.route";
import { subscriptionRoute } from "../modules/susbscription/subscription.route";
import { recordingRoutes } from "../modules/recording/recording.route";
import { reportRoutes } from "../modules/report/report.route";
import { mockSessionRoutes } from "../modules/mockSession/mockSession.route";

const router = express.Router();

const moduleRoutes = [
  {
    path: "/users",
    route: userRoutes,
  },
  {
    path: "/auth",
    route: authRoutes,
  },
  {
    path: "/expert",
    route: expertRoutes,
  },
  {
    path: "/availability",
    route: availabilityRoutes,
  },
  {
    path: "/service",
    route: serviceRoutes,
  },
  {
    path: "/mock-session",
    route: mockSessionRoutes,
  },
  {
    path: "/message",
    route: messageRoute,
  },
  {
    path: "/booking",
    route: bookingRoutes,
  },
  {
    path: "/recording",
    route: recordingRoutes,
  },
  {
    path: "/review",
    route: reviewRoutes,
  },  
  {
    path: "/report",
    route: reportRoutes,
  },  
  {
    path: "/notification",
    route: notificationsRoute,
  },    
  {
    path: "/subscription",
    route: subscriptionRoute,
  },
  {
    path: "/admin",
    route: adminRoutes,
  },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
