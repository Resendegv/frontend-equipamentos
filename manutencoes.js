let manutencoes = [];
let equipamentos = [];

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
  const response = await fetch(`${window.API_URL}/equipamentos/?pagina=1&por_pagina=100`, {
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
  const response = await fetch(`${window.API_URL}/manutencoes/?pagina=1&por_pagina=100`, {
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
    const okPrioridade = !prioridade || normalizeText(item.prioridade) === normalizeText(prioridade);
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

function renderTabela() {
  const tbody = document.getElementById("tabelaManutencoes");
  if (!tbody) return;

  const lista = filtrarManutencoes(manutencoes);

  if (!lista.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" class="table-empty">Nenhuma manutenção encontrada.</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = lista.map((item) => `
    <tr>
      <td>${escapeHtml(item.id ?? "-")}</td>
      <td>${escapeHtml(nomeEquipamento(item))}</td>
      <td>${escapeHtml(item.titulo || "-")}</td>
      <td>${escapeHtml(item.descricao || "-")}</td>
      <td>${escapeHtml(formatDateBR(item.data_prevista))}</td>
      <td>${escapeHtml(formatDateBR(item.data_conclusao))}</td>
      <td><span class="badge">${escapeHtml(item.status || "-")}</span></td>
      <td><span class="badge">${escapeHtml(item.prioridade || "-")}</span></td>
      <td class="actions-cell">
        <button class="btn btn-small btn-secondary" onclick="editarManutencao(${Number(item.id)})">Editar</button>
        <button class="btn btn-small btn-danger" onclick="excluirManutencao(${Number(item.id)})">Excluir</button>
      </td>
    </tr>
  `).join("");
}

function openModal(editing = false, item = null) {
  const modal = document.getElementById("modalManutencao");
  const tituloModal = document.getElementById("tituloModalManutencao");

  if (!modal || !tituloModal) return;

  tituloModal.textContent = editing ? "Editar manutenção" : "Nova manutenção";

  document.getElementById("manutencaoId").value = item?.id || "";
  document.getElementById("equipamento_id").value = item?.equipamento_id || equipamentos[0]?.id || "";
  document.getElementById("titulo").value = item?.titulo || "";
  document.getElementById("descricao").value = item?.descricao || "";
  document.getElementById("data_prevista").value = formatDateForInput(item?.data_prevista);
  document.getElementById("data_conclusao").value = formatDateForInput(item?.data_conclusao);
  document.getElementById("statusManutencao").value = item?.status || "pendente";
  document.getElementById("prioridade").value = item?.prioridade || "media";

  modal.classList.remove("hidden");
}

function closeModal() {
  document.getElementById("modalManutencao")?.classList.add("hidden");
}

async function salvarManutencao(event) {
  event.preventDefault();

  const id = document.getElementById("manutencaoId").value;
  const equipamentoId = document.getElementById("equipamento_id").value;
  const titulo = document.getElementById("titulo").value.trim();

  if (!equipamentoId) {
    alert("Selecione um equipamento.");
    return;
  }

  if (!titulo) {
    alert("Preencha o título.");
    return;
  }

  const payload = {
    equipamento_id: Number(equipamentoId),
    titulo: titulo,
    descricao: document.getElementById("descricao").value.trim() || null,
    prioridade: document.getElementById("prioridade").value,
    status: document.getElementById("statusManutencao").value,
    data_prevista: toIsoEndOfDay(document.getElementById("data_prevista").value),
    data_conclusao: toIsoEndOfDay(document.getElementById("data_conclusao").value)
  };

  const method = id ? "PUT" : "POST";
  const url = id ? `${window.API_URL}/manutencoes/${id}` : `${window.API_URL}/manutencoes/`;

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

  const response = await fetch(`${window.API_URL}/manutencoes/${id}`, {
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
          <td colspan="9" class="table-empty">Erro ao carregar manutenções: ${escapeHtml(error.message)}</td>
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