import cron from "node-cron";
import prisma from "../shared/prisma";
import { sendSingleNotification } from "../app/modules/notifications/notification.services";

cron.schedule("* * * * *", async () => {
  const now = new Date();
  console.log("came ksdlfk sdlkf");

  // const dueBookings = await prisma.booking.findMany({
  //   where: {
  //     notifyAt: {
  //       lte: now,
  //     },
  //   },
  // });

  // for (const booking of dueBookings) {
  //   try {
  //     await sendSingleNotification(
  //       "Session",
  //       booking.expertId,
  //       `Someone just booked a new with you. Check your dashboard for full details.`,
  //       booking.userId,
  //       `New session is one hour way`,
  //       booking.id
  //     );
  //   } catch (notificationError) {
  //     console.error("Notification failed:", notificationError);
  //   }

  //   try {
  //     await sendSingleNotification(
  //       "Session",
  //       booking.userId, 
  //       `Your booking is confirmed. Check your dashboard for details.`,
  //       booking.expertId,
  //       `Your session is one hour away`,
  //       booking.id
  //     );
  //     console.log(`Notification sent to user: ${booking.userId}`);
  //   } catch (notificationError) {
  //     console.error("User notification failed:", notificationError);
  //   }

  //   // await prisma.booking.update({
  //   //   where: { id: booking.id },
  //   //   data: { notifyAt: null },
  //   // });
  // }
});
