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

      const data = await response.json();

      if (!response.ok) {
        throw new Error(JSON.stringify(data));
      }

      localStorage.setItem("token", data.access_token);

      mensagem.textContent = "Login OK!";
      mensagem.style.color = "green";

      setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 800);

    } catch (error) {
      console.error("ERRO REAL:", error);
      mensagem.textContent = "Erro de conexão com API";
      mensagem.style.color = "red";
    }
  });
}