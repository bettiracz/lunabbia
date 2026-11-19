document.addEventListener("DOMContentLoaded", async () => {
  const grid = document.getElementById("shop-products");
  const count = document.getElementById("result-count");
  const empty = document.getElementById("empty-products");
  const search = document.getElementById("product-search");
  const sort = document.getElementById("sort-products");
  const filterContainer = document.getElementById("category-filters");
  grid.innerHTML = '<p class="loading-state">A termékek betöltése…</p>';
  const products = await window.LunabbiaApi.getProducts();
  const categories = ["Mind", ...new Set(products.map(product => product.category))];
  const requestedCategory = new URLSearchParams(window.location.search).get("category");
  let activeCategory = categories.includes(requestedCategory) ? requestedCategory : "Mind";
  filterContainer.innerHTML = categories.map(category => `<button type="button" class="category-button${category === activeCategory ? " active" : ""}" data-category="${category}"><span>${category}</span><small>${category === "Mind" ? products.length : products.filter(product => product.category === category).length}</small></button>`).join("");
  function render() {
    const query = search.value.trim().toLocaleLowerCase("hu-HU");
    let visible = products.filter(product => {
      const matchesCategory = activeCategory === "Mind" || product.category === activeCategory;
      const haystack = `${product.name} ${product.subtitle} ${product.category}`.toLocaleLowerCase("hu-HU");
      return matchesCategory && haystack.includes(query);
    });
    if (sort.value === "price-asc") visible.sort((a, b) => a.price - b.price);
    if (sort.value === "price-desc") visible.sort((a, b) => b.price - a.price);
    if (sort.value === "name") visible.sort((a, b) => a.name.localeCompare(b.name, "hu"));
    grid.innerHTML = visible.map(window.Lunabbia.productCard).join("");
    count.textContent = visible.length;
    empty.hidden = visible.length !== 0;
  }
  filterContainer.addEventListener("click", event => {
    const button = event.target.closest("[data-category]");
    if (!button) return;
    activeCategory = button.dataset.category;
    filterContainer.querySelectorAll(".category-button").forEach(item => item.classList.toggle("active", item === button));
    render();
  });
  search.addEventListener("input", render);
  sort.addEventListener("change", render);
  render();
});
