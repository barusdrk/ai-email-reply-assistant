
import {beforeEach,describe,expect,it,vi} from "vitest";
import {Types} from "mongoose";

const mocks=vi.hoisted(()=>({
  emails:[] as any[],
  listGmailEmails:vi.fn(),
  findAll:vi.fn(),
  findByMessageId:vi.fn(),
  bulkUpsert:vi.fn(),
  emailUpdate:vi.fn(),
  claimAutomaticDraftGeneration:vi.fn(),
  releaseAutomaticDraftGeneration:vi.fn(),
  markAutomaticDraftGenerated:vi.fn(),
  findCustomer:vi.fn(),
  findAccount:vi.fn(),
  accountUpdate:vi.fn(),
  findDraftByEmailId:vi.fn(),
  createDraft:vi.fn(),
}));

vi.mock("../repositories/EmailRepository.js",()=>({
  emailRepository:{
    findAll:mocks.findAll,
    findByMessageId:mocks.findByMessageId,
    bulkUpsert:mocks.bulkUpsert,
    update:mocks.emailUpdate,
    claimAutomaticDraftGeneration:mocks.claimAutomaticDraftGeneration,
    releaseAutomaticDraftGeneration:mocks.releaseAutomaticDraftGeneration,
    markAutomaticDraftGenerated:mocks.markAutomaticDraftGenerated,
  },
}));

vi.mock("../repositories/CustomerRepository.js",()=>({
  customerRepository:{
    findOrCreate:mocks.findCustomer,
  },
}));

vi.mock("../repositories/ConnectedAccountRepository.js",()=>({
  connectedAccountRepository:{
    findByProvider:mocks.findAccount,
    update:mocks.accountUpdate,
  },
}));

vi.mock("../repositories/DraftRepository.js",()=>({
  draftRepository:{
    findByEmailId:mocks.findDraftByEmailId,
  },
}));

vi.mock("../services/gmail.js",()=>({
  listEmails:mocks.listGmailEmails,
  listSentEmails:vi.fn().mockResolvedValue([]),
}));

vi.mock("../services/outlook.js",()=>({
  listEmails:vi.fn().mockResolvedValue([]),
  listSentEmails:vi.fn().mockResolvedValue([]),
}));

vi.mock("../services/drafts.js",()=>({
  createDraft:mocks.createDraft,
}));

import {syncGmail} from "../services/emailSync.js";

describe("email sync duplicate prevention",()=>{
  const userId=new Types.ObjectId().toString();
  const accountId=new Types.ObjectId().toString();
  const customerId=new Types.ObjectId();

  const providerEmail={
    id:"gmail-message-duplicate-test",
    messageIdHeader:"<duplicate-test@example.com>",
    references:[],
    threadId:"gmail-thread-duplicate-test",
    subject:"Question about your refund policy",
    from:"Customer <customer@example.com>",
    senderName:"Customer",
    senderEmail:"customer@example.com",
    preview:"I have a question about a refund.",
    body:"Can you explain your refund policy?",
    unread:true,
    archived:false,
    receivedAt:new Date("2026-10-15T10:00:00.000Z"),
  };

  beforeEach(()=>{
    vi.clearAllMocks();
    mocks.emails.splice(0,mocks.emails.length);
    mocks.listGmailEmails.mockResolvedValue([providerEmail]);
    mocks.findAll.mockImplementation(async()=>[...mocks.emails]);
    mocks.findByMessageId.mockImplementation(async(requestedUserId:string,provider:string,messageId:string)=>mocks.emails.find(email=>
      email.userId.toString()===requestedUserId&&email.provider===provider&&email.messageId===messageId,
    )??null);
    mocks.bulkUpsert.mockImplementation(async(incoming:any[])=>{
      for(const email of incoming){
        const index=mocks.emails.findIndex(existing=>
          existing.userId.toString()===email.userId.toString()&&
          existing.provider===email.provider&&
          existing.messageId===email.messageId,
        );
        if(index===-1){
          mocks.emails.push({
            ...email,
            _id:new Types.ObjectId(),
            customerId:null,
            automaticDraftGenerated:false,
            automaticDraftGenerationInProgress:false,
          });
        }else{
          mocks.emails[index]={...mocks.emails[index],...email};
        }
      }
    });
    mocks.claimAutomaticDraftGeneration.mockImplementation(async(emailId:string)=>{
      const email=mocks.emails.find(item=>item._id.toString()===emailId);
      if(!email||email.automaticDraftGenerated||email.automaticDraftGenerationInProgress)return null;
      email.automaticDraftGenerationInProgress=true;
      email.automaticDraftGenerationClaimToken="test-claim-token";
      return {...email};
    });
    mocks.releaseAutomaticDraftGeneration.mockImplementation(async(emailId:string,claimToken:string)=>{
      const email=mocks.emails.find(item=>item._id.toString()===emailId);
      if(!email||email.automaticDraftGenerationClaimToken!==claimToken)return null;
      email.automaticDraftGenerationInProgress=false;
      email.automaticDraftGenerationClaimToken=null;
      return {...email};
    });
    mocks.markAutomaticDraftGenerated.mockImplementation(async(emailId:string,draftId:Types.ObjectId,claimToken:string)=>{
      const email=mocks.emails.find(item=>item._id.toString()===emailId);
      if(!email||email.automaticDraftGenerationClaimToken!==claimToken)return null;
      email.draftId=draftId;
      email.automaticDraftGenerated=true;
      email.automaticDraftGenerationInProgress=false;
      email.automaticDraftGenerationClaimToken=null;
      return {...email};
    });
    mocks.findAccount.mockResolvedValue({
      _id:new Types.ObjectId(accountId),
      userId:new Types.ObjectId(userId),
      provider:"gmail",
      email:"support@example.com",
      connected:true,
    });
    mocks.accountUpdate.mockResolvedValue({});
    mocks.emailUpdate.mockResolvedValue({});
    mocks.findCustomer.mockResolvedValue({
      _id:customerId,
      name:"Customer",
      email:"customer@example.com",
    });
    mocks.findDraftByEmailId.mockResolvedValue(null);
    mocks.createDraft.mockResolvedValue({
      _id:new Types.ObjectId(),
      status:"pending",
    });
  });

  it("does not create duplicate drafts when the same email is synced twice",async()=>{
    const firstSync=await syncGmail(userId);
    const secondSync=await syncGmail(userId);

    expect(firstSync.created).toBe(1);
    expect(secondSync.created).toBe(0);
    expect(secondSync.updated).toBe(1);
    expect(mocks.bulkUpsert).toHaveBeenCalledTimes(2);
    expect(mocks.emails).toHaveLength(1);
    expect(mocks.emails[0].messageId).toBe(providerEmail.id);
    expect(mocks.claimAutomaticDraftGeneration).toHaveBeenCalledTimes(2);
    expect(mocks.createDraft).toHaveBeenCalledTimes(1);
    expect(mocks.releaseAutomaticDraftGeneration).not.toHaveBeenCalled();
    expect(mocks.createDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        userId,
        emailId:mocks.emails[0]._id.toString(),
        provider:"gmail",
        subject:providerEmail.subject,
        customer:"customer@example.com",
        email:providerEmail.body,
        automaticDraftGenerationClaimToken:"test-claim-token",
      }),
      {returnCreationResult:true},
    );
  });
});
