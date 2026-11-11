import {
  MOCK_CLIENTS,
  MOCK_HOLDINGS,
  MOCK_SIGNALS,
  MOCK_NBAS,
  MOCK_OUTREACH,
  MOCK_ACTIVITIES,
  MOCK_OUTCOMES,
  MOCK_RM_STATS,
  MOCK_TL_STATS
} from "./testFixtures";
import { parseJwt } from "../utils/formatters";

export function handleTestFetch(url, options = {}) {
  const norm = url.replace(/^\/?api\/?/, "/");
  const method = (options.method || "GET").toUpperCase();

  let body = {};
  if (options.body) {
    try {
      body = typeof options.body === "string" ? JSON.parse(options.body) : options.body;
    } catch {
      body = {};
    }
  }

  const okResponse = (data, status = 200) => ({
    ok: true,
    status,
    json: async () => data,
    text: async () => JSON.stringify(data)
  });

  const errorResponse = (message, status = 400, code = "ERROR") => ({
    ok: false,
    status,
    json: async () => ({
      success: false,
      error: { message, code }
    }),
    text: async () => JSON.stringify({ success: false, error: { message, code } })
  });

  if (norm.includes("/auth/login")) {
    const email = (body.email || "").toLowerCase();
    const isTlEmail = email.includes("tl") || email.includes("sarah") || email.includes("team") || email.includes("lead");
    const actualRole = isTlEmail ? "TEAM_LEAD" : "RM";
    if (body.role && body.role !== actualRole) {
      return errorResponse(
        `Access denied: Account "${body.email || ""}" is registered as ${actualRole}.`,
        401,
        "ROLE_MISMATCH"
      );
    }
    return okResponse({
      success: true,
      data: {
        user: {
          id: actualRole === "TEAM_LEAD" ? "rm-tl-sarah" : "rm-1",
          name: actualRole === "TEAM_LEAD" ? "Sarah Jenkins" : "Rajesh Kumar",
          email: actualRole === "TEAM_LEAD" ? "tl.sarah@bank.com" : "rm.rajesh@bank.com",
          role: actualRole
        },
        token: "mock-bearer-token-12345"
      }
    });
  }

  if (norm.includes("/auth/me")) {
    const token = typeof sessionStorage !== "undefined" ? sessionStorage.getItem("bnk10_token") : null;
    let user = null;
    if (token) {
      user = parseJwt(token);
    }
    return okResponse({
      success: true,
      data: user || {
        id: "rm-1",
        name: "Rajesh Kumar",
        email: "rm.rajesh@bank.com",
        role: "RM"
      }
    });
  }

  if (norm.includes("/rm/dashboard")) {
    return okResponse({ success: true, data: MOCK_RM_STATS });
  }

  if (norm.includes("/team-lead/dashboard")) {
    return okResponse({ success: true, data: MOCK_TL_STATS });
  }

  if (norm.includes("/team-lead/rms")) {
    return okResponse({
      success: true,
      data: [
        { id: "rm-1", name: "Rajesh Kumar", email: "rm.rajesh@bank.com", role: "RM" },
        { id: "rm-2", name: "Priya Verma", email: "rm.priya@bank.com", role: "RM" }
      ]
    });
  }

  if (norm.includes("/assign") && method === "PATCH") {
    const client = MOCK_CLIENTS[0];
    return okResponse({
      success: true,
      data: {
        ...client,
        rm_id: body.rm_id || null,
        rm_name: body.rm_id === "rm-1" ? "Rajesh Kumar" : body.rm_id === "rm-2" ? "Priya Verma" : null
      }
    });
  }

  if (norm.includes("/outcomes") && method === "POST") {
    const parts = norm.split("/");
    const nbaId = parts[2] || "nba-101";
    const newOutcome = {
      id: `out-${Date.now()}`,
      nba_id: nbaId,
      recorded_by_rm_id: "rm-1",
      action_taken: body.action_taken ?? true,
      outcome: body.outcome || "INTERESTED",
      notes: body.notes || null,
      follow_up_date: body.follow_up_date || null,
      created_at: new Date().toISOString(),
      nba: MOCK_NBAS.find((n) => n.id === nbaId) || MOCK_NBAS[0]
    };
    MOCK_OUTCOMES.unshift(newOutcome);
    return okResponse({ success: true, data: newOutcome });
  }

  if (norm.includes("/team-lead/outcomes") || norm.includes("/rm/outcomes")) {
    const outcomeParam = norm.includes("outcome=") ? norm.split("outcome=")[1]?.split("&")[0] : void 0;
    const list = outcomeParam && outcomeParam !== "ALL" ? MOCK_OUTCOMES.filter((o) => o.outcome === outcomeParam) : MOCK_OUTCOMES;
    return okResponse({ success: true, data: list });
  }

  if (norm.includes("/clients/") && norm.includes("/nbas")) {
    const parts = norm.split("/");
    const clientId = parts[2] || "c-101";
    const clientNbas = MOCK_NBAS.filter(
      (n) => n.client_id === clientId || n.client?.id === clientId
    );
    const nbasResult = clientNbas.length > 0 ? clientNbas : MOCK_NBAS.slice(0, 2);
    if (norm.includes("/generate") && method === "POST") {
      return okResponse({
        success: true,
        data: {
          recommendations: nbasResult,
          suitability_summary: { overall_status: "PASS", score: 95 }
        }
      });
    }
    return okResponse({ success: true, data: nbasResult });
  }

  if (norm.includes("/holdings")) {
    const parts = norm.split("/");
    const clientId = parts[2] || "c-101";
    const holdings = MOCK_HOLDINGS[clientId] || MOCK_HOLDINGS["c-101"] || [];
    return okResponse({ success: true, data: holdings });
  }

  if (norm.includes("/signals")) {
    const parts = norm.split("/");
    const clientId = parts[2] || "c-101";
    const signals = MOCK_SIGNALS[clientId] || MOCK_SIGNALS["c-101"] || [];
    return okResponse({ success: true, data: signals });
  }

  if (norm.includes("/activities")) {
    if (method === "POST") {
      const newActivity = {
        id: `act-${Date.now()}`,
        outreach_id: norm.split("/")[2] || "outreach-101",
        rm_id: "rm-1",
        contact_method: body.contact_method || "CALL",
        contact_status: body.contact_status || "CONTACTED",
        notes: body.notes || null,
        follow_up_date: body.follow_up_date || null,
        created_at: new Date().toISOString()
      };
      MOCK_ACTIVITIES.unshift(newActivity);
      return okResponse({ success: true, data: newActivity });
    }
    return okResponse({ success: true, data: MOCK_ACTIVITIES });
  }

  if (norm.includes("/outreach/draft") || norm.includes("/outreach")) {
    return okResponse({ success: true, data: MOCK_OUTREACH });
  }

  if (norm.includes("/clients/")) {
    const parts = norm.split("/");
    const clientId = parts[2];
    const found = MOCK_CLIENTS.find((c) => c.id === clientId) || MOCK_CLIENTS[0];
    return okResponse({ success: true, data: found });
  }

  if (norm.includes("/clients")) {
    return okResponse({ success: true, data: MOCK_CLIENTS });
  }

  if (norm.includes("/nbas/")) {
    const parts = norm.split("/");
    const nbaId = parts[2];
    const found = MOCK_NBAS.find((n) => n.id === nbaId) || MOCK_NBAS[0];
    return okResponse({ success: true, data: found });
  }

  if (norm.includes("/nbas")) {
    return okResponse({ success: true, data: MOCK_NBAS });
  }

  return okResponse({ success: true, data: {} });
}

