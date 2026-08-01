import { draftRepository } from "../repositories/DraftRepository.js";
import { notificationRepository } from "../repositories/NotificationRepository.js";

export async function cleanupJob(){

const cutoff=new Date();

cutoff.setDate(
cutoff.getDate()-30
);

const[
draftsDeleted,
notificationsDeleted,
]=await Promise.all([

draftRepository.deleteOlderThan(
cutoff
),

notificationRepository.deleteOlderThan(
cutoff
),

]);

return{
success:true,
deletedDrafts:
draftsDeleted.deletedCount??0,
deletedNotifications:
notificationsDeleted.deletedCount??0,
};

}
