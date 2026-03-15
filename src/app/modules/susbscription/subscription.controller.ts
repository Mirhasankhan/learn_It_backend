import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { subscriptionServices } from "./subscription.service";


const getAllPlans = catchAsync(async (req: any, res: any) => {
  const result = await subscriptionServices.getAllSubscriptionPlansFromDB(
    req.user.id
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Subscription plans retrieved successfully",
    data: result,
  });
});
const userSubscribe = catchAsync(async (req: any, res: any) => {
  const { subscriptionId } = req.body;
  const result = await subscriptionServices.userSubscribeIntoDB(req.user.id, subscriptionId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Subscribed successfully",
    data: result
  });
});
const verifySubscriptionAndSchedule = catchAsync(async (req: any, res: any) => {
  const {userId, sourceId, subscriptionId } = req.body;
  await subscriptionServices.verifySubscriptionAndSchedule(userId,subscriptionId, sourceId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Subscription verified successfully",
  });
});

const cancelSubscription = catchAsync(async (req: any, res: any) => {
  await subscriptionServices.cancelSubscriptionAndDeleteSchedule(req.user.id);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Subscription cancelled successfully",
  });
});

const getExpertPlans = catchAsync(async (req: any, res: any) => {
  const result = await subscriptionServices.getAllExpertPlansFromDB(
    req.user.id
  );

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Expert plans retrieved successfully",
    data: result,
  });
});

const expertSubscribe = catchAsync(async (req: any, res: any) => {
  const { subscriptionId } = req.body;
  const result = await subscriptionServices.expertSubscribeIntoDB(req.user.id, subscriptionId);

  sendResponse(res, {
    statusCode: 200,
    success: true,
    message: "Subscribed successfully",
    data: result
  });
});

export const subscriptionController = {
  getAllPlans,
  userSubscribe,
  verifySubscriptionAndSchedule,
  cancelSubscription,
  getExpertPlans,
  expertSubscribe
};
