import {beforeEach,describe,expect,it,vi} from "vitest";

vi.mock("../repositories/DraftRepository.js", () => ({
  draftRepository: {
    findById: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("../services/audit.js", () => ({
  audit: vi.fn(),
}));

vi.mock("../services/draftSupport.js", () => ({
  analyzeDraftSupport: vi.fn(),
  evaluateDraftPolicy: vi.fn(),
}));

import {draftRepository} from "../repositories/DraftRepository.js";
import {submitDraft} from "../services/draftApproval.js";

const userId = "507f1f77bcf86cd799439011";
const otherUserId = "507f1f77bcf86cd799439099";
const draftId = "507f1f77bcf86cd799439013";

const draft = {
  _id: draftId,
  userId,
  emailId: "507f1f77bcf86cd799439014",
  customer: "customer@example.com",
  tone: "professional",
  length: "medium",
  reply: "Thank you for contacting us.",
  status: "escalated",
};

describe("draft approval service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("submitDraft", () => {
    it("resubmits an escalated draft for approval", async () => {
      vi.mocked(draftRepository.findById).mockResolvedValue(draft as never);
      vi.mocked(draftRepository.update).mockResolvedValue({
        ...draft,
        status: "pending",
        rejectionReason: undefined,
        escalatedAt: undefined,
        escalationReason: undefined,
        escalationReasons: [],
      } as never);

      const result = await submitDraft(draftId, userId);

      expect(draftRepository.findById).toHaveBeenCalledWith(draftId);
      expect(draftRepository.update).toHaveBeenCalledWith(
        draftId,
        expect.objectContaining({
          status: "pending",
          rejectionReason: undefined,
          escalatedAt: undefined,
          escalationReason: undefined,
          escalationReasons: [],
        }),
      );
      expect(result).toEqual(expect.objectContaining({
        status: "pending",
      }));
    });

    it("resubmits a rejected draft for approval", async () => {
      vi.mocked(draftRepository.findById).mockResolvedValue({
        ...draft,
        status: "rejected",
        rejectionReason: "Please revise the response.",
      } as never);
      vi.mocked(draftRepository.update).mockResolvedValue({
        ...draft,
        status: "pending",
      } as never);

      const result = await submitDraft(draftId, userId);

      expect(draftRepository.update).toHaveBeenCalledWith(
        draftId,
        expect.objectContaining({
          status: "pending",
          rejectionReason: undefined,
          escalatedAt: undefined,
          escalationReason: undefined,
          escalationReasons: [],
        }),
      );
      expect(result).toEqual(expect.objectContaining({
        status: "pending",
      }));
    });

    it("returns null when the draft does not exist", async () => {
      vi.mocked(draftRepository.findById).mockResolvedValue(null);

      const result = await submitDraft(draftId, userId);

      expect(result).toBeNull();
      expect(draftRepository.update).not.toHaveBeenCalled();
    });

    it("rejects submission by another user", async () => {
      vi.mocked(draftRepository.findById).mockResolvedValue(draft as never);

      await expect(submitDraft(draftId, otherUserId)).rejects.toThrow(
        "Unauthorized.",
      );

      expect(draftRepository.update).not.toHaveBeenCalled();
    });

    it("rejects submission of a sent draft", async () => {
      vi.mocked(draftRepository.findById).mockResolvedValue({
        ...draft,
        status: "sent",
      } as never);

      await expect(submitDraft(draftId, userId)).rejects.toThrow(
        "Sent drafts cannot be submitted.",
      );

      expect(draftRepository.update).not.toHaveBeenCalled();
    });
  });
});
