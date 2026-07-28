export type Status =
  | "draft"
  | "pending"
  | "approved"
  | "rejected"
  | "sent";

interface StatusBadgeProps {
  status: Status;
}

const STATUS_STYLES: Record<
  Status,
  {
    label: string;
    className: string;
  }
> = {
  draft: {
    label: "Draft",
    className:
      "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100",
  },

  pending: {
    label: "Pending Approval",
    className:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  },

  approved: {
    label: "Approved",
    className:
      "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  },

  rejected: {
    label: "Rejected",
    className:
      "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  },

  sent: {
    label: "Sent",
    className:
      "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  },
};

export default function StatusBadge({
  status,
}: StatusBadgeProps) {
  const config = STATUS_STYLES[status];

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${config.className}`}
    >
      {config.label}
    </span>
  );
}
