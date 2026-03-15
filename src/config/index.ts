import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env") });

export default {
  env: process.env.NODE_ENV,
  port: process.env.PORT,
  backend_base_url: process.env.BACKEND_BASE_URL,
  super_admin_password: process.env.SUPER_ADMIN_PASSWORD,
  bcrypt_salt_rounds: process.env.BCRYPT_SALT_ROUNDS,
  jwt: {
    jwt_secret: process.env.JWT_SECRET,
    gen_salt: process.env.GEN_SALT,
    expires_in: process.env.EXPIRES_IN,
    refresh_token_secret: process.env.REFRESH_TOKEN_SECRET,
    refresh_token_expires_in: process.env.REFRESH_TOKEN_EXPIRES_IN,
    reset_pass_secret: process.env.RESET_PASS_TOKEN,
    reset_pass_token_expires_in: process.env.RESET_PASS_TOKEN_EXPIRES_IN,
  },
  reset_pass_link: process.env.RESET_PASS_LINK,
  emailSender: {
    email: process.env.EMAIL,
    app_pass: process.env.APP_PASS,
  },
  stripe: {
    stripe_secret: process.env.STRIPE_SK,
    webhook_secret: process.env.STRIPE_WEBHOOK_SECRET,
  },
  moyasar: {
    moyasar_secret: process.env.MOYASAR_SK,
    webhook_secret: process.env.STRIPE_WEBHOOK_SECRET,
  },
  twilio: {
    accountSid: process.env.SID,
    authToken: process.env.TOKEN,
    twilioPhone: process.env.PHONE,
    contentSid: process.env.CONTENT_SID,
  },
  ZERO: {
    appId: process.env.ZEGO_APP_ID,
    secret: process.env.ZEGO_SECRET,
    twilioPhone: process.env.PHONE,
  },
};
