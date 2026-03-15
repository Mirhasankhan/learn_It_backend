import { Request } from "express";
import prisma from "../../../shared/prisma";
import { uploadInSpace } from "../../../shared/UploadHelper";
import ApiError from "../../../errors/ApiErrors";

const createServiceIntoDB = async (req: Request) => {
  const expertId = req.user.id;
  const payload = req.body;
  const file = req.file;

  //have to check status & isSetup
  await prisma.user.findUniqueOrThrow({
    where: { id: expertId, role: "EXPERT", status:"ACTIVE" },
  });

  const existingService = await prisma.service.findMany({
    where: {
      expertId,
      serviceType: payload.serviceType,
    },
  });

  if (existingService.length >= 5) {
    throw new ApiError(
      400,
      "Limit reached: max 5 services allowed for this category."
    );
  }

  const duplicateService = await prisma.service.findFirst({
    where: {
      expertId,
      serviceType: payload.serviceType,
      serviceName: payload.serviceName.trim(), 
    },
  });

  if (duplicateService) {
    throw new ApiError(
      409,
      "You already have a service with this name in this category."
    );
  }

  if (!!payload.duration === !!payload.delivery) {
    throw new ApiError(
      403,
      "You must provide either duration or delivery time, but not both."
    );
  }

  if (payload.duration && payload.serviceType !== "Career") {
    throw new ApiError(403, "Only Career Consultation can have duration.");
  }
  if (payload.delivery && payload.serviceType == "Career") {
    throw new ApiError(
      403,
      "Career Consultation can have duration not delivery."
    );
  }

  const processImage = async (file: Express.Multer.File, folder: string) => {
    if (!file) return null;
    return uploadInSpace(file, `courses/${folder}`);
  };
  const serviceImage = file ? await processImage(file, "serviceImage") : null;

  if (!serviceImage) {
    throw new ApiError(404, "Service image is required");
  }

  const price = parseFloat(payload.price);

  await prisma.service.create({
    data: {
      ...payload,
      expertId,
      price,
      serviceImage,
    },
  });
  return;
};

const getExpertWiseServicesFromDB = async (expertId: string) => {
  await prisma.user.findUniqueOrThrow({
    where: { id: expertId, role: "EXPERT" },
  });

  const services = await prisma.service.findMany({
    where: { expertId },
    select: {
      id: true,
      serviceImage: true,
      serviceType: true,
      serviceName: true,
      price: true,
      about: true,
    },
  });
  return services;
};

const getServiceDetailFromDB = async (serviceId: string) => {
  const service = await prisma.service.findUniqueOrThrow({
    where: { id: serviceId },
  });
  return service;
};

const updateServiceDetailsIntoDB = async (req: Request) => {
  const file = req.file;
  const payload = req.body;

  const service = await prisma.service.findUniqueOrThrow({
    where: { id: payload.serviceId },
  });

  if (service.serviceType == "Career" && payload.delivery) {
    throw new ApiError(400, "can only have duration");
  }
  if (service.serviceType !== "Career" && payload.duration) {
    throw new ApiError(400, "can only have delivery time");
  }

  const processImage = async (file: Express.Multer.File, folder: string) => {
    if (!file) return null;
    return uploadInSpace(file, `courses/${folder}`);
  };

  const serviceImage = file ? await processImage(file, "serviceImage") : null;

  const newPrice = parseFloat(payload.price);

  await prisma.service.update({
    where: { id: payload.serviceId },
    data: {
      price: payload.price ? newPrice : service.price,
      serviceName: payload.serviceName ?? service.serviceName,
      delivery: payload.delivery ?? service.delivery,
      duration: payload.duration ?? service.duration,
      serviceImage: serviceImage ?? service.serviceImage,
      about: payload.about ?? service.about,
    },
  });

  return;
};

const deleteServiceFromDB = async (serviceId: string) => {
  await prisma.service.delete({
    where: { id: serviceId },
  });
  return;
};

export const serviceServices = {
  createServiceIntoDB,
  getExpertWiseServicesFromDB,
  getServiceDetailFromDB,
  updateServiceDetailsIntoDB,
  deleteServiceFromDB,
};
