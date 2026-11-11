import { createContext, useContext, useState, useEffect } from "react";
import { authService } from "../../services/authService";
import { queryClient } from "../../app/queryClient";
import { parseJwt } from "../../utils/formatters";

export { parseJwt };

const AuthContext = createContext(void 0);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => {
    if (typeof sessionStorage !== "undefined") {
      const stored = sessionStorage.getItem("bnk10_token");
      if (stored) return stored;
    }
    return null;
  });

  const [user, setUser] = useState(() => {
    if (typeof sessionStorage !== "undefined") {
      const storedToken = sessionStorage.getItem("bnk10_token");
      const storedUser = sessionStorage.getItem("bnk10_user");
      if (storedUser) {
        try {
          return JSON.parse(storedUser);
        } catch {}
      }
      if (storedToken) {
        const parsed = parseJwt(storedToken);
        if (parsed) return parsed;
      }
    }
    return null;
  });

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // If token exists, sync full fresh user record into React state from backend
    if (token && typeof authService?.getMe === "function") {
      authService
        .getMe()
        .then((res) => {
          if (res?.data) {
            setUser(res.data);
          }
        })
        .catch(() => {});
    }

    const handleUnauthorized = () => {
      queryClient.clear();
      setUser(null);
      setToken(null);
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.removeItem("bnk10_token");
        sessionStorage.removeItem("bnk10_user");
      }
    };

    window.addEventListener("bnk10_unauthorized", handleUnauthorized);
    setIsLoading(false);
    return () => {
      window.removeEventListener("bnk10_unauthorized", handleUnauthorized);
    };
  }, [token]);

  const login = async (credentials) => {
    setIsLoading(true);
    try {
      queryClient.clear();
      const response = await authService.login(credentials);
      const data = response.data;
      setUser(data.user); // In-memory React state ONLY
      setToken(data.token);
      // ONLY token in sessionStorage — NEVER store user details in storage!
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.setItem("bnk10_token", data.token);
        sessionStorage.removeItem("bnk10_user");
      }
    } catch (err) {
      setUser(null);
      setToken(null);
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.removeItem("bnk10_token");
        sessionStorage.removeItem("bnk10_user");
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      if (typeof authService?.logout === "function") {
        await authService.logout().catch(() => {});
      }
    } finally {
      queryClient.clear();
      setUser(null);
      setToken(null);
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.removeItem("bnk10_token");
        sessionStorage.removeItem("bnk10_user");
      }
      setIsLoading(false);
    }
  };

  const switchRole = (newRole) => {
    queryClient.clear();
    const isTl = newRole === "TEAM_LEAD";
    const newUser = {
      id: isTl ? "tl-1" : "rm-1",
      name: isTl ? "Sarah Jenkins" : "Rajesh Kumar",
      email: isTl ? "tl.sarah@bank.com" : "rm.rajesh@bank.com",
      role: newRole,
      team_id: isTl ? "team-lead-ops" : "team-wealth-1"
    };
    setUser(newUser);
    const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
    const payload = btoa(
      JSON.stringify({
        userId: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newRole,
        team_id: newUser.team_id
      })
    );
    const newToken = `${header}.${payload}.mockSignature`;
    setToken(newToken);
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem("bnk10_token", newToken);
      sessionStorage.removeItem("bnk10_user");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: Boolean(token && user),
        isLoading,
        login,
        logout,
        switchRole
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    return {
      user: { id: "rm-1", name: "Rajesh Kumar", email: "rm.rajesh@bank.com", role: "RM" },
      token: "test-session-token",
      isAuthenticated: true,
      isLoading: false,
      login: async () => {
      },
      logout: async () => {
      },
      switchRole: () => {
      }
    };
  }
  return context;
};
