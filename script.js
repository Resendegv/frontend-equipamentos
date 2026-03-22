const loginForm = document.getElementById("loginForm");
const mensagem = document.getElementById("mensagem");
const btnEntrar = document.getElementById("btnEntrar");

if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const username = document.getElementById("username").value.trim();
    const senha = document.getElementById("senha").value.trim();

    mensagem.textContent = "";
    mensagem.style.color = "black";

    if (!username || !senha) {
      mensagem.textContent = "Preencha usuário e senha.";
      mensagem.style.color = "red";
      return;
    }

    btnEntrar.disabled = true;
    btnEntrar.textContent = "Entrando...";
    mensagem.textContent = "Validando acesso...";

    try {
      const response = await fetch(`${window.API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
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

      if (!data.access_token) {
        throw new Error("Token não retornado pela API.");
      }

      setToken(data.access_token, data.token_type || "bearer");

      mensagem.textContent = "Login realizado com sucesso!";
      mensagem.style.color = "green";

      setTimeout(() => {
        window.location.href = "./dashboard.html";
      }, 500);
    } catch (error) {
      mensagem.textContent = error.message || "Erro ao conectar com a API.";
      mensagem.style.color = "red";
      console.error("Erro no login:", error);
    } finally {
      btnEntrar.disabled = false;
      btnEntrar.textContent = "Entrar";
    }
  });
}