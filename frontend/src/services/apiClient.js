const BASE_URL = "/api";

export class ApiError extends Error {
  statusCode;
  code;
  details;

  constructor(message, statusCode, code, details) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.code = code || "API_ERROR";
    this.details = details || null;
  }
}

async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
  const requestId = (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function")
    ? `req-fe-${crypto.randomUUID()}`
    : `req-fe-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

  const headers = {
    "Content-Type": "application/json",
    "X-Request-Id": requestId,
    ...options.headers || {}
  };

  const token = typeof sessionStorage !== "undefined" ? sessionStorage.getItem("bnk10_token") : null;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
    body: options.body !== void 0 ? JSON.stringify(options.body) : void 0
  };

  let response;
  try {
    response = await fetch(url, config);
  } catch (err) {
    throw new ApiError(
      err.message || "Network error. Please verify backend server is running.",
      0,
      "NETWORK_ERROR"
    );
  }

  if (response.status === 204) {
    return { success: true, data: null };
  }

  let data;
  try {
    data = await response.json();
  } catch {
    throw new ApiError(
      "Failed to parse server response as JSON.",
      response.status,
      "INVALID_RESPONSE"
    );
  }

  if (!response.ok) {
    if (response.status === 401 && !endpoint.includes("/auth/login")) {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("bnk10_unauthorized"));
      }
    }

    const errorPayload = data?.error || {};
    throw new ApiError(
      errorPayload.message || data?.message || "Request failed",
      response.status,
      errorPayload.code || "REQUEST_FAILED",
      errorPayload.details
    );
  }

  return data;
}

export const apiClient = {
  get: (endpoint, options) => request(endpoint, { method: "GET", ...options }),
  post: (endpoint, body, options) => request(endpoint, { method: "POST", body, ...options }),
  put: (endpoint, body, options) => request(endpoint, { method: "PUT", body, ...options }),
  patch: (endpoint, body, options) => request(endpoint, { method: "PATCH", body, ...options }),
  delete: (endpoint, options) => request(endpoint, { method: "DELETE", ...options })
};

