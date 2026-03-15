import ApiError from "../../../errors/ApiErrors";
import config from "../../../config";
import prisma from "../../../shared/prisma";
import { jwtHelpers } from "../../../helpers/jwtHelpers";
import { Otp, UserStatus } from "@prisma/client";
import { uploadInSpace } from "../../../shared/UploadHelper";
import { Request } from "express";
import {
  sendOtpAuthentica,
  verifyOtpAuthentica,
} from "../../../helpers/sendSms";
import {
  generateExperId,
  generateSeekerId,
} from "../../../helpers/generateOtp";

const sendLoginOtpToPhone = async (payload: Otp) => {
  if (!payload.phoneNumber) {
    throw new ApiError(404, "Phone number is required");
  }

  const user = await prisma.user.findFirst({
    where: { phoneNumber: payload.phoneNumber },
  });
  if (user?.status == "DEACTIVATE") {
    throw new ApiError(403, "Account deactivated by Admin");
  }

  if (user?.suspendUntil && new Date(user.suspendUntil) > new Date()) {
    const suspendDate = new Date(user.suspendUntil).toLocaleDateString(
      "en-GB",
      {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }
    );
    throw new ApiError(403, `Your account is suspended until ${suspendDate}.`);
  }

  const pendingExpert = await prisma.user.findUnique({
    where: {
      phoneNumber: payload.phoneNumber,
      role: "EXPERT",
      isSetup: true,
      status: "PENDING",
    },
  });

  // if (pendingExpert) {
  //   throw new ApiError(
  //     403,
  //     "Your account is pending admin verification. Please wait until it is approved before logging in."
  //   );
  // }

  const response = await sendOtpAuthentica(payload.phoneNumber, "sms");
  // const response = { success: true, message: "Otp sent successfully" };

  if (response.success == true) {
    await prisma.otp.upsert({
      where: {
        phoneNumber: payload.phoneNumber,
      },
      update: { fcmToken: payload.fcmToken },
      create: {
        phoneNumber: payload.phoneNumber,
        fcmToken: payload.fcmToken,
      },
    });
    return { success: true, message: response.message, statusCode: 200 };
  } else {
    return { success: false, message: response.message, statusCode: 400 };
  }
};

const verifyLoginOtpFromDB = async (phoneNumber: string, otp: string) => {
  const existingRequest = await prisma.otp.findFirst({
    where: { phoneNumber },
  });

  if (!existingRequest) {
    throw new ApiError(409, "No user request sent using this phone number");
  }

  const response = await verifyOtpAuthentica(phoneNumber, "phone", otp);
  // const response = { status: true, message: "Verification successfull", otp };

  if (response.status === false) {
    throw new ApiError(404, `${response.message}`);
  }

  const existingUser = await prisma.user.findUnique({
    where: { phoneNumber },
  });

  const result = await prisma.$transaction(
    async (tx) => {
      if (existingUser) {
        await tx.otp.delete({
          where: { phoneNumber },
        });

        const accessToken = jwtHelpers.generateToken(
          {
            id: existingUser.id,
            role: existingUser.role,
            isSetup: existingUser.isSetup,
            phoneNumber: existingUser.phoneNumber,
          },
          config.jwt.jwt_secret as string,
          config.jwt.expires_in as string
        );

        await prisma.user.update({
          where: { phoneNumber },
          data: { fcmToken: existingRequest.fcmToken },
        });

        return {
          accessToken,
          role: existingUser.role,
          isSetup: existingUser.isSetup,
        };
      }

      const user = await tx.user.create({
        data: {
          phoneNumber,
          fcmToken: existingRequest.fcmToken,
        },
      });

      await tx.notifyOption.create({
        data: { userId: user.id },
      });

      await tx.otp.delete({
        where: { phoneNumber },
      });

      const accessToken = jwtHelpers.generateToken(
        { id: user.id, role: null, phoneNumber },
        config.jwt.jwt_secret as string,
        config.jwt.expires_in as string
      );

      return {
        accessToken,
        role: null,
        isSetup: false,
      };
    },
    { timeout: 20000 }
  );

  return result;
};

const createUserIntoDb = async (req: Request) => {
  const payload = req.body;
  const file = req.file;
  const id = req.user.id;

  const result = await prisma.user.findUniqueOrThrow({
    where: { id },
  });
  if (result.role) {
    throw new ApiError(404, "User already exists");
  }

  const processImage = async (file: Express.Multer.File, folder: string) => {
    if (!file) return null;
    return uploadInSpace(file, `courses/${folder}`);
  };

  const cvUrl = file ? await processImage(file, "cvUrl") : null;

  if (!cvUrl) {
    throw new ApiError(404, "CV is required");
  }

  const uniqueId =
    payload.role == "USER" ? generateSeekerId() : generateExperId();

  const newUser = await prisma.user.update({
    where: { id },
    data: {
      userName: payload.userName,
      cvUrl,
      uniqueId,
      education: payload.education,
      referralSource: payload.referralSource,
      role: payload.role,
      status: payload.role == "USER" ? "ACTIVE" : "PENDING",
    },
  });
  const accessToken = jwtHelpers.generateToken(
    {
      id,
      role: newUser.role,
      isSetup: newUser.isSetup,
      phoneNumber: newUser.phoneNumber,
    },
    config.jwt.jwt_secret as string,
    config.jwt.expires_in as string
  );
  return {
    accessToken,
    role: newUser.role,
    isSetup: newUser.isSetup,
  };
};

const getProfileInfoFromDB = async (id: string) => {
  const existingUser = await prisma.user.findUnique({
    where: { id },
    select: { role: true },
  });

  if (!existingUser) {
    throw new ApiError(404, "User not found");
  }

  const includeOptions: any = {};
  if (existingUser.role === "EXPERT") {
    includeOptions.ExpertProfile = true;
    includeOptions.Experience = true;
  } else if (existingUser.role === "USER") {
    includeOptions.UserProfile = true;
    includeOptions.userSubscription = true;
  }

  const user = await prisma.user.findUnique({
    where: { id },
    include: includeOptions,
  });

  return user;
};

const getAllRecentSearches = async (userId: string) => {
  await prisma.user.findUniqueOrThrow({
    where: { id: userId },
  });
  const searches = await prisma.recentSearch.findMany({
    where: { userId },
    take: 5,
  });
  return searches;
};

const deleteFromRecentSearch = async (id: string) => {
  await prisma.recentSearch.delete({
    where: { id },
  });
  return;
};

const toggleFavouriteExpertIntoDB = async (
  userId: string,
  expertId: string
) => {
  const [existingExpert, existingUser] = await Promise.all([
    prisma.user.findUnique({ where: { id: expertId, role: "EXPERT" } }),
    prisma.user.findUnique({ where: { id: userId, role: "USER" } }),
  ]);

  if (!existingExpert) {
    throw new ApiError(404, "Expert not found");
  }

  if (!existingUser) {
    throw new ApiError(404, "User not found");
  }
  const existingFavourite = await prisma.favourite.findFirst({
    where: {
      userId,
      expertId,
    },
  });
  if (existingFavourite) {
    await prisma.favourite.delete({
      where: { id: existingFavourite.id },
    });
    return { message: "Expert removed from favourites" };
  }

  const favourite = await prisma.favourite.create({
    data: {
      userId,
      expertId,
    },
  });

  return { message: "Expert added to favourites", favourite };
};

const getUserWiseFavouritesFromDB = async (userId: string) => {
  await prisma.user.findUniqueOrThrow({
    where: { id: userId },
  });

  const favourites = await prisma.favourite.findMany({
    where: { userId },
    include: {
      expert: {
        select: {
          id: true,
          userName: true,
          profileImage: true,
          avgRating: true,
          ExpertProfile: {
            select: {
              targetIndustry: true,
              experience: true,
              about: true,
              introVideo: true,
            },
          },
        },
      },
    },
  });
  return favourites;
};

const getUserWisePaymentHistoryFromDB = async (userId: string) => {
  await prisma.user.findUniqueOrThrow({
    where: { id: userId, role: "USER" },
  });

  const payments = await prisma.booking.findMany({
    where: { userId, isPayment: true },
    select: {
      id: true,
      moyasarId: true,
      service: {
        select: {
          serviceName: true,
          price: true,
        },
      },
      createdAt: true,
    },
  });
  return payments;
};
const getTransactionDetailsFromDB = async (bookingId: string) => {
  const transaction = await prisma.booking.findUniqueOrThrow({
    where: { id: bookingId, isPayment: true },
    select: {
      id: true,
      moyasarId: true,
      paymentMethod: true,
      service: {
        select: {
          serviceName: true,
          price: true,
        },
      },
      createdAt: true,
    },
  });

  return transaction;
};

const getUserProfileInfoFromDB = async (id: string) => {
  const existingUser = await prisma.user.findUniqueOrThrow({
    where: { id },
    select: {
      role: true,
      avgRating: true,
      id: true,
      phoneNumber: true,
      education: true,
      age: true,
      gender: true,
      userName: true,
      totalReview: true,
      profileImage: true,
    },
  });

  return existingUser;
};

export const userService = {
  sendLoginOtpToPhone,
  verifyLoginOtpFromDB,
  getUserWiseFavouritesFromDB,
  getUserProfileInfoFromDB,
  createUserIntoDb,
  getProfileInfoFromDB,
  toggleFavouriteExpertIntoDB,
  getUserWisePaymentHistoryFromDB,
  getTransactionDetailsFromDB,
  getAllRecentSearches,
  deleteFromRecentSearch,
};
