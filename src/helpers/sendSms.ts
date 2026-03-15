import axios from "axios";

const BASE_URL = "https://api.authentica.sa";
const API_KEY = "$2y$10$mfAdTFQMUjlwWzr3bBwk9eC./YLQaEs2/0721fJpriPwuB.bZlWcO";

export const sendOtpAuthentica = async (phone: string, method: string) => {
  const url = `${BASE_URL}/api/v2/send-otp`;
  const body =
    method === "email" ? { method, email: phone } : { method, phone };
  try {
    const res = await axios.post(url, body, {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Authorization": API_KEY,
      },
      timeout: 10000,
    });
    return res.data;
  } catch (err: any) {
    return err.response?.data || err;
  }
};

export const verifyOtpAuthentica = async (
  phoneOrEmail: string,
  method: "phone" | "email",
  otp: string
) => {
  const url = `${BASE_URL}/api/v2/verify-otp`;
  const body =
    method === "email"
      ? { method, email: phoneOrEmail, otp }
      : { method, phone: phoneOrEmail, otp };

  try {
    const res = await axios.post(url, body, {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Authorization": API_KEY,
      },
      timeout: 10000,
    });
    return res.data;
  } catch (err: any) {
    return err.response?.data || err;
  }
};
