import prisma from "../shared/prisma";
import { bookingServices } from "../app/modules/booking/booking.service";
import ApiError from "../errors/ApiErrors";
import { S3Client, PutObjectAclCommand } from "@aws-sdk/client-s3";

// Initialize S3 client for DigitalOcean Spaces
const s3Client = new S3Client({
  endpoint: "https://lon1.digitaloceanspaces.com",
  region: "lon1",
  credentials: {
    accessKeyId: "DO00UNHU7XXEV6XCFQNZ",
    secretAccessKey: "+n0RwVumsO8IKSeO4Uc2HSUr+Bi9i60cgi9x0P3veis",
  },
  forcePathStyle: false,
});

// Function to convert ZEGO URL to CDN URL
const convertToCdnUrl = (zegoUrl: string): string => {
  try {
    // Replace the domain with CDN domain and properly encode the URL
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

// Function to set file ACL to public-read with retry logic
const setFileToPublic = async (fileUrl: string, retries = 3) => {
  try {
    const urlObj = new URL(fileUrl);
    // For DigitalOcean Spaces, pathname includes the full path with leading /
    // Example: /record/filename.mp4
    let filePath = urlObj.pathname;

    // Remove leading slash if present
    if (filePath.startsWith("/")) {
      filePath = filePath.substring(1);
    }

    console.log(`Setting file to public - Path: ${filePath}`);

    const command = new PutObjectAclCommand({
      Bucket: "sefr",
      Key: filePath,
      ACL: "public-read",
    });

    await s3Client.send(command);
    console.log(`✔ Successfully set file to public: ${fileUrl}`);
  } catch (error: any) {
    // If it's a NoSuchKey error and we have retries left, wait and retry
    if (error.Code === "NoSuchKey" && retries > 0) {
      console.warn(
        `⚠️ File not yet available (NoSuchKey). Retrying in 2 seconds... (${retries} attempts remaining)`,
      );
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds
      return setFileToPublic(fileUrl, retries - 1); // Retry recursively
    }

    // Log the error with details for debugging
    console.error(
      `Error setting recording file to public. Error: ${error.Code || error.message}`,
    );
    // Don't throw - log the error but continue processing
  }
};

// Function to get recording by task_id or room_id
const getRecordingWithBooking = async (body: any) => {
  const taskId = body.task_id;
  const roomId = body.room_id;

  if (taskId) {
    return prisma.recording.findUnique({
      where: { taskId: taskId },
      include: {
        booking: {
          select: {
            expertId: true,
            userId: true,
          },
        },
      },
    });
  }

  if (roomId) {
    return prisma.recording.findFirst({
      where: {
        booking: {
          roomId: roomId,
        },
      },
      include: {
        booking: {
          select: {
            expertId: true,
            userId: true,
          },
        },
      },
    });
  }

  return null;
};

// Function to determine user role by checking against booking data
const determineUserRoleFromBooking = async (
  zegoUserId: string,
  body: any,
): Promise<"USER" | "EXPERT" | null> => {
  try {
    const recording = await getRecordingWithBooking(body);

    if (!recording) return null;

    // Check if zegoUserId matches expert or user in the booking
    if (zegoUserId === recording.booking.expertId) {
      return "EXPERT";
    } else if (zegoUserId === recording.booking.userId) {
      return "USER";
    }

    return null; // Not a participant in this booking
  } catch (error) {
    console.error("Error determining user role from booking:", error);
    return null;
  }
};

// Function to get the user_id from different event types
const getZegoUserId = (body: any): string | null => {
  // Different events use different field names
  return body.user_account || body.publish_id || body.user_id || null;
};

// Function to get timestamp in milliseconds
const getTimestampMs = (body: any): number => {
  // Most events have timestamp in seconds, convert to ms
  const timestamp =
    body.timestamp || body.login_time || body.logout_time || body.create_time;
  const ts = Number(timestamp);
  // If it looks like seconds (less than 10 digits), convert to ms
  return ts < 10000000000 ? ts * 1000 : ts;
};

export const recordCallBack = async (body: any) => {
  console.log("zego result body", body);

  try {
    const { event_type, event, task_id, detail } = body;

    // Handle event-based routing (for string event names like "room_login", "stream_create")
    if (event) {
      const zegoUserId = getZegoUserId(body);

      // Skip if no user ID found
      if (!zegoUserId) {
        console.log(`⚪ Skipping event "${event}" - no user ID found`);
        return;
      }

      // Determine the actual user role by checking against booking data
      const userRole = await determineUserRoleFromBooking(zegoUserId, body);

      // Skip if user is not part of this booking (e.g., cloud recorder)
      if (userRole === null) {
        console.log(
          `⚪ Skipping event "${event}" - user not part of booking (zegoUserId: ${zegoUserId})`,
        );
        return;
      }

      // Get the recording associated with this task or room
      const recording = await getRecordingWithBooking(body);

      if (!recording) {
        console.log(
          `⚪ No recording found for task_id: ${task_id} or room_id: ${body.room_id}`,
        );
        return;
      }

      const timestampMs = getTimestampMs(body);
      const updateData: any = {};

      switch (event) {
        case "room_login": {
          // User joined the room
          if (userRole === "USER") {
            updateData.userJoinedAt = timestampMs;
          } else if (userRole === "EXPERT") {
            updateData.expertJoinedAt = timestampMs;
          }
          break;
        }

        case "room_logout": {
          // User left the room
          if (userRole === "USER") {
            updateData.userLeftAt = timestampMs;
          } else if (userRole === "EXPERT") {
            updateData.expertLeftAt = timestampMs;
          }
          break;
        }

        case "stream_create": {
          // Stream started - can use this as alternative to room_login
          if (!userRole) break;
          // Only update if not already set by room_login
          if (userRole === "USER" && !recording.userJoinedAt) {
            updateData.userJoinedAt = timestampMs;
          } else if (userRole === "EXPERT" && !recording.expertJoinedAt) {
            updateData.expertJoinedAt = timestampMs;
          }
          break;
        }

        case "stream_close": {
          // Stream ended - can use this as alternative to room_logout
          if (!userRole) break;
          // Only update if not already set by room_logout
          if (userRole === "USER" && !recording.userLeftAt) {
            updateData.userLeftAt = timestampMs;
          } else if (userRole === "EXPERT" && !recording.expertLeftAt) {
            updateData.expertLeftAt = timestampMs;
          }
          break;
        }

        case "room_close": {
          // Room closed - no specific role handling needed
          console.log(`⚪ Room closed for task_id: ${task_id}`);
          break;
        }

        default:
          console.log(`⚪ Unhandled ZEGO event: ${event}`);
          return;
      }

      // Update recording with join/leave timestamps if there's data to update
      if (Object.keys(updateData).length > 0) {
        await prisma.recording.update({
          where: { taskId: recording.taskId },
          data: updateData,
        });
        console.log(`✔ Recording updated for event "${event}":`, updateData);
      }

      return;
    }

    // Handle event_type-based routing (for numeric event types like 1, 7)
    switch (event_type) {
      case 1: {
        // File upload complete
        const uploadStatus = detail?.upload_status;
        const files = detail?.file_info || [];

        if (files.length > 0) {
          const recording = await prisma.recording.findUniqueOrThrow({
            where: { taskId: task_id },
          });

          for (const file of files) {
            try {
              // if (file.status !== 4) {
              //   throw new ApiError(
              //     400,
              //     `ZEGO file incomplete. Status=${file.status}, file_id=${file.file_id}`
              //   );
              // }

              if (!file.file_url) {
                console.warn(
                  `⚠️ ZEGO file missing URL. file_id=${file.file_id}. Skipping this file.`,
                );
                continue;
              }
              const fileUrl = file.file_url;
              const durationMs = file.duration;
              const zegoUserId = file.user_id;

              // Set the recording file to public-read FIRST
              // This should succeed even if other operations fail
              await setFileToPublic(fileUrl);

              // Convert to CDN URL for storing in database
              const cdnUrl = convertToCdnUrl(fileUrl);

              // 2️⃣ User lookup must also be strict
              const user = await prisma.user.findUnique({
                where: { id: zegoUserId },
              });

              if (!user) {
                console.warn(
                  `⚠️ No user found for ZEGO user_id: ${zegoUserId}. Skipping this file.`,
                );
                continue;
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
                console.warn(
                  `⚠️ Unexpected role for user ${zegoUserId}: ${user.role}`,
                );
                continue;
              }
            } catch (fileError) {
              // Log error for this file but continue processing other files
              console.error(
                `Error processing file ${file.file_id}:`,
                fileError,
              );
              continue;
            }
          }
          await bookingServices.markSessionCompletedIntoDB(recording.bookingId);

          console.log("✔ Recording update completed.");
        }

        break;
      }

      case 4:
      case 5:
      case 7: {
        // Events 4, 5, 7 are other recording-related events that we log but don't need to act on
        console.log(`⚪ Unhandled ZEGO event type: ${event_type}`);
        break;
      }

      default:
        console.log("⚪ Unhandled ZEGO event type:", event_type);
    }

    return;
  } catch (error) {
    console.error("ZEGO callback handler error", error);
    return;
  }
};
