// src/queues/subscription.queue.ts
import { Queue } from "bullmq";
import redisClient from "../helpers/redis";

export const SUBSCRIPTION_QUEUE_NAME = "subscription-payments";
export const FIFTEEN_MINUTE_QUEUE = "fiteen-minute";
export const ONE_HOUR_QUEUE = "one-hour";
export const MARK_EXPIRED_QUEUE = "mark-expired";

export const subscriptionQueue = new Queue(SUBSCRIPTION_QUEUE_NAME, {
  connection: redisClient,
  defaultJobOptions: {
    removeOnComplete: { age: 60 * 60 * 24 },
    removeOnFail: { age: 60 * 60 * 24 * 7 },
  },
});

export const fifteenMinuteQueue = new Queue(FIFTEEN_MINUTE_QUEUE, {
  connection: redisClient,
  defaultJobOptions: {
    removeOnComplete: { age: 60 * 60 * 24 },
    removeOnFail: { age: 60 * 60 * 24 * 7 },
  },
});
export const oneHourQueue = new Queue(ONE_HOUR_QUEUE, {
  connection: redisClient,
  defaultJobOptions: {
    removeOnComplete: { age: 60 * 60 * 24 },
    removeOnFail: { age: 60 * 60 * 24 * 7 },
  },
});
export const markExpiredQueue = new Queue(MARK_EXPIRED_QUEUE, {
  connection: redisClient,
  defaultJobOptions: {
    removeOnComplete: { age: 60 * 60 * 24 },
    removeOnFail: { age: 60 * 60 * 24 * 7 },
  },
});
