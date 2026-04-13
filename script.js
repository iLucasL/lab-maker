document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        const tab = btn.getAttribute("data-tab");
        document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
        document.querySelectorAll(".login-panel").forEach(p => p.classList.remove("active"));
        btn.classList.add("active");
        document.getElementById(`${tab}Panel`).classList.add("active");
    });
});

document.getElementById("btnLogin").addEventListener("click", async () => {
    const email = document.getElementById("loginEmail").value.trim();
    const senha = document.getElementById("loginSenha").value.trim();
    if (!email || !senha) {
        mostrarToast("Preencha todos os campos!", "error");
        return;
    }
    const btn = document.getElementById("btnLogin");
    const originalText = btn.innerHTML;
    btn.innerHTML = "Verificando...";
    btn.disabled = true;
    await new Promise(resolve => setTimeout(resolve, 500));
    try {
        const res = await fetch("/login-admin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, senha })
        });
        const data = await res.json();
        if (res.ok) {
            mostrarToast("Login realizado com sucesso!", "success");
            sessionStorage.setItem("role", "admin");
            window.location.href = "home.html";
        } else {
            mostrarToast("Email ou senha invalidos", "error");
        }
    } catch (err) {
        mostrarToast("Erro ao conectar ao servidor", "error");
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
});

function entrarSolicitante() {
    mostrarToast("Entrando como solicitante...", "success");
    sessionStorage.setItem("role", "user");
    window.location.href = "home.html";
}

document.getElementById("esqueciSenha").addEventListener("click", async (e) => {
    e.preventDefault();
    const email = prompt("Digite seu email cadastrado:");
    if (!email) return;
    if (email !== "admin@lab.com") {
        mostrarToast("Email nao cadastrado no sistema!", "error");
        return;
    }
    const novaSenha = prompt("Digite a nova senha (minimo 3 caracteres):");
    if (!novaSenha) return;
    if (novaSenha.length < 3) {
        mostrarToast("A senha deve ter pelo menos 3 caracteres", "error");
        return;
    }
    try {
        const res = await fetch("/redefinir-senha", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, novaSenha })
        });
        const data = await res.json();
        if (res.ok) {
            mostrarToast(data.mensagem, "success");
        } else {
            mostrarToast(data.erro || "Erro ao redefinir senha", "error");
        }
    } catch (err) {
        mostrarToast("Erro ao conectar ao servidor", "error");
    }
});

let toastTimeout;
function mostrarToast(mensagem, tipo = "success") {
    const toast = document.getElementById("toast");
    if (toastTimeout) clearTimeout(toastTimeout);
    toast.textContent = mensagem;
    toast.className = `toast ${tipo} show`;
    toastTimeout = setTimeout(() => {
        toast.className = "toast";
    }, 3000);
}

function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.body.classList.add(savedTheme);
    updateThemeButton(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.body.classList.contains('dark') ? 'light' : 'dark';
    document.body.classList.remove('light', 'dark');
    document.body.classList.add(currentTheme);
    localStorage.setItem('theme', currentTheme);
    updateThemeButton(currentTheme);
}

function updateThemeButton(theme) {
    const btn = document.getElementById('themeToggle');
    if (btn) {
        btn.textContent = theme === 'dark' ? '☀️' : '🌙';
        btn.title = theme === 'dark' ? 'Modo claro' : 'Modo escuro';
    }
}

initTheme();
const themeBtn = document.getElementById('themeToggle');
if (themeBtn) {
    themeBtn.addEventListener('click', toggleTheme);
}
