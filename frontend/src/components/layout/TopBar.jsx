import { LogOut, User, Shield, Building2 } from "lucide-react";
import { useAuth } from "../../features/auth/AuthContext";
export const TopBar = () => {
  const { user, logout } = useAuth();
  return <header className="h-16 border-b border-color-5 bg-color-7 px-space-6 flex items-center justify-between z-20">
      <div className="flex items-center gap-space-3">
        <div className="p-2 rounded-radius-md bg-blue-50 text-color-2 border border-blue-200">
          <Building2 className="w-5 h-5" />
        </div>
        <div>
          <span className="font-heading font-bold text-text-sm text-color-1 tracking-wide">
            APEX PRIVATE BANK
          </span>
          <span className="hidden sm:inline-block ml-2 text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-color-6 text-color-1/60 border border-color-5">
            {user?.role === "TEAM_LEAD" ? "Supervisory Analytics Portal" : "Next-Best-Action Console"}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-space-4">
        {user && <div className="flex items-center gap-space-3">
            <div className="text-right hidden sm:block">
              <div className="text-text-xs font-semibold text-color-1">{user.name}</div>
              <div className="text-[10px] flex items-center justify-end gap-1">
                <Shield className="w-3 h-3 text-color-2" />
                <span className="font-semibold text-color-2">
                  {user.role === "TEAM_LEAD" ? "Team Lead (Supervisor)" : "Relationship Manager"}
                </span>
              </div>
            </div>

            <div className="w-8 h-8 rounded-full bg-color-6 border border-color-5 flex items-center justify-center text-color-1">
              <User className="w-4 h-4 text-color-2" />
            </div>

            <button
    type="button"
    onClick={() => logout()}
    className="p-2 text-color-1/50 hover:text-red-700 hover:bg-red-50 rounded-radius-md transition-colors"
    title="Sign Out"
    aria-label="Sign Out"
  >
              <LogOut className="w-4 h-4" />
            </button>
          </div>}
      </div>
    </header>;
};
