import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { userService } from "./user.services";

//get users
const sendLoginOTP = catchAsync(async (req: Request, res: Response) => {
  const result = await userService.sendLoginOtpToPhone(req.body);

  sendResponse(res, {
    success: result.success,
    statusCode: result.statusCode,
    message: `${result.message}`,
  });
});
const verifyOtp = catchAsync(async (req: Request, res: Response) => {
  const { phoneNumber, otp } = req.body;
  const result = await userService.verifyLoginOtpFromDB(phoneNumber, otp);
  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "Logged In Successfully",
    data: result,
  });
});
const createUser = catchAsync(async (req: Request, res: Response) => {
  const result = await userService.createUserIntoDb(req);
  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "Account created successfully",
    data: result,
  });
});
const getProfile = catchAsync(async (req: Request, res: Response) => {
  const result = await userService.getProfileInfoFromDB(req.user.id);
  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "Profile retrieved successfully",
    data: result,
  });
});
const getSearches = catchAsync(async (req: Request, res: Response) => {
  const result = await userService.getAllRecentSearches(req.user.id);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Recent searches retrieved successfully",
    data: result,
  });
});
const deleteSearch = catchAsync(async (req: Request, res: Response) => {
  await userService.deleteFromRecentSearch(req.params.id);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "search deleted successfully",
  });
});

const toggleFavourite = catchAsync(async (req: Request, res: Response) => {
  const expertId = req.body.expertId;
  const result = await userService.toggleFavouriteExpertIntoDB(
    req.user.id,
    expertId
  );
  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: `${result.message}`,
  });
});
const userWiseFavourites = catchAsync(async (req: Request, res: Response) => {
  const result = await userService.getUserWiseFavouritesFromDB(req.user.id);
  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: `Favourites retrieved successfully`,
    data: result,
  });
});
const userWisePayments = catchAsync(async (req: Request, res: Response) => {
  const result = await userService.getUserWisePaymentHistoryFromDB(req.user.id);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: `Payment history retrieved successfully`,
    data: result,
  });
});
const transactionDetails = catchAsync(async (req: Request, res: Response) => {
  const result = await userService.getTransactionDetailsFromDB(req.params.id);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: `Transaction details retrieved successfully`,
    data: result,
  });
});

const getUserProfile = catchAsync(async (req: Request, res: Response) => {
  const result = await userService.getUserProfileInfoFromDB(req.params.id);
  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "Profile retrieved successfully",
    data: result,
  });
});

export const UserControllers = {
  sendLoginOTP,
  verifyOtp,
  createUser,
  userWisePayments,
  getUserProfile,
  transactionDetails,
  getProfile,
  toggleFavourite,
  getSearches,
  deleteSearch,
  userWiseFavourites
};
