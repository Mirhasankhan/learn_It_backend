import dayjs from "dayjs";

function to24Hour(time: string) {
  return dayjs(time, "hh:mm A").format("HH:mm");
}

export function isOverlap(
  newStart: string,
  newEnd: string,
  existingStart: string,
  existingEnd: string
) {
  const nStart = dayjs(to24Hour(newStart), "HH:mm");
  const nEnd = dayjs(to24Hour(newEnd), "HH:mm");
  const eStart = dayjs(to24Hour(existingStart), "HH:mm");
  const eEnd = dayjs(to24Hour(existingEnd), "HH:mm");

  return nStart.isBefore(eEnd) && nEnd.isAfter(eStart);
}