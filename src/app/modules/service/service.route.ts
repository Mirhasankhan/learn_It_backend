import express from "express";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";
import { fileUploader } from "../../../helpers/fileUploadHelper";
import { parseBodyData } from "../../middlewares/parseBodyData";
import { serviceController } from "./service.controller";
import validateRequest from "../../middlewares/validateRequest";
import { serviceSchema } from "./service.validation";

const router = express.Router();

router.post(
  "/create",
  auth(UserRole.EXPERT),
  fileUploader.serviceImage,
  parseBodyData,
  validateRequest(serviceSchema.serviceValidationSchema),
  serviceController.createServcie
);
router.get(
  "/expert-wise",
  auth(UserRole.EXPERT),
  serviceController.getExpertWiseServices
);
router.get("/details/:id", serviceController.getServiceDetails);
router.put(
  "/update",
  auth(UserRole.EXPERT),
  fileUploader.serviceImage,
  parseBodyData,
  serviceController.updateServiceDetails
);
router.delete("/:id", auth(UserRole.EXPERT), serviceController.deleteService);

export const serviceRoutes = router;
