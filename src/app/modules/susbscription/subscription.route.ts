import express from "express";

import auth from "../../middlewares/auth";
import { subscriptionController } from "./subscription.controller";
import { UserRole } from "@prisma/client";

const router = express.Router();

router.get(
  "/all-plans",
  auth(UserRole.USER),
  subscriptionController.getAllPlans
);

router.post(
  "/subscribe-schedule",
  auth(UserRole.USER),
  subscriptionController.userSubscribe
);
router.post("/verify", subscriptionController.verifySubscriptionAndSchedule);
router.delete(
  "/cancel",
  auth(),
  subscriptionController.cancelSubscription
);

//expert routes

router.get(
  "/expert/all-plans",
  auth(UserRole.EXPERT),
  subscriptionController.getExpertPlans
);

router.post(
  "/expert/subscribe-schedule",
  auth(UserRole.EXPERT),
  subscriptionController.expertSubscribe
);

export const subscriptionRoute = router;
