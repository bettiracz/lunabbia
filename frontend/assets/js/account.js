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

  const shippingForm = document.getElementById("shipping-form");
  const shippingPhone = document.getElementById("shipping-phone");
  const shippingPostalCode = document.getElementById("shipping-postal-code");
  const shippingCity = document.getElementById("shipping-city");
  const shippingStreetAddress = document.getElementById("shipping-street-address");
  const shippingAddressExtra = document.getElementById("shipping-address-extra");
  const shippingSaveButton = document.getElementById("shipping-save-button");
  const shippingSuccess = document.getElementById("shipping-success");
  const shippingError = document.getElementById("shipping-error");

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
        validationError ||
        (response.status < 500 ? result.message : null) ||
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
    const token = getToken();

    try {
      const result = await api("/my-orders");

      if (getToken() !== token) return;

      renderOrders(result.data || []);
    } catch {
      if (getToken() !== token) return;

      ordersList.replaceChildren();
      ordersEmpty.hidden = true;

      accountError.textContent =
        "A rendeléseidet jelenleg nem tudjuk megjeleníteni. Kérjük, próbáld újra később.";
    }
  }

  function fillShippingForm(user) {
    shippingPhone.value = user.phone ?? "";
    shippingPostalCode.value = user.postal_code ?? "";
    shippingCity.value = user.city ?? "";
    shippingStreetAddress.value = user.street_address ?? "";
    shippingAddressExtra.value = user.address_extra ?? "";
  }

  function clearShippingForm() {
    shippingForm.reset();
    shippingSuccess.textContent = "";
    shippingError.textContent = "";
    shippingSaveButton.disabled = true;
    shippingSaveButton.textContent = "Adatok mentése";
  }

  function clearProfile() {
    document.getElementById("account-welcome").textContent =
      "Üdvözlünk!";

    document.getElementById("account-name").textContent = "";
    document.getElementById("account-email").textContent = "";

    clearShippingForm();

    ordersList.replaceChildren();
    ordersEmpty.hidden = true;
  }

  async function loadProfile() {
    const token = getToken();
    const result = await api("/me");

    if (getToken() !== token) return;

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

    fillShippingForm(user);

    shippingSaveButton.disabled = false;
    shippingSuccess.textContent = "";
    shippingError.textContent = "";

    accountError.textContent = "";

    showProfile();

    await loadOrders();
  }

  shippingForm.addEventListener("input", () => {
    shippingSuccess.textContent = "";
    shippingError.textContent = "";
  });

  shippingForm.addEventListener("submit", async event => {
    event.preventDefault();

    if (!getToken() || shippingSaveButton.disabled) return;

    const token = getToken();

    shippingSuccess.textContent = "";
    shippingError.textContent = "";

    shippingSaveButton.disabled = true;
    shippingSaveButton.textContent = "Mentés folyamatban…";

    const data = new FormData(shippingForm);

    const payload = {
      phone: String(data.get("phone") ?? "").trim() || null,
      postal_code: String(data.get("postal_code") ?? "").trim() || null,
      city: String(data.get("city") ?? "").trim() || null,
      street_address: String(data.get("street_address") ?? "").trim() || null,
      address_extra: String(data.get("address_extra") ?? "").trim() || null
    };

    try {
      const result = await api("/profile", {
        method: "PATCH",
        body: JSON.stringify(payload)
      });

      if (getToken() !== token) return;

      if (result.data) {
        fillShippingForm(result.data);
      }

      shippingSuccess.textContent =
        "A szállítási adataidat sikeresen elmentettük.";
    } catch (error) {
      if (getToken() !== token) return;

      if (error.status === 401) {
        clearToken();
        clearProfile();
        showAuth();
        showTab("login");

        loginError.textContent =
          "A munkameneted lejárt. Kérjük, jelentkezz be újra.";
      } else {
        shippingError.textContent = error.message;
      }
    } finally {
      if (getToken() === token) {
        shippingSaveButton.disabled = false;
        shippingSaveButton.textContent = "Adatok mentése";
      }
    }
  });

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
    shippingSaveButton.disabled = true;

    try {
      await api("/logout", { method: "POST" });
    } catch {
    } finally {
      clearToken();
      clearProfile();

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
        clearProfile();
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