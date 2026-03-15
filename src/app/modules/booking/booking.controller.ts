import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import { bookingServices } from "./booking.service";
import sendResponse from "../../../shared/sendResponse";
import { BookingStatus } from "@prisma/client";

const createBooking = catchAsync(async (req: Request, res: Response) => {
  const result = await bookingServices.createBookingIntoDB(req);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Booking submitted successfully",
    data: result,
  });
});
const createBookingUsingFreeSession = catchAsync(
  async (req: Request, res: Response) => {
    await bookingServices.createBookingUsingFreeSessionIntoDB(
      req.user.id,
      req.body
    );
    sendResponse(res, {
      success: true,
      statusCode: 201,
      message: "Booking submitted successfully",
    });
  }
);
const rescheduleSession = catchAsync(async (req: Request, res: Response) => {
  await bookingServices.rescheduleSessionIntoDB(req.body);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Session rescheduled successfully",
  });
});

const jobSeekerWiseOrders = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;

  const result = await bookingServices.getJobSeekerWiseOrdersFromDB(userId);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Orders retrieved successfully",
    data: result,
  });
});
const jobSeekerWiseSessions = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user.id;
    const status = req.query.status;

    const result = await bookingServices.getJobSeekerWiseSessionsFromDB(
      userId,
      status as BookingStatus
    );
    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: "Sessions retrieved successfully",
      data: result,
    });
  }
);
const expertWiseSessions = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const status = req.query.status;

  const result = await bookingServices.getExpertWiseSessionsFromDB(
    userId,
    status as BookingStatus
  );
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Sessions retrieved successfully",
    data: result,
  });
});
const expertWiseOrders = catchAsync(async (req: Request, res: Response) => {
  const expertId = req.user.id;

  const result = await bookingServices.getExpertWiseOrdersFromDB(expertId);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Orders retrieved successfully",
    data: result,
  });
});
const orderDetails = catchAsync(async (req: Request, res: Response) => {
  const orderId = req.params.id;
  const userId = req.user.id;
  const result = await bookingServices.getOrderDetailsFromDB(userId, orderId);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Order retrieved successfully",
    data: result,
  });
});
const markSessionRecordingInProgress = catchAsync(
  async (req: Request, res: Response) => {
    const bookingId = req.params.id;

    await bookingServices.markSessionRecordingInProgress(bookingId);
    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: "Recording in progress",
    });
  }
);
const sessionDetails = catchAsync(async (req: Request, res: Response) => {
  const sessionId = req.params.id;
  const userId = req.user.id;
  const result = await bookingServices.getSessionDetailsFromDB(
    userId,
    sessionId
  );
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Session retrieved successfully",
    data: result,
  });
});
const giveFeedback = catchAsync(async (req: Request, res: Response) => {
  const payload = req.body;
  await bookingServices.giveFeedbackToSession(payload);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Feedback submitted successfully",
  });
});

const completeOrder = catchAsync(async (req: Request, res: Response) => {
  const bookingId = req.body.bookingId;

  await bookingServices.markOrderCompletedIntoDB(bookingId);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Booking completed successfully",
  });
});
const cancelOrder = catchAsync(async (req: Request, res: Response) => {
  const bookingId = req.params.id;

  await bookingServices.cancelOrderFromDB(bookingId);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Order cancelled and money refunded",
  });
});
const cancelSession = catchAsync(async (req: Request, res: Response) => {
  const bookingId = req.params.id;
  const userId = req.user.id;

  await bookingServices.cancelSessionFromDB(bookingId, userId);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Session cancelled and money refunded",
  });
});

export const bookingController = {
  createBooking,
  jobSeekerWiseOrders,
  jobSeekerWiseSessions,
  cancelOrder,
  sessionDetails,
  giveFeedback,
  cancelSession,
  expertWiseOrders,
  completeOrder,
  createBookingUsingFreeSession,
  markSessionRecordingInProgress,
  rescheduleSession,
  orderDetails,
  expertWiseSessions,
};
