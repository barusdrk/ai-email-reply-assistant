import {beforeEach,describe,expect,it,vi} from "vitest";
import {Types} from "mongoose";

const mocks=vi.hoisted(()=>({
  findById:vi.fn(),updateAutomationState:vi.fn(),analyzeDraftSupport:vi.fn(),
  scoreDraftConfidence:vi.fn(),evaluateDraftPolicy:vi.fn(),applySupportDecision:vi.fn(),
  determineAutomaticAction:vi.fn(),requestApproval:vi.fn(),sendAutomatically:vi.fn(),
  recordDraftAnalytics:vi.fn(),
}));
vi.mock("../repositories/DraftRepository.js",()=>({draftRepository:{findById:mocks.findById,updateAutomationState:mocks.updateAutomationState}}));
vi.mock("../services/draftSupport.js",()=>({
  analyzeDraftSupport:mocks.analyzeDraftSupport,scoreDraftConfidence:mocks.scoreDraftConfidence,
  evaluateDraftPolicy:mocks.evaluateDraftPolicy,applySupportDecision:mocks.applySupportDecision,
}));
vi.mock("../services/automaticActions.js",()=>({determineAutomaticAction:mocks.determineAutomaticAction}));
vi.mock("../services/draftApproval.js",()=>({requestApproval:mocks.requestApproval}));
vi.mock("../services/automaticSend.js",()=>({sendAutomatically:mocks.sendAutomatically}));
vi.mock("../services/supportAnalytics.js",()=>({recordDraftAnalytics:mocks.recordDraftAnalytics}));
import {draftRepository} from "../repositories/DraftRepository.js";
import {updateDraft} from "../services/draftUpdate.js";
const repository=vi.mocked(draftRepository);
const userId=new Types.ObjectId();
const emailId=new Types.ObjectId();
const draftId=new Types.ObjectId();
const rejectedDraft={_id:draftId,userId,emailId,provider:"gmail",customer:"customer@example.com",reply:"Safe reply",tone:"professional",length:"medium",status:"rejected",automaticSendInProgress:false,automaticSendRecoveryRequired:false};
const updatedDraft={...rejectedDraft,_id:{toString:()=>draftId.toString()}};

describe("updateDraft rejected-draft safety",()=>{
  beforeEach(()=>{
    vi.clearAllMocks();
    repository.findById.mockResolvedValue(rejectedDraft as never);
    mocks.analyzeDraftSupport.mockResolvedValue({
      customerEmailBody:"Please help with my order.",knowledgeBase:[],
      supportResult:{category:"general_support",sentiment:"neutral",confidence:0.99,decision:"reply",needsHuman:false,reason:"Supported request.",suggestedActions:[],missingInformation:[],policyIssues:[]},
      customerContext:{},
    });
    mocks.scoreDraftConfidence.mockResolvedValue({score:99,level:"high",reasons:[]});
    mocks.evaluateDraftPolicy.mockResolvedValue({compliant:true,violations:[]});
    mocks.determineAutomaticAction.mockReturnValue({action:"auto_approve",reasons:[]});
    mocks.applySupportDecision.mockImplementation(action=>action);
    mocks.updateAutomationState.mockResolvedValue(updatedDraft as never);
    mocks.requestApproval.mockResolvedValue({} as never);
    mocks.recordDraftAnalytics.mockResolvedValue(undefined);
  });
  it("routes a newly eligible rejected draft to human approval instead of automatic sending",async()=>{
    await updateDraft(draftId.toString(),{reply:"Safe reply"});
    expect(mocks.updateAutomationState).toHaveBeenCalledWith(draftId.toString(),expect.objectContaining({
      status:"pending",automaticAction:"pending",approvedAt:undefined,
    }));
    expect(mocks.requestApproval).toHaveBeenCalledWith(draftId.toString(),userId.toString());
    expect(mocks.sendAutomatically).not.toHaveBeenCalled();
  });
  it("keeps an escalated draft in human review even if it becomes auto-eligible",async()=>{
    repository.findById.mockResolvedValue({...rejectedDraft,status:"escalated"} as never);
    await updateDraft(draftId.toString(),{reply:"Safe reply"});
    expect(mocks.updateAutomationState).toHaveBeenCalledWith(draftId.toString(),expect.objectContaining({
      status:"pending",automaticAction:"pending",supportNeedsHuman:false,
    }));
    expect(mocks.requestApproval).toHaveBeenCalledWith(draftId.toString(),userId.toString());
    expect(mocks.sendAutomatically).not.toHaveBeenCalled();
  });
  it("returns an edited approved draft to human approval instead of auto-sending",async()=>{
    repository.findById.mockResolvedValue({...rejectedDraft,status:"approved",approvedAt:new Date()} as never);
    await updateDraft(draftId.toString(),{reply:"Edited approved reply"});
    expect(mocks.updateAutomationState).toHaveBeenCalledWith(draftId.toString(),expect.objectContaining({
      status:"pending",automaticAction:"pending",approvedAt:undefined,
    }));
    expect(mocks.requestApproval).toHaveBeenCalledWith(draftId.toString(),userId.toString());
    expect(mocks.sendAutomatically).not.toHaveBeenCalled();
  });
  it("keeps an edited pending draft in the approval queue when it is auto-eligible",async()=>{
    repository.findById.mockResolvedValue({...rejectedDraft,status:"pending"} as never);
    await updateDraft(draftId.toString(),{reply:"Edited pending reply"});
    expect(mocks.updateAutomationState).toHaveBeenCalledWith(draftId.toString(),expect.objectContaining({
      status:"pending",automaticAction:"pending",
    }));
    expect(mocks.requestApproval).toHaveBeenCalledWith(draftId.toString(),userId.toString());
    expect(mocks.sendAutomatically).not.toHaveBeenCalled();
  });
  it("keeps an ineligible rejected draft blocked",async()=>{
    mocks.determineAutomaticAction.mockReturnValue({action:"blocked",reasons:["Unsupported claim."]});
    mocks.applySupportDecision.mockImplementation(action=>action);
    await updateDraft(draftId.toString(),{reply:"Unsupported claim."});
    expect(mocks.updateAutomationState).toHaveBeenCalledWith(draftId.toString(),expect.objectContaining({
      status:"rejected",automaticAction:"blocked",
    }));
    expect(mocks.requestApproval).not.toHaveBeenCalled();
    expect(mocks.sendAutomatically).not.toHaveBeenCalled();
    expect(mocks.updateAutomationState).toHaveBeenCalledWith(draftId.toString(),expect.objectContaining({
      supportNeedsHuman:false,
    }));
  });
  it("converts confidence-based escalation into consistent human-review metadata and invalidates prior approval",async()=>{
    const previousApproval=new Date("2026-11-03T09:55:18.608Z");
    repository.findById.mockResolvedValue({
      ...rejectedDraft,
      status:"approved",
      approvedAt:previousApproval,
      escalatedAt:new Date("2026-11-04T10:00:00.000Z"),
      escalationReason:"Previous escalation",
      escalationReasons:["Previous escalation"],
    } as never);
    mocks.scoreDraftConfidence.mockResolvedValue({
      score:0,
      level:"low",
      reasons:["The edited reply does not answer the customer's question."],
    });
    mocks.determineAutomaticAction.mockReturnValue({
      action:"escalate",
      reasons:["Low AI confidence: 0/100.","Human specialist escalation is required."],
    });

    await updateDraft(draftId.toString(),{reply:"H"});

    expect(mocks.updateAutomationState).toHaveBeenCalledWith(draftId.toString(),expect.objectContaining({
      status:"escalated",
      automaticAction:"escalate",
      supportDecision:"human_review",
      supportNeedsHuman:true,
      supportReason:"Low AI confidence: 0/100. Human specialist escalation is required.",
      approvedAt:undefined,
      escalatedAt:expect.any(Date),
      escalationReason:"Low AI confidence: 0/100.",
      escalationReasons:["Low AI confidence: 0/100.","Human specialist escalation is required."],
    }));
    expect(mocks.recordDraftAnalytics).toHaveBeenCalledWith(expect.objectContaining({
      automaticAction:"escalate",
      supportDecision:"human_review",
      supportNeedsHuman:true,
      outcome:"escalated",
    }));
    expect(mocks.requestApproval).toHaveBeenCalledWith(draftId.toString(),userId.toString());
    expect(mocks.sendAutomatically).not.toHaveBeenCalled();
  });

});
