const API_URL = "http://127.0.0.1:8000";
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

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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

function toApiStatus(value) {
  const v = normalizeText(value);
  if (v === "concluida") return "concluida";
  if (v === "agendada") return "agendada";
  return "pendente";
}

function toApiTipo(value) {
  const v = normalizeText(value);
  if (v === "alta") return "corretiva";
  if (v === "critica") return "corretiva";
  if (v === "baixa") return "preventiva";
  return "preventiva";
}

function formatApiError(data) {
  if (!data) return "Erro ao processar a solicitação.";

  if (typeof data.detail === "string") {
    return data.detail;
  }

  if (Array.isArray(data.detail)) {
    return data.detail
      .map((item) => {
        const campo = Array.isArray(item.loc) ? item.loc.join(" > ") : "campo";
        const msg = item.msg || "valor inválido";
        return `${campo}: ${msg}`;
      })
      .join("\n");
  }

  return "Erro ao processar a solicitação.";
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

async function fetchManutencoes() {
  const response = await fetch(`${API_URL}/manutencoes/?pagina=1&por_pagina=100`, {
    method: "GET",
    headers: authHeaders()
  });

  if (!response.ok) {
    throw new Error(`Erro ao buscar manutenções: ${response.status}`);
  }

  const data = await response.json();
  console.log("Resposta da API /manutencoes:", data);
  manutencoes = parseApiList(data);
}

function fillEquipamentoSelect() {
  const select = document.getElementById("equipamento_id");
  if (!select) return;

  if (!equipamentos.length) {
    select.innerHTML = `<option value="">Nenhum equipamento disponível</option>`;
    return;
  }

  select.innerHTML = equipamentos
    .map((eq) => `
      <option value="${eq.id}">
        ${escapeHtml(eq.nome || `Equipamento #${eq.id}`)} - ${escapeHtml(eq.modelo || "-")}
      </option>
    `)
    .join("");
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

    // Como o backend trabalha com "tipo", usamos isso como base de prioridade visual
    const tipoItem = normalizeText(item.tipo);
    let prioridadeVisual = "média";
    if (tipoItem === "corretiva") prioridadeVisual = "alta";
    if (tipoItem === "preventiva") prioridadeVisual = "baixa";

    const okPrioridade = !prioridade || normalizeText(prioridadeVisual) === normalizeText(prioridade);
    return okStatus && okPrioridade;
  });
}

function nomeEquipamento(item) {
  return (
    item.equipamento_nome ||
    equipamentos.find(eq => Number(eq.id) === Number(item.equipamento_id))?.nome ||
    `Equipamento #${item.equipamento_id || "-"}`
  );
}

function prioridadeVisual(item) {
  const tipo = normalizeText(item.tipo);

  if (tipo === "corretiva") return "Alta";
  if (tipo === "preventiva") return "Baixa";

  return item.prioridade || "-";
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
      <td>${escapeHtml(item.id ?? "-")}</td>
      <td>${escapeHtml(nomeEquipamento(item))}</td>
      <td>${escapeHtml(item.titulo || item.descricao || "-")}</td>
      <td>${escapeHtml(formatDateBR(item.data_prevista))}</td>
      <td>${escapeHtml(formatDateBR(item.data_conclusao || item.data_realizada))}</td>
      <td><span class="badge">${escapeHtml(item.status || "-")}</span></td>
      <td><span class="badge">${escapeHtml(prioridadeVisual(item))}</span></td>
      <td class="actions-cell">
        <button class="btn btn-small btn-secondary" onclick="editarManutencao(${Number(item.id)})">Editar</button>
        <button class="btn btn-small btn-danger" onclick="excluirManutencao(${Number(item.id)})">Excluir</button>
      </td>
    </tr>
  `).join("");
}

function openModal(editing = false, item = null) {
  const modal = document.getElementById("modalManutencao");
  const titulo = document.getElementById("tituloModalManutencao");

  if (!modal || !titulo) return;

  titulo.textContent = editing ? "Editar manutenção" : "Nova manutenção";

  document.getElementById("manutencaoId").value = item?.id || "";
  document.getElementById("equipamento_id").value = item?.equipamento_id || equipamentos[0]?.id || "";
  document.getElementById("descricao").value = item?.titulo || item?.descricao || "";
  document.getElementById("data_prevista").value = formatDateForInput(item?.data_prevista);
  document.getElementById("data_realizada").value = formatDateForInput(item?.data_conclusao || item?.data_realizada);
  document.getElementById("statusManutencao").value = item?.status || "pendente";

  const tipo = normalizeText(item?.tipo);
  if (tipo === "corretiva") {
    document.getElementById("prioridade").value = "alta";
  } else if (tipo === "preventiva") {
    document.getElementById("prioridade").value = "baixa";
  } else {
    document.getElementById("prioridade").value = "média";
  }

  modal.classList.remove("hidden");
}

function closeModal() {
  document.getElementById("modalManutencao")?.classList.add("hidden");
}

async function salvarManutencao(event) {
  event.preventDefault();

  const id = document.getElementById("manutencaoId").value;
  const equipamentoId = document.getElementById("equipamento_id").value;
  const descricao = document.getElementById("descricao").value.trim();

  if (!equipamentoId) {
    alert("Selecione um equipamento.");
    return;
  }

  if (!descricao) {
    alert("Preencha a descrição.");
    return;
  }

  const payload = {
    equipamento_id: Number(equipamentoId),
    titulo: descricao,
    descricao: descricao,
    tipo: toApiTipo(document.getElementById("prioridade").value),
    status: toApiStatus(document.getElementById("statusManutencao").value),
    data_prevista: toIsoEndOfDay(document.getElementById("data_prevista").value),
    data_conclusao: toIsoEndOfDay(document.getElementById("data_realizada").value)
  };

  const method = id ? "PUT" : "POST";
  const url = id ? `${API_URL}/manutencoes/${id}` : `${API_URL}/manutencoes/`;

  const response = await fetch(url, {
    method,
    headers: authHeaders(),
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    let mensagem = "Erro ao salvar manutenção.";
    try {
      const data = await response.json();
      mensagem = formatApiError(data);
      console.error("Erro da API ao salvar manutenção:", data);
      console.error("Payload enviado:", payload);
    } catch (_) {}
    throw new Error(mensagem);
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
    let mensagem = "Erro ao excluir manutenção.";
    try {
      const data = await response.json();
      mensagem = formatApiError(data);
    } catch (_) {}
    alert(mensagem);
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
          <td colspan="8" class="table-empty">Erro ao carregar manutenções: ${escapeHtml(error.message)}</td>
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