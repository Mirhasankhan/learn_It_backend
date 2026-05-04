
import { Worker, Job } from "bullmq";
import redisClient from "../helpers/redis";
import prisma from "../shared/prisma";
import { FIFTEEN_MINUTE_QUEUE } from "../queues/subscription.queue";
import { sendSingleNotification } from "../app/modules/notifications/notification.services";


const fifteenMinuteWorker = new Worker(
  FIFTEEN_MINUTE_QUEUE,
  async (job: Job) => {
    switch (job.name) {
      case "fifteenMinuteReminder": {
        const { bookingId } = job.data;

        if (!bookingId) {
          throw new Error("Invalid reminder payload");
        }

        const booking = await prisma.booking.findUnique({
          where: { id: bookingId },
        });

        if (!booking) return;

        //send to expert

        try {
          await sendSingleNotification(
            "Session",
            booking.expertId,
            `Your session (${booking.orderId}) is scheduled to start in 15 minutes. Please ensure you're prepared and available.`,
            booking.userId,
            `Session Starting Soon`,
            booking.id
          );
        } catch (notificationError) {
          console.error("Notification failed:", notificationError);
        }

        //send to job seeker
        try {
          await sendSingleNotification(
            "Session",
            booking.userId,
            `Your session (${booking.orderId}) is scheduled to start in 15 minutes. Please ensure you're prepared and available.`,
            booking.expertId,
            `Session Starting Soon`,
            booking.id
          );
        } catch (notificationError) {
          console.error("Notification failed:", notificationError);
        }

        console.log(`Reminder sent to user ${bookingId}`);

        return { success: true };
      }

      default:
        console.log("Ignoring unknown job:", job.name);
        return;
    }
  },
  {
    connection: redisClient,
    concurrency: 5,
  }
);

fifteenMinuteWorker.on("failed", (job, err) => {
  console.error(`Notification job ${job?.id} failed:`, err?.message);
});

fifteenMinuteWorker.on("completed", (job) => {
  console.log(`Notification job ${job.id} completed`);
});

export default fifteenMinuteWorker;
