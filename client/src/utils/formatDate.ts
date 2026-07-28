export function formatDate(
  date: string | Date,
  locale = "en-US"
): string {
  const value =
    typeof date === "string"
      ? new Date(date)
      : date;

  return value.toLocaleString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatShortDate(
  date: string | Date,
  locale = "en-US"
): string {
  const value =
    typeof date === "string"
      ? new Date(date)
      : date;

  return value.toLocaleDateString(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatTime(
  date: string | Date,
  locale = "en-US"
): string {
  const value =
    typeof date === "string"
      ? new Date(date)
      : date;

  return value.toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function isToday(
  date: string | Date
): boolean {
  const value =
    typeof date === "string"
      ? new Date(date)
      : date;

  const today = new Date();

  return (
    value.getDate() === today.getDate() &&
    value.getMonth() === today.getMonth() &&
    value.getFullYear() ===
      today.getFullYear()
  );
}

export function isYesterday(
  date: string | Date
): boolean {
  const value =
    typeof date === "string"
      ? new Date(date)
      : date;

  const yesterday = new Date();

  yesterday.setDate(
    yesterday.getDate() - 1
  );

  return (
    value.getDate() ===
      yesterday.getDate() &&
    value.getMonth() ===
      yesterday.getMonth() &&
    value.getFullYear() ===
      yesterday.getFullYear()
  );
}
