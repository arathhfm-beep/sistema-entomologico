const API_URL = "http://localhost:3000";
let map, capaFumigaciones, capaLeyenda;
let semanaActual = 1;
let ultimaSemanaCargada = null;
let capaImagen = null;
let windowLayers = [];

const cacheFumigaciones = new Map();
let cargandoMapa = false;

function init() {
  // Inicializar mapa
  map = L.map("map").setView([25.7, -100.3], 10);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap"
  }).addTo(map);

  initSlider();
  agregarLeyenda();

  // cargar inicial
  cargarFumigaciones();
  cargarTablaLotes();
}


function initSlider() {
  const slider = document.getElementById("sliderSemana");

  noUiSlider.create(slider, {
    start: [1],
    step: 1,
    range: { min: 1, max: 52 },
    tooltips: true,
    connect: [true, false],
    format: {
      to: v => `Semana ${Math.round(v)}`,
      from: v => parseInt(v.replace(/\D/g, ""), 10)
    }
  });

  slider.noUiSlider.on("update", values => {
    semanaActual = parseInt(values[0].replace(/\D/g, ""), 10);
    document.getElementById("semanaLabel").textContent = `${semanaActual}`;
  });

  slider.noUiSlider.on("change", () => {
    cargarFumigaciones();
  });
}

function colorPorInsecticida(tipo) {
  if (!tipo) return "#BBBBBB";

  tipo = tipo.toString().trim().toLowerCase()
    .replace(/á/g,"a").replace(/é/g,"e").replace(/í/g,"i")
    .replace(/ó/g,"o").replace(/ú/g,"u");

  if (tipo.includes("clorpirifos")) return "#1F78B4";
  if (tipo.includes("imidacloprid") || tipo.includes("praletrina")) return "#33A02C";
  if (tipo.includes("malation") || tipo.includes("malati") || tipo.includes("malation")) return "#FF7F00";
  if (tipo.includes("pirimifos")) return "#6A3D9A";
  if (tipo.includes("transflutrina")) return "#E31A1C";

  return "#BBBBBB";
}

/* Toast de alerta */
function mostrarAlerta(texto, tipo = "error") {
  const box = document.getElementById("alertaDatos");
  if (!box) return;
  box.textContent = texto;

  // Estilos según tipo (puedes extender)
  if (tipo === "error") {
    box.style.background = "#ff4d4d";
  } else if (tipo === "info") {
    box.style.background = "#2b7cff";
  } else {
    box.style.background = "#333";
  }

  box.style.display = "block";
  box.style.opacity = "1";
  box.style.transition = "opacity 300ms ease";

  // Ocultar después de 3.2 s
  clearTimeout(box._hideTimeout);
  box._hideTimeout = setTimeout(() => {
    box.style.opacity = "0";
    setTimeout(() => box.style.display = "none", 300);
  }, 3200);
}

/* Cargar y pintar fumigaciones */

async function cargarFumigaciones() {
  const municipio = document.getElementById("municipioSelect").value || null;
  const jurisdiccion = document.getElementById("jurisdiccionSelect").value || null;
  const semana = semanaActual;

  // limpiar capas anteriores
  windowLayers.forEach(l => map.removeLayer(l));
  windowLayers = [];

  // llamada al backend
  const resp = await fetch(`${API_URL}/tiles/generar/${semana}?municipio=${municipio || ""}&jurisdiccion=${jurisdiccion || ""}`);
  const json = await resp.json();

  if (!json.ok) return;

  for (const r of json.results) {
    if (!r.ok || !r.bounds) continue;

    const imgUrl = `${API_URL}${r.archivo}?t=${Date.now()}`;

    const capa = L.imageOverlay(imgUrl, r.bounds, { opacity: 0.85 }).addTo(map);
    windowLayers.push(capa);
  }

  // centrar si solo hay 1 imagen
  if (json.results.length === 1 && json.results[0].bounds) {
    map.fitBounds(json.results[0].bounds, { padding: [20, 20] });
  }
}




function pintarFumigaciones(geojson, municipio) {

  if (capaFumigaciones) {
    try { map.removeLayer(capaFumigaciones); } catch (e) {}
    capaFumigaciones = null;
  }

  if (!geojson || !geojson.features || geojson.features.length === 0) {
    mostrarAlerta("No hay datos para la semana seleccionada", "info");
    return;
  }

  const renderer = L.canvas({ padding: 0.5 });

  capaFumigaciones = L.geoJSON(geojson, {
    renderer,
    style: f => ({
      color: "#222",
      weight: 0.5,
      fillOpacity: 0.55,
      fillColor: colorPorInsecticida(f.properties.insecticida)
    }),
    onEachFeature: (f, layer) => {
      const p = f.properties || {};
      layer.options.title = `Mza ${p.manzana || "-"}\n${p.insecticida || "-"}`;
    }
  }).addTo(map);

  // ✅ SOLO CENTRAR UNA VEZ CUANDO HAY MUNICIPIO
  if (municipio && !window._fumigacionesFirstLoad) {
    try {
      const bounds = capaFumigaciones.getBounds();
      if (bounds && bounds.isValid && bounds.isValid()) {
        map.fitBounds(bounds, { padding: [20, 20], animate: false });
        window._fumigacionesFirstLoad = true;
      }
    } catch (e) {
      console.warn("No se pudo centrar el mapa:", e);
    }
  }
}


/* Leyenda (se mantiene en el mapa) */
function agregarLeyenda() {
  // Si ya existe, eliminar y recrear para evitar duplicados
  if (capaLeyenda) {
    try { capaLeyenda.remove(); } catch (e) {}
    capaLeyenda = null;
  }

  const leyenda = L.control({ position: "bottomright" });

  leyenda.onAdd = function() {
    const div = L.DomUtil.create("div", "legend");
    div.innerHTML = `
      <div style="
        background:white;
        padding:10px;
        border-radius:8px;
        box-shadow:0 3px 10px rgba(0,0,0,0.25);
        width:220px;
        font-size:13px;
        line-height:1.35;
      ">
        <b style="display:block;margin-bottom:6px">Insecticida</b>
        <div style="display:flex;align-items:center;"><i style="background:#1F78B4;width:14px;height:14px;display:inline-block;margin-right:8px;border-radius:2px"></i> Clorpirifós-etil 13.624%</div>
        <div style="display:flex;align-items:center;"><i style="background:#33A02C;width:14px;height:14px;display:inline-block;margin-right:8px;border-radius:2px"></i> Imidacloprid / Praletrina</div>
        <div style="display:flex;align-items:center;"><i style="background:#FF7F00;width:14px;height:14px;display:inline-block;margin-right:8px;border-radius:2px"></i> Malatión</div>
        <div style="display:flex;align-items:center;"><i style="background:#6A3D9A;width:14px;height:14px;display:inline-block;margin-right:8px;border-radius:2px"></i> Pirimifos</div>
        <div style="display:flex;align-items:center;"><i style="background:#E31A1C;width:14px;height:14px;display:inline-block;margin-right:8px;border-radius:2px"></i> Transflutrina</div>
        <div style="display:flex;align-items:center;margin-top:6px;"><i style="background:#BBBBBB;width:14px;height:14px;display:inline-block;margin-right:8px;border-radius:2px"></i> Otros</div>
      </div>
    `;
    return div;
  };

  leyenda.addTo(map);
  // guardamos referencia para poder remover en reinicios si hace falta
  capaLeyenda = leyenda;
}

// =======================================================
// 📦 TABLA DE LOTES — SIN FILTRAR POR SEMANA
// =======================================================
async function cargarTablaLotes() {
  const jurisdiccion = document.getElementById("jurisdiccionSelect").value;

  let url = `${API_URL}/models/nebulizacion/lotes?`;
  if (jurisdiccion) url += `jurisdiccion=${jurisdiccion}`;

  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error("Error al solicitar lotes");
    const data = await resp.json();

    const tbody = document.querySelector("#tablaLotes tbody");
    if (!tbody) return;
    tbody.innerHTML = "";

    data.forEach(r => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${r.lote}</td>
        <td>${r.insecticida}</td>
        <td>${r.total_usado}</td>
        <td>${r.usos}</td>
        <td>${r.semanas_usadas}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    console.error("Error cargando tabla lotes:", err);
  }
}

// =======================================================
// 🔄 ACTUALIZAR AUTOMÁTICO AL CAMBIAR SELECTS
// =======================================================
document.getElementById("municipioSelect").addEventListener("change", () => {
  window._fumigacionesFirstLoad = false; // 🔁 permitir nuevo centrado
  cargarFumigaciones();
  cargarTablaLotes();
});

document.getElementById("jurisdiccionSelect").addEventListener("change", () => {
  actualizarMunicipiosPorJurisdiccion(); // sincronizamos municipios
  cargarFumigaciones();
  cargarTablaLotes();
});

// ===============================
// MAPEO MANUAL: Jurisdicción → Municipios
// ===============================
const jurisdiccionMunicipios = {
  1: [
    { id: 39, nombre: "Monterrey" }
  ],
  2: [
    { id: 1, nombre: "Abasolo" },
    { id: 10, nombre: "Carmen" },
    { id: 12, nombre: "Cienega de Flores" },
    { id: 21, nombre: "General Escobedo" },
    { id: 25, nombre: "General Zuazua" },
    { id: 37, nombre: "Mina" },
    { id: 39, nombre: "Monterrey" },
    { id: 47, nombre: "Hidalgo" },
    { id: 45, nombre: "Salinas Victoria" },
    { id: 46, nombre: "San Nicolás de los Garza" }
  ],
  3: [
    { id: 18, nombre: "García" },
    { id: 19, nombre: "San Pedro Garza García" },
    { id: 39, nombre: "Monterrey" },
    { id: 48, nombre: "Santa Catarina" }
  ],
  4: [
    { id: 6, nombre: "Apodaca" },
    { id: 26, nombre: "Guadalupe" },
    { id: 31, nombre: "Iturbide" },
  ],
  5: [
    { id: 2, nombre: "Agualeguas" },
    { id: 5, nombre: "Anáhuac" },
    { id: 8, nombre: "Bustamante" },
    { id: 23, nombre: "General Treviño" },
    { id: 32, nombre: "Lampazos" },
    { id: 40, nombre: "Paras" },
    { id: 44, nombre: "Sabinas Hidalgo" },
    { id: 50, nombre: "Vallecillo" },
    { id: 51, nombre: "Villaldama" }
  ],
   6: [
    { id: 3, nombre: "Los Aldamas" },
    { id: 9, nombre: "Cadereyta Jiménez" },
    { id: 11, nombre: "Cerralvo" },
    { id: 13, nombre: "China" },
    { id: 15, nombre: "Doctor Coss" },
    { id: 16, nombre: "Doctor Gonzáles" },
    { id: 20, nombre: "General Bravo" },
    { id: 27, nombre: "Los Herrera" },
    { id: 28, nombre: "Higueras" },
    { id: 34, nombre: "Marin" },
    { id: 35, nombre: "Melchor Ocampo" },
    { id: 41, nombre: "Pesqueria" },
    { id: 42, nombre: "Ramones" }
  ],
  7: [
    { id: 4, nombre: "Allende" },
    { id: 22, nombre: "General Terán" },
    { id: 29, nombre: "Hualahuises" },
    { id: 33, nombre: "Linares" },
    { id: 38, nombre: "Montemorelos" },
    { id: 43, nombre: "Rayones" },
    { id: 49, nombre: "Santiago" }
  ],
  8: [
    { id: 7, nombre: "Aramberri" },
    { id: 14, nombre: "Doctor Arroyo" },
    { id: 17, nombre: "Galeana" },
    { id: 24, nombre: "General Zaragoza" },
    { id: 30, nombre: "Iturbide" },
    { id: 36, nombre: "Mier y Noriega" },
  ]
};

function actualizarMunicipiosPorJurisdiccion() {
  const jurisdiccion = document.getElementById("jurisdiccionSelect").value;
  const municipioSelect = document.getElementById("municipioSelect");

  // limpiar opciones actuales
  municipioSelect.innerHTML = "";

  if (!jurisdiccionMunicipios[jurisdiccion]) {
    municipioSelect.innerHTML = `<option value="">-- Sin municipios --</option>`;
    return;
  }

  // agregar municipios correspondientes
  jurisdiccionMunicipios[jurisdiccion].forEach(m => {
    const opt = document.createElement("option");
    opt.value = m.id;
    opt.textContent = m.nombre;
    municipioSelect.appendChild(opt);
  });
}

// Inicializar
init();

