let dataSelecionada = "";
let currentToastTimeout = null;

const TURNOS = {
    MANHA: { nome: "Manhã", inicio: "07:30", fim: "11:30", cor: "#2ecc71" },
    TARDE: { nome: "Tarde", inicio: "13:30", fim: "17:30", cor: "#3498db" },
    NOITE: { nome: "Noite", inicio: "18:30", fim: "22:30", cor: "#9b59b6" }
};

const horariosDisponiveis = [
    "07:30", "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
    "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
    "18:30", "19:00", "19:30", "20:00", "20:30", "21:00", "21:30", "22:00", "22:30"
];

function horarioParaMinutos(horario) {
    const [hora, minuto] = horario.split(":").map(Number);
    return hora * 60 + minuto;
}

function getTurnoPorHorario(horario) {
    const minutos = horarioParaMinutos(horario);
    const manhaInicio = horarioParaMinutos(TURNOS.MANHA.inicio);
    const manhaFim = horarioParaMinutos(TURNOS.MANHA.fim);
    const tardeInicio = horarioParaMinutos(TURNOS.TARDE.inicio);
    const tardeFim = horarioParaMinutos(TURNOS.TARDE.fim);
    const noiteInicio = horarioParaMinutos(TURNOS.NOITE.inicio);
    const noiteFim = horarioParaMinutos(TURNOS.NOITE.fim);
    if (minutos >= manhaInicio && minutos <= manhaFim) return TURNOS.MANHA;
    if (minutos >= tardeInicio && minutos <= tardeFim) return TURNOS.TARDE;
    if (minutos >= noiteInicio && minutos <= noiteFim) return TURNOS.NOITE;
    return null;
}

function horarioInicioOcupado(solicitacoesHoje, horarioInicio, horarioFim) {
    return solicitacoesHoje.some(s => {
        const inicioExistente = horarioParaMinutos(s.horarioInicio);
        const fimExistente = horarioParaMinutos(s.horarioFim);
        const inicioTeste = horarioParaMinutos(horarioInicio);
        return inicioTeste >= inicioExistente && inicioTeste < fimExistente;
    });
}

function verificarConflito(agendamento1, agendamento2) {
    const inicio1 = horarioParaMinutos(agendamento1.horarioInicio);
    const fim1 = horarioParaMinutos(agendamento1.horarioFim);
    const inicio2 = horarioParaMinutos(agendamento2.horarioInicio);
    const fim2 = horarioParaMinutos(agendamento2.horarioFim);
    return (inicio1 < fim2 && fim1 > inicio2);
}

async function verificarDisponibilidadeHorario(data, horarioInicio, horarioFim) {
    try {
        const response = await fetch("/solicitacoes");
        const solicitacoes = await response.json();
        const solicitacoesMesmaData = solicitacoes.filter(s => s.data === data);
        const novoAgendamento = { horarioInicio, horarioFim };
        const temConflito = solicitacoesMesmaData.some(s => {
            const existente = { horarioInicio: s.horarioInicio, horarioFim: s.horarioFim };
            return verificarConflito(novoAgendamento, existente);
        });
        if (temConflito) {
            return { disponivel: false, motivo: "Este horário conflita com outro agendamento existente" };
        }
        return { disponivel: true, motivo: null };
    } catch (error) {
        console.error("Erro ao verificar disponibilidade:", error);
        return { disponivel: true, motivo: null };
    }
}

function isDataPassada(dataISO) {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const dataComparar = new Date(dataISO);
    dataComparar.setHours(0, 0, 0, 0);
    return dataComparar < hoje;
}

function formatarDataBrasileira(dataISO) {
    if (!dataISO) return "";
    const [ano, mes, dia] = dataISO.split("-");
    return `${dia}/${mes}/${ano}`;
}

let loadingTimeout = null;

function mostrarLoadingGlobal(mostrar) {
    const loadingEl = document.getElementById("globalLoading");
    if (!loadingEl) return;
    if (mostrar) {
        if (loadingTimeout) clearTimeout(loadingTimeout);
        loadingEl.style.display = "flex";
    } else {
        loadingTimeout = setTimeout(() => {
            loadingEl.style.display = "none";
            loadingTimeout = null;
        }, 400);
    }
}

function mostrarToast(mensagem, tipo = "success") {
    const toast = document.getElementById("toast");
    if (currentToastTimeout) clearTimeout(currentToastTimeout);
    toast.textContent = mensagem;
    toast.className = `toast ${tipo} show`;
    currentToastTimeout = setTimeout(() => {
        toast.className = "toast";
    }, 3000);
}

function mostrar(page) {
    console.log("Mudando para página:", page);
    document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
    const paginaSelecionada = document.getElementById(page);
    if (paginaSelecionada) {
        paginaSelecionada.classList.add("active");
    }
    document.querySelectorAll(".nav-btn").forEach(btn => {
        if (btn.getAttribute("data-page") === page) {
            btn.classList.add("active");
        } else {
            btn.classList.remove("active");
        }
    });
    if (page === "solicitacoes") {
        carregarSolicitacoes();
    }
}

function toggleFaq(element) {
    const faqItem = element.parentElement;
    faqItem.classList.toggle("active");
}

function logout() {
    if (confirm("Tem certeza que deseja sair?")) {
        localStorage.removeItem("role");
        window.location.href = "index.html";
    }
}

async function abrirFormulario(data) {
    if (isDataPassada(data)) {
        mostrarToast("❌ Não é possível agendar em datas passadas!", "error");
        return;
    }
    dataSelecionada = data;
    document.getElementById("dataSelecionada").innerHTML = `<strong>📅 Data selecionada:</strong> ${formatarDataBrasileira(data)}`;
    const selectInicio = document.getElementById("horarioInicioSelect");
    const selectFim = document.getElementById("horarioFimSelect");
    selectInicio.innerHTML = '<option value="">Selecione o horário de início</option>';
    selectFim.innerHTML = '<option value="">Primeiro selecione o horário de início</option>';
    selectFim.disabled = true;
    mostrarLoadingGlobal(true);
    try {
        const response = await fetch("/solicitacoes");
        const solicitacoes = await response.json();
        const solicitacoesHoje = solicitacoes.filter(s => s.data === data);
        horariosDisponiveis.forEach(h => {
            const opt = document.createElement("option");
            opt.value = h;
            opt.textContent = h;
            const inicioOcupado = horarioInicioOcupado(solicitacoesHoje, h, null);
            if (inicioOcupado) {
                opt.disabled = true;
                opt.textContent += " (ocupado)";
            }
            selectInicio.appendChild(opt);
        });
        selectInicio.onchange = function() {
            const horarioInicio = this.value;
            if (!horarioInicio) {
                selectFim.innerHTML = '<option value="">Primeiro selecione o horário de início</option>';
                selectFim.disabled = true;
                return;
            }
            const turno = getTurnoPorHorario(horarioInicio);
            if (!turno) {
                mostrarToast("❌ Horário inválido!", "error");
                selectFim.innerHTML = '<option value="">Horário inválido</option>';
                selectFim.disabled = true;
                return;
            }
            const horariosFim = horariosDisponiveis.filter(h => {
                const minutosH = horarioParaMinutos(h);
                const minutosInicio = horarioParaMinutos(horarioInicio);
                const minutosFimTurno = horarioParaMinutos(turno.fim);
                return minutosH > minutosInicio && minutosH <= minutosFimTurno;
            });
            selectFim.innerHTML = "";
            selectFim.disabled = false;
            if (horariosFim.length === 0) {
                selectFim.innerHTML = '<option value="">Nenhum horário disponível</option>';
                selectFim.disabled = true;
            } else {
                const optionPadrao = document.createElement("option");
                optionPadrao.value = "";
                optionPadrao.textContent = "Selecione o horário de término";
                selectFim.appendChild(optionPadrao);
                horariosFim.forEach(h => {
                    const opt = document.createElement("option");
                    opt.value = h;
                    opt.textContent = h;
                    const testeAgendamento = { horarioInicio, horarioFim: h };
                    const temConflito = solicitacoesHoje.some(s => {
                        const existente = { horarioInicio: s.horarioInicio, horarioFim: s.horarioFim };
                        return verificarConflito(testeAgendamento, existente);
                    });
                    if (temConflito) {
                        opt.disabled = true;
                        opt.textContent += " (conflita)";
                    }
                    selectFim.appendChild(opt);
                });
            }
        };
    } catch (error) {
        console.error("Erro ao carregar horários:", error);
        horariosDisponiveis.forEach(h => {
            const opt = document.createElement("option");
            opt.value = h;
            opt.textContent = h;
            selectInicio.appendChild(opt);
        });
    } finally {
        mostrarLoadingGlobal(false);
    }
    document.getElementById("nome").value = "";
    document.getElementById("celular").value = "";
    document.getElementById("pessoas").value = "";
    document.getElementById("descricao").value = "";
    document.getElementById("especificacoes").value = "";
    document.getElementById("anexo").value = "";
    document.getElementById("modal").style.display = "flex";
}

function fecharModal() {
    document.getElementById("modal").style.display = "none";
}

function validarFormulario(dados) {
    const erros = [];
    if (!dados.nome || dados.nome.trim().length < 3) {
        erros.push("Nome deve ter pelo menos 3 caracteres");
    }
    if (!dados.celular || dados.celular.replace(/\D/g, '').length < 10) {
        erros.push("Celular inválido");
    }
    if (!dados.pessoas || dados.pessoas < 1 || dados.pessoas > 50) {
        erros.push("Número de pessoas inválido");
    }
    if (!dados.descricao || dados.descricao.trim().length < 5) {
        erros.push("Descrição da solicitação é obrigatória");
    }
    if (!dados.horarioInicio || !dados.horarioFim) {
        erros.push("Selecione início e término");
    }
    if (dados.horarioInicio && dados.horarioFim) {
        if (horarioParaMinutos(dados.horarioFim) <= horarioParaMinutos(dados.horarioInicio)) {
            erros.push("Término deve ser após início");
        }
        if (getTurnoPorHorario(dados.horarioInicio) !== getTurnoPorHorario(dados.horarioFim)) {
            erros.push("Não pode cruzar turnos diferentes");
        }
    }
    return erros;
}

async function enviarSolicitacao() {
    if (isDataPassada(dataSelecionada)) {
        mostrarToast("❌ Data passada!", "error");
        fecharModal();
        return;
    }
    const nome = document.getElementById("nome").value.trim();
    const celular = document.getElementById("celular").value.trim();
    const pessoas = Number(document.getElementById("pessoas").value);
    const horarioInicio = document.getElementById("horarioInicioSelect").value;
    const horarioFim = document.getElementById("horarioFimSelect").value;
    const descricao = document.getElementById("descricao").value.trim();
    const especificacoes = document.getElementById("especificacoes").value.trim();
    const file = document.getElementById("anexo").files[0];
    if (!horarioInicio || !horarioFim) {
        mostrarToast("❌ Selecione início e término!", "error");
        return;
    }
    if (!descricao) {
        mostrarToast("❌ Descreva sua solicitação!", "error");
        return;
    }
    const turno = getTurnoPorHorario(horarioInicio);
    if (turno !== getTurnoPorHorario(horarioFim)) {
        mostrarToast("❌ Não pode cruzar turnos!", "error");
        return;
    }
    mostrarLoadingGlobal(true);
    const disponibilidade = await verificarDisponibilidadeHorario(dataSelecionada, horarioInicio, horarioFim);
    mostrarLoadingGlobal(false);
    if (!disponibilidade.disponivel) {
        mostrarToast(`❌ ${disponibilidade.motivo}`, "error");
        return;
    }
    const dadosBase = {
        data: dataSelecionada,
        horarioInicio, horarioFim,
        turno: turno.nome,
        nome, celular, pessoas, descricao, especificacoes
    };
    const erros = validarFormulario(dadosBase);
    if (erros.length > 0) {
        mostrarToast("❌ " + erros[0], "error");
        return;
    }
    const btnEnviar = document.getElementById("btnEnviarSolicitacao");
    const textoOriginal = btnEnviar.innerHTML;
    btnEnviar.disabled = true;
    btnEnviar.innerHTML = '<span class="loading-spinner"></span> Enviando...';
    mostrarLoadingGlobal(true);
    if (file) {
        if (file.size > 10 * 1024 * 1024) {
            mostrarToast("❌ Arquivo >10MB", "error");
            btnEnviar.disabled = false;
            btnEnviar.innerHTML = textoOriginal;
            mostrarLoadingGlobal(false);
            return;
        }
        const reader = new FileReader();
        reader.onload = () => send({ ...dadosBase, anexo: reader.result }, btnEnviar, textoOriginal);
        reader.onerror = () => {
            mostrarToast("❌ Erro no arquivo", "error");
            btnEnviar.disabled = false;
            btnEnviar.innerHTML = textoOriginal;
            mostrarLoadingGlobal(false);
        };
        reader.readAsDataURL(file);
    } else {
        send(dadosBase, btnEnviar, textoOriginal);
    }
}

function send(data, btnEnviar, textoOriginal) {
    fetch("/solicitacoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    })
    .then(async response => {
        if (!response.ok) {
            const erro = await response.json();
            throw new Error(erro.erro || "Erro");
        }
        return response.json();
    })
    .then(() => {
        mostrarToast("✅ Solicitação enviada com sucesso!", "success");
        fecharModal();
        if (document.getElementById("solicitacoes").classList.contains("active")) {
            carregarSolicitacoes();
        }
    })
    .catch(error => mostrarToast(`❌ ${error.message}`, "error"))
    .finally(() => {
        btnEnviar.disabled = false;
        btnEnviar.innerHTML = textoOriginal;
        mostrarLoadingGlobal(false);
    });
}

function carregarSolicitacoes() {
    const container = document.getElementById("solicitacoesList");
    if (!container) return;
    container.innerHTML = '<div class="loading-cards">🔄 Carregando...</div>';
    fetch("/solicitacoes")
        .then(r => r.json())
        .then(data => {
            if (!container) return;
            container.innerHTML = "";
            if (data.length === 0) {
                container.innerHTML = '<div class="empty-state">📭 Nenhuma solicitação encontrada</div>';
                return;
            }
            data.sort((a, b) => new Date(b.data) - new Date(a.data));
            const colunas = [
                { id: "recebido", titulo: "📥 Recebido", cor: "#f1c40f" },
                { id: "analise", titulo: "🔍 Em análise", cor: "#3498db" },
                { id: "fazendo", titulo: "⚙️ Em andamento", cor: "#e67e22" },
                { id: "concluido", titulo: "✅ Concluído", cor: "#2ecc71" }
            ];
            const kanbanGrid = document.createElement("div");
            kanbanGrid.className = "kanban-grid";
            colunas.forEach(coluna => {
                const solicitacoesColuna = data.filter(s => s.status === coluna.id);
                const colunaDiv = document.createElement("div");
                colunaDiv.className = "kanban-coluna";
                colunaDiv.innerHTML = `<div class="kanban-header" style="background: ${coluna.cor}20; border-left: 4px solid ${coluna.cor};"><h3>${coluna.titulo}</h3><span class="kanban-count">${solicitacoesColuna.length}</span></div><div class="kanban-cards" id="kanban-${coluna.id}"></div>`;
                const cardsContainer = colunaDiv.querySelector(`.kanban-cards`);
                solicitacoesColuna.forEach(s => {
                    cardsContainer.appendChild(criarCardSolicitacao(s));
                });
                kanbanGrid.appendChild(colunaDiv);
            });
            container.appendChild(kanbanGrid);
        })
        .catch(error => {
            console.error("Erro:", error);
            container.innerHTML = '<div class="error-state">❌ Erro ao carregar solicitações</div>';
        });
}

function criarCardSolicitacao(s) {
    const div = document.createElement("div");
    div.className = "kanban-card";
    const temAnexo = s.anexo ? true : false;
    if (!temAnexo) {
        div.classList.add("sem-anexo");
    }
    const dataPassada = isDataPassada(s.data);
    let turnoCor = "#2ecc71";
    if (s.turno === "Tarde") turnoCor = "#3498db";
    if (s.turno === "Noite") turnoCor = "#9b59b6";
    let anexoHTML = "";
    if (s.anexo) {
        if (s.anexo.startsWith("data:application/pdf")) {
            anexoHTML = `<a href="${s.anexo}" target="_blank" class="card-anexo-link">📄 PDF</a>`;
        } else {
            anexoHTML = `<img src="${s.anexo}" onclick="abrirImagem('${s.anexo}')" class="card-anexo-img">`;
        }
    }
    div.innerHTML = `<div class="card-id">#${s.id}</div><div class="card-title">${escapeHtml(s.nome)}</div><div class="card-details"><div>📞 ${escapeHtml(s.celular)}</div><div>👥 ${s.pessoas} pessoa(s)</div><div>📅 ${formatarDataBrasileira(s.data)}</div><div>⏰ ${s.horarioInicio} às ${s.horarioFim}</div><div class="card-turno" style="background: ${turnoCor}20; color: ${turnoCor};">${s.turno === "Manhã" ? "🌅" : "🌙"} ${s.turno}</div></div><div class="card-descricao"><strong>📝 Descrição:</strong><br>${escapeHtml(s.descricao)}</div>${s.especificacoes ? `<div class="card-especificacoes"><strong>🔧 Especificações:</strong><br>${escapeHtml(s.especificacoes)}</div>` : ''}${anexoHTML ? `<div class="card-anexo">${anexoHTML}</div>` : ''}${dataPassada ? '<div class="card-expirada">📅 Data expirada</div>' : ''}`;
    if (localStorage.getItem("role") === "admin") {
        const adminActions = document.createElement("div");
        adminActions.className = "card-actions";
        const select = document.createElement("select");
        select.className = "card-status-select";
        select.innerHTML = `<option value="recebido" ${s.status === "recebido" ? "selected" : ""}>📥 Recebido</option><option value="analise" ${s.status === "analise" ? "selected" : ""}>🔍 Análise</option><option value="fazendo" ${s.status === "fazendo" ? "selected" : ""}>⚙️ Fazendo</option><option value="concluido" ${s.status === "concluido" ? "selected" : ""}>✅ Concluído</option>`;
        select.onchange = function() {
            const novoStatus = this.value;
            const statusText = this.options[this.selectedIndex].text;
            this.disabled = true;
            mostrarLoadingGlobal(true);
            fetch("/solicitacoes/status", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: s.id, status: novoStatus })
            })
            .then(() => {
                mostrarToast(`✅ Status: ${statusText}`, "success");
                carregarSolicitacoes();
            })
            .catch(() => {
                mostrarToast("❌ Erro", "error");
                this.value = s.status;
                this.disabled = false;
            })
            .finally(() => mostrarLoadingGlobal(false));
        };
        const delBtn = document.createElement("button");
        delBtn.className = "card-delete-btn";
        delBtn.innerHTML = "🗑️ Excluir";
        delBtn.onclick = () => {
            if (confirm("Excluir esta solicitação?")) {
                delBtn.disabled = true;
                delBtn.innerHTML = "⏳";
                mostrarLoadingGlobal(true);
                fetch(`/solicitacoes/${s.id}`, { method: "DELETE" })
                    .then(() => {
                        mostrarToast("✅ Excluída", "success");
                        carregarSolicitacoes();
                    })
                    .catch(() => {
                        mostrarToast("❌ Erro", "error");
                        delBtn.disabled = false;
                        delBtn.innerHTML = "🗑️ Excluir";
                    })
                    .finally(() => mostrarLoadingGlobal(false));
            }
        };
        adminActions.appendChild(select);
        adminActions.appendChild(delBtn);
        div.appendChild(adminActions);
    }
    return div;
}

function escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

function abrirImagem(src) {
    const modal = document.getElementById("imgModal");
    const img = document.getElementById("imgModalContent");
    img.src = src;
    modal.classList.add("show");
    document.body.style.overflow = "hidden";
}

function fecharImagemModal() {
    const modal = document.getElementById("imgModal");
    modal.classList.remove("show");
    document.getElementById("imgModalContent").src = "";
    document.body.style.overflow = "";
}

document.addEventListener("DOMContentLoaded", function () {
    const el = document.getElementById("calendar");
    if (!el) return;
    const role = localStorage.getItem("role") || "user";
    const badge = document.getElementById("userRoleBadge");
    if (badge) {
        badge.textContent = role === "admin" ? "👑 Admin" : "👤 Solicitante";
        badge.className = `user-badge ${role}`;
    }
    const calendar = new FullCalendar.Calendar(el, {
        initialView: "dayGridMonth",
        locale: "pt-br",
        headerToolbar: { left: "prev,next today", center: "title", right: "dayGridMonth" },
        buttonText: { today: "Hoje", month: "Mês" },
        events: "/eventos",
        eventColor: "#2ecc71",
        aspectRatio: 1.2,
        height: "auto",
        dayCellDidMount: function(info) {
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);
            const data = info.date;
            if (data < hoje) {
                info.el.style.backgroundColor = "#f5f5f5";
                info.el.style.opacity = "0.5";
                info.el.style.cursor = "not-allowed";
            } else if (data.getTime() === hoje.getTime()) {
                info.el.style.backgroundColor = "#d4edda";
                info.el.style.border = "2px solid #28
