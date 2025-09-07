export function formatDate(input: string): string {
  const date = new Date(input);

  // Convert to IST manually
  // const IST_OFFSET = 5.5 * 60 * 60 * 1000; // IST is UTC +5:30
  const istDate = new Date(date.getTime());

  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  };

  return istDate.toLocaleString("en-US", options);
}


export function getDateOnly (input: string): string {
  //eg : JUN 2
  const date = new Date(input);
  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    timeZone: "Asia/Kolkata",
  };
  return date.toLocaleDateString("en-US", options);
}

