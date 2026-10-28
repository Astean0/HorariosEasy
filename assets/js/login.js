import { crearCliente } from "../../lib/supabase.js";

const form = document.querySelector("#login-form");
const emailInput = document.querySelector("#email");
const passwordInput = document.querySelector("#password");
const message = document.querySelector("#login-message");
const title = document.querySelector("#login-title");
const submitButton = form.querySelector('button[type="submit"]');
const createAccountButton = document.querySelector("#create-account");
const forgotPasswordLink = document.querySelector("#forgot-password");
let isBusy = false;
let isPasswordRecovery = false;

function showMessage(text, type = "error") {
  message.textContent = text;
  message.className = `login-message login-message-${type}`;
}

let supabase;

try {
  supabase = crearCliente();
  supabase.auth.onAuthStateChange((event) => {
    if (event !== "PASSWORD_RECOVERY") return;

    isPasswordRecovery = true;
    title.textContent = "Restablecer contraseña";
    passwordInput.autocomplete = "new-password";
    passwordInput.placeholder = "Nueva contraseña";
    submitButton.textContent = "Guardar nueva contraseña";
    createAccountButton.hidden = true;
    forgotPasswordLink.hidden = true;
    showMessage("Escribe tu nueva contraseña.", "success");
  });
} catch (error) {
  console.error("No se pudo configurar Supabase:", error);
  showMessage(error.message);
  submitButton.disabled = true;
  createAccountButton.disabled = true;
  forgotPasswordLink.setAttribute("aria-disabled", "true");
}

async function runAuthAction(action) {
  if (!supabase || isBusy) return;

  isBusy = true;
  submitButton.disabled = true;
  createAccountButton.disabled = true;
  forgotPasswordLink.setAttribute("aria-disabled", "true");
  showMessage("");

  try {
    await action();
  } catch (error) {
    showMessage(error.message || "Ocurrió un error al conectar con Supabase.");
  } finally {
    isBusy = false;
    submitButton.disabled = false;
    createAccountButton.disabled = false;
    forgotPasswordLink.removeAttribute("aria-disabled");
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!form.reportValidity()) return;

  runAuthAction(async () => {
    if (isPasswordRecovery) {
      const { error } = await supabase.auth.updateUser({
        password: passwordInput.value,
      });

      if (error) throw error;

      window.location.assign("decision.html");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: emailInput.value.trim(),
      password: passwordInput.value,
    });

    if (error) throw error;

    window.location.assign("decision.html");
  });
});

createAccountButton.addEventListener("click", () => {
  if (!form.reportValidity()) return;

  runAuthAction(async () => {
    const { data, error } = await supabase.auth.signUp({
      email: emailInput.value.trim(),
      password: passwordInput.value,
      options: {
        emailRedirectTo: new URL("login.html", window.location.href).href,
      },
    });

    if (error) throw error;

    if (data.session) {
      window.location.assign("decision.html");
      return;
    }

    showMessage("Cuenta creada. Revisa tu correo para confirmar el registro.", "success");
  });
});

forgotPasswordLink.addEventListener("click", (event) => {
  event.preventDefault();

  if (!emailInput.reportValidity()) return;

  runAuthAction(async () => {
    const { error } = await supabase.auth.resetPasswordForEmail(emailInput.value.trim(), {
      redirectTo: new URL("login.html", window.location.href).href,
    });

    if (error) throw error;

    showMessage("Si existe una cuenta con ese correo, recibirás un enlace para restablecer la contraseña.", "success");
  });
});
