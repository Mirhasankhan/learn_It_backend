import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import { serviceServices } from "./service.services";
import sendResponse from "../../../shared/sendResponse";

const createServcie = catchAsync(async (req: Request, res: Response) => {
  await serviceServices.createServiceIntoDB(req);

  sendResponse(res, {
    success: true,
    statusCode: 201,
    message: "Service created successfully",
  });
});
const getExpertWiseServices = catchAsync(
  async (req: Request, res: Response) => {
    const result = await serviceServices.getExpertWiseServicesFromDB(
      req.user.id
    );

    sendResponse(res, {
      success: true,
      statusCode: 200,
      message: "Services retrieved successfully",
      data: result,
    });
  }
);
const getServiceDetails = catchAsync(async (req: Request, res: Response) => {
  const result = await serviceServices.getServiceDetailFromDB(req.params.id);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Service details retrieved successfully",
    data: result,
  });
});
const updateServiceDetails = catchAsync(async (req: Request, res: Response) => {
  await serviceServices.updateServiceDetailsIntoDB(req);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Service details updated successfully",
  });
});
const deleteService = catchAsync(async (req: Request, res: Response) => {
  await serviceServices.deleteServiceFromDB(req.params.id);

  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Service deleted successfully",
  });
});

export const serviceController = {
  createServcie,
  getExpertWiseServices,
  getServiceDetails,
  deleteService,
  updateServiceDetails,
};
