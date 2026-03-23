let equipamentos = [];

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

  modal.classList.remove("hidden");
}

function closeModal() {
  document.getElementById("modalEquipamento")?.classList.add("hidden");
}

function verDetalheEquipamento(id) {
  window.location.href = `./equipamento-detalhe.html?id=${id}`;
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

function renderTabela() {
  const tbody = document.getElementById("tabelaEquipamentos");
  if (!tbody) return;

  const lista = filtrarEquipamentos(equipamentos);

  if (!lista.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="table-empty">Nenhum equipamento encontrado.</td>
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
      <td class="actions-cell">
        <button class="btn btn-small" onclick="verDetalheEquipamento(${Number(eq.id)})">Ver</button>
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
    status: document.getElementById("status").value
  };

  const method = id ? "PUT" : "POST";
  const url = id ? `${window.API_URL}/equipamentos/${id}` : `${window.API_URL}/equipamentos/`;

  try {
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
  } catch (error) {
    console.error("Erro ao salvar equipamento:", error);
    if (error instanceof TypeError) {
      throw new Error("Falha de conexão com a API. Verifique se o backend está online e se o CORS está liberado.");
    }
    throw error;
  }
}

async function editarEquipamento(id) {
  const item = equipamentos.find((eq) => Number(eq.id) === Number(id));
  if (!item) return;
  openModal(true, item);
}

async function excluirEquipamento(id) {
  const confirmar = confirm("Deseja realmente excluir este equipamento?");
  if (!confirmar) return;

  try {
    const response = await fetch(`${window.API_URL}/equipamentos/${id}`, {
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
  } catch (error) {
    console.error("Erro ao excluir equipamento:", error);
    alert("Falha de conexão com a API ao excluir equipamento.");
  }
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
          <td colspan="7" class="table-empty">Erro ao carregar equipamentos: ${escapeHtml(error.message)}</td>
        </tr>
      `;
    }
  }
}

window.editarEquipamento = editarEquipamento;
window.excluirEquipamento = excluirEquipamento;
window.verDetalheEquipamento = verDetalheEquipamento;

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