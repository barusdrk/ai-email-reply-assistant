import {beforeEach,describe,expect,it,vi} from "vitest";
import {Types} from "mongoose";

const mocks=vi.hoisted(()=>({
  findById:vi.fn(),
  update:vi.fn(),
  requestApproval:vi.fn(),
}));

vi.mock("../repositories/DraftRepository.js",()=>({
  draftRepository:{
    findById:mocks.findById,
    update:mocks.update,
  },
}));

vi.mock("../services/draftApproval.js",()=>({
  requestApproval:mocks.requestApproval,
}));

import {draftRepository} from "../repositories/DraftRepository.js";
import {requestApproval} from "../services/draftApproval.js";
import {submitDraft} from "../services/draftWorkflow.js";

const draftRepositoryMock=vi.mocked(draftRepository);
const requestApprovalMock=vi.mocked(requestApproval);
const userId=new Types.ObjectId();
const draftId=new Types.ObjectId();

function createDraft(overrides:Record<string,unknown>={}){
  return{
    _id:draftId,
    userId,
    status:"pending",
    automaticAction:"pending",
    automaticSendInProgress:false,
    automaticSendRecoveryRequired:false,
    supportDecision:"reply",
    supportPolicyIssues:[],
    ...overrides,
  };
}

describe("submitDraft automation safety",()=>{
  beforeEach(()=>{
    vi.clearAllMocks();
    draftRepositoryMock.findById.mockResolvedValue(createDraft() as never);
    draftRepositoryMock.update.mockResolvedValue({
      ...createDraft(),
      _id:{toString:()=>draftId.toString()},
    } as never);
    requestApprovalMock.mockResolvedValue({} as never);
  });

  it("does not allow blocked drafts to bypass policy checks through resubmission",async()=>{
    draftRepositoryMock.findById.mockResolvedValue(createDraft({
      status:"rejected",
      automaticAction:"blocked",
    }) as never);

    await expect(submitDraft(draftId.toString(),userId.toString())).rejects.toThrow(
      "Blocked drafts must be edited and re-evaluated before they can be submitted.",
    );

    expect(draftRepositoryMock.update).not.toHaveBeenCalled();
    expect(requestApprovalMock).not.toHaveBeenCalled();
  });

  it("does not resubmit drafts with rejected support decisions",async()=>{
    draftRepositoryMock.findById.mockResolvedValue(createDraft({
      supportDecision:"reject",
    }) as never);

    await expect(submitDraft(draftId.toString(),userId.toString())).rejects.toThrow(
      "Blocked drafts must be edited and re-evaluated before they can be submitted.",
    );

    expect(draftRepositoryMock.update).not.toHaveBeenCalled();
    expect(requestApprovalMock).not.toHaveBeenCalled();
  });

  it("does not resubmit drafts with unresolved policy issues",async()=>{
    draftRepositoryMock.findById.mockResolvedValue(createDraft({
      supportPolicyIssues:["The reply contains an unsupported policy claim."],
    }) as never);

    await expect(submitDraft(draftId.toString(),userId.toString())).rejects.toThrow(
      "Blocked drafts must be edited and re-evaluated before they can be submitted.",
    );

    expect(draftRepositoryMock.update).not.toHaveBeenCalled();
    expect(requestApprovalMock).not.toHaveBeenCalled();
  });

  it("does not resubmit drafts while a send is in progress or recovery is required",async()=>{
    for(const overrides of [
      {automaticSendInProgress:true},
      {automaticSendRecoveryRequired:true},
    ]){
      draftRepositoryMock.findById.mockResolvedValue(createDraft(overrides) as never);

      await expect(submitDraft(draftId.toString(),userId.toString())).rejects.toThrow();

      expect(draftRepositoryMock.update).not.toHaveBeenCalled();
      expect(requestApprovalMock).not.toHaveBeenCalled();
    }
  });

  it("allows eligible drafts to enter the human approval workflow",async()=>{
    await submitDraft(draftId.toString(),userId.toString());

    expect(draftRepositoryMock.update).toHaveBeenCalledWith(draftId.toString(),expect.objectContaining({
      status:"pending",
      automaticAction:"pending",
    }));
    expect(requestApprovalMock).toHaveBeenCalledWith(draftId.toString(),userId.toString());
  });
});
