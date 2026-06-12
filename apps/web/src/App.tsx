import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./lib/auth";
import { LoginPage } from "./pages/auth/LoginPage";
import { RegisterPage } from "./pages/auth/RegisterPage";
import { DashboardPage } from "./pages/dashboard/DashboardPage";
import { ProjectPage } from "./pages/project/ProjectPage";
import { WritePage } from "./pages/write/WritePage";
import { SettingsPage } from "./pages/SettingsPage";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export function App() {
  const initFromStorage = useAuthStore((s) => s.initFromStorage);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    initFromStorage().finally(() => setInitializing(false));
  }, []);

  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="w-5 h-5 rounded-full border-2 border-purple-500/30 border-t-purple-400 animate-spin" />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <DashboardPage />
            </RequireAuth>
          }
        />
        <Route
          path="/project/:projectId"
          element={
            <RequireAuth>
              <ProjectPage />
            </RequireAuth>
          }
        />
        <Route
          path="/write/:chapterId"
          element={
            <RequireAuth>
              <WritePage />
            </RequireAuth>
          }
        />
        <Route
          path="/settings"
          element={
            <RequireAuth>
              <SettingsPage />
            </RequireAuth>
          }
        />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
