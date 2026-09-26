import {beforeEach,describe,expect,it,vi} from "vitest";
import {checkReplyPolicy} from "../services/policyChecker.js";

const {createMock}=vi.hoisted(()=>({
  createMock:vi.fn(),
}));

vi.mock("openai",()=>({
  default:vi.fn().mockImplementation(function(){
    return{
      chat:{
        completions:{
          create:createMock,
        },
      },
    };
  }),
}));

vi.mock("../config/env.js",()=>({
  env:{
    OPENAI_API_KEY:"test-api-key",
    OPENAI_MODEL:"test-model",
  },
}));

const createMockResponse=(content:string)=>({
  choices:[{message:{content}}],
});

const setMockResponse=(content:string)=>{
  createMock.mockResolvedValue(createMockResponse(content) as never);
};

describe("policyChecker",()=>{
  beforeEach(()=>{
    createMock.mockReset();
    setMockResponse(JSON.stringify({
      compliant:true,
      score:100,
      violations:[],
      warnings:[],
      suggestions:[],
    }));
  });

  it("returns a compliant result",async()=>{
    setMockResponse(JSON.stringify({
      compliant:true,
      score:100,
      violations:[],
      warnings:[],
      suggestions:[],
    }));
    const result=await checkReplyPolicy({
      email:"When will my order arrive?",
      reply:"Your order should arrive within 3 business days.",
      knowledgeBase:[{title:"Shipping",content:"Orders normally arrive within 3 business days.",category:"shipping",tags:["delivery"]}],
    });
    expect(result.compliant).toBe(true);
    expect(result.score).toBe(100);
    expect(result.violations).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.suggestions).toEqual([]);
  });

  it("returns policy violations",async()=>{
    setMockResponse(JSON.stringify({
      compliant:false,
      score:20,
      violations:["The reply promises an unauthorized refund."],
      warnings:[],
      suggestions:["Do not promise a refund unless the policy authorizes it."],
    }));
    const result=await checkReplyPolicy({
      email:"Can I get a refund?",
      reply:"We will definitely issue you a full refund.",
      knowledgeBase:[{title:"Refund Policy",content:"Refunds require manual review and are not guaranteed.",category:"refund",tags:["refund"]}],
    });
    expect(createMock).toHaveBeenCalledTimes(1);
    expect(result.compliant).toBe(false);
    expect(result.score).toBe(20);
    expect(result.violations).toEqual(["The reply promises an unauthorized refund."]);
    expect(result.warnings).toEqual([]);
    expect(result.suggestions).toEqual(["Do not promise a refund unless the policy authorizes it."]);
  });

  it("returns policy warnings",async()=>{
    setMockResponse(JSON.stringify({
      compliant:true,
      score:75,
      violations:[],
      warnings:["The requested information could not be fully verified."],
      suggestions:["Review the response before sending."],
    }));
    const result=await checkReplyPolicy({
      email:"Can you confirm my delivery date?",
      reply:"Your package should arrive tomorrow.",
      knowledgeBase:[{title:"Shipping",content:"Delivery dates can vary.",category:"shipping",tags:["delivery"]}],
    });
    expect(result.compliant).toBe(true);
    expect(result.score).toBe(75);
    expect(result.violations).toEqual([]);
    expect(result.warnings).toEqual(["The requested information could not be fully verified."]);
    expect(result.suggestions).toEqual(["Review the response before sending."]);
  });

  it("includes Knowledge Base information in the scoring request",async()=>{
    setMockResponse(JSON.stringify({
      compliant:true,
      score:95,
      violations:[],
      warnings:[],
      suggestions:[],
    }));
    await checkReplyPolicy({
      email:"Where can I track my order?",
      reply:"You can track your order using your tracking number.",
      knowledgeBase:[{title:"Shipping Policy",content:"Customers can track orders using the tracking number.",category:"shipping",tags:["tracking","delivery"]}],
    });
    expect(createMock).toHaveBeenCalledTimes(1);
    const request=createMock.mock.calls[0]?.[0] as {messages?:Array<{content?:string}>};
    const userMessage=request.messages?.find((message)=>typeof message.content==="string"&&message.content.includes("Knowledge Base"));
    expect(userMessage?.content).toContain("Shipping Policy");
    expect(userMessage?.content).toContain("Customers can track orders using the tracking number.");
    expect(userMessage?.content).toContain("shipping");
    expect(userMessage?.content).toContain("tracking, delivery");
  });

  it("handles an empty Knowledge Base",async()=>{
    setMockResponse(JSON.stringify({
      compliant:true,
      score:80,
      violations:[],
      warnings:["No Knowledge Base information was available."],
      suggestions:["Review the response before sending."],
    }));
    await checkReplyPolicy({
      email:"What are your support hours?",
      reply:"Our support team is available during business hours.",
    });
    expect(createMock).toHaveBeenCalledTimes(1);
    const request=createMock.mock.calls[0]?.[0] as {messages?:Array<{content?:string}>};
    const userMessage=request.messages?.find((message)=>typeof message.content==="string"&&message.content.includes("Knowledge Base"));
    expect(userMessage?.content).toContain("No relevant Knowledge Base information was found.");
  });

  it("uses the configured OpenAI model",async()=>{
    setMockResponse(JSON.stringify({
      compliant:true,
      score:90,
      violations:[],
      warnings:[],
      suggestions:[],
    }));
    await checkReplyPolicy({
      email:"What are your support hours?",
      reply:"Our support team is available during business hours.",
    });
    expect(createMock).toHaveBeenCalledTimes(1);
    expect(createMock.mock.calls[0]?.[0]).toMatchObject({model:"test-model"});
  });

  it("clamps scores above 100",async()=>{
    setMockResponse(JSON.stringify({
      compliant:true,
      score:150,
      violations:[],
      warnings:[],
      suggestions:[],
    }));
    const result=await checkReplyPolicy({
      email:"Can I update my account?",
      reply:"Yes, you can update your account details.",
    });
    expect(result.score).toBe(100);
  });

  it("clamps scores below 0",async()=>{
    setMockResponse(JSON.stringify({
      compliant:false,
      score:-25,
      violations:["The reply violates company policy."],
      warnings:[],
      suggestions:[],
    }));
    const result=await checkReplyPolicy({
      email:"Can I bypass the rules?",
      reply:"Yes, we can bypass the rules.",
    });
    expect(result.score).toBe(0);
  });

  it("accepts JSON wrapped in a markdown code block",async()=>{
    setMockResponse('```json\n{"compliant":true,"score":85,"violations":[],"warnings":["Review recommended."],"suggestions":["Verify the claim."]}\n```');
    const result=await checkReplyPolicy({
      email:"What is your shipping time?",
      reply:"Shipping normally takes 3 business days.",
    });
    expect(result.compliant).toBe(true);
    expect(result.score).toBe(85);
    expect(result.violations).toEqual([]);
    expect(result.warnings).toEqual(["Review recommended."]);
    expect(result.suggestions).toEqual(["Verify the claim."]);
  });

  it("handles non-array policy fields safely",async()=>{
    setMockResponse(JSON.stringify({
      compliant:true,
      score:90,
      violations:"not-an-array",
      warnings:null,
      suggestions:"not-an-array",
    }));
    const result=await checkReplyPolicy({
      email:"Can you update my account?",
      reply:"Yes, you can update your account details.",
    });
    expect(result.compliant).toBe(true);
    expect(result.score).toBe(90);
    expect(result.violations).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.suggestions).toEqual([]);
  });

  it("does not flag sign-in instructions in a supported reply as an account-access request",async()=>{
    setMockResponse(JSON.stringify({
      compliant:true,
      score:100,
      violations:[],
      warnings:[],
      suggestions:[],
    }));
    const result=await checkReplyPolicy({
      email:"How do I update my account information?",
      reply:"Sign in to your account, open Account Settings, select Profile, select Edit, update the information, and save the changes.",
      knowledgeBase:[{
        title:"Updating Account Information",
        content:"Sign in to the account, open Account Settings, select Profile, select Edit, update the required information, and save the changes.",
        category:"account_management",
        tags:["account","profile"],
      }],
    });
    expect(result.warnings).not.toContain("Account access request requires careful verification before automatic handling.");
  });

  it("flags an actual account-access problem",async()=>{
    setMockResponse(JSON.stringify({
      compliant:true,
      score:75,
      violations:[],
      warnings:["Account access request requires careful verification before automatic handling."],
      suggestions:["Route the conversation to human review before sending an automatic response."],
    }));
    const result=await checkReplyPolicy({
      email:"I can't sign in to my account.",
      reply:"Please contact Customer Support for assistance.",
      knowledgeBase:[],
    });
    expect(result.warnings).toContain("Account access request requires careful verification before automatic handling.");
  });

  it("does not treat a normal account-information request as an account-access problem",async()=>{
    setMockResponse(JSON.stringify({
      compliant:true,
      score:100,
      violations:[],
      warnings:[],
      suggestions:[],
    }));
    const result=await checkReplyPolicy({
      email:"How can I change my profile information?",
      reply:"Open Account Settings, select Profile, select Edit, update your information, and save the changes.",
      knowledgeBase:[{
        title:"Updating Account Information",
        content:"Customers can update their account information from Account Settings.",
        category:"account_management",
        tags:["account","profile"],
      }],
    });
    expect(result.warnings).not.toContain("Account access request requires careful verification before automatic handling.");
  });

  it("flags a forgotten-password request",async()=>{
    setMockResponse(JSON.stringify({
      compliant:true,
      score:75,
      violations:[],
      warnings:["Account access request requires careful verification before automatic handling."],
      suggestions:["Route the conversation to human review before sending an automatic response."],
    }));
    const result=await checkReplyPolicy({
      email:"I forgot my password and cannot access my account.",
      reply:"Please contact Customer Support for assistance.",
      knowledgeBase:[],
    });
    expect(result.warnings).toContain("Account access request requires careful verification before automatic handling.");
  });

  it("throws when the AI returns invalid JSON",async()=>{
    setMockResponse("This is not valid JSON.");
    await expect(checkReplyPolicy({
      email:"Where is my order?",
      reply:"Your order is being processed.",
    })).rejects.toThrow("Policy checker returned invalid JSON.");
  });

  it("throws when the AI returns an empty response",async()=>{
    setMockResponse("");
    await expect(checkReplyPolicy({
      email:"Where is my order?",
      reply:"Your order is being processed.",
    })).rejects.toThrow("Policy checker returned an empty response.");
  });
});
