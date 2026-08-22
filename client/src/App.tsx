import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import type { ReactNode } from "react";
import Login from "./pages/Login.js";
import Dashboard from "./pages/Dashboard.js";
import Inbox from "./pages/Inbox.js";
import Drafts from "./pages/Drafts.js";
import Approvals from "./pages/Approvals.js";
import Sent from "./pages/Sent.js";
import Settings from "./pages/Settings.js";
import BillingPage from "./pages/BillingPage.js";
import Sidebar from "./components/Sidebar.js";
import { useAuth } from "./context/AuthContext.js";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <AppLayout>
                <Dashboard />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <AppLayout>
                <Dashboard />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/inbox"
          element={
            <ProtectedRoute>
              <AppLayout>
                <Inbox />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/drafts"
          element={
            <ProtectedRoute>
              <AppLayout>
                <Drafts />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/approvals"
          element={
            <ProtectedRoute>
              <AppLayout>
                <Approvals />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/sent"
          element={
            <ProtectedRoute>
              <AppLayout>
                <Sent />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <AppLayout>
                <Settings />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/billing"
          element={
            <ProtectedRoute>
              <AppLayout>
                <BillingPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}

interface ProtectedRouteProps {
  children: ReactNode;
}

function ProtectedRoute({
  children,
}: ProtectedRouteProps) {
  const {
    loading,
    isAuthenticated,
  } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  return <>{children}</>;
}

interface AppLayoutProps {
  children: ReactNode;
}

function AppLayout({
  children,
}: AppLayoutProps) {
  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-900">
      <Sidebar />

      <main className="min-w-0 flex-1 p-6">
        <div className="mx-auto max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  );
}
