import { Request } from "express";
import { paginationHelper } from "../../../shared/pagination";
import prisma from "../../../shared/prisma";
import { uploadInSpace } from "../../../shared/UploadHelper";

const urlGenerate = async (req: Request) => {
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };

  const processImages = async (files?: Express.Multer.File[]) => {
    if (!files || files.length === 0) return null;
    return Promise.all(
      files.map((file) => uploadInSpace(file, "messages/files")),
    );
  };

  const [fileUrl] = await Promise.all([processImages(files["fileUrl"])]);

  return fileUrl;
};

const getMessages = async (req: Request) => {
  const { roomId } = req.params;
  const { page, limit } = paginationHelper(req.query as any);

  const messages = await prisma.message.findMany({
    where: {
      roomId,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  const messageCount = await prisma.message.count({
    where: {
      roomId,
    },
  });

  const totalPages = Math.ceil(messageCount / limit);

  return {
    messageCount,
    currentPage: page,
    totalPages,
    messages,
  };
};

const deleteChatFromDB = async (chatId: string) => {
  await prisma.room.delete({
    where: { id: chatId },
  });
  return;
};

const toggleChatFlagIntoDB = async (chatId: string) => {
  const room = await prisma.room.findUniqueOrThrow({
    where: { id: chatId },
  });

  await prisma.room.update({
    where: { id: chatId },
    data: { isFlagged: room.isFlagged ? false : true },
  });

  return {
    message: room.isFlagged ? "Chat unflagged successfully." : "Chat flagged successfully.",
  };
};

export const messageService = {
  urlGenerate,
  getMessages,
  deleteChatFromDB,
  toggleChatFlagIntoDB
};
