import express from "express";
import auth from "../../middlewares/auth";

import { authController } from "./auth.controller";
import { UserRole } from "@prisma/client";
import { fileUploader } from "../../../helpers/fileUploadHelper";
import { parseBodyData } from "../../middlewares/parseBodyData";
import validateRequest from "../../middlewares/validateRequest";
import { authValidation } from "./auth.validation";

const router = express.Router();

router.post(
  "/set-profile/user",
  auth(UserRole.USER),
  validateRequest(authValidation.userProfileValidationSchema),
  authController.setUserProfile
);
router.post(
  "/set-profile/expert",
  auth(UserRole.EXPERT),
  fileUploader.uploadMultiple,
  parseBodyData,
  validateRequest(authValidation.expertProfileValiationSchema),
  authController.setExpertProfile
);
router.put(
  "/update/profile-image",
  auth(),
  fileUploader.profileImage,
  parseBodyData,
  authController.editProfileImage
);
router.put(
  "/update-profile/user",
  auth(UserRole.USER),
  fileUploader.cvUrl,
  parseBodyData,
  authController.editUserProfile
);
router.put(
  "/update-profile/expert",
  auth(UserRole.EXPERT),
  fileUploader.uploadMultiple,
  parseBodyData,

  authController.editExpertProfile
);
router.post(
  "/add-experience",
  auth(UserRole.EXPERT),
  authController.addNewExperience
);
router.delete(
  "/experience/:id",
  auth(UserRole.EXPERT),
  authController.deleteExperience
);
router.delete(
  "/delete-user",
  auth(UserRole.EXPERT, UserRole.USER),
  authController.deleteAccount
);
router.put(
  "/certificate",
  auth(UserRole.EXPERT),
  authController.removeHrCertificate
);

router.post(
  "/add-certificate",
  auth(UserRole.EXPERT),
  fileUploader.uploadMultiple,
  parseBodyData,
  authController.addHrCertificate
);

router.patch(
  "/toggle-notification",
  auth(),
  validateRequest(authValidation.toggleValidationSchema),
  authController.toggleNotifyOption
);
router.get(
  "/notification-state",
  auth(),
  authController.notifyOptionsState
);

export const authRoutes = router;
