import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, Lock, Mail, AlertCircle, ArrowRight } from "lucide-react";
import { useAuth } from "./AuthContext";
export const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("RM");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      await login({ email, password, role });
      if (role === "TEAM_LEAD") {
        navigate("/team-lead/dashboard", { replace: true });
      } else {
        navigate("/rm/dashboard", { replace: true });
      }
    } catch (err) {
      setError(err.message || "Authentication failed. Please verify credentials.");
    } finally {
      setIsLoading(false);
    }
  };
  const handleRoleChange = (selectedRole) => {
    setRole(selectedRole);
    setError(null);
  };
  return <div className="min-h-screen flex items-center justify-center p-space-4 bg-slate-100">
      <div className="w-full max-w-md bg-color-7 border border-color-5 rounded-radius-xl shadow-lg p-space-8 space-y-space-6">
        {
    /* Brand Header */
  }
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 rounded-radius-lg bg-color-2/10 text-color-2 border border-color-2/20 mb-2">
            <Building2 className="w-8 h-8" />
          </div>
          <h1 className="text-text-2xl font-bold text-color-1 font-heading tracking-wide">
            APEX PRIVATE BANK
          </h1>
          <p className="text-text-xs text-color-1/60">
            Relationship Manager Next-Best-Action Console
          </p>
        </div>

        {
    /* Portal Selector */
  }
        <div className="grid grid-cols-2 p-1 bg-color-6 border border-color-5 rounded-radius-md text-text-xs font-semibold">
          <button
    type="button"
    onClick={() => handleRoleChange("RM")}
    className={`py-space-2 rounded-radius-sm transition-all ${role === "RM" ? "bg-color-2 text-white shadow-sm" : "text-color-1/60 hover:text-color-1"}`}
  >
            RM Console
          </button>
          <button
    type="button"
    onClick={() => handleRoleChange("TEAM_LEAD")}
    className={`py-space-2 rounded-radius-sm transition-all ${role === "TEAM_LEAD" ? "bg-color-2 text-white shadow-sm" : "text-color-1/60 hover:text-color-1"}`}
  >
            Team Lead Portal
          </button>
        </div>

        {
    /* Error Alert */
  }
        {error && <div
    role="alert"
    className="p-space-3 rounded-radius-md bg-red-50 border border-red-200 text-red-700 text-text-xs flex items-center gap-2"
  >
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>}

        {
    /* Form */
  }
        <form onSubmit={handleSubmit} className="space-y-space-4">
          <div>
            <label className="block text-text-xs font-semibold text-color-1/80 mb-1">
              Institutional Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-color-1/40 absolute left-3 top-3" />
              <input
    type="email"
    required
    value={email}
    onChange={(e) => setEmail(e.target.value)}
    placeholder="name@bank.com"
    className="w-full bg-color-6 border border-color-5 rounded-radius-md pl-9 pr-3 py-2 text-text-sm text-color-1 focus:outline-none focus:border-color-2"
  />
            </div>
          </div>

          <div>
            <label className="block text-text-xs font-semibold text-color-1/80 mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-color-1/40 absolute left-3 top-3" />
              <input
    type="password"
    required
    value={password}
    onChange={(e) => setPassword(e.target.value)}
    placeholder="••••••••"
    className="w-full bg-color-6 border border-color-5 rounded-radius-md pl-9 pr-3 py-2 text-text-sm text-color-1 focus:outline-none focus:border-color-2"
  />
            </div>
          </div>

          <button
    type="submit"
    disabled={isLoading}
    className="w-full flex items-center justify-center gap-space-2 py-space-2.5 rounded-radius-md bg-color-2 hover:bg-color-3 text-white text-text-sm font-semibold shadow-sm transition-all disabled:opacity-50"
  >
            <span>{isLoading ? "Verifying Credentials..." : "Sign In to Console"}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>;
};
