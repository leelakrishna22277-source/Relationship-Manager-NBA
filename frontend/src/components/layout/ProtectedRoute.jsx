import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../features/auth/AuthContext";
import { LoadingState } from "../common/LoadingState";
export const ProtectedRoute = ({ allowedRoles }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#F4F6F9]">
        <LoadingState message="Authenticating session..." />
      </div>;
  }
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const fallbackPath = user.role === "TEAM_LEAD" ? "/team-lead/dashboard" : "/rm/dashboard";
    return <Navigate to={fallbackPath} replace />;
  }
  return <Outlet />;
};
