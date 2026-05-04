import express from "express";
import auth from "../../middlewares/auth";
import { reviewController } from "./review.controller";
import validateRequest from "../../middlewares/validateRequest";
import { reviewValidation } from "./review.validation";

const router = express.Router();

router.post(
  "/create",
  auth(),
  validateRequest(reviewValidation.reviewValidationSchema),
  reviewController.createReview
);

export const reviewRoutes = router;
