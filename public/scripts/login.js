const toastRoot = document.getElementById("toast-root");
const form = document.getElementById("login-form");
const button = document.getElementById("login-button");

const showToast = (message, type = "success") => {
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = message;
  toastRoot.appendChild(el);
  setTimeout(() => el.remove(), 3500);
};

form?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const formData = new FormData(form);
  const payload = {
    email: String(formData.get("email") || "").trim(),
    password: String(formData.get("password") || "").trim(),
  };

  button.disabled = true;
  button.textContent = "Signing In...";

  try {
    const response = await fetch("/api/v1/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      credentials: "same-origin",
    });

    const json = await response.json();
    if (!response.ok) {
      throw new Error(json.message || "Login failed.");
    }

    showToast("Login successful.");
    window.location.href = "/dashboard";
  } catch (error) {
    showToast(error.message || "Login failed.", "error");
  } finally {
    button.disabled = false;
    button.textContent = "Sign In";
  }
});
