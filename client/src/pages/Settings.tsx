import {useEffect,useState} from "react";
import ProfileCard from "../components/settings/ProfileCard.js";
import AppearanceCard from "../components/settings/AppearanceCard.js";
import SignatureCard from "../components/settings/SignatureCard.js";
import ConnectedAccountsCard from "../components/settings/ConnectedAccountsCard.js";
import NotificationsCard from "../components/settings/NotificationsCard.js";
import SecurityCard from "../components/settings/SecurityCard.js";
import DangerZoneCard from "../components/settings/DangerZoneCard.js";
import ToneSelector from "../components/ToneSelector.js";
import LengthSelector from "../components/LengthSelector.js";
import ProviderSelector from "../components/ProviderSelector.js";
import {getSettings,updateSettings,type AISettings} from "../services/settings.js";
import {getConnections,setActiveProvider,connectGmail,connectOutlook,disconnectGmail,disconnectOutlook,type EmailProvider} from "../services/accounts.js";
import {getMe,updateProfile,changePassword,deleteAccount,type UserProfile} from "../services/users.js";
import type {ReplyLength} from "../components/LengthSelector.js";
import HubSpotIntegrationCard from "../components/settings/HubSpotIntegrationCard.js";
import {useAuth} from "../context/AuthContext.js";

export default function Settings(){
  const {refreshUser}=useAuth();
  const [settings,setSettings]=useState<AISettings|null>(null);
  const [user,setUser]=useState<UserProfile|null>(null);
  const [gmailConnected,setGmailConnected]=useState(false);
  const [outlookConnected,setOutlookConnected]=useState(false);
  const [activeEmailProvider,setActiveEmailProvider]=useState<EmailProvider|null>(null);
  const [providerSaving,setProviderSaving]=useState(false);
  const [error,setError]=useState("");

  useEffect(()=>{
    async function load(){
      try{
        setError("");
        const [loadedSettings,connections,loadedUser]=await Promise.all([getSettings(),getConnections(),getMe()]);
        setSettings(loadedSettings);
        setUser(loadedUser);
        setGmailConnected(connections.gmail);
        setOutlookConnected(connections.outlook);
        setActiveEmailProvider(connections.activeProvider);
      }catch(error){
        setError(error instanceof Error?error.message:"Failed to load settings.");
      }
    }
    void load();
  },[]);

  async function save(data:Partial<AISettings>){
    if(!settings)return;
    const previousSettings=settings;
    setSettings({...settings,...data});
    try{
      const updated=await updateSettings(data);
      setSettings(updated);
      setError("");
    }catch(error){
      setSettings(previousSettings);
      setError(error instanceof Error?error.message:"Failed to update settings.");
    }
  }

  async function saveProfile(data:Partial<Pick<UserProfile,"name"|"email"|"avatar">>){
    try{
      const updated=await updateProfile(data);
      setUser(updated);
      await refreshUser();
      setError("");
    }catch(error){
      setError(error instanceof Error?error.message:"Failed to update profile.");
    }
  }

  async function handleEmailProvider(provider:EmailProvider){
    try{
      setProviderSaving(true);
      await setActiveProvider(provider);
      setActiveEmailProvider(provider);
      setError("");
    }catch(error){
      setError(error instanceof Error?error.message:"Failed to select email provider.");
    }finally{
      setProviderSaving(false);
    }
  }

  async function handleGmail(){
    try{
      if(gmailConnected){
        await disconnectGmail();
        setGmailConnected(false);
        if(activeEmailProvider==="gmail")setActiveEmailProvider(null);
        return;
      }
      await connectGmail();
    }catch(error){
      setError(error instanceof Error?error.message:"Failed to connect Gmail.");
    }
  }

  async function handleOutlook(){
    try{
      if(outlookConnected){
        await disconnectOutlook();
        setOutlookConnected(false);
        if(activeEmailProvider==="outlook")setActiveEmailProvider(null);
        return;
      }
      await connectOutlook();
    }catch(error){
      setError(error instanceof Error?error.message:"Failed to connect Outlook.");
    }
  }

  async function handleDeleteAccount(){
    try{
      await deleteAccount();
      localStorage.removeItem("token");
      window.location.href="/login";
    }catch(error){
      setError(error instanceof Error?error.message:"Failed to delete account.");
    }
  }

  if(error&&!settings){
    return <div className="p-6 text-(--danger-text)">{error}</div>;
  }

  if(!settings||!user){
    return <div className="p-6 text-(--text)">Loading settings...</div>;
  }

  const lengthValue:ReplyLength=settings.defaultLength;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-(--text-h)">Settings</h1>

      {error&&(
        <div className="rounded-lg border border-(--danger-text) bg-(--danger-bg) p-3 text-sm text-(--danger-text)">
          {error}
        </div>
      )}

      <ProfileCard name={user.name} email={user.email} avatar={user.avatar??""} onSave={saveProfile}/>
      <AppearanceCard/>

      <div className="grid gap-4 md:grid-cols-3">
        <ProviderSelector value={settings.provider} onChange={(provider)=>void save({provider})}/>
        <ToneSelector value={settings.defaultReplyTone} onChange={(value)=>{if(value!=="default")void save({defaultReplyTone:value});}} label="Default Reply Tone"/>
        <LengthSelector value={lengthValue} onChange={(defaultLength)=>{if(defaultLength!=="default")void save({defaultLength});}} label="Default Reply Length"/>
      </div>

      <SignatureCard value={settings.signature??""} onChange={(signature)=>void save({signature})}/>

      <ConnectedAccountsCard
        gmailConnected={gmailConnected}
        outlookConnected={outlookConnected}
        onConnectGmail={handleGmail}
        onConnectOutlook={handleOutlook}
      />

      <HubSpotIntegrationCard/>

      <div className="rounded-xl border border-(--border) bg-(--surface) p-5">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-(--text-h)">Email sending provider</h2>
          <p className="mt-1 text-sm text-(--text-secondary)">
            Choose which connected account to use when sending emails.
            Replies are sent through the selected Gmail or Outlook account.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {[
            {name:"Gmail",provider:"gmail" as const,connected:gmailConnected},
            {name:"Outlook",provider:"outlook" as const,connected:outlookConnected},
          ].map(({name,provider,connected})=>{
            const active=activeEmailProvider===provider;
            return (
              <div key={provider} className="rounded-lg border border-(--border) p-4">
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${connected?"bg-emerald-500":"bg-gray-400"}`}/>
                  <h3 className="font-medium text-(--text-h)">{name}</h3>
                </div>
                <p className="mt-1 text-sm text-(--text-secondary)">
                  {connected?(active?"Connected · Active sending provider":"Connected"):"Not connected"}
                </p>
                <button
                  type="button"
                  disabled={!connected||providerSaving||active}
                  onClick={()=>void handleEmailProvider(provider)}
                  className="mt-4 w-full rounded-lg bg-(--accent) px-4 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {providerSaving&&!active?"Selecting...":active?`${name} selected`:`Use ${name}`}
                </button>
              </div>
            );
          })}
        </div>

        {!activeEmailProvider&&(
          <p className="mt-3 text-sm text-amber-600 dark:text-amber-400">
            Select a connected provider before sending emails.
          </p>
        )}
      </div>

      <NotificationsCard
        emailNotifications={settings.emailNotifications}
        onEmailNotificationsChange={(emailNotifications)=>void save({emailNotifications})}
        desktopNotifications={settings.desktopNotifications}
        onDesktopNotificationsChange={(desktopNotifications)=>void save({desktopNotifications})}
      />

      <SecurityCard onChangePassword={async(currentPassword,newPassword)=>{await changePassword(currentPassword,newPassword);}}/>
      <DangerZoneCard onDeleteAccount={handleDeleteAccount}/>
    </div>
  );
}
