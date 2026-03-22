(function () {
  const isLocal =
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === "localhost";

  window.API_URL = isLocal
    ? "http://127.0.0.1:8000"
    : "https://api-equipamentos2.onrender.com";
})();