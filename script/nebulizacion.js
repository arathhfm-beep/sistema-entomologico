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
async function init() {

  map = L.map("map").setView(
    [25.7, -100.3],
    8
  );

  L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      attribution: "© OpenStreetMap"
    }
  ).addTo(map);

  initSlider();
  agregarLeyenda();

  // Primero configurar territorio según la sesión
  configurarJurisdiccionNebulizacion();

  // Después obtener municipios desde el servidor
  await cargarMunicipiosPermitidosNebulizacion();

  // Finalmente cargar información
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

  const t = String(tipo)
    .trim()
    .toLowerCase();

  // Alfacipermetrina + Imidacloprid
  if (
    t.includes("alfacipermetrina") &&
    t.includes("imidacloprid")
  ) {
    return "#33A02C";
  }

  // Bifentrina
  if (t.includes("bifentrina")) {
    return "#A6CEE3";
  }

  // Clorpirifós
  if (t.includes("clorpir")) {
    return "#1F78B4";
  }

  // Imidacloprid + Praletrina
  if (
    t.includes("imidacloprid") &&
    t.includes("praletrina")
  ) {
    return "#FDBF6F";
  }

  // Malatión
  if (t.includes("malat")) {
    return "#FF7F00";
  }

  // Pirimifos metil
  if (t.includes("pirim")) {
    return "#6A3D9A";
  }

  // Transflutrina
  if (t.includes("transflu")) {
    return "#E31A1C";
  }

  // Cualquier producto no catalogado
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
      "https://dttmexasjpwdlnbikijx.supabase.co/functions/v1/dashboard-nebulizacion",
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

  const div =
    L.DomUtil.create(
      "div",
      "legend"
    );

  div.innerHTML = `
    <b>Insecticida</b><br>

    <i style="background:#33A02C"></i>
    Alfacipermetrina + Imidacloprid<br>

    <i style="background:#A6CEE3"></i>
    Bifentrina<br>

    <i style="background:#1F78B4"></i>
    Clorpirifós-etil<br>

    <i style="background:#FDBF6F"></i>
    Imidacloprid + Praletrina<br>

    <i style="background:#FF7F00"></i>
    Malatión<br>

    <i style="background:#6A3D9A"></i>
    Pirimifos metil<br>

    <i style="background:#E31A1C"></i>
    Transflutrina<br>

    <i style="background:#BBBBBB"></i>
    Otros
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
 * CONFIGURAR JURISDICCIÓN SEGÚN SESIÓN
 *************************************************/
function configurarJurisdiccionNebulizacion() {

  const rol = (
    sessionStorage.getItem("rol_entomo") || ""
  )
    .trim()
    .toUpperCase();

  const jurisdiccionSesion =
    sessionStorage.getItem("jurisdiccion_entomo");

  const select =
    document.getElementById("jurisdiccionSelect");


  // =============================================
  // SUPERVISOR
  // =============================================

  if (rol === "SUPERVISOR") {

    // Conserva:
    // Todas
    // 1
    // 2
    // ...
    // 8

    select.disabled = false;

    return;
  }


  // =============================================
  // JURISDICCIONAL / ADMINISTRATIVO / OTRO ROL
  // TERRITORIAL
  // =============================================

  const jur =
    Number(jurisdiccionSesion);


  if (
    !Number.isInteger(jur) ||
    jur < 1 ||
    jur > 8
  ) {

    console.error(
      "Jurisdicción de sesión inválida:",
      jurisdiccionSesion
    );

    select.innerHTML = `
      <option value="">
        Jurisdicción no disponible
      </option>
    `;

    select.disabled = true;

    return;
  }


  // Dejar únicamente su jurisdicción

  select.innerHTML = "";

  const option =
    document.createElement("option");

  option.value = String(jur);

  option.textContent =
    `Jurisdicción ${jur}`;

  option.selected = true;

  select.appendChild(option);

  select.disabled = true;
}


/*************************************************
 * CARGAR MUNICIPIOS PERMITIDOS
 *************************************************/
async function cargarMunicipiosPermitidosNebulizacion() {

  const token =
    sessionStorage.getItem("token_entomo");

  const rol = (
    sessionStorage.getItem("rol_entomo") || ""
  )
    .trim()
    .toUpperCase();

  const jurisdiccionSelect =
    document.getElementById(
      "jurisdiccionSelect"
    );

  const municipioSelect =
    document.getElementById(
      "municipioSelect"
    );


  // =============================================
  // REINICIAR SELECTOR
  // =============================================

  municipioSelect.innerHTML = `
    <option value="">
      Todos
    </option>
  `;

  municipioSelect.disabled = true;


  // =============================================
  // PREPARAR PETICIÓN
  // =============================================

  const body = {
    token
  };


  /*
   * Únicamente SUPERVISOR manda la jurisdicción
   * seleccionada.
   *
   * JURISDICCIONAL / ADMINISTRATIVO:
   * municipios-permitidos obtiene la J directamente
   * desde la sesión.
   */

  if (
    rol === "SUPERVISOR" &&
    jurisdiccionSelect.value
  ) {

    body.jurisdiccion =
      Number(
        jurisdiccionSelect.value
      );
  }


  try {

    const response =
      await fetch(
        "https://dttmexasjpwdlnbikijx.supabase.co/functions/v1/municipios-permitidos",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify(body)
        }
      );


    const data =
      await response.json();


    if (
      !response.ok ||
      !data.ok
    ) {

      throw new Error(
        data.error ||
        "No fue posible cargar municipios"
      );
    }


    // =============================================
    // LLENAR SELECTOR
    // =============================================

    for (
      const municipio
      of data.municipios || []
    ) {

      const option =
        document.createElement(
          "option"
        );

      option.value =
        municipio.cve_municipio;

      option.textContent =
        municipio.nombre;

      municipioSelect.appendChild(
        option
      );
    }


    /*
     * Habilitamos municipio siempre que tengamos
     * territorio disponible.
     *
     * Incluso un municipio sin nebulización debe
     * aparecer aquí.
     */

    municipioSelect.disabled =
      (data.municipios || []).length === 0;


    console.log(
      "Municipios permitidos Nebulización:",
      data.municipios
    );


    return data;

  } catch (error) {

    console.error(
      "Error cargando municipios:",
      error
    );

    municipioSelect.innerHTML = `
      <option value="">
        Error al cargar municipios
      </option>
    `;

    municipioSelect.disabled = true;

    return null;
  }
}

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

// ================================================
// CAMBIO DE JURISDICCIÓN
// ================================================

document
  .getElementById("jurisdiccionSelect")
  .addEventListener(
    "change",
    async () => {

      // Primero actualizar municipios
      await cargarMunicipiosPermitidosNebulizacion();

      // Reiniciar centrado del mapa
      firstLoadCenter = false;

      // Después consultar información
      cargarFumigaciones();
      cargarTablaLotes();
    }
  );


// ================================================
// CAMBIO DE MUNICIPIO
// ================================================

document
  .getElementById("municipioSelect")
  .addEventListener(
    "change",
    () => {

      firstLoadCenter = false;

      cargarFumigaciones();

      /*
       * Actualmente lotes-resumen trabaja por
       * jurisdicción, no por municipio.
       *
       * La dejamos funcionando exactamente como
       * está actualmente.
       */
      cargarTablaLotes();
    }
  );

/*************************************************
 * START
 *************************************************/
init();

