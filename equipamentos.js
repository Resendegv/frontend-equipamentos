const API_URL = "http://127.0.0.1:8000";
let equipamentos = [];

function getToken() {
  return localStorage.getItem("token");
}

function authHeaders() {
  const token = getToken();

  if (!token) {
    window.location.href = "index.html";
    throw new Error("Token não encontrado.");
  }

  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`
  };
}

function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("token_type");
  window.location.href = "index.html";
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
  if (Array.isArray(data.resultados)) return data.resultados;
  if (Array.isArray(data.registros)) return data.registros;
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

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function openModal(editing = false, item = null) {
  const modal = document.getElementById("modalEquipamento");
  const titulo = document.getElementById("tituloModalEquipamento");

  if (!modal || !titulo) return;

  titulo.textContent = editing ? "Editar equipamento" : "Novo equipamento";

  document.getElementById("equipamentoId").value = item?.id || "";
  document.getElementById("nome").value = item?.nome || "";
  document.getElementById("fabricante").value = item?.fabricante || "";
  document.getElementById("modelo").value = item?.modelo || "";
  document.getElementById("ano").value = item?.ano || "";
  document.getElementById("status").value = item?.status || "operando";
  document.getElementById("proxima_manutencao").value = formatDateForInput(item?.proxima_manutencao);

  modal.classList.remove("hidden");
}

function closeModal() {
  document.getElementById("modalEquipamento")?.classList.add("hidden");
}

function getFiltros() {
  return {
    status: document.getElementById("filtroStatusEquipamento")?.value || "",
    busca: normalizeText(document.getElementById("buscaEquipamento")?.value || "")
  };
}

function filtrarEquipamentos(lista) {
  const { status, busca } = getFiltros();

  return lista.filter((eq) => {
    const okStatus = !status || normalizeText(eq.status) === normalizeText(status);
    const base = normalizeText(`${eq.nome || ""} ${eq.modelo || ""} ${eq.fabricante || ""}`);
    const okBusca = !busca || base.includes(busca);
    return okStatus && okBusca;
  });
}

async function fetchEquipamentos() {
  const response = await fetch(`${API_URL}/equipamentos/?pagina=1&por_pagina=100`, {
    method: "GET",
    headers: authHeaders()
  });

  if (!response.ok) {
    throw new Error(`Erro ao buscar equipamentos: ${response.status}`);
  }

  const data = await response.json();
  console.log("Resposta da API /equipamentos:", data);
  equipamentos = parseApiList(data);
}

function renderTabela() {
  const tbody = document.getElementById("tabelaEquipamentos");
  if (!tbody) return;

  const lista = filtrarEquipamentos(equipamentos);

  if (!lista.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="table-empty">Nenhum equipamento encontrado.</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = lista.map((eq) => `
    <tr>
      <td>${escapeHtml(eq.id ?? "-")}</td>
      <td>${escapeHtml(eq.nome || "-")}</td>
      <td>${escapeHtml(eq.fabricante || "-")}</td>
      <td>${escapeHtml(eq.modelo || "-")}</td>
      <td>${escapeHtml(eq.ano || "-")}</td>
      <td><span class="badge">${escapeHtml(eq.status || "-")}</span></td>
      <td>${escapeHtml(formatDateBR(eq.proxima_manutencao))}</td>
      <td class="actions-cell">
        <button class="btn btn-small btn-secondary" onclick="editarEquipamento(${Number(eq.id)})">Editar</button>
        <button class="btn btn-small btn-danger" onclick="excluirEquipamento(${Number(eq.id)})">Excluir</button>
      </td>
    </tr>
  `).join("");
}

async function salvarEquipamento(event) {
  event.preventDefault();

  const id = document.getElementById("equipamentoId").value;
  const payload = {
    nome: document.getElementById("nome").value.trim(),
    fabricante: document.getElementById("fabricante").value.trim(),
    modelo: document.getElementById("modelo").value.trim(),
    ano: Number(document.getElementById("ano").value),
    status: document.getElementById("status").value,
    proxima_manutencao: document.getElementById("proxima_manutencao").value || null
  };

  const method = id ? "PUT" : "POST";
  const url = id ? `${API_URL}/equipamentos/${id}` : `${API_URL}/equipamentos/`;

  const response = await fetch(url, {
    method,
    headers: authHeaders(),
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    let detail = "Erro ao salvar equipamento.";
    try {
      const data = await response.json();
      detail = data.detail || detail;
    } catch (_) {}
    throw new Error(detail);
  }

  closeModal();
  await carregarPagina();
}

async function editarEquipamento(id) {
  const item = equipamentos.find((eq) => Number(eq.id) === Number(id));
  if (!item) return;
  openModal(true, item);
}

async function excluirEquipamento(id) {
  const confirmar = confirm("Deseja realmente excluir este equipamento?");
  if (!confirmar) return;

  const response = await fetch(`${API_URL}/equipamentos/${id}`, {
    method: "DELETE",
    headers: authHeaders()
  });

  if (!response.ok) {
    let detail = "Erro ao excluir equipamento.";
    try {
      const data = await response.json();
      detail = data.detail || detail;
    } catch (_) {}
    alert(detail);
    return;
  }

  await carregarPagina();
}

async function carregarPagina() {
  try {
    await fetchEquipamentos();
    renderTabela();
  } catch (error) {
    console.error(error);
    const tbody = document.getElementById("tabelaEquipamentos");
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="table-empty">Erro ao carregar equipamentos: ${escapeHtml(error.message)}</td>
        </tr>
      `;
    }
  }
}

window.editarEquipamento = editarEquipamento;
window.excluirEquipamento = excluirEquipamento;

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("btnLogout")?.addEventListener("click", logout);
  document.getElementById("btnNovoEquipamento")?.addEventListener("click", () => openModal(false, null));
  document.getElementById("btnFecharModalEquipamento")?.addEventListener("click", closeModal);
  document.getElementById("btnCancelarEquipamento")?.addEventListener("click", closeModal);

  document.getElementById("formEquipamento")?.addEventListener("submit", async (e) => {
    try {
      await salvarEquipamento(e);
    } catch (error) {
      alert(error.message);
    }
  });

  document.getElementById("btnAtualizarEquipamentos")?.addEventListener("click", carregarPagina);
  document.getElementById("filtroStatusEquipamento")?.addEventListener("change", renderTabela);
  document.getElementById("buscaEquipamento")?.addEventListener("input", renderTabela);

  carregarPagina();
});