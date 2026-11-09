export async function cargarConflictos({ cliente, semestreId, panel, lista }) {
  const vistas = ["vista_conflictos_aula", "vista_conflictos_profesor", "vista_conflictos_carrera_semestre", "vista_conflictos_capacidad", "vista_sobrecarga_profesores"];
  const resultados = await Promise.all(vistas.map((vista) => cliente.from(vista).select("*").eq("semestre_id", semestreId)));
  const fallido = resultados.find((resultado) => resultado.error);
  if (fallido) throw fallido.error;
  const conflictos = resultados.flatMap((resultado) => resultado.data || []);
  panel.classList.toggle("d-none", !conflictos.length);
  lista.innerHTML = conflictos.map((item) => `<p class="small mb-1">Conflicto detectado entre ${item.desde || "los bloques seleccionados"} y ${item.hasta || "el horario actual"}.</p>`).join("");
}
