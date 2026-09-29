import { expect, test, type APIRequestContext } from "@playwright/test";

const API_URL = process.env.E2E_API_URL ?? "http://localhost:3001/api";
const AI_REQUEST_TIMEOUT = 60_000;

type AuthSession = {
  token: string;
  user: {
    id: string;
    email?: string;
  };
};

type InboxEmail = {
  _id?: string;
  id?: string;
  provider?: "gmail" | "outlook" | "sample";
  subject?: string;
  senderEmail?: string;
  sender?: string;
  body?: string;
  preview?: string;
};

async function login(request: APIRequestContext): Promise<AuthSession> {
  const response = await request.post(`${API_URL}/auth/login`, {
    data: {
      email: "demo@example.com",
      password: "password123",
    },
  });

  expect(
    response.ok(),
    `Login failed with ${response.status()}: ${await response.text()}`,
  ).toBeTruthy();

  const body = await response.json();

  expect(body.token).toBeTruthy();
  expect(body.user).toBeDefined();

  return {
    token: body.token,
    user: body.user,
  };
}

function authHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
  };
}

async function getInbox(
  request: APIRequestContext,
  token: string,
): Promise<InboxEmail[]> {
  const response = await request.get(`${API_URL}/email?limit=50`, {
    headers: authHeaders(token),
  });

  expect(
    response.ok(),
    `Inbox request failed with ${response.status()}: ${await response.text()}`,
  ).toBeTruthy();

  const body = await response.json();

  if (Array.isArray(body)) {
    return body;
  }

  if (Array.isArray(body.emails)) {
    return body.emails;
  }

  if (Array.isArray(body.data)) {
    return body.data;
  }

  return [];
}

function getEmailId(email: InboxEmail): string | undefined {
  return email._id ?? email.id;
}

function getCustomerEmail(email: InboxEmail): string {
  return email.senderEmail ?? email.sender ?? "customer@example.com";
}

function getProvider(
  email: InboxEmail,
): "gmail" | "outlook" | "sample" {
  if (email.provider === "outlook") {
    return "outlook";
  }

  if (email.provider === "sample") {
    return "sample";
  }

  return "gmail";
}

async function createKnowledgeBaseArticle(
  request: APIRequestContext,
  token: string,
) {
  const response = await request.post(`${API_URL}/knowledge-base`, {
    headers: authHeaders(token),
    data: {
      title: `E2E Shipping Policy ${Date.now()}`,
      content:
        "Standard shipping takes 3 to 5 business days. Express shipping takes 1 to 2 business days. Customers can request a shipping update through customer support.",
      category: "Shipping",
      tags: ["e2e", "shipping", "delivery"],
    },
  });

  expect(
    response.ok(),
    `KB creation failed with ${response.status()}: ${await response.text()}`,
  ).toBeTruthy();

  const body = await response.json();

  expect(body.success).toBeTruthy();
  expect(body.article).toBeDefined();

  return body.article;
}

async function deleteKnowledgeBaseArticle(
  request: APIRequestContext,
  token: string,
  articleId?: string,
) {
  if (!articleId) {
    return;
  }

  await request.delete(`${API_URL}/knowledge-base/${articleId}`, {
    headers: authHeaders(token),
  });
}

async function createDraft(
  request: APIRequestContext,
  token: string,
  email: InboxEmail,
) {
  const emailId = getEmailId(email);

  if (!emailId) {
    throw new Error("Inbox email does not contain an ID.");
  }

  const provider = getProvider(email);

  const response = await request.post(`${API_URL}/drafts`, {
    headers: authHeaders(token),
    timeout: AI_REQUEST_TIMEOUT,
    data: {
      emailId,
      provider,
      subject: `Re: ${email.subject ?? "Customer Support Request"}`,
      customer: getCustomerEmail(email),
      reply:
        "Thank you for contacting our support team. We have reviewed your request and will be happy to assist you.",
      tone: "professional",
      length: "medium",
    },
  });

  expect(
    response.ok(),
    `Draft creation failed with ${response.status()}: ${await response.text()}`,
  ).toBeTruthy();

  return response.json();
}

async function deleteDraft(
  request: APIRequestContext,
  token: string,
  draftId?: string,
) {
  if (!draftId) {
    return;
  }

  const response = await request.delete(`${API_URL}/drafts/${draftId}`, {
    headers: authHeaders(token),
  });

  expect(
    [204, 404].includes(response.status()),
    `Draft cleanup failed with ${response.status()}: ${await response.text()}`,
  ).toBeTruthy();
}

test.describe("Support automation workflows", () => {
  test.setTimeout(120_000);
  
  test("analyzes a customer request with conversation memory and knowledge-base context", async ({
    request,
  }) => {
    const { token } = await login(request);
    const article = await createKnowledgeBaseArticle(request, token);

    try {
      const response = await request.post(`${API_URL}/support/analyze`, {
        headers: authHeaders(token),
        timeout: AI_REQUEST_TIMEOUT,
        data: {
          customerMessage:
            "Where is my order? I selected express shipping and need to know when it will arrive.",
          conversationHistory: [
            {
              role: "customer",
              content: "I placed my order yesterday.",
            },
            {
              role: "agent",
              content:
                "Thank you. We can check the shipping information for you.",
            },
          ],
          knowledgeBase: [
            {
              title: article.title,
              content: article.content,
            },
          ],
          customerContext: {
            name: "E2E Customer",
            email: "e2e-customer@example.com",
            plan: "standard",
          },
          tone: "professional",
          length: "medium",
        },
      });

      expect(
        response.ok(),
        `Support analysis failed with ${response.status()}: ${await response.text()}`,
      ).toBeTruthy();

      const result = await response.json();

      expect(result).toBeDefined();
      expect(result.reply).toEqual(expect.any(String));
      expect(result.confidence).toEqual(expect.any(Number));
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.category).toEqual(expect.any(String));
      expect(result.sentiment).toMatch(
        /^(positive|neutral|negative|urgent)$/,
      );
      expect(result.needsHuman).toEqual(expect.any(Boolean));
      expect(result.decision).toMatch(
        /^(reply|human_review|reject)$/,
      );
      expect(result.reason).toEqual(expect.any(String));
      expect(Array.isArray(result.suggestedActions)).toBeTruthy();
      expect(Array.isArray(result.missingInformation)).toBeTruthy();
      expect(Array.isArray(result.policyIssues)).toBeTruthy();

      if (result.decision === "reply") {
        expect(result.reply.trim().length).toBeGreaterThan(0);
        expect(result.needsHuman).toBe(false);
        expect(result.policyIssues).toHaveLength(0);
      }

      if (result.decision === "human_review") {
        expect(result.needsHuman).toBe(true);
      }
    } finally {
      await deleteKnowledgeBaseArticle(
        request,
        token,
        article._id,
      );
    }
  });

  test("knowledge-base article can be created and searched", async ({
    request,
  }) => {
    const { token } = await login(request);
    const article = await createKnowledgeBaseArticle(request, token);

    try {
      const response = await request.get(
        `${API_URL}/knowledge-base/search?q=${encodeURIComponent(
          "express shipping",
        )}`,
        {
          headers: authHeaders(token),
        },
      );

      expect(
        response.ok(),
        `KB search failed with ${response.status()}: ${await response.text()}`,
      ).toBeTruthy();

      const body = await response.json();

      expect(body.success).toBeTruthy();
      expect(Array.isArray(body.articles)).toBeTruthy();

      const match = body.articles.find(
        (item: { _id?: string; title?: string }) =>
          item._id === article._id ||
          item.title === article.title,
      );

      expect(match).toBeDefined();
    } finally {
      await deleteKnowledgeBaseArticle(
        request,
        token,
        article._id,
      );
    }
  });

  test("draft can be evaluated for an automatic action", async ({
    request,
  }) => {
    const { token } = await login(request);
    const emails = await getInbox(request, token);

    test.skip(
      emails.length === 0,
      "The demo account has no inbox email available for draft workflow testing.",
    );

    const email = emails[0];
    const draft = await createDraft(request, token, email);

    try {
      expect(draft._id).toBeTruthy();

      const response = await request.post(
        `${API_URL}/automation/evaluate`,
        {
          headers: authHeaders(token),
          timeout: AI_REQUEST_TIMEOUT,
          data: {
            draftId: draft._id,
            customerEmail: getCustomerEmail(email),
            knowledgeBase: [],
          },
        },
      );

      expect(
        response.ok(),
        `Automation evaluation failed with ${response.status()}: ${await response.text()}`,
      ).toBeTruthy();

      const result = await response.json();

      expect(result).toBeDefined();
      expect(result.draftId).toBe(draft._id);
      expect(result.action).toMatch(
        /^(auto_approve|pending|escalate|blocked)$/,
      );
      expect(result.status).toMatch(
        /^(approved|pending|escalated|blocked)$/,
      );
      expect(result.confidence).toBeDefined();
      expect(result.confidence.score).toEqual(expect.any(Number));
      expect(result.confidence.level).toMatch(
        /^(high|medium|low)$/,
      );
      expect(result.policy).toBeDefined();
      expect(result.policy.compliant).toEqual(expect.any(Boolean));
      expect(Array.isArray(result.policy.violations)).toBeTruthy();
      expect(Array.isArray(result.policy.warnings)).toBeTruthy();
      expect(Array.isArray(result.reasons)).toBeTruthy();
    } finally {
      await deleteDraft(request, token, draft._id);
    }
  });

  test("escalated draft enters the human approval queue", async ({
    request,
  }) => {
    const { token } = await login(request);
    const emails = await getInbox(request, token);

    test.skip(
      emails.length === 0,
      "The demo account has no inbox email available for approval workflow testing.",
    );

    const email = emails[0];
    const draft = await createDraft(request, token, email);

    try {
      expect(draft._id).toBeTruthy();

      const updateResponse = await request.put(
        `${API_URL}/drafts/${draft._id}`,
        {
          headers: authHeaders(token),
          timeout: AI_REQUEST_TIMEOUT,
          data: {
            automaticAction: "escalate",
            automaticActionReasons: [
              "E2E test requires human approval.",
            ],
            status: "escalated",
          },
        },
      );

      expect(
        updateResponse.ok(),
        `Draft escalation update failed with ${updateResponse.status()}: ${await updateResponse.text()}`,
      ).toBeTruthy();

      const approvalResponse = await request.post(
        `${API_URL}/approvals`,
        {
          headers: authHeaders(token),
          data: {
            draftId: draft._id,
          },
        },
      );

      expect(
        approvalResponse.ok(),
        `Approval creation failed with ${approvalResponse.status()}: ${await approvalResponse.text()}`,
      ).toBeTruthy();

      const approval = await approvalResponse.json();
      const approvalId = approval._id ?? approval.id;

      expect(approvalId).toBeTruthy();
      expect(approval.status).toBe("pending");

      const getResponse = await request.get(
        `${API_URL}/approvals/${approvalId}`,
        {
          headers: authHeaders(token),
        },
      );

      expect(getResponse.ok()).toBeTruthy();

      const queuedApproval = await getResponse.json();

      expect(queuedApproval.status).toBe("pending");

      const queuedDraftId =
        typeof queuedApproval.draftId === "object"
          ? queuedApproval.draftId?._id
          : queuedApproval.draftId;

      expect(String(queuedDraftId)).toBe(String(draft._id));

      await request.delete(
        `${API_URL}/approvals/${approvalId}`,
        {
          headers: authHeaders(token),
        },
      );
    } finally {
      await deleteDraft(request, token, draft._id);
    }
  });

  test("non-approved automation cannot be sent automatically", async ({ request }) => {
    const session = await login(request);
    const token = session.token;
    const inbox = await getInbox(request, token);
    const email = inbox[0];

    expect(email).toBeDefined();

    const draft = await createDraft(request, token, email!);

    try {
      const draftResponse = await request.get(
        `${API_URL}/drafts/${draft._id}`,
        {
          headers: authHeaders(token),
        },
      );

      expect(
        draftResponse.ok(),
        `Draft lookup failed with ${draftResponse.status()}: ${await draftResponse.text()}`,
      ).toBeTruthy();

      const currentDraft = await draftResponse.json();

      expect(String(currentDraft._id)).toBe(String(draft._id));
      expect(currentDraft.automaticAction).not.toBe("auto_approve");

      const sendResponse = await request.post(
        `${API_URL}/automation/${draft._id}/send`,
        {
          headers: authHeaders(token),
          timeout: AI_REQUEST_TIMEOUT,
        },
      );

      expect(
        sendResponse.status(),
        `Automatic send returned ${sendResponse.status()}: ${await sendResponse.text()}`,
      ).toBe(400);

      const body = await sendResponse.json();

      expect(body.message).toMatch(
        /not approved|Only approved|cannot be sent/i,
      );
    } finally {
      await deleteDraft(request, token, String(draft._id));
    }
  });
});
