import {useState} from "react";
import {requestDesktopNotificationPermission} from "../../services/notifications.js";

interface Props{
  emailNotifications:boolean;
  onEmailNotificationsChange:(value:boolean)=>void;
  desktopNotifications:boolean;
  onDesktopNotificationsChange:(value:boolean)=>void;
}

export default function NotificationsCard({
  emailNotifications,
  onEmailNotificationsChange,
  desktopNotifications,
  onDesktopNotificationsChange,
}:Props){
  const [desktopError,setDesktopError]=useState("");

  async function handleDesktopChange(enabled:boolean){
    setDesktopError("");
    if(!enabled){
      onDesktopNotificationsChange(false);
      return;
    }
    const permission=await requestDesktopNotificationPermission();
    if(permission==="granted"){
      onDesktopNotificationsChange(true);
      return;
    }
    onDesktopNotificationsChange(false);
    setDesktopError(
      permission==="denied"
        ?"Desktop notifications are blocked by your browser. Allow notifications for this site in your browser settings."
        :"Desktop notification permission was not granted."
    );
  }

  return (
    <section className="rounded-xl border border-(--border) bg-(--surface) p-6 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-(--text-h)">Notifications</h2>
        <p className="mt-1 text-sm text-(--text-secondary)">
          Choose how you want to receive support and account notifications.
        </p>
      </div>

      <div className="mt-6 space-y-5">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={emailNotifications}
            onChange={(event)=>onEmailNotificationsChange(event.target.checked)}
            className="mt-1 h-4 w-4 rounded border-(--border) accent-(--accent)"
          />
          <span>
            <span className="block font-medium text-(--text-h)">Email notifications</span>
            <span className="mt-1 block text-sm text-(--text-secondary)">
              Receive email notifications when important customer support events occur.
            </span>
          </span>
        </label>

        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={desktopNotifications}
            onChange={(event)=>handleDesktopChange(event.target.checked)}
            className="mt-1 h-4 w-4 rounded border-(--border) accent-(--accent)"
          />
          <span>
            <span className="block font-medium text-(--text-h)">Desktop notifications</span>
            <span className="mt-1 block text-sm text-(--text-secondary)">
              Show browser notifications for new customer messages and other important events.
            </span>
          </span>
        </label>

        {desktopError&&(
          <p className="rounded-lg border border-(--danger-text) bg-(--danger-bg) p-3 text-sm text-(--danger-text)">
            {desktopError}
          </p>
        )}
      </div>
    </section>
  );
}
