import {useState} from "react";
import API from "../../services/api.js";
import type {Tone} from "../../types/tone.js";
import type {ReplyLength} from "../LengthSelector.js";

interface Props{
  email:string;
  emailId:string;
  tone:Tone;
  length:ReplyLength;
  onGenerated:(reply:string)=>void;
}

export default function ReplyGenerator({email,emailId,tone,length,onGenerated}:Props){
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");

  async function generateReply(){
    if(!email.trim()){
      setError("Select an email first.");
      return;
    }

    if(!emailId.trim()){
      setError("The selected email could not be identified.");
      return;
    }

    try{
      setLoading(true);
      setError("");

      const response=await API.post("/reply",{
        email,
        emailId,
        tone,
        length,
      });

      const reply=response.data?.reply??"";

      if(!reply)throw new Error("The server returned an empty reply.");

      onGenerated(reply);
    }catch(error){
      setError(error instanceof Error?error.message:"Failed to generate reply.");
    }finally{
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <button type="button" onClick={generateReply} disabled={loading||!email.trim()||!emailId.trim()} className="rounded-lg bg-(--accent) px-4 py-2 text-sm font-medium text-(--accent-contrast) transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60">
        {loading?"Generating...":"Generate Reply"}
      </button>
      {error&&<p className="text-sm text-(--danger)">{error}</p>}
    </div>
  );
}
