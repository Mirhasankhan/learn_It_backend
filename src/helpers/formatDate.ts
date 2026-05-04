export const formatDate = (isoString: string) => {
  const date = new Date(isoString);

  const options: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  };

  let formatted = date.toLocaleString("en-US", options);
 
  formatted = formatted.replace(":00", "").replace(" at", ",");

  return formatted;
};