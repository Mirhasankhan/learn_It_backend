import express from "express";
import { messageControllers } from "./message.controller";
import auth from "../../middlewares/auth";
import { fileUploader } from "../../../helpers/fileUploadHelper";
import { AdminRole } from "@prisma/client";

const router = express.Router();

router.post(
  "/generate-url",
  fileUploader.uploadMultiple,
  messageControllers.generateFileUrl
);
router.get("/:roomId", auth(), messageControllers.getMessages);
router.delete(
  "/:id",
  auth(AdminRole.SuperAdmin, AdminRole.DisputeAdmin, AdminRole.UserAdmin),
  messageControllers.deleteChat
);
router.put(
  "/:id",
  auth(AdminRole.SuperAdmin, AdminRole.DisputeAdmin, AdminRole.UserAdmin),
  messageControllers.toggleChatFlag
);

export const messageRoute = router;
