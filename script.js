const API_URL = "https://api-equipamentos2.onrender.com";

const loginForm = document.getElementById("loginForm");
const mensagem = document.getElementById("mensagem");

if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const username = document.getElementById("username").value.trim();
    const senha = document.getElementById("senha").value.trim();

    mensagem.textContent = "Entrando...";

    try {
      const formData = new URLSearchParams();
      formData.append("username", username);
      formData.append("password", senha);

const response = await fetch(`${API_URL}/auth/login-form`, {
  method: "POST",
  headers: {
    "Content-Type": "application/x-www-form-urlencoded"
  },
  body: new URLSearchParams({
    username,
    password: senha
  }).toString()
});

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Falha no login");
      }

      localStorage.setItem("token", data.access_token);

      mensagem.textContent = "Login realizado com sucesso";

      setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 500);
    } catch (error) {
      console.error("Erro no login:", error);
      mensagem.textContent = error.message || "Erro ao conectar com a API";
    }
  });
}