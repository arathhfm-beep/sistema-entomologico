/*************************************************
 * VARIABLES GLOBALES
 *************************************************/
let map, capaFumigaciones, capaLeyenda;
let semanaActual = 1;
let firstLoadCenter = false;
let requestFumigacionesId = 0;


/*************************************************
 * INIT
 *************************************************/
function init() {
  map = L.map("map").setView([25.7, -100.3], 8);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap"
  }).addTo(map);

  initSlider();
  agregarLeyenda();

  actualizarMunicipiosPorJurisdiccion(); // 👈 AQUI
  cargarFumigaciones();
  cargarTablaLotes();
}
/*************************************************
 * SLIDER
 *************************************************/
function initSlider() {
  const slider = document.getElementById("sliderSemana");

  noUiSlider.create(slider, {
    start: [1],
    step: 1,
    range: { min: 1, max: 52 },
    connect: [true, false],
    tooltips: true,
    format: {
      to: v => `Semana ${Math.round(v)}`,
      from: v => parseInt(v.replace(/\D/g, ""), 10)
    }
  });

  slider.noUiSlider.on("update", values => {
    semanaActual = parseInt(values[0].replace(/\D/g, ""), 10);
    document.getElementById("semanaLabel").textContent = semanaActual;
  });

  slider.noUiSlider.on("change", () => {
    firstLoadCenter = false;
    cargarFumigaciones();
  });
}

/*************************************************
 * COLORES
 *************************************************/
function colorPorInsecticida(tipo = "") {
  const t = tipo.toLowerCase();
  if (t.includes("clorpir")) return "#1F78B4";
  if (t.includes("imid") || t.includes("pralet")) return "#33A02C";
  if (t.includes("malat")) return "#FF7F00";
  if (t.includes("pirim")) return "#6A3D9A";
  if (t.includes("transflu")) return "#E31A1C";
  return "#BBBBBB";
}

/*************************************************
 * ALERTA
 *************************************************/
function mostrarAlerta(msg) {
  const box = document.getElementById("alertaDatos");
  box.textContent = msg;
  box.style.display = "block";
  box.style.opacity = "1";

  setTimeout(() => {
    box.style.opacity = "0";
    setTimeout(() => box.style.display = "none", 300);
  }, 3000);
}

/*************************************************
 * CARGAR FUMIGACIONES (SUPABASE)
 *************************************************/
async function cargarFumigaciones() {
  const municipio = document.getElementById("municipioSelect").value || null;
  const jurisdiccion = document.getElementById("jurisdiccionSelect").value || null;
  const token = sessionStorage.getItem("token_entomo");

  // 🔐 Generar ID único de esta llamada
  const myRequestId = ++requestFumigacionesId;

  // 🧹 Limpiar capa anterior
  if (capaFumigaciones) {
    map.removeLayer(capaFumigaciones);
    capaFumigaciones = null;
  }

  try {
    const res = await fetch(
      "https://dttmexasjpwdlnbikijx.supabase.co/functions/v1/smart-service",
      {
        method: "POST",
        headers: {
         "Content-Type": "application/json",
      "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0dG1leGFzanB3ZGxuYmlraWp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczMDg5MjcsImV4cCI6MjA4Mjg4NDkyN30.BgGvGZvX5WeKOenqDEHwyAM7fP6LtpbYcPt0V064XLo",
      "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0dG1leGFzanB3ZGxuYmlraWp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczMDg5MjcsImV4cCI6MjA4Mjg4NDkyN30.BgGvGZvX5WeKOenqDEHwyAM7fP6LtpbYcPt0V064XLo"
        },
        body: JSON.stringify({
          token,
          semana: semanaActual,
          municipio,
          jurisdiccion
        })
      }
    );
    const r = await res.json();

    // ❌ Si ya hubo otra llamada después, ignorar esta
    if (myRequestId !== requestFumigacionesId) return;

    if (!r.valida) throw r.error;

    if (!r.geojson || !r.geojson.features?.length) {
      mostrarAlerta("No hay datos para la semana seleccionada");
      return;
    }

    capaFumigaciones = L.geoJSON(r.geojson, {
      renderer: L.canvas(),
      style: f => ({
        color: "#222",
        weight: 0.4,
        fillOpacity: 0.6,
        fillColor: colorPorInsecticida(f.properties.insecticida)
      }),
      onEachFeature: (f, layer) => {
        layer.bindTooltip(
          `Sección: ${f.properties.seccion}<br>${f.properties.insecticida}`
        );
      }
    }).addTo(map);

    if (!firstLoadCenter && capaFumigaciones.getBounds().isValid()) {
      map.fitBounds(capaFumigaciones.getBounds(), { padding: [20, 20] });
      firstLoadCenter = true;
    }

  } catch (e) {
    console.error("Error fumigaciones:", e);
    mostrarAlerta("Error al cargar fumigaciones");
  }
}


/*************************************************
 * LEYENDA
 *************************************************/
function agregarLeyenda() {
  if (capaLeyenda) map.removeControl(capaLeyenda);

  capaLeyenda = L.control({ position: "bottomright" });

 capaLeyenda.onAdd = () => {
  const div = L.DomUtil.create("div", "legend");
  div.innerHTML = `
    <b>Insecticida</b><br>
    <i style="background:#1F78B4"></i> Clorpirifós<br>
    <i style="background:#33A02C"></i> Alfacipermetrina <br>
    <i style="background:#FF7F00"></i> Malatión<br>
    <i style="background:#6A3D9A"></i> Pirimifos<br>
    <i style="background:#E31A1C"></i> Transflutrina<br>
    <i style="background:#BBBBBB"></i> Otros
  `;
  return div;
};

  capaLeyenda.addTo(map);
}

/*************************************************
 * TABLA LOTES
 *************************************************/
async function cargarTablaLotes() {
  const token = sessionStorage.getItem("token_entomo");
  const jurisdiccion =
    document.getElementById("jurisdiccionSelect").value || null;

  try {
    const res = await fetch(
      "https://dttmexasjpwdlnbikijx.supabase.co/functions/v1/lotes-resumen",
      {
        method: "POST",
        headers: { "Content-Type": "application/json",
      "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0dG1leGFzanB3ZGxuYmlraWp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczMDg5MjcsImV4cCI6MjA4Mjg4NDkyN30.BgGvGZvX5WeKOenqDEHwyAM7fP6LtpbYcPt0V064XLo",
      "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0dG1leGFzanB3ZGxuYmlraWp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczMDg5MjcsImV4cCI6MjA4Mjg4NDkyN30.BgGvGZvX5WeKOenqDEHwyAM7fP6LtpbYcPt0V064XLo"},
        body: JSON.stringify({
          token: token,
          jurisdiccion
        })
      }
    );

    const r = await res.json();
    
    if (!r.valida) throw r.error;

    const tbody = document.querySelector("#tablaLotes tbody");
    tbody.innerHTML = "";

    if (!r.data || r.data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6">Sin datos</td></tr>`;
      return;
    }

    r.data.forEach(r => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${r.lote}</td>
        <td>${r.insecticida}</td>
        <td>${r.total_consumo}</td>
        <td>${r.aplicaciones}</td>
        <td>${r.secciones_cubiertas}</td>
        <td>${(r.semanas_usadas || []).join(", ")}</td>
      `;
      tbody.appendChild(tr);
    });

  } catch (e) {
    console.error("Error tabla lotes:", e);
    mostrarAlerta("Error al cargar resumen de lotes");
  }
}


/*************************************************
 * JURISDICCIÓN → MUNICIPIOS (TU MAPEO ORIGINAL)
 *************************************************/
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
  const j = document.getElementById("jurisdiccionSelect").value;
  const select = document.getElementById("municipioSelect");

  select.innerHTML = `<option value="">Todos</option>`;

  if (!j) {
    // 🚫 sin jurisdicción → municipio bloqueado
    select.disabled = true;
    return;
  }

  select.disabled = false;

  jurisdiccionMunicipios[j]?.forEach(m => {
    const opt = document.createElement("option");
    opt.value = m.id;
    opt.textContent = m.nombre;
    select.appendChild(opt);
  });
}

/*************************************************
 * EVENTOS
 *************************************************/
document.getElementById("jurisdiccionSelect").addEventListener("change", () => {
  actualizarMunicipiosPorJurisdiccion();
  firstLoadCenter = false;
  cargarFumigaciones();
  cargarTablaLotes();
});

document.getElementById("municipioSelect").addEventListener("change", () => {
  firstLoadCenter = false;
  cargarFumigaciones();
  cargarTablaLotes();
});

/*************************************************
 * START
 *************************************************/
init();

