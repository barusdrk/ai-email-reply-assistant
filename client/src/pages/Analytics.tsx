import {useCallback,useEffect,useMemo,useState} from "react";
import {BarChart3,CheckCircle2,Clock3,RefreshCw,ShieldCheck,TrendingUp,UserRoundCheck,AlertTriangle,XCircle,Send} from "lucide-react";
import {getSupportAnalytics,type SupportAnalytics} from "../services/analytics.js";

function formatCategory(category:string):string{
  return category.replace(/_/g," ").replace(/\b\w/g,(character)=>character.toUpperCase());
}

function formatDateForInput(date:Date):string{
  const year=date.getFullYear();
  const month=String(date.getMonth()+1).padStart(2,"0");
  const day=String(date.getDate()).padStart(2,"0");
  return `${year}-${month}-${day}`;
}

function getDefaultFromDate():string{
  const date=new Date();
  date.setDate(date.getDate()-29);
  return formatDateForInput(date);
}

function getTodayDate():string{
  return formatDateForInput(new Date());
}

function MetricCard({label,value,description,icon:Icon}:{label:string;value:string|number;description:string;icon:typeof BarChart3}){
  return (
    <div className="rounded-xl border border-(--border) bg-(--surface) p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-(--text-secondary)">{label}</p>
          <p className="mt-2 text-3xl font-bold text-(--text-h)">{value}</p>
          <p className="mt-1 text-xs text-(--text-secondary)">{description}</p>
        </div>
        <div className="rounded-lg bg-(--surface-hover) p-3 text-(--accent)">
          <Icon className="h-5 w-5"/>
        </div>
      </div>
    </div>
  );
}

function ProgressBar({label,value,total,suffix=""}:{label:string;value:number;total:number;suffix?:string}){
  const percentage=total>0?Math.min(100,Math.max(0,value/total*100)):0;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-4 text-sm">
        <span className="text-(--text)">{label}</span>
        <span className="font-medium text-(--text-h)">{value}{suffix}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-(--surface-hover)">
        <div className="h-full rounded-full bg-(--accent) transition-all" style={{width:`${percentage}%`}}/>
      </div>
    </div>
  );
}

export default function Analytics(){
  const [analytics,setAnalytics]=useState<SupportAnalytics|null>(null);
  const [from,setFrom]=useState(getDefaultFromDate);
  const [to,setTo]=useState(getTodayDate);
  const [loading,setLoading]=useState(true);
  const [refreshing,setRefreshing]=useState(false);
  const [error,setError]=useState("");

  const loadAnalytics=useCallback(async(showRefreshState=false)=>{
    try{
      if(showRefreshState)setRefreshing(true);
      else setLoading(true);
      setError("");

      const result=await getSupportAnalytics({
        from:from?new Date(`${from}T00:00:00`).toISOString():undefined,
        to:to?new Date(`${to}T23:59:59.999`).toISOString():undefined,
      });

      setAnalytics(result);
    }catch(error){
      setError(error instanceof Error?error.message:"Failed to load support analytics.");
    }finally{
      setLoading(false);
      setRefreshing(false);
    }
  },[from,to]);

  useEffect(()=>{
    void loadAnalytics();
  },[loadAnalytics]);

  const summary=analytics?.summary;

  const outcomeTotal=useMemo(()=>{
    if(!summary)return 0;
    return summary.autoSent+summary.pendingApproval+summary.approved+summary.rejected+summary.escalated+summary.blocked+summary.failed;
  },[summary]);

  const maxCategoryCount=useMemo(()=>{
    if(!analytics||analytics.categories.length===0)return 1;
    return Math.max(...analytics.categories.map((item)=>item.count),1);
  },[analytics]);

  const maxConfidenceCount=useMemo(()=>{
    if(!analytics||analytics.confidence.length===0)return 1;
    return Math.max(...analytics.confidence.map((item)=>item.count),1);
  },[analytics]);

  if(loading){
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-(--text-h)">Analytics</h1>
          <p className="mt-2 text-(--text-secondary)">Loading support automation analytics...</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1,2,3,4].map((item)=>(
            <div key={item} className="h-32 animate-pulse rounded-xl border border-(--border) bg-(--surface)"/>
          ))}
        </div>
      </div>
    );
  }

  if(error&&!analytics){
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-(--text-h)">Analytics</h1>
          <p className="mt-2 text-(--text-secondary)">Support automation performance and workflow analytics.</p>
        </div>
        <div className="rounded-xl border border-(--danger) bg-(--error-bg) p-5 text-(--danger-text)">
          <p>{error}</p>
          <button
            type="button"
            onClick={()=>void loadAnalytics(true)}
            className="mt-4 rounded-lg bg-(--danger) px-4 py-2 text-sm font-medium text-(--danger-contrast) hover:opacity-90"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-(--text-h)">Analytics</h1>
          <p className="mt-2 text-(--text-secondary)">Monitor AI support automation, confidence, policy checks, and outcomes.</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm text-(--text-secondary)">
            From
            <input
              type="date"
              value={from}
              onChange={(event)=>setFrom(event.target.value)}
              className="rounded-lg border border-(--input-border) bg-(--input-bg) px-3 py-2 text-(--text) outline-none focus:border-(--accent) focus:ring-2 focus:ring-(--accent)"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-(--text-secondary)">
            To
            <input
              type="date"
              value={to}
              onChange={(event)=>setTo(event.target.value)}
              className="rounded-lg border border-(--input-border) bg-(--input-bg) px-3 py-2 text-(--text) outline-none focus:border-(--accent) focus:ring-2 focus:ring-(--accent)"
            />
          </label>
          <button
            type="button"
            onClick={()=>void loadAnalytics(true)}
            disabled={refreshing}
            className="flex items-center gap-2 rounded-lg bg-(--accent) px-4 py-2.5 text-sm font-medium text-(--accent-contrast) hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing?"animate-spin":""}`}/>
            {refreshing?"Refreshing...":"Refresh"}
          </button>
        </div>
      </div>

      {error&&(
        <div className="rounded-lg border border-(--danger) bg-(--error-bg) p-4 text-sm text-(--danger-text)">
          {error}
        </div>
      )}

      {summary&&(
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Total Requests"
              value={summary.total}
              description="Support requests processed"
              icon={BarChart3}
            />
            <MetricCard
              label="Automation Rate"
              value={`${summary.automationRate}%`}
              description="Automatically or successfully handled"
              icon={TrendingUp}
            />
            <MetricCard
              label="Auto Sent"
              value={summary.autoSent}
              description="High-confidence replies sent automatically"
              icon={Send}
            />
            <MetricCard
              label="Average Confidence"
              value={summary.averageConfidence===null?"—":`${summary.averageConfidence}`}
              description="Average AI confidence score"
              icon={CheckCircle2}
            />
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-(--border) bg-(--surface) p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <div className="rounded-lg bg-(--surface-hover) p-2 text-(--accent)">
                  <BarChart3 className="h-5 w-5"/>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-(--text-h)">Workflow Outcomes</h2>
                  <p className="text-sm text-(--text-secondary)">Final and intermediate support outcomes.</p>
                </div>
              </div>
              <div className="space-y-5">
                <ProgressBar label="Automatically Sent" value={summary.autoSent} total={outcomeTotal}/>
                <ProgressBar label="Pending Approval" value={summary.pendingApproval} total={outcomeTotal}/>
                <ProgressBar label="Human Approved" value={summary.approved} total={outcomeTotal}/>
                <ProgressBar label="Rejected" value={summary.rejected} total={outcomeTotal}/>
                <ProgressBar label="Escalated" value={summary.escalated} total={outcomeTotal}/>
                <ProgressBar label="Blocked" value={summary.blocked} total={outcomeTotal}/>
                <ProgressBar label="Failed" value={summary.failed} total={outcomeTotal}/>
              </div>
            </div>

            <div className="rounded-xl border border-(--border) bg-(--surface) p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <div className="rounded-lg bg-(--surface-hover) p-2 text-(--accent)">
                  <ShieldCheck className="h-5 w-5"/>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-(--text-h)">Confidence Distribution</h2>
                  <p className="text-sm text-(--text-secondary)">AI confidence levels used for automation decisions.</p>
                </div>
              </div>
              <div className="space-y-5">
                {analytics?.confidence.map((item)=>(
                  <ProgressBar
                    key={item.level}
                    label={`${item.level.charAt(0).toUpperCase()}${item.level.slice(1)} Confidence`}
                    value={item.count}
                    total={maxConfidenceCount}
                  />
                ))}
                {(!analytics||analytics.confidence.length===0)&&(
                  <p className="text-sm text-(--text-secondary)">No confidence data available for this period.</p>
                )}
              </div>
              <div className="mt-6 grid grid-cols-3 gap-3">
                <div className="rounded-lg border border-(--border) bg-(--surface-hover) p-3 text-center">
                  <p className="text-xs text-(--text-secondary)">High</p>
                  <p className="mt-1 text-xl font-bold text-(--text-h)">{summary.highConfidence}</p>
                </div>
                <div className="rounded-lg border border-(--border) bg-(--surface-hover) p-3 text-center">
                  <p className="text-xs text-(--text-secondary)">Medium</p>
                  <p className="mt-1 text-xl font-bold text-(--text-h)">{summary.mediumConfidence}</p>
                </div>
                <div className="rounded-lg border border-(--border) bg-(--surface-hover) p-3 text-center">
                  <p className="text-xs text-(--text-secondary)">Low</p>
                  <p className="mt-1 text-xl font-bold text-(--text-h)">{summary.lowConfidence}</p>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl border border-(--border) bg-(--surface) p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <div className="rounded-lg bg-(--surface-hover) p-2 text-(--accent)">
                  <BarChart3 className="h-5 w-5"/>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-(--text-h)">Support Categories</h2>
                  <p className="text-sm text-(--text-secondary)">Requests by support category.</p>
                </div>
              </div>
              <div className="space-y-5">
                {analytics?.categories.map((item)=>(
                  <ProgressBar
                    key={item.category}
                    label={formatCategory(item.category)}
                    value={item.count}
                    total={maxCategoryCount}
                  />
                ))}
                {(!analytics||analytics.categories.length===0)&&(
                  <p className="text-sm text-(--text-secondary)">No category data available for this period.</p>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-(--border) bg-(--surface) p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <div className="rounded-lg bg-(--surface-hover) p-2 text-(--accent)">
                  <ShieldCheck className="h-5 w-5"/>
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-(--text-h)">Policy & Review</h2>
                  <p className="text-sm text-(--text-secondary)">Safety and human-review indicators.</p>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-(--border) bg-(--surface-hover) p-5">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="h-5 w-5 text-(--accent)"/>
                    <span className="text-sm text-(--text-secondary)">Policy Violations</span>
                  </div>
                  <p className="mt-3 text-3xl font-bold text-(--text-h)">{summary.policyViolations}</p>
                </div>
                <div className="rounded-xl border border-(--border) bg-(--surface-hover) p-5">
                  <div className="flex items-center gap-3">
                    <UserRoundCheck className="h-5 w-5 text-(--accent)"/>
                    <span className="text-sm text-(--text-secondary)">Human Approved</span>
                  </div>
                  <p className="mt-3 text-3xl font-bold text-(--text-h)">{summary.approved}</p>
                </div>
                <div className="rounded-xl border border-(--border) bg-(--surface-hover) p-5">
                  <div className="flex items-center gap-3">
                    <Clock3 className="h-5 w-5 text-(--accent)"/>
                    <span className="text-sm text-(--text-secondary)">Pending Approval</span>
                  </div>
                  <p className="mt-3 text-3xl font-bold text-(--text-h)">{summary.pendingApproval}</p>
                </div>
                <div className="rounded-xl border border-(--border) bg-(--surface-hover) p-5">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-(--accent)"/>
                    <span className="text-sm text-(--text-secondary)">Escalated</span>
                  </div>
                  <p className="mt-3 text-3xl font-bold text-(--text-h)">{summary.escalated}</p>
                </div>
                <div className="rounded-xl border border-(--border) bg-(--surface-hover) p-5">
                  <div className="flex items-center gap-3">
                    <XCircle className="h-5 w-5 text-(--accent)"/>
                    <span className="text-sm text-(--text-secondary)">Rejected</span>
                  </div>
                  <p className="mt-3 text-3xl font-bold text-(--text-h)">{summary.rejected}</p>
                </div>
                <div className="rounded-xl border border-(--border) bg-(--surface-hover) p-5">
                  <div className="flex items-center gap-3">
                    <RefreshCw className="h-5 w-5 text-(--accent)"/>
                    <span className="text-sm text-(--text-secondary)">Failed Sends</span>
                  </div>
                  <p className="mt-3 text-3xl font-bold text-(--text-h)">{summary.failed}</p>
                </div>
              </div>
            </div>
          </section>
        </>
      )}

      {!summary&&(
        <div className="rounded-xl border border-(--border) bg-(--surface) p-8 text-center text-(--text-secondary)">
          No analytics data is available for this period.
        </div>
      )}
    </div>
  );
}
