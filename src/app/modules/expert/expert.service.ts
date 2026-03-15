import ApiError from "../../../errors/ApiErrors";
import { generateWithdrawId } from "../../../helpers/generateOtp";
import { createPayoutAccount } from "../../../helpers/moyasar.payment";
import { handleRecentSearch } from "../../../helpers/recentSearch";
import prisma from "../../../shared/prisma";
import {
  startOfWeek,
  endOfWeek,
  startOfYear,
  endOfYear,
  getDay,
  getMonth,
} from "date-fns";

const SAUDI_OFFSET_HOURS = 3;

const getAllExpertsInGuestFromDB = async (
  search?: string,
  industry?: string,
  rating?: number
) => {
  const whereCondition: any = {
    role: "EXPERT",
    status: "ACTIVE",
    isSetup: true,
  };

  if (industry) {
    whereCondition.ExpertProfile = {
      some: {
        targetIndustry: {
          hasSome: [industry],
        },
      },
    };
  }
  if (search) {
    whereCondition.Service = {
      some: {
        OR: [
          {
            serviceName: {
              contains: search,
              mode: "insensitive",
            },
          },
          {
            about: {
              contains: search,
              mode: "insensitive",
            },
          },
        ],
      },
    };
  }

  if (rating) {
    whereCondition.avgRating = {
      gte: rating,
    };
  }

  const experts = await prisma.user.findMany({
    where: whereCondition,
    select: {
      id: true,
      userName: true,
      avgRating: true,
      profileImage: true,
      ExpertProfile: {
        select: {
          about: true,
          introVideo: true,
          targetIndustry: true,
          experience: true,
        },
      },
    },
  });

  return experts;
};
const getAllExpertsFromDB = async (
  userId: string,
  search?: string,
  industry?: string,
  rating?: number
) => {
  const whereCondition: any = {
    role: "EXPERT",
    status: "ACTIVE",
    isSetup: true,
  };

  if (industry) {
    whereCondition.ExpertProfile = {
      some: {
        targetIndustry: {
          hasSome: [industry],
        },
      },
    };
  }
  if (search) {
    whereCondition.Service = {
      some: {
        OR: [
          {
            serviceName: {
              contains: search,
              mode: "insensitive",
            },
          },
          {
            about: {
              contains: search,
              mode: "insensitive",
            },
          },
        ],
      },
    };
  }

  if (rating) {
    whereCondition.avgRating = {
      gte: rating,
    };
  }

  const experts = await prisma.user.findMany({
    where: whereCondition,
    select: {
      id: true,
      userName: true,
      avgRating: true,
      profileImage: true,
      ExpertProfile: {
        select: {
          about: true,
          introVideo: true,
          targetIndustry: true,
          experience: true,
        },
      },
      expertFavourites: {
        where: {
          userId,
        },
        select: {
          id: true,
        },
      },
    },
  });

  if (userId && search) {
    await handleRecentSearch(search, userId);
  }

  return experts;
};

const getExpertDetailsFromDB = async (userId: string, expertId: string) => {
  //have to add schedule and reviews

  const expert = await prisma.user.findUniqueOrThrow({
    where: { id: expertId, role: "EXPERT", status: "ACTIVE" },
    select: {
      id: true,
      userName: true,
      avgRating: true,
      profileImage: true,
      ExpertProfile: {
        select: {
          experience: true,
          introVideo: true,
          targetIndustry: true,
          about: true,
        },
      },
      Experience: {
        select: {
          title: true,
          companyName: true,
          duration: true,
          description: true,
        },
      },
      Service: {
        select: {
          id: true,
          serviceImage: true,
          serviceType: true,
          serviceName: true,
          price: true,
          duration: true,
          delivery: true,
          about: true,
        },
      },
      Availability: {
        select: {
          dayOfWeek: true,
          slots: {
            select: {
              startTime: true,
              endTime: true,
            },
          },
        },
      },
      receivedReviews: {
        select: {
          id: true,
          comment: true,
          rating: true,
          createdAt: true,
          seeeker: {
            select: {
              id: true,
              userName: true,
              profileImage: true,
            },
          },
        },
      },
      expertFavourites: {
        where: {
          userId,
        },
        select: {
          id: true,
        },
      },
    },
  });
  return expert;
};

const createPayoutAccountIntoDB = async (expertId: string, payload: any) => {
  await prisma.user.findUniqueOrThrow({
    where: { id: expertId, role: "EXPERT" },
  });
  // const result = await createPayoutAccount({
  //   iban: payload.iban,
  //   client_id: expert.id,
  //   client_secret: "dsfsdfsdfsdfdsfsdfsdfsdfsdfsdfdsf",
  // });
  // console.log(result);

  await prisma.payoutAccount.create({
    data: {
      sourceId: "ff7926fa-cc93-487c-a310-52ad266a062f",
      // sourceId: "a4268c82-7ce4-4314-886e-c9b230ead3be",
      name: payload.name,
      iban: payload.iban,
      mobile: payload.mobile,
      city: payload.city,
      expertId,
    },
  });
  return;
};

const getExpertWisePayoutAccountsFromDB = async (expertId: string) => {
  await prisma.user.findUniqueOrThrow({
    where: { id: expertId },
  });

  const accounts = await prisma.payoutAccount.findMany({
    where: { expertId },
  });
  return accounts;
};

// const getExpertEarningSummaryFromDB = async (
//   expertId: string,
//   type: "weekly" | "monthly"
// ) => {
//   const expert = await prisma.expertProfile.findUniqueOrThrow({
//     where: { userId: expertId },
//   });

//   const days = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"];
//   const months = [
//     "Jan",
//     "Feb",
//     "Mar",
//     "Apr",
//     "May",
//     "Jun",
//     "Jul",
//     "Aug",
//     "Sep",
//     "Oct",
//     "Nov",
//     "Dec",
//   ];

//   const SAUDI_OFFSET_HOURS = 3;

//   let chartData: any[] = [];

//   if (type === "weekly") {
//     const start = startOfWeek(new Date(), { weekStartsOn: 6 });
//     const end = endOfWeek(new Date(), { weekStartsOn: 6 });

//     const weekEarnings = await prisma.earnings.findMany({
//       where: {
//         expertId,
//         createdAt: { gte: start, lte: end },
//       },
//       select: { amount: true, createdAt: true },
//     });

//     const weeklyData = Array(7).fill(0);

//     for (const e of weekEarnings) {
//       const localDate = new Date(
//         e.createdAt.getTime() + SAUDI_OFFSET_HOURS * 60 * 60 * 1000
//       );
//       const dayIndex = getDay(localDate);
//       const mappedIndex = (dayIndex + 6) % 7;
//       weeklyData[mappedIndex] += e.amount;
//     }

//     chartData = days.map((day, idx) => ({
//       day,
//       earnings: weeklyData[idx],
//     }));
//   }

//   if (type === "monthly") {
//     const start = startOfYear(new Date());
//     const end = endOfYear(new Date());

//     const monthEarnings = await prisma.earnings.findMany({
//       where: {
//         expertId,
//         createdAt: { gte: start, lte: end },
//       },
//       select: { amount: true, createdAt: true },
//     });

//     const monthlyData = Array(12).fill(0);

//     for (const e of monthEarnings) {
//       const localDate = new Date(
//         e.createdAt.getTime() + SAUDI_OFFSET_HOURS * 60 * 60 * 1000
//       );
//       const monthIndex = getMonth(localDate);
//       monthlyData[monthIndex] += e.amount;
//     }

//     chartData = months.map((month, idx) => ({
//       month,
//       earnings: monthlyData[idx],
//     }));
//   }

//   return {
//     currentEarnings: expert.currentEarnings,
//     allTimeEarnings: expert.allTimeEarnings,
//     chartData,
//   };
// };
const getExpertEarningSummaryFromDB = async (
  expertId: string,
  type: "weekly" | "monthly"
) => {
  const expert = await prisma.expertProfile.findUniqueOrThrow({
    where: { userId: expertId },
  });

  const days = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  let chartData: any[] = [];

  if (type === "weekly") {
    const start = startOfWeek(new Date(), { weekStartsOn: 6 }); // Sat
    const end = endOfWeek(new Date(), { weekStartsOn: 6 });     // Fri

    const weekEarnings = await prisma.earnings.findMany({
      where: {
        expertId,
        createdAt: { gte: start, lte: end },
      },
      select: { amount: true, createdAt: true },
    });

    const weeklyData = Array(7).fill(0);

    for (const e of weekEarnings) {
      const localDate = new Date(e.createdAt.getTime() + SAUDI_OFFSET_HOURS * 60 * 60 * 1000);
      const dayIndex = getDay(localDate);             // 0=Sun, 1=Mon, ..., 6=Sat
      const mappedIndex = (dayIndex - 6 + 7) % 7;     // shift so Sat=0
      weeklyData[mappedIndex] += e.amount;
    }

    chartData = days.map((day, idx) => ({
      day,
      earnings: weeklyData[idx],
    }));
  }

  if (type === "monthly") {
    const start = startOfYear(new Date());
    const end = endOfYear(new Date());

    const monthEarnings = await prisma.earnings.findMany({
      where: {
        expertId,
        createdAt: { gte: start, lte: end },
      },
      select: { amount: true, createdAt: true },
    });

    const monthlyData = Array(12).fill(0);

    for (const e of monthEarnings) {
      const localDate = new Date(e.createdAt.getTime() + SAUDI_OFFSET_HOURS * 60 * 60 * 1000);
      const monthIndex = getMonth(localDate);
      monthlyData[monthIndex] += e.amount;
    }

    chartData = months.map((month, idx) => ({
      month,
      earnings: monthlyData[idx],
    }));
  }

  return {
    currentEarnings: expert.currentEarnings,
    allTimeEarnings: expert.allTimeEarnings,
    chartData,
  };
};

export default getExpertEarningSummaryFromDB;
const sendWithdrawRequestToAdmin = async (expertId: string, payload: any) => {
  await prisma.user.findUniqueOrThrow({
    where: { id: expertId },
  });

  const payoutAccount = await prisma.payoutAccount.findUniqueOrThrow({
    where: { id: payload.payoutId, expertId },
  });

  if (!payoutAccount) {
    throw new ApiError(404, "Payout account not found for this expert");
  }

  const existingRequest = await prisma.withdraw.findFirst({
    where: {
      expertId,
      status: {
        in: ["Pending", "In_Progress"],
      },
    },
  });

  if (existingRequest) {
    throw new ApiError(409, "Withdrawal blocked: a request already exists");
  }

  const expertProfile = await prisma.expertProfile.findUniqueOrThrow({
    where: { userId: expertId },
  });

  if (expertProfile.currentEarnings < payload.amount) {
    throw new ApiError(
      409,
      "Withdrawal blocked: insufficient available balance"
    );
  }

  const withdrawId = generateWithdrawId();

  await prisma.withdraw.create({
    data: {
      expertId,
      withdrawId,
      amount: payload.amount,
      sourceId: payoutAccount.sourceId,
      payoutId: payload.payoutId,
    },
  });

  return;
};

const getWithdrawHistoryFromDB = async (expertId: string) => {
  await prisma.user.findUniqueOrThrow({
    where: { id: expertId, role: "EXPERT" },
  });

  const witdraws = await prisma.withdraw.findMany({
    where: { expertId },
    select: {
      id: true,
      amount: true,
      status: true,
      withdrawId: true,
      createdAt: true,
    },
  });
  return witdraws;
};

const getExpertGrowthSummaryFromDB = async (
  expertId: string
): Promise<{ growth: number; startedFrom: Date }> => {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: expertId, role: "EXPERT" },
  });

  const now = new Date();

  const currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentEnd = now;

  const lastStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastEnd = new Date(
    now.getFullYear(),
    now.getMonth() - 1,
    Math.min(
      now.getDate(),
      new Date(now.getFullYear(), now.getMonth(), 0).getDate()
    ),
    23,
    59,
    59
  );

  const [current, last] = await Promise.all([
    prisma.earnings.aggregate({
      where: {
        expertId,
        createdAt: { gte: currentStart, lte: currentEnd },
      },
      _sum: { amount: true },
    }),
    prisma.earnings.aggregate({
      where: {
        expertId,
        createdAt: { gte: lastStart, lte: lastEnd },
      },
      _sum: { amount: true },
    }),
  ]);

  const currentTotal = current._sum.amount ?? 0;
  const lastTotal = last._sum.amount ?? 0;

  // No earnings in both months
  if (currentTotal === 0 && lastTotal === 0) {
    return { growth: 0, startedFrom: user.createdAt };
  }

  // Last month was zero
  if (lastTotal === 0) {
    return {
      growth: currentTotal > 0 ? 100 : 0,
      startedFrom: user.createdAt,
    };
  }

  const rawGrowth = ((currentTotal - lastTotal) / lastTotal) * 100;

  // Cap only upward growth
  const growth = Math.min(100, rawGrowth);

  return {
    growth: Number(growth.toFixed(1)),
    startedFrom: user.createdAt,
  };
};



export const expertService = {
  getAllExpertsFromDB,
  getExpertDetailsFromDB,
  getExpertEarningSummaryFromDB,
  getWithdrawHistoryFromDB,
  getExpertWisePayoutAccountsFromDB,
  sendWithdrawRequestToAdmin,
  createPayoutAccountIntoDB,
  getExpertGrowthSummaryFromDB,
};
