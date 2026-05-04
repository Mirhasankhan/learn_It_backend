import prisma from "../shared/prisma";
import { bookingServices } from "../app/modules/booking/booking.service";
import ApiError from "../errors/ApiErrors";
import { S3Client, PutObjectAclCommand } from "@aws-sdk/client-s3";
import config from "../config";

// Initialize S3 client for DigitalOcean Spaces
const s3Client = new S3Client({
  endpoint: config.digitalOceanspaces.spaces_endpoint,
  region: config.digitalOceanspaces.spaces_region,
  credentials: {
    accessKeyId: config.digitalOceanspaces.spaces_key as string,
    secretAccessKey: config.digitalOceanspaces.spaces_secret as string,
  },
  forcePathStyle: false,
});

// Function to convert ZEGO URL to CDN URL
const convertToCdnUrl = (zegoUrl: string): string => {
  try {
    const cdnUrl = zegoUrl.replace(
      "sefr.lon1.digitaloceanspaces.com",
      "sefr.lon1.cdn.digitaloceanspaces.com",
    );

    const urlObj = new URL(cdnUrl);
    return urlObj.toString();
  } catch (error) {
    console.error("Error converting to CDN URL:", error);
    return zegoUrl;
  }
};

// Function to set file ACL to public-read
const setFileToPublic = async (fileUrl: string) => {
  try {
    const urlParts = new URL(fileUrl);
    const filePath = urlParts.pathname.substring(1);

    const command = new PutObjectAclCommand({
      Bucket: "sefr",
      Key: filePath,
      ACL: "public-read",
    });

    await s3Client.send(command);
    console.log(`✔ Successfully set file to public: ${fileUrl}`);
  } catch (error) {
    console.error("Error setting recording file to public:", error);
    // Don't throw - log the error but continue processing
  }
};

export const recordCallBack = async (body: any) => {
  console.log("zego result body", body);

  try {
    const { event_type, task_id, detail } = body;

    switch (event_type) {
      case 1: {
        const uploadStatus = detail?.upload_status;
        const files = detail?.file_info || [];

        if (files.length > 0) {
          const recording = await prisma.recording.findUniqueOrThrow({
            where: { taskId: task_id },
          });

          for (const file of files) {
            if (!file.file_url) {
              throw new ApiError(
                400,
                `ZEGO file missing URL. file_id=${file.file_id}`,
              );
            }
            const fileUrl = file.file_url;
            const durationMs = file.duration;
            const zegoUserId = file.user_id;

            // Set the recording file to public-read
            await setFileToPublic(fileUrl);

            // Convert to CDN URL for storing in database
            const cdnUrl = convertToCdnUrl(fileUrl);

            // 2️⃣ User lookup must also be strict
            const user = await prisma.user.findUnique({
              where: { id: zegoUserId },
            });

            if (!user) {
              throw new ApiError(
                400,
                `No user found for ZEGO user_id: ${zegoUserId}`,
              );
            }

            let userFileExpireAt;
            if (user.role === "USER") {
              const now = new Date();

              if (user.subscriptionType === "Free") {
                userFileExpireAt = new Date(
                  now.getTime() + 24 * 60 * 60 * 1000,
                );
              } else if (user.subscriptionType === "ThreeDays") {
                userFileExpireAt = new Date(
                  now.getTime() + 72 * 60 * 60 * 1000,
                );
              } else if (user.subscriptionType === "Weekly") {
                userFileExpireAt = new Date(
                  now.getTime() + 7 * 24 * 60 * 60 * 1000,
                );
              } else if (user.subscriptionType === "Monthly") {
                userFileExpireAt = new Date(
                  now.getTime() + 30 * 24 * 60 * 60 * 1000,
                );
              }

              await prisma.recording.update({
                where: { taskId: task_id },
                data: {
                  userfileUrl: cdnUrl,
                  status: true,
                  userDuration: durationMs,
                  userFileExpireAt,
                },
              });
            } else if (user.role === "EXPERT") {
              await prisma.recording.update({
                where: { taskId: task_id },
                data: {
                  expertfileUrl: cdnUrl,
                  status: true,
                  expertDuration: durationMs,
                },
              });
            } else {
              throw new Error(
                `Unexpected role for user ${zegoUserId}: ${user.role}`,
              );
            }
          }
          await bookingServices.markSessionCompletedIntoDB(recording.bookingId);

          console.log("✔ Recording update completed.");
        }

        break;
      }

      default:
        console.log("⚪ Unhandled ZEGO event:", event_type);
    }

    return;
  } catch (error) {
    console.error("ZEGO callback handler error", error);
    return;
  }
};
