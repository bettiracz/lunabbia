document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("featured-products");
  if (!container) return;
  container.innerHTML = '<p class="loading-state">A botanikai kollekció betöltése…</p>';
  const products = await window.LunabbiaApi.getProducts();
  container.innerHTML = products .filter(product => product.featured) .slice(0, 4) .map(window.Lunabbia.productCard) .join("");
});
