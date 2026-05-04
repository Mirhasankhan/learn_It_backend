import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import { reportServices } from "./report.service";
import sendResponse from "../../../shared/sendResponse";

const createUserReport = catchAsync(async (req: Request, res: Response) => {
  await reportServices.createUserReportIntoDB(req);
  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "Report submitted successfully",
  });
});
const getUserWiseReports = catchAsync(async (req: Request, res: Response) => {
  const result = await reportServices.getUserWiseReportsFromDB(req.user.id);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Reports retrieved successfully",
    data: result,
  });
});
const getUserReportDetails = catchAsync(async (req: Request, res: Response) => {
  const result = await reportServices.getUserReportDetailsFromDB(req.params.id);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Report retrieved successfully",
    data: result,
  });
});
const createExpertReport = catchAsync(async (req: Request, res: Response) => {
  await reportServices.createExpertReportIntoDB(req);
  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "Report submitted successfully",
  });
});
const getExpertWiseReports = catchAsync(async (req: Request, res: Response) => {
  const result = await reportServices.getExpertWiseReportsFromDB(req.user.id);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Reports retrieved successfully",
    data: result,
  });
});
const getExpertReportDetails = catchAsync(
  async (req: Request, res: Response) => {
    const result = await reportServices.getExpertReportDetailsFromDB(
      req.params.id
    );
    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: "Report retrieved successfully",
      data: result,
    });
  }
);
const getReportableOrders = catchAsync(
  async (req: Request, res: Response) => {
    const result = await reportServices.getReportableOrdersFromDB(
      req.user.id
    );
    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: "Orders retrieved successfully",
      data: result,
    });
  }
);

export const reportController = {
  createUserReport,
  getUserWiseReports,
  getUserReportDetails,
  getReportableOrders,
  createExpertReport,
  getExpertWiseReports,
  getExpertReportDetails,
};
