const config = window.HORARIOS_CONFIG || {};
const authForm = document.querySelector("#authForm");
const emailInput = document.querySelector("#email");
const passwordInput = document.querySelector("#password");
const authAlert = document.querySelector("#authAlert");
const authTitle = document.querySelector("#authTitle");
const authDescription = document.querySelector("#authDescription");
const submitButton = document.querySelector("#submitButton");
const toggleMode = document.querySelector("#toggleMode");
const forgotPassword = document.querySelector("#forgotPassword");
let mode = "login";

const supabaseClient = config.supabaseUrl && config.supabasePublishableKey
  ? window.supabase.createClient(config.supabaseUrl, config.supabasePublishableKey)
  : null;

function showAlert(message, type = "danger") {
  authAlert.textContent = message;
  authAlert.className = `alert alert-${type}`;
}

function setMode(nextMode) {
  mode = nextMode;
  const isRegister = mode === "register";
  authTitle.textContent = isRegister ? "Crear cuenta" : "Iniciar sesión";
  authDescription.textContent = isRegister ? "Registra tu correo institucional para comenzar." : "Ingresa para continuar a tu panel.";
  submitButton.textContent = isRegister ? "Crear cuenta" : "Ingresar";
  toggleMode.textContent = isRegister ? "Ya tengo una cuenta" : "Crear una cuenta";
  forgotPassword.classList.toggle("d-none", isRegister);
  authAlert.className = "alert d-none";
}

toggleMode.addEventListener("click", () => setMode(mode === "login" ? "register" : "login"));
forgotPassword.addEventListener("click", async () => {
  if (!emailInput.value) {
    emailInput.focus();
    showAlert("Escribe tu correo institucional para solicitar el enlace.");
    return;
  }
  if (!supabaseClient) {
    showAlert("Configura las variables de Supabase en .env.local.");
    return;
  }
  const { error } = await supabaseClient.auth.resetPasswordForEmail(emailInput.value.trim(), { redirectTo: `${window.location.origin}/auth.html` });
  if (error) showAlert(error.message);
  else showAlert("Si el correo existe, recibirás instrucciones para recuperar tu contraseña.", "success");
});

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  authForm.classList.add("was-validated");
  if (!authForm.checkValidity()) return;
  if (!supabaseClient) {
    showAlert("Falta configurar la conexión con Supabase.");
    return;
  }
  submitButton.disabled = true;
  try {
    const credentials = { email: emailInput.value.trim(), password: passwordInput.value };
    const result = mode === "register"
      ? await supabaseClient.auth.signUp({ ...credentials, options: { emailRedirectTo: `${window.location.origin}/auth.html` } })
      : await supabaseClient.auth.signInWithPassword(credentials);
    if (result.error) throw result.error;
    if (mode === "register" && !result.data.session) {
      showAlert("Cuenta creada. Revisa tu correo para confirmar el registro.", "success");
    } else {
      window.location.assign("/app.html");
    }
  } catch (error) {
    showAlert(error.message || "No fue posible completar la operación.");
  } finally {
    submitButton.disabled = false;
  }
});
