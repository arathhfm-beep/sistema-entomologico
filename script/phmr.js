// =======================================
// 🔹 Variables globales
// =======================================
let map;
let capaHeat = null;
let semanaActual = 1;
let municipioActual = null;
let chartPHMR = null;

// =======================================
// 🔹 Centros y coords de municipios
// =======================================
const centrosMunicipio = {
  "48": [25.673, -100.456, 12],
  "39": [25.6866, -100.3161, 12],
  "4":  [25.2846, -100.0154, 12],
  "5":  [27.2416, -100.1228, 12],
  "6":  [25.7803, -100.1887, 12],
  "9":  [25.5857, -99.9961, 12],
  "10": [25.6691, -99.8116, 12],
  "14": [23.6717879, -100.2068573, 12],
  "21": [25.8231, -100.3228, 12],
  "26": [25.6753, -100.2590, 12],
  "31": [24.7440, -99.8426, 12],
  "33": [24.8573, -99.5660, 12],
  "38": [25.1987, -99.8282, 12],
  "44": [26.5030, -100.1826, 12],
  "46": [25.7514, -100.2890, 12],
  "49": [25.4338, -100.2146, 12]
};

// 👉 Coordenadas SOLO para clima
const municipiosCoords = {
  "39": { lat: 25.6866, lon: -100.3161 }, // Monterrey
  "6":  { lat: 25.7803, lon: -100.1887 },
  "48": { lat: 25.673, lon: -100.456 },
  "4":  { lat: 25.2846, lon: -100.0154 },
  "5":  { lat: 27.2416, lon: -100.1228 },
  "9":  { lat: 25.5857, lon: -99.9961 },
  "10": { lat: 25.6691, lon: -99.8116 },
  "14": { lat: 23.6717879, lon: -100.2068573 },
  "21": { lat: 25.8231, lon: -100.3228 },
  "26": { lat: 25.6753, lon: -100.259 },
  "31": { lat: 24.744, lon: -99.8426 },
  "33": { lat: 24.8573, lon: -99.566 },
  "38": { lat: 25.1987, lon: -99.8282 },
  "44": { lat: 26.503, lon: -100.1826 },
  "46": { lat: 25.7514, lon: -100.289 },
  "49": { lat: 25.4338, lon: -100.2146 }
};

// =======================================
// 🔹 Init
// =======================================
document.addEventListener("DOMContentLoaded", () => {
  initMapa();
  initSlider();
  initEventos();
  cargarHeatmap();
  cargarGraficaPHMR();
});

function colorPHMR(v) {
  if (v <= 20) return "#0000ff";
  if (v <= 40) return "#00ffff";
  if (v <= 60) return "#00ff00";
  if (v <= 80) return "#ffff00";
  return "#ff0000";
}

// =======================================
// 🔹 Mapa
// =======================================
function initMapa() {
  map = L.map("map").setView([25.7, -100.3], 8);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap"
  }).addTo(map);
  agregarLeyendaHeatmap();
}

function agregarLeyendaHeatmap() {
  const legend = L.control({ position: "bottomright" });

  legend.onAdd = function () {
    const div = L.DomUtil.create("div", "heat-legend");

    div.innerHTML = `
      <div style="
        background: white;
        padding: 10px;
        border-radius: 8px;
        box-shadow: 0 0 10px rgba(0,0,0,0.3);
        font-size: 12px;
        width: 160px;
      ">
        <strong>Intensidad PHMR</strong>
        <div style="
          height: 15px;
          margin-top: 8px;
          background: linear-gradient(
            to right,
            #0000ff 0%,
            #00ffff 20%,
            #00ff00 40%,
            #ffff00 60%,
            #ff8800 80%,
            #ff0000 100%
          );
          border-radius: 4px;
        "></div>
        <div style="
          display: flex;
          justify-content: space-between;
          font-size: 10px;
          margin-top: 4px;
        ">
          <span>Bajo</span>
          <span>Medio</span>
          <span>Alto</span>
        </div>
      </div>
    `;

    return div;
  };

  legend.addTo(map);
}

// =======================================
// 🔹 Slider semana
// =======================================
function initSlider() {
  const slider = document.getElementById("sliderSemana");

  noUiSlider.create(slider, {
    start: [1],
    step: 1,
    range: { min: 1, max: 52 },
    tooltips: true,
    format: {
      to: v => `Semana ${Math.round(v)}`,
      from: v => Number(v.replace(/\D/g, ""))
    }
  });

  slider.noUiSlider.on("update", values => {
    semanaActual = Number(values[0].replace(/\D/g, ""));
    document.getElementById("semanaLabel").textContent = semanaActual;
  });

  slider.noUiSlider.on("change", cargarHeatmap);
}

// =======================================
// 🔹 Eventos
// =======================================
function initEventos() {
  document.getElementById("municipioSelect").addEventListener("change", e => {
    municipioActual = e.target.value || null;

    if (municipioActual && centrosMunicipio[municipioActual]) {
      const [lat, lon, zoom] = centrosMunicipio[municipioActual];
      map.setView([lat, lon], zoom);
    } else {
      map.setView([25.7, -100.3], 8);
    }

    cargarHeatmap();
    cargarGraficaPHMR();
  });
}

// =======================================
// 🔹 Heatmap
// =======================================
async function cargarHeatmap() {
  const token = sessionStorage.getItem("token_entomo");
  if (!token) return alert("Sesión inválida");

  try {
    const res = await fetch(
      "https://dttmexasjpwdlnbikijx.supabase.co/functions/v1/phmr-heatmap",
      {
        method: "POST",
        headers: {  "Content-Type": "application/json",
      "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0dG1leGFzanB3ZGxuYmlraWp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczMDg5MjcsImV4cCI6MjA4Mjg4NDkyN30.BgGvGZvX5WeKOenqDEHwyAM7fP6LtpbYcPt0V064XLo",
      "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0dG1leGFzanB3ZGxuYmlraWp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczMDg5MjcsImV4cCI6MjA4Mjg4NDkyN30.BgGvGZvX5WeKOenqDEHwyAM7fP6LtpbYcPt0V064XLo" },
        body: JSON.stringify({
          token,
          semana: semanaActual,
          municipio: municipioActual
        })
      }
    );

    const json = await res.json();

    // 🔐 Validación de sesión
    if (!res.ok || json.valida === false || json.error) {
      alert("Sesión inválida o expirada");
      cerrarSesion(); // Limpia token y redirige al login
      return;
    }

    const data = json.data || [];

    // 🔹 Convertir geojson en puntos para heatmap
    const puntos = data
      .map(d => {
        if (!d.geojson) return null;
        const c = getCentroGeoJSON(d.geojson);
        if (!c) return null;
        return [c.lat, c.lon, d.phmr / 70];
      })
      .filter(Boolean);

    // 🔹 Remover capa anterior y agregar nueva
    if (capaHeat) map.removeLayer(capaHeat);

    capaHeat = L.heatLayer(puntos, {
      radius: 35,
      blur: 25,
      maxZoom: 17
    }).addTo(map);

  } catch (e) {
    console.error("Error cargando heatmap:", e);
    alert("Error cargando los datos. Intenta de nuevo.");
  }
}

function getCentroGeoJSON(g) {
  let coords = [];

  if (g.type === "Polygon") coords = g.coordinates[0];
  if (g.type === "MultiPolygon") coords = g.coordinates[0][0];
  if (!coords || !coords.length) return null;

  let lat = 0, lon = 0;
  coords.forEach(c => {
    lon += c[0];
    lat += c[1];
  });

  return { lat: lat / coords.length, lon: lon / coords.length };
}

function cerrarSesion() {
  sessionStorage.clear();
  window.location.href = "../index.html";
}


function getCentroGeoJSON(g) {
  let coords = [];

  if (g.type === "Polygon") coords = g.coordinates[0];
  if (g.type === "MultiPolygon") coords = g.coordinates[0][0];
  if (!coords || !coords.length) return null;

  let lat = 0, lon = 0;
  coords.forEach(c => {
    lon += c[0];
    lat += c[1];
  });

  return { lat: lat / coords.length, lon: lon / coords.length };
}

// =======================================
// 🔹 Clima
// =======================================
function rangoSemanaISO(anio, semana) {
  const simple = new Date(anio, 0, 1 + (semana - 1) * 7);
  const dow = simple.getDay() || 7;
  const lunes = new Date(simple);
  lunes.setDate(simple.getDate() - dow + 1);
  const domingo = new Date(lunes);
  domingo.setDate(lunes.getDate() + 6);
  return {
    inicio: lunes.toISOString().split("T")[0],
    fin: domingo.toISOString().split("T")[0]
  };
}
const ANIO_DATOS_PHMR = 2025;
async function obtenerClimaSemanal(municipio, semana) {
  const coords = municipiosCoords[municipio] || municipiosCoords["39"];
  const year = new Date().getFullYear();
  const { inicio, fin } = rangoSemanaISO(ANIO_DATOS_PHMR, semana);

  const url = `https://archive-api.open-meteo.com/v1/archive
    ?latitude=${coords.lat}
    &longitude=${coords.lon}
    &start_date=${inicio}
    &end_date=${fin}
    &daily=temperature_2m_mean
    &timezone=America/Mexico_City`.replace(/\s+/g, "");

  const r = await fetch(url);
  const j = await r.json();
  if (!j.daily?.temperature_2m_mean) return null;

  const t = j.daily.temperature_2m_mean;
  return t.reduce((a, b) => a + b, 0) / t.length;
}

// =======================================
// 🔹 Gráfica
// =======================================
async function cargarGraficaPHMR() {
  const token = sessionStorage.getItem("token_entomo");
  if (!token) return alert("Sesión inválida");

  try {
    const res = await fetch(
      "https://dttmexasjpwdlnbikijx.supabase.co/functions/v1/phmr-heatview",
      {
        method: "POST",
        headers: {"Content-Type": "application/json",
      "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0dG1leGFzanB3ZGxuYmlraWp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczMDg5MjcsImV4cCI6MjA4Mjg4NDkyN30.BgGvGZvX5WeKOenqDEHwyAM7fP6LtpbYcPt0V064XLo",
      "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0dG1leGFzanB3ZGxuYmlraWp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczMDg5MjcsImV4cCI6MjA4Mjg4NDkyN30.BgGvGZvX5WeKOenqDEHwyAM7fP6LtpbYcPt0V064XLo" },
        body: JSON.stringify({
          token,
          municipio: municipioActual
        })
      }
    );

    const json = await res.json();

    // 🔐 Validación de sesión
    if (!res.ok || json.valida === false || json.error) {
      alert("Sesión inválida o expirada");
      cerrarSesion(); // Limpia token y redirige al login
      return;
    }

    const data = json.data || [];

    // 🔹 Organizar PHMR por semana
    const semanas = {};
    data.forEach(r => {
      if (!semanas[r.semana]) semanas[r.semana] = [];
      semanas[r.semana].push(r.phmr);
    });

    const labels = [];
    const phmrVals = [];
    const tempVals = [];

    const munClima = municipioActual || "39";

    // 🔹 Promedios por semana + clima
    for (const s of Object.keys(semanas).sort((a,b)=>a-b)) {
      labels.push("Sem " + s);
      const avg = semanas[s].reduce((a,b)=>a+b,0) / semanas[s].length;
      phmrVals.push(avg.toFixed(2));
      const t = await obtenerClimaSemanal(munClima, Number(s));
      tempVals.push(t ? t.toFixed(1) : null);
    }

    dibujarGrafica(labels, phmrVals, tempVals);

  } catch (e) {
    console.error("Error cargando gráfica PHMR:", e);
    alert("Error cargando los datos de la gráfica. Intenta de nuevo.");
  }
}


function dibujarGrafica(labels, phmr, temp) {
  const ctx = document.getElementById("graficaPHMR").getContext("2d");
  if (chartPHMR) chartPHMR.destroy();

  chartPHMR = new Chart(ctx, {
    data: {
      labels,
      datasets: [
        {
          type: "bar",
          label: "PHMR",
          data: phmr,
          backgroundColor: phmr.map(v => colorPHMR(Number(v))),
          borderRadius: 8,
          borderSkipped: false,
          yAxisID: "y"
        },
        {
          type: "line",
          label: "Temperatura °C",
          data: temp,
          borderColor: "#457b9d",
          backgroundColor: "#457b9d",
          tension: 0.3,
          pointRadius: 4,
          pointHoverRadius: 6,
          yAxisID: "y1"
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "top"
        },
        tooltip: {
          callbacks: {
            label(ctx) {
              const val = ctx.raw;
              if (ctx.dataset.type === "bar") {
                return `PHMR: ${val}`;
              }
              return `Temp: ${val} °C`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: "PHMR"
          }
        },
        y1: {
          position: "right",
          beginAtZero: true,
          grid: { drawOnChartArea: false },
          title: {
            display: true,
            text: "Temperatura °C"
          }
        },
        x: {
          grid: { display: false }
        }
      }
    }
  });
}



