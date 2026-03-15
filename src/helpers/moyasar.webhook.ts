import { adminServices } from "../app/modules/admin/admin.service";
import { bookingServices } from "../app/modules/booking/booking.service";
import { subscriptionServices } from "../app/modules/susbscription/subscription.service";
import catchAsync from "../shared/catchAsync";

const MOYASAR_SECRET =
  "81cd81655bda127a242c5e2a5c90f312ae00d1ba5959c314b6d69dcd17135f5a";

const handleWebHook = catchAsync(async (req, res) => {
  const signature = req.headers["x-event-secret"];

  if (!signature) {
    return res.status(400).send("Missing secret");
  }

  if (signature !== MOYASAR_SECRET) {
    return res.status(401).send("Invalid secret");
  }

  const event = JSON.parse(req.body.toString());
  const { type, data } = event;

  switch (type) {
    case "payment_paid": {
      const status = data.status;
      const bookingId = data.metadata?.bookingId ?? null;
      const userId = data.metadata?.userId ?? null;
      const sourceId = data.source?.token ?? null;
      const subscriptionId = data.metadata?.subscriptionId ?? null;
      const moyasarId = data.id ?? null;
      const company = data?.source?.company ?? "none";

      console.info(`[Webhook] Payment Paid Received dataasdf`, {
        data
      });

      if (!moyasarId) {
        console.warn("Missing Moyasar payment ID, skipping processing");
        break;
      }

      if (subscriptionId && sourceId) {    
        const result = await subscriptionServices.verifySubscriptionAndSchedule(
          userId,
          subscriptionId,
          sourceId          
        );
        console.log(`[Webhook] Subscription processed`, result);
      } else if (bookingId) {
        // Handle booking payment safely
        const result = await bookingServices.verifyPaymentStatus(
          status,
          bookingId,
          moyasarId,
          company
        );
        console.log(`[Webhook] Booking payment processed`, result);
      } else {
        console.warn("Neither subscription nor booking info found; skipping");
      }

      break;
    }

    case "payment_failed": {
      const status = data.status;
      const bookingId = data.metadata.bookingId;
      const moyasarId = data.id;

      await bookingServices.verifyPaymentStatus(
        status,
        bookingId,
        moyasarId,
        "None"
      );
      break;
    }

    case "payment_refunded": {
      console.log("Payment refunded:", data.id);
      break;
    }

    case "payout_paid": {
      await adminServices.verifyPayoutRequest(
        data.metadata.withdrawId,
        data.status
      );
      break;
    }

    case "payout_failed": {
      await adminServices.verifyPayoutRequest(
        data.metadata.withdrawId,
        data.status
      );
      break;
    }

    default: {
      console.log("Unhandled event type:", type);
    }
  }

  res.status(200).send("Webhook received");
});

export default handleWebHook;
