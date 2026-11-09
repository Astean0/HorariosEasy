export const porId = (id) => document.querySelector(`#${id}`);

export function mostrarAlerta(elemento, mensaje, tipo = "danger") {
  elemento.textContent = mensaje;
  elemento.className = `alert alert-${tipo}`;
}

export function explicarError(error) {
  if (error?.code === "23505") return "Ya existe un registro con esos datos.";
  if (error?.code === "23503") return "No se puede completar la operación porque el registro está relacionado con otros datos.";
  return error?.message || "No fue posible completar la operación.";
}
