import { TNotificationType } from "@prisma/client";
import ApiError from "../../../errors/ApiErrors";
import admin from "../../../helpers/firebase.admin";
import prisma from "../../../shared/prisma";

// Send notification to a single user
export const sendSingleNotification = async (
  type: TNotificationType,
  receiverId: string,
  content: string,
  senderId?: string,
  title?: string,
  typeId?: string
) => {
  const user = await prisma.user.findUnique({
    where: { id: receiverId },
  });

  if (!user?.fcmToken) {
    await prisma.notification.create({
      data: {
        title,
        receiverId,
        senderId,
        content,
        type,
        typeId,
      },
    });
    throw new ApiError(404, "User not found with FCM token");
  }

  const message = {
    notification: {
      title: title || "Notification",
      body: content,
    },
    token: user.fcmToken,
  };

  await prisma.notification.create({
    data: {
      title,
      receiverId,
      senderId,
      content,
      type,
      typeId,
    },
  });

  try {
    const response = await admin.messaging().send(message);
    console.log(response, "notification response");
    return response;
  } catch (error: any) {
    console.log(error, "errors");
    if (error.code === "messaging/invalid-registration-token") {
      throw new ApiError(400, "Invalid FCM registration token");
    } else if (error.code === "messaging/registration-token-not-registered") {
      throw new ApiError(404, "FCM token is no longer registered");
    } else {
      return;
    }
  }
};

export const sendNotification = async (body: string, title: string) => {
  try {
    const users = await prisma.user.findMany({
      where: { fcmToken: { not: null } },
      select: { id: true, fcmToken: true },
    });

    if (users.length === 0) {
      throw new ApiError(404, "No users found with valid FCM tokens.");
    }

    const fcmTokens = users.map((user) => user.fcmToken);

    const message = {
      notification: {
        title: title || "Notification",
        body: body,
      },
      tokens: fcmTokens,
    };
    const response = await admin
      .messaging()
      .sendEachForMulticast(message as any);
    const successIndices = response.responses
      .map((res, idx) => (res.success ? idx : null))
      .filter((idx) => idx !== null) as number[];

    const successfulUsers = successIndices.map((idx) => users[idx]);
    if (successfulUsers.length > 0) {
      await prisma.notification.createMany({
        data: successfulUsers.map((user) => ({
          receiverId: user.id,
          title: title || "Notification",
          content: body,
          type: "Admin",
        })),
      });
    }
    const failedTokens = response.responses
      .map((res, idx) => (!res.success ? fcmTokens[idx] : null))
      .filter((token) => token !== null);

    return {
      successCount: response.successCount,
      failureCount: response.failureCount,
      failedTokens,
    };
  } catch (error) {
    console.error("Error sending notifications:", error);
    throw new ApiError(500, "Failed to send notifications.");
  }
};

export const sendNotifications = async (
  body: string,
  title: string,
  role?: string
) => {
  try {
    const whereCondition: any = {
      fcmToken: { not: null },
    };

    // Role-based filtering (only if role is provided)
    if (role) {
      whereCondition.role = role;
    }

    const users = await prisma.user.findMany({
      where: whereCondition,
      select: { id: true, fcmToken: true },
    });

    if (users.length === 0) {
      throw new ApiError(404, "No users found with valid FCM tokens.");
    }

    const fcmTokens = users.map((user) => user.fcmToken);

    const message = {
      notification: {
        title: title || "Notification",
        body,
      },
      tokens: fcmTokens,
    };

    const response = await admin
      .messaging()
      .sendEachForMulticast(message as any);

    const successIndices = response.responses
      .map((res, idx) => (res.success ? idx : null))
      .filter((idx): idx is number => idx !== null);

    const successfulUsers = successIndices.map((idx) => users[idx]);

    if (successfulUsers.length > 0) {
      await prisma.notification.createMany({
        data: successfulUsers.map((user) => ({
          receiverId: user.id,
          title: title || "Notification",
          content: body,
          type: "Admin",
        })),
      });
    }

    const failedTokens = response.responses
      .map((res, idx) => (!res.success ? fcmTokens[idx] : null))
      .filter((token): token is string => token !== null);

    return {
      successCount: response.successCount,
      failureCount: response.failureCount,
      failedTokens,
    };
  } catch (error) {
    console.error("Error sending notifications:", error);
    throw new ApiError(500, "Failed to send notifications.");
  }
};

const getNotificationsFromDB = async (req: any) => {
  const notifications = await prisma.notification.findMany({
    where: {
      receiverId: req.user.id,
    },
    orderBy: { createdAt: "desc" },
  });

  if (notifications.length === 0) {
    throw new ApiError(404, "No notifications found for the user");
  }

  return notifications;
};

const getSingleNotificationFromDB = async (
  req: any,
  notificationId: string
) => {
  const notification = await prisma.notification.findFirst({
    where: {
      id: notificationId,
      receiverId: req.user.id,
    },
  });

  if (!notification) {
    throw new ApiError(404, "Notification not found for the user");
  }

  const updateNotification = await prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });

  return updateNotification;
};

const markAllNotificationRead = async (receiverId: string) => {
  await prisma.notification.updateMany({
    where: { receiverId },
    data: {
      isRead: true,
    },
  });

  return
};

export const notificationServices = {
  getNotificationsFromDB,
  getSingleNotificationFromDB,
  markAllNotificationRead
};
