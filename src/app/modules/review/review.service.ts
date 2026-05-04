import { Review } from "@prisma/client";
import prisma from "../../../shared/prisma";
import { sendSingleNotification } from "../notifications/notification.services";

const createReviewIntoDB = async (userId: string, payload: any) => {
  const existingBooking = await prisma.booking.findUniqueOrThrow({
    where: { id: payload.bookingId },
  });

  await prisma.user.findUniqueOrThrow({
    where: { id: existingBooking.userId },
  });

  const result = await prisma.$transaction(async (tx) => {
    const review = await tx.review.create({
      data: {
        comment: payload.comment,
        rating: payload.rating,
        bookingId: existingBooking.id,
        userId,
        expertId: existingBooking?.expertId,
      },
    });
    const stats = await tx.review.aggregate({
      where: { expertId: existingBooking.expertId },
      _count: { _all: true },
      _avg: { rating: true },
    });
    await tx.user.update({
      where: { id: existingBooking.expertId },
      data: {
        totalReview: stats._count._all,
        avgRating: parseFloat((stats._avg.rating || 0).toFixed(1)),
      },
    });

    await tx.booking.update({
      where: { id: payload.bookingId },
      data: { isReviewed: true },
    });

    const userNotify = await prisma.notifyOption.findUniqueOrThrow({
      where: { userId: existingBooking.expertId },
    });

    if (userNotify.all || userNotify.review) {
      try {
        await sendSingleNotification(
          "Earning",
          existingBooking.expertId,
          `You’ve just received a new review from a user. Check your dashboard to see the review.`,
          existingBooking.userId,
          `New Review Received`
        );
      } catch (notificationError) {
        console.error("Notification failed:", notificationError);
      }
    }

    return review;
  });

  return result;
};

export const reviewServices = {
  createReviewIntoDB,
};
