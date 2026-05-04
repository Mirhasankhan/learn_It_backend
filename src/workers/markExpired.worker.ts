import { Worker, Job } from "bullmq";
import redisClient from "../helpers/redis";
import prisma from "../shared/prisma";
import { MARK_EXPIRED_QUEUE } from "../queues/subscription.queue";
import { sendSingleNotification } from "../app/modules/notifications/notification.services";

const markExpiredWorker = new Worker(
  MARK_EXPIRED_QUEUE,
  async (job: Job) => {
    switch (job.name) {
      case "markExpired": {
        const { bookingId } = job.data;

        if (!bookingId) {
          throw new Error("Invalid reminder payload");
        }

        const booking = await prisma.booking.findUnique({
          where: { id: bookingId },
          include: {
            recordings: true,
          },
        });

        if (!booking || booking.recordings.length > 0) return;

        await prisma.booking.update({
          where: { id: bookingId },
          data: { status: "Expired" },
        });

        console.log(`Booking marked as expired: ${bookingId}`);

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
  },
);

markExpiredWorker.on("failed", (job, err) => {
  console.error(`Notification job ${job?.id} failed:`, err?.message);
});

markExpiredWorker.on("completed", (job) => {
  console.log(`Notification job ${job.id} completed`);
});

export default markExpiredWorker;
