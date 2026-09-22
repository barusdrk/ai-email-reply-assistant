import {beforeEach,describe,expect,it,vi} from "vitest";
import {Types} from "mongoose";
import EmailModel from "../models/Email.js";
import DraftModel from "../models/Draft.js";
import ApprovalModel from "../models/Approval.js";
import {getDashboardStats} from "../services/dashboard.js";

vi.mock("../models/Email.js",()=>({
  default:{
    aggregate:vi.fn(),
  },
}));

vi.mock("../models/Draft.js",()=>({
  default:{
    countDocuments:vi.fn(),
    aggregate:vi.fn(),
  },
}));

vi.mock("../models/Approval.js",()=>({
  default:{
    countDocuments:vi.fn(),
    aggregate:vi.fn(),
  },
}));

const userId=new Types.ObjectId().toString();

function mockAggregate(model:any,implementation:(pipeline:any[])=>Promise<any[]>){
  model.aggregate.mockImplementation(implementation);
}

function mockCountDocuments(model:any,implementation:(filter:any)=>Promise<number>){
  model.countDocuments.mockImplementation(implementation);
}

function getDateDaysAgo(days:number):string{
  const date=new Date();
  date.setHours(0,0,0,0);
  date.setDate(date.getDate()-days);
  return date.toISOString().slice(0,10);
}

function setupDefaultMocks(){
  mockAggregate(EmailModel,async(pipeline:any[])=>{
    if(pipeline.some((stage:any)=>stage.$count)){
      return [{total:10}];
    }
    return [];
  });

  mockCountDocuments(DraftModel,async()=>0);

  mockAggregate(DraftModel,async()=>[]);

  mockCountDocuments(ApprovalModel,async()=>0);

  (ApprovalModel.aggregate as any).mockResolvedValue([]);
}

describe("dashboard",()=>{
  beforeEach(()=>{
    vi.clearAllMocks();
    setupDefaultMocks();
  });

  it("returns complete dashboard statistics",async()=>{
    const date1=getDateDaysAgo(2);
    const date2=getDateDaysAgo(1);
    const date3=getDateDaysAgo(0);

    mockCountDocuments(DraftModel,async(filter:any)=>{
      if(
        filter.status==="sent"&&
        filter.automaticAction==="auto_approve"
      ){
        return 5;
      }

      if(filter.automaticAction==="escalate"){
        return 2;
      }

      if(filter.automaticAction==="blocked"){
        return 1;
      }

      if(filter.status==="pending"){
        return 3;
      }

      return 11;
    });

    mockAggregate(DraftModel,async(pipeline:any[])=>{
      if(pipeline.some((stage:any)=>stage.$lookup)){
        return [{_id:null,average:18.437}];
      }

      return [{_id:null,average:87.456}];
    });

    (ApprovalModel.countDocuments as any).mockResolvedValue(3);

    (ApprovalModel.aggregate as any).mockResolvedValue([
      {_id:"approved",count:3},
      {_id:"rejected",count:1},
    ]);

    mockAggregate(EmailModel,async(pipeline:any[])=>{
      if(pipeline.some((stage:any)=>stage.$count)){
        return [{total:10}];
      }

      if(pipeline.some((stage:any)=>stage.$group)){
        const groupStage:any=pipeline.find(
          (stage:any)=>stage.$group
        );

        if(groupStage?.$group?._id?.$dateToString){
          return [
            {_id:date1,count:2},
            {_id:date2,count:3},
            {_id:date3,count:5},
          ];
        }

        if(groupStage?.$group?._id?.$ifNull){
          return [
            {_id:"billing",count:4},
            {_id:"technical",count:3},
            {_id:"account",count:2},
          ];
        }
      }

      return [];
    });

    const stats=await getDashboardStats(userId);

    expect(stats.totalConversations).toBe(10);
    expect(stats.aiGeneratedReplies).toBe(11);
    expect(stats.automaticallyHandled).toBe(5);
    expect(stats.humanApprovals).toBe(3);
    expect(stats.escalations).toBe(2);
    expect(stats.blockedResponses).toBe(1);
    expect(stats.averageResponseTimeMinutes).toBe(18.4);
    expect(stats.aiConfidence).toBe(87.5);
    expect(stats.approvalRate).toBe(75);
    expect(stats.automationRate).toBe(50);
    expect(stats.supportVolume).toHaveLength(7);
    expect(
      stats.supportVolume.find(item=>item.date===date1)?.count
    ).toBe(2);
    expect(
      stats.supportVolume.find(item=>item.date===date2)?.count
    ).toBe(3);
    expect(
      stats.supportVolume.find(item=>item.date===date3)?.count
    ).toBe(5);
    expect(stats.topSupportCategories).toEqual([
      {category:"billing",count:4},
      {category:"technical",count:3},
      {category:"account",count:2},
    ]);
  });

  it("rejects an invalid user ID",async()=>{
    await expect(
      getDashboardStats("invalid-user-id")
    ).rejects.toThrow("Invalid user ID.");

    expect(EmailModel.aggregate).not.toHaveBeenCalled();
    expect(DraftModel.countDocuments).not.toHaveBeenCalled();
    expect(DraftModel.aggregate).not.toHaveBeenCalled();
    expect(ApprovalModel.countDocuments).not.toHaveBeenCalled();
    expect(ApprovalModel.aggregate).not.toHaveBeenCalled();
  });

  it("returns zero metrics when there is no dashboard data",async()=>{
    mockAggregate(EmailModel,async(pipeline:any[])=>{
      if(pipeline.some((stage:any)=>stage.$count)){
        return [];
      }

      return [];
    });

    mockCountDocuments(DraftModel,async()=>0);
    mockAggregate(DraftModel,async()=>[]);
    mockCountDocuments(ApprovalModel,async()=>0);
    (ApprovalModel.aggregate as any).mockResolvedValue([]);

    const stats=await getDashboardStats(userId);

    expect(stats.totalConversations).toBe(0);
    expect(stats.aiGeneratedReplies).toBe(0);
    expect(stats.automaticallyHandled).toBe(0);
    expect(stats.humanApprovals).toBe(0);
    expect(stats.escalations).toBe(0);
    expect(stats.blockedResponses).toBe(0);
    expect(stats.averageResponseTimeMinutes).toBe(0);
    expect(stats.aiConfidence).toBe(0);
    expect(stats.approvalRate).toBe(0);
    expect(stats.automationRate).toBe(0);
    expect(stats.supportVolume).toHaveLength(7);
    expect(
      stats.supportVolume.every(item=>item.count===0)
    ).toBe(true);
    expect(stats.topSupportCategories).toEqual([]);
  });

  it("calculates approval rate using reviewed approvals only",async()=>{
    mockAggregate(EmailModel,async(pipeline:any[])=>{
      if(pipeline.some((stage:any)=>stage.$count)){
        return [{total:20}];
      }

      return [];
    });

    mockCountDocuments(DraftModel,async()=>10);
    mockAggregate(DraftModel,async()=>[]);

    (ApprovalModel.countDocuments as any).mockResolvedValue(7);

    (ApprovalModel.aggregate as any).mockResolvedValue([
      {_id:"approved",count:7},
      {_id:"rejected",count:3},
    ]);

    const stats=await getDashboardStats(userId);

    expect(stats.approvalRate).toBe(70);
  });

  it("calculates automation rate from automatically handled conversations",async()=>{
    mockAggregate(EmailModel,async(pipeline:any[])=>{
      if(pipeline.some((stage:any)=>stage.$count)){
        return [{total:40}];
      }

      return [];
    });

    mockCountDocuments(DraftModel,async(filter:any)=>{
      if(
        filter.status==="sent"&&
        filter.automaticAction==="auto_approve"
      ){
        return 13;
      }

      return 0;
    });

    const stats=await getDashboardStats(userId);

    expect(stats.automationRate).toBe(32.5);
  });

  it("rounds confidence and response time to one decimal place",async()=>{
    mockAggregate(EmailModel,async(pipeline:any[])=>{
      if(pipeline.some((stage:any)=>stage.$count)){
        return [{total:10}];
      }

      return [];
    });

    mockAggregate(DraftModel,async(pipeline:any[])=>{
      if(pipeline.some((stage:any)=>stage.$lookup)){
        return [{_id:null,average:14.264}];
      }

      return [{_id:null,average:91.678}];
    });

    const stats=await getDashboardStats(userId);

    expect(stats.aiConfidence).toBe(91.7);
    expect(stats.averageResponseTimeMinutes).toBe(14.3);
  });

  it("fills missing support-volume days with zero counts",async()=>{
    const date=getDateDaysAgo(0);

    mockAggregate(EmailModel,async(pipeline:any[])=>{
      if(pipeline.some((stage:any)=>stage.$count)){
        return [{total:3}];
      }

      if(pipeline.some((stage:any)=>stage.$group)){
        const groupStage:any=pipeline.find(
          (stage:any)=>stage.$group
        );

        if(groupStage?.$group?._id?.$dateToString){
          return [{_id:date,count:3}];
        }
      }

      return [];
    });

    const stats=await getDashboardStats(userId);

    expect(stats.supportVolume).toHaveLength(7);
    expect(
      stats.supportVolume.filter(item=>item.count===0)
    ).toHaveLength(6);
    expect(
      stats.supportVolume.find(item=>item.date===date)?.count
    ).toBe(3);
  });

  it("returns support categories in the aggregation order",async()=>{
    mockAggregate(EmailModel,async(pipeline:any[])=>{
      if(pipeline.some((stage:any)=>stage.$count)){
        return [{total:3}];
      }

      if(pipeline.some((stage:any)=>stage.$group)){
        const groupStage:any=pipeline.find(
          (stage:any)=>stage.$group
        );

        if(groupStage?.$group?._id?.$ifNull){
          return [
            {_id:"billing",count:2},
            {_id:"technical",count:1},
          ];
        }
      }

      return [];
    });

    const stats=await getDashboardStats(userId);

    expect(stats.topSupportCategories).toEqual([
      {category:"billing",count:2},
      {category:"technical",count:1},
    ]);
  });

  it("uses distinct conversation threads for total conversations",async()=>{
    mockAggregate(EmailModel,async(pipeline:any[])=>{
      if(pipeline.some((stage:any)=>stage.$count)){
        return [{total:7}];
      }

      return [];
    });

    await getDashboardStats(userId);

    const aggregateCalls=(
      EmailModel.aggregate as any
    ).mock.calls;

    const conversationPipeline=aggregateCalls.find(
      (call:any[])=>call[0]?.some(
        (stage:any)=>stage.$count
      )
    )?.[0];

    expect(conversationPipeline).toBeDefined();

    expect(conversationPipeline?.[0]).toEqual({
      $match:{
        userId:new Types.ObjectId(userId),
      },
    });

    expect(
      conversationPipeline?.some(
        (stage:any)=>stage.$group
      )
    ).toBe(true);

    expect(
      conversationPipeline?.some(
        (stage:any)=>stage.$count
      )
    ).toBe(true);

    const groupStage:any=conversationPipeline?.find(
      (stage:any)=>stage.$group
    );

    expect(
      groupStage?.$group?._id?.$cond
    ).toBeDefined();
  });

  it("uses sent drafts and received emails to calculate response time",async()=>{
    mockAggregate(EmailModel,async(pipeline:any[])=>{
      if(pipeline.some((stage:any)=>stage.$count)){
        return [{total:5}];
      }

      return [];
    });

    mockAggregate(DraftModel,async(pipeline:any[])=>{
      if(pipeline.some((stage:any)=>stage.$lookup)){
        return [{_id:null,average:12.5}];
      }

      return [];
    });

    await getDashboardStats(userId);

    const aggregateCalls=(
      DraftModel.aggregate as any
    ).mock.calls;

    const responseTimePipeline=aggregateCalls.find(
      (call:any[])=>call[0]?.some(
        (stage:any)=>stage.$lookup
      )
    )?.[0];

    expect(responseTimePipeline).toBeDefined();

    expect(responseTimePipeline?.[0]).toEqual({
      $match:{
        userId:new Types.ObjectId(userId),
        status:"sent",
        sentAt:{
          $ne:null,
        },
      },
    });

    expect(
      responseTimePipeline?.some(
        (stage:any)=>stage.$lookup
      )
    ).toBe(true);

    expect(
      responseTimePipeline?.some(
        (stage:any)=>stage.$project
      )
    ).toBe(true);
  });

  it("counts only approved automatic drafts as automatically handled",async()=>{
    mockAggregate(EmailModel,async(pipeline:any[])=>{
      if(pipeline.some((stage:any)=>stage.$count)){
        return [{total:10}];
      }

      return [];
    });

    mockCountDocuments(DraftModel,async(filter:any)=>{
      if(
        filter.status==="sent"&&
        filter.automaticAction==="auto_approve"
      ){
        return 8;
      }

      return 0;
    });

    await getDashboardStats(userId);

    const calls=(
      DraftModel.countDocuments as any
    ).mock.calls;

    expect(calls).toContainEqual([
      {
        userId:new Types.ObjectId(userId),
        status:"sent",
        automaticAction:"auto_approve",
      },
    ]);
  });

  it("counts escalated drafts separately from blocked drafts",async()=>{
    mockAggregate(EmailModel,async(pipeline:any[])=>{
      if(pipeline.some((stage:any)=>stage.$count)){
        return [{total:10}];
      }

      return [];
    });

    mockCountDocuments(DraftModel,async(filter:any)=>{
      if(filter.automaticAction==="escalate"){
        return 3;
      }

      if(filter.automaticAction==="blocked"){
        return 2;
      }

      return 0;
    });

    await getDashboardStats(userId);

    const calls=(
      DraftModel.countDocuments as any
    ).mock.calls;

    expect(calls).toContainEqual([
      {
        userId:new Types.ObjectId(userId),
        automaticAction:"escalate",
      },
    ]);

    expect(calls).toContainEqual([
      {
        userId:new Types.ObjectId(userId),
        automaticAction:"blocked",
      },
    ]);
  });
});
