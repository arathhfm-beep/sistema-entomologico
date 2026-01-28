/* =========================
   CLIENTE SUPABASE
========================= */
const supa = window.supabase.createClient(
  "https://dttmexasjpwdlnbikijx.supabase.co",
  "sb_publishable_gcn8tzJGN19kzpc8x38LSQ_ENAFFMEZ"
);

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
  try {
    const hoy = new Date();
    const ayer = new Date();
    ayer.setDate(hoy.getDate() - 1);

    // ===========================
    // 1️⃣ Confirmados (todos)
    // ===========================
    let queryConfirmados = supa
      .from("v_public_casos_jurisdiccion")
      .select("*", { count: "exact", head: true })
      .eq("estatus_caso", "CONFIRMADO");

    if (municipio) queryConfirmados = queryConfirmados.eq("cve_mpo_res", municipio);

    const { count: confirmados, error: errConfirm } = await queryConfirmados;
    if (errConfirm) throw errConfirm;
    kpiConfirmados.textContent = confirmados || 0;

    // ===========================
    // 2️⃣ Foráneos (todos, cve_estado_res != "19")
    // ===========================
    let queryForaneos = supa
      .from("v_public_casos_jurisdiccion")
      .select("*", { count: "exact", head: true })
      .neq("cve_estado_res", "19");

    if (municipio) queryForaneos = queryForaneos.eq("cve_mpo_res", municipio);

    const { count: foraneos, error: errForaneos } = await queryForaneos;
    if (errForaneos) throw errForaneos;
    kpiForaneos.textContent = foraneos || 0;

    // ===========================
    // 3️⃣ Probables (solo ayer y hoy)
    // ===========================
    const hoyISO = new Date().toISOString().split("T")[0];
const ayerISO = new Date(Date.now() - 86400000).toISOString().split("T")[0];

let queryProbables = supa
  .from("v_public_casos_jurisdiccion")
  .select("*", { count: "exact", head: true })
  .eq("estatus_caso", "PROBABLE")
  .gte("fec_captura", ayerISO)
  .lte("fec_captura", hoyISO);

if (municipio) queryProbables = queryProbables.eq("cve_mpo_res", municipio);

const { count: probables, error: errProb } = await queryProbables;
if (errProb) throw errProb;

kpiPendientes.textContent = probables || 0;

  } catch (e) {
    console.error("Error KPIs:", e);
    kpiConfirmados.textContent = kpiPendientes.textContent = kpiForaneos.textContent = kpiDefunciones.textContent = 0;
  }
}



/* =========================
   DONA CLASIFICACION
========================= */
async function cargarClasificacion(municipio) {
  try {
    const { data, error } = await supa
      .from("v_casos_clasificacion")
      .select("*"); // traemos todo

    if (error) throw error;
    if (!data) return;

    // Filtrar por municipio si se pasa
    let filtrados = municipio 
      ? data.filter(d => d.cve_mpo_res == municipio) 
      : data;

    // Si no hay municipio, sumamos por tipo para todo el estado
    const totals = {
      "DENGUE GRAVE": 0,
      "DENGUE NO GRAVE": 0,
      "DENGUE CON SIGNOS DE ALARMA": 0
    };

    filtrados.forEach(d => {
      if (totals.hasOwnProperty(d.diagnostico_final)) {
        totals[d.diagnostico_final] += Number(d.total);
      }
    });

    if (chartDona) chartDona.destroy();

    chartDona = new Chart(document.getElementById("donaClasificacion"), {
      type: "doughnut",
      data: {
        labels: ["Dengue grave","Dengue no grave","Dengue con signos de alarma"],
        datasets: [{
          data: [
            totals["DENGUE GRAVE"],
            totals["DENGUE NO GRAVE"],
            totals["DENGUE CON SIGNOS DE ALARMA"]
          ],
          backgroundColor: ["#ef4444","#facc15","#3b82f6"]
        }]
      },
      options: { responsive:true, plugins:{legend:{position:"bottom"}} }
    });

  } catch(e) {
    console.error("Error Dona:", e);
  }
}

/* =========================
   TREEMAP MUNICIPIOS
========================= */
async function cargarTreemapCasos() {
  try {
    const { data: rows, error } = await supa
      .from("v_casos_por_municipio")
      .select("*");
    if (error) throw error;
    if (!rows) return;

    const container = document.getElementById("treemapMunicipios");
    container.innerHTML = "";

    const filteredData = rows.filter(d => (d.confirmados ?? 0) >= 1);
    
    const data = {
      name: "Nuevo León",
      children: filteredData.map(d => ({
        name: MUNICIPIOS[d.cve_mpo_res]?.nombre || `${d.cve_mpo_res}`,
        value: Number(d.confirmados) || 0
      }))
    };

    const svg = d3.select(container)
      .append("svg")
      .attr("viewBox", `0 0 ${container.clientWidth} ${container.clientHeight}`)
      .style("font-family", "Inter, sans-serif");

    const maxValue = d3.max(data.children, d => d.value) || 1;
    const color = d3.scaleSequential().domain([0, maxValue]).interpolator(d3.interpolateYlOrRd);

    const root = d3.hierarchy(data).sum(d => d.value).sort((a,b)=>b.value-a.value);
    d3.treemap().size([container.clientWidth, container.clientHeight]).padding(6)(root);

    const node = svg.selectAll("g").data(root.leaves()).join("g")
      .attr("transform", d => `translate(${d.x0},${d.y0})`);

    // Rectángulos
    node.append("rect")
      .attr("width", d => d.x1 - d.x0)
      .attr("height", d => d.y1 - d.y0)
      .attr("rx", 10).attr("ry", 10)
      .attr("fill", d => color(d.value));

    // Número de casos detrás
    node.append("text")
      .attr("class", "cases-bg")
      .attr("x", d => (d.x1 - d.x0)/2)
      .attr("y", d => (d.y1 - d.y0)/2)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .style("fill", "#000")
      .style("opacity", 0.15)
      .style("font-weight", "bold")
      .style("font-size", d => Math.min((d.x1 - d.x0)/1.5, (d.y1 - d.y0)/1.5) + "px")
      .text(d => d.value);

    // Nombre del municipio con ajuste de tamaño y truncamiento
    node.append("text")
      .attr("class", "label")
      .attr("x", d => (d.x1 - d.x0)/2)
      .attr("y", d => (d.y1 - d.y0)/2)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .style("fill", "#000")
      .style("font-weight", "bold")
      .text(d => d.data.name)
      .each(function(d) {
        const text = d3.select(this);
        let width = d.x1 - d.x0 - 4; // margen pequeño
        let fontSize = parseInt(text.style("font-size"));
        while (text.node().getComputedTextLength() > width && fontSize > 6) {
          fontSize -= 1;
          text.style("font-size", fontSize + "px");
        }
      });

  } catch(e){ 
    console.error("Error Treemap:", e); 
  }
}



/* =========================
   CASOS VS PHMR
========================= */
async function cargarCasosVsPhmr(municipio) {
  try {
    // Traemos todos los datos de la vista semanal
    const { data, error } = await supa
      .from("v_casos_vs_phmr_semanal")
      .select("*")
      .order("semana");
    if (error) throw error;
    if (!data) return;

    let filtrados;

    if (municipio) {
      // Filtramos por municipio si se selecciona
      filtrados = data.filter(r => r.cve_mpo_res == municipio);
    } else {
      // Si no hay municipio, agregamos por semana los promedios del estado
      const semanas = [...new Set(data.map(d => d.semana))]; // todas las semanas
      filtrados = semanas.map(s => {
        const porSemana = data.filter(d => d.semana === s);
        const casos_confirmados = porSemana.reduce((sum, d) => sum + Number(d.casos_confirmados), 0);
        const casos_probables  = porSemana.reduce((sum, d) => sum + Number(d.casos_probables), 0);
        const phmr = porSemana.length
          ? porSemana.reduce((sum, d) => sum + Number(d.phmr), 0) / porSemana.length
          : 0;
        return {
          semana: s,
          casos_confirmados,
          casos_probables,
          phmr: Number(phmr.toFixed(2))
        };
      });
    }

    // Destruimos la gráfica anterior si existe
    if (chartLineas) chartLineas.destroy();

    // Creamos la gráfica
    chartLineas = new Chart(document.getElementById("graficaCasos"), {
      type: "line",
      data: {
        labels: filtrados.map(d => `Sem ${d.semana}`),
        datasets: [
          { label: "Casos confirmados", data: filtrados.map(d => d.casos_confirmados), borderColor:"#ef4444", fill:false },
          { label: "Casos probables",   data: filtrados.map(d => d.casos_probables),  borderColor:"#f59e0b", fill:false },
          { label: "PHMR",              data: filtrados.map(d => d.phmr),             borderColor:"#3b82f6", fill:false }
        ]
      },
      options:{responsive:true, plugins:{legend:{position:"bottom"}}}
    });

  } catch(e){ 
    console.error("Error PHMR:", e); 
  }
}

/* =========================
   HEATMAP
========================= */
async function cargarMapa(municipio, capa="confirmados") {
  if (capaManzanas) map.removeLayer(capaManzanas);

  const viewName = capa === "probables" ? "v_heat_probable" : "v_heat_confirmados";

  try {
    const { data, error } = await supa.from(viewName).select("*");
    if (error) throw error;
    if (!data) return;

    const filtrados = municipio ? data.filter(r => r.municipio == municipio) : data;

    const geojson = {
      type: "FeatureCollection",
      features: filtrados.map(r => ({
        type: "Feature",
        geometry: r.geojson,
        properties: { casos: r.casos }
      }))
    };

    capaManzanas = L.geoJSON(geojson, {
      style: f => ({ fillColor: getColor(f.properties.casos), weight:0.5, fillOpacity:0.6 }),
      onEachFeature: (f,l)=>l.bindPopup(`Casos: ${f.properties.casos}`)
    }).addTo(map);

  } catch(e){ console.error("Error Heatmap:", e); }
}

function getColor(c){
  return c>10?"#800026":c>5?"#BD0026":c>2?"#E31A1C":c>0?"#FD8D3C":"#EEE";
}

/* =========================
   INIT
========================= */
cargarFiltroMunicipios();
cargarTodo();





