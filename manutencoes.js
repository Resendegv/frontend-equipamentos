let manutencoes = [];
let equipamentos = [];

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

  select.innerHTML = equipamentos.map((eq) => `
    <option value="${eq.id}">${escapeHtml(eq.nome)} - ${escapeHtml(eq.modelo || "-")}</option>
  `).join("");
}

function getFiltros() {
  return {
    status: document.getElementById("filtroStatusManutencao")?.value || "",
    tipo: document.getElementById("filtroTipoManutencao")?.value || ""
  };
}

function filtrarManutencoes(lista) {
  const { status, tipo } = getFiltros();

  return lista.filter((item) => {
    const okStatus = !status || normalizeText(item.status) === normalizeText(status);
    const okTipo = !tipo || normalizeText(item.tipo) === normalizeText(tipo);
    return okStatus && okTipo;
  });
}

function nomeEquipamento(item) {
  return item.equipamento_nome
    || equipamentos.find(eq => Number(eq.id) === Number(item.equipamento_id))?.nome
    || `Equipamento #${item.equipamento_id || "-"}`;
}

function textoPrazo(item) {
  if (item.status_prazo === "vencida") {
    return `Vencida há ${item.vencida_dias ?? 0} dia(s)`;
  }
  if (item.status_prazo === "no prazo") {
    return `${item.prazo_restante ?? 0} dia(s) restantes`;
  }
  if (item.status_prazo === "concluída no prazo") {
    return "Concluída no prazo";
  }
  if (item.status_prazo === "concluída atrasada") {
    return `Concluída com ${item.vencida_dias ?? 0} dia(s) de atraso`;
  }
  return item.status_prazo || "-";
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
      <td>${item.id ?? "-"}</td>
      <td>${escapeHtml(nomeEquipamento(item))}</td>
      <td>${escapeHtml(item.titulo || "-")}</td>
      <td>${escapeHtml(item.tipo || "-")}</td>
      <td>${formatDateBR(item.data_prevista)}</td>
      <td>${formatDateBR(item.data_conclusao)}</td>
      <td><span class="badge">${escapeHtml(item.status || "-")}</span></td>
      <td>${escapeHtml(textoPrazo(item))}</td>
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
  document.getElementById("titulo").value = item?.titulo || "";
  document.getElementById("descricao").value = item?.descricao || "";
  document.getElementById("tipo").value = item?.tipo || "preventiva";
  document.getElementById("data_prevista").value = formatDateForInput(item?.data_prevista);
  document.getElementById("data_conclusao").value = formatDateForInput(item?.data_conclusao);
  document.getElementById("statusManutencao").value = item?.status || "pendente";

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
    titulo: document.getElementById("titulo").value.trim(),
    descricao: document.getElementById("descricao").value.trim() || null,
    tipo: document.getElementById("tipo").value,
    status: document.getElementById("statusManutencao").value,
    data_prevista: toIsoEndOfDay(document.getElementById("data_prevista").value),
    data_conclusao: toIsoEndOfDay(document.getElementById("data_conclusao").value)
  };

  const method = id ? "PUT" : "POST";
  const url = id
    ? `${window.API_URL}/manutencoes/${id}`
    : `${window.API_URL}/manutencoes/`;

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

  const response = await fetch(`${window.API_URL}/manutencoes/${id}`, {
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
  document.getElementById("filtroTipoManutencao")?.addEventListener("change", renderTabela);

  carregarPagina();
});