import { crearCliente, obtenerUniversidadSeleccionada, limpiarUniversidadSeleccionada } from "./nucleo/supabase-cliente.js";

const cliente = crearCliente();
const universidadId = obtenerUniversidadSeleccionada();
const alerta = document.querySelector("#pageAlert");
const lista = document.querySelector("#courseList");
const mostrar = (mensaje, tipo = "danger") => { alerta.textContent = mensaje; alerta.className = `alert alert-${tipo}`; };
const errorAmigable = (error) => error?.code === "23505" ? "Ese curso ya existe." : error?.code === "42501" ? "No tienes permisos para modificar cursos." : error?.message || "No fue posible completar la operación.";
let editando = "";
let cursos = [];
let asignaturas = [];
let profesores = [];
async function cargarCatalogos() {
  const [semestres, materias, docentes] = await Promise.all([
    cliente.from("semestres").select("id,nombre,anio,numero").eq("universidad_id", universidadId).order("anio", { ascending: false }),
    cliente.from("asignaturas").select("id,codigo,nombre").eq("universidad_id", universidadId).order("codigo"),
    cliente.from("profesores").select("id,nombre").eq("universidad_id", universidadId).order("nombre"),
  ]);
  if (semestres.error || materias.error || docentes.error) throw semestres.error || materias.error || docentes.error;
  document.querySelector("#semesterId").innerHTML = semestres.data.map((item) => `<option value="${item.id}">${item.nombre}</option>`).join("");
  document.querySelector("#subjectId").innerHTML = materias.data.map((item) => `<option value="${item.id}">${item.codigo} · ${item.nombre}</option>`).join("");
  document.querySelector("#teacherId").innerHTML = docentes.data.map((item) => `<option value="${item.id}">${item.nombre}</option>`).join("");
  asignaturas = materias.data; profesores = docentes.data;
}
async function cargar() {
  const resultado = await cliente.from("cursos").select("id,asignatura_id,semestre_id,profesor_id,numero_curso,cupos,semestres(nombre),asignaturas(codigo,nombre),profesores(nombre)").eq("universidad_id", universidadId).order("numero_curso");
  if (resultado.error) throw resultado.error;
  cursos = resultado.data || [];
  lista.innerHTML = cursos.length ? cursos.map((item) => `<div class="record-row"><div><strong>${item.asignaturas?.codigo || ""} · ${item.asignaturas?.nombre || "Asignatura"} · Curso ${item.numero_curso}</strong><small>${item.semestres?.nombre || ""} · ${item.profesores?.nombre || "Sin profesor"} · ${item.cupos ?? 0} cupos</small></div><div class="d-flex gap-2"><button class="btn btn-sm btn-outline-primary" data-edit="${item.id}" type="button">Editar</button><button class="btn btn-sm btn-outline-danger" data-delete="${item.id}" type="button">Eliminar</button></div></div>`).join("") : `<div class="empty-state"><h2 class="h6">No hay cursos todavía</h2></div>`;
  lista.querySelectorAll("[data-edit]").forEach((button) => button.addEventListener("click", () => abrirEdicion(cursos.find((item) => item.id === button.dataset.edit))));
  lista.querySelectorAll("[data-delete]").forEach((button) => button.addEventListener("click", () => eliminar(button.dataset.delete)));
}
function abrirEdicion(item) { editando = item.id; document.querySelector("#semesterId").value = item.semestre_id; document.querySelector("#subjectId").value = item.asignatura_id; document.querySelector("#teacherId").value = item.profesor_id || ""; document.querySelector("#courseSeats").value = item.cupos ?? 0; document.querySelector("#formTitle").textContent = "Editar curso"; }
async function eliminar(id) { const bloques = await cliente.from("bloques_horario").select("id", { count: "exact", head: true }).eq("curso_id", id); if (bloques.error) { mostrar(errorAmigable(bloques.error)); return; } if (!window.confirm(`Se eliminarán ${bloques.count || 0} bloque(s) de este curso. ¿Continuar?`)) return; const resultado = await cliente.from("cursos").delete().eq("id", id).eq("universidad_id", universidadId); if (resultado.error) { mostrar(errorAmigable(resultado.error)); return; } await cargar(); mostrar("Curso eliminado correctamente.", "success"); }
document.querySelector("#courseForm").addEventListener("submit", async (event) => { event.preventDefault(); const datos = { semestre_id: document.querySelector("#semesterId").value, asignatura_id: document.querySelector("#subjectId").value, profesor_id: document.querySelector("#teacherId").value || null, cupos: Number(document.querySelector("#courseSeats").value) }; let resultado; if (editando) resultado = await cliente.from("cursos").update({ profesor_id: datos.profesor_id, cupos: datos.cupos }).eq("id", editando).eq("universidad_id", universidadId); else { const existentes = cursos.filter((item) => item.semestre_id === datos.semestre_id && item.asignatura_id === datos.asignatura_id).map((item) => Number(item.numero_curso)).filter(Number.isFinite); resultado = await cliente.from("cursos").insert({ ...datos, universidad_id: universidadId, numero_curso: String(Math.max(0, ...existentes) + 1) }); } if (resultado.error) { mostrar(errorAmigable(resultado.error)); return; } event.currentTarget.reset(); editando = ""; document.querySelector("#formTitle").textContent = "Nuevo curso"; await cargar(); mostrar("Curso guardado correctamente.", "success"); });
document.querySelector("#signOut").addEventListener("click", async () => { await cliente?.auth.signOut(); limpiarUniversidadSeleccionada(); window.location.assign("/"); });
if (!cliente || !universidadId) mostrar("Selecciona una universidad desde el horario antes de administrar cursos."); else cargarCatalogos().then(cargar).catch((error) => mostrar(errorAmigable(error)));
