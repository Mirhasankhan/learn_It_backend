import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { mockSessionServices } from "./mockSession.service";

const getMockSession = catchAsync(async (req: Request, res: Response) => {
  const result = await mockSessionServices.getMockSessionDataFromDB();
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Mock session retrieved successfully",
    data: result,
  });
});
const updateMockSession = catchAsync(async (req: Request, res: Response) => {
  await mockSessionServices.updateMockSessionDetailsIntoDB(req.body);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Mock session updated successfully",
  });
});
const bookMockSession = catchAsync(async (req: Request, res: Response) => {
  const result = await mockSessionServices.createMockSessionIntoDB(
    req.user.id,
    req.body
  );
  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "Mock session booked successfully",
    data: result,
  });
});

export const mockSessionController = {
  getMockSession,
  updateMockSession,
  bookMockSession
};
