interface Props {
syncing: boolean;
loadingSamples: boolean;
onSync: () => void;
onLoadSamples: () => void;
}

export default function InboxActions({
syncing,
loadingSamples,
onSync,
onLoadSamples,
}: Props) {
const disabled =
syncing || loadingSamples;

return ( <div className="space-y-3"> <button
     type="button"
     onClick={onSync}
     disabled={disabled}
     className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
   >
{syncing
? "Syncing..."
: "Sync Gmail & Outlook"} </button>

  <button
    type="button"
    onClick={onLoadSamples}
    disabled={disabled}
    className="w-full rounded-lg border border-blue-600 px-4 py-2 font-medium text-blue-600 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-950"
  >
    {loadingSamples
      ? "Loading Samples..."
      : "Load Sample Emails"}
  </button>
</div>

);
}
