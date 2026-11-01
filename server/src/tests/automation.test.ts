import {describe,expect,it,vi,beforeEach} from "vitest";
import {Types} from "mongoose";

vi.mock("../repositories/DraftRepository.js",()=>({
  draftRepository:{
    findById:vi.fn(),
    update:vi.fn(),
  },
}));

vi.mock("../repositories/ApprovalRepository.js",()=>({
  approvalRepository:{
    findPendingByDraft:vi.fn(),
    create:vi.fn(),
  },
}));

vi.mock("../services/confidenceScoring.js",()=>({
  scoreReplyConfidence:vi.fn(),
}));

vi.mock("../services/policyChecker.js",()=>({
  checkReplyPolicy:vi.fn(),
}));

vi.mock("../services/escalation.js",()=>({
  determineEscalation:vi.fn(),
}));

vi.mock("../services/settings.js",()=>({
  getSettings:vi.fn().mockResolvedValue({autoSendEnabled:false}),
}));

import {draftRepository} from "../repositories/DraftRepository.js";
import {approvalRepository} from "../repositories/ApprovalRepository.js";
import {scoreReplyConfidence} from "../services/confidenceScoring.js";
import {checkReplyPolicy} from "../services/policyChecker.js";
import {determineEscalation} from "../services/escalation.js";
import {evaluateDraftAutomation} from "../services/automation.js";

const userId=new Types.ObjectId().toString();
const draftId=new Types.ObjectId().toString();
const emailId=new Types.ObjectId();
const draft={
  _id:new Types.ObjectId(draftId),
  userId:new Types.ObjectId(userId),
  emailId,
  customer:"customer@example.com",
  reply:"Thanks for contacting us. Your request has been received.",
  status:"pending",
  tone:"professional",
  length:"medium",
};

function mockConfidence(score:number,level:"high"|"medium"|"low"){
  vi.mocked(scoreReplyConfidence).mockResolvedValue({
    score,
    level,
    reasons:[`${level} confidence`],
  });
}

function mockPolicy(overrides:Partial<Awaited<ReturnType<typeof checkReplyPolicy>>>={}){
  vi.mocked(checkReplyPolicy).mockResolvedValue({
    compliant:true,
    score:100,
    violations:[],
    warnings:[],
    suggestions:[],
    ...overrides,
  });
}

describe("evaluateDraftAutomation",()=>{
  beforeEach(()=>{
    vi.clearAllMocks();
  });

  it("keeps high-confidence compliant replies pending for human approval",async()=>{
    vi.mocked(draftRepository.findById).mockResolvedValue(draft as any);
    vi.mocked(draftRepository.update).mockResolvedValue(draft as any);
    vi.mocked(approvalRepository.findPendingByDraft).mockResolvedValue(null);
    mockConfidence(92,"high");
    mockPolicy();
    vi.mocked(determineEscalation).mockReturnValue({escalated:false,reasons:[]});

    const result=await evaluateDraftAutomation({userId,draftId});

    expect(result?.action).toBe("pending");
    expect(result?.status).toBe("pending");
    expect(result?.confidence.score).toBe(92);
    expect(draftRepository.update).toHaveBeenCalledWith(
      draftId,
      expect.objectContaining({
        automaticAction:"pending",
        status:"pending",
        confidence:expect.objectContaining({score:92,level:"high"}),
        automaticActionReasons:expect.arrayContaining([
          "Human approval is required before the response can be sent.",
          "Automatic sending is disabled.",
        ]),
      }),
    );
    expect(approvalRepository.create).toHaveBeenCalledTimes(1);
    expect(approvalRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        draftId:draft._id,
        emailId,
        requesterId:draft.userId,
        reviewerId:draft.userId,
        status:"pending",
        priority:"medium",
      }),
    );
  });

  it("creates a pending approval for medium-confidence replies",async()=>{
    vi.mocked(draftRepository.findById).mockResolvedValue(draft as any);
    vi.mocked(draftRepository.update).mockResolvedValue(draft as any);
    vi.mocked(approvalRepository.findPendingByDraft).mockResolvedValue(null);
    mockConfidence(62,"medium");
    mockPolicy();
    vi.mocked(determineEscalation).mockReturnValue({escalated:false,reasons:[]});

    const result=await evaluateDraftAutomation({userId,draftId});

    expect(result?.action).toBe("pending");
    expect(result?.status).toBe("pending");
    expect(approvalRepository.create).toHaveBeenCalledTimes(1);
    expect(approvalRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        draftId:draft._id,
        emailId,
        requesterId:draft.userId,
        reviewerId:draft.userId,
        status:"pending",
        priority:"medium",
      }),
    );
  });

  it("escalates low-confidence requests for human review",async()=>{
    vi.mocked(draftRepository.findById).mockResolvedValue(draft as any);
    vi.mocked(draftRepository.update).mockResolvedValue(draft as any);
    vi.mocked(approvalRepository.findPendingByDraft).mockResolvedValue(null);
    mockConfidence(30,"low");
    mockPolicy();
    vi.mocked(determineEscalation).mockReturnValue({escalated:false,reasons:[]});

    const result=await evaluateDraftAutomation({userId,draftId});

    expect(result?.action).toBe("escalate");
    expect(result?.status).toBe("escalated");
    expect(approvalRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        draftId:draft._id,
        emailId,
        requesterId:draft.userId,
        reviewerId:draft.userId,
        status:"pending",
        priority:"high",
      }),
    );
  });

  it("blocks policy violations without creating an approval",async()=>{
    vi.mocked(draftRepository.findById).mockResolvedValue(draft as any);
    vi.mocked(draftRepository.update).mockResolvedValue(draft as any);
    vi.mocked(approvalRepository.findPendingByDraft).mockResolvedValue(null);
    mockConfidence(95,"high");
    mockPolicy({
      compliant:false,
      score:0,
      violations:["The reply contradicts company policy."],
    });
    vi.mocked(determineEscalation).mockReturnValue({escalated:false,reasons:[]});

    const result=await evaluateDraftAutomation({userId,draftId});

    expect(result?.action).toBe("blocked");
    expect(result?.status).toBe("blocked");
    expect(result?.reasons).toContain("The reply contradicts company policy.");
    expect(draftRepository.update).toHaveBeenCalledWith(
      draftId,
      expect.objectContaining({
        automaticAction:"blocked",
        automaticActionReasons:["The reply contradicts company policy."],
        status:"pending",
      }),
    );
    expect(approvalRepository.create).not.toHaveBeenCalled();
  });

  it("does not create duplicate pending approvals",async()=>{
    vi.mocked(draftRepository.findById).mockResolvedValue(draft as any);
    vi.mocked(draftRepository.update).mockResolvedValue(draft as any);
    vi.mocked(approvalRepository.findPendingByDraft).mockResolvedValue({
      _id:new Types.ObjectId(),
      status:"pending",
    } as any);
    mockConfidence(65,"medium");
    mockPolicy();
    vi.mocked(determineEscalation).mockReturnValue({escalated:false,reasons:[]});

    const result=await evaluateDraftAutomation({userId,draftId});

    expect(result?.action).toBe("pending");
    expect(result?.status).toBe("pending");
    expect(approvalRepository.create).not.toHaveBeenCalled();
  });

  it("rejects unauthorized draft access",async()=>{
    vi.mocked(draftRepository.findById).mockResolvedValue({
      ...draft,
      userId:new Types.ObjectId(),
    } as any);

    await expect(evaluateDraftAutomation({userId,draftId})).rejects.toThrow("Unauthorized.");
    expect(draftRepository.update).not.toHaveBeenCalled();
    expect(approvalRepository.create).not.toHaveBeenCalled();
  });

  it("returns null when the draft does not exist",async()=>{
    vi.mocked(draftRepository.findById).mockResolvedValue(null);

    const result=await evaluateDraftAutomation({userId,draftId});

    expect(result).toBeNull();
    expect(draftRepository.update).not.toHaveBeenCalled();
    expect(approvalRepository.create).not.toHaveBeenCalled();
  });
});
