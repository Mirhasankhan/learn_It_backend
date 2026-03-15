import express, { Application, NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import cors from "cors";
import router from "./app/routes";
import GlobalErrorHandler from "./app/middlewares/globalErrorHandler";
import { PrismaClient } from "@prisma/client";
import path from "path";
import basicAuth from "express-basic-auth";
import handleWebHook from "./helpers/moyasar.webhook";
import handleStripeWebHook from "./helpers/stripe.webhook";
import handlePayPalWebHook from "./helpers/paypal.webhook";
import { payoutAccounts } from "./helpers/moyasar.payment";
import { dataAccount, dataDelete, privacyPolicy, supportPage, termCondition } from "./app/routes/viewRoute";
import { checkRecordStatus } from "./helpers/checkStatus";
// import { recordCallBack } from "./helpers/recordingCallback";
import { bullBoardRouter } from "./bullBoard";
import { recordCallBack } from "./helpers/recording.testing";

const app: Application = express();
const prisma = new PrismaClient();

(async () => {
  try {
    await prisma.$connect();
    console.log("✅ Database connected successfully!");
  } catch (error) {
    console.error("Failed to connect to services:", error);
    process.exit(1);
  }
})();

app.use(cors());

// app.post("/webhook/moyasar", express.raw({ type: "application/json" }), handleWebHook);
app.post(
  "/webhook/moyasar",
  express.raw({ type: "application/json" }),
  (req, res, next) => {
    console.log("🔵 came here /webhook/moyasar");
    next();
  },
  handleWebHook
);
app.post(
  "/webhook/stripe",
  express.raw({ type: "application/json" }),
  handleStripeWebHook
);
app.post(
  "/webhook/paypal",
  express.raw({ type: "application/json" }),
  handlePayPalWebHook
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static uploads
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

// Test root
app.post("/record-callback", async (req: Request, res: Response) => {
  const result = await recordCallBack(req.body);
  res.send(result)
});
app.get("/", (req: Request, res: Response) => {
  res.send({ Message: "Welcome to api main route" });
});
app.get("/payout-accounts", async (req: Request, res: Response) => {
  const result = await payoutAccounts();
  console.log(result);
  res.send(result);
});
app.get("/user-terms", async (req: Request, res: Response) => {
  const result = termCondition("User");
  res.send(result);
});
app.get("/expert-terms", async (req: Request, res: Response) => {
  const result = termCondition("Expert");
  res.send(result);
});
app.get("/user-privacy-policy", async (req: Request, res: Response) => {
  const result = privacyPolicy("User");
  res.send(result);
});
app.get("/expert-privacy-policy", async (req: Request, res: Response) => {
  const result = privacyPolicy("Expert");
  res.send(result);
});
app.get("/delete-data", async (req: Request, res: Response) => {
  const result = dataDelete();
  res.send(result);
});
app.get("/delete-account", async (req: Request, res: Response) => {
  const result = dataAccount();
  res.send(result);
});
app.get("/support", async (req: Request, res: Response) => {
  const result = supportPage();
  res.send(result);
});

app.post("/record-status", async (req: Request, res: Response) => {
  const result = await checkRecordStatus("aS6smsdmzGSBK9cA");
  console.log(result, "app .ts a");
  res.send(result);
});

// Main API routes
app.use("/api/v1", router);

app.use(
  "/admin/queues",
  basicAuth({
    users: { admin: "supersecret" },
    challenge: true,
  }),
  bullBoardRouter
);

// Global error handler
app.use(GlobalErrorHandler);

// 404 fallback
app.use((req: Request, res: Response, next: NextFunction) => {
  res.status(httpStatus.NOT_FOUND).json({
    success: false,
    message: "API NOT FOUND!",
    error: {
      path: req.originalUrl,
      message: "Your requested path is not found!",
    },
  });
});

export default app;
