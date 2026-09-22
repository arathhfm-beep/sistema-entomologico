const API_PERMISOS =
  "https://dttmexasjpwdlnbikijx.supabase.co/functions/v1/municipios-permitidos";

/* =========================================================
   DATOS DE SESIÓN
   ========================================================= */

function obtenerTokenEntomo() {
  return sessionStorage.getItem("token_entomo");
}

function obtenerRolEntomo() {
  return (
    sessionStorage.getItem("rol_entomo") || ""
  ).toUpperCase();
}

function obtenerJurisdiccionEntomo() {
  const valor =
    sessionStorage.getItem("jurisdiccion_entomo");

  if (!valor) return null;

  const numero = Number(valor);

  return Number.isInteger(numero)
    ? numero
    : null;
}


/* =========================================================
   CONSULTAR TERRITORIO PERMITIDO
   ========================================================= */

async function obtenerTerritorioPermitido(
  jurisdiccionSupervisor = null
) {

  const token = obtenerTokenEntomo();

  if (!token) {
    throw new Error("No existe una sesión activa");
  }

  const body = { token };

  /*
   * Solo el supervisor puede solicitar una jurisdicción.
   * El backend vuelve a validar esto.
   */
  if (
    obtenerRolEntomo() === "SUPERVISOR" &&
    jurisdiccionSupervisor !== null &&
    jurisdiccionSupervisor !== "" &&
    jurisdiccionSupervisor !== undefined
  ) {
    body.jurisdiccion =
      Number(jurisdiccionSupervisor);
  }

  const response = await fetch(
    `${API_PERMISOS}/municipios-permitidos`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    }
  );

  const data = await response.json();

  if (!response.ok || !data.ok) {
    throw new Error(
      data.error ||
      "No fue posible obtener el territorio permitido"
    );
  }

  return data;
}


/* =========================================================
   SELECTOR DE JURISDICCIÓN
   ========================================================= */

function configurarSelectorJurisdiccion(
  selectJurisdiccion
) {

  if (!selectJurisdiccion) return;

  const rol = obtenerRolEntomo();
  const jurisdiccion =
    obtenerJurisdiccionEntomo();

  /*
   * SUPERVISOR
   * Conserva todas las opciones existentes.
   */
  if (rol === "SUPERVISOR") {
    selectJurisdiccion.disabled = false;
    return;
  }

  /*
   * RESTO DE USUARIOS
   * La jurisdicción queda automática.
   */
  selectJurisdiccion.innerHTML = "";

  if (jurisdiccion !== null) {
    const option =
      document.createElement("option");

    option.value = String(jurisdiccion);
    option.textContent =
      `Jurisdicción ${jurisdiccion}`;
    option.selected = true;

    selectJurisdiccion.appendChild(option);
  }

  selectJurisdiccion.disabled = true;
}


/* =========================================================
   LLENAR SELECTOR DE MUNICIPIOS
   ========================================================= */

async function cargarMunicipiosPermitidos(
  selectMunicipio,
  jurisdiccionSupervisor = null
) {

  if (!selectMunicipio) return null;

  selectMunicipio.disabled = true;

  selectMunicipio.innerHTML =
    `<option value="">Cargando municipios...</option>`;

  try {

    const data =
      await obtenerTerritorioPermitido(
        jurisdiccionSupervisor
      );

    selectMunicipio.innerHTML = "";

    /*
     * OPCIÓN GENERAL
     */
    const todos =
      document.createElement("option");

    todos.value = "";
    todos.textContent = "Todos los municipios";

    selectMunicipio.appendChild(todos);


    /*
     * MUNICIPIOS AUTORIZADOS
     */
    for (const municipio of data.municipios) {

      const option =
        document.createElement("option");

      option.value =
        String(municipio.cve_municipio);

      option.textContent =
        municipio.nombre;

      selectMunicipio.appendChild(option);
    }

    selectMunicipio.disabled = false;

    return data;

  } catch (error) {

    console.error(
      "Error cargando municipios:",
      error
    );

    selectMunicipio.innerHTML =
      `<option value="">Error al cargar municipios</option>`;

    selectMunicipio.disabled = true;

    return null;
  }
}


/* =========================================================
   CONFIGURACIÓN COMPLETA
   ========================================================= */

async function configurarFiltrosTerritoriales({
  selectJurisdiccion,
  selectMunicipio,
  onCambioJurisdiccion = null
}) {

  const rol = obtenerRolEntomo();

  configurarSelectorJurisdiccion(
    selectJurisdiccion
  );


  /* =======================================================
     JURISDICCIONAL / ADMINISTRATIVO / EPIDEMIOLOGO
     ======================================================= */

  if (rol !== "SUPERVISOR") {

    const data =
      await cargarMunicipiosPermitidos(
        selectMunicipio
      );

    return data;
  }


  /* =======================================================
     SUPERVISOR
     ======================================================= */

  const jurInicial =
    selectJurisdiccion?.value
      ? Number(selectJurisdiccion.value)
      : null;

  const data =
    await cargarMunicipiosPermitidos(
      selectMunicipio,
      jurInicial
    );


  /*
   * Evitamos registrar varias veces el mismo listener.
   */
  if (
    selectJurisdiccion &&
    selectJurisdiccion.dataset
      .territorioConfigurado !== "1"
  ) {

    selectJurisdiccion.dataset
      .territorioConfigurado = "1";

    selectJurisdiccion.addEventListener(
      "change",
      async () => {

        const jur =
          selectJurisdiccion.value
            ? Number(selectJurisdiccion.value)
            : null;

        const resultado =
          await cargarMunicipiosPermitidos(
            selectMunicipio,
            jur
          );

        /*
         * Cada módulo puede decidir qué hacer
         * después del cambio.
         */
        if (
          typeof onCambioJurisdiccion ===
          "function"
        ) {
          await onCambioJurisdiccion(
            resultado
          );
        }
      }
    );
  }

  return data;
}