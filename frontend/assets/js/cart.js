
document.addEventListener("DOMContentLoaded", async () => {
  const itemsContainer = document.getElementById("cart-items");
  const emptyState = document.getElementById("cart-empty");
  const summary = document.getElementById("cart-summary");
  const totalElement = document.getElementById("cart-total");
  const itemLabel = document.getElementById("cart-item-label");
  const form = document.getElementById("order-form");
  const formError = document.getElementById("form-error");
  const dialog = document.getElementById("success-dialog");
  const successTitle = document.getElementById("success-title");
  const successMessage = document.getElementById("success-message");
  const requestNumber = document.getElementById("request-number");
  const submitButton = form.querySelector('button[type="submit"]');
  const submitLabel = submitButton.querySelector(".submit-label");
  const cartNotice = document.getElementById("cart-notice");

  let submitting = false;
  let products = [];
  let productsLoaded = false;

  const pendingOrderStorageKey = "lunabbia_pending_order";

  async function fillCustomerDetails() {
    const token = localStorage.getItem("lunabbia_token");

    if (!token) return;

    try {
      const result = await window.LunabbiaApi.request("/me");

      if (localStorage.getItem("lunabbia_token") !== token) return;

      const user = result.data;

      if (!user) return;

      const fields = {
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address
      };

      Object.entries(fields).forEach(([name, value]) => {
        const field = form.elements.namedItem(name);

        if (field && !field.value.trim() && value) {
          field.value = value;
        }
      });
    } catch (error) {
      console.warn("A vásárlói adatok betöltése nem sikerült.");
    }
  }

  async function getOrderIdempotencyKey(payload) {
    const serialized = JSON.stringify(payload);
    const bytes = new TextEncoder().encode(serialized);
    const hash = await crypto.subtle.digest("SHA-256", bytes);

    const fingerprint = Array.from(new Uint8Array(hash))
      .map(byte => byte.toString(16).padStart(2, "0"))
      .join("");

    let pending = null;

    try {
      pending = JSON.parse(sessionStorage.getItem(pendingOrderStorageKey));
    } catch {
      sessionStorage.removeItem(pendingOrderStorageKey);
    }

    if (
      pending?.fingerprint === fingerprint &&
      pending?.key &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(pending.key)
    ) {
      return pending.key;
    }

    const key = crypto.randomUUID();

    sessionStorage.setItem(
      pendingOrderStorageKey,
      JSON.stringify({ fingerprint, key })
    );

    return key;
  }

  function showCartNotice(message, canRemoveUnavailable = false) {
    cartNotice.hidden = false;
    cartNotice.replaceChildren();

    const text = document.createElement("span");
    text.textContent = message;
    cartNotice.append(text);

    if (canRemoveUnavailable) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = "Nem elérhető tételek eltávolítása";

      button.addEventListener("click", () => {
        const validIds = new Set(products.map(product => product.id));
        const validItems = window.Lunabbia.readCart()
          .filter(item => validIds.has(item.productId));

        window.Lunabbia.writeCart(validItems);
        renderCart();
      });

      cartNotice.append(button);
    }
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[character]);
  }

  function renderCart() {
    const cart = window.Lunabbia.readCart();

    const lines = cart
      .map(item => ({
        ...item,
        product: products.find(product => product.id === item.productId)
      }))
      .filter(item => item.product);

    const missing = cart.filter(
      item => !products.some(product => product.id === item.productId)
    );

    if (!productsLoaded) {
      showCartNotice(
        "Nem sikerült betölteni a termékeket az API-ból. Ellenőrizd, hogy fut-e a Laravel szerver, majd frissítsd az oldalt."
      );
    } else if (missing.length) {
      showCartNotice(
        "A kosárban olyan korábbi termék is van, amely már nem szerepel a webshop aktuális terméklistájában.",
        true
      );
    } else {
      cartNotice.hidden = true;
      cartNotice.replaceChildren();
    }

    const totalQuantity = lines.reduce(
      (sum, item) => sum + item.quantity,
      0
    );

    const total = lines.reduce(
      (sum, item) => sum + item.product.price * item.quantity,
      0
    );

    itemsContainer.innerHTML = lines.map(item => `
      <article class="cart-item">
        <div class="cart-thumb product-image--${escapeHtml(item.product.theme)}">
          <span>${escapeHtml(item.product.symbol)}</span>
        </div>
        <div class="cart-item-info">
          <p>${escapeHtml(item.product.category)}</p>
          <h3>${escapeHtml(item.product.name)}</h3>
          <strong>${window.Lunabbia.formatPrice(item.product.price)}</strong>
        </div>
        <div class="quantity-control" aria-label="Mennyiség">
          <button type="button" data-action="decrease" data-id="${item.product.id}" aria-label="Mennyiség csökkentése">−</button>
          <span>${item.quantity}</span>
          <button type="button" data-action="increase" data-id="${item.product.id}" aria-label="Mennyiség növelése" ${item.quantity >= Math.min(99, item.product.stock) ? "disabled" : ""}>+</button>
        </div>
        <strong class="line-total">${window.Lunabbia.formatPrice(item.product.price * item.quantity)}</strong>
        <button type="button" class="remove-item" data-action="remove" data-id="${item.product.id}" aria-label="${escapeHtml(item.product.name)} törlése">×</button>
      </article>
    `).join("");

    itemLabel.textContent = `${totalQuantity} tétel`;
    totalElement.textContent = window.Lunabbia.formatPrice(total);

    emptyState.hidden = cart.length !== 0;
    summary.hidden = lines.length === 0;

    form.classList.toggle("is-disabled", lines.length === 0);

    submitButton.disabled =
      submitting ||
      lines.length === 0 ||
      missing.length > 0 ||
      !productsLoaded;
  }

  function showError(message) {
    formError.textContent = message;
    formError.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });
  }

  itemsContainer.addEventListener("click", event => {
    const button = event.target.closest("[data-action]");
    if (!button || submitting) return;

    const id = Number(button.dataset.id);
    const cart = window.Lunabbia.readCart();
    const item = cart.find(line => line.productId === id);
    const product = products.find(entry => entry.id === id);

    if (!item || !product) return;

    if (button.dataset.action === "increase") {
      item.quantity = Math.min(item.quantity + 1, product.stock, 99);
    }

    if (button.dataset.action === "decrease") {
      item.quantity -= 1;
    }

    const nextCart = button.dataset.action === "remove"
      ? cart.filter(line => line.productId !== id)
      : cart.filter(line => line.quantity > 0);

    window.Lunabbia.writeCart(nextCart);
    renderCart();
  });

  form.addEventListener("submit", async event => {
    event.preventDefault();

    if (submitting) return;

    formError.textContent = "";

    const cart = window.Lunabbia.readCart();

    if (!cart.length) {
      showError("A rendeléshez előbb tegyél terméket a kosárba.");
      return;
    }

    const unavailable = cart.find(item => {
      const product = products.find(
        entry => entry.id === item.productId
      );

      return (
        !product ||
        item.quantity > product.stock ||
        item.quantity > 99
      );
    });

    if (unavailable) {
      showError(
        "Egy termékből nincs elegendő készlet. Kérjük, ellenőrizd a kosarad."
      );
      return;
    }

    if (!form.checkValidity()) {
      showError(
        "Kérjük, töltsd ki a kötelező mezőket és ellenőrizd az e-mail-címet."
      );
      form.reportValidity();
      return;
    }

    const data = Object.fromEntries(new FormData(form).entries());

    const payload = {
      customer_name: data.name.trim(),
      email: data.email.trim(),
      phone: data.phone.trim() || null,
      address: data.address.trim(),
      message: data.message.trim() || null,
      payment_method: data.payment_method,
      items: cart.map(item => ({
        product_id: item.productId,
        quantity: item.quantity
      }))
    };

    submitting = true;
    submitButton.disabled = true;
    submitButton.classList.add("is-loading");
    submitLabel.textContent = "Rendelés feldolgozása…";

    try {
      const idempotencyKey = await getOrderIdempotencyKey(payload);

      const result = await window.LunabbiaApi.createOrder(
        payload,
        idempotencyKey
      );

      sessionStorage.removeItem(pendingOrderStorageKey);

      window.Lunabbia.writeCart([]);
      form.reset();

      products = await window.LunabbiaApi.getProducts()
        .catch(() => products);

      renderCart();

      successTitle.textContent = "Köszönjük a rendelésedet!";
      successMessage.textContent =
        "Rendelésedet rögzítettük. Fizetés a csomag átvételekor (utánvét).";

      requestNumber.textContent = result.data?.order_number
        ? `Rendelésszám: ${result.data.order_number}`
        : "";

      if (typeof dialog.showModal === "function") {
        dialog.showModal();
      } else {
        window.Lunabbia.showToast(
          "A rendelésed sikeresen megérkezett."
        );
      }
    } catch (error) {
      showError(
        error.message || "A rendelés leadása nem sikerült."
      );
    } finally {
      submitting = false;
      submitButton.classList.remove("is-loading");
      submitLabel.textContent = "Megrendelem";
      renderCart();
    }
  });

  dialog.querySelector(".dialog-close").addEventListener(
    "click",
    () => dialog.close()
  );

  fillCustomerDetails();

  try {
    products = await window.LunabbiaApi.getProducts();
    productsLoaded = true;
    renderCart();
  } catch (error) {
    showCartNotice(
      `A termékek betöltése nem sikerült: ${error.message}`
    );
    submitButton.disabled = true;
  }
});
