import { crearCliente, obtenerUniversidadSeleccionada, limpiarUniversidadSeleccionada } from "../nucleo/supabase-cliente.js";
import { mostrarAlerta } from "../nucleo/utilidades.js";

const config = window.HORARIOS_CONFIG || {};
const cliente = crearCliente();
const universidadId = obtenerUniversidadSeleccionada();
const pagina = document.body.dataset.page;
const definiciones = {
  carreras: { tabla: "carreras", titulo: "Carreras", descripcion: "Administra las carreras de la universidad.", campos: [["nombre", "Nombre", "text"], ["codigo", "Código", "text"]] },
  asignaturas: { tabla: "asignaturas", titulo: "Asignaturas", descripcion: "Mantén el catálogo compartido entre carreras.", campos: [["codigo", "Código", "text"], ["nombre", "Nombre", "text"], ["horas_semanales", "Horas semanales", "number"], ["creditos", "Créditos", "number"]] },
  profesores: { tabla: "profesores", titulo: "Profesores", descripcion: "Registra profesores y su disponibilidad semanal.", campos: [["nombre", "Nombre", "text"], ["correo", "Correo", "email"], ["horas_maximas_semanales", "Horas máximas semanales", "number"]] },
  salas: { tabla: "aulas", titulo: "Salas", descripcion: "Configura salas, capacidad y equipamiento.", campos: [["nombre", "Nombre", "text"], ["capacidad", "Capacidad", "number"], ["equipamiento", "Equipamiento", "text"]] },
};
const definicion = definiciones[pagina];
const formulario = document.querySelector("#editorForm");
const lista = document.querySelector("#recordList");
const alerta = document.querySelector("#pageAlert");
let modal;
function asegurarBootstrap() {
  if (window.bootstrap) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js";
    script.onload = resolve;
    script.onerror = () => reject(new Error("No fue posible cargar el componente de edición."));
    document.head.appendChild(script);
  });
}

function explicarError(error) {
  if (error?.code === "23505") return "Ya existe un registro con esos datos.";
  if (error?.code === "23503") return "No se puede eliminar porque este registro está siendo utilizado.";
  if (error?.code === "42501") return "No tienes permisos para modificar estos datos. Revisa las políticas RLS.";
  return error?.message || "No fue posible completar la operación.";
}

function crearModalEdicion() {
  const campos = definicion.campos.map(([id, etiqueta, tipo]) => `<div class="mb-3"><label class="form-label" for="editar-${id}">${etiqueta}</label><input class="form-control" id="editar-${id}" name="${id}" type="${tipo}" required></div>`).join("");
  document.body.insertAdjacentHTML("beforeend", `<div class="modal fade" id="editarRegistroModal" tabindex="-1" aria-labelledby="editarRegistroTitulo" aria-hidden="true"><div class="modal-dialog"><div class="modal-content"><div class="modal-header"><h2 class="modal-title h5" id="editarRegistroTitulo">Editar ${definicion.titulo.slice(0, -1).toLowerCase()}</h2><button class="btn-close btn-close-white" data-bs-dismiss="modal" type="button" aria-label="Cerrar"></button></div><form id="editarRegistroForm"><div class="modal-body">${campos}</div><div class="modal-footer"><button class="btn btn-outline-dark" data-bs-dismiss="modal" type="button">Cancelar</button><button class="btn btn-primary" type="submit">Guardar cambios</button></div></form></div></div></div>`);
  const formularioEdicion = document.querySelector("#editarRegistroForm");
  formularioEdicion.addEventListener("submit", async (event) => {
    event.preventDefault();
    const fila = formularioEdicion.dataset.id;
    const datos = Object.fromEntries(new FormData(formularioEdicion).entries());
    ["horas_semanales", "creditos", "horas_maximas_semanales", "capacidad"].forEach((campo) => { if (campo in datos) datos[campo] = Number(datos[campo]); });
    if (pagina === "salas") datos.equipamiento = datos.equipamiento ? datos.equipamiento.split(",").map((item) => item.trim()).filter(Boolean) : [];
    const resultado = await cliente.from(definicion.tabla).update(datos).eq("id", fila).eq("universidad_id", universidadId);
    if (resultado.error) { mostrarAlerta(alerta, explicarError(resultado.error)); return; }
    modal.hide(); await cargar(); mostrarAlerta(alerta, "Registro actualizado correctamente.", "success");
  });
  modal = bootstrap.Modal.getOrCreateInstance(document.querySelector("#editarRegistroModal"));
}

function abrirEdicion(fila) {
  const formularioEdicion = document.querySelector("#editarRegistroForm");
  formularioEdicion.dataset.id = fila.id;
  definicion.campos.forEach(([id]) => {
    const valor = fila[id];
    formularioEdicion.elements[id].value = Array.isArray(valor) ? valor.join(", ") : (valor ?? "");
  });
  modal.show();
}

async function cargar() {
  if (!cliente || !universidadId) throw new Error("Selecciona una universidad desde el editor de horarios antes de entrar aquí.");
  const resultado = await cliente.from(definicion.tabla).select("*").eq("universidad_id", universidadId).order("nombre");
  if (resultado.error) throw resultado.error;
  lista.innerHTML = resultado.data.length ? resultado.data.map((fila) => `<div class="record-row"><div><strong>${fila.nombre}</strong><small>${fila.codigo || fila.correo || (Array.isArray(fila.equipamiento) ? fila.equipamiento.join(", ") : "")}</small></div><span>${fila.horas_semanales || fila.horas_maximas_semanales || fila.capacidad || ""}</span><div class="d-flex gap-2"><button class="btn btn-sm btn-outline-primary" data-edit="${fila.id}" type="button">Editar</button><button class="btn btn-sm btn-outline-danger" data-delete="${fila.id}" type="button">Eliminar</button></div></div>`).join("") : `<div class="empty-state"><div><h2 class="h6">No hay registros todavía</h2><p class="small text-secondary mb-0">Agrega el primero usando el formulario.</p></div></div>`;
  lista.querySelectorAll("[data-edit]").forEach((boton) => boton.addEventListener("click", () => abrirEdicion(resultado.data.find((fila) => fila.id === boton.dataset.edit))));
  lista.querySelectorAll("[data-delete]").forEach((boton) => boton.addEventListener("click", async () => {
    if (!window.confirm("¿Quieres eliminar este registro?")) return;
    const respuesta = await cliente.from(definicion.tabla).delete().eq("id", boton.dataset.delete).eq("universidad_id", universidadId);
    if (respuesta.error) { mostrarAlerta(alerta, explicarError(respuesta.error)); return; }
    await cargar(); mostrarAlerta(alerta, "Registro eliminado correctamente.", "success");
  }));
}

document.querySelector("#pageTitle").textContent = definicion.titulo;
document.querySelector("#pageDescription").textContent = definicion.descripcion;
document.querySelector("#formFields").innerHTML = definicion.campos.map(([id, etiqueta, tipo]) => `<div class="col-md-6"><label class="form-label" for="${id}">${etiqueta}</label><input class="form-control" id="${id}" name="${id}" type="${tipo}" required></div>`).join("");
formulario.addEventListener("submit", async (event) => {
  event.preventDefault();
  const datos = Object.fromEntries(new FormData(formulario).entries());
  datos.universidad_id = universidadId;
  ["horas_semanales", "creditos", "horas_maximas_semanales", "capacidad"].forEach((campo) => { if (campo in datos) datos[campo] = Number(datos[campo]); });
  if (pagina === "salas") datos.equipamiento = datos.equipamiento ? datos.equipamiento.split(",").map((item) => item.trim()).filter(Boolean) : [];
  try {
    const resultado = await cliente.from(definicion.tabla).insert(datos);
    if (resultado.error) throw resultado.error;
    formulario.reset(); await cargar(); mostrarAlerta(alerta, "Registro guardado correctamente.", "success");
  } catch (error) {
    mostrarAlerta(alerta, explicarError(error));
  }
});
document.querySelector("#signOut").addEventListener("click", async () => { await cliente?.auth.signOut(); limpiarUniversidadSeleccionada(); window.location.assign("/"); });
asegurarBootstrap().then(() => { crearModalEdicion(); return cargar(); }).catch((error) => mostrarAlerta(alerta, explicarError(error)));
