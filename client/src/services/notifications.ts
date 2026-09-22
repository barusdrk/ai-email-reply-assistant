export function isDesktopNotificationSupported():boolean{
  return "Notification" in window;
}

export async function requestDesktopNotificationPermission():Promise<NotificationPermission>{
  if(!isDesktopNotificationSupported())return "denied";
  if(Notification.permission==="default")return Notification.requestPermission();
  return Notification.permission;
}

export function showDesktopNotification(title:string,options:NotificationOptions={}):Notification|null{
  if(!isDesktopNotificationSupported())return null;
  if(Notification.permission!=="granted")return null;
  return new Notification(title,options);
}
