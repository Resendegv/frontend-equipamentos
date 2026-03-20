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

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

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
        signal: controller.signal,
      });

      clearTimeout(timeout);

      const text = await response.text();
      let data = {};

      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        data = { raw: text };
      }

      if (!response.ok) {
        throw new Error(data.detail || `HTTP ${response.status}`);
      }

      if (!data.access_token) {
        throw new Error("Token não retornado pela API");
      }

      localStorage.setItem("token", data.access_token);

      mensagem.textContent = "Login realizado com sucesso!";
      mensagem.style.color = "green";

      setTimeout(() => {
        window.location.href = "./dashboard.html";
      }, 500);
    } catch (error) {
      clearTimeout(timeout);

      if (error.name === "AbortError") {
        mensagem.textContent = "A API demorou para responder. Tente novamente em alguns segundos.";
      } else {
        mensagem.textContent = error.message || "Erro ao conectar com a API";
      }

      mensagem.style.color = "red";
      console.error("ERRO LOGIN:", error);
    }
  });
}

function getToken() {
  return localStorage.getItem("token");
}

function logout() {
  localStorage.removeItem("token");
  window.location.href = "./index.html";
}