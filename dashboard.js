let equipamentosBase = [];
let manutencoesBase = [];

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function renderEmpty(containerId, message) {
  const container = document.getElementById(containerId);
  if (container) container.innerHTML = `<p class="empty">${escapeHtml(message)}</p>`;
}

function daysUntil(dateString) {
  if (!dateString) return null;

  const today = new Date();
  const target = new Date(dateString);

  if (Number.isNaN(target.getTime())) return null;

  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);

  const diff = target - today;
  return Math.round(diff / (1000 * 60 * 60 * 24));
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
  return parseApiList(data);
}

async function fetchManutencoes() {
  try {
    const response = await fetch(`${window.API_URL}/manutencoes/?pagina=1&por_pagina=100`, {
      method: "GET",
      headers: authHeaders()
    });

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return parseApiList(data);
  } catch (error) {
    console.warn("Rotas de manutenção indisponíveis:", error);
    return [];
  }
}

function getDashboardFilters() {
  return {
    status: document.getElementById("filtroStatusDashboard")?.value || "",
    busca: normalizeText(document.getElementById("buscaDashboard")?.value || "")
  };
}

function getManutencoesDoEquipamento(equipamentoId, manutencoes) {
  return manutencoes.filter((man) => Number(man.equipamento_id) === Number(equipamentoId));
}

function equipamentoTemManutencaoEmAndamento(equipamentoId, manutencoes) {
  return getManutencoesDoEquipamento(equipamentoId, manutencoes).some(
    (man) => normalizeText(man.status) === "em andamento"
  );
}

function getStatusExibicaoEquipamento(eq, manutencoes) {
  if (equipamentoTemManutencaoEmAndamento(eq.id, manutencoes)) {
    return "em manutenção";
  }

  const statusOriginal = normalizeText(eq.status);

  if (statusOriginal === "parado") {
    return "parado";
  }

  return "operando";
}

function enrichEquipamentosComStatusDashboard(equipamentos, manutencoes) {
  return equipamentos.map((eq) => ({
    ...eq,
    status_dashboard: getStatusExibicaoEquipamento(eq, manutencoes)
  }));
}

function filtrarEquipamentos(equipamentos) {
  const { status, busca } = getDashboardFilters();

  return equipamentos.filter((eq) => {
    const statusBase = eq.status_dashboard || eq.status || "";
    const statusOk = !status || normalizeText(statusBase) === normalizeText(status);
    const textoBase = normalizeText(`${eq.nome || ""} ${eq.modelo || ""} ${eq.fabricante || ""}`);
    const buscaOk = !busca || textoBase.includes(busca);
    return statusOk && buscaOk;
  });
}

function computeResumo(equipamentosFiltrados, manutencoes) {
  const total = equipamentosFiltrados.length;
  const operando = equipamentosFiltrados.filter(
    (eq) => normalizeText(eq.status_dashboard) === "operando"
  ).length;
  const manutencao = equipamentosFiltrados.filter(
    (eq) => normalizeText(eq.status_dashboard) === "em manutencao"
  ).length;
  const parado = equipamentosFiltrados.filter(
    (eq) => normalizeText(eq.status_dashboard) === "parado"
  ).length;

  let noPrazo = 0;
  let vencendo = 0;
  let vencidas = 0;

  manutencoes.forEach((man) => {
    const status = normalizeText(man.status);
    if (status === "concluida" || status === "realizada") return;

    const dias = daysUntil(man.data_prevista);
    if (dias === null) return;

    if (dias < 0) vencidas++;
    else if (dias <= 7) vencendo++;
    else noPrazo++;
  });

  return {
    total,
    operando,
    manutencao,
    parado,
    noPrazo,
    vencendo,
    vencidas
  };
}

function updateCards(resumo) {
  setText("totalEquipamentos", resumo.total);
  setText("totalOperando", resumo.operando);
  setText("totalManutencao", resumo.manutencao);
  setText("totalParado", resumo.parado);
  setText("totalNoPrazo", resumo.noPrazo);
  setText("totalVencendo", resumo.vencendo);
  setText("totalVencidas", resumo.vencidas);
}

function renderAlertas(equipamentos, manutencoes) {
  const container = document.getElementById("listaAlertas");
  if (!container) return;

  const alertas = [];

  equipamentos.forEach((eq) => {
    const status = normalizeText(eq.status_dashboard || eq.status);

    if (status === "parado") {
      alertas.push({ tipo: "danger", texto: `${eq.nome} está parado.` });
    }

    if (status === "em manutencao") {
      alertas.push({ tipo: "warning", texto: `${eq.nome} está em manutenção.` });
    }
  });

  manutencoes.forEach((man) => {
    const nomeEquipamento = man.equipamento_nome || `Equipamento #${man.equipamento_id || "-"}`;
    const dias = daysUntil(man.data_prevista);
    const status = normalizeText(man.status);

    if (status === "concluida" || status === "realizada") return;
    if (dias === null) return;

    if (dias < 0) {
      alertas.push({
        tipo: "danger",
        texto: `Manutenção vencida de ${nomeEquipamento}. Prevista para ${formatDateBR(man.data_prevista)}.`
      });
    } else if (dias <= 7) {
      alertas.push({
        tipo: "warning",
        texto: `Manutenção de ${nomeEquipamento} vence em ${dias} dia(s).`
      });
    }
  });

  if (!alertas.length) {
    container.innerHTML = `<p class="empty">Nenhum alerta no momento.</p>`;
    return;
  }

  container.innerHTML = alertas
    .map((item) => `<div class="list-item ${item.tipo}">${escapeHtml(item.texto)}</div>`)
    .join("");
}

function renderStatusSummary(equipamentos) {
  const container = document.getElementById("listaStatus");
  if (!container) return;

  const operando = equipamentos.filter(
    (eq) => normalizeText(eq.status_dashboard) === "operando"
  ).length;
  const manutencao = equipamentos.filter(
    (eq) => normalizeText(eq.status_dashboard) === "em manutencao"
  ).length;
  const parado = equipamentos.filter(
    (eq) => normalizeText(eq.status_dashboard) === "parado"
  ).length;

  container.innerHTML = `
    <div class="list-item neutral"><strong>Operando:</strong> ${operando}</div>
    <div class="list-item neutral"><strong>Em manutenção:</strong> ${manutencao}</div>
    <div class="list-item neutral"><strong>Parado:</strong> ${parado}</div>
  `;
}

function buildBars(dataMap) {
  const entries = Object.entries(dataMap);
  if (!entries.length) return `<p class="empty">Sem dados.</p>`;

  const max = Math.max(...entries.map(([, value]) => value), 1);

  return entries.map(([label, value]) => {
    const width = Math.max((value / max) * 100, value > 0 ? 10 : 0);
    return `
      <div class="bar-row">
        <div class="bar-label">${escapeHtml(label)}</div>
        <div class="bar-track">
          <div class="bar-fill" style="width:${width}%"></div>
        </div>
        <div class="bar-value">${value}</div>
      </div>
    `;
  }).join("");
}

function renderGraficoStatus(equipamentos) {
  const container = document.getElementById("graficoStatus");
  if (!container) return;

  const map = {
    Operando: equipamentos.filter(
      (eq) => normalizeText(eq.status_dashboard) === "operando"
    ).length,
    "Em manutenção": equipamentos.filter(
      (eq) => normalizeText(eq.status_dashboard) === "em manutencao"
    ).length,
    Parado: equipamentos.filter(
      (eq) => normalizeText(eq.status_dashboard) === "parado"
    ).length
  };

  container.innerHTML = buildBars(map);
}

function renderTipos(equipamentos) {
  const container = document.getElementById("listaTipos");
  const chart = document.getElementById("graficoTipos");
  if (!container || !chart) return;

  const tipos = {};

  equipamentos.forEach((eq) => {
    const chave = eq.fabricante || "Não informado";
    tipos[chave] = (tipos[chave] || 0) + 1;
  });

  const entries = Object.entries(tipos).sort((a, b) => b[1] - a[1]);

  if (!entries.length) {
    container.innerHTML = `<p class="empty">Nenhum fabricante encontrado.</p>`;
    chart.innerHTML = `<p class="empty">Sem dados.</p>`;
    return;
  }

  container.innerHTML = entries
    .map(([tipo, quantidade]) => `<div class="list-item neutral"><strong>${escapeHtml(tipo)}:</strong> ${quantidade}</div>`)
    .join("");

  chart.innerHTML = buildBars(Object.fromEntries(entries));
}

function renderManutencoesCriticas(manutencoes) {
  const container = document.getElementById("listaManutencoesCriticas");
  if (!container) return;

  const criticas = manutencoes
    .filter((man) => {
      const dias = daysUntil(man.data_prevista);
      const prioridade = normalizeText(man.prioridade);
      const status = normalizeText(man.status);

      if (status === "concluida" || status === "realizada") return false;
      return prioridade === "alta" || prioridade === "critica" || (dias !== null && dias <= 7);
    })
    .sort((a, b) => {
      const da = daysUntil(a.data_prevista);
      const db = daysUntil(b.data_prevista);
      return (da ?? 9999) - (db ?? 9999);
    });

  if (!criticas.length) {
    container.innerHTML = `<p class="empty">Nenhuma manutenção crítica.</p>`;
    return;
  }

  container.innerHTML = criticas.map((man) => {
    const dias = daysUntil(man.data_prevista);
    const nomeEquipamento = man.equipamento_nome || `Equipamento #${man.equipamento_id || "-"}`;

    return `
      <div class="list-item danger">
        <strong>${escapeHtml(nomeEquipamento)}</strong><br>
        <span>${escapeHtml(man.titulo || man.descricao || "Sem descrição")}</span><br>
        <span>Prevista: ${formatDateBR(man.data_prevista)}</span><br>
        <span>Prioridade: ${escapeHtml(man.prioridade || "-")}</span><br>
        <span>${dias !== null ? `Prazo: ${dias} dia(s)` : "Prazo não informado"}</span>
      </div>
    `;
  }).join("");
}

function renderEquipamentosList(equipamentos) {
  const container = document.getElementById("listaEquipamentos");
  if (!container) return;

  if (!equipamentos.length) {
    container.innerHTML = `<p class="empty">Nenhum equipamento encontrado.</p>`;
    return;
  }

  container.innerHTML = equipamentos.map((eq) => `
    <div class="list-item neutral">
      <strong>${escapeHtml(eq.nome || "Sem nome")}</strong><br>
      <span>Fabricante: ${escapeHtml(eq.fabricante || "-")}</span> |
      <span>Modelo: ${escapeHtml(eq.modelo || "-")}</span> |
      <span>Ano: ${escapeHtml(eq.ano || "-")}</span> |
      <span>Status: ${escapeHtml(eq.status_dashboard || eq.status || "-")}</span>
    </div>
  `).join("");
}

function renderDashboard() {
  const equipamentosComStatus = enrichEquipamentosComStatusDashboard(
    equipamentosBase,
    manutencoesBase
  );

  const equipamentosFiltrados = filtrarEquipamentos(equipamentosComStatus);
  const ids = new Set(equipamentosFiltrados.map((eq) => Number(eq.id)));
  const manutencoesRelacionadas = manutencoesBase.filter((man) =>
    ids.has(Number(man.equipamento_id))
  );

  const resumo = computeResumo(equipamentosFiltrados, manutencoesRelacionadas);

  updateCards(resumo);
  renderAlertas(equipamentosFiltrados, manutencoesRelacionadas);
  renderStatusSummary(equipamentosFiltrados);
  renderGraficoStatus(equipamentosFiltrados);
  renderTipos(equipamentosFiltrados);
  renderManutencoesCriticas(manutencoesRelacionadas);
  renderEquipamentosList(equipamentosFiltrados);
}

async function carregarDashboard() {
  try {
    equipamentosBase = await fetchEquipamentos();
    manutencoesBase = await fetchManutencoes();
    renderDashboard();
  } catch (error) {
    console.error(error);
    renderEmpty("listaAlertas", `Erro ao carregar dashboard: ${error.message}`);
    renderEmpty("listaStatus", "Não foi possível carregar.");
    renderEmpty("listaTipos", "Não foi possível carregar.");
    renderEmpty("listaManutencoesCriticas", "Não foi possível carregar.");
    renderEmpty("listaEquipamentos", "Não foi possível carregar.");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("btnLogout")?.addEventListener("click", logout);
  document.getElementById("btnAtualizarDashboard")?.addEventListener("click", carregarDashboard);
  document.getElementById("filtroStatusDashboard")?.addEventListener("change", carregarDashboard);
  document.getElementById("buscaDashboard")?.addEventListener("input", carregarDashboard);

  carregarDashboard();
});