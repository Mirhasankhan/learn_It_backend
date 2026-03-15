// src/workers/subscription.worker.ts
import { Worker, Job } from "bullmq";
import redisClient from "../helpers/redis";
import {
  SUBSCRIPTION_QUEUE_NAME,
  subscriptionQueue,
} from "../queues/subscription.queue";
import prisma from "../shared/prisma";
import { checkRecurringPaymentStatus } from "../helpers/recurring";
import { sendSingleNotification } from "../app/modules/notifications/notification.services";

const worker = new Worker(
  SUBSCRIPTION_QUEUE_NAME,
  async (job: Job) => {
    if (job.name !== "chargeSubscription") {
      console.log("Ignoring unexpected job:", job.name);
      return;
    }

    const { subscriptionDbId, role } = job.data;
    if (!subscriptionDbId) throw new Error("subscriptionDbId is required");

    // Fetch subscription
    const result = await checkRecurringPaymentStatus(subscriptionDbId, role);

    if (!result) {
      console.log("No next payment. Not rescheduling.");
      return;
    }

    const { next, receiverId } = result;

    // Reschedule next run
    const delay = Math.max(0, next.getTime() - Date.now());

    await subscriptionQueue.add(
      "chargeSubscription",
      { subscriptionDbId, role },
      {
        jobId: `sub:${subscriptionDbId}:${next.getTime()}`,
        delay,
        attempts: 2,
        backoff: { type: "exponential", delay: 60_000 },
      },
    );

    try {
      await sendSingleNotification(
        "Subscription",
        receiverId,
        `Your plan has been renewed successfully. Your plan is active until ${next}. Thank you for continuing with us`,
        receiverId,
        `Subscription Plan Renewed`,
      );
    } catch (notificationError) {
      console.error("Notification failed:", notificationError);
    }

    console.log(
      `Subscription ${subscriptionDbId} charged. Next at ${next.toISOString()}`,
    );

    return { success: true };
  },
  { connection: redisClient, concurrency: 5 },
);

// BullMQ Final Failure → delete subscription
worker.on("failed", async (job, err) => {
  console.error(`Job ${job?.id} failed:`, err?.message);

  if (!job) return;

  const { subscriptionDbId } = job.data;

  // If this was the final attempt
  if (job.attemptsMade >= job.opts.attempts!) {
    await prisma.userSubscription.delete({
      where: { id: subscriptionDbId },
    });

    console.log(
      "Subscription cancelled due to repeated payment failures:",
      subscriptionDbId,
    );
  }
});

worker.on("completed", (job) => {
  console.log(`Job ${job.id} completed`);
});

export default worker;
