import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import { reviewServices } from "./review.service";
import sendResponse from "../../../shared/sendResponse";

const createReview = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const payload = req.body;

  await reviewServices.createReviewIntoDB(userId, payload);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Review submitted successfully",
  });
});

export const reviewController = {
    createReview
}
