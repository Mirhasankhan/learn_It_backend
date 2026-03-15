import express from "express";
import { reportController } from "./report.controller";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";
import validateRequest from "../../middlewares/validateRequest";
import { reportValidation } from "./report.valiation";
import { fileUploader } from "../../../helpers/fileUploadHelper";
import { parseBodyData } from "../../middlewares/parseBodyData";

const router = express.Router();

router.post(
  "/user/create",
  auth(UserRole.USER),
  fileUploader.fileUrl,
  parseBodyData,
  validateRequest(reportValidation.userReportValidationSchema),
  reportController.createUserReport
);
router.get(
  "/user-wise",
  auth(UserRole.USER),
  reportController.getUserWiseReports
);
router.get(
  "/user-wise/:id",  
  reportController.getUserReportDetails
);
router.post(
  "/expert/create",
  auth(UserRole.EXPERT),
  fileUploader.fileUrl,
  parseBodyData,
  validateRequest(reportValidation.expertReportValidationSchema),
  reportController.createExpertReport
);
router.get(
  "/expert-wise",
  auth(UserRole.EXPERT),
  reportController.getExpertWiseReports
);
router.get(
  "/expert-wise/:id",  
  reportController.getExpertReportDetails
);
router.get(
  "/reportable-orders",  
  auth(),
  reportController.getReportableOrders
);

export const reportRoutes = router;
