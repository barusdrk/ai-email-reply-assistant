import { downloadPdf } from "../utils/downloadPdf";
import { downloadDocx } from "../utils/downloadDocx";

interface ReplyCardProps {
  reply: string;
  loading?: boolean;
  onApprove?: () => void;
  onSend?: () => void;
}

export default function ReplyCard({
  reply,
  loading = false,
  onApprove,
  onSend,
}: ReplyCardProps) {
  async function copyReply() {
    await navigator.clipboard.writeText(reply);
  }

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-300 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <p className="animate-pulse text-gray-500">
          Generating AI reply...
        </p>
      </div>
    );
  }

  if (!reply) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-gray-500 dark:border-gray-700 dark:text-gray-400">
        AI reply will appear here.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-300 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="border-b border-gray-200 px-6 py-4 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          AI Reply
        </h2>
      </div>

      <div className="whitespace-pre-wrap px-6 py-5 text-gray-800 dark:text-gray-100">
        {reply}
      </div>

      <div className="flex flex-wrap gap-3 border-t border-gray-200 px-6 py-4 dark:border-gray-700">
        <button
          onClick={copyReply}
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Copy
        </button>

        <button
          onClick={() => downloadPdf({ customerEmail: "", reply })}
          className="rounded bg-gray-700 px-4 py-2 text-white hover:bg-gray-800"
        >
          Download PDF
        </button>

        <button
          onClick={() => downloadDocx({ customerEmail: "", reply })}
          className="rounded bg-gray-700 px-4 py-2 text-white hover:bg-gray-800"
        >
          Download DOCX
        </button>

        {onApprove && (
          <button
            onClick={onApprove}
            className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700"
          >
            Approve
          </button>
        )}

        {onSend && (
          <button
            onClick={onSend}
            className="rounded bg-purple-600 px-4 py-2 text-white hover:bg-purple-700"
          >
            Send Email
          </button>
        )}
      </div>
    </div>
  );
}
