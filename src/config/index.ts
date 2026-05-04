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
  moyasar: {
    moyasar_secret: process.env.MOYASAR_SK,
    webhook_secret: process.env.MOYASAR_WEBHOOK_SECRET,
  },
  atthentica: {
    authentica_api_key: process.env.AUTHENTICA_API_KEY,
  },
  bull: {
    bull_password: process.env.BULL_PASSWORD,
  },
  digitalOceanspaces: {
    spaces_key: process.env.DO_SPACES_KEY,
    spaces_secret: process.env.DO_SPACES_SECRET,
    spaces_region: process.env.DO_SPACES_REGION,
    spaces_bucket: process.env.DO_SPACES_BUCKET,
    spaces_endpoint: process.env.DO_SPACES_ENDPOINT,
  },
};
