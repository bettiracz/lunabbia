
document.addEventListener("DOMContentLoaded", async () => {
  const apiBase = localStorage.getItem("lunabbia_api_url") ||
    "http://127.0.0.1:8000/api";

  const tokenKey = "lunabbia_token";

  const authPanel = document.getElementById("auth-panel");
  const profilePanel = document.getElementById("profile-panel");
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");
  const loginTab = document.getElementById("show-login");
  const registerTab = document.getElementById("show-register");
  const logoutButton = document.getElementById("logout-button");

  const loginError = document.getElementById("login-error");
  const registerError = document.getElementById("register-error");
  const accountError = document.getElementById("account-error");

  const ordersList = document.getElementById("account-orders-list");
  const ordersEmpty = document.getElementById("account-orders-empty");

  function getToken() {
    return localStorage.getItem(tokenKey);
  }

  function setToken(token) {
    localStorage.setItem(tokenKey, token);
  }

  function clearToken() {
    localStorage.removeItem(tokenKey);
  }

  function showAuth() {
    authPanel.hidden = false;
    profilePanel.hidden = true;
  }

  function showProfile() {
    authPanel.hidden = true;
    profilePanel.hidden = false;
  }

  function showTab(tab) {
    const isLogin = tab === "login";

    loginForm.hidden = !isLogin;
    registerForm.hidden = isLogin;

    loginTab.classList.toggle("active", isLogin);
    registerTab.classList.toggle("active", !isLogin);

    loginError.textContent = "";
    registerError.textContent = "";
    accountError.textContent = "";
  }

  async function api(path, options = {}) {
    const headers = {
      Accept: "application/json",
      ...(options.body ? {
        "Content-Type": "application/json"
      } : {}),
      ...(getToken() ? {
        Authorization: `Bearer ${getToken()}`
      } : {})
    };

    let response;

    try {
      response = await fetch(`${apiBase}${path}`, {
        ...options,
        headers
      });
    } catch {
      throw new Error(
        "A kapcsolat átmenetileg megszakadt. Kérjük, próbáld újra néhány perc múlva."
      );
    }

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      const validationError = result.errors
        ? Object.values(result.errors).flat()[0]
        : null;

      const error = new Error(
        validationError || result.message ||
        "A kérés feldolgozása nem sikerült. Kérjük, próbáld újra."
      );

      error.status = response.status;
      throw error;
    }

    return result;
  }

  function setLoading(form, loading) {
    const button = form.querySelector('button[type="submit"]');

    button.disabled = loading;
    button.textContent = loading
      ? "Kérlek, várj…"
      : form === loginForm ? "Bejelentkezés" : "Regisztráció";
  }

  function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);

    return Number.isNaN(date.getTime())
      ? String(value)
      : date.toLocaleString("hu-HU", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit"
        });
  }

  function formatPrice(value) {
    return `${Number(value || 0).toLocaleString("hu-HU")} Ft`;
  }

  function createElement(tag, text, className = "") {
    const node = document.createElement(tag);

    node.textContent = String(text ?? "");

    if (className) {
      node.className = className;
    }

    return node;
  }

  const statuses = {
    new: "Új rendelés",
    processing: "Feldolgozás alatt",
    shipped: "Feladva",
    completed: "Teljesítve",
    cancelled: "Törölve"
  };

  function renderOrders(orders) {
    ordersList.replaceChildren();
    ordersEmpty.hidden = orders.length > 0;

    orders.forEach(order => {
      const article = createElement("article", "", "account-order");
      const header = createElement("div", "", "account-order-header");

      const heading = createElement(
        "strong",
        order.order_number || `Rendelés #${order.id}`
      );

      const status = createElement(
        "span",
        statuses[order.status] || order.status || "—"
      );

      header.append(heading, status);

      const date = createElement(
        "p",
        formatDate(order.created_at),
        "account-order-meta"
      );

      const itemList = document.createElement("ul");
      itemList.className = "account-order-items";

      (order.items || []).forEach(item => {
        const name = item.product_name || item.product?.name || "Termék";
        const quantity = item.quantity ?? 1;

        itemList.append(
          createElement("li", `${name} · ${quantity} db`)
        );
      });

      const total = createElement(
        "p",
        `Összesen: ${formatPrice(order.total)}`,
        "account-order-total"
      );

      article.append(header, date, itemList, total);
      ordersList.append(article);
    });
  }

  async function loadOrders() {
    try {
      const result = await api("/my-orders");
      renderOrders(result.data || []);
    } catch {
      ordersList.replaceChildren();
      ordersEmpty.hidden = true;
      accountError.textContent =
        "A rendeléseidet jelenleg nem tudjuk megjeleníteni. Kérjük, próbáld újra később.";
    }
  }

  async function loadProfile() {
    const result = await api("/me");
    const user = result.data;

    if (!user) {
      throw new Error(
        "Nem sikerült betölteni a fiókadataidat. Kérjük, próbáld újra."
      );
    }

    document.getElementById("account-welcome").textContent =
      `Üdvözlünk, ${user.name}!`;

    document.getElementById("account-name").textContent = user.name;
    document.getElementById("account-email").textContent = user.email;

    accountError.textContent = "";
    showProfile();

    await loadOrders();
  }

  loginTab.addEventListener("click", () => showTab("login"));
  registerTab.addEventListener("click", () => showTab("register"));

  loginForm.addEventListener("submit", async event => {
    event.preventDefault();

    loginError.textContent = "";
    setLoading(loginForm, true);

    const data = new FormData(loginForm);

    try {
      const result = await api("/login", {
        method: "POST",
        body: JSON.stringify({
          email: String(data.get("email")).trim(),
          password: String(data.get("password"))
        })
      });

      if (!result.data?.token) {
        throw new Error(
          "A bejelentkezés nem sikerült. Kérjük, próbáld újra."
        );
      }

      setToken(result.data.token);
      loginForm.reset();

      await loadProfile();
    } catch (error) {
      loginError.textContent = error.status === 422
        ? "A megadott e-mail-cím vagy jelszó nem megfelelő."
        : error.message;
    } finally {
      setLoading(loginForm, false);
    }
  });

  registerForm.addEventListener("submit", async event => {
    event.preventDefault();

    registerError.textContent = "";

    const data = new FormData(registerForm);
    const password = String(data.get("password"));
    const confirmation = String(data.get("password_confirmation"));

    if (password !== confirmation) {
      registerError.textContent = "A két jelszó nem egyezik.";
      return;
    }

    setLoading(registerForm, true);

    try {
      const result = await api("/register", {
        method: "POST",
        body: JSON.stringify({
          name: String(data.get("name")).trim(),
          email: String(data.get("email")).trim(),
          password,
          password_confirmation: confirmation
        })
      });

      if (!result.data?.token) {
        throw new Error(
          "A regisztráció nem sikerült. Kérjük, próbáld újra."
        );
      }

      setToken(result.data.token);
      registerForm.reset();

      await loadProfile();
    } catch (error) {
      registerError.textContent = error.message;
    } finally {
      setLoading(registerForm, false);
    }
  });

  logoutButton.addEventListener("click", async () => {
    logoutButton.disabled = true;

    try {
      await api("/logout", { method: "POST" });
    } catch {
    } finally {
      clearToken();
      ordersList.replaceChildren();
      logoutButton.disabled = false;
      showAuth();
      showTab("login");
    }
  });

  showTab("login");

  if (getToken()) {
    try {
      await loadProfile();
    } catch (error) {
      if (error.status === 401) {
        clearToken();
        showAuth();
      } else {
        showAuth();
        loginError.textContent =
          "A fiókodat jelenleg nem tudjuk betölteni. Kérjük, próbáld újra később.";
      }
    }
  } else {
    showAuth();
  }
});
