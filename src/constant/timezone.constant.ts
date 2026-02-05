/**
 * Gets the UTC offset for any IANA timezone
 * Uses Intl API to determine offset dynamically
 */
export const getTimezoneOffset = (timezone: string): number => {
  const date = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const tzDate = new Date(
    parseInt(parts.find(p => p.type === "year")?.value || "2024"),
    parseInt(parts.find(p => p.type === "month")?.value || "1") - 1,
    parseInt(parts.find(p => p.type === "day")?.value || "1"),
    parseInt(parts.find(p => p.type === "hour")?.value || "0"),
    parseInt(parts.find(p => p.type === "minute")?.value || "0"),
    parseInt(parts.find(p => p.type === "second")?.value || "0")
  );

  return Math.round((date.getTime() - tzDate.getTime()) / (1000 * 60 * 60));
};

/**
 * Get timezone info for a given IANA timezone identifier
 */
export const getTimezoneInfo = (timezone: string | undefined) => {
  if (!timezone) return null;

  try {
    const offset = getTimezoneOffset(timezone);
    const sign = offset >= 0 ? "-" : "+";
    const absOffset = Math.abs(offset);
    const hours = Math.floor(absOffset / 60);
    const minutes = absOffset % 60;
    const offsetStr = `${sign}${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;

    return {
      timezone,
      offset,
      offsetStr,
      label: timezone,
    };
  } catch (error) {
    return null;
  }
};
