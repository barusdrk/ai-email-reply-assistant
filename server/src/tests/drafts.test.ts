import {beforeEach,describe,expect,it,vi} from "vitest";
import {Types} from "mongoose";

const mocks=vi.hoisted(()=>({
  draftCreate:vi.fn(),
  draftFindById:vi.fn(),
  draftUpdate:vi.fn(),
  emailUpdate:vi.fn(),
  analyzeDraftSupport:vi.fn(),
  scoreDraftConfidence:vi.fn(),
  evaluateDraftPolicy:vi.fn(),
  determineAutomaticAction:vi.fn(),
  applySupportDecision:vi.fn(),
  generateReply:vi.fn(),
  requestApproval:vi.fn(),
  sendAutomatically:vi.fn(),
}));

vi.mock("../repositories/DraftRepository.js",()=>({
  draftRepository:{
    create:mocks.draftCreate,
    findById:mocks.draftFindById,
    update:mocks.draftUpdate,
  },
}));

vi.mock("../repositories/EmailRepository.js",()=>({
  emailRepository:{
    update:mocks.emailUpdate,
  },
}));

vi.mock("../services/openai.js",()=>({
  generateReply:mocks.generateReply,
}));

vi.mock("../services/automaticActions.js",()=>({
  determineAutomaticAction:mocks.determineAutomaticAction,
}));

vi.mock("../services/draftSupport.js",()=>({
  analyzeDraftSupport:mocks.analyzeDraftSupport,
  applySupportDecision:mocks.applySupportDecision,
  evaluateDraftPolicy:mocks.evaluateDraftPolicy,
  scoreDraftConfidence:mocks.scoreDraftConfidence,
}));

vi.mock("../services/approval.js",()=>({
  requestApproval:mocks.requestApproval,
}));

vi.mock("../services/draftApproval.js",()=>({
  approveDraft:vi.fn(),
  rejectDraft:vi.fn(),
  submitDraft:vi.fn(),
}));

vi.mock("../services/draftSending.js",()=>({
  sendDraft:vi.fn(),
}));

vi.mock("../services/automaticSend.js",()=>({
  sendAutomatically:mocks.sendAutomatically,
}));

import {draftRepository} from "../repositories/DraftRepository.js";
import {emailRepository} from "../repositories/EmailRepository.js";
import {determineAutomaticAction} from "../services/automaticActions.js";
import {analyzeDraftSupport,applySupportDecision,evaluateDraftPolicy,scoreDraftConfidence} from "../services/draftSupport.js";
import {requestApproval} from "../services/approval.js";
import {sendAutomatically} from "../services/automaticSend.js";
import {createDraft} from "../services/drafts.js";

const draftRepositoryMock=vi.mocked(draftRepository);
const emailRepositoryMock=vi.mocked(emailRepository);
const determineAutomaticActionMock=vi.mocked(determineAutomaticAction);
const analyzeDraftSupportMock=vi.mocked(analyzeDraftSupport);
const applySupportDecisionMock=vi.mocked(applySupportDecision);
const evaluateDraftPolicyMock=vi.mocked(evaluateDraftPolicy);
const scoreDraftConfidenceMock=vi.mocked(scoreDraftConfidence);
const requestApprovalMock=vi.mocked(requestApproval);
const sendAutomaticallyMock=vi.mocked(sendAutomatically);

const userId=new Types.ObjectId();
const emailId=new Types.ObjectId();
const draftId=new Types.ObjectId();

function buildSupportResult(overrides:Record<string,unknown>={}){
  return{
    reply:"Thanks for contacting us. We are happy to help.",
    category:"general_support",
    sentiment:"neutral",
    confidence:0.95,
    decision:"reply",
    needsHuman:false,
    reason:"",
    suggestedActions:[],
    missingInformation:[],
    policyIssues:[],
    ...overrides,
  };
}

function buildSupportAnalysis(overrides:Record<string,unknown>={}){
  return{
    customerContext:{
      email:"customer@example.com",
    },
    supportResult:buildSupportResult(),
    sourceEmail:{
      _id:emailId,
      userId,
      provider:"gmail" as const,
      direction:"inbound" as const,
      from:"customer@example.com",
      senderName:"Customer",
      senderEmail:"customer@example.com",
      recipientName:"Support",
      subject:"Account help",
      body:"I need help with my account.",
      threadId:"thread-123",
      messageId:"message-123",
      messageIdHeader:"<message-123@example.com>",
      references:[],
    },
    companyPolicies:[],
    supportConversationHistory:[],
    customerEmailBody:"I need help with my account.",
    customerEmailSubject:"Account help",
    customerEmail:"customer@example.com",
    knowledgeBase:[],
    conversationHistory:[],
    persistedCustomer:null,
    ...overrides,
  } as unknown as Awaited<ReturnType<typeof analyzeDraftSupport>>;
}

function buildConfidence(){
  return{
    score:95,
    level:"high" as const,
    reasons:["The reply is well supported by the available information."],
  };
}

function buildPolicy(){
  return{
    compliant:true,
    score:100,
    violations:[],
    warnings:[],
    suggestions:[],
  };
}

function buildDraft(action:"auto_approve"|"pending"|"escalate"|"blocked"){
  const status=action==="auto_approve"
    ?"approved"
    :action==="escalate"
      ?"escalated"
      :action==="blocked"
        ?"rejected"
        :"pending";

  return{
    _id:draftId,
    userId,
    emailId,
    provider:"gmail" as const,
    subject:"Account help",
    customer:"customer@example.com",
    reply:"Thanks for contacting us. We are happy to help.",
    tone:"professional" as const,
    length:"medium" as const,
    status,
    automaticAction:action,
    automaticActionReasons:[],
    automaticSendInProgress:false,
    automaticSendPhase:"idle" as const,
    automaticSendAttempts:0,
    automaticSendRecoveryRequired:false,
    confidence:buildConfidence(),
    supportCategory:"general_support" as const,
    supportSentiment:"neutral" as const,
    supportConfidence:0.95,
    supportDecision:"reply" as const,
    supportNeedsHuman:false,
    supportReason:"",
    supportSuggestedActions:[],
    supportMissingInformation:[],
    supportPolicyIssues:[],
    escalatedAt:undefined,
    escalationReason:undefined,
    escalationReasons:[],
    approvedAt:action==="auto_approve"?new Date():undefined,
    rejectionReason:action==="blocked"?"Blocked by automatic action policy.":undefined,
    sentAt:undefined,
    createdAt:new Date(),
    updatedAt:new Date(),
  };
}

function setupAction(action:"auto_approve"|"pending"|"escalate"|"blocked"){
  const supportResult=buildSupportResult({
    needsHuman:action==="escalate",
    decision:action==="escalate"?"human_review":"reply",
    reason:action==="escalate"?"Human review is required.":"",
  });

  analyzeDraftSupportMock.mockResolvedValue(
    buildSupportAnalysis({supportResult}),
  );

  scoreDraftConfidenceMock.mockResolvedValue(buildConfidence());
  evaluateDraftPolicyMock.mockResolvedValue(buildPolicy());

  determineAutomaticActionMock.mockReturnValue({
    action,
    reasons:action==="blocked"
      ?["The request cannot be handled automatically."]
      :action==="escalate"
        ?["Human review is required."]
        :[],
  });

  applySupportDecisionMock.mockImplementation((decision)=>decision);

  const draft=buildDraft(action);
  draftRepositoryMock.create.mockResolvedValue(draft as never);
  emailRepositoryMock.update.mockResolvedValue(null as never);

  if(action==="auto_approve"){
    sendAutomaticallyMock.mockResolvedValue({
      sent:true,
      provider:"gmail",
      draftId:draftId.toString(),
      emailId:emailId.toString(),
      sentAt:new Date(),
    });
  }

  return draft;
}

function buildCreateDraftInput(){
  return{
    userId:userId.toString(),
    emailId:emailId.toString(),
    provider:"gmail" as const,
    subject:"Account help",
    customer:"customer@example.com",
    reply:"Thanks for contacting us. We are happy to help.",
  };
}

beforeEach(()=>{
  vi.clearAllMocks();

  draftRepositoryMock.create.mockReset();
  draftRepositoryMock.findById.mockReset();
  draftRepositoryMock.update.mockReset();

  emailRepositoryMock.update.mockReset();

  determineAutomaticActionMock.mockReset();
  analyzeDraftSupportMock.mockReset();
  applySupportDecisionMock.mockReset();
  evaluateDraftPolicyMock.mockReset();
  scoreDraftConfidenceMock.mockReset();
  requestApprovalMock.mockReset();
  sendAutomaticallyMock.mockReset();

  requestApprovalMock.mockResolvedValue(undefined as never);
});

describe("createDraft automatic-send integration",()=>{
  it("automatically sends an approved draft when the action is auto_approve",async()=>{
    const draft=setupAction("auto_approve");

    const result=await createDraft(buildCreateDraftInput());

    expect(draftRepositoryMock.create).toHaveBeenCalledTimes(1);
    expect(draftRepositoryMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        status:"approved",
        automaticAction:"auto_approve",
      }),
    );

    expect(sendAutomaticallyMock).toHaveBeenCalledTimes(1);
    expect(sendAutomaticallyMock).toHaveBeenCalledWith(
      userId.toString(),
      draftId.toString(),
    );

    expect(requestApprovalMock).not.toHaveBeenCalled();
    expect(result).toBe(draft);
  });

  it("does not automatically send a pending draft",async()=>{
    setupAction("pending");

    await createDraft(buildCreateDraftInput());

    expect(draftRepositoryMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        status:"pending",
        automaticAction:"pending",
      }),
    );

    expect(sendAutomaticallyMock).not.toHaveBeenCalled();
    expect(requestApprovalMock).toHaveBeenCalledTimes(1);
    expect(requestApprovalMock).toHaveBeenCalledWith(
      draftId.toString(),
      userId.toString(),
    );
  });

  it("does not automatically send an escalated draft",async()=>{
    setupAction("escalate");

    await createDraft(buildCreateDraftInput());

    expect(draftRepositoryMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        status:"escalated",
        automaticAction:"escalate",
      }),
    );

    expect(sendAutomaticallyMock).not.toHaveBeenCalled();
    expect(requestApprovalMock).toHaveBeenCalledTimes(1);
    expect(requestApprovalMock).toHaveBeenCalledWith(
      draftId.toString(),
      userId.toString(),
    );
  });

  it("does not automatically send a blocked draft",async()=>{
    setupAction("blocked");

    await createDraft(buildCreateDraftInput());

    expect(draftRepositoryMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        status:"rejected",
        automaticAction:"blocked",
      }),
    );

    expect(sendAutomaticallyMock).not.toHaveBeenCalled();
    expect(requestApprovalMock).not.toHaveBeenCalled();
  });

  it("continues draft creation when automatic sending fails",async()=>{
    const draft=setupAction("auto_approve");

    sendAutomaticallyMock.mockRejectedValue(
      new Error("Provider unavailable."),
    );

    const result=await createDraft(buildCreateDraftInput());

    expect(sendAutomaticallyMock).toHaveBeenCalledWith(
      userId.toString(),
      draftId.toString(),
    );
    expect(result).toBe(draft);
  });

  it("updates the source email with the created draft ID before automatic sending",async()=>{
    setupAction("auto_approve");

    await createDraft(buildCreateDraftInput());

    expect(emailRepositoryMock.update).toHaveBeenCalledTimes(1);
    expect(emailRepositoryMock.update).toHaveBeenCalledWith(
      emailId.toString(),
      {draftId},
    );

    expect(sendAutomaticallyMock).toHaveBeenCalledTimes(1);
  });
});
