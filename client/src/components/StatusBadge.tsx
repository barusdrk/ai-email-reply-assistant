export type Status = "draft" | "pending" | "approved" | "rejected" | "sent";

interface StatusBadgeProps {
  status: Status;
}

const STATUS_STYLES: Record<Status, { label: string; className: string }> = {
  draft: {
    label: "Draft",
    className: "bg-(--bg-secondary) text-(--text)",
  },
  pending: {
    label: "Pending Approval",
    className: "bg-(--info-bg) text-(--info-text)",
  },
  approved: {
    label: "Approved",
    className: "bg-(--success-bg) text-(--success-text)",
  },
  rejected: {
    label: "Rejected",
    className: "bg-(--danger-bg) text-(--danger-text)",
  },
  sent: {
    label: "Sent",
    className: "bg-(--accent-light) text-(--accent)",
  },
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = STATUS_STYLES[status];

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${config.className}`}>
      {config.label}
    </span>
  );
}
