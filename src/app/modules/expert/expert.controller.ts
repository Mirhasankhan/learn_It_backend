import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import { expertService } from "./expert.service";
import sendResponse from "../../../shared/sendResponse";

const getExperts = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const search = req.query.search as string;
  const rating = parseFloat(req.query.rating as string);
  const industry = req.query.industry as string;
  const result = await expertService.getAllExpertsFromDB(
    userId,
    search,
    industry,
    rating
  );
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Experts retrieved successfully",
    data: result,
  });
});
const getExpertDetails = catchAsync(async (req: Request, res: Response) => {
  const expertId = req.params.id;

  const result = await expertService.getExpertDetailsFromDB(req.user.id,expertId);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Expert details retrieved successfully",
    data: result,
  });
});
const getEarningsSummary = catchAsync(async (req: Request, res: Response) => {
  const expertId = req.user.id;
  const type = req.query.type as "weekly" | "monthly";

  const result = await expertService.getExpertEarningSummaryFromDB(
    expertId,
    type
  );
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Earnings summary retrieved successfully",
    data: result,
  });
});

const createPayoutAccount = catchAsync(async (req: Request, res: Response) => {
  const expertId = req.user.id;
  const payload = req.body;

  await expertService.createPayoutAccountIntoDB(expertId, payload);
  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "Payout account created successfully",
  });
});
const expertWisePayoutAccounts = catchAsync(
  async (req: Request, res: Response) => {
    const expertId = req.user.id;

    const result = await expertService.getExpertWisePayoutAccountsFromDB(
      expertId
    );
    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: "Payout accounts retrieved successfully",
      data: result,
    });
  }
);
const sendWithdrawRequest = catchAsync(async (req: Request, res: Response) => {
  const expertId = req.user.id;
  const payload = req.body;

  const result = await expertService.sendWithdrawRequestToAdmin(
    expertId,
    payload
  );
  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "Withdraw request submitted successfully",
    data: result,
  });
});
const getWithdrawHistory = catchAsync(
  async (req: Request, res: Response) => {
    const expertId = req.user.id;

    const result = await expertService.getWithdrawHistoryFromDB(expertId);
    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: "Withdraw history retrieved successfully",
      data: result,
    });
  }
);
const getGrowthSummary = catchAsync(
  async (req: Request, res: Response) => {
    const expertId = req.user.id;

    const result = await expertService.getExpertGrowthSummaryFromDB(expertId);
    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: "Summary retrieved successfully",
      data: result,
    });
  }
);

export const expertController = {
  getExperts,
  getExpertDetails,
  getEarningsSummary,
  expertWisePayoutAccounts,
  getWithdrawHistory,
  sendWithdrawRequest,
  createPayoutAccount,
  getGrowthSummary
};
