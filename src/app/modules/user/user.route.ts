import express from "express";
import { UserControllers } from "./user.controller";
import validateRequest from "../../middlewares/validateRequest";
import { userValidation } from "./user.validation";
import { fileUploader } from "../../../helpers/fileUploadHelper";
import { parseBodyData } from "../../middlewares/parseBodyData";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";


const router = express.Router();

router.post("/send-login/otp", UserControllers.sendLoginOTP);
router.post("/verify-otp",  UserControllers.verifyOtp);
router.post(
  "/create",
  auth(),
  fileUploader.cvUrl,
  parseBodyData,
  validateRequest(userValidation.userRegisterValidationSchema),
  UserControllers.createUser
);
router.get("/profile", auth(), UserControllers.getProfile);
router.get("/recent-search", auth(), UserControllers.getSearches);
router.delete("/search/:id", auth(), UserControllers.deleteSearch);
router.get("/profile/:id", UserControllers.getUserProfile);
router.post(
  "/toggle-favourite",
  auth(UserRole.USER),
  UserControllers.toggleFavourite
);
router.get(
  "/favourites",
  auth(UserRole.USER),
  UserControllers.userWiseFavourites
);
router.get(
  "/payment-history",
  auth(UserRole.USER),
  UserControllers.userWisePayments
);
router.get("/transaction/:id", UserControllers.transactionDetails);

export const userRoutes = router;
