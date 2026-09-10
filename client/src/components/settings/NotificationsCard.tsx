interface Props {
  emailNotifications: boolean;
  onEmailNotificationsChange: (value: boolean) => void;
  desktopNotifications: boolean;
  onDesktopNotificationsChange: (value: boolean) => void;
}

export default function NotificationsCard({ emailNotifications, onEmailNotificationsChange, desktopNotifications, onDesktopNotificationsChange }: Props) {
  return (
    <section className="rounded-xl border border-(--border) bg-(--surface) p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-(--text-h)">Notifications</h2>
      <label className="mb-4 flex cursor-pointer items-center justify-between gap-4">
        <span className="text-(--text)">Email notifications</span>
        <input type="checkbox" checked={emailNotifications} onChange={(event) => onEmailNotificationsChange(event.target.checked)} className="h-5 w-5 cursor-pointer accent-(--accent)" />
      </label>
      <label className="flex cursor-pointer items-center justify-between gap-4">
        <span className="text-(--text)">Desktop notifications</span>
        <input type="checkbox" checked={desktopNotifications} onChange={(event) => onDesktopNotificationsChange(event.target.checked)} className="h-5 w-5 cursor-pointer accent-(--accent)" />
      </label>
    </section>
  );
}
