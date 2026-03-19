const API_URL = "https://api-equipamentos2.onrender.com";

const loginForm = document.getElementById("loginForm");
const mensagem = document.getElementById("mensagem");

if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const username = document.getElementById("username").value.trim();
    const senha = document.getElementById("senha").value.trim();

    mensagem.textContent = "Entrando...";
    mensagem.style.color = "black";

    try {
      const body = new URLSearchParams();
      body.append("username", username);
      body.append("password", senha);

      const response = await fetch(`${API_URL}/auth/login-form`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      });

      const raw = await response.text();
      let data = {};

      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = { raw };
      }

      if (!response.ok) {
        throw new Error(
          `HTTP ${response.status} - ${data.detail || data.raw || "Erro no login"}`
        );
      }

      if (!data.access_token) {
        throw new Error("Token não retornado pela API");
      }

      localStorage.setItem("token", data.access_token);

      mensagem.textContent = "Login realizado com sucesso!";
      mensagem.style.color = "green";

      setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 800);
    } catch (error) {
      console.error("ERRO REAL DO LOGIN:", error);
      mensagem.textContent = error.message || "Erro ao conectar com a API";
      mensagem.style.color = "red";
    }
  });
}

function getToken() {
  return localStorage.getItem("token");
}

function logout() {
  localStorage.removeItem("token");
  window.location.href = "index.html";
}