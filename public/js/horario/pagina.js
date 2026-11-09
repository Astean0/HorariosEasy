import { crearCliente, obtenerUniversidadSeleccionada, guardarUniversidadSeleccionada, limpiarUniversidadSeleccionada } from "../nucleo/supabase-cliente.js";
import { renderizarGrilla } from "./grilla.js";
import { cargarConflictos } from "./conflictos.js";

const supabaseClient = crearCliente();
const state = {
  universityId: obtenerUniversidadSeleccionada(),
  semesters: [],
  careers: [],
  subjects: [],
  teachers: [],
  rooms: [],
  curriculum: [],
  blocks: [],
  selectedSemester: "",
  selectedCareer: "",
  selectedCareerSemester: "",
};
const byId = (id) => document.querySelector(`#${id}`);
const showAlert = (message, type = "danger") => { const alert = byId("appAlert"); alert.textContent = message; alert.className = `alert alert-${type}`; };
const tableQuery = (table) => supabaseClient.from(table).select("*").eq("universidad_id", state.universityId);

function explainError(error) {
  if (error?.code === "23505") return "Ya existe un registro con esos datos.";
  if (error?.code === "23503") return "No se puede completar la operación porque el registro está relacionado con otros datos.";
  if (error?.code === "42501") return "Tu usuario no tiene permisos para consultar estos datos. Revisa las políticas RLS de Supabase.";
  if (error?.code === "PGRST205" || error?.code === "42P01") return "La tabla solicitada no está disponible en el esquema público de Supabase.";
  return error?.message || "No fue posible completar la operación.";
}

function renderSemesters() {
  byId("semesterSelect").innerHTML = `<option value="">Selecciona un semestre</option>${state.semesters.map((item) => `<option value="${item.id}">${item.anio}-${item.numero} · ${item.nombre}</option>`).join("")}`;
}

function renderSchedule() {
  window.horariosState = state;
  renderizarGrilla({
    grid: byId("scheduleGrid"),
    notice: byId("editorNotice"),
    blocks: state.blocks,
    courses: state.courses,
    subjects: state.subjects,
    rooms: state.rooms,
    teachers: state.teachers,
    onCellClick: (cell) => {
      if (!state.selectedSemester || !state.selectedCareer || !state.selectedCareerSemester) return;
      byId("blockDay").value = cell.dataset.day;
      bootstrap.Modal.getOrCreateInstance(byId("blockModal")).show();
    },
  });
}

async function loadData() {
  const queries = await Promise.all([
    tableQuery("semestres").order("anio", { ascending: false }).order("numero"),
    tableQuery("carreras").order("nombre"),
    tableQuery("asignaturas").order("codigo"),
    tableQuery("profesores").order("nombre"),
    tableQuery("aulas").order("nombre"),
    supabaseClient.from("malla_curricular").select("*").eq("universidad_id", state.universityId),
  ]);
  const failed = queries.find((result) => result.error);
  if (failed) throw failed.error;
  [state.semesters, state.careers, state.subjects, state.teachers, state.rooms, state.curriculum] = queries.map((result) => result.data || []);
  renderSemesters();
  byId("careerSelect").innerHTML = `<option value="">Carrera</option>${state.careers.map((item) => `<option value="${item.id}">${item.nombre}</option>`).join("")}`;
  renderSchedule();
}

async function loadBlocks() {
  const allowedSubjects = new Set(state.curriculum.filter((item) => item.carrera_id === state.selectedCareer && String(item.semestre_carrera) === String(state.selectedCareerSemester)).map((item) => item.asignatura_id));
  const coursesResult = await tableQuery("cursos").select("id,asignatura_id,profesor_id,numero_curso,cupos").eq("semestre_id", state.selectedSemester);
  if (coursesResult.error) throw coursesResult.error;
  state.courses = (coursesResult.data || []).filter((course) => allowedSubjects.has(course.asignatura_id));
  const ids = state.courses.map((course) => course.id);
  if (!ids.length) { state.blocks = []; renderSchedule(); byId("conflictsPanel").classList.add("d-none"); return; }
  const result = await supabaseClient.from("bloques_horario").select("*").in("curso_id", ids);
  if (result.error) throw result.error;
  state.blocks = result.data || [];
  renderSchedule();
  await loadConflicts();
}

async function loadConflicts() {
  await cargarConflictos({
    cliente: supabaseClient,
    semestreId: state.selectedSemester,
    panel: byId("conflictsPanel"),
    lista: byId("conflictsList"),
  });
}

async function loadUniversities() {
  const { data, error } = await supabaseClient.from("universidades").select("id,nombre").order("nombre");
  if (error) {
    if (error.code === "42P01" || error.code === "PGRST205") {
      throw new Error("La tabla universidades no está disponible en el esquema público de Supabase.");
    }
    if (error.code === "42501") {
      throw new Error("Tu usuario no tiene permiso para leer universidades. Activa una política SELECT para usuarios autenticados.");
    }
    throw error;
  }
  const select = byId("universitySelect");
  const initial = byId("universityInitialSelect");
  const options = `<option value="">Selecciona una universidad</option>${(data || []).map((item) => `<option value="${item.id}">${item.nombre}</option>`).join("")}`;
  select.innerHTML = options;
  initial.innerHTML = options;
  if (!data?.length) throw new Error("Supabase respondió correctamente, pero no hay universidades visibles para este usuario. Revisa que la tabla tenga registros y una política SELECT para usuarios autenticados.");
  if (state.universityId && data.some((item) => item.id === state.universityId)) {
    selectUniversity(state.universityId);
  } else {
    bootstrap.Modal.getOrCreateInstance(byId("universityModal")).show();
  }
}

async function selectUniversity(id) {
  state.universityId = id;
  guardarUniversidadSeleccionada(id);
  byId("universitySelect").value = id;
  bootstrap.Modal.getInstance(byId("universityModal"))?.hide();
  try { await loadData(); } catch (error) { showAlert(explainError(error)); }
}

byId("semesterSelect").addEventListener("change", async (event) => { state.selectedSemester = event.target.value; try { await loadBlocks(); } catch (error) { showAlert(explainError(error)); } });
byId("careerSelect").addEventListener("change", (event) => {
  state.selectedCareer = event.target.value;
  state.selectedCareerSemester = "";
  byId("careerSemesterSelect").innerHTML = `<option value="">Semestre</option>${[...new Set(state.curriculum.filter((item) => item.carrera_id === state.selectedCareer).map((item) => item.semestre_carrera))].map((semester) => `<option value="${semester}">Semestre ${semester}</option>`).join("")}`;
  renderSchedule();
  if (state.selectedSemester && state.selectedCareerSemester) loadBlocks().catch((error) => showAlert(explainError(error)));
});
byId("careerSemesterSelect").addEventListener("change", async (event) => { state.selectedCareerSemester = event.target.value; renderSchedule(); if (state.selectedSemester) { try { await loadBlocks(); } catch (error) { showAlert(explainError(error)); } } });
byId("blockSubject").addEventListener("change", (event) => {
  const cursos = state.courses.filter((course) => course.asignatura_id === event.target.value);
  byId("blockCourse").innerHTML = `<option value="">Selecciona un curso</option>${cursos.map((course) => `<option value="${course.id}">Curso ${course.numero_curso} · ${state.teachers.find((teacher) => teacher.id === course.profesor_id)?.nombre || "Sin profesor"}</option>`).join("")}<option value="nuevo">Crear curso nuevo</option>`;
  byId("blockTeacher").disabled = false;
});
byId("scheduleGrid").addEventListener("click", (event) => { const cell = event.target.closest(".schedule-cell"); if (!cell || !state.selectedSemester || !state.selectedCareer || !state.selectedCareerSemester) return; byId("blockDay").value = cell.dataset.day; byId("blockSubject").innerHTML = `<option value="">Selecciona una asignatura</option>${state.curriculum.filter((item) => item.carrera_id === state.selectedCareer && String(item.semestre_carrera) === String(state.selectedCareerSemester)).map((item) => state.subjects.find((subject) => subject.id === item.asignatura_id)).filter(Boolean).map((item) => `<option value="${item.id}">${item.codigo} · ${item.nombre}</option>`).join("")}`; byId("blockTeacher").innerHTML = `<option value="">Selecciona un profesor</option>${state.teachers.map((item) => `<option value="${item.id}">${item.nombre}</option>`).join("")}`; byId("blockRoom").innerHTML = `<option value="">Selecciona una sala</option>${state.rooms.map((item) => `<option value="${item.id}">${item.nombre} · capacidad ${item.capacidad}</option>`).join("")}`; byId("blockCourse").innerHTML = `<option value="">Selecciona un curso</option>${state.courses.filter((course) => course.asignatura_id === byId("blockSubject").value).map((course) => `<option value="${course.id}">Curso ${course.numero_curso} · ${state.teachers.find((teacher) => teacher.id === course.profesor_id)?.nombre || "Sin profesor"}</option>`).join("")}`; bootstrap.Modal.getOrCreateInstance(byId("blockModal")).show(); });
byId("blockForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const subjectId = byId("blockSubject").value;
    let course = state.courses.find((item) => item.id === byId("blockCourse").value);
    if (!course) {
      const numbers = state.courses.filter((item) => item.asignatura_id === subjectId).map((item) => Number(item.numero_curso)).filter(Number.isFinite);
      const created = await supabaseClient.from("cursos").insert({ universidad_id: state.universityId, asignatura_id: subjectId, semestre_id: state.selectedSemester, profesor_id: byId("blockTeacher").value, numero_curso: String(Math.max(0, ...numbers) + 1), cupos: 0 }).select("id,asignatura_id,profesor_id,numero_curso,cupos").single();
      if (created.error) throw created.error;
      course = created.data;
    }
    const result = await supabaseClient.from("bloques_horario").insert({ curso_id: course.id, aula_id: byId("blockRoom").value, dia: byId("blockDay").value, hora_inicio: byId("blockStart").value, hora_fin: byId("blockEnd").value, tipo: byId("blockType").value }).select().single();
    if (result.error) throw result.error;
    await loadBlocks(); bootstrap.Modal.getInstance(byId("blockModal")).hide(); showAlert("Bloque guardado correctamente.", "success");
  } catch (error) { showAlert(explainError(error)); }
});
byId("newSemester").addEventListener("click", () => {});
byId("semesterForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const result = await supabaseClient.from("semestres").insert({ universidad_id: state.universityId, anio: Number(byId("semesterYear").value), numero: Number(byId("semesterNumber").value), nombre: byId("semesterName").value.trim() }).select().single();
    if (result.error) throw result.error;
    state.semesters.push(result.data); renderSemesters(); byId("semesterSelect").value = result.data.id; state.selectedSemester = result.data.id; await loadBlocks(); bootstrap.Modal.getInstance(byId("semesterModal")).hide();
  } catch (error) { showAlert(explainError(error)); }
});
byId("universityInitialSelect").addEventListener("change", (event) => { byId("useUniversity").disabled = !event.target.value; });
byId("useUniversity").addEventListener("click", () => selectUniversity(byId("universityInitialSelect").value));
byId("universitySelect").addEventListener("change", (event) => { if (event.target.value) selectUniversity(event.target.value); });
byId("signOut").addEventListener("click", async () => { await supabaseClient?.auth.signOut(); limpiarUniversidadSeleccionada(); window.location.assign("/"); });

(async () => {
  try {
    if (!supabaseClient) throw new Error("Falta configurar la conexión con Supabase.");
    const session = await supabaseClient.auth.getSession();
    if (!session.data.session) { window.location.assign("/auth.html"); return; }
    await loadUniversities();
  } catch (error) { showAlert(explainError(error)); }
})();
