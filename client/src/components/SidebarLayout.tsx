import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";

export default function SidebarLayout() {
  const [isExpanded, setIsExpanded] = useState(() =>
    window.matchMedia("(min-width: 768px)").matches
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 768px)");

    const handleResize = (event: MediaQueryListEvent) => {
      setIsExpanded(event.matches);
    };

    mediaQuery.addEventListener("change", handleResize);

    return () => {
      mediaQuery.removeEventListener("change", handleResize);
    };
  }, []);

  const toggleSidebar = () => {
    setIsExpanded((previous) => !previous);
  };

  const closeSidebar = () => {
    const isDesktop = window.matchMedia("(min-width: 768px)").matches;
    setIsExpanded(isDesktop);
  };

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        type="button"
        onClick={toggleSidebar}
        aria-label={isExpanded ? "Close sidebar" : "Open sidebar"}
        aria-expanded={isExpanded}
        aria-controls="app-sidebar"
        className="fixed left-4 top-4 z-50 rounded-md border-(--border) bg-(--surface) p-2 shadow-md md:hidden"
      >
        {isExpanded ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        )}
      </button>

      {/* Mobile backdrop */}
      {isExpanded && (
        <button
          type="button"
          aria-label="Close sidebar"
          onClick={closeSidebar}
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
        />
      )}

      <Sidebar
        isExpanded={isExpanded}
        onNavigate={closeSidebar}
      />
    </>
  );
}
