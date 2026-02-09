const filtroMunicipio = document.getElementById("filtroMunicipio");
const kpiConfirmados = document.getElementById("kpiConfirmados");
const kpiPendientes = document.getElementById("kpiPendientes");
const kpiForaneos = document.getElementById("kpiForaneos");

let chartDona = null;
let chartLineas = null;
let map = null;
let capaManzanas = null;

const MUNICIPIOS = {
  39: { nombre: "Monterrey", lat: 25.6866, lon: -100.3161 },
  6: { nombre: "Apodaca", lat: 25.7802719, lon: -100.1892492 },
  48: { nombre: "Santa Catarina", lat: 25.6773558, lon: -100.444601 },
  4: { nombre: "Allende", lat: 25.2848723, lon: -100.0261169 },
  5: { nombre: "Anáhuac", lat: 27.239697, lon: -100.1452978 },
  9: { nombre: "Cadereyta Jiménez", lat: 25.5906017, lon: -100.0049901 },
  10: { nombre: "Carmen", lat: 25.9378633, lon: -100.3676732 },
  14: { nombre: "Doctor Arroyo", lat: 23.6726593, lon: -100.1893129 },
  21: { nombre: "General Escobedo", lat: 25.8010441, lon: -100.3229392 },
  26: { nombre: "Guadalupe", lat: 25.6812276, lon: -100.2169174 },
  31: { nombre: "Juarez", lat: 24.7264103, lon: -99.9049771 },
  33: { nombre: "Linares", lat: 24.8599445, lon: -99.5736853 },
  38: { nombre: "Montemorelos", lat: 25.1879837, lon: -99.8407244 },
  44: { nombre: "Sabinas Hidalgo", lat: 26.5042093, lon: -100.1875132 },
  46: { nombre: "San Nicolás de los Garza", lat: 25.7364725, lon: -100.275581 },
  49: { nombre: "Santiago", lat: 25.4244554, lon: -100.1541117 },
  40: { nombre: "Paras", lat: 25.4244554, lon: -100.1541117 }
};

/* =========================
   MAPA
========================= */
map = L.map("map").setView([25.6866, -100.3161], 9);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap"
}).addTo(map);

/* =========================
   MUNICIPIOS
========================= */
function cargarFiltroMunicipios() {
  filtroMunicipio.innerHTML = "";
  const optEstado = document.createElement("option");
  optEstado.value = "";
  optEstado.textContent = "Estado (Nuevo León)";
  filtroMunicipio.appendChild(optEstado);
  Object.entries(MUNICIPIOS).forEach(([id, m]) => {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = m.nombre;
    filtroMunicipio.appendChild(opt);
  });
}

/* =========================
   EVENTOS
========================= */
filtroMunicipio.addEventListener("change", cargarTodo);

/* =========================
   CARGA GENERAL
========================= */
function cargarTodo() {
  const municipio = filtroMunicipio.value || "";
  cargarKPIs(municipio);
  cargarClasificacion(municipio);
  cargarTreemapCasos(municipio);
  cargarCasosVsPhmr(municipio);
  cargarMapa(municipio); // default "confirmados"
}

/* =========================
   KPIs
========================= */
async function cargarKPIs(municipio) {
  const token = sessionStorage.getItem("token_entomo");

  if (!token) {
    alert("Sesión inválida");
    cerrarSesion();
    return;
  }

  try {
    const res = await fetch(
      "https://dttmexasjpwdlnbikijx.supabase.co/functions/v1/kpis",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
      "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0dG1leGFzanB3ZGxuYmlraWp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczMDg5MjcsImV4cCI6MjA4Mjg4NDkyN30.BgGvGZvX5WeKOenqDEHwyAM7fP6LtpbYcPt0V064XLo",
      "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0dG1leGFzanB3ZGxuYmlraWp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczMDg5MjcsImV4cCI6MjA4Mjg4NDkyN30.BgGvGZvX5WeKOenqDEHwyAM7fP6LtpbYcPt0V064XLo"
        },
        body: JSON.stringify({
          token,               
          municipio: municipio || null
        })
      }
    );

    const json = await res.json();
    if (!res.ok || json.valida === false) {
      alert("Sesión inválida");
      cerrarSesion();
      return;
    }

    // =========================
    // Pintar KPIs
    // =========================
    kpiConfirmados.textContent = json.confirmados ?? 0;
    kpiForaneos.textContent    = json.foraneos ?? 0;
    kpiPendientes.textContent  = json.probables ?? 0;

  } catch (e) {
    console.error("Error KPIs:", e);
    kpiConfirmados.textContent =
    kpiForaneos.textContent =
    kpiPendientes.textContent = 0;
  }
}

/* =========================
   DONA CLASIFICACION
========================= */
async function cargarClasificacion(municipio) {
  const token = sessionStorage.getItem("token_entomo");
  try {
    const res = await fetch("https://dttmexasjpwdlnbikijx.supabase.co/functions/v1/smooth-responder", {
      method: "POST",
      headers: { "Content-Type": "application/json",
      "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0dG1leGFzanB3ZGxuYmlraWp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczMDg5MjcsImV4cCI6MjA4Mjg4NDkyN30.BgGvGZvX5WeKOenqDEHwyAM7fP6LtpbYcPt0V064XLo",
      "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0dG1leGFzanB3ZGxuYmlraWp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczMDg5MjcsImV4cCI6MjA4Mjg4NDkyN30.BgGvGZvX5WeKOenqDEHwyAM7fP6LtpbYcPt0V064XLo"},
      body: JSON.stringify({
        token: token,
        municipio
      })
    });

    const r = await res.json();
    if (!r.valida) throw r.error;

    if (chartDona) chartDona.destroy();

    chartDona = new Chart(
      document.getElementById("donaClasificacion"),
      {
        type: "doughnut",
        data: {
          labels: [
            "Dengue grave",
            "Dengue no grave",
            "Dengue con signos de alarma"
          ],
          datasets: [{
            data: [
              r.dengue_grave,
              r.dengue_no_grave,
              r.dengue_signos
            ],
            backgroundColor: ["#ef4444", "#facc15", "#3b82f6"]
          }]
        },
        options: {
          responsive: true,
          plugins: { legend: { position: "bottom" } }
        }
      }
    );

  } catch (e) {
    console.error("Error Dona:", e);
  }
}


/* =========================
   TREEMAP MUNICIPIOS
========================= */
async function cargarTreemapCasos() {
  const token = sessionStorage.getItem("token_entomo");
  try {
    const res = await fetch("https://dttmexasjpwdlnbikijx.supabase.co/functions/v1/treemap", {
      method: "POST",
      headers: { "Content-Type": "application/json",
      "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0dG1leGFzanB3ZGxuYmlraWp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczMDg5MjcsImV4cCI6MjA4Mjg4NDkyN30.BgGvGZvX5WeKOenqDEHwyAM7fP6LtpbYcPt0V064XLo",
      "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0dG1leGFzanB3ZGxuYmlraWp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczMDg5MjcsImV4cCI6MjA4Mjg4NDkyN30.BgGvGZvX5WeKOenqDEHwyAM7fP6LtpbYcPt0V064XLo"},
      body: JSON.stringify({
        token: token
      })
    });

    const r = await res.json();
    if (!r.valida) throw r.error;

    const container = document.getElementById("treemapMunicipios");
    container.innerHTML = "";

    const data = {
      name: "Nuevo León",
      children: r.municipios.map(d => ({
        name: MUNICIPIOS[d.cve_mpo_res]?.nombre || d.cve_mpo_res,
        value: Number(d.confirmados) || 0
      }))
    };

    const svg = d3.select(container)
      .append("svg")
      .attr("viewBox", `0 0 ${container.clientWidth} ${container.clientHeight}`)
      .style("font-family", "Inter, sans-serif");

    const maxValue = d3.max(data.children, d => d.value) || 1;
    const color = d3.scaleSequential()
      .domain([0, maxValue])
      .interpolator(d3.interpolateYlOrRd);

    const root = d3.hierarchy(data)
      .sum(d => d.value)
      .sort((a, b) => b.value - a.value);

    d3.treemap()
      .size([container.clientWidth, container.clientHeight])
      .padding(6)(root);

    const node = svg.selectAll("g")
      .data(root.leaves())
      .join("g")
      .attr("transform", d => `translate(${d.x0},${d.y0})`);

    // Rectángulos
    node.append("rect")
      .attr("width", d => d.x1 - d.x0)
      .attr("height", d => d.y1 - d.y0)
      .attr("rx", 10)
      .attr("ry", 10)
      .attr("fill", d => color(d.value));

    // Número de casos
    node.append("text")
      .attr("x", d => (d.x1 - d.x0) / 2)
      .attr("y", d => (d.y1 - d.y0) / 2)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .style("opacity", 0.15)
      .style("font-weight", "bold")
      .style("font-size", d =>
        Math.min((d.x1 - d.x0) / 1.5, (d.y1 - d.y0) / 1.5) + "px"
      )
      .text(d => d.value);

    // Nombre municipio
    node.append("text")
      .attr("x", d => (d.x1 - d.x0) / 2)
      .attr("y", d => (d.y1 - d.y0) / 2)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .style("font-weight", "bold")
      .text(d => d.data.name)
      .each(function (d) {
        const text = d3.select(this);
        let width = d.x1 - d.x0 - 6;
        let fontSize = 14;
        while (this.getComputedTextLength() > width && fontSize > 7) {
          fontSize--;
          text.style("font-size", fontSize + "px");
        }
      });

  } catch (e) {
    console.error("Error Treemap:", e);
  }
}




/* =========================
   CASOS VS PHMR
========================= */
async function cargarCasosVsPhmr(municipio) {
  const token = sessionStorage.getItem("token_entomo");
  try {
    const res = await fetch("https://dttmexasjpwdlnbikijx.supabase.co/functions/v1/cvsp", {
      method: "POST",
      headers: { "Content-Type": "application/json",
      "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0dG1leGFzanB3ZGxuYmlraWp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczMDg5MjcsImV4cCI6MjA4Mjg4NDkyN30.BgGvGZvX5WeKOenqDEHwyAM7fP6LtpbYcPt0V064XLo",
      "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0dG1leGFzanB3ZGxuYmlraWp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczMDg5MjcsImV4cCI6MjA4Mjg4NDkyN30.BgGvGZvX5WeKOenqDEHwyAM7fP6LtpbYcPt0V064XLo" },
      body: JSON.stringify({
        token: token,
        municipio
      })
    });

    const r = await res.json();
    if (!r.valida) throw r.error;

    const datos = r.series;

    if (chartLineas) chartLineas.destroy();

    chartLineas = new Chart(
      document.getElementById("graficaCasos"),
      {
        type: "line",
        data: {
          labels: datos.map(d => `Sem ${d.semana}`),
          datasets: [
            {
              label: "Casos confirmados",
              data: datos.map(d => d.casos_confirmados),
              borderColor: "#ef4444",
              fill: false
            },
            {
              label: "Casos probables",
              data: datos.map(d => d.casos_probables),
              borderColor: "#f59e0b",
              fill: false
            },
            {
              label: "PHMR",
              data: datos.map(d => d.phmr),
              borderColor: "#3b82f6",
              fill: false,
              yAxisID: "y1"
            }
          ]
        },
        options: {
          responsive: true,
          plugins: { legend: { position: "bottom" } },
          scales: {
            y1: {
              position: "right",
              grid: { drawOnChartArea: false }
            }
          }
        }
      }
    );

  } catch (e) {
    console.error("Error PHMR:", e);
  }
}


/* =========================
   HEATMAP
========================= */
async function cargarMapa(municipio, capa = "confirmados") {
  if (capaManzanas) map.removeLayer(capaManzanas);
  const token = sessionStorage.getItem("token_entomo");
  try {
    const res = await fetch("https://dttmexasjpwdlnbikijx.supabase.co/functions/v1/heatmapcasos", {
      method: "POST",
      headers: { "Content-Type": "application/json",
      "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0dG1leGFzanB3ZGxuYmlraWp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczMDg5MjcsImV4cCI6MjA4Mjg4NDkyN30.BgGvGZvX5WeKOenqDEHwyAM7fP6LtpbYcPt0V064XLo",
      "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0dG1leGFzanB3ZGxuYmlraWp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczMDg5MjcsImV4cCI6MjA4Mjg4NDkyN30.BgGvGZvX5WeKOenqDEHwyAM7fP6LtpbYcPt0V064XLo" },
      body: JSON.stringify({
        token: token,
        municipio,
        capa
      })
    });

    const r = await res.json();
    if (!r.valida) throw r.error;

    capaManzanas = L.geoJSON(r.geojson, {
      style: f => ({
        fillColor: getColor(f.properties.casos),
        weight: 0.5,
        fillOpacity: 0.6
      }),
      onEachFeature: (f, l) =>
        l.bindPopup(`Casos: ${f.properties.casos}`)
    }).addTo(map);

  } catch (e) {
    console.error("Error Heatmap:", e);
  }
}

function getColor(c){
  return c>10?"#800026":c>5?"#BD0026":c>2?"#E31A1C":c>0?"#FD8D3C":"#EEE";
}

/* =========================
   INIT
========================= */
cargarFiltroMunicipios();
cargarTodo();





