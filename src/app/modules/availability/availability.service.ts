import dayjs from "dayjs";
import isSameOrBefore from "dayjs/plugin/isSameOrBefore";
import customParseFormat from "dayjs/plugin/customParseFormat";
import advancedFormat from "dayjs/plugin/advancedFormat";
import prisma from "../../../shared/prisma";
import ApiError from "../../../errors/ApiErrors";
import { isOverlap } from "../../../helpers/Overlap";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(isSameOrBefore);
dayjs.extend(customParseFormat);
dayjs.extend(advancedFormat);

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault("Asia/Riyadh");

interface SlotInput {
  startTime: string;
  endTime: string;
}
interface AvailabilityInput {
  dayOfWeek: number;
  slots: SlotInput[];
}

function parseSlotToTime(time: string) {
  return dayjs(time, "hh:mm A").format("hh:mm A");
}

const createUserAvailability = async (
  expertId: string,
  availability: AvailabilityInput[]
) => {
  return prisma.$transaction(
    async (tx) => {
      await tx.availability.deleteMany({ where: { expertId } });

      const results = [];
      for (const day of availability) {
        const result = await tx.availability.create({
          data: {
            expertId,
            dayOfWeek: day.dayOfWeek,
            slots: {
              create: day.slots.map((s) => ({
                startTime: parseSlotToTime(s.startTime),
                endTime: parseSlotToTime(s.endTime),
              })),
            },
          },
        });
        results.push(result);
      }

      return results;
    },
    { timeout: 20000 }
  );
};

// const getExpertDayWiseSlotsFromDB = async (
//   userId: string,
//   dayOfWeek: number
// ) => {
//   const availabilities = await prisma.availability.findMany({
//     where: { expertId: userId, dayOfWeek },
//     include: { slots: true },
//   });

//   if (!availabilities.length) return [];

//   const now = dayjs();
//   const today = now.day();
//   const diff = (dayOfWeek - today + 7) % 7;

//   const targetDate = now.add(diff, "day").startOf("day");
//   const targetDateStr = targetDate.format("YYYY-MM-DD");

//   // ----------------------------------------------------
//   // Fetch bookings for the target day (UTC-safe range)
//   // ----------------------------------------------------
//   const bookings = await prisma.booking.findMany({
//     where: {
//       expertId: userId,
//       date: {
//         gte: targetDate.startOf("day").toDate(),
//         lt: targetDate.endOf("day").toDate(),
//       },
//     },
//   });

//   // Convert bookings → occupied 30-minute ranges
//   const bookedRanges = bookings.map((b: any) => {
//     const start = dayjs(
//       `${targetDateStr} ${b.startTime}`,
//       "YYYY-MM-DD hh:mm A"
//     );
//     return {
//       start,
//       end: start.add(30, "minute"),
//     };
//   });

//   // ----------------------------------------------------
//   // Build free 30-minute slots
//   // ----------------------------------------------------
//   const freeSlots: { start: string; end: string }[] = [];

//   // Lead-time rule: block next 30 if day is today
//   const leadTimeCutoff =
//     diff === 0 ? now.add(30, "minutes") : null;

//   for (const availability of availabilities) {
//     for (const slot of availability.slots) {
//       const parsedStart = dayjs(slot.startTime, "hh:mm A");
//       const parsedEnd = dayjs(slot.endTime, "hh:mm A");

//       if (!parsedStart.isValid() || !parsedEnd.isValid()) continue;

//       let cursor = targetDate
//         .hour(parsedStart.hour())
//         .minute(parsedStart.minute())
//         .second(0);

//       const slotEnd = targetDate
//         .hour(parsedEnd.hour())
//         .minute(parsedEnd.minute())
//         .second(0);

//       while (cursor.isBefore(slotEnd)) {
//         const blockStart = cursor;
//         const blockEnd = cursor.add(30, "minute");

//         // -------------------------------
//         // TODAY RULES
//         // -------------------------------
//         if (diff === 0) {
//           // Skip past slots
//           if (blockEnd.isBefore(now)) {
//             cursor = cursor.add(30, "minute");
//             continue;
//           }

//           // Skip slots within next 3 hours
//           if (leadTimeCutoff && blockStart.isBefore(leadTimeCutoff)) {
//             cursor = cursor.add(30, "minute");
//             continue;
//           }
//         }

//         // -------------------------------
//         // Booking overlap check
//         // -------------------------------
//         const isBooked = bookedRanges.some(
//           (br) =>
//             blockStart.isBefore(br.end) &&
//             blockEnd.isAfter(br.start)
//         );

//         if (!isBooked) {
//           freeSlots.push({
//             start: blockStart.format("hh:mm A"),
//             end: blockEnd.format("hh:mm A"),
//           });
//         }

//         cursor = cursor.add(30, "minute");
//       }
//     }
//   }

//   return freeSlots;
// };
const DURATION_MAP: Record<
  | "30 minutes"
  | "45 minutes"
  | "60 minutes"
  | "90 minutes"
  | "120 minutes"
  | "150 minutes"
  | "180 minutes",
  number
> = {
  "30 minutes": 30,
  "45 minutes": 45,
  "60 minutes": 60,
  "90 minutes": 90,
  "120 minutes": 120,
  "150 minutes": 150,
  "180 minutes": 180,
};

const getExpertDayWiseSlotsFromDB = async (
  userId: string,
  dayOfWeek: number,
  slotDurationLabel:
    | "30 minutes"
    | "45 minutes"
    | "60 minutes"
    | "90 minutes"
    | "120 minutes"
    | "150 minutes"
    | "180 minutes"
) => {
  const slotDuration = DURATION_MAP[slotDurationLabel];

  const availabilities = await prisma.availability.findMany({
    where: { expertId: userId, dayOfWeek },
    include: { slots: true },
  });

  if (!availabilities.length) return [];

  const now = dayjs();
  const today = now.day();
  const diff = (dayOfWeek - today + 7) % 7;

  const targetDate = now.add(diff, "day").startOf("day");
  const targetDateStr = targetDate.format("YYYY-MM-DD");

  // ----------------------------------------------------
  // Fetch bookings for the target day
  // ----------------------------------------------------
  const bookings = await prisma.booking.findMany({
    where: {
      expertId: userId,
      date: {
        gte: targetDate.startOf("day").toDate(),
        lt: targetDate.endOf("day").toDate(),
      },
    },
  });

  // ----------------------------------------------------
  // Convert bookings → occupied time ranges
  // ----------------------------------------------------
  const bookedRanges = bookings.map((b: any) => {
    const start = dayjs(
      `${targetDateStr} ${b.startTime}`,
      "YYYY-MM-DD hh:mm A"
    );

    return {
      start,
      end: start.add(slotDuration, "minute"),
    };
  });

  // ----------------------------------------------------
  // Generate free slots
  // ----------------------------------------------------
  const freeSlots: { start: string; end: string }[] = [];

  const leadTimeCutoff = diff === 0 ? now.add(slotDuration, "minute") : null;

  for (const availability of availabilities) {
    for (const slot of availability.slots) {
      const parsedStart = dayjs(slot.startTime, "hh:mm A");
      const parsedEnd = dayjs(slot.endTime, "hh:mm A");

      if (!parsedStart.isValid() || !parsedEnd.isValid()) continue;

      let cursor = targetDate
        .hour(parsedStart.hour())
        .minute(parsedStart.minute())
        .second(0);

      const slotEnd = targetDate
        .hour(parsedEnd.hour())
        .minute(parsedEnd.minute())
        .second(0);

      while (cursor.add(slotDuration, "minute").isSameOrBefore(slotEnd)) {
        const blockStart = cursor;
        const blockEnd = cursor.add(slotDuration, "minute");

        // -------------------------------
        // TODAY RULES
        // -------------------------------
        if (diff === 0) {
          if (blockEnd.isBefore(now)) {
            cursor = cursor.add(slotDuration, "minute");
            continue;
          }

          if (leadTimeCutoff && blockStart.isBefore(leadTimeCutoff)) {
            cursor = cursor.add(slotDuration, "minute");
            continue;
          }
        }

        // -------------------------------
        // Booking overlap check
        // -------------------------------
        const isBooked = bookedRanges.some(
          (br) => blockStart.isBefore(br.end) && blockEnd.isAfter(br.start)
        );

        if (!isBooked) {
          freeSlots.push({
            start: blockStart.format("hh:mm A"),
            end: blockEnd.format("hh:mm A"),
          });
        }

        cursor = cursor.add(slotDuration, "minute");
      }
    }
  }

  return freeSlots;
};

const getExpertsAllSlotsFromDB = async (expertId: string) => {
  await prisma.user.findUniqueOrThrow({
    where: { id: expertId, role: "EXPERT" },
  });

  const availabilities = await prisma.availability.findMany({
    where: { expertId },
    select: {
      id: true,
      dayOfWeek: true,
      slots: {
        select: {
          id: true,
          startTime: true,
          endTime: true,
        },
      },
    },
  });

  // Index availabilities by dayOfWeek
  const availabilityMap = new Map<number, any[]>();

  for (const availability of availabilities) {
    const slotsWithAvailabilityId = availability.slots.map((slot) => ({
      ...slot,
      availabilityId: availability.id,
    }));

    if (!availabilityMap.has(availability.dayOfWeek)) {
      availabilityMap.set(availability.dayOfWeek, []);
    }

    availabilityMap
      .get(availability.dayOfWeek)!
      .push(...slotsWithAvailabilityId);
  }

  // Build full week response (0–6)
  const result = Array.from({ length: 7 }, (_, dayOfWeek) => ({
    dayOfWeek,
    slots: availabilityMap.get(dayOfWeek) || [],
  }));

  return result;
};

const getUserAvailabilityFromDB = async (expertId: string) => {
  const availability = await prisma.availability.findMany({
    where: { expertId },
    include: { slots: true },
    orderBy: { dayOfWeek: "asc" },
  });

  return availability.map((day) => ({
    dayOfWeek: day.dayOfWeek,
    slots: day.slots.map((s) => ({
      startTime: dayjs(s.startTime, "HH:mm").format("hh:mm A"),
      endTime: dayjs(s.endTime, "HH:mm").format("hh:mm A"),
    })),
  }));
};

const deleteSlotFromDB = async (id: string) => {
  const slot = await prisma.availability.findUniqueOrThrow({
    where: { id },
  });
  // const expertsDaySlotCount = await prisma.availability.count({
  //   where: { expertId: slot.expertId, dayOfWeek: slot.dayOfWeek },
  // });

  // if (expertsDaySlotCount < 2) {
  //   throw new ApiError(
  //     400,
  //     "This slot cannot be deleted. At least one slots must remain for this day."
  //   );
  // }
  await prisma.availability.delete({
    where: { id },
  });
  return;
};

const updateSlotFromDB = async (id: string, payload: SlotInput) => {
  const slot = await prisma.availableSlot.findUniqueOrThrow({
    where: { id },
    include: {
      availability: true,
    },
  });

  const currentSlots = await prisma.availability.findMany({
    where: {
      dayOfWeek: slot.availability.dayOfWeek,
      expertId: slot.availability.expertId,
    },
    include: {
      slots: {
        select: { id: true, startTime: true, endTime: true },
      },
    },
  });

  const allSlots = currentSlots.flatMap((a) => a.slots);

  for (const existing of allSlots) {
    if (existing.id === id) continue;

    if (
      isOverlap(
        payload.startTime,
        payload.endTime,
        existing.startTime,
        existing.endTime
      )
    ) {
      throw new Error(
        `Time conflict: overlaps with existing slot ${existing.startTime} - ${existing.endTime}`
      );
    }
  }

  await prisma.availableSlot.update({
    where: { id },
    data: {
      startTime: payload.startTime,
      endTime: payload.endTime,
    },
  });

  return;
};

const addNewSlotIntoDB = async (expertId: string, payload: any) => {
  return await prisma.$transaction(async (tx) => {
    await tx.user.findUniqueOrThrow({
      where: { id: expertId, role: "EXPERT" },
    });

    const availabilities = await tx.availability.findMany({
      where: {
        expertId,
        dayOfWeek: payload.dayOfWeek,
      },
      include: { slots: true },
    });
    for (const availability of availabilities) {
      for (const existing of availability.slots) {
        if (
          isOverlap(
            payload.startTime,
            payload.endTime,
            existing.startTime,
            existing.endTime
          )
        ) {
          throw new ApiError(
            400,
            `Time conflict: overlaps with existing slot ${existing.startTime} - ${existing.endTime}`
          );
        }
      }
    }

    const availabilityForNewSlot = await tx.availability.create({
      data: {
        dayOfWeek: payload.dayOfWeek,
        expertId,
      },
      include: { slots: true },
    });

    await tx.availableSlot.create({
      data: {
        startTime: payload.startTime,
        endTime: payload.endTime,
        availabilityId: availabilityForNewSlot.id,
      },
    });

    return;
  });
};

export const availabilityServices = {
  createUserAvailability,
  addNewSlotIntoDB,
  getUserAvailabilityFromDB,
  getExpertDayWiseSlotsFromDB,
  updateSlotFromDB,
  deleteSlotFromDB,
  getExpertsAllSlotsFromDB,
};

// const getExpertDayWiseSlotsFromDB = async (userId: string, dayOfWeek: number) => {
//   const availabilities = await prisma.availability.findMany({
//     where: { userId, dayOfWeek },
//     include: { slots: true },
//   });

//   if (!availabilities.length) return [];

//   const now = dayjs();
//   const todayDayOfWeek = now.day();
//   const dayDifference = (dayOfWeek - todayDayOfWeek + 7) % 7;
//   const targetDate = dayjs(now).add(dayDifference, "day").startOf("day");

//   // ✅ Get all booked slots for this expert on this date
//   const bookings = await prisma.booking.findMany({
//     where: {
//       expertId: userId,
//       date: targetDate.toDate(),
//     },
//   });

//   // Convert booked slots to Dayjs ranges for easy comparison
//   const bookedRanges = bookings.map(b => ({
//     start: dayjs(`${targetDate.format("YYYY-MM-DD")} ${b.startTime}`, "YYYY-MM-DD hh:mm A"),
//     end: dayjs(`${targetDate.format("YYYY-MM-DD")} ${b.endTime}`, "YYYY-MM-DD hh:mm A"),
//   }));

//   const result: { start: string; end: string }[] = [];

//   for (const availability of availabilities) {
//     for (const slot of availability.slots) {
//       const slotStartTime = dayjs(slot.startTime, "hh:mm A");
//       const slotEndTime = dayjs(slot.endTime, "hh:mm A");

//       if (!slotStartTime.isValid() || !slotEndTime.isValid()) continue;

//       let start = targetDate
//         .hour(slotStartTime.hour())
//         .minute(slotStartTime.minute())
//         .second(0);
//       const end = targetDate
//         .hour(slotEndTime.hour())
//         .minute(slotEndTime.minute())
//         .second(0);

//       while (start.isBefore(end)) {
//         const slotStartDate = start;
//         const slotEndDate = start.add(30, "minute");

//         const isBooked = bookedRanges.some(
//           br => slotStartDate.isBefore(br.end) && slotEndDate.isAfter(br.start)
//         );

//         if (!isBooked && slotEndDate.isAfter(now)) {
//           result.push({
//             start: slotStartDate.format("hh:mm A"),
//             end: slotEndDate.format("hh:mm A"),
//           });
//         }

//         start = start.add(30, "minute");
//       }
//     }
//   }

//   return result;
// };
