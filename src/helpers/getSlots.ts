import prisma from "../shared/prisma";

export function generateSlots(start: Date, end: Date, durationInMinutes = 60) {
  const slots: { start: Date; end: Date }[] = [];
  let current = new Date(start);

  while (current < end) {
    const slotEnd = new Date(current.getTime() + durationInMinutes * 60000);
    if (slotEnd <= end) {
      slots.push({ start: new Date(current), end: new Date(slotEnd) });
    }
    current = slotEnd;
  }

  return slots;
}

export async function formatSlot(start: Date, end: Date) {
  const options: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  };

  return `${start.toLocaleTimeString("en-US", options)} - ${end.toLocaleTimeString("en-US", options)}`;
}
