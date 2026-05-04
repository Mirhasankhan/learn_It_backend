import prisma from "../../../shared/prisma";
import ApiError from "../../../errors/ApiErrors";
import { uploadInSpace } from "../../../shared/UploadHelper";
import { Request } from "express";
import { generateReportId } from "../../../helpers/generateOtp";

const createUserReportIntoDB = async (req: Request) => {
  const file = req.file;
  const payload = req.body;

  const booking = await prisma.booking.findUniqueOrThrow({
    where: { id: payload.bookingId },
  });

  const existingReport = await prisma.userReport.findUnique({
    where: { bookingId: payload.bookingId },
  });

  if (existingReport) {
    throw new ApiError(409, "This order has already been reported");
  }

  const processImage = async (file: Express.Multer.File, folder: string) => {
    if (!file) return null;
    return uploadInSpace(file, `courses/${folder}`);
  };

  const fileUrl = file ? await processImage(file, "fileUrl") : null;

  const reportId = generateReportId();

  await prisma.userReport.create({
    data: {
      bookingId: payload.bookingId,
      userId: booking.userId,
      reportId,
      orderId: payload.orderId,
      description: payload.description,
      subject: payload.subject,
      fileUrl,
    },
  });

  await prisma.booking.update({
    where: { id: booking.id },
    data: {
      isReportedByUser: true,
    },
  });

  return;
};

const getUserWiseReportsFromDB = async (userId: string) => {
  await prisma.user.findUniqueOrThrow({
    where: { id: userId },
  });

  const reports = await prisma.userReport.findMany({
    where: { userId },
    select: {
      id: true,
      isResponded: true,
      status: true,
      subject: true,
      description: true,
      orderId: true,
    },
  });

  return reports;
};
const getUserReportDetailsFromDB = async (reportId: string) => {
  const report = await prisma.userReport.findUniqueOrThrow({
    where: { id: reportId },
  });

  return report;
};

const createExpertReportIntoDB = async (req: Request) => {
  const file = req.file;
  const payload = req.body;

  const booking = await prisma.booking.findUniqueOrThrow({
    where: { id: payload.bookingId },
  });

  const existingReport = await prisma.expertReport.findUnique({
    where: { bookingId: payload.bookingId },
  });

  if (existingReport) {
    throw new ApiError(409, "This order has already been reported");
  }

  const processImage = async (file: Express.Multer.File, folder: string) => {
    if (!file) return null;
    return uploadInSpace(file, `courses/${folder}`);
  };

  const fileUrl = file ? await processImage(file, "fileUrl") : null;
  const reportId = generateReportId();
  await prisma.expertReport.create({
    data: {
      bookingId: payload.bookingId,
      expertId: booking.expertId,
      orderId: payload.orderId,
      reportId,
      description: payload.description,
      subject: payload.subject,
      fileUrl,
    },
  });

   await prisma.booking.update({
    where: { id: booking.id },
    data: {
      isReportedByExpert: true,
    },
  });

  return;
};

const getExpertWiseReportsFromDB = async (expertId: string) => {
  await prisma.user.findUniqueOrThrow({
    where: { id: expertId },
  });

  const reports = await prisma.expertReport.findMany({
    where: { expertId },
    select: {
      id: true,
      isResponded: true,
      status: true,
      subject: true,
      description: true,
      orderId: true,
    },
  });

  return reports;
};
const getExpertReportDetailsFromDB = async (reportId: string) => {
  const report = await prisma.expertReport.findUniqueOrThrow({
    where: { id: reportId },
  });

  return report;
};

const getReportableOrdersFromDB = async (id: string) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id },
    select: { role: true },
  });

  let whereCondition: any = {
    isPayment: true,
  };

  if (user.role === "USER") {
    whereCondition.userId = id;
    whereCondition.isReportedByUser = false;
  }

  if (user.role === "EXPERT") {
    whereCondition.expertId = id;
    whereCondition.isReportedByExpert = false;
  }

  const orders = await prisma.booking.findMany({
    where: whereCondition,
    select: {
      id: true,
      orderId: true,
      service: {
        select: {
          serviceName: true,
          serviceType: true,
        },
      },
    },
  });

  return orders;
};

export const reportServices = {
  createUserReportIntoDB,
  getUserWiseReportsFromDB,
  getUserReportDetailsFromDB,
  createExpertReportIntoDB,
  getExpertWiseReportsFromDB,
  getExpertReportDetailsFromDB,
  getReportableOrdersFromDB,
};
