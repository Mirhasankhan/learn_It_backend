import { ExpressAdapter } from "@bull-board/express";
import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { fifteenMinuteQueue, markExpiredQueue, oneHourQueue, subscriptionQueue } from "./queues/subscription.queue";

// Express adapter
const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath("/admin/queues");

// Create Bull Board
createBullBoard({
  queues: [new BullMQAdapter(subscriptionQueue),new BullMQAdapter(fifteenMinuteQueue), new BullMQAdapter(oneHourQueue),new BullMQAdapter(markExpiredQueue)],
  serverAdapter: serverAdapter,
});

// Export router for your Express app
export const bullBoardRouter = serverAdapter.getRouter();
