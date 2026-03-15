import { Experience, UserProfile } from "@prisma/client";
import prisma from "../../../shared/prisma";
import { uploadInSpace } from "../../../shared/UploadHelper";
import { Request } from "express";
import ApiError from "../../../errors/ApiErrors";

const setUpUserProfileIntoDB = async (userId: string, payload: UserProfile) => {
  return await prisma.$transaction(async (tx) => {
    await tx.user.findUniqueOrThrow({
      where: { id: userId },
    });

    const userProfile = await tx.userProfile.create({
      data: {
        ...payload,
        userId,
      },
    });

    await tx.user.update({
      where: { id: userId },
      data: { isSetup: true },
    });

    return userProfile;
  });
};

const setupExpertProfileIntoDB = async (req: Request) => {
  const payload = req.body;
  let experiences = payload.experiences || [];
  const userId = req.user.id;
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };

  if (experiences.length < 1) {
    throw new ApiError(400, "At least one experience is required");
  }

  const processImages = async (
    files: Express.Multer.File[] | undefined,
    folder: string
  ) => {
    if (!files || files.length === 0) return null;
    return Promise.all(
      files.map((file) => uploadInSpace(file, `courses/${folder}`))
    );
  };

  const [certificateUrl, introVideo, profileImage] = await Promise.all([    
    processImages(files?.certificateUrl, "certificateUrl"),
    processImages(files?.introVideo, "introVideo"),
    processImages(files?.profileImage, "profileImage"),
  ]);

  if (!certificateUrl || !introVideo || !profileImage) {
    throw new ApiError(404, "All media files are needed");
  }

  const result = await prisma.$transaction(async (tx) => {
    const expertProfile = await tx.expertProfile.create({
      data: {      
        certificates: certificateUrl,
        introVideo: introVideo?.[0],
        userId,
        targetIndustry: payload.targetIndustry,
        experience: payload.experience,
        about: payload.about,
        linkedInUrl: payload.linkedInUrl,
      },
    });

    if (experiences.length < 1) {
      throw new ApiError(400, "Experience is required");
    }

    if (typeof experiences === "string") {
      experiences = JSON.parse(experiences);
    }   
   

    if (Array.isArray(experiences) && experiences.length > 0) {
      await tx.experience.createMany({
        data: experiences.map((exp: any) => ({
          expertId: userId,
          title: exp.title,
          companyName: exp.companyName,
          duration: exp.duration,
          description: exp.description,
        })),
      });
    }

    await tx.user.update({
      where: { id: userId },
      data: { isSetup: true, profileImage: profileImage[0] },
    });

    return expertProfile;
  });

  return result;
};

const editProfileImageIntoDB = async (req: Request) => {
  const id = req.user.id;
  const file = req.file;
  await prisma.user.findUniqueOrThrow({
    where: { id },
  });

  const processImage = async (file: Express.Multer.File, folder: string) => {
    if (!file) return null;
    return uploadInSpace(file, `courses/${folder}`);
  };

  const profileImage = file ? await processImage(file, "profileImage") : null;
  if (!profileImage) {
    throw new ApiError(404, "Image is required");
  }

  await prisma.user.update({
    where: { id },
    data: {
      profileImage,
    },
  });
};

const editUserProfileIntoDB = async (req: Request) => {
  const file = req.file;
  const payload = req.body;
  const id = req.user.id;

  const user = await prisma.user.findUniqueOrThrow({
    where: { id, role: "USER" },
  });
  const profile = await prisma.userProfile.findUniqueOrThrow({
    where: { userId: id },
  });

  const processImage = async (file: Express.Multer.File, folder: string) => {
    if (!file) return null;
    return uploadInSpace(file, `courses/${folder}`);
  };

  const cvUrl = file ? await processImage(file, "cvUrl") : null;

  await prisma.user.update({
    where: { id },
    data: {
      age: payload.age ?? user.age,
      gender: payload.gender ?? user.gender,
      userName: payload.userName ?? user.userName,
      cvUrl: cvUrl ?? user.cvUrl,
    },
  });

  await prisma.userProfile.update({
    where: { userId: id },
    data: {
      targetIndustry: payload.targetIndustry ?? profile.targetIndustry,
    },
  });

  return;
};
const editExpertProfileIntoDB = async (req: Request) => {
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };
  const payload = req.body;
  const id = req.user.id;

  const expert = await prisma.user.findUniqueOrThrow({
    where: { id, role: "EXPERT" },
  });
  const profile = await prisma.expertProfile.findUniqueOrThrow({
    where: { userId: id },
  });

  const processImages = async (
    files: Express.Multer.File[] | undefined,
    folder: string
  ) => {
    if (!files || files.length === 0) return null;
    return Promise.all(
      files.map((file) => uploadInSpace(file, `courses/${folder}`))
    );
  };

  const [cvUrl, introVideo] = await Promise.all([
    processImages(files?.cvUrl, "cvUrl"),
    processImages(files?.introVideo, "introVideo"),
  ]);

  await prisma.expertProfile.update({
    where: { userId: id },
    data: {
      about: payload?.about ?? profile.about,
      introVideo: introVideo?.[0] ?? profile.introVideo,
      linkedInUrl: payload.linkedInUrl ?? profile.linkedInUrl,
    },
  });

  await prisma.user.update({
    where: { id },
    data: {
      userName: payload.userName ?? expert.userName,
      cvUrl: cvUrl?.[0] ?? expert.cvUrl,
    },
  });

  return;
};
const addNewExperienceIntoDb = async (
  expertId: string,
  payload: Experience
) => {
  await prisma.user.findUniqueOrThrow({
    where: { id: expertId },
  });

  await prisma.experience.create({
    data: {
      ...payload,
      expertId,
    },
  });
  return;
};

const deleteExperienceFromDB = async (id: string) => {
  await prisma.experience.delete({
    where: { id },
  });
  return;
};

const removeHrCertificateFromDB = async (id: string, index: number) => {
  const existingExpertProfile = await prisma.expertProfile.findUniqueOrThrow({
    where: { userId: id },
  });

  const certificates = existingExpertProfile.certificates as string[];

  if (index < 0 || index >= certificates.length) {
    throw new Error(`Invalid certificate index: ${index}`);
  }
  const updatedCertificates = certificates.filter((_, i) => i !== index);

  return await prisma.expertProfile.update({
    where: { userId: id },
    data: { certificates: updatedCertificates },
  });
};

const addNewHRCertificateIntoDB = async (req: Request) => {
  const id = req.user.id;
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };

  const existingProfile = await prisma.expertProfile.findUniqueOrThrow({
    where: { userId: id },
  });

  const processImages = async (
    files: Express.Multer.File[] | undefined,
    folder: string
  ) => {
    if (!files || files.length === 0) return null;
    return Promise.all(
      files.map((file) => uploadInSpace(file, `courses/${folder}`))
    );
  };

  const [certificateUrl] = await Promise.all([
    processImages(files?.certificateUrl, "certificateUrl"),
  ]);

  if (!certificateUrl || certificateUrl.length === 0) {
    throw new ApiError(400, "Certificate is required");
  }

  const updatedCertificates = [
    ...(existingProfile.certificates || []),
    certificateUrl[0],
  ];

  return await prisma.expertProfile.update({
    where: { userId: id },
    data: { certificates: updatedCertificates },
  });
};

const toggleNotifyOptionIntoDB = async (
  userId: string,
  option: keyof Omit<
    import("@prisma/client").NotifyOption,
    "id" | "userId" | "createdAt" | "updatedAt" | "user"
  >
) => {
  const notifyOption = await prisma.notifyOption.findUniqueOrThrow({
    where: { userId },
  });

  const updated = await prisma.notifyOption.update({
    where: { userId },
    data: {
      [option]: !notifyOption[option],
    },
  });

  return updated;
};

const getNotifyOptionStateFromDB = async (userId: string) => {
  const currentState = await prisma.notifyOption.findUniqueOrThrow({
    where: { userId },
  });
  return currentState;
};

const deleteAccountFromDB = async (userId: string) => {
  await prisma.user.delete({
    where: { id: userId },
  });
  return;
};

export const authService = {
  setUpUserProfileIntoDB,
  setupExpertProfileIntoDB,
  getNotifyOptionStateFromDB,
  deleteAccountFromDB,
  editUserProfileIntoDB,
  editExpertProfileIntoDB,
  addNewExperienceIntoDb,
  deleteExperienceFromDB,
  removeHrCertificateFromDB,
  addNewHRCertificateIntoDB,
  editProfileImageIntoDB,
  toggleNotifyOptionIntoDB,
};
