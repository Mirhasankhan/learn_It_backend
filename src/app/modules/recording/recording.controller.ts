import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { recordingServices } from "./recording.service";

const startRecording = catchAsync(async (req: Request, res: Response) => {
  const bookingId = req.params.id;

  const result = await recordingServices.startRecordingSession(bookingId);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Recording started",
    data: result,
  });
});
const stopRecording = catchAsync(async (req: Request, res: Response) => {
  const taskId = req.params.id;

  const result = await recordingServices.stopRecordingSession(taskId);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Recording stopped successfully",
    data: result,
  });
});

export const recordingController  = {
    startRecording,
    stopRecording
}
