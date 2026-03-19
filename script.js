const API_URL = "https://api-equipamentos2.onrender.com";

const loginForm = document.getElementById("loginForm");
const mensagem = document.getElementById("mensagem");

if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const username = document.getElementById("username").value.trim();
    const senha = document.getElementById("senha").value.trim();

    mensagem.textContent = "Entrando...";
    mensagem.className = "feedback";

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          username,
          password: senha
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Falha no login.");
      }

      const token = data.access_token || data.token;

      if (!token) {
        throw new Error("Token não retornado pela API.");
      }

      localStorage.setItem("token", token);

      mensagem.textContent = "Login realizado com sucesso.";
      mensagem.className = "feedback success";

      setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 400);
    } catch (error) {
      console.error("Erro no login:", error);
      mensagem.textContent = error.message;
      mensagem.className = "feedback error";
    }
  });
}