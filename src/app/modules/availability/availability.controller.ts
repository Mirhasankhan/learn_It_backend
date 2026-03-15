import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { availabilityServices } from "./availability.service";

const createAvailability = catchAsync(async (req: Request, res: Response) => {
  const expertId = req.user.id;
  const { availability } = req.body;
  await availabilityServices.createUserAvailability(expertId, availability);
  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "Availability created successfully",
  });
});
const availabilityForDay = catchAsync(async (req: Request, res: Response) => {
  const { expertId, day } = req.body;

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Availabilities retrieved successfully",
  });
});
const getExpertDayWiseSlots = catchAsync(
  async (req: Request, res: Response) => {
    const expertId = req.query.expertId as string;
    const day = parseInt(req.query.day as string);
    const duration = req.query.duration as
      | "30 minutes"
      | "45 minutes"
      | "60 minutes"
      | "90 minutes"
      | "120 minutes"
      | "150 minutes"
      | "180 minutes";

    const result = await availabilityServices.getExpertDayWiseSlotsFromDB(
      expertId,
      day,
      duration
    );
    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: "Slots retrieved successfully",
      data: result,
    });
  }
);
const expertAllSlots = catchAsync(async (req: Request, res: Response) => {
  const expertId = req.user.id;
  const result = await availabilityServices.getExpertsAllSlotsFromDB(expertId);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Slots retrieved successfully",
    data: result,
  });
});
const addNewSlot = catchAsync(async (req: Request, res: Response) => {
  const expertId = req.user.id;
  const { slot } = req.body;

  await availabilityServices.addNewSlotIntoDB(expertId, slot);
  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "Slot created successfully",
  });
});
const updateSlot = catchAsync(async (req: Request, res: Response) => {
  const { slotId, slot } = req.body;
  const result = await availabilityServices.updateSlotFromDB(slotId, slot);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Slot updated successfully",
    data: result,
  });
});
const deleteSlot = catchAsync(async (req: Request, res: Response) => {
  const slotId = req.params.id;
  await availabilityServices.deleteSlotFromDB(slotId);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Slot deleted successfully",
  });
});

export const availabilityController = {
  createAvailability,
  availabilityForDay,
  updateSlot,
  expertAllSlots,
  addNewSlot,
  deleteSlot,
  getExpertDayWiseSlots,
};
