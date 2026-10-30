import {beforeEach,describe,expect,it,vi} from "vitest";
import {Types} from "mongoose";

const mocks=vi.hoisted(()=>({
  findById:vi.fn(),
  claimForManualSend:vi.fn(),
  markAutomaticRecoveryRequired:vi.fn(),
  update:vi.fn(),
  emailFindById:vi.fn(),
  sendEmail:vi.fn(),
  recordDraftAnalytics:vi.fn(),
}));

vi.mock("../repositories/DraftRepository.js",()=>({
  draftRepository:{
    findById:mocks.findById,
    claimForManualSend:mocks.claimForManualSend,
    markAutomaticRecoveryRequired:mocks.markAutomaticRecoveryRequired,
    update:mocks.update,
  },
}));

vi.mock("../repositories/EmailRepository.js",()=>({
  emailRepository:{findById:mocks.emailFindById},
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
  automaticSendRecoveryRequired:false,
  supportPolicyIssues:[],
};

const email={
  _id:emailId,
  userId,
  provider:"gmail" as const,
  senderEmail:"customer@example.com",
  threadId:"thread-123",
  messageId:"message-123",
  messageIdHeader:"<message-123@example.com>",
  references:[],
};

describe("sendDraft failure recovery",()=>{
  beforeEach(()=>{
    vi.clearAllMocks();
    mocks.findById.mockResolvedValue(draft);
    mocks.emailFindById.mockResolvedValue(email);
    mocks.update.mockImplementation(async(_id,data)=>({...draft,...data}));
    mocks.recordDraftAnalytics.mockResolvedValue(undefined);
    mocks.markAutomaticRecoveryRequired.mockResolvedValue({
      ...draft,
      status:"pending",
      automaticSendInProgress:false,
      automaticSendRecoveryRequired:true,
    });

    // Simulate an atomic database claim: only the first request wins.
    let claimed=false;
    mocks.claimForManualSend.mockImplementation(async()=>{
      if(claimed)return null;
      claimed=true;
      return {
        ...draft,
        automaticSendInProgress:true,
        automaticSendStartedAt:startedAt,
      };
    });
  });

  it("calls the email provider exactly once for two concurrent sends",async()=>{
    let releaseProvider!:()=>void;
    const providerGate=new Promise<void>(resolve=>{
      releaseProvider=resolve;
    });

    mocks.sendEmail.mockImplementation(async()=>{
      await providerGate;
      return {
        id:"provider-message-123",
        threadId:"thread-123",
        provider:"gmail",
        sent:true,
      };
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

  it("requires recovery when the provider call times out",async()=>{
    mocks.sendEmail.mockRejectedValue(new Error("Provider request timed out"));

    await expect(sendDraft(draftId.toString())).rejects.toThrow("Provider request timed out");

    expect(mocks.sendEmail).toHaveBeenCalledTimes(1);
    expect(mocks.markAutomaticRecoveryRequired).toHaveBeenCalledTimes(1);
    expect(mocks.markAutomaticRecoveryRequired).toHaveBeenCalledWith(
      draftId.toString(),
      expect.stringContaining("requires verification"),
      startedAt,
    );
  });

  it("requires recovery when the provider accepts the email but the database update fails",async()=>{
    mocks.sendEmail.mockResolvedValue({
      id:"provider-message-123",
      threadId:"thread-123",
      provider:"gmail",
      sent:true,
    });

    mocks.update.mockRejectedValue(new Error("Database connection lost"));

    await expect(sendDraft(draftId.toString())).rejects.toThrow("Database connection lost");

    expect(mocks.sendEmail).toHaveBeenCalledTimes(1);
    expect(mocks.markAutomaticRecoveryRequired).toHaveBeenCalledTimes(1);
    expect(mocks.markAutomaticRecoveryRequired).toHaveBeenCalledWith(
      draftId.toString(),
      expect.stringContaining("requires verification"),
      startedAt,
    );
  });

  it("does not call the provider when the source email is missing",async()=>{
    mocks.emailFindById.mockResolvedValue(null);

    await expect(sendDraft(draftId.toString())).rejects.toThrow("Source email not found.");

    expect(mocks.sendEmail).not.toHaveBeenCalled();
    expect(mocks.markAutomaticRecoveryRequired).not.toHaveBeenCalled();
    expect(mocks.update).toHaveBeenCalledWith(
      draftId.toString(),
      {automaticSendInProgress:false},
    );
  });

  it("does not send again when recovery is already required",async()=>{
    mocks.findById.mockResolvedValue({
      ...draft,
      automaticSendRecoveryRequired:true,
    });

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
