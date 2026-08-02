interface Props {
  emailNotifications: boolean;
  onEmailNotificationsChange: (
    value: boolean
  ) => void;

  desktopNotifications: boolean;
  onDesktopNotificationsChange: (
    value: boolean
  ) => void;
}

export default function NotificationsCard({
  emailNotifications,
  onEmailNotificationsChange,
  desktopNotifications,
  onDesktopNotificationsChange,
}: Props) {
  return (
    <section className="rounded-xl border bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <h2 className="mb-4 text-lg font-semibold dark:text-white">
        Notifications
      </h2>

      <label className="mb-4 flex items-center justify-between">
        <span className="dark:text-white">
          Email notifications
        </span>

        <input
          type="checkbox"
          checked={emailNotifications}
          onChange={(e) =>
            onEmailNotificationsChange(
              e.target.checked
            )
          }
        />
      </label>

      <label className="flex items-center justify-between">
        <span className="dark:text-white">
          Desktop notifications
        </span>

        <input
          type="checkbox"
          checked={desktopNotifications}
          onChange={(e) =>
            onDesktopNotificationsChange(
              e.target.checked
            )
          }
        />
      </label>
    </section>
  );
}
