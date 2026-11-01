import {useEffect,useState} from "react";
import API from "../../services/api.js";

type HubSpotStatus={connected:boolean;account?:{hubId:string;connected:boolean;connectedAt?:string;expiresAt?:string}|null;};

function getErrorMessage(error:unknown,fallback:string):string{
  if(typeof error==="object"&&error!==null&&"response" in error){
    const response=(error as {response?:{data?:{message?:string}}}).response;
    if(response?.data?.message)return response.data.message;
  }
  return error instanceof Error?error.message:fallback;
}

export default function HubSpotIntegrationCard(){
  const [status,setStatus]=useState<HubSpotStatus|null>(null);
  const [loading,setLoading]=useState(false);
  const [statusLoading,setStatusLoading]=useState(true);
  const [error,setError]=useState("");

  async function loadStatus(){
    try{setStatusLoading(true);setError("");const response=await API.get<HubSpotStatus>("/crm/hubspot/status");setStatus(response.data);}
    catch(error){setError(getErrorMessage(error,"Failed to load HubSpot connection status."));}
    finally{setStatusLoading(false);}
  }

  async function connectHubSpot(){
    const width=600,height=750,left=window.screenX+(window.outerWidth-width)/2,top=window.screenY+(window.outerHeight-height)/2;
    const popup=window.open("about:blank","hubspot-oauth",`width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`);
    try{
      setLoading(true);setError("");
      const response=await API.get<{authorizationUrl?:string}>("/crm/hubspot/connect");
      const authorizationUrl=response.data.authorizationUrl;
      if(!authorizationUrl)throw new Error("HubSpot did not return an authorization URL.");
      if(popup&&!popup.closed)popup.location.href=authorizationUrl;else window.location.assign(authorizationUrl);
    }catch(error){if(popup&&!popup.closed)popup.close();setError(getErrorMessage(error,"Failed to start HubSpot connection."));}
    finally{setLoading(false);}
  }

  async function disconnectHubSpot(){
    try{setLoading(true);setError("");await API.post("/crm/hubspot/disconnect");await loadStatus();}
    catch(error){setError(getErrorMessage(error,"Failed to disconnect HubSpot."));}
    finally{setLoading(false);}
  }

  useEffect(()=>{
    void loadStatus();
    function handleMessage(event:MessageEvent){if(event.origin!==window.location.origin||!event.data||event.data.type!=="hubspot-oauth-success")return;void loadStatus();}
    window.addEventListener("message",handleMessage);
    return ()=>window.removeEventListener("message",handleMessage);
  },[]);

  return (
    <div className="rounded-xl border border-(--border) bg-(--surface) p-5">
      <div className="mb-5"><h2 className="text-lg font-semibold text-(--text-h)">CRM integrations</h2><p className="mt-1 text-sm text-(--text-secondary)">Connect HubSpot to use customer and company information when generating support replies.</p></div>
      {statusLoading?<p className="text-sm text-(--text-secondary)">Checking HubSpot connection...</p>:(
        <div className="rounded-lg border border-(--border) p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${status?.connected?"bg-emerald-500":"bg-gray-400"}`}/><h3 className="font-medium text-(--text-h)">HubSpot</h3></div>
              <p className="mt-1 text-sm text-(--text-secondary)">{status?.connected?`Connected${status.account?.hubId?` · Portal ${status.account.hubId}`:""}`:"Not connected"}</p>
              {status?.connected&&status.account?.connectedAt&&<p className="mt-1 text-xs text-(--text-secondary)">Connected {new Date(status.account.connectedAt).toLocaleString()}</p>}
            </div>
            {status?.connected?<button type="button" onClick={()=>void disconnectHubSpot()} disabled={loading} className="rounded-lg bg-(--accent) px-4 py-2 text-sm font-medium text-(--text-h) transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60">{loading?"Disconnecting...":"Disconnect HubSpot"}</button>:<button type="button" onClick={()=>void connectHubSpot()} disabled={loading} className="rounded-lg bg-(--accent) px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60">{loading?"Connecting...":"Connect HubSpot"}</button>}
          </div>
          {status?.connected&&<div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="rounded-lg bg-(--bg-secondary) p-3"><p className="text-xs font-medium uppercase tracking-wide text-(--text-secondary)">Contacts</p><p className="mt-1 text-sm font-medium text-(--text-h)">Read access enabled</p></div><div className="rounded-lg bg-(--bg-secondary) p-3"><p className="text-xs font-medium uppercase tracking-wide text-(--text-secondary)">Companies</p><p className="mt-1 text-sm font-medium text-(--text-h)">Read access enabled</p></div></div>}
          {error&&<div className="mt-4 rounded-lg border border-(--danger-text) bg-(--danger-bg) p-3 text-sm text-(--danger-text)" role="alert">{error}</div>}
        </div>
      )}
    </div>
  );
}
