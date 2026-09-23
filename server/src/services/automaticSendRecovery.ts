import {draftRepository} from "../repositories/DraftRepository.js";
import {audit} from "./audit.js";
import {notify} from "./notification.js";

const DEFAULT_STALE_MINUTES=15;

export interface AutomaticSendRecoveryResult {
  scanned:number;
  released:number;
  requiresHumanReview:number;
  errors:number;
}

export async function recoverStaleAutomaticSends(staleMinutes=DEFAULT_STALE_MINUTES):Promise<AutomaticSendRecoveryResult>{
  const cutoff=new Date(Date.now()-staleMinutes*60*1000);
  const drafts=await draftRepository.findStaleAutomaticClaims(cutoff);
  let released=0;
  let requiresHumanReview=0;
  let errors=0;

  for(const draft of drafts){
    try{
      const draftId=draft._id.toString();
      const userId=draft.userId.toString();
      const phase=draft.automaticSendPhase;

      if(phase==="claimed"){
        const recovered=await draftRepository.releaseAutomaticClaim(
          draftId,
          "Automatic send claim expired before the provider send started.",
        );

        if(!recovered)continue;

        released+=1;

        await audit(
          "automatic_send_claim_recovered",
          "draft",
          draftId,
          userId,
          {
            phase,
            claimedAt:draft.automaticSendClaimedAt,
          },
        );

        continue;
      }

      if(phase!=="sending")continue;

      const recovered=await draftRepository.markAutomaticRecoveryRequired(
        draftId,
        "Automatic sending was interrupted after the provider send began. Human verification is required before another send attempt.",
      );

      if(!recovered)continue;

      requiresHumanReview+=1;

      await audit(
        "automatic_send_recovery_required",
        "draft",
        draftId,
        userId,
        {
          phase,
          claimedAt:draft.automaticSendClaimedAt,
          startedAt:draft.automaticSendStartedAt,
          attempts:draft.automaticSendAttempts,
        },
      );

      await notify(
        userId,
        "approval",
        "Automatic reply requires verification",
        "An automatic reply was interrupted after sending may have started. Please verify the provider's Sent folder before approving another reply.",
        draftId,
      );
    }catch(error){
      errors+=1;
      console.error("Automatic-send recovery failed:",error);
    }
  }

  return {
    scanned:drafts.length,
    released,
    requiresHumanReview,
    errors,
  };
}
