/** Local date key in yyyy-MM-dd format. */
export function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function shortLabel(key: string): string {
  const [, month, day] = key.split("-");
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${months[Number(month) - 1]} ${Number(day)}`;
}

/** Minutes between two HH:mm values. Overnight windows wrap past midnight. */
export function minutesBetweenTimes(
  start: string,
  end: string
): number | null {
  const startMatch = /^(\d{1,2}):(\d{2})$/.exec(start);
  const endMatch = /^(\d{1,2}):(\d{2})$/.exec(end);
  if (!startMatch || !endMatch) return null;
  const startMinutes = Number(startMatch[1]) * 60 + Number(startMatch[2]);
  const endMinutes = Number(endMatch[1]) * 60 + Number(endMatch[2]);
  const diff = (endMinutes - startMinutes + 24 * 60) % (24 * 60);
  return diff > 0 ? diff : null;
}

/** Human readable duration such as "25m" or "1h 20m". */
export function formatMinutes(total: number): string {
  const minutes = Math.max(0, Math.round(total));
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${rest}m`;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

export function longDateLabel(key: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(`${key}T12:00:00`));
}
