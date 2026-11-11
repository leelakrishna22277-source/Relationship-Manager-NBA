import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import { ProtectedRoute } from "../components/layout/ProtectedRoute";
import { AppShell } from "../components/layout/AppShell";
import { LoginPage } from "../features/auth/LoginPage";
import { RmDashboardPage } from "../features/rm/RmDashboardPage";
import { ClientDirectoryPage } from "../features/clients/ClientDirectoryPage";
import { Client360Page } from "../features/clients/Client360Page";
import { NbaDetailsPage } from "../features/nbas/NbaDetailsPage";
import { OutreachComposerPage } from "../features/outreach/OutreachComposerPage";
import { RmOutcomeTrackingPage } from "../features/outcomes/RmOutcomeTrackingPage";
import { TeamLeadDashboardPage } from "../features/team-lead/TeamLeadDashboardPage";
import { TeamOutcomeTrackingPage } from "../features/team-lead/TeamOutcomeTrackingPage";
export const RootRedirect = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  if (isLoading) return null;
  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;
  return user.role === "TEAM_LEAD" ? <Navigate to="/team-lead/dashboard" replace /> : <Navigate to="/rm/dashboard" replace />;
};
export const AppRoutes = () => {
  return <Routes>
      {
    /* Public Authentication Route */
  }
      <Route path="/login" element={<LoginPage />} />

      {
    /* Root Path Redirect */
  }
      <Route path="/" element={<RootRedirect />} />

      {
    /* Relationship Manager Protected Portal */
  }
      <Route element={<ProtectedRoute allowedRoles={["RM"]} />}>
        <Route element={<AppShell />}>
          <Route path="/rm/dashboard" element={<RmDashboardPage />} />
          <Route path="/rm/clients" element={<ClientDirectoryPage />} />
          <Route path="/rm/clients/:id" element={<Client360Page />} />
          <Route path="/rm/nbas" element={<Navigate to="/rm/clients" replace />} />
          <Route path="/rm/nbas/:id" element={<NbaDetailsPage />} />
          <Route path="/rm/nbas/:id/outreach" element={<OutreachComposerPage />} />
          <Route path="/rm/outcomes" element={<RmOutcomeTrackingPage />} />
        </Route>
      </Route>

      {
    /* Team Lead Protected Supervisory Portal */
  }
      <Route element={<ProtectedRoute allowedRoles={["TEAM_LEAD"]} />}>
        <Route element={<AppShell />}>
          <Route path="/team-lead/dashboard" element={<TeamLeadDashboardPage />} />
          <Route path="/team-lead/outcomes" element={<TeamOutcomeTrackingPage />} />
        </Route>
      </Route>

      {
    /* Unmatched Route Fallback */
  }
      <Route path="*" element={<RootRedirect />} />
    </Routes>;
};
