import express from "express";
import { expertController } from "./expert.controller";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";
import validateRequest from "../../middlewares/validateRequest";
import { expertValidation } from "./expert.validation";


const router = express.Router();

router.get("/", auth(), expertController.getExperts);
router.get(
  "/details/:id",
  auth(UserRole.USER),
  expertController.getExpertDetails
);
router.get(
  "/earnings",
  auth(UserRole.EXPERT),
  expertController.getEarningsSummary
);
router.post(
  "/create/payout-account",
  auth(UserRole.EXPERT),
  validateRequest(expertValidation.payoutAccountSchema),
  expertController.createPayoutAccount
);
router.get(
  "/payout-accounts",
  auth(UserRole.EXPERT),
  expertController.expertWisePayoutAccounts
);
router.post(
  "/withdraw-request",
  auth(UserRole.EXPERT), 
  validateRequest(expertValidation.withdrawSchema),
  expertController.sendWithdrawRequest
);
router.get(
  "/withdraw-history",
  auth(UserRole.EXPERT),
  expertController.getWithdrawHistory
);
router.get(
  "/growth-summary",
  auth(UserRole.EXPERT),
  expertController.getGrowthSummary
);

export const expertRoutes = router;
