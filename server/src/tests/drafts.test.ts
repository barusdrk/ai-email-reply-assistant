import {beforeEach,describe,expect,it,vi} from "vitest";
import {Types} from "mongoose";

const mocks=vi.hoisted(()=>({
  draftCreate:vi.fn(),
  draftCreateIfNotExists:vi.fn(),
  draftFindById:vi.fn(),
  draftUpdate:vi.fn(),
  emailUpdate:vi.fn(),
  emailMarkAutomaticDraftGenerated:vi.fn(),
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
    createIfNotExists:mocks.draftCreateIfNotExists,
    findById:mocks.draftFindById,
    update:mocks.draftUpdate,
  },
}));

vi.mock("../repositories/EmailRepository.js",()=>({
  emailRepository:{
    update:mocks.emailUpdate,
    markAutomaticDraftGenerated:mocks.emailMarkAutomaticDraftGenerated,
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
  requestApproval: mocks.requestApproval,
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

  draftRepositoryMock.createIfNotExists.mockResolvedValue({
    created:true,
    draft,
  } as never);

  emailRepositoryMock.update.mockResolvedValue(null as never);

  if(action==="auto_approve"){
    sendAutomaticallyMock.mockResolvedValue({
      sent:true,
      provider:"gmail",
      draftId:draftId.toString(),
      emailId:emailId.toString(),
      sentAt:new Date(),
    } as never);
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
  draftRepositoryMock.createIfNotExists.mockReset();
  draftRepositoryMock.findById.mockReset();
  draftRepositoryMock.update.mockReset();
  emailRepositoryMock.update.mockReset();
  emailRepositoryMock.markAutomaticDraftGenerated.mockReset();
  determineAutomaticActionMock.mockReset();
  analyzeDraftSupportMock.mockReset();
  applySupportDecisionMock.mockReset();
  evaluateDraftPolicyMock.mockReset();
  scoreDraftConfidenceMock.mockReset();
  requestApprovalMock.mockReset();
  sendAutomaticallyMock.mockReset();
  emailRepositoryMock.markAutomaticDraftGenerated.mockResolvedValue(null as never);
  requestApprovalMock.mockResolvedValue(undefined as never);
  mocks.requestApproval.mockReset();
  mocks.requestApproval.mockResolvedValue(undefined);
});


describe("createDraft human-approval workflow",()=>{
  it.each(["auto_approve","pending","escalate","blocked"] as const)(
    "keeps a %s decision pending and requires human approval",
    async(action)=>{
      setupAction(action);
      await createDraft(buildCreateDraftInput());

      expect(draftRepositoryMock.createIfNotExists).toHaveBeenCalledTimes(1);
      expect(draftRepositoryMock.createIfNotExists).toHaveBeenCalledWith(
        expect.objectContaining({
          status:"pending",
          automaticAction:"pending",
          supportNeedsHuman:true,
          approvedAt:undefined,
          escalatedAt:undefined,
          rejectionReason:undefined,
        }),
      );
      expect(sendAutomaticallyMock).not.toHaveBeenCalled();
      expect(requestApprovalMock).toHaveBeenCalledTimes(1);
      expect(requestApprovalMock).toHaveBeenCalledWith(
        draftId.toString(),
        userId.toString(),
      );
    },
  );

  it("links the source email to the new draft before requesting approval",async()=>{
    setupAction("auto_approve");

    await createDraft(buildCreateDraftInput());

    expect(emailRepositoryMock.markAutomaticDraftGenerated).toHaveBeenCalledTimes(1);
    expect(emailRepositoryMock.markAutomaticDraftGenerated).toHaveBeenCalledWith(
      emailId.toString(),
      draftId,
      undefined,
    );
    expect(
      emailRepositoryMock.markAutomaticDraftGenerated.mock.invocationCallOrder[0],
    ).toBeLessThan(
      requestApprovalMock.mock.invocationCallOrder[0],
    );
    expect(sendAutomaticallyMock).not.toHaveBeenCalled();
    expect(requestApprovalMock).toHaveBeenCalledTimes(1);
  });

  it("does not request approval again when the draft already exists",async()=>{
    const draft=setupAction("pending");
    draftRepositoryMock.createIfNotExists.mockResolvedValue({
      created:false,
      draft,
    } as never);

    await createDraft(buildCreateDraftInput());

    expect(emailRepositoryMock.markAutomaticDraftGenerated).toHaveBeenCalledTimes(1);
    expect(requestApprovalMock).not.toHaveBeenCalled();
    expect(sendAutomaticallyMock).not.toHaveBeenCalled();
  });

  it("does not automatically send a high-confidence reply",async()=>{
    setupAction("auto_approve");
    scoreDraftConfidenceMock.mockResolvedValue({
      ...buildConfidence(),
      score:98,
      level:"high",
    });

    await createDraft(buildCreateDraftInput());

    expect(draftRepositoryMock.createIfNotExists).toHaveBeenCalledWith(
      expect.objectContaining({
        status:"pending",
        automaticAction:"pending",
        confidence:expect.objectContaining({
          score:98,
          level:"high",
        }),
      }),
    );
    expect(sendAutomaticallyMock).not.toHaveBeenCalled();
    expect(requestApprovalMock).toHaveBeenCalledTimes(1);
  });
});
