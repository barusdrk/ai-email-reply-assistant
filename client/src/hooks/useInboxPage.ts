import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { InboxEmail } from "../components/InboxList.js";
import type { EmailData } from "../components/EmailViewer.js";
import {
  getInbox,
  loadSampleEmails,
  syncInbox,
  type ApiEmail,
} from "../services/emails.js";

const PAGE_SIZE = 50;

function mapEmail(email: ApiEmail): InboxEmail {
  return {
    id: email._id ?? email.id ?? "",
    from: email.from ?? "",
    subject: email.subject ?? "",
    preview: email.preview ?? "",
    body: email.body ?? "",
    receivedAt: email.receivedAt ?? email.createdAt ?? "",
    unread: email.unread ?? false,
    provider: email.provider,
  };
}

export function useInboxPage() {
  const [emails, setEmails] = useState<InboxEmail[]>([]);
  const [selected, setSelected] = useState<InboxEmail>();
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [loadingSamples, setLoadingSamples] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const scrollToTop = useCallback(() => {
    scrollContainerRef.current?.scrollTo({
      top: 0,
      behavior: "auto",
    });
  }, []);

  const loadPage = useCallback(
    async (nextPage: number, append = false) => {
      const data = await getInbox(nextPage, PAGE_SIZE);
      const nextEmails = (data.emails ?? [])
        .map(mapEmail)
        .filter((email) => Boolean(email.id));

      setEmails((current) => {
        if (!append) {
          return nextEmails;
        }

        const ids = new Set(current.map((email) => email.id));

        return [
          ...current,
          ...nextEmails.filter(
            (email) => !ids.has(email.id)
          ),
        ];
      });

      setPage(data.page ?? nextPage);
      setHasMore(data.hasMore ?? false);
    },
    []
  );

  const refresh = useCallback(async () => {
    setPage(1);
    setHasMore(false);
    await loadPage(1);
    scrollToTop();
  }, [loadPage, scrollToTop]);

  const loadMore = useCallback(async () => {
    if (
      loading ||
      syncing ||
      loadingSamples ||
      loadingMore ||
      !hasMore
    ) {
      return;
    }

    setLoadingMore(true);

    try {
      await loadPage(page + 1, true);
    } catch (error) {
      console.error("Failed to load more emails:", error);
    } finally {
      setLoadingMore(false);
    }
  }, [
    hasMore,
    loadPage,
    loading,
    loadingMore,
    loadingSamples,
    page,
    syncing,
  ]);

  const sync = useCallback(async () => {
    setSyncing(true);
    setLoadingMore(false);

    try {
      await syncInbox();
      await refresh();
    } catch (error) {
      console.error("Inbox sync failed:", error);
      await refresh();
    } finally {
      setSyncing(false);
    }
  }, [refresh]);

  const loadSamples = useCallback(async () => {
    setLoadingSamples(true);
    setLoadingMore(false);

    try {
      await loadSampleEmails();
      await refresh();
    } catch (error) {
      console.error("Failed to load sample emails:", error);
    } finally {
      setLoadingSamples(false);
    }
  }, [refresh]);

  const handleScroll = useCallback(() => {
    const container = scrollContainerRef.current;

    if (!container) {
      return;
    }

    const distance =
      container.scrollHeight -
      container.scrollTop -
      container.clientHeight;

    if (distance <= 300) {
      void loadMore();
    }
  }, [loadMore]);

  const selectEmail = useCallback((email: InboxEmail) => {
    setSelected(email);
    setReply("");
  }, []);

  useEffect(() => {
    async function initialize() {
      try {
        await refresh();
      } catch (error) {
        console.error("Failed to load inbox:", error);
      } finally {
        setLoading(false);
      }
    }

    void initialize();
  }, [refresh]);

  const email: EmailData | null = selected
    ? {
        id: selected.id,
        from: selected.from,
        subject: selected.subject,
        receivedAt: selected.receivedAt,
        body: selected.body,
      }
    : null;

  return {
    emails,
    selected,
    email,
    reply,
    loading,
    syncing,
    loadingSamples,
    loadingMore,
    hasMore,
    scrollContainerRef,
    setReply,
    selectEmail,
    sync,
    loadSamples,
    handleScroll,
  };
}
