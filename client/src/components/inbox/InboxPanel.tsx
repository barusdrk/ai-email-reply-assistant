import type {
RefObject,
} from "react";
import InboxList, {
type InboxEmail,
} from "../InboxList.js";

interface Props {
emails: InboxEmail[];
selectedEmailId?: string;
loading: boolean;
loadingMore: boolean;
hasMore: boolean;
scrollContainerRef:
RefObject<HTMLDivElement | null>;
onScroll: () => void;
onSelect: (
email: InboxEmail
) => void;
}

export default function InboxPanel({
emails,
selectedEmailId,
loading,
loadingMore,
hasMore,
scrollContainerRef,
onScroll,
onSelect,
}: Props) {
if (loading) {
return ( <p className="text-sm text-gray-500">
Loading inbox... </p>
);
}

return ( <div
   ref={scrollContainerRef}
   onScroll={onScroll}
   className="max-h-[calc(100vh-14rem)] overflow-y-auto pr-1"
 > <InboxList
     emails={emails}
     selectedEmailId={selectedEmailId}
     onSelect={onSelect}
   />

```
  <div className="min-h-16 py-4 text-center">
    {loadingMore && (
      <p className="text-sm text-gray-500">
        Loading more emails...
      </p>
    )}

    {!loadingMore && hasMore && (
      <p className="text-sm text-gray-400">
        Scroll down to load more
      </p>
    )}

    {!hasMore && emails.length > 0 && (
      <p className="text-sm text-gray-400">
        All emails loaded
      </p>
    )}

    {emails.length === 0 && (
      <p className="text-sm text-gray-500">
        No emails found.
      </p>
    )}
  </div>
</div>

);
}
