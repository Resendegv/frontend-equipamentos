function getToken() {
  return localStorage.getItem("token");
}

function setToken(token, tokenType = "bearer") {
  localStorage.setItem("token", token);
  localStorage.setItem("token_type", tokenType);
}

function clearAuth() {
  localStorage.removeItem("token");
  localStorage.removeItem("token_type");
}

function logout() {
  clearAuth();
  window.location.href = "./index.html";
}

function ensureAuth() {
  const token = getToken();
  if (!token) {
    window.location.href = "./index.html";
    throw new Error("Usuário não autenticado.");
  }
  return token;
}

function authHeaders(withJson = true) {
  const token = ensureAuth();

  const headers = {
    Authorization: `Bearer ${token}`
  };

  if (withJson) {
    headers["Content-Type"] = "application/json";
    headers["Accept"] = "application/json";
  }

  return headers;
}

function normalizeText(value) {
  if (!value) return "";
  return value
    .toString()
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function parseApiList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.dados)) return data.dados;
  if (Array.isArray(data.items)) return data.items;
  return [];
}

function formatDateBR(dateString) {
  if (!dateString) return "-";
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return dateString;
  return d.toLocaleDateString("pt-BR");
}

function formatDateForInput(dateString) {
  if (!dateString) return "";
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function toIsoEndOfDay(dateValue) {
  if (!dateValue) return null;
  return `${dateValue}T23:59:59`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}