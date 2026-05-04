import { UserRole } from "@prisma/client";
import prisma from "../shared/prisma";
import { createTokenRecurringPayment } from "./moyasar.payment";

export const checkRecurringPaymentStatus = async (
  subscriptionDbId: string,
  role: UserRole,
) => {
  let subscription: any;
  let plan: any;
  let subscriptionType: "USER" | "EXPERT";

  if (role === "USER") {
    subscription = await prisma.userSubscription.findUnique({
      where: { id: subscriptionDbId },
    });
    subscriptionType = "USER";
  } else if (role === "EXPERT") {
    subscription = await prisma.expertSubscription.findUnique({
      where: { id: subscriptionDbId },
    });
    subscriptionType = "EXPERT";
  } else {
    throw new Error("Invalid role");
  }

  if (!subscription) {
    console.warn("Subscription not found:", subscriptionDbId);
    return;
  }

  if (!subscription.status) {
    console.log("Subscription inactive. Skipping:", subscriptionDbId);
    return;
  }
  const receiverId =
    subscriptionType == "USER" ? subscription.userId : subscription.expertId;

  if (subscription.isScheduledCancellation) {
    await prisma.user.update({
      where: { id: receiverId },
      data: { subscriptionType: "Free" },
    });
    if (subscriptionType === "USER") {
      await prisma.userSubscription.delete({
        where: {
          id: subscriptionDbId,
        },
      });
    } else {
      await prisma.expertSubscription.delete({
        where: {
          id: subscriptionDbId,
        },
      });
    }
    return;
  }

  if (subscriptionType === "USER") {
    plan = await prisma.subscription.findUniqueOrThrow({
      where: { id: subscription.subscriptionId },
    });
  } else {
    plan = await prisma.expertPlan.findUniqueOrThrow({
      where: { id: subscription.subscriptionId },
    });
  }

  const sourceId = subscription.sourceId;
  if (!sourceId) throw new Error("sourceId missing in subscription");

  // 3. Charge payment
  let response: any;

  try {
    response = await createTokenRecurringPayment(plan.fee, sourceId);
  } catch (err) {
    console.log(err, "err");
    throw new Error("Payment failed");
  }

  if (response?.status !== "paid") {
    throw new Error("Payment failed");
  }

  // 4. Calculate next payment
  const now = new Date();
  const next = new Date(now.getTime());
  next.setDate(next.getDate() + subscription.interval);

  // 5. Update subscription
  if (subscriptionType === "USER") {
    await prisma.userSubscription.update({
      where: { id: subscriptionDbId },
      data: {
        nextPayment: next,
        status: true,
        availableFreeSession: plan.freeSession,
      },
    });
    const userplan = await prisma.subscription.findUniqueOrThrow({
      where: { id: subscription.subscriptionId },
    });
    await prisma.adminEarnings.create({
      data: {
        amount: userplan.fee,
        earningType: "Subscription",
        userSubId: subscription.id,
      },
    });
  } else {
    await prisma.expertSubscription.update({
      where: { id: subscriptionDbId },
      data: {
        nextPayment: next,
        status: true,
      },
    });
    const expertplan = await prisma.expertPlan.findUniqueOrThrow({
      where: { id: subscription.subscriptionId },
    });
    await prisma.adminEarnings.create({
      data: {
        amount: expertplan.fee,
        earningType: "Subscription",
        expertSubId: subscription.id,
      },
    });
  }

  return { next, receiverId };
};
