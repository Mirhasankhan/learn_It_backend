import { Worker, Job } from "bullmq";
import redisClient from "../helpers/redis";
import prisma from "../shared/prisma";
import { ONE_HOUR_QUEUE } from "../queues/subscription.queue";
import { sendSingleNotification } from "../app/modules/notifications/notification.services";

const oneHourWorker = new Worker(
  ONE_HOUR_QUEUE,
  async (job: Job) => {
    switch (job.name) {
      case "oneHourReminder": {
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
            `Your scheduled session (${booking.orderId}) will begin in 1 hour. Please plan accordingly and be available on time.`,
            booking.userId,
            `Upcoming Session in 1 Hour`,
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
            `Your scheduled session (${booking.orderId}) will begin in 1 hour. Please plan accordingly and be available on time.`,
            booking.expertId,
            `Upcoming Session in 1 Hour`,
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

oneHourWorker.on("failed", (job, err) => {
  console.error(`Notification job ${job?.id} failed:`, err?.message);
});

oneHourWorker.on("completed", (job) => {
  console.log(`Notification job ${job.id} completed`);
});

export default oneHourWorker;
