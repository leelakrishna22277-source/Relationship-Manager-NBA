import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  BarChart3
} from "lucide-react";
import { useAuth } from "../../features/auth/AuthContext";
export const Sidebar = () => {
  const { user } = useAuth();
  const isTeamLead = user?.role === "TEAM_LEAD";
  const rmNav = [
    { to: "/rm/dashboard", label: "Portfolio Overview", icon: LayoutDashboard },
    { to: "/rm/clients", label: "Client Directory", icon: Users },
    { to: "/rm/outcomes", label: "Outcome History", icon: CheckSquare }
  ];
  const tlNav = [
    { to: "/team-lead/dashboard", label: "Team Lead Dashboard", icon: BarChart3 },
    { to: "/team-lead/outcomes", label: "Team Outcomes", icon: CheckSquare }
  ];
  const items = isTeamLead ? tlNav : rmNav;
  return <aside className="w-64 border-r border-color-5 bg-color-7 flex flex-col justify-between p-space-4 shrink-0">
      <div className="space-y-space-6">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-color-1/40 px-space-3">
            {isTeamLead ? "Supervisory Analytics" : "Client Relationship Console"}
          </span>
          <nav className="mt-space-2 space-y-1">
            {items.map((item) => {
    const Icon = item.icon;
    return <NavLink
      key={item.to}
      to={item.to}
      className={({ isActive }) => `flex items-center gap-space-3 px-space-3 py-space-2.5 rounded-radius-md text-text-xs font-semibold transition-all ${isActive ? "bg-color-2 text-white shadow-sm" : "text-slate-600 hover:bg-color-6 hover:text-slate-900"}`}
    >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>;
  })}
          </nav>
        </div>
      </div>
    </aside>;
};
