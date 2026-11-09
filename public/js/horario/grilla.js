export function renderizarGrilla({ grid, notice, blocks, courses, subjects, rooms, teachers, onCellClick }) {
  const days = [["lunes", "Lunes"], ["martes", "Martes"], ["miercoles", "Miércoles"], ["jueves", "Jueves"], ["viernes", "Viernes"], ["sabado", "Sábado"]];
  grid.innerHTML = `<div class="schedule-corner"></div>${days.map(([, label]) => `<div class="schedule-day">${label}</div>`).join("")}`;
  for (let hour = 8; hour <= 20; hour++) {
    grid.insertAdjacentHTML("beforeend", `<div class="schedule-hour">${String(hour).padStart(2, "0")}:00</div>${days.map(([value, label]) => `<button class="schedule-cell" type="button" data-day="${value}" data-hour="${hour}" aria-label="Agregar bloque el ${label} a las ${hour}:00"></button>`).join("")}`);
  }
  grid.onclick = (event) => {
    const cell = event.target.closest(".schedule-cell");
    if (cell) onCellClick(cell);
  };
  blocks.forEach((block) => {
    const cell = grid.querySelector(`[data-day="${block.dia}"][data-hour="${Number(block.hora_inicio.slice(0, 2))}"]`);
    const subject = subjects.find((item) => item.id === courses.find((course) => course.id === block.curso_id)?.asignatura_id);
    const course = courses.find((item) => item.id === block.curso_id);
    const teacher = teachers.find((item) => item.id === course?.profesor_id);
    const room = rooms.find((item) => item.id === block.aula_id);
    if (cell) {
      cell.classList.add("schedule-block");
      cell.innerHTML = `<strong>${subject?.nombre || "Asignatura"} · Curso ${course?.numero_curso || ""}</strong><small>${room?.nombre || "Sala"} · ${teacher?.nombre || "Sin profesor"}</small>`;
    }
  });
  notice.classList.toggle("d-none", Boolean(window.horariosState?.selectedSemester && window.horariosState?.selectedCareer && window.horariosState?.selectedCareerSemester));
}
