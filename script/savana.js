const filtroMunicipio = document.getElementById("filtroMunicipio");
const tituloMunicipio = document.getElementById("tituloMunicipio");
const filtroJurisdiccion =
  document.getElementById("filtroJurisdiccion");

/* =========================================================
   JURISDICCIÓN ACTIVA DE SÁBANA
   ========================================================= */
function obtenerJurisdiccionSavana() {
  const rol = (
    sessionStorage.getItem("rol_entomo") || ""
  ).toUpperCase();

  // Supervisor: usa el filtro visible de la pantalla.
  if (rol === "SUPERVISOR") {
    const valor = filtroJurisdiccion?.value;
    if (!valor) return null;

    const jur = Number(valor);
    return Number.isInteger(jur) && jur >= 1 && jur <= 8
      ? jur
      : null;
  }

  // Otros roles: usa la jurisdicción guardada en sesión.
  // El backend vuelve a validar el alcance real.
  const valor = sessionStorage.getItem("jurisdiccion_entomo");
  if (!valor) return null;

  const jur = Number(valor);
  return Number.isInteger(jur) && jur >= 1 && jur <= 8
    ? jur
    : null;
}
const kpiConfirmados = document.getElementById("kpiConfirmados");
const kpiProbables = document.getElementById("kpiProbables");
const kpiForaneos = document.getElementById("kpiForaneos");

let chartLineas = null;

let mapCasos = L.map("mapCasos").setView([25.6866, -100.3161], 9);
let mapPHMR = L.map("mapPHMR").setView([25.6866, -100.3161], 9);
let capaCasosConfirmados = null;
let capaCasosProbables = null;
let chartDona = null;

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(mapCasos);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(mapPHMR);

let capaCasos = null;
let capaPHMR = null;

// Evita que respuestas viejas de consultas asíncronas vuelvan a pintar el mapa.
let consultaMapaCasosId = 0;
let consultaMapaPHMRId = 0;

function obtenerSemanaActual() {

  const fecha = new Date();

  const inicioAño = new Date(fecha.getFullYear(), 0, 1);

  const dias = Math.floor((fecha - inicioAño) / 86400000);

  const semana = Math.ceil((dias + inicioAño.getDay() + 1) / 7);

  return semana;
}

function getCentroGeoJSON(g){

  if(g.type === "Feature") g = g.geometry;

  if(!g) return null;

  let coords = [];

  if(g.type === "Polygon") coords = g.coordinates[0];
  if(g.type === "MultiPolygon") coords = g.coordinates[0][0];

  if(!coords.length) return null;

  let lat = 0, lon = 0;

  coords.forEach(c=>{
    lon += c[0];
    lat += c[1];
  });

  return {
    lat: lat / coords.length,
    lon: lon / coords.length
  };
}

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
   FILTRO
========================= */
filtroMunicipio.addEventListener("change", cargarTodo);

/* =========================
   GENERAL
========================= */
function cargarTodo() {

  console.log("=== CARGAR TODO ===", {
    rol: sessionStorage.getItem("rol_entomo"),
    jurSesion: sessionStorage.getItem("jurisdiccion_entomo"),
    jurSelector: filtroJurisdiccion?.value || "",
    jurisdiccion: obtenerJurisdiccionSavana(),
    municipio: filtroMunicipio?.value || null
  });

  const municipio = filtroMunicipio.value;

  if (municipio) {

    const option =
      filtroMunicipio.options[
        filtroMunicipio.selectedIndex
      ];

    const nombre =
      option?.textContent || `Municipio ${municipio}`;

    tituloMunicipio.textContent =
      nombre.toUpperCase();

    /*
     * Si tenemos coordenadas conocidas,
     * centramos los mapas.
     */
    if (MUNICIPIOS[municipio]) {

      const m = MUNICIPIOS[municipio];

      mapCasos.setView(
        [m.lat, m.lon],
        12
      );

      mapPHMR.setView(
        [m.lat, m.lon],
        12
      );
    }

  } else {

    /*
     * Sin municipio seleccionado.
     */

    const rol =
      sessionStorage.getItem("rol_entomo");

    const jurisdiccion =
      sessionStorage.getItem(
        "jurisdiccion_entomo"
      );

    if (
      rol &&
      rol.toUpperCase() !== "SUPERVISOR" &&
      jurisdiccion
    ) {

      tituloMunicipio.textContent =
        `JURISDICCIÓN ${jurisdiccion}`;

    } else if (filtroJurisdiccion.value) {

      tituloMunicipio.textContent =
        `JURISDICCIÓN ${filtroJurisdiccion.value}`;

    } else {

      tituloMunicipio.textContent =
        "NUEVO LEÓN";
    }

    mapCasos.setView(
      [25.6866, -100.3161],
      9
    );

    mapPHMR.setView(
      [25.6866, -100.3161],
      9
    );
  }


  cargarKPIs(municipio);

  cargarGrafica(municipio);

  cargarMapaCasos(municipio);

  cargarMapaPHMR(municipio);

  cargarClasificacion(municipio);

  cargarTreemapCasos(municipio);
}
/* =========================
   KPIs
========================= */
async function cargarKPIs(municipio){
     const token = sessionStorage.getItem("token_entomo");

  if (!token) {
    alert("Sesión inválida");
    cerrarSesion();
    return;
  }
  console.log("SÁBANA KPI →", {
  token,
  municipio: municipio || null,
  jurisdiccion: obtenerJurisdiccionSavana()
});
  try{
    const res = await fetch("https://dttmexasjpwdlnbikijx.supabase.co/functions/v1/kpis",{
      method: "POST",
        headers: {
          "Content-Type": "application/json",
      "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0dG1leGFzanB3ZGxuYmlraWp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczMDg5MjcsImV4cCI6MjA4Mjg4NDkyN30.BgGvGZvX5WeKOenqDEHwyAM7fP6LtpbYcPt0V064XLo",
      "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0dG1leGFzanB3ZGxuYmlraWp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczMDg5MjcsImV4cCI6MjA4Mjg4NDkyN30.BgGvGZvX5WeKOenqDEHwyAM7fP6LtpbYcPt0V064XLo"
        },
        body: JSON.stringify({
  token,
  municipio: municipio || null,

  jurisdiccion: obtenerJurisdiccionSavana()
})
    });

    const r = await res.json();

    kpiConfirmados.textContent = r.confirmados || 0;
    kpiProbables.textContent = r.probables || 0;
    kpiForaneos.textContent = r.foraneos || 0;

  }catch(e){
    console.error(e);
  }
}

/* =========================
   GRAFICA
========================= */

const pluginNebulizacion = {
  id: 'pluginNebulizacion',
  beforeDraw: (chart) => {

    const {ctx, chartArea, scales} = chart;
    if(!chartArea) return;

    const {top, bottom} = chartArea;
    const xScale = scales.x;

    const nebulizacion = chart.config.data.nebulizacion;

    nebulizacion.forEach((tiene, i) => {

      if(!tiene) return;

      const x = xScale.getPixelForValue(i);

      const next = xScale.getPixelForValue(i + 1) || x;
      const width = next - x;

      ctx.save();
      ctx.fillStyle = "rgba(59,130,246,0.15)";
      ctx.fillRect(x - width/2, top, width, bottom - top);
      ctx.restore();

    });
  }
};

async function hayNebulizacion(semana, municipio){

  const token = sessionStorage.getItem("token_entomo");

  try{
    const res = await fetch("https://dttmexasjpwdlnbikijx.supabase.co/functions/v1/smart-service",{
      method:"POST",
       headers: {
         "Content-Type": "application/json",
      "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0dG1leGFzanB3ZGxuYmlraWp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczMDg5MjcsImV4cCI6MjA4Mjg4NDkyN30.BgGvGZvX5WeKOenqDEHwyAM7fP6LtpbYcPt0V064XLo",
      "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0dG1leGFzanB3ZGxuYmlraWp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczMDg5MjcsImV4cCI6MjA4Mjg4NDkyN30.BgGvGZvX5WeKOenqDEHwyAM7fP6LtpbYcPt0V064XLo"
        },
      body: JSON.stringify({
        token,
        semana,
        municipio: municipio || null,
        jurisdiccion: obtenerJurisdiccionSavana()
      })
    });

    const r = await res.json();

    // 👉 SI HAY GEOJSON = HUBO NEBULIZACIÓN
    return r.geojson && r.geojson.features?.length > 0;

  }catch(e){
    console.error("Error nebulización:", e);
    return false;
  }
}

async function cargarGrafica(municipio){

  const token = sessionStorage.getItem("token_entomo");

  if (!token) {
    alert("Sesión inválida");
    cerrarSesion();
    return;
  }

  try{

    // =========================
    // DATA PRINCIPAL
    // =========================
    const res = await fetch("https://dttmexasjpwdlnbikijx.supabase.co/functions/v1/cvsp",{
      method: "POST",
      headers: {
         "Content-Type": "application/json",
      "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0dG1leGFzanB3ZGxuYmlraWp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczMDg5MjcsImV4cCI6MjA4Mjg4NDkyN30.BgGvGZvX5WeKOenqDEHwyAM7fP6LtpbYcPt0V064XLo",
      "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0dG1leGFzanB3ZGxuYmlraWp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczMDg5MjcsImV4cCI6MjA4Mjg4NDkyN30.BgGvGZvX5WeKOenqDEHwyAM7fP6LtpbYcPt0V064XLo"
        },
      body: JSON.stringify({
  token,
  municipio: municipio || null,

  jurisdiccion: obtenerJurisdiccionSavana()
})
    });

    const r = await res.json();

    const semanas = r.series.map(d => d.semana);

    // =========================
    // 🔥 NEBULIZACIÓN
    // =========================
    const nebulizaciones = await Promise.all(
      semanas.map(s => hayNebulizacion(s, municipio))
    );

    // =========================
    // DESTRUIR GRÁFICA ANTERIOR
    // =========================
    if(chartLineas) chartLineas.destroy();

    // =========================
    // PLUGIN FONDO
    // =========================
    const pluginNebulizacion = {
      id: 'pluginNebulizacion',
      beforeDraw: (chart) => {

        const {ctx, chartArea, scales} = chart;
        if(!chartArea) return;

        const {top, bottom} = chartArea;
        const xScale = scales.x;

        const dataNeb = chart.config.data.nebulizacion;

        dataNeb.forEach((tiene, i) => {

          if(!tiene) return;

          const x = xScale.getPixelForValue(i);
          const next = xScale.getPixelForValue(i + 1) ?? x + 20;
          const width = next - x;

          ctx.save();
          ctx.fillStyle = "rgba(59,130,246,0.15)";
          ctx.fillRect(x - width/2, top, width, bottom - top);
          ctx.restore();

        });
      }
    };

    // =========================
    // CREAR GRÁFICA
    // =========================
    chartLineas = new Chart(
      document.getElementById("graficaCasos"),
      {
        type:"line",
        data:{
          labels: semanas.map(s=>"Sem "+s),

          // 🔥 DATA EXTRA
          nebulizacion: nebulizaciones,

          datasets:[
            {
              label:"Confirmados",
              data:r.series.map(d=>d.casos_confirmados),
              borderColor:"#ef4444",
              tension:0.4,
              pointRadius:3,
              pointHoverRadius:7
            },
            {
              label:"Probables",
              data:r.series.map(d=>d.casos_probables),
              borderColor:"#f59e0b",
              tension:0.4,
              pointRadius:3,
              pointHoverRadius:7
            },
            {
              label:"PHMR",
              data:r.series.map(d=>d.phmr),
              borderColor:"#3b82f6",
              yAxisID:"y1",
              tension:0.4,
              pointRadius:3,
              pointHoverRadius:7
            }
          ]
        },

        options:{
          responsive:true,
          maintainAspectRatio:false,

          interaction:{
            mode:'index',
            intersect:false
          },

          plugins:{
            legend:{
              position:"top",
              labels:{
                usePointStyle: true,
                pointStyle: 'line',
                boxWidth: 40,

                // 🔥 AQUÍ SE AGREGA LA LEYENDA DEL FONDO
                generateLabels: (chart) => {

                  const defaultLabels = Chart.defaults.plugins.legend.labels.generateLabels(chart);

                  defaultLabels.push({
                    text: "Nebulización",
                    fillStyle: "rgba(59,130,246,0.25)",
                    strokeStyle: "rgba(59,130,246,0.8)",
                    lineWidth: 2,
                    hidden: false,
                    datasetIndex: null
                  });

                  return defaultLabels;
                }
              }
            },
            tooltip:{
              mode:'index',
              intersect:false
            }
          },

          scales:{
            y:{
              beginAtZero:true
            },
            y1:{
              position:"right",
              grid:{
                drawOnChartArea:false
              }
            }
          }
        },

        plugins:[pluginNebulizacion]
      }
    );

  }catch(e){
    console.error(e);
  }
}



/* =========================
   MAPA CASOS
========================= */
async function cargarMapaCasos(municipio){

  const token = sessionStorage.getItem("token_entomo");
  const consultaId = ++consultaMapaCasosId;
  const semanaMapa = Math.max(1, obtenerSemanaActual() - 3);

  console.log("HEATMAP →", {
    municipio: municipio || null,
    valorSelector: filtroJurisdiccion?.value || "",
    jurisdiccion: obtenerJurisdiccionSavana()
  });

  // Limpiar inmediatamente las capas de la consulta anterior.
  if (capaCasosConfirmados) {
    mapCasos.removeLayer(capaCasosConfirmados);
    capaCasosConfirmados = null;
  }
  if (capaCasosProbables) {
    mapCasos.removeLayer(capaCasosProbables);
    capaCasosProbables = null;
  }

  try {
    const peticion = (capa) => fetch(
      "https://dttmexasjpwdlnbikijx.supabase.co/functions/v1/heatmapcasos",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0dG1leGFzanB3ZGxuYmlraWp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczMDg5MjcsImV4cCI6MjA4Mjg4NDkyN30.BgGvGZvX5WeKOenqDEHwyAM7fP6LtpbYcPt0V064XLo",
          "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0dG1leGFzanB3ZGxuYmlraWp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczMDg5MjcsImV4cCI6MjA4Mjg4NDkyN30.BgGvGZvX5WeKOenqDEHwyAM7fP6LtpbYcPt0V064XLo"
        },
        body: JSON.stringify({
        token,
        capa,
        semana: semanaMapa,
        municipio: municipio || null,
        jurisdiccion: obtenerJurisdiccionSavana()
      })
      }
    );

    const [resC, resP] = await Promise.all([
      peticion("confirmados"),
      peticion("probables")
    ]);

    const [rC, rP] = await Promise.all([resC.json(), resP.json()]);

    // Si ya hubo otro cambio de filtro, ignorar por completo esta respuesta vieja.
    if (consultaId !== consultaMapaCasosId) return;

    if (!rC.valida) {
      console.error("Error confirmados:", rC);
      return;
    }
    if (!rP.valida) {
      console.error("Error probables:", rP);
      return;
    }

    const confirmados = (rC.geojson?.features || []).map(f => {
      const c = getCentroGeoJSON(f.geometry);
      return c ? [c.lat, c.lon, f.properties?.casos || 1] : null;
    }).filter(Boolean);

    const probables = (rP.geojson?.features || []).map(f => {
      const c = getCentroGeoJSON(f.geometry);
      return c ? [c.lat, c.lon, f.properties?.casos || 1] : null;
    }).filter(Boolean);

    if (confirmados.length) {
      capaCasosConfirmados = L.heatLayer(confirmados,{
    radius: 25,
    blur: 14,
    maxZoom: 17,
    minOpacity: 0.35,
    gradient: {
      0.25: "yellow",
      0.55: "orange",
      0.80: "red",
      1.00: "darkred"
    }
      }).addTo(mapCasos);
    }

    if (probables.length) {
      capaCasosProbables = L.heatLayer(probables,{
    radius: 25,
    blur: 14,
    maxZoom: 17,
    minOpacity: 0.30,
    gradient: {
      0.25: "yellow",
      0.55: "orange",
      0.80: "red",
      1.00: "darkred"
    }
      }).addTo(mapCasos);
    }

  } catch(e) {
    if (consultaId === consultaMapaCasosId) {
      console.error("Error mapa casos:", e);
    }
  }
}


/* =========================
   MAPA PHMR
========================= */
async function cargarMapaPHMR(municipio){
  const consultaId = ++consultaMapaPHMRId;

  if (capaPHMR) {
    mapPHMR.removeLayer(capaPHMR);
    capaPHMR = null;
  }

  const token = sessionStorage.getItem("token_entomo");
  if (!token) {
    alert("Sesión inválida");
    cerrarSesion();
    return;
  }

  try {
    const semanaActual = Math.max(1, obtenerSemanaActual() - 3);
    const res = await fetch("https://dttmexasjpwdlnbikijx.supabase.co/functions/v1/dashboard-phmr",{
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0dG1leGFzanB3ZGxuYmlraWp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczMDg5MjcsImV4cCI6MjA4Mjg4NDkyN30.BgGvGZvX5WeKOenqDEHwyAM7fP6LtpbYcPt0V064XLo",
        "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0dG1leGFzanB3ZGxuYmlraWp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczMDg5MjcsImV4cCI6MjA4Mjg4NDkyN30.BgGvGZvX5WeKOenqDEHwyAM7fP6LtpbYcPt0V064XLo"
      },
      body: JSON.stringify({
        token,
        semana: semanaActual,
        municipio: municipio || null,
        jurisdiccion: obtenerJurisdiccionSavana()
      })
    });

    const r = await res.json();
    if (consultaId !== consultaMapaPHMRId) return;

    if (!r.valida) {
      console.error("Error PHMR:", r);
      return;
    }

    const puntos = (r.data || []).map(d => {
      let geo = d.geojson;
      if (typeof geo === "string") {
        try { geo = JSON.parse(geo); } catch { return null; }
      }
      const c = getCentroGeoJSON(geo);
      if (!c) return null;
      return [c.lat, c.lon, Number(d.phmr) || 0];
    }).filter(Boolean);

    if (puntos.length) {
      capaPHMR = L.heatLayer(puntos,{radius:10}).addTo(mapPHMR);
    }
  } catch(e) {
    if (consultaId === consultaMapaPHMRId) {
      console.error("Error mapa PHMR:", e);
    }
  }
}

async function cargarTreemapCasos(municipio) {
  const token = sessionStorage.getItem("token_entomo");
  try {
    const res = await fetch("https://dttmexasjpwdlnbikijx.supabase.co/functions/v1/treemap", {
      method: "POST",
      headers: { "Content-Type": "application/json",
      "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0dG1leGFzanB3ZGxuYmlraWp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczMDg5MjcsImV4cCI6MjA4Mjg4NDkyN30.BgGvGZvX5WeKOenqDEHwyAM7fP6LtpbYcPt0V064XLo",
      "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0dG1leGFzanB3ZGxuYmlraWp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczMDg5MjcsImV4cCI6MjA4Mjg4NDkyN30.BgGvGZvX5WeKOenqDEHwyAM7fP6LtpbYcPt0V064XLo"},
      body: JSON.stringify({
        token,
        municipio: municipio || null,
        jurisdiccion: obtenerJurisdiccionSavana()
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

async function cargarClasificacion(municipio) {
  const token = sessionStorage.getItem("token_entomo");
  try {
    const res = await fetch("https://dttmexasjpwdlnbikijx.supabase.co/functions/v1/smooth-responder", {
      method: "POST",
      headers: { "Content-Type": "application/json",
      "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0dG1leGFzanB3ZGxuYmlraWp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczMDg5MjcsImV4cCI6MjA4Mjg4NDkyN30.BgGvGZvX5WeKOenqDEHwyAM7fP6LtpbYcPt0V064XLo",
      "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0dG1leGFzanB3ZGxuYmlraWp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczMDg5MjcsImV4cCI6MjA4Mjg4NDkyN30.BgGvGZvX5WeKOenqDEHwyAM7fP6LtpbYcPt0V064XLo"},
      body: JSON.stringify({
        token,
        municipio: municipio || null,
        jurisdiccion: obtenerJurisdiccionSavana()
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

/* =========================================================
   INIT
   ========================================================= */

async function iniciarDashboard() {

  const token =
    sessionStorage.getItem("token_entomo");

  if (!token) {
    alert("Sesión inválida");
    return;
  }

  const rol = (
    sessionStorage.getItem("rol_entomo") || ""
  ).toUpperCase();


  /*
   * Configura automáticamente:
   *
   * SUPERVISOR:
   *   puede seleccionar jurisdicción.
   *
   * OTROS:
   *   jurisdicción fija según sesión.
   *
   * Municipios:
   *   siempre vienen del backend.
   */
  const territorio =
    await configurarFiltrosTerritoriales({
      selectJurisdiccion:
        filtroJurisdiccion,

      selectMunicipio:
        filtroMunicipio,

      onCambioJurisdiccion:
        async () => {

          /*
           * Supervisor cambió de jurisdicción.
           * Municipios ya fueron recargados
           * por permisos.js.
           */

          await cargarTodo();
        }
    });


  if (!territorio) {
    console.error(
      "No fue posible cargar el territorio"
    );

    return;
  }


  /*
   * Para usuarios no supervisores no tiene
   * sentido mostrar un selector bloqueado.
   *
   * La jurisdicción ya está determinada
   * por su sesión.
   */
  if (rol !== "SUPERVISOR") {

    filtroJurisdiccion.style.display =
      "none";
  }


  /*
   * Carga inicial del dashboard.
   */
  cargarTodo();
}


iniciarDashboard();