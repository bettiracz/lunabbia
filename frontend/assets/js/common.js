
(function () {
  const CART_KEY = "lunabbia_cart";
  const TOKEN_KEY = "lunabbia_token";
  const API_BASE_URL = localStorage.getItem("lunabbia_api_url") ||
    "http://127.0.0.1:8000/api";

  function readCart() {
    try {
      const stored = JSON.parse(localStorage.getItem(CART_KEY));

      if (!Array.isArray(stored)) return [];

      return stored
        .map(item => ({
          productId: Number(item.productId ?? item.product_id ?? item.id),
          quantity: Number(item.quantity)
        }))
        .filter(item =>
          Number.isSafeInteger(item.productId) &&
          item.productId > 0 &&
          Number.isSafeInteger(item.quantity) &&
          item.quantity > 0
        );
    } catch {
      return [];
    }
  }

  function writeCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    updateCartCount();
  }

  function updateCartCount() {
    const count = readCart().reduce(
      (sum, item) => sum + item.quantity,
      0
    );

    document.querySelectorAll(".cart-count").forEach(element => {
      element.textContent = count;
    });
  }

  function addToCart(productId) {
    const id = Number(productId);

    if (!Number.isSafeInteger(id) || id < 1) return;

    const cart = readCart();
    const existing = cart.find(item => item.productId === id);

    if (existing) {
      existing.quantity += 1;
    } else {
      cart.push({ productId: id, quantity: 1 });
    }

    writeCart(cart);
    showToast("A termék bekerült a kosárba.");
  }

  function formatPrice(value) {
    return new Intl.NumberFormat("hu-HU").format(value) + " Ft";
  }

  function productCard(product) {
    const badge = product.badge
      ? `<span class="product-badge">${product.badge}</span>`
      : "";

    return `
      <article class="product-card">
        <div class="product-image product-image--${product.theme}">
          ${badge}
          <span class="botanical botanical--left">❧</span>
          <div class="product-pack product-pack--${product.category === "Szappan" ? "soap" : "jar"}">
            <span class="product-symbol">${product.symbol}</span>
            <small>LUNABBIA</small>
            <em>${product.category}</em>
          </div>
          <span class="botanical botanical--right">❧</span>
        </div>
        <div class="product-content">
          <p class="product-category">${product.category}</p>
          <h3>${product.name}</h3>
          <p class="product-subtitle">${product.subtitle}</p>
          <div class="product-bottom">
            <strong>${formatPrice(product.price)}</strong>
            <button
              class="add-button"
              type="button"
              data-add-product="${product.id}"
              aria-label="${product.name} kosárba tétele"
            >
              Kosárba <span>+</span>
            </button>
          </div>
        </div>
      </article>`;
  }

  function showToast(message) {
    const toast = document.querySelector(".toast");

    if (!toast) return;

    toast.textContent = message;
    toast.classList.add("show");

    window.clearTimeout(showToast.timer);

    showToast.timer = window.setTimeout(
      () => toast.classList.remove("show"),
      2500
    );
  }

  function setAccountLabel(name = null) {
    const firstName = name
      ? String(name).trim().split(/\s+/).pop()
      : null;

    const label = firstName
      ? `ÜDV, ${firstName.toLocaleUpperCase("hu-HU")}!`
      : "BELÉPÉS / REGISZTRÁCIÓ";

    document.querySelectorAll(".account-link").forEach(link => {
      const text = link.querySelector(".account-link-label");

      if (text) {
        text.textContent = label;
      }

      link.setAttribute(
        "aria-label",
        firstName ? "Fiókom" : "Belépés vagy regisztráció"
      );

      link.title = firstName ? "Fiókom" : "Belépés / Regisztráció";
    });
  }

  async function updateAccountHeader() {
    const token = localStorage.getItem(TOKEN_KEY);

    if (!token) {
      setAccountLabel();
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/me`, {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`
        }
      });

      if (response.status === 401) {
        if (localStorage.getItem(TOKEN_KEY) === token) {
          localStorage.removeItem(TOKEN_KEY);
        }

        setAccountLabel();
        return;
      }

      if (!response.ok) {
        return;
      }

      const result = await response.json();

      if (localStorage.getItem(TOKEN_KEY) !== token) {
        return;
      }

      if (result.data?.name) {
        setAccountLabel(result.data.name);
      }
    } catch {
      // Átmeneti kapcsolati hiba esetén a fejléc változatlan marad.
    }
  }

  document.addEventListener("click", event => {
    const button = event.target.closest("[data-add-product]");

    if (button) {
      addToCart(Number(button.dataset.addProduct));
    }
  });

  document.addEventListener("DOMContentLoaded", () => {
    updateCartCount();
    updateAccountHeader();

    const toggle = document.querySelector(".nav-toggle");
    const nav = document.querySelector(".main-nav");

    if (toggle && nav) {
      toggle.addEventListener("click", () => {
        const open = nav.classList.toggle("open");

        toggle.setAttribute("aria-expanded", String(open));
        toggle.textContent = open ? "×" : "☰";
      });
    }

    document.querySelectorAll("[data-newsletter]").forEach(form => {
      form.addEventListener("submit", event => {
        event.preventDefault();

        form.querySelector("[data-newsletter-message]").textContent =
          "Köszönjük, feliratkozásodat rögzítettük.";

        form.reset();
      });
    });

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
        }
      });
    }, {
      threshold: 0.12
    });

    document.querySelectorAll(
      ".reveal, .section, .collection-card"
    ).forEach(element => observer.observe(element));
  });

  window.addEventListener("storage", event => {
    if (event.key === TOKEN_KEY) {
      updateAccountHeader();
    }
  });

  window.Lunabbia = {
    readCart,
    writeCart,
    updateCartCount,
    addToCart,
    formatPrice,
    productCard,
    showToast,
    updateAccountHeader,
    CART_KEY
  };
})();
