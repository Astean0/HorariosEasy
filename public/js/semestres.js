import { crearCliente, obtenerUniversidadSeleccionada, limpiarUniversidadSeleccionada } from "./nucleo/supabase-cliente.js";

const cliente = crearCliente();
const universidadId = obtenerUniversidadSeleccionada();
const alerta = document.querySelector("#pageAlert");
const lista = document.querySelector("#semesterList");
const mostrar = (mensaje, tipo = "danger") => { alerta.textContent = mensaje; alerta.className = `alert alert-${tipo}`; };
const errorAmigable = (error) => error?.code === "23505" ? "Ya existe un semestre con ese año y número." : error?.code === "23503" ? "No se puede eliminar porque el semestre tiene cursos asociados." : error?.message || "No fue posible completar la operación.";
let semestres = [];
let editando = "";

async function cargar() {
  const resultado = await cliente.from("semestres").select("*").eq("universidad_id", universidadId).order("anio", { ascending: false }).order("numero");
  if (resultado.error) throw resultado.error;
  semestres = resultado.data || [];
  lista.innerHTML = semestres.length ? semestres.map((item) => `<div class="record-row"><div><strong>${item.nombre}</strong><small>${item.anio}-${item.numero}${item.fecha_inicio ? ` · ${item.fecha_inicio}` : ""}</small></div><div class="d-flex gap-2"><button class="btn btn-sm btn-outline-primary" data-edit="${item.id}" type="button">Editar</button><button class="btn btn-sm btn-outline-danger" data-delete="${item.id}" type="button">Eliminar</button></div></div>`).join("") : `<div class="empty-state"><h2 class="h6">No hay semestres todavía</h2></div>`;
  lista.querySelectorAll("[data-edit]").forEach((boton) => boton.addEventListener("click", () => abrirEdicion(semestres.find((item) => item.id === boton.dataset.edit))));
  lista.querySelectorAll("[data-delete]").forEach((boton) => boton.addEventListener("click", () => eliminar(boton.dataset.delete)));
}
function abrirEdicion(item) {
  editando = item.id;
  document.querySelector("#semesterId").value = item.id;
  document.querySelector("#semesterYear").value = item.anio;
  document.querySelector("#semesterNumber").value = item.numero;
  document.querySelector("#semesterName").value = item.nombre;
  document.querySelector("#semesterStart").value = item.fecha_inicio || "";
  document.querySelector("#semesterEnd").value = item.fecha_fin || "";
  document.querySelector("#formTitle").textContent = "Editar semestre";
}
async function eliminar(id) {
  const item = semestres.find((fila) => fila.id === id);
  const cursos = await cliente.from("cursos").select("id", { count: "exact", head: true }).eq("semestre_id", id).eq("universidad_id", universidadId);
  if (cursos.error) { mostrar(errorAmigable(cursos.error)); return; }
  const cantidad = cursos.count || 0;
  if (!window.confirm(`Se eliminarán ${cantidad} curso(s) y sus bloques. ¿Continuar?`)) return;
  const resultado = await cliente.from("semestres").delete().eq("id", id).eq("universidad_id", universidadId);
  if (resultado.error) { mostrar(errorAmigable(resultado.error)); return; }
  await cargar(); mostrar(`Semestre «${item.nombre}» eliminado.`, "success");
}
document.querySelector("#semesterForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const datos = Object.fromEntries(new FormData(event.currentTarget).entries());
  datos.anio = Number(datos.anio); datos.numero = Number(datos.numero);
  datos.fecha_inicio = datos.fecha_inicio || null; datos.fecha_fin = datos.fecha_fin || null;
  const resultado = editando ? await cliente.from("semestres").update(datos).eq("id", editando).eq("universidad_id", universidadId) : await cliente.from("semestres").insert({ ...datos, universidad_id: universidadId });
  if (resultado.error) { mostrar(errorAmigable(resultado.error)); return; }
  event.currentTarget.reset(); editando = ""; document.querySelector("#semesterId").value = ""; document.querySelector("#formTitle").textContent = "Nuevo semestre"; await cargar(); mostrar("Semestre guardado correctamente.", "success");
});
document.querySelector("#signOut").addEventListener("click", async () => { await cliente?.auth.signOut(); limpiarUniversidadSeleccionada(); window.location.assign("/"); });
if (!cliente || !universidadId) mostrar("Selecciona una universidad desde el horario antes de administrar semestres."); else cargar().catch((error) => mostrar(errorAmigable(error)));
