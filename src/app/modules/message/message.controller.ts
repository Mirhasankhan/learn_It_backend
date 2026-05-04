import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { messageService } from "./message.service";

const generateFileUrl = catchAsync(async (req, res) => {
  const fileUrl = await messageService.urlGenerate(req);
  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "File URL generated successfully",
    data: fileUrl,
  });
});

const getMessages = catchAsync(async (req, res) => {
  const messages = await messageService.getMessages(req);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Messages retrived successfully",
    data: messages,
  });
});
const deleteChat = catchAsync(async (req, res) => {
  await messageService.deleteChatFromDB(req.params.id);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: "Chat deleted successfully",
  });
});
const toggleChatFlag = catchAsync(async (req, res) => {
  const result = await messageService.toggleChatFlagIntoDB(req.params.id);
  sendResponse(res, {
    success: true,
    statusCode: 200,
    message: result.message,
  });
});

export const messageControllers = {
  generateFileUrl,
  getMessages,
  deleteChat,
  toggleChatFlag
};
