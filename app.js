const API_URL = "https://dttmexasjpwdlnbikijx.supabase.co/functions/v1";

/*************************************************
 * SESIÓN
 *************************************************/
function sesionActiva() {
  return !!sessionStorage.getItem("token_entomo");
}

function bloquearLinks() {
  document.querySelectorAll("a.btn-main").forEach(a => {
    a.addEventListener("click", e => {
      if (!sesionActiva()) {
        e.preventDefault();
        alert("Debes ingresar la clave para acceder");
      }
    });
  });
}

function actualizarUI() {
  if (sesionActiva()) {
    document.getElementById("loginBox").style.display = "none";
  }
}

bloquearLinks();
actualizarUI();

/*************************************************
 * ACTIVAR SESIÓN
 *************************************************/
async function activarSesion() {
  const clave = document.getElementById("claveInput").value.trim();
  if (!clave) return alert("Ingresa la clave");

  const res = await fetch(`${API_URL}/login-plataforma`, {
    method: "POST",
    headers: {  "Content-Type": "application/json",
      "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0dG1leGFzanB3ZGxuYmlraWp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczMDg5MjcsImV4cCI6MjA4Mjg4NDkyN30.BgGvGZvX5WeKOenqDEHwyAM7fP6LtpbYcPt0V064XLo",
      "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0dG1leGFzanB3ZGxuYmlraWp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczMDg5MjcsImV4cCI6MjA4Mjg4NDkyN30.BgGvGZvX5WeKOenqDEHwyAM7fP6LtpbYcPt0V064XLo"},
    body: JSON.stringify({ clave })
  });

  const data = await res.json();
  console.log(data);

  if (!res.ok || !data.token) {
    alert("Clave incorrecta");
    return;
  }

  sessionStorage.setItem("token_entomo", data.token);
  alert("Acceso habilitado");

  actualizarUI();
}


