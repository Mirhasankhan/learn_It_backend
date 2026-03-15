import axios from "axios";
import catchAsync from "../shared/catchAsync";
import sendResponse from "../shared/sendResponse";

const PAYPAL_BASE = "https://api-m.sandbox.paypal.com";
const webhook_id = "9TP66636X2716363J"; 
const clientId =
  "AWxeiAckzBTTz_mutdhNKfBaUUCxDob00--HProDSMcTmITLvcAlM9PIFZBProgUm_2ZF5cVWMn0dOGk";
const secret =
  "EDe5b_rqtWXVtpTgdzmRg0pm7Q6b9IVDkB9ZaHyXhqsSgNy7w3LAKJ5aoSui6lbqH3-wbKJUPWltybDt";

// Get OAuth token from PayPal
async function getAccessToken() {
  const auth = Buffer.from(`${clientId}:${secret}`).toString("base64");

  const { data } = await axios.post(
    `${PAYPAL_BASE}/v1/oauth2/token`,
    "grant_type=client_credentials",
    {
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    }
  );

  return data.access_token;
}

// PayPal webhook handler
const handlePayPalWebHook = catchAsync(async (req: any, res: any) => {
  // Use raw body as string for verification
  const rawBody = req.body.toString("utf-8");
  const headers = req.headers;

  const transmissionId = headers["paypal-transmission-id"];
  const transmissionTime = headers["paypal-transmission-time"];
  const certUrl = headers["paypal-cert-url"];
  const authAlgo = headers["paypal-auth-algo"];
  const transmissionSig = headers["paypal-transmission-sig"];

  if (
    !transmissionId ||
    !transmissionSig ||
    !certUrl ||
    !authAlgo ||
    !transmissionTime
  ) {
    return sendResponse(res, {
      statusCode: 400,
      success: false,
      message: "Missing PayPal signature headers.",
      data: null,
    });
  }

  try {
    const accessToken = await getAccessToken();

    const { data: verifyRes } = await axios.post(
      `${PAYPAL_BASE}/v1/notifications/verify-webhook-signature`,
      {
        auth_algo: authAlgo,
        cert_url: certUrl,
        transmission_id: transmissionId,
        transmission_sig: transmissionSig,
        transmission_time: transmissionTime,
        webhook_id,
        webhook_event: JSON.parse(rawBody), 
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log(verifyRes, "verify res");

    if (verifyRes.verification_status !== "SUCCESS") {
      return sendResponse(res, {
        statusCode: 400,
        success: false,
        message: "Invalid PayPal webhook signature.",
        data: null,
      });
    }

    // Parsed event for further processing
    const webhookEvent = JSON.parse(rawBody);
    const eventType = webhookEvent.event_type;
    const resource = webhookEvent.resource;

    // Handle different events
    switch (eventType) {
      // Subscriptions
      case "BILLING.SUBSCRIPTION.CREATED":
        console.log("🆕 Subscription created:", resource.id);
        break;

      case "BILLING.SUBSCRIPTION.ACTIVATED":
        console.log("✅ Subscription activated:", resource.id);
        break;

      case "BILLING.SUBSCRIPTION.CANCELLED":
        console.log("❌ Subscription cancelled:", resource.id);
        break;

      case "BILLING.SUBSCRIPTION.SUSPENDED":
        console.log("⚠️ Subscription suspended:", resource.id);
        break;

      // One-time payments
      case "PAYMENT.CAPTURE.COMPLETED":
        console.log("✅ One-time payment completed:", resource);
        break;
      case "CHECKOUT.ORDER.APPROVED":
        console.log("✅ checkout order approved", resource.id);
        break;

      case "PAYMENT.SALE.COMPLETED":
        console.log("💰 Payment sale completed:", resource.id);
        break;

      case "PAYMENT.SALE.DENIED":
        console.log("🚫 Payment denied:", resource.id);
        break;

      default:
        console.log(`📩 Unhandled PayPal event: ${eventType}`);
    }

    res.status(200).send("Event received");
  } catch (err: any) {
    console.error("❌ PayPal Webhook Error:", err.message);
    return sendResponse(res, {
      statusCode: 500,
      success: false,
      message: "Server Error while processing PayPal webhook",
      data: null,
    });
  }
});

export default handlePayPalWebHook;
