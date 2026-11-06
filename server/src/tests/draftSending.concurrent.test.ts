import {beforeEach,describe,expect,it,vi} from "vitest";
import {Types} from "mongoose";

const mocks=vi.hoisted(()=>({
  findById:vi.fn(),
  claimForManualSend:vi.fn(),
  markAutomaticSendStarted:vi.fn(),
  markAutomaticSendCompleted:vi.fn(),
  releaseAutomaticClaim:vi.fn(),
  markAutomaticRecoveryRequired:vi.fn(),
  update:vi.fn(),
  emailFindById:vi.fn(),
  emailCreate:vi.fn(),
  sendEmail:vi.fn(),
  recordDraftAnalytics:vi.fn(),
}));

vi.mock("../repositories/DraftRepository.js",()=>({
  draftRepository:{
    findById:mocks.findById,
    claimForManualSend:mocks.claimForManualSend,
    markAutomaticSendStarted:mocks.markAutomaticSendStarted,
    markAutomaticSendCompleted:mocks.markAutomaticSendCompleted,
    releaseAutomaticClaim:mocks.releaseAutomaticClaim,
    markAutomaticRecoveryRequired:mocks.markAutomaticRecoveryRequired,
    update:mocks.update,
  },
}));

vi.mock("../repositories/EmailRepository.js",()=>({
  emailRepository:{
    findById:mocks.emailFindById,
    create:mocks.emailCreate,
  },
}));

vi.mock("../services/sendEmail.js",()=>({
  sendEmail:mocks.sendEmail,
}));

vi.mock("../services/automaticSend.js",()=>({
  sendAutomatically:vi.fn(),
}));

vi.mock("../services/supportAnalytics.js",()=>({
  recordDraftAnalytics:mocks.recordDraftAnalytics,
}));

import {sendDraft} from "../services/draftSending.js";

const userId=new Types.ObjectId();
const draftId=new Types.ObjectId();
const emailId=new Types.ObjectId();

const claimedAt=new Date("2026-10-30T09:59:00.000Z");
const startedAt=new Date("2026-10-30T10:00:00.000Z");

const draft={
  _id:draftId,
  userId,
  emailId,
  provider:"gmail" as const,
  subject:"Question about my account",
  customer:"customer@example.com",
  reply:"Thanks for contacting us. We will be happy to help.",
  status:"approved" as const,
  automaticAction:"pending" as const,
  automaticSendInProgress:false,
  automaticSendPhase:"idle" as const,
  automaticSendAttempts:0,
  automaticSendRecoveryRequired:false,
  supportPolicyIssues:[],
};

const email={
  _id:emailId,
  userId,
  customerId:null,
  provider:"gmail" as const,
  senderEmail:"customer@example.com",
  senderName:"Customer",
  threadId:"thread-123",
  messageId:"message-123",
  messageIdHeader:"<message-123@example.com>",
  references:[],
};

const providerResult={
  id:"provider-message-123",
  threadId:"thread-123",
  provider:"gmail" as const,
  sent:true,
  messageIdHeader:"<sent-message@example.com>",
  from:"Support Team <support@example.com>",
  senderName:"Support Team",
  senderEmail:"support@example.com",
  references:["<message-123@example.com>"],
};

describe("sendDraft manual sending",()=>{
  beforeEach(()=>{
    vi.clearAllMocks();
    mocks.findById.mockResolvedValue(draft);
    mocks.emailFindById.mockResolvedValue(email);
    mocks.update.mockImplementation(async(_id,data)=>({...draft,...data}));
    mocks.emailCreate.mockImplementation(async data=>({_id:new Types.ObjectId(),...data}));
    mocks.recordDraftAnalytics.mockResolvedValue(undefined);
    mocks.markAutomaticSendStarted.mockResolvedValue({
      ...draft,
      automaticSendInProgress:true,
      automaticSendPhase:"sending",
      automaticSendAttempts:1,
      automaticSendStartedAt:startedAt,
    });
    mocks.markAutomaticSendCompleted.mockResolvedValue({
      ...draft,
      status:"sent",
      automaticSendInProgress:false,
      automaticSendPhase:"completed",
      automaticSendAttempts:1,
      automaticSendRecoveryRequired:false,
      sentAt:startedAt,
    });
    mocks.markAutomaticRecoveryRequired.mockResolvedValue({
      ...draft,
      status:"pending",
      automaticSendInProgress:false,
      automaticSendPhase:"recovery_required",
      automaticSendRecoveryRequired:true,
    });
    mocks.releaseAutomaticClaim.mockResolvedValue({
      ...draft,
      automaticSendInProgress:false,
      automaticSendPhase:"failed",
    });

    // Simulate an atomic database claim: only the first request wins.
    let claimed=false;
    mocks.claimForManualSend.mockImplementation(async()=>{
      if(claimed)return null;
      claimed=true;
      return {
        ...draft,
        automaticSendInProgress:true,
        automaticSendPhase:"claimed",
        automaticSendClaimedAt:claimedAt,
        automaticSendAttempts:1,
      };
    });
  });

  it("calls the provider exactly once for two concurrent sends",async()=>{
    let releaseProvider!:()=>void;
    const providerGate=new Promise<void>(resolve=>{releaseProvider=resolve;});
    mocks.sendEmail.mockImplementation(async()=>{
      await providerGate;
      return providerResult;
    });

    const first=sendDraft(draftId.toString());
    const second=sendDraft(draftId.toString());

    try{
      await vi.waitFor(()=>expect(mocks.findById).toHaveBeenCalledTimes(2));
    }finally{
      releaseProvider();
    }

    const results=await Promise.allSettled([first,second]);
    expect(mocks.claimForManualSend).toHaveBeenCalledTimes(2);
    expect(mocks.sendEmail).toHaveBeenCalledTimes(1);
    expect(results.filter(result=>result.status==="fulfilled")).toHaveLength(1);
    expect(results.filter(result=>result.status==="rejected")).toHaveLength(1);
  });

  it("records a single outbound email and completes the shared send lifecycle",async()=>{
    mocks.sendEmail.mockResolvedValue(providerResult);

    const result=await sendDraft(draftId.toString());

    expect(mocks.claimForManualSend).toHaveBeenCalledTimes(1);
    expect(mocks.markAutomaticSendStarted).toHaveBeenCalledWith(draftId.toString());
    expect(mocks.sendEmail).toHaveBeenCalledTimes(1);
    expect(mocks.emailCreate).toHaveBeenCalledTimes(1);
    expect(mocks.emailCreate).toHaveBeenCalledWith(expect.objectContaining({
      userId,
      draftId,
      provider:"gmail",
      direction:"outbound",
      messageId:providerResult.id,
      messageIdHeader:providerResult.messageIdHeader,
      from:providerResult.from,
      senderName:providerResult.senderName,
      senderEmail:providerResult.senderEmail,
      references:providerResult.references,
      threadId:email.threadId,
      subject:draft.subject,
      recipientEmail:email.senderEmail,
      body:draft.reply,
      preview:draft.reply,
      unread:false,
      archived:false,
    }));
    expect(mocks.markAutomaticSendCompleted).toHaveBeenCalledWith(
      draftId.toString(),
      expect.any(Date),
    );
    expect(result).toMatchObject({
      status:"sent",
      automaticSendPhase:"completed",
      automaticSendAttempts:1,
    });
  });

  it("requires recovery when the provider call times out",async()=>{
    mocks.sendEmail.mockRejectedValue(new Error("Provider request timed out"));

    await expect(sendDraft(draftId.toString())).rejects.toThrow("Provider request timed out");

    expect(mocks.sendEmail).toHaveBeenCalledTimes(1);
    expect(mocks.markAutomaticRecoveryRequired).toHaveBeenCalledWith(
      draftId.toString(),
      expect.stringContaining("requires verification"),
      startedAt,
    );
  });

  it("requires recovery when the outbound record cannot be saved after provider acceptance",async()=>{
    mocks.sendEmail.mockResolvedValue(providerResult);
    mocks.emailCreate.mockRejectedValue(new Error("Database connection lost"));

    await expect(sendDraft(draftId.toString())).rejects.toThrow("Database connection lost");

    expect(mocks.sendEmail).toHaveBeenCalledTimes(1);
    expect(mocks.emailCreate).toHaveBeenCalledTimes(1);
    expect(mocks.markAutomaticRecoveryRequired).toHaveBeenCalledWith(
      draftId.toString(),
      expect.stringContaining("requires verification"),
      startedAt,
    );
    expect(mocks.markAutomaticSendCompleted).not.toHaveBeenCalled();
  });

  it("requires recovery when the outbound record is saved but draft completion fails",async()=>{
    mocks.sendEmail.mockResolvedValue(providerResult);
    mocks.markAutomaticSendCompleted.mockResolvedValue(null);

    await expect(sendDraft(draftId.toString())).rejects.toThrow("draft could not be marked as sent");

    expect(mocks.emailCreate).toHaveBeenCalledTimes(1);
    expect(mocks.markAutomaticRecoveryRequired).toHaveBeenCalledWith(
      draftId.toString(),
      expect.stringContaining("draft could not be marked as sent"),
      startedAt,
    );
    expect(mocks.sendEmail).toHaveBeenCalledTimes(1);
  });

  it("does not call the provider when the source email is missing",async()=>{
    mocks.emailFindById.mockResolvedValue(null);

    await expect(sendDraft(draftId.toString())).rejects.toThrow("Source email not found.");

    expect(mocks.sendEmail).not.toHaveBeenCalled();
    expect(mocks.markAutomaticRecoveryRequired).not.toHaveBeenCalled();
    expect(mocks.releaseAutomaticClaim).toHaveBeenCalledWith(
      draftId.toString(),
      "Source email not found.",
      "claimed",
      claimedAt,
    );
  });

  it("does not call the provider again when the draft is already sent",async()=>{
    mocks.findById.mockResolvedValue({
      ...draft,
      status:"sent",
      sentAt:new Date("2026-11-05T21:38:09.114Z"),
      automaticSendInProgress:false,
      automaticSendPhase:"completed",
      automaticSendAttempts:1,
      automaticSendRecoveryRequired:false,
    });

    await expect(sendDraft(draftId.toString())).rejects.toThrow("Draft has already been sent.");

    expect(mocks.claimForManualSend).not.toHaveBeenCalled();
    expect(mocks.markAutomaticSendStarted).not.toHaveBeenCalled();
    expect(mocks.sendEmail).not.toHaveBeenCalled();
    expect(mocks.emailCreate).not.toHaveBeenCalled();
  });

  it("does not send again when recovery is already required",async()=>{
    mocks.findById.mockResolvedValue({...draft,automaticSendRecoveryRequired:true});

    await expect(sendDraft(draftId.toString())).rejects.toThrow();
    expect(mocks.claimForManualSend).not.toHaveBeenCalled();
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it("does not send when another request already claimed the draft",async()=>{
    mocks.claimForManualSend.mockResolvedValue(null);

    await expect(sendDraft(draftId.toString())).rejects.toThrow();
    expect(mocks.claimForManualSend).toHaveBeenCalledTimes(1);
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });
});
