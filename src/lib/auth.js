const API = "http://localhost:5000"; 
const TOKEN_KEY = "auth_token";

export function saveToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}
export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function logout() {
  localStorage.removeItem(TOKEN_KEY);
}
export function currentUser() {
  try {
    const token = getToken();
    if (!token) return null;
    // You might decode token if needed, but let's just store username in localStorage too
    return JSON.parse(localStorage.getItem("current_user"));
  } catch {
    return null;
  }
}

async function api(path, options = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
  const res = await fetch(`${API}${path}`, { ...options, headers });
  if (!res.ok) {
    const errorText = await res.text();
    // Check if token has expired
    if (errorText.includes("Token has expired")) {
      logout();
      throw new Error("TOKEN_EXPIRED");
    }
    throw new Error(errorText);
  }
  return res.json();
}

// Login
export async function login(username, password) {
  const res = await api("/", {
    method: "POST",
    body: JSON.stringify({ username, password })
  });
  saveToken(res.token);
  localStorage.setItem("current_user", JSON.stringify({ username: res.username, role: res.role }));
  return res;
}

// Users
export async function getUsers() {
  return api("/users");
}

export async function addUser({ username, password, role }) {
  return api("/add_user", {
    method: "POST",
    body: JSON.stringify({ username, password, role })
  });
}

export async function setUserActive(username) {
  return api(`/users/${username}/activate`, { method: "POST" });
}

export async function resetPassword(username, password) {
  return api(`/users/${username}/reset-password`, {
    method: "POST",
    body: JSON.stringify({ password })
  });
}

export async function deleteUser(username) {
  return api(`/users/${username}`, { method: "DELETE" });
}

// Logs
export async function getLogs() {
  return api("/logs");
}
export async function addLog(type, message, user) {
  return api("/logs", {
    method: "POST",
    body: JSON.stringify({type, message, user})
  });
}
export async function clearLogs() {
  return api('/clear-logs', { method: 'DELETE' });
}

//  for reset daily limit
export async function resetToday(username) {
  const reset = await api(`/user-qr-reset/${username}`);
  return Promise.resolve();
}

export async function getTodayCount(username) {
  try {
    const data = await api(`/user-qr-count/${username}`);
    return data.count || 0;
  } catch {
    return 0;
  }
}

export async function canGenerateToday(username, max = 3) {
  const count = await getTodayCount(username);
  return count < max;
}

export async function generateQR(username) {
  return await api('/generate-qr', {
    method: 'POST',
    body: JSON.stringify({ username })
  });
}
