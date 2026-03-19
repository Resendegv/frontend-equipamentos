const API_URL = "https://api-equipamentos2.onrender.com";
let manutencoes = [];
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
  return [];
}

function formatDateBR(dateString) {
  if (!dateString) return "-";
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return dateString;
  return d.toLocaleDateString("pt-BR");
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
  equipamentos = parseApiList(data);
}

async function fetchManutencoes() {
  const response = await fetch(`${API_URL}/manutencoes/?pagina=1&por_pagina=100`, {
    method: "GET",
    headers: authHeaders()
  });

  if (!response.ok) {
    throw new Error(`Erro ao buscar manutenções: ${response.status}`);
  }

  const data = await response.json();
  manutencoes = parseApiList(data);
}

function fillEquipamentoSelect() {
  const select = document.getElementById("equipamento_id");
  if (!select) return;

  select.innerHTML = equipamentos.map((eq) => `
    <option value="${eq.id}">${eq.nome} - ${eq.modelo || "-"}</option>
  `).join("");
}

function getFiltros() {
  return {
    status: document.getElementById("filtroStatusManutencao")?.value || "",
    prioridade: document.getElementById("filtroPrioridadeManutencao")?.value || ""
  };
}

function filtrarManutencoes(lista) {
  const { status, prioridade } = getFiltros();

  return lista.filter((item) => {
    const okStatus = !status || normalizeText(item.status) === normalizeText(status);
    const okPrioridade = !prioridade || normalizeText(item.prioridade) === normalizeText(prioridade);
    return okStatus && okPrioridade;
  });
}

function nomeEquipamento(item) {
  return item.equipamento_nome
    || equipamentos.find(eq => Number(eq.id) === Number(item.equipamento_id))?.nome
    || `Equipamento #${item.equipamento_id || "-"}`;
}

function renderTabela() {
  const tbody = document.getElementById("tabelaManutencoes");
  if (!tbody) return;

  const lista = filtrarManutencoes(manutencoes);

  if (!lista.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="table-empty">Nenhuma manutenção encontrada.</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = lista.map((item) => `
    <tr>
      <td>${item.id ?? "-"}</td>
      <td>${nomeEquipamento(item)}</td>
      <td>${item.descricao || "-"}</td>
      <td>${formatDateBR(item.data_prevista)}</td>
      <td>${formatDateBR(item.data_realizada)}</td>
      <td><span class="badge">${item.status || "-"}</span></td>
      <td><span class="badge">${item.prioridade || "-"}</span></td>
      <td class="actions-cell">
        <button class="btn btn-small btn-secondary" onclick="editarManutencao(${item.id})">Editar</button>
        <button class="btn btn-small btn-danger" onclick="excluirManutencao(${item.id})">Excluir</button>
      </td>
    </tr>
  `).join("");
}

function openModal(editing = false, item = null) {
  const modal = document.getElementById("modalManutencao");
  const titulo = document.getElementById("tituloModalManutencao");

  titulo.textContent = editing ? "Editar manutenção" : "Nova manutenção";

  document.getElementById("manutencaoId").value = item?.id || "";
  document.getElementById("equipamento_id").value = item?.equipamento_id || equipamentos[0]?.id || "";
  document.getElementById("descricao").value = item?.descricao || "";
  document.getElementById("data_prevista").value = item?.data_prevista || "";
  document.getElementById("data_realizada").value = item?.data_realizada || "";
  document.getElementById("statusManutencao").value = item?.status || "pendente";
  document.getElementById("prioridade").value = item?.prioridade || "média";

  modal.classList.remove("hidden");
}

function closeModal() {
  document.getElementById("modalManutencao").classList.add("hidden");
}

async function salvarManutencao(event) {
  event.preventDefault();

  const id = document.getElementById("manutencaoId").value;

  const payload = {
    equipamento_id: Number(document.getElementById("equipamento_id").value),
    descricao: document.getElementById("descricao").value.trim(),
    data_prevista: document.getElementById("data_prevista").value,
    data_realizada: document.getElementById("data_realizada").value || null,
    status: document.getElementById("statusManutencao").value,
    prioridade: document.getElementById("prioridade").value
  };

  const method = id ? "PUT" : "POST";
  const url = id ? `${API_URL}/manutencoes/${id}` : `${API_URL}/manutencoes/`;

  const response = await fetch(url, {
    method,
    headers: authHeaders(),
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    let detail = "Erro ao salvar manutenção.";
    try {
      const data = await response.json();
      detail = data.detail || detail;
    } catch (_) {}
    throw new Error(detail);
  }

  closeModal();
  await carregarPagina();
}

async function editarManutencao(id) {
  const item = manutencoes.find((m) => Number(m.id) === Number(id));
  if (!item) return;
  openModal(true, item);
}

async function excluirManutencao(id) {
  const confirmar = confirm("Deseja realmente excluir esta manutenção?");
  if (!confirmar) return;

  const response = await fetch(`${API_URL}/manutencoes/${id}`, {
    method: "DELETE",
    headers: authHeaders()
  });

  if (!response.ok) {
    let detail = "Erro ao excluir manutenção.";
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
    fillEquipamentoSelect();
    await fetchManutencoes();
    renderTabela();
  } catch (error) {
    console.error(error);
    const tbody = document.getElementById("tabelaManutencoes");
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="table-empty">Erro ao carregar manutenções: ${error.message}</td>
        </tr>
      `;
    }
  }
}

window.editarManutencao = editarManutencao;
window.excluirManutencao = excluirManutencao;

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("btnLogout")?.addEventListener("click", logout);
  document.getElementById("btnNovaManutencao")?.addEventListener("click", () => openModal(false, null));
  document.getElementById("btnFecharModalManutencao")?.addEventListener("click", closeModal);
  document.getElementById("btnCancelarManutencao")?.addEventListener("click", closeModal);
  document.getElementById("formManutencao")?.addEventListener("submit", async (e) => {
    try {
      await salvarManutencao(e);
    } catch (error) {
      alert(error.message);
    }
  });

  document.getElementById("btnAtualizarManutencoes")?.addEventListener("click", carregarPagina);
  document.getElementById("filtroStatusManutencao")?.addEventListener("change", renderTabela);
  document.getElementById("filtroPrioridadeManutencao")?.addEventListener("change", renderTabela);

  carregarPagina();
});