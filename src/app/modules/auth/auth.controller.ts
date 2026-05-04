import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { authService } from "./auth.service";

const setUserProfile = catchAsync(async (req: Request, res: Response) => {
  const result = await authService.setUpUserProfileIntoDB(
    req.user.id,
    req.body
  );
  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "Profile set successfully",
    data: result,
  });
});
const setExpertProfile = catchAsync(async (req: Request, res: Response) => {
  const result = await authService.setupExpertProfileIntoDB(req);
  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "Profile set successfully",
    data: result,
  });
});
const editProfileImage = catchAsync(async (req: Request, res: Response) => {
  await authService.editProfileImageIntoDB(req);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Profile image updated successfully",
  });
});
const editUserProfile = catchAsync(async (req: Request, res: Response) => {
  await authService.editUserProfileIntoDB(req);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Profile updated successfully",
  });
});
const editExpertProfile = catchAsync(async (req: Request, res: Response) => {
  await authService.editExpertProfileIntoDB(req);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Profile updated successfully",
  });
});
const addNewExperience = catchAsync(async (req: Request, res: Response) => {
  const expertId = req.user.id;
  const payload = req.body;
  await authService.addNewExperienceIntoDb(expertId, payload);
  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "Experience added successfully",
  });
});
const deleteExperience = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id;

  await authService.deleteExperienceFromDB(id);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Experience deleted successfully",
  });
});
const deleteAccount = catchAsync(async (req: Request, res: Response) => {
  const id = req.user.id;

  await authService.deleteAccountFromDB(id);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "User deleted successfully",
  });
});
const removeHrCertificate = catchAsync(async (req: Request, res: Response) => {
  const { index } = req.body;
  const id = req.user.id;

  const result = await authService.removeHrCertificateFromDB(id, index);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Certificate removed successfully",
    data: result,
  });
});
const addHrCertificate = catchAsync(async (req: Request, res: Response) => {
  await authService.addNewHRCertificateIntoDB(req);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Certificate added successfully",
  });
});
const toggleNotifyOption = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const { option } = req.body;
  await authService.toggleNotifyOptionIntoDB(userId, option);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Notify option toggled successfully",
  });
});
const notifyOptionsState = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const result = await authService.getNotifyOptionStateFromDB(userId);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Notify options state retrieved successfully",
    data: result,
  });
});

export const authController = {
  setUserProfile,
  editProfileImage,
  setExpertProfile,
  editUserProfile,
  notifyOptionsState,
  editExpertProfile,
  addNewExperience,
  deleteExperience,
  removeHrCertificate,
  addHrCertificate,
  toggleNotifyOption,
  deleteAccount
};
