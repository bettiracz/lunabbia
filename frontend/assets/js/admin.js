
(() => {
  const base = localStorage.getItem('lunabbia_api_url') || 'http://127.0.0.1:8000/api';
  let token = sessionStorage.getItem('lunabbia_admin_token') || '';
  let activeTab = sessionStorage.getItem('lunabbia_admin_tab') || 'products';
  let products = [], categories = [], orders = [], productPage = 1, orderPage = 1, productLast = 1, orderLast = 1;

  const $ = selector => document.querySelector(selector);

  const element = (tag, value) => {
    const node = document.createElement(tag);
    node.textContent = String(value ?? '');
    return node;
  };

  let noticeTimer;

  function notice(message, error = false) {
    const feedback = $('#feedback');
    clearTimeout(noticeTimer);
    feedback.textContent = message;
    feedback.classList.toggle('error', error);
    feedback.classList.toggle('visible', Boolean(message));

    if (message) {
      noticeTimer = setTimeout(() => feedback.classList.remove('visible'), 4500);
    }
  }

  async function api(path, method = 'GET', payload) {
    const response = await fetch(base + path, {
      method,
      headers: {
        Accept: 'application/json',
        ...(payload ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: 'Bearer ' + token } : {})
      },
      ...(payload ? { body: JSON.stringify(payload) } : {})
    });

    const data = response.status === 204
      ? {}
      : await response.json().catch(() => ({}));

    if (!response.ok) {
      const issue = data.errors && Object.values(data.errors).flat()[0];
      const error = new Error(issue || data.message || `HTTP ${response.status}`);
      error.status = response.status;
      throw error;
    }

    return data;
  }

  function failed(error) {
    notice(error.message, true);

    if (error.status === 401 || error.status === 403) {
      token = '';
      sessionStorage.removeItem('lunabbia_admin_token');
      showLogin();
    }
  }

  function showLogin() {
    $('#login-panel').hidden = false;
    $('#dashboard').hidden = true;
  }

  async function enter() {
    const result = await api('/me');

    if (result.data?.role !== 'admin') {
      throw new Error('Ez a fiók nem rendelkezik adminjogosultsággal.');
    }

    await selectTab(activeTab);
    await Promise.all([loadProducts(), loadCategories()]);

    $('#login-panel').hidden = true;
    $('#dashboard').hidden = false;
  }

  $('#login-form').addEventListener('submit', async event => {
    event.preventDefault();
    const form = new FormData(event.target);

    try {
      const result = await api('/login', 'POST', {
        email: form.get('email'),
        password: form.get('password')
      });

      token = result.data.token;
      await enter();
      sessionStorage.setItem('lunabbia_admin_token', token);
      event.target.reset();
      notice('Sikeres belépés.');
    } catch (error) {
      token = '';
      failed(error);
    }
  });

  $('#logout').addEventListener('click', async () => {
    try {
      await api('/logout', 'POST');
    } catch {
    }

    token = '';
    sessionStorage.removeItem('lunabbia_admin_token');
    showLogin();
    notice('Kijelentkeztél.');
  });

  async function selectTab(tabName) {
    const validTabs = ['products', 'categories', 'orders'];
    activeTab = validTabs.includes(tabName) ? tabName : 'products';

    sessionStorage.setItem('lunabbia_admin_tab', activeTab);

    document.querySelectorAll('[data-tab]').forEach(button => {
      button.classList.toggle('selected', button.dataset.tab === activeTab);
    });

    document.querySelectorAll('.tab').forEach(tab => {
      tab.hidden = tab.id !== activeTab;
    });

    if (activeTab === 'orders') {
      try {
        await loadOrders();
      } catch (error) {
        failed(error);
      }
    }
  }

  document.querySelectorAll('[data-tab]').forEach(button => {
    button.addEventListener('click', () => selectTab(button.dataset.tab));
  });

  async function loadProducts() {
    const result = await api('/admin/products?page=' + productPage);
    products = result.data || [];
    productLast = result.meta?.last_page || 1;

    $('#page-info').textContent = `${productPage} / ${productLast}`;

    const body = $('#products-body');
    body.replaceChildren();

    products.forEach(item => {
      const row = document.createElement('tr');

      [
        item.name,
        Number(item.price).toLocaleString('hu-HU') + ' Ft',
        item.stock,
        item.active ? 'Igen' : 'Nem'
      ].forEach(value => row.appendChild(element('td', value)));

      const actions = document.createElement('td');

      const edit = element('button', 'Szerkesztés');
      edit.onclick = () => editProduct(item);

      const del = element('button', 'Törlés');
      del.className = 'muted';
      del.onclick = () => deleteProduct(item);

      actions.append(edit, del);
      row.appendChild(actions);
      body.appendChild(row);
    });
  }

  async function loadCategories() {
    const result = await api('/admin/categories');
    categories = result.data || [];

    const body = $('#categories-body');
    body.replaceChildren();

    const select = $('#product-form select[name=category_id]');
    select.replaceChildren();

    categories.forEach(item => {
      const opt = element('option', item.name);
      opt.value = item.id;
      select.append(opt);

      const row = document.createElement('tr');

      [
        item.name,
        item.slug,
        item.products_count ?? 0
      ].forEach(value => row.appendChild(element('td', value)));

      const actions = document.createElement('td');

      const edit = element('button', 'Szerkesztés');
      edit.onclick = () => editCategory(item);

      const del = element('button', 'Törlés');
      del.className = 'muted';
      del.onclick = () => deleteCategory(item);

      actions.append(edit, del);
      row.append(actions);
      body.append(row);
    });
  }

  function editProduct(item) {
    const form = $('#product-form');
    form.reset();
    form.hidden = false;

    $('#product-form-title').textContent = item
      ? 'Termék szerkesztése'
      : 'Új termék';

    for (const field of form.elements) {
      if (!field.name) continue;

      if (field.type === 'checkbox') {
        field.checked = item
          ? Boolean(item[field.name])
          : field.name === 'active';
      } else if (field.name === 'id') {
        field.value = item?.id || '';
      } else if (item) {
        field.value = field.name === 'category_id'
          ? item.category?.id || ''
          : item[field.name] ?? '';
      }
    }

    form.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest'
    });
  }

  $('#add-product').onclick = () => editProduct(null);
  $('#cancel-product').onclick = () => $('#product-form').hidden = true;

  $('#product-form').addEventListener('submit', async event => {
    event.preventDefault();

    const form = event.target;
    const data = new FormData(form);
    const id = data.get('id');
    const payload = {};

    for (const name of [
      'name', 'slug', 'category_id', 'price', 'stock',
      'subtitle', 'description', 'image_url',
      'theme', 'symbol', 'badge'
    ]) {
      payload[name] = data.get(name) || null;
    }

    for (const key of ['category_id', 'price', 'stock']) {
      payload[key] = Number(payload[key]);
    }

    for (const key of ['active', 'featured']) {
      payload[key] = form.elements[key].checked;
    }

    try {
      await api(
        '/admin/products' + (id ? '/' + id : ''),
        id ? 'PUT' : 'POST',
        payload
      );

      form.hidden = true;
      await loadProducts();
      notice('A termék mentése sikerült.');
    } catch (error) {
      failed(error);
    }
  });

  async function deleteProduct(item) {
    if (!confirm(`Biztosan törlöd: ${item.name}?`)) return;

    try {
      await api('/admin/products/' + item.id, 'DELETE');
      await loadProducts();
      notice('Termék törölve.');
    } catch (error) {
      failed(error);
    }
  }

  function editCategory(item) {
    const form = $('#category-form');
    form.reset();
    form.hidden = false;

    form.elements.id.value = item?.id || '';
    form.elements.name.value = item?.name || '';
    form.elements.slug.value = item?.slug || '';
    form.elements.active.checked = item
      ? Boolean(item.active)
      : true;

    form.scrollIntoView({
      behavior: 'smooth',
      block: 'nearest'
    });
  }

  $('#add-category').onclick = () => editCategory(null);
  $('#cancel-category').onclick = () => $('#category-form').hidden = true;

  $('#category-form').addEventListener('submit', async event => {
    event.preventDefault();

    const form = event.target;
    const id = form.elements.id.value;

    try {
      await api(
        '/admin/categories' + (id ? '/' + id : ''),
        id ? 'PUT' : 'POST',
        {
          name: form.elements.name.value,
          slug: form.elements.slug.value,
          active: form.elements.active.checked
        }
      );

      form.hidden = true;
      await loadCategories();
      notice('Kategória mentve.');
    } catch (error) {
      failed(error);
    }
  });

  async function deleteCategory(item) {
    if (!confirm(`Biztosan törlöd: ${item.name}?`)) return;

    try {
      await api('/admin/categories/' + item.id, 'DELETE');
      await loadCategories();
      notice('Kategória törölve.');
    } catch (error) {
      failed(error);
    }
  }

  const statuses = {
    new: 'Új',
    processing: 'Feldolgozás alatt',
    shipped: 'Feladva',
    completed: 'Teljesítve',
    cancelled: 'Törölve'
  };

  function formatOrderDate(value) {
    if (!value) return '—';

    const match = String(value).match(
      /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/
    );

    if (!match) return '—';

    const [, year, month, day, hour, minute] = match;

    return `${year}. ${month}. ${day}. ${hour}:${minute}`;
  }

  async function loadOrders() {
    const result = await api('/admin/orders?page=' + orderPage);
    orders = result.data || [];
    orderLast = result.meta?.last_page || 1;

    $('#order-page-info').textContent = `${orderPage} / ${orderLast}`;

    const body = $('#orders-body');
    body.replaceChildren();

    orders.forEach(item => {
      const row = document.createElement('tr');

      [
        item.order_number,
        item.customer_name,
        formatOrderDate(item.created_at),
        Number(item.total).toLocaleString('hu-HU') + ' Ft'
      ].forEach(value => row.appendChild(element('td', value)));

      const status = document.createElement('td');
      const select = document.createElement('select');

      Object.entries(statuses).forEach(([key, label]) => {
        const option = element('option', label);
        option.value = key;
        select.append(option);
      });

      select.value = item.status;
      status.append(select);
      row.append(status);

      const actions = document.createElement('td');
      const save = element('button', 'Mentés');

      save.onclick = async () => {
        const previousLabel = save.textContent;
        save.disabled = true;
        save.textContent = 'Mentés...';

        try {
          await api('/admin/orders/' + item.id + '/status', 'PATCH', {
            status: select.value
          });

          await loadOrders();
          notice('Rendelési státusz mentve.');
        } catch (error) {
          save.textContent = 'Hiba';
          failed(error);
        } finally {
          save.disabled = false;

          if (save.isConnected && save.textContent !== 'Hiba') {
            save.textContent = previousLabel;
          }
        }
      };

      actions.append(save);
      row.append(actions);
      body.append(row);
    });
  }

  $('#prev-products').onclick = async () => {
    if (productPage > 1) {
      productPage--;

      try {
        await loadProducts();
      } catch (error) {
        failed(error);
      }
    }
  };

  $('#next-products').onclick = async () => {
    if (productPage < productLast) {
      productPage++;

      try {
        await loadProducts();
      } catch (error) {
        failed(error);
      }
    }
  };

  $('#prev-orders').onclick = async () => {
    if (orderPage > 1) {
      orderPage--;

      try {
        await loadOrders();
      } catch (error) {
        failed(error);
      }
    }
  };

  $('#next-orders').onclick = async () => {
    if (orderPage < orderLast) {
      orderPage++;

      try {
        await loadOrders();
      } catch (error) {
        failed(error);
      }
    }
  };

  if (token) {
    enter().catch(failed);
  } else {
    showLogin();
  }
})();
