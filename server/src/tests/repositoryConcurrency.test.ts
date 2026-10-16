
import mongoose,{Types} from "mongoose";
import {MongoMemoryServer} from "mongodb-memory-server";
import {beforeAll,afterAll,afterEach,describe,expect,it} from "vitest";
import EmailModel from "../models/Email.js";
import DraftModel from "../models/Draft.js";
import {emailRepository} from "../repositories/EmailRepository.js";
import {draftRepository} from "../repositories/DraftRepository.js";

describe("MongoDB repository concurrency",()=>{
  let mongo:MongoMemoryServer;
  const userId=new Types.ObjectId();
  let emailId:Types.ObjectId;

  beforeAll(async()=>{
    mongo=await MongoMemoryServer.create();
    await mongoose.connect(mongo.getUri());
    await Promise.all([EmailModel.init(),DraftModel.init()]);
  },30_000);

  afterEach(async()=>{
    await Promise.all([
      EmailModel.deleteMany({userId}),
      DraftModel.deleteMany({userId}),
    ]);
  });

  afterAll(async()=>{
    await mongoose.disconnect();
    await mongo.stop();
  },30_000);

  it("allows only one concurrent automatic draft-generation claim",async()=>{
    const email=await EmailModel.create({
      userId,
      provider:"gmail",
      direction:"inbound",
      messageId:`concurrent-claim-${new Types.ObjectId()}`,
      subject:"Refund question",
      body:"Can I get a refund?",
      senderEmail:"customer@example.com",
      automaticDraftGenerated:false,
      automaticDraftGenerationInProgress:false,
    });
    emailId=email._id;

    const claims=await Promise.all([
      emailRepository.claimAutomaticDraftGeneration(emailId.toString()),
      emailRepository.claimAutomaticDraftGeneration(emailId.toString()),
    ]);

    expect(claims.filter(Boolean)).toHaveLength(1);

    const storedEmail=await EmailModel.findById(emailId).lean();
    expect(storedEmail?.automaticDraftGenerationInProgress).toBe(true);
    expect(storedEmail?.automaticDraftGenerated).toBe(false);
  });

  it("stores only one draft when two requests create it concurrently",async()=>{
    const email=await EmailModel.create({
      userId,
      provider:"gmail",
      direction:"inbound",
      messageId:`concurrent-draft-${new Types.ObjectId()}`,
      subject:"Refund question",
      body:"Can I get a refund?",
      senderEmail:"customer@example.com",
    });
    emailId=email._id;

    const draftData={
      userId,
      emailId,
      provider:"gmail" as const,
      subject:"Re: Refund question",
      customer:"customer@example.com",
      reply:"Thanks for reaching out. We will review your request.",
      status:"pending" as const,
      automaticAction:"pending" as const,
    };

    const results=await Promise.all([
      draftRepository.createIfNotExists(draftData),
      draftRepository.createIfNotExists(draftData),
    ]);

    expect(results.filter(result=>result.created)).toHaveLength(1);
    expect(results.filter(result=>!result.created)).toHaveLength(1);
    expect(String(results[0].draft._id)).toBe(String(results[1].draft._id));
    expect(await DraftModel.countDocuments({userId,emailId})).toBe(1);
  });

  
  it("prevents a stale worker from completing or releasing a reclaimed claim",async()=>{
    const email=await EmailModel.create({
      userId,
      provider:"gmail",
      direction:"inbound",
      messageId:`stale-claim-${new Types.ObjectId()}`,
      subject:"Refund question",
      body:"Can I get a refund?",
      senderEmail:"customer@example.com",
      automaticDraftGenerated:false,
      automaticDraftGenerationInProgress:true,
      automaticDraftGenerationStartedAt:new Date(Date.now()-60_000),
      automaticDraftGenerationClaimToken:"old-worker-token",
    });

    const reclaimed=await emailRepository.claimAutomaticDraftGeneration(
      email._id.toString(),
      1_000,
    );

    expect(reclaimed).not.toBeNull();
    expect(reclaimed?.automaticDraftGenerationClaimToken).toBeTruthy();
    expect(reclaimed?.automaticDraftGenerationClaimToken).not.toBe("old-worker-token");

    const staleCompletion=await emailRepository.markAutomaticDraftGenerated(
      email._id.toString(),
      new Types.ObjectId(),
      "old-worker-token",
    );
    const staleRelease=await emailRepository.releaseAutomaticDraftGeneration(
      email._id.toString(),
      "old-worker-token",
    );

    expect(staleCompletion).toBeNull();
    expect(staleRelease).toBeNull();

    const stored=await EmailModel.findById(email._id).lean();
    expect(stored?.automaticDraftGenerated).toBe(false);
    expect(stored?.automaticDraftGenerationInProgress).toBe(true);
    expect(stored?.automaticDraftGenerationClaimToken).toBe(
      reclaimed?.automaticDraftGenerationClaimToken,
    );
  });
});
