export function crearCliente() {
  const config = window.HORARIOS_CONFIG || {};
  if (!config.supabaseUrl || !config.supabasePublishableKey || !window.supabase) {
    return null;
  }
  return window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey);
}

export function obtenerUniversidadSeleccionada() {
  return sessionStorage.getItem("horariosEasy.universityId") || "";
}

export function guardarUniversidadSeleccionada(id) {
  sessionStorage.setItem("horariosEasy.universityId", id);
}

export function limpiarUniversidadSeleccionada() {
  sessionStorage.removeItem("horariosEasy.universityId");
}
