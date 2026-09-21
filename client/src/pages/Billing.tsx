import {useEffect,useState} from "react";
import {
  cancelSubscription,
  changePlan,
  createCheckout,
  getSubscription,
  requestBusinessSales,
  type Plan,
  type Subscription,
} from "../services/billing.js";

const aiProviders=["OpenAI","Gemini","Groq","Claude"];

const plans:{
  id:Plan;
  name:string;
  price:string;
  replies:string;
  description:string;
  features:string[];
}[]=[
  {
    id:"free",
    name:"Free",
    price:"$0",
    replies:"100 replies / month",
    description:"Try AI-powered customer support automation.",
    features:[
      "100 AI replies per month",
      "Choose from OpenAI, Gemini, Groq, or Claude",
      "Manual draft generation",
      "Approval workflow",
    ],
  },
  {
    id:"starter",
    name:"Starter",
    price:"$19",
    replies:"1,000 replies / month",
    description:"For small teams automating everyday support.",
    features:[
      "1,000 AI replies per month",
      "Choose from OpenAI, Gemini, Groq, or Claude",
      "Auto drafts",
      "Gmail and Outlook integrations",
      "Approval workflow",
      "Conversation memory",
    ],
  },
  {
    id:"pro",
    name:"Pro",
    price:"$59",
    replies:"10,000 replies / month",
    description:"For growing support teams with advanced automation.",
    features:[
      "10,000 AI replies per month",
      "Choose from OpenAI, Gemini, Groq, or Claude",
      "Automatic support handling",
      "Priority processing",
      "Advanced escalation workflows",
      "CRM and customer context",
      "Advanced analytics",
    ],
  },
  {
    id:"business",
    name:"Business",
    price:"$149+",
    replies:"Custom support volume",
    description:"For organizations with complex support operations.",
    features:[
      "Custom support volume",
      "Multiple support inboxes",
      "CRM and customer context",
      "Conversation memory",
      "Advanced escalation workflows",
      "Custom policies and automation",
      "Business-level analytics",
      "Dedicated support",
    ],
  },
];

export default function Billing(){
  const [subscription,setSubscription]=useState<Subscription|null>(null);
  const [loading,setLoading]=useState(true);
  const [changingPlan,setChangingPlan]=useState<Plan|null>(null);
  const [error,setError]=useState("");
  const [businessRequested,setBusinessRequested]=useState(false);

  useEffect(()=>{
    async function loadSubscription(){
      try{
        setLoading(true);
        setError("");
        const data=await getSubscription();
        setSubscription(data);
      }catch(error){
        setError(
          error instanceof Error
            ?error.message
            :"Failed to load billing information."
        );
      }finally{
        setLoading(false);
      }
    }

    void loadSubscription();
  },[]);

  async function handleChangePlan(plan:Plan){
    if(subscription?.plan===plan)return;

    try{
      setChangingPlan(plan);
      setError("");

      if(plan==="free"){
        const updated=await changePlan("free");
        setSubscription(updated);
        return;
      }

      if(plan==="business"){
        await requestBusinessSales();
        setBusinessRequested(true);
        return;
      }

      const checkout=await createCheckout(plan);
      window.location.href=checkout.url;
    }catch(error){
      setError(
        error instanceof Error
          ?error.message
          :"Failed to update plan."
      );
    }finally{
      setChangingPlan(null);
    }
  }

  async function handleCancel(){
    try{
      setChangingPlan(subscription?.plan??"free");
      setError("");

      const updated=await cancelSubscription();
      setSubscription(updated);
    }catch(error){
      setError(
        error instanceof Error
          ?error.message
          :"Failed to cancel subscription."
      );
    }finally{
      setChangingPlan(null);
    }
  }

  if(loading){
    return (
      <div className="p-6 text-(--text)">
        Loading billing information...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-(--text-h)">
          Billing
        </h1>
        <p className="mt-2 text-(--text-secondary)">
          Choose the plan that fits your customer support operation.
        </p>
      </div>

      {error&&(
        <div className="rounded-lg border border-(--danger-bg) bg-(--danger-bg) p-4 text-(--danger-text)">
          {error}
        </div>
      )}

      {businessRequested&&(
        <div className="rounded-lg border border-(--accent) bg-(--accent-light) p-4 text-(--accent)">
          Your Business sales request has been received. We will contact you to discuss your requirements and pricing.
        </div>
      )}

      <div className="rounded-xl border border-(--border) bg-(--surface) p-6 shadow-sm">
        <p className="text-sm text-(--text-secondary)">
          Current plan
        </p>

        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h2 className="text-2xl font-bold capitalize text-(--text-h)">
            {subscription?.plan??"free"}
          </h2>

          <span className="rounded-full bg-(--info-bg) px-3 py-1 text-sm font-medium text-(--info-text)">
            {subscription?.status??"active"}
          </span>
        </div>

        {subscription?.plan!=="free"&&(
          <button
            type="button"
            onClick={()=>void handleCancel()}
            disabled={changingPlan!==null}
            className="mt-5 rounded-lg border border-(--danger-text) px-4 py-2 text-(--danger-text) hover:bg-(--danger-bg) disabled:cursor-not-allowed disabled:opacity-50"
          >
            {changingPlan?"Updating...":"Cancel Subscription"}
          </button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
        {plans.map(plan=>{
          const current=subscription?.plan===plan.id;
          const processing=changingPlan===plan.id;

          return (
            <section
              key={plan.id}
              className={`rounded-xl border bg-(--surface) p-6 shadow-sm ${
                current
                  ?"border-(--accent) ring-2 ring-(--accent-light)"
                  :"border-(--border)"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-(--text-h)">
                    {plan.name}
                  </h2>

                  <p className="mt-2 text-3xl font-bold text-(--text-h)">
                    {plan.price}
                    <span className="text-sm font-normal text-(--text-secondary)">
                      {plan.id==="free"?"":" / month"}
                    </span>
                  </p>

                  <p className="mt-2 text-sm text-(--text-secondary)">
                    {plan.description}
                  </p>
                </div>

                {current&&(
                  <span className="rounded-full bg-(--accent-light) px-3 py-1 text-xs font-semibold text-(--accent)">
                    Current Plan
                  </span>
                )}
              </div>

              <div className="mt-6 space-y-3 text-sm">
                <p className="font-medium text-(--text)">
                  {plan.replies}
                </p>

                {plan.id!=="business"&&(
                  <div>
                    <p className="font-medium text-(--text)">
                      Available AI providers
                    </p>

                    <div className="mt-2 flex flex-wrap gap-2">
                      {aiProviders.map(provider=>(
                        <span
                          key={provider}
                          className="rounded-full bg-(--accent-light) px-3 py-1 text-xs font-medium text-(--accent)"
                        >
                          {provider}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <ul className="mt-6 space-y-3">
                {plan.features.map(feature=>(
                  <li
                    key={feature}
                    className="flex gap-2 text-sm text-(--text-secondary)"
                  >
                    <span className="font-bold text-(--info-text)">
                      ✓
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={()=>void handleChangePlan(plan.id)}
                disabled={
                  current||
                  changingPlan!==null||
                  (plan.id==="business"&&businessRequested)
                }
                className={`mt-8 w-full rounded-lg px-4 py-3 font-medium disabled:cursor-not-allowed disabled:opacity-50 ${
                  current
                    ?"bg-(--bg-secondary) text-(--text-secondary)"
                    :plan.id==="business"||plan.id==="pro"
                      ?"bg-(--accent) text-(--accent-contrast) hover:opacity-90"
                      :"border border-(--accent) text-(--accent) hover:bg-(--accent-light)"
                }`}
              >
                {processing
                  ?"Updating..."
                  :current
                    ?"Current Plan"
                    :plan.id==="free"
                      ?"Downgrade to Free"
                      :plan.id==="business"
                        ?businessRequested
                          ?"Sales Request Sent"
                          :"Contact Sales"
                        :`Choose ${plan.name}`}
              </button>
            </section>
          );
        })}
      </div>
    </div>
  );
}
