function getEquipamentoIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value ?? "-";
}

async function fetchEquipamento(id) {
  const response = await fetch(`${window.API_URL}/equipamentos/${id}`, {
    method: "GET",
    headers: authHeaders()
  });

  if (!response.ok) {
    throw new Error(`Erro ao buscar equipamento: ${response.status}`);
  }

  return await response.json();
}

async function fetchHistoricoManutencoes(id) {
  const response = await fetch(`${window.API_URL}/manutencoes/equipamento/${id}`, {
    method: "GET",
    headers: authHeaders()
  });

  if (!response.ok) {
    throw new Error(`Erro ao buscar histórico de manutenções: ${response.status}`);
  }

  return await response.json();
}

function renderDetalhesEquipamento(equipamento) {
  setText("tituloEquipamento", equipamento.nome || "Equipamento");
  setText("detalheNome", equipamento.nome || "-");
  setText("detalheFabricante", equipamento.fabricante || "-");
  setText("detalheModelo", equipamento.modelo || "-");
  setText("detalheAno", equipamento.ano || "-");
  setText("detalheStatus", equipamento.status || "-");
}

function renderHistorico(manutencoes) {
  const tbody = document.getElementById("tabelaHistoricoManutencoes");
  if (!tbody) return;

  if (!manutencoes || !manutencoes.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="table-empty">Nenhuma manutenção encontrada para este equipamento.</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = manutencoes.map((item) => `
    <tr>
      <td>${escapeHtml(item.id ?? "-")}</td>
      <td>${escapeHtml(item.titulo || "-")}</td>
      <td>${escapeHtml(item.descricao || "-")}</td>
      <td>${escapeHtml(formatDateBR(item.data_prevista))}</td>
      <td>${escapeHtml(formatDateBR(item.data_conclusao))}</td>
      <td><span class="badge">${escapeHtml(item.status || "-")}</span></td>
      <td><span class="badge">${escapeHtml(item.prioridade || "-")}</span></td>
      <td>${escapeHtml(item.status_prazo || "-")}</td>
    </tr>
  `).join("");
}

async function carregarDetalheEquipamento() {
  const equipamentoId = getEquipamentoIdFromUrl();

  if (!equipamentoId) {
    alert("ID do equipamento não informado.");
    window.location.href = "./equipamentos.html";
    return;
  }

  try {
    const equipamento = await fetchEquipamento(equipamentoId);
    const historico = await fetchHistoricoManutencoes(equipamentoId);

    renderDetalhesEquipamento(equipamento);
    renderHistorico(historico.manutencoes || []);
  } catch (error) {
    console.error(error);
    alert(error.message);
    window.location.href = "./equipamentos.html";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("btnLogout")?.addEventListener("click", logout);
  document.getElementById("btnVoltarEquipamentos")?.addEventListener("click", () => {
    window.location.href = "./equipamentos.html";
  });

  carregarDetalheEquipamento();
});