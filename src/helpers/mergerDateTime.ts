// export const mergeDateAndTimeToISO = async(isoDate:any, startTime:any)=> {
//   const date = new Date(isoDate);

//   const [time, modifier] = startTime.split(" ");
//   let [hours, minutes] = time.split(":").map(Number);

//   if (modifier === "PM" && hours !== 12) hours += 12;
//   if (modifier === "AM" && hours === 12) hours = 0;

//   date.setUTCHours(hours, minutes, 0, 0);
  
//   return date.toISOString().replace("Z", "+00:00");
// }

export const mergeDateAndTimeToISO = (isoDate: any, startTime: any): Date => {
  const date = new Date(isoDate);

  const [time, modifier] = startTime.split(" ");
  let [hours, minutes] = time.split(":").map(Number);

  if (modifier === "PM" && hours !== 12) hours += 12;
  if (modifier === "AM" && hours === 12) hours = 0;

  date.setUTCHours(hours, minutes, 0, 0);
  return date;
};
