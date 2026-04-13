const express = require("express");
const fs = require("fs");
const cors = require("cors");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.static(__dirname));

const eventosFile = path.join(__dirname, "eventos.json");
const solFile = path.join(__dirname, "solicitacoes.json");
const adminFile = path.join(__dirname, "admin.json");

if (!fs.existsSync(eventosFile)) fs.writeFileSync(eventosFile, "[]");
if (!fs.existsSync(solFile)) fs.writeFileSync(solFile, "[]");

if (!fs.existsSync(adminFile)) {
    const adminPadrao = { email: "admin@lab.com", senha: "123" };
    fs.writeFileSync(adminFile, JSON.stringify(adminPadrao, null, 2));
}

function isDataPassada(dataISO) {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const dataComparar = new Date(dataISO);
    dataComparar.setHours(0, 0, 0, 0);
    return dataComparar < hoje;
}

function horarioParaMinutos(horario) {
    const [hora, minuto] = horario.split(":").map(Number);
    return hora * 60 + minuto;
}

function verificarConflito(ag1, ag2) {
    const inicio1 = horarioParaMinutos(ag1.horarioInicio);
    const fim1 = horarioParaMinutos(ag1.horarioFim);
    const inicio2 = horarioParaMinutos(ag2.horarioInicio);
    const fim2 = horarioParaMinutos(ag2.horarioFim);
    return (inicio1 < fim2 && fim1 > inicio2);
}

app.post("/login-admin", (req, res) => {
    const { email, senha } = req.body;
    
    try {
        const admin = JSON.parse(fs.readFileSync(adminFile));
        if (email === admin.email && senha === admin.senha) {
            return res.json({ ok: true, role: "admin" });
        }
    } catch (error) {
        const adminPadrao = { email: "admin@lab.com", senha: "123" };
        fs.writeFileSync(adminFile, JSON.stringify(adminPadrao, null, 2));
        if (email === adminPadrao.email && senha === adminPadrao.senha) {
            return res.json({ ok: true, role: "admin" });
        }
    }
    
    res.status(400).json({ erro: "Email ou senha inválidos" });
});

app.post("/redefinir-senha", (req, res) => {
    const { email, novaSenha } = req.body;
    
    if (email !== "admin@lab.com") {
        return res.status(400).json({ erro: "Email não cadastrado no sistema" });
    }
    
    if (!novaSenha || novaSenha.length < 3) {
        return res.status(400).json({ erro: "A nova senha deve ter pelo menos 3 caracteres" });
    }
    
    try {
        const admin = JSON.parse(fs.readFileSync(adminFile));
        admin.senha = novaSenha;
        fs.writeFileSync(adminFile, JSON.stringify(admin, null, 2));
        return res.json({ ok: true, mensagem: "Senha atualizada com sucesso!" });
    } catch (error) {
        return res.status(500).json({ erro: "Erro interno ao salvar senha" });
    }
});

app.get("/eventos", (req, res) => {
    try {
        res.json(JSON.parse(fs.readFileSync(eventosFile)));
    } catch (error) {
        res.json([]);
    }
});

app.post("/eventos", (req, res) => {
    const { start } = req.body;
    if (isDataPassada(start)) {
        return res.status(400).json({ erro: "Não é possível marcar datas passadas" });
    }
    const list = JSON.parse(fs.readFileSync(eventosFile));
    const novo = { id: Date.now(), title: "Disponível", start: start };
    list.push(novo);
    fs.writeFileSync(eventosFile, JSON.stringify(list, null, 2));
    res.json(novo);
});

app.delete("/eventos/:id", (req, res) => {
    let list = JSON.parse(fs.readFileSync(eventosFile));
    list = list.filter(e => String(e.id) !== String(req.params.id));
    fs.writeFileSync(eventosFile, JSON.stringify(list, null, 2));
    res.json({ ok: true });
});

app.get("/solicitacoes", (req, res) => {
    try {
        res.json(JSON.parse(fs.readFileSync(solFile)));
    } catch (error) {
        res.json([]);
    }
});

app.post("/solicitacoes", (req, res) => {
    const { data, horarioInicio, horarioFim } = req.body;
    if (isDataPassada(data)) {
        return res.status(400).json({ erro: "Data passada não pode" });
    }
    const solicitacoesExistentes = JSON.parse(fs.readFileSync(solFile));
    const solicitacoesMesmaData = solicitacoesExistentes.filter(s => s.data === data);
    const novoAgendamento = { horarioInicio, horarioFim };
    const temConflito = solicitacoesMesmaData.some(s => {
        const existente = { horarioInicio: s.horarioInicio, horarioFim: s.horarioFim };
        return verificarConflito(novoAgendamento, existente);
    });
    if (temConflito) {
        return res.status(400).json({ erro: "Horário conflita com outro" });
    }
    const list = JSON.parse(fs.readFileSync(solFile));
    list.push({ id: Date.now(), ...req.body, status: "recebido" });
    fs.writeFileSync(solFile, JSON.stringify(list, null, 2));
    res.json({ ok: true });
});

app.put("/solicitacoes/status", (req, res) => {
    const { id, status } = req.body;
    let list = JSON.parse(fs.readFileSync(solFile));
    list = list.map(s => {
        if (String(s.id) === String(id)) {
            return { ...s, status };
        }
        return s;
    });
    fs.writeFileSync(solFile, JSON.stringify(list, null, 2));
    res.json({ ok: true });
});

app.delete("/solicitacoes/:id", (req, res) => {
    let list = JSON.parse(fs.readFileSync(solFile));
    list = list.filter(s => String(s.id) !== String(req.params.id));
    fs.writeFileSync(solFile, JSON.stringify(list, null, 2));
    res.json({ ok: true });
});

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`✅ Servidor rodando na porta ${PORT}`);
});
