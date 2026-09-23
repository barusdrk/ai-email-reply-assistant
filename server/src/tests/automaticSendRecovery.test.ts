import {beforeEach,describe,expect,it,vi} from "vitest";

vi.mock("../repositories/DraftRepository.js",()=>({
  draftRepository:{
    findStaleAutomaticClaims:vi.fn(),
    releaseAutomaticClaim:vi.fn(),
    markAutomaticRecoveryRequired:vi.fn(),
  },
}));

vi.mock("../services/audit.js",()=>({
  audit:vi.fn(),
}));

vi.mock("../services/notification.js",()=>({
  notify:vi.fn(),
}));

import {draftRepository} from "../repositories/DraftRepository.js";
import {audit} from "../services/audit.js";
import {notify} from "../services/notification.js";
import {recoverStaleAutomaticSends} from "../services/automaticSendRecovery.js";

describe("recoverStaleAutomaticSends",()=>{
  beforeEach(()=>{
    vi.clearAllMocks();

    vi.mocked(draftRepository.findStaleAutomaticClaims).mockResolvedValue([]);
    vi.mocked(draftRepository.releaseAutomaticClaim).mockResolvedValue(null);
    vi.mocked(draftRepository.markAutomaticRecoveryRequired).mockResolvedValue(null);
    vi.mocked(audit).mockResolvedValue({} as any);
    vi.mocked(notify).mockResolvedValue({} as any);
  });

  it("releases a stale claim that never started provider sending",async()=>{
    const draft={
      _id:{toString:()=>"draft-1"},
      userId:{toString:()=>"user-1"},
      automaticSendPhase:"claimed",
      automaticSendClaimedAt:new Date("2026-09-22T10:00:00Z"),
      automaticSendStartedAt:undefined,
      automaticSendAttempts:1,
    };

    vi.mocked(draftRepository.findStaleAutomaticClaims).mockResolvedValue([
      draft as any,
    ]);

    vi.mocked(draftRepository.releaseAutomaticClaim).mockResolvedValue({
      ...draft,
      automaticSendInProgress:false,
    } as any);

    const result=await recoverStaleAutomaticSends();

    expect(result.scanned).toBe(1);
    expect(result.released).toBe(1);
    expect(result.requiresHumanReview).toBe(0);
    expect(result.errors).toBe(0);

    expect(draftRepository.releaseAutomaticClaim).toHaveBeenCalledWith(
      "draft-1",
      "Automatic send claim expired before the provider send started.",
    );

    expect(audit).toHaveBeenCalledWith(
      "automatic_send_claim_recovered",
      "draft",
      "draft-1",
      "user-1",
      expect.objectContaining({
        phase:"claimed",
      }),
    );
  });

  it("does not automatically retry a stale provider-send operation",async()=>{
    const draft={
      _id:{toString:()=>"draft-2"},
      userId:{toString:()=>"user-2"},
      automaticSendPhase:"sending",
      automaticSendClaimedAt:new Date("2026-09-22T10:00:00Z"),
      automaticSendStartedAt:new Date("2026-09-22T10:00:01Z"),
      automaticSendAttempts:1,
    };

    vi.mocked(draftRepository.findStaleAutomaticClaims).mockResolvedValue([
      draft as any,
    ]);

    vi.mocked(draftRepository.markAutomaticRecoveryRequired).mockResolvedValue({
      ...draft,
      status:"pending",
      automaticSendInProgress:false,
      automaticSendRecoveryRequired:true,
    } as any);

    const result=await recoverStaleAutomaticSends();

    expect(result.scanned).toBe(1);
    expect(result.released).toBe(0);
    expect(result.requiresHumanReview).toBe(1);
    expect(result.errors).toBe(0);

    expect(draftRepository.markAutomaticRecoveryRequired).toHaveBeenCalledWith(
      "draft-2",
      "Automatic sending was interrupted after the provider send began. Human verification is required before another send attempt.",
    );

    expect(draftRepository.releaseAutomaticClaim).not.toHaveBeenCalled();

    expect(notify).toHaveBeenCalledWith(
      "user-2",
      "approval",
      "Automatic reply requires verification",
      expect.stringContaining("Sent folder"),
      "draft-2",
    );
  });

  it("continues recovering other drafts when one recovery fails",async()=>{
    const draft={
      _id:{toString:()=>"draft-3"},
      userId:{toString:()=>"user-3"},
      automaticSendPhase:"claimed",
      automaticSendClaimedAt:new Date("2026-09-22T10:00:00Z"),
      automaticSendAttempts:1,
    };

    vi.mocked(draftRepository.findStaleAutomaticClaims).mockResolvedValue([
      draft as any,
    ]);

    vi.mocked(draftRepository.releaseAutomaticClaim).mockRejectedValue(
      new Error("Database unavailable."),
    );

    const result=await recoverStaleAutomaticSends();

    expect(result.scanned).toBe(1);
    expect(result.errors).toBe(1);
  });
});
