export function calculatePriority(
  subject: string,
  body: string
) {
  const text =
    `${subject} ${body}`.toLowerCase();

  if (
    text.includes("urgent") ||
    text.includes("asap")
  )
    return "high";

  if (
    text.includes("invoice") ||
    text.includes("payment")
  )
    return "medium";

  return "low";
}
