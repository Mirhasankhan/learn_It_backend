import axios from "axios";
import config from "../config";
import { v4 as uuidv4 } from "uuid";

const MOYASAR_API_BASE = "https://api.moyasar.com/v1";
const MOYASAR_SECRET_KEY = config.moyasar.moyasar_secret as string;

interface CreatePayoutPayload {
  source_id: string;
  amount: number;
  destination: {
    type: string;
    iban: string;
    name: string;
    mobile: string;
    city: string;
    country: string;
  };
  metadata: {
    withdrawId: string;
  };
}

export const createPaymentUrl = async (paymentData: any) => {
  const {
    price,
    description,
    cardNumber,
    month,
    year,
    cvc,
    phoneNumber,
    name,
  } = paymentData;

  const data = {
    given_id: uuidv4(),
    amount: price * 100,
    currency: "SAR",
    description: description,
    callback_url: "http://localhost:4012/payment-status",
    source: {
      type: "creditcard",
      name,
      number: cardNumber,
      month,
      year,
      cvc,
      "3ds": true,
    },
    metadata: {
      bookingId: phoneNumber,
    },
  };

  const response = await axios.post(
    "https://api.moyasar.com/v1/payments",
    data,
    {
      auth: {
        username: config.moyasar.moyasar_secret as string,
        password: "",
      },
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  return {
    transaction_url: response.data?.source?.transaction_url,
    moyasarId: data.given_id,
  };
};

export const createPayoutAccount = async (payload: any) => {
  const data = {
    account_type: "bank",
    properties: {
      iban: payload.iban,
    },
    credentials: {
      client_id: payload.client_id,
      client_secret: payload.client_secret,
    },
  };

  const response = await axios.post(
    "https://api.moyasar.com/v1/payout_accounts",
    data,
    {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      auth: {
        username: config.moyasar.moyasar_secret as string,
        password: "",
      },
    }
  );

  return response;
};

export const payoutAccounts = async () => {
  const response = await axios.get(
    `https://api.moyasar.com/v1/payout_accounts`,
    {
      headers: {
        Accept: "application/json",
      },
      auth: {
        username: config.moyasar.moyasar_secret as string,
        password: "",
      },
    }
  );
  return response.data;
};

export const createPayout = async (payoutData: CreatePayoutPayload) => {
  const sequence_number = Math.floor(
    1000000000000000 + Math.random() * 9000000000000000
  ).toString();

  const source_id = payoutData.source_id;

  const payload = {
    source_id,
    sequence_number,
    amount: payoutData.amount,
    // purpose: "payroll_benefits",
    purpose: "bills_or_rent",
    destination: payoutData.destination,
    comment: "Monthly payout to expert",
    metadata: payoutData.metadata,
  };

  const response = await axios.post(
    `https://api.moyasar.com/v1/payouts`,
    payload,
    {
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      auth: {
        username: config.moyasar.moyasar_secret as string,
        password: "",
      },
    }
  );

  return response.data;
};

export const refundMoyasarPayment = async (
  paymentId: string,
  amount?: number
) => {
  try {
    if (!MOYASAR_SECRET_KEY) {
      throw new Error("Missing Moyasar secret key.");
    }

    const url = `${MOYASAR_API_BASE}/payments/${paymentId}/refund`;

    const response = await axios.post(url, amount ? { amount } : {}, {
      auth: {
        username: MOYASAR_SECRET_KEY,
        password: "",
      },
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    return response.data;
  } catch (err: any) {
    console.error("Refund failed:", err.response?.data || err.message);
    throw new Error(
      err.response?.data?.message || "Unable to process refund at this moment."
    );
  }
};

export const createTokenRecurringPayment = async (
  amount: number,
  token: string
) => {
  try {
    const response = await axios.post(
      "https://api.moyasar.com/v1/payments",
      {
        amount: amount * 100,
        currency: "SAR",
        source: {
          type: "token",
          token: token,
          "3ds": false,
          manual: false,
        },
      },
      {
        auth: {
          username: config.moyasar.moyasar_secret as string,
          password: "",
        },
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    return response.data;
  } catch (error: any) {
    console.error("Moyasar Error:", error.response?.data || error.message);
    throw new Error("Payment creation failed");
  }
};

// {
//     "amount": 1000,
//     "purpose": "bills_or_rent",
//     "destination": {
//         "type": "bank",
//         "iban": "SA8430400108057386290038",
//         "name": "Faisal Alghurayri",
//         "mobile": "0555555555",
//         "country": "Saudi Arabia",
//         "city": "Riyadh"
//     },
//     "comment": "Monthly payout to expert",
//     "metadata": {
//         "expert_id": "EXP001",
//         "order_id": "ORD123"
//     }
// }
