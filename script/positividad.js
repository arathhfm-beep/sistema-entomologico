let map = L.map('map').setView([25.7, -100.3], 10);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png").addTo(map);

let capaPositividad = null;

async function cargarPositividad() {
  const jurisdiccion = document.getElementById("jurisdiccionSelect").value;
  const municipio   = document.getElementById("municipioSelect").value;
  const semana      = document.getElementById("semanaSelect").value;
  const token = sessionStorage.getItem("token_entomo");

  if (!jurisdiccion || !municipio || !semana) {
    mostrarAlerta("Debe seleccionar jurisdicción, municipio y semana.");
    return;
  }

  try {
    const res = await fetch(
      "https://dttmexasjpwdlnbikijx.supabase.co/functions/v1/positividad-geo",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
      "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0dG1leGFzanB3ZGxuYmlraWp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczMDg5MjcsImV4cCI6MjA4Mjg4NDkyN30.BgGvGZvX5WeKOenqDEHwyAM7fP6LtpbYcPt0V064XLo",
      "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0dG1leGFzanB3ZGxuYmlraWp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczMDg5MjcsImV4cCI6MjA4Mjg4NDkyN30.BgGvGZvX5WeKOenqDEHwyAM7fP6LtpbYcPt0V064XLo"
        },
        body: JSON.stringify({
          token,
          jurisdiccion,
          municipio,
          semana
        })
      }
    );

    const r = await res.json();

    if (!r.valida) throw r.error;

    if (capaPositividad) map.removeLayer(capaPositividad);

    capaPositividad = L.geoJSON(r.geojson, {
      style: f => {
        const v = Number(f.properties.positividad);
        return {
          color: "#333",
          weight: 1,
          fillOpacity: 0.7,
          fillColor:
            v < 1 ? "#2ECC71" :
            v < 3 ? "#F1C40F" :
            v < 5 ? "#E67E22" :
                    "#E74C3C"
        };
      },
      onEachFeature: (f, layer) => {
        const p = f.properties;
        layer.bindTooltip(`
          Juris: ${p.jurisdiccion}<br>
          Mpio: ${p.municipio}<br>
          Sec: ${p.seccion}<br>
          Mza: ${p.manzana}<br>
          Positividad: ${p.positividad}
        `);
      }
    }).addTo(map);

    if (r.geojson.features.length) {
      map.fitBounds(capaPositividad.getBounds());
    }

  } catch (e) {
    console.error("Error positividad:", e);
    mostrarAlerta("Error al cargar positividad");
  }
}

const leyendaPositividad = L.control({ position: "bottomright" });

function mostrarAlerta(msg){
  alert(msg);
}

leyendaPositividad.onAdd = function () {
  const div = L.DomUtil.create("div", "info legend");
  div.style.background = "white";
  div.style.padding = "10px";
  div.style.borderRadius = "8px";
  div.style.boxShadow = "0 0 8px rgba(0,0,0,0.3)";
  div.style.fontSize = "14px";
  div.style.lineHeight = "18px";

  const rangos = [
    { color: "#2ECC71", label: "Óptimo (< 1)" },
    { color: "#F1C40F", label: "Bueno (1 - 3)" },
    { color: "#E67E22", label: "Alarma (3 - 5)" },
    { color: "#E74C3C", label: "Emergencia (> 5)" }
  ];

  div.innerHTML += "<b>Positividad</b><br>";

  rangos.forEach(r => {
    div.innerHTML +=
      `<i style="background:${r.color}; width:18px; height:18px; float:left; margin-right:8px; opacity:0.8;"></i>${r.label}<br>`;
  });

  return div;
};

leyendaPositividad.addTo(map);

function obtenerNombreMunicipio(jurisdiccion, municipioId) {
    const lista = jurisdiccionMunicipios[jurisdiccion];
    if (!lista) return municipioId;  // si no existe la jurisdicción

    const encontrado = lista.find(m => Number(m.id) === Number(municipioId));

    return encontrado ? encontrado.nombre : municipioId;
}

async function cargarTablaActividades(jurisdiccion) {
  const tbody = document.getElementById("tablaActividadesBody");
  const token = sessionStorage.getItem("token_entomo");

  if (!jurisdiccion) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center;padding:12px;">
          Seleccione jurisdicción para ver actividades.
        </td>
      </tr>`;
    return;
  }

  try {
    const res = await fetch(
      "https://dttmexasjpwdlnbikijx.supabase.co/functions/v1/positividad-tabla",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0dG1leGFzanB3ZGxuYmlraWp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczMDg5MjcsImV4cCI6MjA4Mjg4NDkyN30.BgGvGZvX5WeKOenqDEHwyAM7fP6LtpbYcPt0V064XLo",
          "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR0dG1leGFzanB3ZGxuYmlraWp4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczMDg5MjcsImV4cCI6MjA4Mjg4NDkyN30.BgGvGZvX5WeKOenqDEHwyAM7fP6LtpbYcPt0V064XLo"
        },
        body: JSON.stringify({
          token,
          jurisdiccion
        })
      }
    );

    const r = await res.json();

    if (!r.valida) throw r.error;

    tbody.innerHTML = "";

    if (!r.data || r.data.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align:center;padding:12px;">
            No hay actividades registradas.
          </td>
        </tr>`;
      return;
    }

    r.data.forEach(reg => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${obtenerNombreMunicipio(jurisdiccion, reg.municipio)}</td>
        <td>${reg.seccion}</td>
        <td>${reg.positividad_encuesta ?? "N/A"}</td>
        <td>${reg.positividad_verificacion ?? "N/A"}</td>
        <td>${reg.semana_encuesta ?? "N/A"}</td>
        <td>${reg.semana_verificacion ?? "N/A"}</td>
      `;
      tbody.appendChild(tr);
    });

  } catch (e) {
    console.error("Error tabla positividad:", e);
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center;color:red;">
          Error al cargar actividades.
        </td>
      </tr>`;
  }
}


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
    { id: 31, nombre: "Juarez" },
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

// ======================================================
// EVENTO: CAMBIA LA JURISDICCIÓN
// ======================================================

document
  .getElementById(
    "jurisdiccionSelect"
  )
  .addEventListener(
    "change",
    async () => {

      await cargarMunicipiosPermitidosPositividad();

      const jurisdiccion =
        document
          .getElementById(
            "jurisdiccionSelect"
          )
          .value;


      cargarTablaActividades(
        jurisdiccion
      );
    }
  );

  // ======================================================
// CONFIGURAR SELECTOR DE JURISDICCIÓN SEGÚN SESIÓN
// ======================================================

function configurarJurisdiccionPositividad() {

  const rol =
    (
      sessionStorage.getItem("rol_entomo") || ""
    )
      .trim()
      .toUpperCase();

  const jurisdiccionSesion =
    sessionStorage.getItem(
      "jurisdiccion_entomo"
    );

  const jurisdiccionSelect =
    document.getElementById(
      "jurisdiccionSelect"
    );


  // ----------------------------------------------------
  // SUPERVISOR
  // ----------------------------------------------------

  if (rol === "SUPERVISOR") {

    /*
     * El supervisor conserva las 8 jurisdicciones
     * disponibles.
     */

    jurisdiccionSelect.disabled = false;

    return;
  }


  // ----------------------------------------------------
  // JURISDICCIONAL / ADMINISTRATIVO
  // ----------------------------------------------------

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

    jurisdiccionSelect.innerHTML = `
      <option value="">
        Jurisdicción no disponible
      </option>
    `;

    jurisdiccionSelect.disabled = true;

    return;
  }


  /*
   * Eliminamos las demás jurisdicciones del selector.
   *
   * No solamente lo bloqueamos:
   * dejamos físicamente únicamente la jurisdicción
   * correspondiente a la sesión.
   */

  jurisdiccionSelect.innerHTML = "";

  const option =
    document.createElement(
      "option"
    );

  option.value =
    String(jur);

  option.textContent =
    `Jurisdicción ${jur}`;

  option.selected = true;

  jurisdiccionSelect.appendChild(
    option
  );

  jurisdiccionSelect.disabled = true;
}
// ======================================================
// CARGAR MUNICIPIOS PERMITIDOS
// ======================================================

async function cargarMunicipiosPermitidosPositividad() {

  const token =
    sessionStorage.getItem("token_entomo");

  const rol =
    (
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


  // ------------------------------------------------------
  // LIMPIAR SELECTOR
  // ------------------------------------------------------

  municipioSelect.innerHTML = `
    <option value="">
      -- Todos --
    </option>
  `;


  // ------------------------------------------------------
  // BODY
  // ------------------------------------------------------

  const body = {
    token
  };


  /*
   * Solamente SUPERVISOR puede mandar
   * una jurisdicción como filtro.
   *
   * Para JURISDICCIONAL / ADMINISTRATIVO
   * la Edge Function obtiene la jurisdicción
   * directamente de la sesión.
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

    // ----------------------------------------------------
    // CONSULTAR TERRITORIO PERMITIDO
    // ----------------------------------------------------

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


    // ----------------------------------------------------
    // VALIDAR RESPUESTA
    // ----------------------------------------------------

    if (
      !response.ok ||
      !data.ok
    ) {

      throw new Error(
        data.error ||
        "No fue posible cargar los municipios"
      );
    }


    // ----------------------------------------------------
    // LLENAR SELECTOR
    // ----------------------------------------------------

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


    console.log(
      "Municipios permitidos:",
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

    return null;
  }
}
// ======================================================
// EVENTO: CAMBIA EL MUNICIPIO
// ======================================================
document.getElementById("municipioSelect").addEventListener("change", () => {
    const jurisdiccion = document.getElementById("jurisdiccionSelect").value;
    const municipio = document.getElementById("municipioSelect").value;

    cargarTablaActividades(jurisdiccion, municipio);
});

// ======================================================
// CARGA INICIAL
// ======================================================

document.addEventListener(
  "DOMContentLoaded",
  async () => {

    // 1. Primero fijar jurisdicción según la sesión
    configurarJurisdiccionPositividad();

    // 2. Después cargar municipios permitidos
    await cargarMunicipiosPermitidosPositividad();

    // 3. Cargar tabla de la jurisdicción correspondiente
    const jurisdiccion =
      document
        .getElementById(
          "jurisdiccionSelect"
        )
        .value;

    if (jurisdiccion) {

      await cargarTablaActividades(
        jurisdiccion
      );
    }

  }
);