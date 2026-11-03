import {beforeEach,describe,expect,it,vi} from "vitest";
import {Types} from "mongoose";

const mocks=vi.hoisted(()=>({
  findById:vi.fn(),
  claimForAutomaticSend:vi.fn(),
  markAutomaticSendStarted:vi.fn(),
  markAutomaticSendCompleted:vi.fn(),
  releaseAutomaticClaim:vi.fn(),
  markAutomaticRecoveryRequired:vi.fn(),
  emailFindById:vi.fn(),
  emailCreate:vi.fn(),
  emailUpdate:vi.fn(),
  sendEmail:vi.fn(),
  audit:vi.fn(),
  notify:vi.fn(),
  getSettings:vi.fn(),
}));

vi.mock("../repositories/DraftRepository.js",()=>({
  draftRepository:{
    findById:mocks.findById,
    claimForAutomaticSend:mocks.claimForAutomaticSend,
    markAutomaticSendStarted:mocks.markAutomaticSendStarted,
    markAutomaticSendCompleted:mocks.markAutomaticSendCompleted,
    releaseAutomaticClaim:mocks.releaseAutomaticClaim,
    markAutomaticRecoveryRequired:mocks.markAutomaticRecoveryRequired,
  },
}));

vi.mock("../repositories/EmailRepository.js",()=>({
  emailRepository:{
    findById:mocks.emailFindById,
    create:mocks.emailCreate,
    update:mocks.emailUpdate,
  },
}));

vi.mock("../services/sendEmail.js",()=>({
  sendEmail:mocks.sendEmail,
}));

vi.mock("../services/audit.js",()=>({
  audit:mocks.audit,
}));

vi.mock("../services/notification.js",()=>({
  notify:mocks.notify,
}));

vi.mock("../services/settings.js",()=>({getSettings:mocks.getSettings}));

vi.mock("../services/supportAnalytics.js",()=>({
  recordDraftAnalytics:vi.fn().mockResolvedValue(undefined),
}));

import {draftRepository} from "../repositories/DraftRepository.js";
import {emailRepository} from "../repositories/EmailRepository.js";
import {sendEmail} from "../services/sendEmail.js";
import {audit} from "../services/audit.js";
import {notify} from "../services/notification.js";
import {sendAutomatically} from "../services/automaticSend.js";

const draftRepositoryMock=vi.mocked(draftRepository);
const emailRepositoryMock=vi.mocked(emailRepository);
const sendEmailMock=vi.mocked(sendEmail);
const auditMock=vi.mocked(audit);
const notifyMock=vi.mocked(notify);

const userId=new Types.ObjectId();
const draftId=new Types.ObjectId();
const emailId=new Types.ObjectId();

function createDraft(overrides:Record<string,unknown>={}) {
  return {
    _id:draftId,
    userId,
    emailId,
    provider:"gmail" as const,
    subject:"Question about my account",
    customer:"customer@example.com",
    reply:"Thanks for contacting us. We will be happy to help.",
    status:"approved" as const,
    automaticAction:"auto_approve" as const,
    automaticActionReasons:[],
    supportDecision:"reply",
    supportNeedsHuman:false,
    supportPolicyIssues:[],
    automaticSendInProgress:false,
    automaticSendPhase:"idle" as const,
    automaticSendAttempts:0,
    automaticSendRecoveryRequired:false,
    ...overrides,
  };
}

function setupClaimedDraft(draft: ReturnType<typeof createDraft>) {
  const claimedAt = new Date("2026-10-29T10:00:00.000Z");
  const claimedDraft = {
    ...draft,
    automaticSendInProgress: true,
    automaticSendPhase: "claimed" as const,
    automaticSendClaimedAt: claimedAt,
  };

  draftRepositoryMock.findById
    .mockReset()
    .mockResolvedValueOnce(draft as never)
    .mockResolvedValue(claimedDraft as never);

  draftRepositoryMock.claimForAutomaticSend.mockResolvedValue(claimedDraft as never);

  return claimedDraft;
}

function createEmail(overrides:Record<string,unknown>={}){
  return{
    _id:emailId,
    userId,
    provider:"gmail" as const,
    senderEmail:"customer@example.com",
    threadId:"thread-123",
    messageId:"gmail-message-123",
    messageIdHeader:"<original-message@example.com>",
    references:["<previous-message@example.com>"],
    ...overrides,
  };
}

function setupSuccessfulSend() {
  const draft = createDraft();
  const email = createEmail();
  const startedAt = new Date("2026-10-29T10:00:00.000Z");
  const startedDraft = {
    ...draft,
    automaticSendInProgress: true,
    automaticSendPhase: "sending" as const,
    automaticSendStartedAt: startedAt,
    automaticSendAttempts: 1,
  };
  const completedDraft = {
    ...draft,
    status: "sent" as const,
    automaticSendInProgress: false,
    automaticSendPhase: "completed" as const,
  };
  draftRepositoryMock.findById.mockResolvedValue(draft as never);
  draftRepositoryMock.claimForAutomaticSend.mockResolvedValue({
    ...draft,
    automaticSendInProgress: true,
    automaticSendPhase: "claimed",
    automaticSendClaimedAt: startedAt,
    automaticSendAttempts: 1,
  } as never);
  emailRepositoryMock.findById.mockResolvedValue(email as never);
  draftRepositoryMock.markAutomaticSendStarted.mockResolvedValue(startedDraft as never);
  draftRepositoryMock.markAutomaticSendCompleted.mockResolvedValue(completedDraft as never);
  emailRepositoryMock.update.mockResolvedValue(undefined as never);
  sendEmailMock.mockResolvedValue({
    id:"provider-message-id",
    threadId:"thread-123",
    provider:"gmail",
    sent:true,
    messageIdHeader:"<sent-message@example.com>",
    from:"Support Team <support@example.com>",
    senderName:"Support Team",
    senderEmail:"support@example.com",
    references:["<previous-message@example.com>","<original-message@example.com>"],
  } as never);
  return {draft, email, startedDraft, completedDraft};
}

beforeEach(()=>{
  vi.clearAllMocks();
  draftRepositoryMock.findById.mockReset();
  draftRepositoryMock.claimForAutomaticSend.mockReset();
  draftRepositoryMock.markAutomaticSendStarted.mockReset();
  draftRepositoryMock.markAutomaticSendCompleted.mockReset();
  draftRepositoryMock.releaseAutomaticClaim.mockReset();
  draftRepositoryMock.markAutomaticRecoveryRequired.mockReset();
  emailRepositoryMock.findById.mockReset();
  emailRepositoryMock.create.mockReset();
  emailRepositoryMock.update.mockReset();
  sendEmailMock.mockReset();
  auditMock.mockReset();
  notifyMock.mockReset();
  mocks.getSettings.mockReset().mockResolvedValue({autoSendEnabled:true});
  draftRepositoryMock.releaseAutomaticClaim.mockResolvedValue(null as never);
  draftRepositoryMock.markAutomaticRecoveryRequired.mockResolvedValue(null as never);
  emailRepositoryMock.findById.mockResolvedValue(createEmail() as never);
  emailRepositoryMock.create.mockImplementation(async(data)=>({
    _id:new Types.ObjectId(),
    ...data,
  }) as never);
  auditMock.mockImplementation(async()=>undefined as any);
  notifyMock.mockImplementation(async()=>undefined as any);
});

describe("sendAutomatically",()=>{
  it("sends an approved Gmail reply automatically",async()=>{
    const{email}=setupSuccessfulSend();

    const result=await sendAutomatically(userId.toString(),draftId.toString());

    expect(result?.sent).toBe(true);
    expect(result?.provider).toBe("gmail");
    expect(result?.draftId).toBe(draftId.toString());
    expect(result?.emailId).toBe(emailId.toString());

    expect(sendEmailMock).toHaveBeenCalledWith({
      userId:userId.toString(),
      provider:"gmail",
      to:"customer@example.com",
      subject:"Question about my account",
      reply:"Thanks for contacting us. We will be happy to help.",
      threadId:"thread-123",
      inReplyTo:"<original-message@example.com>",
      references:["<previous-message@example.com>"],
      originalMessageId:"gmail-message-123",
      originalMessageIdHeader:"<original-message@example.com>",
    });
  });

  it("sends an approved Outlook reply automatically",async()=>{
    const draft=createDraft({provider:"outlook"});
    const email=createEmail({provider:"outlook",messageId:"outlook-message-123"});

    const startedAt = new Date("2026-10-29T10:00:00.000Z");
    const startedDraft = {
      ...draft,
      automaticSendInProgress: true,
      automaticSendPhase: "sending" as const,
      automaticSendStartedAt: startedAt,
      automaticSendAttempts: 1,
    };

    draftRepositoryMock.findById.mockResolvedValue(draft as never);
    draftRepositoryMock.claimForAutomaticSend.mockResolvedValue({
      ...draft,
      automaticSendInProgress: true,
      automaticSendPhase: "claimed",
      automaticSendClaimedAt: startedAt,
      automaticSendAttempts: 1,
    } as never);
    emailRepositoryMock.findById.mockResolvedValue(email as never);
    draftRepositoryMock.markAutomaticSendStarted.mockResolvedValue(startedDraft as never);
    draftRepositoryMock.markAutomaticSendCompleted.mockResolvedValue({
      ...draft,
      status:"sent",
      automaticSendPhase:"completed",
      automaticSendInProgress:false,
    } as never);
    sendEmailMock.mockResolvedValue({
      id:"outlook-message-123",
      threadId:"thread-123",
      provider:"outlook",
      sent:true,
      messageIdHeader:"<outlook-sent@example.com>",
      from:"Support Team <support@example.com>",
      senderName:"Support Team",
      senderEmail:"support@example.com",
      references:["<previous-message@example.com>","<original-message@example.com>"],
    } as never);

    const result=await sendAutomatically(userId.toString(),draftId.toString());

    expect(result?.sent).toBe(true);
    expect(result?.provider).toBe("outlook");
    expect(emailRepositoryMock.create).toHaveBeenCalledWith(expect.objectContaining({
      provider:"outlook",
      direction:"outbound",
      messageIdHeader:"<outlook-sent@example.com>",
      from:"Support Team <support@example.com>",
      senderName:"Support Team",
      senderEmail:"support@example.com",
      references:["<previous-message@example.com>","<original-message@example.com>"],
    }));

    expect(sendEmailMock).toHaveBeenCalledWith({
      userId:userId.toString(),
      provider:"outlook",
      to:"customer@example.com",
      subject:"Question about my account",
      reply:"Thanks for contacting us. We will be happy to help.",
      threadId:"thread-123",
      inReplyTo:"<original-message@example.com>",
      references:["<previous-message@example.com>"],
      originalMessageId:"outlook-message-123",
      originalMessageIdHeader:"<original-message@example.com>",
    });
  });

  it("returns null when the draft does not exist",async()=>{
    draftRepositoryMock.findById.mockResolvedValue(null);

    const result=await sendAutomatically(userId.toString(),draftId.toString());

    expect(result).toBeNull();
    expect(draftRepositoryMock.claimForAutomaticSend).not.toHaveBeenCalled();
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid user ID",async()=>{
    await expect(
      sendAutomatically("invalid",draftId.toString()),
    ).rejects.toThrow("Invalid user ID.");

    expect(draftRepositoryMock.findById).not.toHaveBeenCalled();
  });

  it("rejects an invalid draft ID",async()=>{
    await expect(
      sendAutomatically(userId.toString(),"invalid"),
    ).rejects.toThrow("Invalid draft ID.");

    expect(draftRepositoryMock.findById).not.toHaveBeenCalled();
  });

  it("rejects a draft owned by another user",async()=>{
    const draft=createDraft({
      userId:new Types.ObjectId(),
    });

    draftRepositoryMock.findById.mockResolvedValue(draft as never);

    await expect(
      sendAutomatically(userId.toString(),draftId.toString()),
    ).rejects.toThrow("Unauthorized.");

    expect(draftRepositoryMock.claimForAutomaticSend).not.toHaveBeenCalled();
  });

  it("rejects a draft that has already been sent",async()=>{
    draftRepositoryMock.findById.mockResolvedValue(
      createDraft({status:"sent"}) as never,
    );

    await expect(
      sendAutomatically(userId.toString(),draftId.toString()),
    ).rejects.toThrow("Draft has already been sent.");

    expect(draftRepositoryMock.claimForAutomaticSend).not.toHaveBeenCalled();
  });

  it("rejects a draft requiring human verification",async()=>{
    draftRepositoryMock.findById.mockResolvedValue(
      createDraft({automaticSendRecoveryRequired:true}) as never,
    );

    await expect(
      sendAutomatically(userId.toString(),draftId.toString()),
    ).rejects.toThrow(
      "This draft requires human verification before another automatic send attempt.",
    );

    expect(draftRepositoryMock.claimForAutomaticSend).not.toHaveBeenCalled();
  });

  it("rejects automatic sending when the account setting is disabled",async()=>{
    mocks.getSettings.mockResolvedValue({autoSendEnabled:false});
    draftRepositoryMock.findById.mockResolvedValue(createDraft() as never);
    await expect(sendAutomatically(userId.toString(),draftId.toString())).rejects.toThrow("Automatic sending is disabled in your AI settings.");
    expect(draftRepositoryMock.claimForAutomaticSend).not.toHaveBeenCalled();
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("rejects a draft that is not approved for automatic sending",async()=>{
    draftRepositoryMock.findById.mockResolvedValue(
      createDraft({
        status:"pending",
        automaticAction:"pending",
      }) as never,
    );

    await expect(
      sendAutomatically(userId.toString(),draftId.toString()),
    ).rejects.toThrow(
      "This draft is not approved for automatic sending.",
    );

    expect(draftRepositoryMock.claimForAutomaticSend).not.toHaveBeenCalled();
  });

  it("rejects an escalated draft before claiming it for automatic sending",async()=>{
    draftRepositoryMock.findById.mockResolvedValue(
      createDraft({
        status:"escalated",
        automaticAction:"escalate",
      }) as never,
    );
    await expect(
      sendAutomatically(userId.toString(),draftId.toString()),
    ).rejects.toThrow("This draft is not approved for automatic sending.");
    expect(draftRepositoryMock.claimForAutomaticSend).not.toHaveBeenCalled();
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("rejects an escalated draft even if its status is approved",async()=>{
    draftRepositoryMock.findById.mockResolvedValue(
      createDraft({
        status:"approved",
        automaticAction:"escalate",
      }) as never,
    );
    await expect(
      sendAutomatically(userId.toString(),draftId.toString()),
    ).rejects.toThrow("This draft is not approved for automatic sending.");
    expect(draftRepositoryMock.claimForAutomaticSend).not.toHaveBeenCalled();
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("rejects when the automatic-send claim is lost",async()=>{
    const draft=createDraft();

    draftRepositoryMock.findById
      .mockResolvedValueOnce(draft as never)
      .mockResolvedValueOnce(draft as never);

    draftRepositoryMock.claimForAutomaticSend.mockResolvedValue(null);

    await expect(
      sendAutomatically(userId.toString(),draftId.toString()),
    ).rejects.toThrow(
      "Draft is no longer available for automatic sending.",
    );

    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("fails when the original email does not exist",async()=>{
    const draft=createDraft();

    setupClaimedDraft(draft);
    emailRepositoryMock.findById.mockResolvedValue(null);

    await expect(
      sendAutomatically(userId.toString(),draftId.toString()),
    ).rejects.toThrow("Original email not found.");

    expect(draftRepositoryMock.releaseAutomaticClaim).toHaveBeenCalled();
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("rejects when the original email belongs to another user",async()=>{
    const draft=createDraft();
    const email=createEmail({
      userId:new Types.ObjectId(),
    });

    setupClaimedDraft(draft);
    emailRepositoryMock.findById.mockResolvedValue(email as never);

    await expect(
      sendAutomatically(userId.toString(),draftId.toString()),
    ).rejects.toThrow("Unauthorized.");

    expect(draftRepositoryMock.releaseAutomaticClaim).toHaveBeenCalled();
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("rejects when the draft provider does not match the original email provider",async()=>{
    const draft=createDraft({provider:"gmail"});
    const email=createEmail({provider:"outlook"});

    setupClaimedDraft(draft);
    emailRepositoryMock.findById.mockResolvedValue(email as never);

    await expect(
      sendAutomatically(userId.toString(),draftId.toString()),
    ).rejects.toThrow(
      "Draft provider does not match the original email provider.",
    );

    expect(draftRepositoryMock.releaseAutomaticClaim).toHaveBeenCalled();
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("rejects when the customer email is missing",async()=>{
    const draft=createDraft({customer:""});
    const email=createEmail({senderEmail:""});

    setupClaimedDraft(draft);
    emailRepositoryMock.findById.mockResolvedValue(email as never);

    await expect(
      sendAutomatically(userId.toString(),draftId.toString()),
    ).rejects.toThrow(
      "Customer email address is required for automatic sending.",
    );

    expect(draftRepositoryMock.releaseAutomaticClaim).toHaveBeenCalled();
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("rejects when the subject is empty",async()=>{
    const draft=createDraft({subject:""});

    setupClaimedDraft(draft);
    emailRepositoryMock.findById.mockResolvedValue(createEmail() as never);

    await expect(
      sendAutomatically(userId.toString(),draftId.toString()),
    ).rejects.toThrow("Draft subject is required.");

    expect(draftRepositoryMock.releaseAutomaticClaim).toHaveBeenCalled();
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("rejects when the reply is empty",async()=>{
    const draft=createDraft({reply:""});

    setupClaimedDraft(draft);
    emailRepositoryMock.findById.mockResolvedValue(createEmail() as never);

    await expect(
      sendAutomatically(userId.toString(),draftId.toString()),
    ).rejects.toThrow("Draft reply is empty.");

    expect(draftRepositoryMock.releaseAutomaticClaim).toHaveBeenCalled();
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("does not send when starting the send fails",async()=>{
    const draft=createDraft();

    setupClaimedDraft(draft);
    emailRepositoryMock.findById.mockResolvedValue(createEmail() as never);
    draftRepositoryMock.markAutomaticSendStarted.mockResolvedValue(null);

    await expect(
      sendAutomatically(userId.toString(),draftId.toString()),
    ).rejects.toThrow(
      "Automatic send could not be started because the send claim was lost.",
    );

    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("marks the draft as completed after successful Gmail sending",async()=>{
    setupSuccessfulSend();

    await sendAutomatically(userId.toString(),draftId.toString());

    expect(
      draftRepositoryMock.markAutomaticSendCompleted,
    ).toHaveBeenCalledWith(
      draftId.toString(),
      expect.any(Date),
    );
  });

  it("updates the original email after successful sending",async()=>{
    setupSuccessfulSend();

    await sendAutomatically(userId.toString(),draftId.toString());

    expect(emailRepositoryMock.update).toHaveBeenCalledWith(
      emailId.toString(),
      {draftId:draftId},
    );
  });

it("creates an outbound email record after successful sending",async()=>{
  const{draft,email}=setupSuccessfulSend();

  await sendAutomatically(userId.toString(),draftId.toString());

  expect(emailRepositoryMock.create).toHaveBeenCalledWith(
    expect.objectContaining({
      userId,
      draftId:draftId,
      provider:"gmail",
      direction:"outbound",
      messageId:"provider-message-id",
      messageIdHeader:"<sent-message@example.com>",
      from:"Support Team <support@example.com>",
      senderName:"Support Team",
      senderEmail:"support@example.com",
      references:["<previous-message@example.com>","<original-message@example.com>"],
      threadId:email.threadId,
      subject:draft.subject,
      recipientEmail:draft.customer,
      body:draft.reply,
      preview:draft.reply,
      unread:false,
      archived:false,
    }),
  );
});


it("does not mark a failed provider send as completed",async()=>{
  const startedAt = new Date("2026-10-29T10:00:00.000Z");
  const draft=createDraft();
  const email=createEmail();
  draftRepositoryMock.findById.mockResolvedValue(draft as never);
  draftRepositoryMock.claimForAutomaticSend.mockResolvedValue(draft as never);
  emailRepositoryMock.findById.mockResolvedValue(email as never);
  draftRepositoryMock.markAutomaticSendStarted.mockResolvedValue({
    ...draft,
    automaticSendInProgress:true,
    automaticSendPhase:"sending",
    automaticSendStartedAt: startedAt,
    automaticSendAttempts:1,
  } as never);
  sendEmailMock.mockRejectedValue(new Error("Gmail send failed."));
  draftRepositoryMock.markAutomaticRecoveryRequired.mockResolvedValue({
    ...draft,
    automaticSendRecoveryRequired:true,
    automaticSendInProgress:false,
    automaticSendPhase:"pending",
    supportNeedsHuman:true,
  } as never);

  await expect(
    sendAutomatically(userId.toString(),draftId.toString()),
  ).rejects.toThrow("Gmail send failed.");

  expect(draftRepositoryMock.markAutomaticSendCompleted).not.toHaveBeenCalled();
  expect(draftRepositoryMock.releaseAutomaticClaim).not.toHaveBeenCalled();
  expect(draftRepositoryMock.markAutomaticRecoveryRequired).toHaveBeenCalledWith(
    draftId.toString(),
    expect.stringContaining("Gmail send failed."),
    startedAt,
  );
  expect(sendEmailMock).toHaveBeenCalledTimes(1);
});

it("requires human verification after an ambiguous provider failure and blocks retries",async()=>{
  const startedAt = new Date("2026-10-29T10:00:00.000Z");
  const draft=createDraft();
  const email=createEmail();
  const recoveryDraft=createDraft({
    automaticSendRecoveryRequired:true,
    automaticSendInProgress:false,
    automaticSendPhase:"recovery_required",
    supportNeedsHuman:true,
  });
  draftRepositoryMock.findById
    .mockResolvedValueOnce(draft as never)
    .mockResolvedValueOnce(recoveryDraft as never);
  draftRepositoryMock.claimForAutomaticSend.mockResolvedValue(draft as never);
  emailRepositoryMock.findById.mockResolvedValue(email as never);
  draftRepositoryMock.markAutomaticSendStarted.mockResolvedValue({
    ...draft,
    automaticSendInProgress:true,
    automaticSendPhase:"sending",
    automaticSendStartedAt: startedAt,
    automaticSendAttempts:1,
  } as never);
  draftRepositoryMock.markAutomaticRecoveryRequired.mockResolvedValue(
    recoveryDraft as never,
  );
  sendEmailMock.mockRejectedValue(
    new Error("Network timeout while contacting Gmail."),
  );

  await expect(
    sendAutomatically(userId.toString(),draftId.toString()),
  ).rejects.toThrow(
    "Automatic sending could not be confirmed. Human verification is required before retrying.",
  );

  expect(draftRepositoryMock.markAutomaticRecoveryRequired).toHaveBeenCalledWith(
    draftId.toString(),
    "Automatic send result is uncertain: Network timeout while contacting Gmail.",
    startedAt,
  );
  expect(draftRepositoryMock.releaseAutomaticClaim).not.toHaveBeenCalled();
  expect(draftRepositoryMock.markAutomaticSendCompleted).not.toHaveBeenCalled();
  expect(emailRepositoryMock.create).not.toHaveBeenCalled();

  await expect(
    sendAutomatically(userId.toString(),draftId.toString()),
  ).rejects.toThrow(
    "This draft requires human verification before another automatic send attempt.",
  );

  expect(draftRepositoryMock.claimForAutomaticSend).toHaveBeenCalledTimes(1);
  expect(sendEmailMock).toHaveBeenCalledTimes(1);
});

  it("requires recovery when sending fails after the provider send begins",async()=>{
    const startedAt = new Date("2026-10-29T10:00:00.000Z");
    const draft=createDraft();
    const email=createEmail();

    draftRepositoryMock.findById.mockResolvedValue(draft as never);
    draftRepositoryMock.claimForAutomaticSend.mockResolvedValue(draft as never);
    emailRepositoryMock.findById.mockResolvedValue(email as never);
    draftRepositoryMock.markAutomaticSendStarted.mockResolvedValue({
      ...draft,
      automaticSendInProgress:true,
      automaticSendPhase:"sending",
      automaticSendStartedAt: startedAt,
      automaticSendAttempts:1,
    } as never);
    draftRepositoryMock.markAutomaticRecoveryRequired.mockResolvedValue({
      ...draft,
      automaticSendRecoveryRequired:true,
      automaticSendPhase:"recovery_required",
    } as never);
    sendEmailMock.mockRejectedValue(
      new Error("Connection reset by provider."),
    );

    await expect(
      sendAutomatically(userId.toString(),draftId.toString()),
    ).rejects.toThrow(
      "Automatic sending could not be confirmed. Human verification is required before retrying.",
    );

    expect(
      draftRepositoryMock.markAutomaticRecoveryRequired,
    ).toHaveBeenCalledWith(
      draftId.toString(),
      "Automatic send result is uncertain: Connection reset by provider.",
      startedAt,
    );

    expect(
      draftRepositoryMock.releaseAutomaticClaim,
    ).not.toHaveBeenCalled();
  });

  it("The automatic reply may have been sent, but its outbound record could not be saved. Human verification is required.",async()=>{
    const startedAt = new Date("2026-10-29T10:00:00.000Z");
    const draft=createDraft();
    const email=createEmail();

    draftRepositoryMock.findById.mockResolvedValue(draft as never);
    draftRepositoryMock.claimForAutomaticSend.mockResolvedValue(draft as never);
    emailRepositoryMock.findById.mockResolvedValue(email as never);
    draftRepositoryMock.markAutomaticSendStarted.mockResolvedValue({
      ...draft,
      automaticSendInProgress:true,
      automaticSendPhase:"sending",
      automaticSendStartedAt: startedAt,
      automaticSendAttempts:1,
    } as never);
    sendEmailMock.mockResolvedValue({
      id:"provider-message-id",
      threadId:"thread-123",
      provider:"gmail",
      sent:true,
    } as never);
    draftRepositoryMock.markAutomaticSendCompleted.mockResolvedValue(null);

    draftRepositoryMock.markAutomaticRecoveryRequired.mockResolvedValue({
      ...draft,
      automaticSendRecoveryRequired:true,
      automaticSendPhase:"recovery_required",
    } as never);

    await expect(
      sendAutomatically(userId.toString(),draftId.toString()),
    ).rejects.toThrow(
      "Automatic reply was sent, but the application could not confirm the sent state. Human verification is required.",
    );

    expect(
      draftRepositoryMock.markAutomaticRecoveryRequired,
    ).toHaveBeenCalled();

    expect(emailRepositoryMock.update).not.toHaveBeenCalled();
  });

  
  it("requires human verification when the provider succeeds but saving the outbound record fails",async()=>{
    const {draft,startedDraft}=setupSuccessfulSend();
    const startedAt=startedDraft.automaticSendStartedAt;
    const recoveryDraft=createDraft({
      automaticSendRecoveryRequired:true,
      automaticSendInProgress:false,
      automaticSendPhase:"recovery_required",
      supportNeedsHuman:true,
    });

    draftRepositoryMock.findById
      .mockResolvedValueOnce(draft as never)
      .mockResolvedValueOnce(recoveryDraft as never);
    emailRepositoryMock.create.mockRejectedValue(
      new Error("Mongo write failed."),
    );
    draftRepositoryMock.markAutomaticRecoveryRequired.mockResolvedValue(
      recoveryDraft as never,
    );

    await expect(
      sendAutomatically(userId.toString(),draftId.toString()),
    ).rejects.toThrow(
      "The automatic reply may have been sent, but its outbound record could not be saved. Human verification is required.",
    );

    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    expect(emailRepositoryMock.create).toHaveBeenCalledWith(
      expect.objectContaining({
        direction:"outbound",
        messageId:"provider-message-id",
      }),
    );
    expect(draftRepositoryMock.markAutomaticRecoveryRequired).toHaveBeenCalledWith(
      draftId.toString(),
      "The provider accepted the automatic reply, but the outbound email record could not be saved: Mongo write failed.",
      startedAt,
    );
    expect(draftRepositoryMock.markAutomaticSendCompleted).not.toHaveBeenCalled();
    expect(draftRepositoryMock.releaseAutomaticClaim).not.toHaveBeenCalled();
    expect(emailRepositoryMock.update).not.toHaveBeenCalled();

    await expect(
      sendAutomatically(userId.toString(),draftId.toString()),
    ).rejects.toThrow(
      "This draft requires human verification before another automatic send attempt.",
    );

    expect(draftRepositoryMock.claimForAutomaticSend).toHaveBeenCalledTimes(1);
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
  });

  it("does not resend when completion and recovery persistence both fail", async () => {
    const { draft } = setupSuccessfulSend();
    const startedAt = new Date();

    draftRepositoryMock.markAutomaticSendCompleted.mockResolvedValue(null);
    draftRepositoryMock.markAutomaticRecoveryRequired.mockRejectedValue(new Error("Recovery persistence failed."));

    await expect(sendAutomatically(userId.toString(), draftId.toString())).rejects.toThrow("Recovery persistence failed.");
    expect(sendEmailMock).toHaveBeenCalledTimes(1);

    // Simulate the database retaining the original sending claim.
    draftRepositoryMock.findById.mockResolvedValue({
      ...draft,
      automaticSendInProgress: true,
      automaticSendPhase: "sending",
      automaticSendStartedAt: startedAt,
      automaticSendRecoveryRequired: false,
    } as never);
    draftRepositoryMock.claimForAutomaticSend.mockResolvedValueOnce(null);

    await expect(sendAutomatically(userId.toString(), draftId.toString())).rejects.toThrow("Draft is no longer available for automatic sending.");
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
  });

  it("passes Outlook conversation metadata to the provider",async()=>{
    const startedAt = new Date();
    const draft=createDraft({provider:"outlook"});
    const email=createEmail({
      provider:"outlook",
      threadId:"outlook-thread-456",
      messageId:"outlook-message-456",
      messageIdHeader:"<outlook-message@example.com>",
      references:[
        "<older@example.com>",
        "<previous@example.com>",
      ],
    });

    draftRepositoryMock.findById.mockResolvedValue(draft as never);
    draftRepositoryMock.claimForAutomaticSend.mockResolvedValue({
      ...draft,
      automaticSendInProgress:true,
      automaticSendPhase:"claimed",
      automaticSendClaimedAt:startedAt,
    } as never);
    emailRepositoryMock.findById.mockResolvedValue(email as never);
    draftRepositoryMock.markAutomaticSendStarted.mockResolvedValue({
      ...draft,
      automaticSendInProgress:true,
      automaticSendPhase:"sending",
      automaticSendAttempts:1,
      automaticSendStartedAt:startedAt,
    } as never);
    draftRepositoryMock.markAutomaticSendCompleted.mockResolvedValue({
      ...draft,
      status:"sent",
      automaticSendPhase:"completed",
      automaticSendInProgress:false,
    } as never);
    sendEmailMock.mockResolvedValue({
      id:"outlook-message-456",
      threadId:"outlook-thread-456",
      provider:"outlook",
      sent:true,
    } as never);

    await sendAutomatically(userId.toString(),draftId.toString());

    expect(sendEmailMock).toHaveBeenCalledWith({
      userId:userId.toString(),
      provider:"outlook",
      to:"customer@example.com",
      subject:"Question about my account",
      reply:"Thanks for contacting us. We will be happy to help.",
      threadId:"outlook-thread-456",
      inReplyTo:"<outlook-message@example.com>",
      references:[
        "<older@example.com>",
        "<previous@example.com>",
      ],
      originalMessageId:"outlook-message-456",
      originalMessageIdHeader:"<outlook-message@example.com>",
    });
  });
});
