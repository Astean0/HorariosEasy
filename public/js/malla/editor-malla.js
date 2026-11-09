const config = window.HORARIOS_CONFIG || {};
const client = config.supabaseUrl && config.supabasePublishableKey && window.supabase ? window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey) : null;
const universityId = sessionStorage.getItem("horariosEasy.universityId") || "";
const byId = (id) => document.querySelector(`#${id}`);
const alertBox = byId("pageAlert");
const showAlert = (message, type = "danger") => { alertBox.textContent = message; alertBox.className = `alert alert-${type}`; };
let careers = [];
let subjects = [];
let curriculum = [];
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
function crearModalEdicion() {
  document.body.insertAdjacentHTML("beforeend", `<div class="modal fade" id="editarMallaModal" tabindex="-1" aria-labelledby="editarMallaTitulo" aria-hidden="true"><div class="modal-dialog"><div class="modal-content"><div class="modal-header"><h2 class="modal-title h5" id="editarMallaTitulo">Editar relación</h2><button class="btn-close btn-close-white" data-bs-dismiss="modal" type="button" aria-label="Cerrar"></button></div><form id="editarMallaForm"><div class="modal-body"><div class="mb-3"><label class="form-label" for="editarCareer">Carrera</label><select id="editarCareer" name="carrera_id" class="form-select" required></select></div><div class="mb-3"><label class="form-label" for="editarSubject">Asignatura</label><select id="editarSubject" name="asignatura_id" class="form-select" required></select></div><div class="mb-3"><label class="form-label" for="editarCareerSemester">Semestre</label><input id="editarCareerSemester" name="semestre_carrera" class="form-control" type="number" min="1" max="14" required></div><div><label class="form-label" for="editarType">Tipo</label><select id="editarType" name="tipo" class="form-select"><option value="obligatoria">Obligatoria</option><option value="electiva">Electiva</option></select></div></div><div class="modal-footer"><button class="btn btn-outline-dark" data-bs-dismiss="modal" type="button">Cancelar</button><button class="btn btn-primary" type="submit">Guardar cambios</button></div></form></div></div></div>`);
  modal = bootstrap.Modal.getOrCreateInstance(byId("editarMallaModal"));
  byId("editarMallaForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const datos = Object.fromEntries(new FormData(event.currentTarget).entries());
    datos.semestre_carrera = Number(datos.semestre_carrera);
    const result = await client.from("malla_curricular").update(datos)
      .eq("carrera_id", event.currentTarget.dataset.carrera)
      .eq("asignatura_id", event.currentTarget.dataset.asignatura)
      .eq("universidad_id", universityId);
    if (result.error) { showAlert(result.error.message); return; }
    modal.hide(); await load(); showAlert("Relación actualizada correctamente.", "success");
  });
}
async function load() {
  if (!client || !universityId) throw new Error("Selecciona una universidad desde el editor de horarios antes de entrar aquí.");
  const [careerResult, subjectResult, curriculumResult] = await Promise.all([
    client.from("carreras").select("id,nombre").eq("universidad_id", universityId).order("nombre"),
    client.from("asignaturas").select("id,codigo,nombre").eq("universidad_id", universityId).order("codigo"),
    client.from("malla_curricular").select("*").eq("universidad_id", universityId),
  ]);
  if (careerResult.error) throw careerResult.error;
  if (subjectResult.error) throw subjectResult.error;
  if (curriculumResult.error) throw curriculumResult.error;
  careers = careerResult.data || []; subjects = subjectResult.data || [];
  byId("career").innerHTML = careers.map((item) => `<option value="${item.id}">${item.nombre}</option>`).join("");
  byId("subject").innerHTML = subjects.map((item) => `<option value="${item.id}">${item.codigo} · ${item.nombre}</option>`).join("");
  curriculum = curriculumResult.data || [];
  byId("curriculumList").innerHTML = curriculum.length ? curriculum.map((item) => { const key = `${item.carrera_id}|${item.asignatura_id}`; return `<div class="record-row"><div><strong>${careers.find((career) => career.id === item.carrera_id)?.nombre || "Carrera"}</strong><small>${subjects.find((subject) => subject.id === item.asignatura_id)?.nombre || "Asignatura"}</small></div><span>Semestre ${item.semestre_carrera} · ${item.tipo}</span><div class="d-flex gap-2"><button class="btn btn-sm btn-outline-primary" data-edit="${key}" type="button">Editar</button><button class="btn btn-sm btn-outline-danger" data-delete="${key}" type="button">Eliminar</button></div></div>`; }).join("") : `<div class="empty-state"><div><h2 class="h6">No hay relaciones todavía</h2></div></div>`;
  byId("curriculumList").querySelectorAll("[data-edit]").forEach((boton) => boton.addEventListener("click", () => {
    const [carreraId, asignaturaId] = boton.dataset.edit.split("|");
    const item = curriculum.find((fila) => fila.carrera_id === carreraId && fila.asignatura_id === asignaturaId);
    const formularioEdicion = byId("editarMallaForm");
    formularioEdicion.dataset.carrera = item.carrera_id;
    formularioEdicion.dataset.asignatura = item.asignatura_id;
    byId("editarCareer").innerHTML = careers.map((career) => `<option value="${career.id}">${career.nombre}</option>`).join("");
    byId("editarSubject").innerHTML = subjects.map((subject) => `<option value="${subject.id}">${subject.codigo} · ${subject.nombre}</option>`).join("");
    byId("editarCareer").value = item.carrera_id;
    byId("editarSubject").value = item.asignatura_id;
    byId("editarCareerSemester").value = item.semestre_carrera;
    byId("editarType").value = item.tipo;
    modal.show();
  }));
  byId("curriculumList").querySelectorAll("[data-delete]").forEach((boton) => boton.addEventListener("click", async () => {
    if (!window.confirm("¿Quieres eliminar esta relación de la malla?")) return;
    const [carreraId, asignaturaId] = boton.dataset.delete.split("|");
    const respuesta = await client.from("malla_curricular").delete()
      .eq("carrera_id", carreraId).eq("asignatura_id", asignaturaId).eq("universidad_id", universityId);
    if (respuesta.error) { showAlert(respuesta.error.code === "23503" ? "No se puede eliminar porque la relación está siendo utilizada." : respuesta.error.message); return; }
    await load(); showAlert("Relación eliminada correctamente.", "success");
  }));
}
byId("curriculumForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const datos = { carrera_id: byId("career").value, asignatura_id: byId("subject").value, semestre_carrera: Number(byId("careerSemester").value), tipo: byId("type").value };
  const result = await client.from("malla_curricular").insert({ ...datos, universidad_id: universityId });
  if (result.error) { showAlert(result.error.code === "23505" ? "La asignatura ya está asociada a esta carrera." : result.error.message); return; }
  byId("curriculumForm").reset(); await load(); showAlert("Relación guardada correctamente.", "success");
});
byId("signOut").addEventListener("click", async () => { await client?.auth.signOut(); sessionStorage.removeItem("horariosEasy.universityId"); window.location.assign("/"); });
asegurarBootstrap().then(() => { crearModalEdicion(); return load(); }).catch((error) => showAlert(error.message));
