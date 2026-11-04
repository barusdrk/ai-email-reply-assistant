import {beforeEach,describe,expect,it,vi} from "vitest";
import {Types} from "mongoose";

const mocks=vi.hoisted(()=>({findById:vi.fn(),updateDraft:vi.fn(),findPendingByDraft:vi.fn(),approvalUpdate:vi.fn()}));
vi.mock("../repositories/DraftRepository.js",()=>({draftRepository:{findById:mocks.findById}}));
vi.mock("../services/draftUpdate.js",()=>({updateDraft:mocks.updateDraft}));
vi.mock("../repositories/ApprovalRepository.js",()=>({approvalRepository:{findPendingByDraft:mocks.findPendingByDraft,update:mocks.approvalUpdate}}));
import {draftRepository} from "../repositories/DraftRepository.js";
import {updateDraft as updateDraftService} from "../services/draftUpdate.js";
import {submitDraft} from "../services/draftWorkflow.js";
const repository=vi.mocked(draftRepository);
const reEvaluate=vi.mocked(updateDraftService);
const userId=new Types.ObjectId();
const draftId=new Types.ObjectId();
const rejectedDraft={_id:draftId,userId,status:"rejected",reply:"Updated reply",automaticSendInProgress:false,automaticSendRecoveryRequired:false};

describe("submitDraft re-evaluation workflow",()=>{
  beforeEach(()=>{
    vi.clearAllMocks();
    repository.findById.mockResolvedValue(rejectedDraft as never);
    reEvaluate.mockResolvedValue({...rejectedDraft,status:"pending"} as never);
    mocks.findPendingByDraft.mockResolvedValue(null);
  });
  it("re-evaluates the current reply instead of clearing blocked metadata",async()=>{
    await submitDraft(draftId.toString(),userId.toString());
    expect(reEvaluate).toHaveBeenCalledWith(draftId.toString(),{reply:"Updated reply"});
  });
  it("re-evaluates escalated drafts and preserves human review",async()=>{
    repository.findById.mockResolvedValue({...rejectedDraft,status:"escalated"} as never);
    reEvaluate.mockResolvedValue({...rejectedDraft,status:"pending"} as never);
    await submitDraft(draftId.toString(),userId.toString());
    expect(reEvaluate).toHaveBeenCalledWith(draftId.toString(),{reply:"Updated reply"});
  });
  it("keeps a draft blocked when re-evaluation still rejects it",async()=>{
    reEvaluate.mockResolvedValue({...rejectedDraft,status:"rejected",automaticActionReasons:["Unsupported claim."]} as never);
    await expect(submitDraft(draftId.toString(),userId.toString())).rejects.toThrow("This draft remains blocked after re-evaluation: Unsupported claim.");
    expect(reEvaluate).toHaveBeenCalledOnce();
  });
  it("does not submit drafts outside the rejected state",async()=>{
    repository.findById.mockResolvedValue({...rejectedDraft,status:"pending"} as never);
    await expect(submitDraft(draftId.toString(),userId.toString())).rejects.toThrow("Only rejected or escalated drafts can be resubmitted.");
    expect(reEvaluate).not.toHaveBeenCalled();
  });
  it("preserves ownership and send-recovery safeguards",async()=>{
    repository.findById.mockResolvedValue({...rejectedDraft,userId:new Types.ObjectId()} as never);
    await expect(submitDraft(draftId.toString(),userId.toString())).rejects.toThrow("not authorized");
    repository.findById.mockResolvedValue({...rejectedDraft,automaticSendRecoveryRequired:true} as never);
    await expect(submitDraft(draftId.toString(),userId.toString())).rejects.toThrow("recovery verification");
    expect(reEvaluate).not.toHaveBeenCalled();
  });
});
