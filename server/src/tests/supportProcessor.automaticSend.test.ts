import {beforeEach,describe,expect,it,vi} from "vitest";
import {Types} from "mongoose";

const mocks=vi.hoisted(()=>({
  findOne:vi.fn(),
  find:vi.fn(),
  createDraft:vi.fn(),
  sendAutomatically:vi.fn(),
}));

vi.mock("../models/Email.js",()=>({
  default:{
    findOne:mocks.findOne,
    find:mocks.find,
  },
}));

vi.mock("../services/drafts.js",()=>({
  createDraftFromSupportResult:mocks.createDraft,
}));

vi.mock("../services/automaticSend.js",()=>({
  sendAutomatically:mocks.sendAutomatically,
}));

import {processNewInboundEmail} from "../services/supportProcessor.js";

const userId=new Types.ObjectId().toString();
const emailId=new Types.ObjectId().toString();
const draftId=new Types.ObjectId();

function setupEmail(){
  const email={
    _id:new Types.ObjectId(emailId),
    userId:new Types.ObjectId(userId),
    provider:"gmail",
    direction:"inbound",
    senderName:"Customer",
    senderEmail:"customer@example.com",
    subject:"Shipping question",
    body:"How long does shipping take?",
    threadId:"thread-123",
    messageId:"message-123",
    receivedAt:new Date("2026-11-03T10:00:00.000Z"),
  };
  mocks.findOne.mockReturnValue({lean:vi.fn().mockResolvedValue(email)});
  mocks.find.mockReturnValue({
    sort:vi.fn().mockReturnValue({
      lean:vi.fn().mockResolvedValue([email]),
    }),
  });
}

function setupDraft(overrides:Record<string,unknown>={}){
  const draft={
    _id:draftId,
    automaticAction:"auto_approve",
    status:"approved",
    confidence:{score:100,level:"high",reasons:[]},
    supportDecision:"reply",
    supportCategory:"shipping",
    supportNeedsHuman:false,
    ...overrides,
  };
  mocks.createDraft.mockResolvedValue({draft,created:true});
  return draft;
}

describe("processNewInboundEmail automatic sending",()=>{
  beforeEach(()=>{
    vi.clearAllMocks();
    setupEmail();
  });

  it("automatically sends a newly created approved auto_approve draft",async()=>{
    setupDraft();
    mocks.sendAutomatically.mockResolvedValue({
      sent:true,
      provider:"gmail",
      draftId:draftId.toString(),
      emailId,
      sentAt:new Date(),
    });

    const result=await processNewInboundEmail(userId,emailId);

    expect(mocks.createDraft).toHaveBeenCalledWith(
      expect.objectContaining({userId,emailId,provider:"gmail"}),
      {returnCreationResult:true},
    );
    expect(mocks.sendAutomatically).toHaveBeenCalledOnce();
    expect(mocks.sendAutomatically).toHaveBeenCalledWith(
      userId,
      draftId.toString(),
    );
    expect(result.success).toBe(true);
  });

  it("does not send a draft that was already created by an earlier processing attempt",async()=>{
    setupDraft();
    mocks.createDraft.mockResolvedValue({
      draft:{
        _id:draftId,
        automaticAction:"auto_approve",
        status:"approved",
      },
      created:false,
    });

    await processNewInboundEmail(userId,emailId);

    expect(mocks.sendAutomatically).not.toHaveBeenCalled();
  });

  it.each([
    {automaticAction:"pending",status:"pending"},
    {automaticAction:"escalate",status:"escalated"},
    {automaticAction:"blocked",status:"pending"},
    {automaticAction:"auto_approve",status:"pending"},
  ])("does not send ineligible drafts: $automaticAction / $status",async(overrides)=>{
    setupDraft(overrides);

    await processNewInboundEmail(userId,emailId);

    expect(mocks.sendAutomatically).not.toHaveBeenCalled();
  });

  it("keeps support processing successful and logs a send failure",async()=>{
    setupDraft();
    mocks.sendAutomatically.mockRejectedValue(new Error("Gmail send failed."));
    const errorSpy=vi.spyOn(console,"error").mockImplementation(()=>{});

    const result=await processNewInboundEmail(userId,emailId);

    expect(result.success).toBe(true);
    expect(mocks.sendAutomatically).toHaveBeenCalledOnce();
    expect(errorSpy).toHaveBeenCalledWith(
      "AUTOMATIC SUPPORT REPLY SEND FAILED:",
      expect.objectContaining({
        draftId:draftId.toString(),
        error:"Gmail send failed.",
      }),
    );
    errorSpy.mockRestore();
  });
});
