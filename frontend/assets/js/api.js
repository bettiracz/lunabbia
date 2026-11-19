(function () {
  const API_BASE_URL = localStorage.getItem("lunabbia_api_url") || "http://127.0.0.1:8000/api";

  function normalizeProduct(product) {
    return {
      id: Number(product.id),
      name: product.name,
      slug: product.slug || "",
      subtitle: product.subtitle || "",
      description: product.description || "",
      category: product.category?.name || product.category || "Egyéb",
      categorySlug: product.category?.slug || "",
      price: Number(product.price),
      imageUrl: product.image_url || null,
      badge: product.badge || "",
      theme: product.theme || "milk",
      symbol: product.symbol || "☾",
      stock: Number(product.stock ?? 0),
      active: product.active !== false,
      featured: Boolean(product.featured)
    };
  }

  async function request(path, options = {}) {
    const controller = new AbortController();
    const timeout = window.setTimeout(
        () => controller.abort(),
        options.timeoutMs ?? 10000
    );
    const token = localStorage.getItem("lunabbia_token");
    const headers = {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    };

    try {
      const response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers,
        signal: controller.signal
      });
      const body = response.status === 204 ? null : await response.json().catch(() => ({}));

      if (!response.ok) {
        const validationMessage = body?.errors ? Object.values(body.errors).flat()[0] : null;
        const error = new Error(validationMessage || body?.message || "A kérés nem sikerült.");
        error.status = response.status;
        error.details = body;
        throw error;
      }

      return body;
    } catch (error) {
      if (error.name === "AbortError") {
        throw new Error("A szerver nem válaszolt időben. Ellenőrizd a rendelést, mielőtt újra próbálkozol.");
      }
      if (error instanceof TypeError) {
        throw new Error("A Laravel API nem érhető el. Ellenőrizd, hogy fut-e a backend.");
      }
      throw error;
    } finally {
      window.clearTimeout(timeout);
    }
  }

  async function getProducts() {
    const response = await request("/products");
    return (response.data || []).map(normalizeProduct);
  }

  function createOrder(payload, idempotencyKey) {
  return request("/orders", {
    method: "POST",
    headers: {
      "X-Idempotency-Key": idempotencyKey
    },
    body: JSON.stringify(payload),
    timeoutMs: 30000
  });
  }

  window.LunabbiaApi = {
    baseUrl: API_BASE_URL,
    request,
    getProducts,
    createOrder,
    normalizeProduct
  };
})();
