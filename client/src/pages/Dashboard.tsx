import {useEffect,useState} from "react";
import {Link} from "react-router-dom";
import {
  Activity,
  Bot,
  CheckCircle2,
  Clock3,
  MessageSquare,
  ShieldAlert,
  UserCheck,
  Users,
  XCircle,
} from "lucide-react";
import {getDashboardStats} from "../services/api.js";
import type {DashboardStats} from "../types/dashboard.js";

const emptyStats:DashboardStats={
  totalConversations:0,
  aiGeneratedReplies:0,
  automaticallyHandled:0,
  humanApprovals:0,
  escalations:0,
  blockedResponses:0,
  averageResponseTimeMinutes:0,
  aiConfidence:0,
  approvalRate:0,
  automationRate:0,
  supportVolume:[],
  topSupportCategories:[],
};

function formatCategory(category:string):string{
  return category
    .replace(/_/g," ")
    .replace(/\b\w/g,(character)=>character.toUpperCase());
}

function formatResponseTime(minutes:number):string{
  if(minutes<60){
    return `${minutes.toFixed(1)} min`;
  }
  const hours=minutes/60;
  return `${hours.toFixed(1)} hr`;
}

export default function Dashboard(){
  const [stats,setStats]=useState<DashboardStats>(emptyStats);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");

  useEffect(()=>{
    async function loadDashboard(){
      try{
        setLoading(true);
        setError("");
        const data=await getDashboardStats();
        setStats(data);
      }catch(error){
        setError(
          error instanceof Error
            ? error.message
            : "Failed to load dashboard."
        );
      }finally{
        setLoading(false);
      }
    }

    void loadDashboard();
  },[]);

  const overviewCards=[
    {
      label:"Conversations",
      value:stats.totalConversations,
      icon:MessageSquare,
      description:"Customer conversations",
    },
    {
      label:"AI Generated",
      value:stats.aiGeneratedReplies,
      icon:Bot,
      description:"AI-generated replies",
    },
    {
      label:"AI Handled",
      value:stats.automaticallyHandled,
      icon:CheckCircle2,
      description:"Automatically handled",
    },
    {
      label:"Human Review",
      value:stats.humanApprovals,
      icon:UserCheck,
      description:"Approved by humans",
    },
    {
      label:"Escalated",
      value:stats.escalations,
      icon:ShieldAlert,
      description:"Requires escalation",
    },
    {
      label:"Blocked",
      value:stats.blockedResponses,
      icon:XCircle,
      description:"Blocked responses",
    },
  ];

  const performanceCards=[
    {
      label:"Automation Rate",
      value:`${stats.automationRate.toFixed(1)}%`,
      icon:Activity,
      description:"Conversations handled automatically",
    },
    {
      label:"Approval Rate",
      value:`${stats.approvalRate.toFixed(1)}%`,
      icon:UserCheck,
      description:"Human-reviewed replies approved",
    },
    {
      label:"AI Confidence",
      value:`${stats.aiConfidence.toFixed(1)}%`,
      icon:Bot,
      description:"Average AI confidence",
    },
    {
      label:"Avg. Response Time",
      value:formatResponseTime(stats.averageResponseTimeMinutes),
      icon:Clock3,
      description:"Customer message to sent reply",
    },
  ];

  const maxVolume=Math.max(
    ...stats.supportVolume.map(item=>item.count),
    1
  );

  const maxCategory=Math.max(
    ...stats.topSupportCategories.map(item=>item.count),
    1
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-(--text-h)">
          Customer Support Automation
        </h1>
        <p className="mt-2 text-(--text-secondary)">
          Monitor AI support performance, automation, and human review activity.
        </p>
      </div>

      {error&&(
        <div className="rounded-lg border border-(--danger-text) bg-(--danger-bg) p-4 text-(--danger-text)">
          {error}
        </div>
      )}

      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-(--text-h)">
              Support Overview
            </h2>
            <p className="mt-1 text-sm text-(--text-secondary)">
              Current customer-support activity.
            </p>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {overviewCards.map((card)=>{
            const Icon=card.icon;

            return(
              <div
                key={card.label}
                className="rounded-xl border border-(--border) bg-(--surface) p-6 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div className="rounded-lg bg-(--bg-secondary) p-3">
                    <Icon className="h-5 w-5 text-(--accent)" />
                  </div>
                </div>

                <div className="mt-5">
                  <div className="text-3xl font-bold text-(--text-h)">
                    {loading?"...":card.value.toLocaleString()}
                  </div>
                  <div className="mt-1 font-medium text-(--text-h)">
                    {card.label}
                  </div>
                  <div className="mt-1 text-sm text-(--text-secondary)">
                    {card.description}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-(--text-h)">
            Automation Performance
          </h2>
          <p className="mt-1 text-sm text-(--text-secondary)">
            Key indicators for AI-assisted support operations.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {performanceCards.map((card)=>{
            const Icon=card.icon;

            return(
              <div
                key={card.label}
                className="rounded-xl border border-(--border) bg-(--surface) p-6 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-(--bg-secondary) p-3">
                    <Icon className="h-5 w-5 text-(--accent)" />
                  </div>
                  <span className="font-medium text-(--text-secondary)">
                    {card.label}
                  </span>
                </div>

                <div className="mt-5 text-3xl font-bold text-(--text-h)">
                  {loading?"...":card.value}
                </div>

                <p className="mt-2 text-sm text-(--text-secondary)">
                  {card.description}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-xl border border-(--border) bg-(--surface) p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-(--bg-secondary) p-3">
              <Activity className="h-5 w-5 text-(--accent)" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-(--text-h)">
                Support Volume
              </h2>
              <p className="text-sm text-(--text-secondary)">
                Customer messages over the last 7 days.
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {loading?(
              <div className="text-sm text-(--text-secondary)">
                Loading support volume...
              </div>
            ):stats.supportVolume.length===0?(
              <div className="text-sm text-(--text-secondary)">
                No support volume data available.
              </div>
            ):(
              stats.supportVolume.map((item)=>{
                const percentage=(item.count/maxVolume)*100;

                return(
                  <div key={item.date}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="text-(--text-secondary)">
                        {new Date(`${item.date}T00:00:00`).toLocaleDateString(
                          undefined,
                          {weekday:"short",month:"short",day:"numeric"}
                        )}
                      </span>
                      <span className="font-medium text-(--text-h)">
                        {item.count.toLocaleString()}
                      </span>
                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-(--bg-secondary)">
                      <div
                        className="h-full rounded-full bg-(--accent)"
                        style={{width:`${percentage}%`}}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="rounded-xl border border-(--border) bg-(--surface) p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-(--bg-secondary) p-3">
              <Users className="h-5 w-5 text-(--accent)" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-(--text-h)">
                Top Support Categories
              </h2>
              <p className="text-sm text-(--text-secondary)">
                Most common customer-support topics.
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-5">
            {loading?(
              <div className="text-sm text-(--text-secondary)">
                Loading categories...
              </div>
            ):stats.topSupportCategories.length===0?(
              <div className="text-sm text-(--text-secondary)">
                No support category data available.
              </div>
            ):(
              stats.topSupportCategories.map((item)=>{
                const percentage=(item.count/maxCategory)*100;

                return(
                  <div key={item.category}>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="font-medium text-(--text-h)">
                        {formatCategory(item.category)}
                      </span>
                      <span className="text-sm text-(--text-secondary)">
                        {item.count.toLocaleString()}
                      </span>
                    </div>

                    <div className="h-2 overflow-hidden rounded-full bg-(--bg-secondary)">
                      <div
                        className="h-full rounded-full bg-(--accent)"
                        style={{width:`${percentage}%`}}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-(--border) bg-(--surface) p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-(--text-h)">
          Quick Actions
        </h2>
        <p className="mt-1 text-sm text-(--text-secondary)">
          Continue managing customer-support operations.
        </p>

        <div className="mt-5 flex flex-wrap gap-4">
          <Link
            to="/inbox"
            className="rounded-lg bg-(--accent) px-5 py-3 text-(--accent-contrast) hover:opacity-90"
          >
            Open Inbox
          </Link>

          <Link
            to="/drafts"
            className="rounded-lg bg-(--warning) px-5 py-3 text-(--warning-contrast) hover:opacity-90"
          >
            View Drafts
          </Link>

          <Link
            to="/approvals"
            className="rounded-lg bg-(--info) px-5 py-3 text-(--accent-contrast) hover:opacity-90"
          >
            Review Approvals
          </Link>

          <Link
            to="/settings"
            className="rounded-lg bg-(--settings) px-5 py-3 text-(--accent-contrast) hover:opacity-90"
          >
            Settings
          </Link>
        </div>
      </section>
    </div>
  );
}
