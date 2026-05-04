import ApiError from "../../../errors/ApiErrors";
import { subscriptionQueue } from "../../../queues/subscription.queue";
import prisma from "../../../shared/prisma";

export function jobIdForSubscription(
  subscriptionDbId: string,
  runAtMs?: number,
) {
  return runAtMs
    ? `sub:${subscriptionDbId}:${runAtMs}`
    : `sub:${subscriptionDbId}`;
}

const getAllSubscriptionPlansFromDB = async (userId: string) => {
  await prisma.user.findUniqueOrThrow({
    where: { id: userId, role: "USER" },
  });
  const subscriptionPlans = await prisma.subscription.findMany({
    include: {
      userSubscription: {
        where: {
          userId,
          status: true,
        },
        select: {
          id: true,
          nextPayment: true,
          isScheduledCancellation: true,
          status: true,
        },
      },
      _count: {
        select: {
          userSubscription: true,
        },
      },
    },
  });

  return subscriptionPlans;
};

const userSubscribeIntoDB = async (userId: string, subscriptionId: string) => {
  await prisma.user.findUniqueOrThrow({
    where: { id: userId, role: "USER" },
  });

  const subscription = await prisma.subscription.findUniqueOrThrow({
    where: { id: subscriptionId },
  });

  const existingActive = await prisma.userSubscription.findFirst({
    where: {
      userId,
      status: true,
    },
  });

  if (existingActive) {
    throw new ApiError(409, "You already have an active subscription.");
  }

  const INTERVAL_MAP: Record<string, number> = {
    Monthly: 30,
    Weekly: 7,
    ThreeDays: 3,
  };

  const interval = INTERVAL_MAP[subscription.type];
  if (!interval) {
    throw new Error(`Unsupported interval type: ${subscription.type}`);
  }

  const nextPayment = new Date(Date.now() + interval * 24 * 60 * 60 * 1000);

  const result = await prisma.userSubscription.upsert({
    where: { userId },
    create: {
      userId,
      subscriptionId,
      type: subscription.type,
      interval,
      nextPayment,
      availableFreeSession: subscription.freeSession,
    },
    update: {
      subscriptionId,
      type: subscription.type,
      interval,
      nextPayment,
      availableFreeSession: subscription.freeSession,
    },
  });

  return result.id;
};

const verifySubscriptionAndSchedule = async (
  userId: string,
  subscriptionId: string,
  sourceId: string,
) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
  });

  let subscription: any;
  let subscriptionType: "USER" | "EXPERT";

  // 2. Resolve subscription based on role
  if (user.role === "USER") {
    subscription = await prisma.userSubscription.findUnique({
      where: { id: subscriptionId },
    });
    subscriptionType = "USER";
  } else if (user.role === "EXPERT") {
    subscription = await prisma.expertSubscription.findUnique({
      where: { id: subscriptionId },
    });
    subscriptionType = "EXPERT";
  } else {
    throw new Error("Unsupported role");
  }

  // 3. Calculate next payment time
  const nextPayment = new Date(
    Date.now() + subscription.interval * 24 * 60 * 60 * 1000
  );
  // const nextPayment = new Date(Date.now() + 2 * 60 * 1000);
  const delay = Math.max(0, nextPayment.getTime() - Date.now());

  if (subscriptionType === "USER") {
    await prisma.userSubscription.update({
      where: { id: subscriptionId },
      data: { status: true, sourceId },
    });
  }

  if (subscriptionType === "EXPERT") {
    await prisma.expertSubscription.update({
      where: { id: subscriptionId },
      data: { status: true, sourceId },
    });
  }

  await prisma.user.update({
    where: { id: userId },
    data: { subscriptionType: subscription.type },
  });

  let amount = 0;
  let userSubId = null;
  let expertSubId = null;

  if (user.role == "USER") {
    const plan = await prisma.subscription.findUniqueOrThrow({
      where: { id: subscription.subscriptionId },
    });
    amount = plan.fee;
    userSubId = subscription.id;
  } else {
    const plan = await prisma.expertPlan.findUniqueOrThrow({
      where: { id: subscription.subscriptionId },
    });

    ((amount = plan.fee), (expertSubId = subscription.id));
  }

  await prisma.adminEarnings.create({
    data: {
      amount: amount,
      earningType: "Subscription",
      expertSubId,
      userSubId,
    },
  });

  // 5. Schedule next charge job
  await subscriptionQueue.add(
    "chargeSubscription",
    { subscriptionDbId: subscriptionId, role: subscriptionType },
    {
      jobId: jobIdForSubscription(subscriptionId, nextPayment.getTime()),
      delay,
      attempts: 2,
      backoff: { type: "exponential", delay: 60 * 1000 },
    },
  );

  return;
};

const cancelSubscriptionAndDeleteSchedule = async (userId: string) => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
  });

  let active = null;

  if (user.role == "USER") {
    active = await prisma.userSubscription.findFirst({
      where: { userId, status: true },
    });
  } else {
    active = await prisma.expertSubscription.findFirst({
      where: { expertId: userId, status: true },
    });
  }

  if (!active) {
    throw new Error("No active subscription found for this user.");
  }

  if (user.role == "USER") {
    await prisma.userSubscription.update({
      where: { id: active.id },
      data: { isScheduledCancellation: true },
    });
    return;
  } else {
    await prisma.expertSubscription.update({
      where: { id: active.id },
      data: { isScheduledCancellation: true },
    });
    return;
  }
};
// const cancelSubscriptionAndDeleteSchedule = async (userId: string) => {
//   const user = await prisma.user.findUniqueOrThrow({
//     where: { id: userId },
//   });

//   let active = null;

//   if (user.role == "USER") {
//     active = await prisma.userSubscription.findFirst({
//       where: { userId, status: true },
//     });
//   } else {
//     active = await prisma.expertSubscription.findFirst({
//       where: { expertId: userId, status: true },
//     });
//   }

//   if (!active) {
//     throw new Error("No active subscription found for this user.");
//   }

//   const { id: subscriptionDbId, nextPayment } = active;

//   const jobId = jobIdForSubscription(subscriptionDbId, nextPayment.getTime());

//   await subscriptionQueue.remove(jobId);

//   await prisma.user.update({
//     where: { id: userId },
//     data: { subscriptionType: "Free" },
//   });

//   if (user.role == "USER") {
//     await prisma.userSubscription.delete({
//       where: { id: subscriptionDbId },
//     });
//     return;
//   } else {
//     await prisma.expertSubscription.delete({
//       where: { id: subscriptionDbId },
//     });
//     return;
//   }
// };

const getAllExpertPlansFromDB = async (expertId: string) => {
  await prisma.user.findUniqueOrThrow({
    where: { id: expertId, role: "EXPERT" },
  });
  const subscriptionPlans = await prisma.expertPlan.findMany({
    include: {
      expertSubscriptions: {
        where: {
          expertId,
          status: true,
        },
        select: {
          id: true,
          nextPayment: true,
          isScheduledCancellation: true,
          status: true,
        },
      },
      _count: {
        select: {
          expertSubscriptions: true,
        },
      },
    },
  });

  return subscriptionPlans;
};

//expert

const expertSubscribeIntoDB = async (
  expertId: string,
  subscriptionId: string,
) => {
  await prisma.user.findUniqueOrThrow({
    where: { id: expertId, role: "EXPERT" },
  });

  const subscription = await prisma.expertPlan.findUniqueOrThrow({
    where: { id: subscriptionId },
  });

  const existingActive = await prisma.expertSubscription.findFirst({
    where: {
      expertId,
      status: true,
    },
  });

  if (existingActive) {
    throw new ApiError(409, "You already have an active subscription.");
  }

  const INTERVAL_MAP: Record<string, number> = {
    Monthly: 30,
    Yearly: 365,
  };

  const interval = INTERVAL_MAP[subscription.type];
  if (!interval) {
    throw new Error(`Unsupported interval type: ${subscription.type}`);
  }

  const nextPayment = new Date(Date.now() + interval * 24 * 60 * 60 * 1000);

  const result = await prisma.expertSubscription.upsert({
    where: { expertId },
    create: {
      expertId,
      subscriptionId,
      type: subscription.type,
      interval,
      nextPayment,
    },
    update: {
      subscriptionId,
      type: subscription.type,
      interval,
      nextPayment,
    },
  });

  return result.id;
};

export const subscriptionServices = {
  verifySubscriptionAndSchedule,
  getAllSubscriptionPlansFromDB,
  userSubscribeIntoDB,
  cancelSubscriptionAndDeleteSchedule,
  getAllExpertPlansFromDB,
  expertSubscribeIntoDB,
};
