import {beforeEach,describe,expect,it,vi} from "vitest";
import {Types} from "mongoose";

vi.mock("../repositories/DraftRepository.js",()=>({
  draftRepository:{
    findById:vi.fn(),
    update:vi.fn(),
    claimForAutomaticSend:vi.fn(),
  },
}));

vi.mock("../repositories/EmailRepository.js",()=>({
  emailRepository:{
    findById:vi.fn(),
    update:vi.fn(),
  },
}));

vi.mock("../services/gmail.js",()=>({
  sendEmail:vi.fn(),
}));

vi.mock("../services/outlook.js",()=>({
  sendEmail:vi.fn(),
}));

vi.mock("../services/notification.js",()=>({
  notify:vi.fn(),
}));

import {draftRepository} from "../repositories/DraftRepository.js";
import {emailRepository} from "../repositories/EmailRepository.js";
import {sendEmail as sendGmailEmail} from "../services/gmail.js";
import {sendEmail as sendOutlookEmail} from "../services/outlook.js";
import {notify} from "../services/notification.js";
import {sendAutomatically} from "../services/automaticSend.js";

const userId=new Types.ObjectId().toString();
const draftId=new Types.ObjectId();
const emailId=new Types.ObjectId();

const baseDraft={
  _id:draftId,
  userId:new Types.ObjectId(userId),
  emailId,
  provider:"gmail",
  subject:"Question about my account",
  customer:"customer@example.com",
  reply:"Thanks for contacting us. We will be happy to help.",
  tone:"professional",
  length:"medium",
  status:"approved",
  automaticAction:"auto_approve",
  automaticActionReasons:["High AI confidence: 92/100."],
  automaticSendInProgress:false,
};

const baseEmail={
  _id:emailId,
  userId:new Types.ObjectId(userId),
  provider:"gmail",
  messageId:"gmail-message-123",
  messageIdHeader:"<original-message@example.com>",
  references:["<previous-message@example.com>"],
  threadId:"gmail-thread-123",
  subject:"Question about my account",
  from:"Customer <customer@example.com>",
  senderName:"Customer",
  senderEmail:"customer@example.com",
  preview:"I have a question about my account.",
  body:"I have a question about my account.",
  unread:true,
  archived:false,
};

let claimedDraft:any=baseDraft;

describe("sendAutomatically",()=>{
  beforeEach(()=>{
    vi.clearAllMocks();
    claimedDraft=baseDraft;

    vi.mocked(draftRepository.findById).mockResolvedValue(baseDraft as any);
    vi.mocked(draftRepository.update).mockResolvedValue(baseDraft as any);
    vi.mocked(draftRepository.claimForAutomaticSend).mockImplementation(async()=>claimedDraft as any);

    vi.mocked(emailRepository.findById).mockResolvedValue(baseEmail as any);
    vi.mocked(emailRepository.update).mockResolvedValue(baseEmail as any);

    vi.mocked(sendGmailEmail).mockResolvedValue({
      sent:true,
      id:"gmail-message-id",
      threadId:"gmail-thread-id",
    } as any);

    vi.mocked(sendOutlookEmail).mockResolvedValue({
      sent:true,
      id:"outlook-message-id",
    } as any);

    vi.mocked(notify).mockResolvedValue({} as any);
  });

  it("sends an approved Gmail reply automatically",async()=>{
    const result=await sendAutomatically(userId,draftId.toString());

    expect(result?.sent).toBe(true);
    expect(result?.provider).toBe("gmail");
    expect(result?.draftId).toBe(draftId.toString());
    expect(result?.emailId).toBe(emailId.toString());

    expect(sendGmailEmail).toHaveBeenCalledWith(
      userId,
      {
        to:"customer@example.com",
        subject:"Question about my account",
        reply:"Thanks for contacting us. We will be happy to help.",
        threadId:"gmail-thread-123",
        inReplyTo:"<original-message@example.com>",
        references:["<previous-message@example.com>"],
      },
    );

    expect(sendOutlookEmail).not.toHaveBeenCalled();
    expect(draftRepository.claimForAutomaticSend).toHaveBeenCalledWith(
      draftId.toString(),
      userId,
    );
    expect(draftRepository.update).toHaveBeenCalledWith(
      draftId.toString(),
      expect.objectContaining({
        status:"sent",
        sentAt:expect.any(Date),
        automaticSendInProgress:false,
      }),
    );
    expect(emailRepository.update).toHaveBeenCalledWith(
      emailId.toString(),
      {
        draftId,
      },
    );
    expect(notify).toHaveBeenCalledWith(
      userId,
      "sent",
      "Reply sent",
      expect.stringContaining("customer@example.com"),
      draftId.toString(),
    );
  });

  it("sends an approved Outlook reply automatically",async()=>{
    const outlookDraft={
      ...baseDraft,
      provider:"outlook",
    };

    vi.mocked(draftRepository.findById).mockResolvedValue(outlookDraft as any);
    claimedDraft=outlookDraft;

    vi.mocked(emailRepository.findById).mockResolvedValue({
      ...baseEmail,
      provider:"outlook",
      messageId:"outlook-message-456",
      threadId:"outlook-conversation-456",
    } as any);

    const result=await sendAutomatically(userId,draftId.toString());

    expect(result?.sent).toBe(true);
    expect(result?.provider).toBe("outlook");

    expect(sendOutlookEmail).toHaveBeenCalledWith(
      userId,
      {
        to:"customer@example.com",
        subject:"Question about my account",
        reply:"Thanks for contacting us. We will be happy to help.",
        threadId:"outlook-conversation-456",
        originalMessageId:"outlook-message-456",
      },
    );

    expect(sendGmailEmail).not.toHaveBeenCalled();
  });

  it("uses the draft customer when the email sender address is unavailable",async()=>{
    const draftWithCustomer={
      ...baseDraft,
      customer:"customer@example.com",
    };

    vi.mocked(draftRepository.findById).mockResolvedValue(draftWithCustomer as any);
    claimedDraft=draftWithCustomer;

    vi.mocked(emailRepository.findById).mockResolvedValue({
      ...baseEmail,
      senderEmail:"",
    } as any);

    const result=await sendAutomatically(userId,draftId.toString());

    expect(result?.sent).toBe(true);
    expect(sendGmailEmail).toHaveBeenCalledWith(
      userId,
      expect.objectContaining({
        to:"customer@example.com",
      }),
    );
    expect(sendOutlookEmail).not.toHaveBeenCalled();
  });

  it("does not send a pending draft",async()=>{
    const pendingDraft={
      ...baseDraft,
      status:"pending",
      automaticAction:"pending",
    };

    vi.mocked(draftRepository.findById).mockResolvedValue(pendingDraft as any);

    await expect(
      sendAutomatically(userId,draftId.toString()),
    ).rejects.toThrow("This draft is not approved for automatic sending.");

    expect(sendGmailEmail).not.toHaveBeenCalled();
    expect(sendOutlookEmail).not.toHaveBeenCalled();
    expect(draftRepository.claimForAutomaticSend).not.toHaveBeenCalled();
    expect(draftRepository.update).not.toHaveBeenCalled();
  });

  it("does not send an escalated draft",async()=>{
    vi.mocked(draftRepository.findById).mockResolvedValue({
      ...baseDraft,
      status:"escalated",
      automaticAction:"escalate",
    } as any);

    await expect(
      sendAutomatically(userId,draftId.toString()),
    ).rejects.toThrow("This draft is not approved for automatic sending.");

    expect(sendGmailEmail).not.toHaveBeenCalled();
    expect(sendOutlookEmail).not.toHaveBeenCalled();
    expect(draftRepository.claimForAutomaticSend).not.toHaveBeenCalled();
  });

  it("does not send a blocked draft",async()=>{
    vi.mocked(draftRepository.findById).mockResolvedValue({
      ...baseDraft,
      status:"pending",
      automaticAction:"blocked",
    } as any);

    await expect(
      sendAutomatically(userId,draftId.toString()),
    ).rejects.toThrow("This draft is not approved for automatic sending.");

    expect(sendGmailEmail).not.toHaveBeenCalled();
    expect(sendOutlookEmail).not.toHaveBeenCalled();
    expect(draftRepository.claimForAutomaticSend).not.toHaveBeenCalled();
  });

  it("does not send a rejected draft",async()=>{
    vi.mocked(draftRepository.findById).mockResolvedValue({
      ...baseDraft,
      status:"rejected",
      automaticAction:"pending",
    } as any);

    await expect(
      sendAutomatically(userId,draftId.toString()),
    ).rejects.toThrow("This draft is not approved for automatic sending.");

    expect(sendGmailEmail).not.toHaveBeenCalled();
    expect(sendOutlookEmail).not.toHaveBeenCalled();
    expect(draftRepository.claimForAutomaticSend).not.toHaveBeenCalled();
  });

  it("does not send a draft that is approved but has the wrong automatic action",async()=>{
    vi.mocked(draftRepository.findById).mockResolvedValue({
      ...baseDraft,
      status:"approved",
      automaticAction:"pending",
    } as any);

    await expect(
      sendAutomatically(userId,draftId.toString()),
    ).rejects.toThrow("This draft is not approved for automatic sending.");

    expect(sendGmailEmail).not.toHaveBeenCalled();
    expect(sendOutlookEmail).not.toHaveBeenCalled();
    expect(draftRepository.claimForAutomaticSend).not.toHaveBeenCalled();
  });

  it("does not send a draft that has already been sent",async()=>{
    vi.mocked(draftRepository.findById).mockResolvedValue({
      ...baseDraft,
      status:"sent",
    } as any);

    await expect(
      sendAutomatically(userId,draftId.toString()),
    ).rejects.toThrow("Draft has already been sent.");

    expect(sendGmailEmail).not.toHaveBeenCalled();
    expect(sendOutlookEmail).not.toHaveBeenCalled();
    expect(draftRepository.claimForAutomaticSend).not.toHaveBeenCalled();
  });

  it("rejects unauthorized draft access",async()=>{
    vi.mocked(draftRepository.findById).mockResolvedValue({
      ...baseDraft,
      userId:new Types.ObjectId(),
    } as any);

    await expect(
      sendAutomatically(userId,draftId.toString()),
    ).rejects.toThrow("Unauthorized.");

    expect(sendGmailEmail).not.toHaveBeenCalled();
    expect(sendOutlookEmail).not.toHaveBeenCalled();
    expect(draftRepository.claimForAutomaticSend).not.toHaveBeenCalled();
  });

  it("returns null when the draft does not exist",async()=>{
    vi.mocked(draftRepository.findById).mockResolvedValue(null);

    const result=await sendAutomatically(userId,draftId.toString());

    expect(result).toBeNull();
    expect(sendGmailEmail).not.toHaveBeenCalled();
    expect(sendOutlookEmail).not.toHaveBeenCalled();
    expect(draftRepository.claimForAutomaticSend).not.toHaveBeenCalled();
  });

  it("rejects an invalid user ID",async()=>{
    await expect(
      sendAutomatically("invalid-user-id",draftId.toString()),
    ).rejects.toThrow("Invalid user ID.");

    expect(draftRepository.findById).not.toHaveBeenCalled();
  });

  it("rejects an invalid draft ID",async()=>{
    await expect(
      sendAutomatically(userId,"invalid-draft-id"),
    ).rejects.toThrow("Invalid draft ID.");

    expect(draftRepository.findById).not.toHaveBeenCalled();
  });

  it("fails when the original email does not exist",async()=>{
    vi.mocked(emailRepository.findById).mockResolvedValue(null);

    await expect(
      sendAutomatically(userId,draftId.toString()),
    ).rejects.toThrow("Original email not found.");

    expect(sendGmailEmail).not.toHaveBeenCalled();
    expect(sendOutlookEmail).not.toHaveBeenCalled();
    expect(draftRepository.update).toHaveBeenCalledWith(
      draftId.toString(),
      {
        automaticSendInProgress:false,
        status:"approved",
      },
    );
  });

  it("fails when the recipient address is missing",async()=>{
    const draftWithoutCustomer={
      ...baseDraft,
      customer:"",
    };

    vi.mocked(draftRepository.findById).mockResolvedValue(draftWithoutCustomer as any);
    claimedDraft=draftWithoutCustomer;

    vi.mocked(emailRepository.findById).mockResolvedValue({
      ...baseEmail,
      senderEmail:"",
    } as any);

    await expect(
      sendAutomatically(userId,draftId.toString()),
    ).rejects.toThrow("Customer email address is required for automatic sending.");

    expect(sendGmailEmail).not.toHaveBeenCalled();
    expect(sendOutlookEmail).not.toHaveBeenCalled();
    expect(draftRepository.update).toHaveBeenCalledWith(
      draftId.toString(),
      {
        automaticSendInProgress:false,
        status:"approved",
      },
    );
  });

  it("fails when the reply is empty",async()=>{
    const draftWithEmptyReply={
      ...baseDraft,
      reply:"",
    };

    vi.mocked(draftRepository.findById).mockResolvedValue(draftWithEmptyReply as any);
    claimedDraft=draftWithEmptyReply;

    await expect(
      sendAutomatically(userId,draftId.toString()),
    ).rejects.toThrow("Draft reply is empty.");

    expect(sendGmailEmail).not.toHaveBeenCalled();
    expect(sendOutlookEmail).not.toHaveBeenCalled();
    expect(draftRepository.update).toHaveBeenCalledWith(
      draftId.toString(),
      {
        automaticSendInProgress:false,
        status:"approved",
      },
    );
  });

  it("fails when the subject is empty",async()=>{
    const draftWithEmptySubject={
      ...baseDraft,
      subject:"",
    };

    vi.mocked(draftRepository.findById).mockResolvedValue(draftWithEmptySubject as any);
    claimedDraft=draftWithEmptySubject;

    await expect(
      sendAutomatically(userId,draftId.toString()),
    ).rejects.toThrow("Draft subject is required.");

    expect(sendGmailEmail).not.toHaveBeenCalled();
    expect(sendOutlookEmail).not.toHaveBeenCalled();
    expect(draftRepository.update).toHaveBeenCalledWith(
      draftId.toString(),
      {
        automaticSendInProgress:false,
        status:"approved",
      },
    );
  });

  it("rejects unsupported providers",async()=>{
    const unsupportedDraft={
      ...baseDraft,
      provider:"unknown",
    };

    vi.mocked(draftRepository.findById).mockResolvedValue(unsupportedDraft as any);
    claimedDraft=unsupportedDraft;

    await expect(
      sendAutomatically(userId,draftId.toString()),
    ).rejects.toThrow("Unsupported email provider: unknown.");

    expect(sendGmailEmail).not.toHaveBeenCalled();
    expect(sendOutlookEmail).not.toHaveBeenCalled();
    expect(draftRepository.claimForAutomaticSend).toHaveBeenCalledWith(
      draftId.toString(),
      userId,
    );
    expect(draftRepository.update).toHaveBeenCalledWith(
      draftId.toString(),
      {
        automaticSendInProgress:false,
      },
    );
  });

  it("does not send when the automatic-send claim is lost",async()=>{
    vi.mocked(draftRepository.claimForAutomaticSend).mockResolvedValue(null);
    vi.mocked(draftRepository.findById)
      .mockResolvedValueOnce(baseDraft as any)
      .mockResolvedValueOnce({
        ...baseDraft,
        automaticSendInProgress:true,
      } as any);

    await expect(
      sendAutomatically(userId,draftId.toString()),
    ).rejects.toThrow("Draft is no longer available for automatic sending.");

    expect(sendGmailEmail).not.toHaveBeenCalled();
    expect(sendOutlookEmail).not.toHaveBeenCalled();
    expect(draftRepository.claimForAutomaticSend).toHaveBeenCalledWith(
      draftId.toString(),
      userId,
    );
  });

  it("does not send when the draft becomes sent before it can be claimed",async()=>{
    vi.mocked(draftRepository.claimForAutomaticSend).mockResolvedValue(null);
    vi.mocked(draftRepository.findById)
      .mockResolvedValueOnce(baseDraft as any)
      .mockResolvedValueOnce({
        ...baseDraft,
        status:"sent",
      } as any);

    await expect(
      sendAutomatically(userId,draftId.toString()),
    ).rejects.toThrow("Draft has already been sent.");

    expect(sendGmailEmail).not.toHaveBeenCalled();
    expect(sendOutlookEmail).not.toHaveBeenCalled();
  });

  it("does not send when Gmail sending fails",async()=>{
    vi.mocked(sendGmailEmail).mockRejectedValue(
      new Error("Gmail send failed."),
    );

    await expect(
      sendAutomatically(userId,draftId.toString()),
    ).rejects.toThrow("Gmail send failed.");

    expect(sendGmailEmail).toHaveBeenCalledTimes(1);
    expect(draftRepository.update).toHaveBeenCalledWith(
      draftId.toString(),
      {
        automaticSendInProgress:false,
        status:"approved",
      },
    );
    expect(emailRepository.update).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
  });

  it("does not send when Outlook sending fails",async()=>{
    const outlookDraft={
      ...baseDraft,
      provider:"outlook",
    };

    vi.mocked(draftRepository.findById).mockResolvedValue(outlookDraft as any);
    claimedDraft=outlookDraft;

    vi.mocked(emailRepository.findById).mockResolvedValue({
      ...baseEmail,
      provider:"outlook",
      messageId:"outlook-message-789",
    } as any);

    vi.mocked(sendOutlookEmail).mockRejectedValue(
      new Error("Outlook send failed."),
    );

    await expect(
      sendAutomatically(userId,draftId.toString()),
    ).rejects.toThrow("Outlook send failed.");

    expect(sendOutlookEmail).toHaveBeenCalledTimes(1);
    expect(draftRepository.update).toHaveBeenCalledWith(
      draftId.toString(),
      {
        automaticSendInProgress:false,
        status:"approved",
      },
    );
    expect(emailRepository.update).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
  });

  it("does not mark the draft as sent when the final draft update fails",async()=>{
    vi.mocked(draftRepository.update).mockResolvedValue(null);

    await expect(
      sendAutomatically(userId,draftId.toString()),
    ).rejects.toThrow("Draft could not be updated after sending.");

    expect(sendGmailEmail).toHaveBeenCalledTimes(1);
    expect(emailRepository.update).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
  });

  it("records the successful send timestamp",async()=>{
    const before=new Date();

    const result=await sendAutomatically(userId,draftId.toString());

    const after=new Date();

    expect(result?.sentAt).toBeInstanceOf(Date);
    expect(result!.sentAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(result!.sentAt.getTime()).toBeLessThanOrEqual(after.getTime());

    expect(draftRepository.update).toHaveBeenCalledWith(
      draftId.toString(),
      expect.objectContaining({
        status:"sent",
        sentAt:expect.any(Date),
        automaticSendInProgress:false,
      }),
    );
  });

  it("updates the email with the sent draft ID",async()=>{
    await sendAutomatically(userId,draftId.toString());

    expect(emailRepository.update).toHaveBeenCalledWith(
      emailId.toString(),
      {
        draftId,
      },
    );
  });

  it("creates a sent notification after successful sending",async()=>{
    await sendAutomatically(userId,draftId.toString());

    expect(notify).toHaveBeenCalledWith(
      userId,
      "sent",
      "Reply sent",
      "The approved customer support reply was sent automatically to customer@example.com.",
      draftId.toString(),
    );
  });

  it("atomically claims an approved draft before sending",async()=>{
    const claimed={
      ...baseDraft,
      automaticSendInProgress:true,
    };

    claimedDraft=claimed;

    vi.mocked(draftRepository.claimForAutomaticSend).mockResolvedValue(
      claimed as any,
    );

    const result=await sendAutomatically(userId,draftId.toString());

    expect(result?.sent).toBe(true);
    expect(draftRepository.claimForAutomaticSend).toHaveBeenCalledWith(
      draftId.toString(),
      userId,
    );
    expect(sendGmailEmail).toHaveBeenCalledTimes(1);
  });

  it("does not send when another request already claimed the draft",async()=>{
    vi.mocked(draftRepository.claimForAutomaticSend).mockResolvedValue(null);
    vi.mocked(draftRepository.findById)
      .mockResolvedValueOnce(baseDraft as any)
      .mockResolvedValueOnce({
        ...baseDraft,
        automaticSendInProgress:true,
      } as any);

    await expect(
      sendAutomatically(userId,draftId.toString()),
    ).rejects.toThrow("Draft is no longer available for automatic sending.");

    expect(sendGmailEmail).not.toHaveBeenCalled();
    expect(sendOutlookEmail).not.toHaveBeenCalled();
  });

  it("releases the automatic-send lock after Gmail failure",async()=>{
    vi.mocked(sendGmailEmail).mockRejectedValue(
      new Error("Gmail send failed."),
    );

    await expect(
      sendAutomatically(userId,draftId.toString()),
    ).rejects.toThrow("Gmail send failed.");

    expect(draftRepository.update).toHaveBeenCalledWith(
      draftId.toString(),
      {
        automaticSendInProgress:false,
        status:"approved",
      },
    );
  });

  it("releases the automatic-send lock after Outlook failure",async()=>{
    const outlookDraft={
      ...baseDraft,
      provider:"outlook",
    };

    vi.mocked(draftRepository.findById).mockResolvedValue(outlookDraft as any);
    claimedDraft=outlookDraft;

    vi.mocked(emailRepository.findById).mockResolvedValue({
      ...baseEmail,
      provider:"outlook",
    } as any);

    vi.mocked(sendOutlookEmail).mockRejectedValue(
      new Error("Outlook send failed."),
    );

    await expect(
      sendAutomatically(userId,draftId.toString()),
    ).rejects.toThrow("Outlook send failed.");

    expect(draftRepository.update).toHaveBeenCalledWith(
      draftId.toString(),
      {
        automaticSendInProgress:false,
        status:"approved",
      },
    );
  });
});
