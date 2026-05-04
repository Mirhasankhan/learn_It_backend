import express from "express";
import auth from "../../middlewares/auth";
import { availabilityController } from "./availability.controller";
import { UserRole } from "@prisma/client";

const router = express.Router();

router.post(
  "/create",
  auth(UserRole.EXPERT),
  availabilityController.createAvailability
);
router.get("/", availabilityController.availabilityForDay);
router.get("/expert-slots", availabilityController.getExpertDayWiseSlots);
router.get(
  "/all-slots",
  auth(UserRole.EXPERT),
  availabilityController.expertAllSlots
);
router.post("/create-slot",  auth(UserRole.EXPERT), availabilityController.addNewSlot);
router.put("/update-slot", availabilityController.updateSlot);
router.delete("/slot/:id", availabilityController.deleteSlot);

export const availabilityRoutes = router;
