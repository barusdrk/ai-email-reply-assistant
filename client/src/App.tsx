import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import Sidebar from "./components/Sidebar.js";
import { useAuth } from "./context/AuthContext.js";

const Login = lazy(() => import("./pages/Login.js"));
const Dashboard = lazy(() => import("./pages/Dashboard.js"));
const Inbox = lazy(() => import("./pages/Inbox.js"));
const Drafts = lazy(() => import("./pages/Drafts.js"));
const DraftDetails = lazy(() => import("./pages/DraftDetails.js"));
const Approvals = lazy(() => import("./pages/Approvals.js"));
const Sent = lazy(() => import("./pages/Sent.js"));
const Settings = lazy(() => import("./pages/Settings.js"));
const Billing = lazy(() => import("./pages/Billing.js"));
const KnowledgeBase = lazy(() => import("./pages/KnowledgeBase.js"));

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoading />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>} />
          <Route path="/inbox" element={<ProtectedRoute><AppLayout><Inbox /></AppLayout></ProtectedRoute>} />
          <Route path="/drafts" element={<ProtectedRoute><AppLayout><Drafts /></AppLayout></ProtectedRoute>} />
          <Route path="/drafts/:id" element={<ProtectedRoute><AppLayout><DraftDetails /></AppLayout></ProtectedRoute>} />
          <Route path="/approvals" element={<ProtectedRoute><AppLayout><Approvals /></AppLayout></ProtectedRoute>} />
          <Route path="/sent" element={<ProtectedRoute><AppLayout><Sent /></AppLayout></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><AppLayout><Settings /></AppLayout></ProtectedRoute>} />
          <Route path="/billing" element={<ProtectedRoute><AppLayout><Billing /></AppLayout></ProtectedRoute>} />
          <Route path="/knowledge-base" element={<ProtectedRoute><AppLayout><KnowledgeBase /></AppLayout></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

function PageLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-200">
      Loading...
    </div>
  );
}

interface ProtectedRouteProps {
  children: ReactNode;
}

function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { loading, isAuthenticated } = useAuth();

  if (loading) {
    return <PageLoading />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

interface AppLayoutProps {
  children: ReactNode;
}

function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900">
      <Sidebar />
      <main className="min-w-0 flex-1 p-6">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
