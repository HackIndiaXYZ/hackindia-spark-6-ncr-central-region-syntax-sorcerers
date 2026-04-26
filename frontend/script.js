// ─── Circuify Frontend API Layer ─────────────────────────────
const API = '/api';  // relative — works with express static serving

function getToken() { return localStorage.getItem('circuify_token'); }
function getUser()  { return JSON.parse(localStorage.getItem('circuify_user') || 'null'); }

function saveAuth(token, user) {
  localStorage.setItem('circuify_token', token);
  localStorage.setItem('circuify_user', JSON.stringify(user));
}

function logout() {
  localStorage.removeItem('circuify_token');
  localStorage.removeItem('circuify_user');
  localStorage.removeItem('circuify_cart');
  window.location.href = 'index.html';
}

async function apiFetch(endpoint, options = {}) {
  const token   = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res  = await fetch(`${API}${endpoint}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}

// ─── Auth ─────────────────────────────────────────────────────
async function apiLogin(email, password) {
  const data = await apiFetch('/auth/login', {
    method: 'POST', body: JSON.stringify({ email, password })
  });
  saveAuth(data.token, data.user);
  return data;
}

async function apiSignup(name, email, password) {
  const data = await apiFetch('/auth/signup', {
    method: 'POST', body: JSON.stringify({ name, email, password })
  });
  saveAuth(data.token, data.user);
  return data;
}

// ─── Listings ─────────────────────────────────────────────────
async function getListings(filters = {}) {
  const q = new URLSearchParams(filters).toString();
  return apiFetch(`/listings${q ? '?' + q : ''}`);
}
async function getMyListings() { return apiFetch('/listings/my'); }
async function createListing(data) {
  return apiFetch('/listings', { method: 'POST', body: JSON.stringify(data) });
}
async function deleteListing(id) {
  return apiFetch(`/listings/${id}`, { method: 'DELETE' });
}

// ─── Messages ─────────────────────────────────────────────────
async function sendOwl(listing_id, message) {
  return apiFetch('/messages', { method: 'POST', body: JSON.stringify({ listing_id, message }) });
}
async function getInbox() { return apiFetch('/messages/inbox'); }

// ─── Orders ───────────────────────────────────────────────────
async function placeOrder(payload) {
  return apiFetch('/orders', { method: 'POST', body: JSON.stringify(payload) });
}

// ─── Cart helpers ─────────────────────────────────────────────
function getCart() { return JSON.parse(localStorage.getItem('circuify_cart') || '[]'); }
function saveCart(cart) { localStorage.setItem('circuify_cart', JSON.stringify(cart)); }

function addToCart(item) {
  const cart = getCart();
  if (!cart.find(i => i.id === item.id)) {
    cart.push(item);
    saveCart(cart);
  }
}

// ─── Render helpers ───────────────────────────────────────────
function renderListings(listings, gridId) {
  const grid = document.getElementById(gridId);
  if (!listings.length) {
    grid.innerHTML = '<p style="color:#9CA3AF">No listings found.</p>';
    return;
  }
  grid.innerHTML = listings.map(l => `
    <div class="listing-card">
      <span class="listing-tag">${l.category}</span>
      <h3>${l.title}</h3>
      <p style="color:#9CA3AF;font-size:0.875rem">${l.description || ''}</p>
      <ul class="details-list">
        <li>📍 ${l.location || 'Unknown'}</li>
        <li>⚖️ ${l.quantity} ${l.unit}</li>
        <li>🧙 ${l.seller_name}</li>
      </ul>
      <div class="price-row">
        <span>${l.price} Galleons</span>
        <div style="display:flex;gap:0.5rem">
          <button class="btn-secondary" style="padding:0.5rem;font-size:0.8rem"
            onclick="handleAddToCart(${l.id},'${l.title.replace(/'/g,"\\'")}',${l.price})">
            🛒 Add
          </button>
          <button class="btn-primary" style="padding:0.5rem;font-size:0.8rem"
            onclick="handleOwl(${l.id})">🦉 Owl</button>
        </div>
      </div>
    </div>`).join('');
}

function renderMyListings(listings) {
  const el = document.getElementById('my-listings-container');
  if (!listings.length) {
    el.innerHTML = '<p style="color:#9CA3AF">No listings yet. Create one!</p>';
    return;
  }
  el.innerHTML = listings.map(l => `
    <div class="data-row">
      <div>
        <strong>${l.title}</strong>
        <p style="font-size:0.875rem;color:#9CA3AF">
          ${l.category} • ${l.quantity} ${l.unit} • ${l.price} Galleons
        </p>
      </div>
      <div style="display:flex;gap:0.5rem;align-items:center">
        <span class="status-badge">${l.status}</span>
        <button onclick="handleDelete(${l.id})"
          style="background:#fee2e2;color:#991b1b;border:none;border-radius:0.25rem;
                 padding:0.25rem 0.6rem;cursor:pointer;font-size:0.8rem">
          Remove
        </button>
      </div>
    </div>`).join('');
}

function renderInbox(messages) {
  const el = document.getElementById('inbox-container');
  if (!messages.length) {
    el.innerHTML = '<p style="color:#9CA3AF">No owls received yet.</p>';
    return;
  }
  el.innerHTML = messages.map(m => `
    <div class="data-row" style="flex-direction:column;align-items:flex-start;gap:0.25rem;">
      <strong>${m.sender_name}</strong>
      <span style="font-size:0.8rem;color:#9CA3AF">Re: ${m.listing_title}</span>
      <p style="font-size:0.875rem;margin-top:0.25rem">${m.message}</p>
      <span style="font-size:0.75rem;color:#6B7280">
        ${new Date(m.created_at).toLocaleString()}
      </span>
    </div>`).join('');
}

// ─── LOGIN PAGE ───────────────────────────────────────────────
if (document.getElementById('login-form')) {
  document.getElementById('login-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const errEl = document.getElementById('error-msg');
    errEl.style.display = 'none';
    try {
      await apiLogin(
        document.getElementById('email').value,
        document.getElementById('password').value
      );
      window.location.href = 'role.html';
    } catch(err) {
      errEl.textContent = err.message;
      errEl.style.display = 'block';
    }
  });
}

// ─── SIGNUP PAGE ──────────────────────────────────────────────
if (document.getElementById('signup-form')) {
  document.getElementById('signup-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const errEl = document.getElementById('error-msg');
    errEl.style.display = 'none';
    try {
      await apiSignup(
        document.getElementById('name').value,
        document.getElementById('email').value,
        document.getElementById('password').value
      );
      window.location.href = 'role.html';
    } catch(err) {
      errEl.textContent = err.message;
      errEl.style.display = 'block';
    }
  });
}

// ─── BUYER PAGE ───────────────────────────────────────────────
if (document.getElementById('listings-grid')) {
  const user = getUser();
  if (user) {
    const el = document.getElementById('buyer-username');
    if (el) el.textContent = `👋 ${user.name}`;
  }

  // Cart badge
  updateCartBadge();

  getListings()
    .then(({ listings }) => renderListings(listings, 'listings-grid'))
    .catch(() => {
      document.getElementById('listings-grid').innerHTML =
        '<p style="color:red">Failed to load listings. Is the server running?</p>';
    });

  document.getElementById('filter-btn').addEventListener('click', async () => {
    const filters = {};
    const cat = document.getElementById('filter-category').value;
    const qty = document.getElementById('filter-qty').value;
    const loc = document.getElementById('filter-location').value;
    if (cat) filters.category    = cat;
    if (qty) filters.min_quantity = qty;
    if (loc) filters.location    = loc;
    try {
      const { listings } = await getListings(filters);
      renderListings(listings, 'listings-grid');
    } catch(err) { alert(err.message); }
  });
}

function updateCartBadge() {
  const badge = document.getElementById('cart-badge');
  if (!badge) return;
  const count = getCart().length;
  badge.textContent = count;
  badge.style.display = count ? 'inline' : 'none';
}

// Add to cart handler
function handleAddToCart(id, name, price) {
  if (!getToken()) {
    alert('Please login first to add items!');
    window.location.href = 'login.html';
    return;
  }
  addToCart({ id, name, price });
  updateCartBadge();
  alert(`🛒 "${name}" added to your vault!`);
}

// Send Owl handler
async function handleOwl(listingId) {
  if (!getToken()) {
    alert('Please login first!');
    window.location.href = 'login.html';
    return;
  }
  const message = prompt('✉️ Write your Owl message to the seller:');
  if (!message) return;
  try {
    await sendOwl(listingId, message);
    alert('🦉 Owl sent successfully!');
  } catch(err) { alert('Failed: ' + err.message); }
}

// ─── SELLER PAGE ──────────────────────────────────────────────
if (document.getElementById('my-listings-container')) {
  const user = getUser();
  if (user) {
    const el = document.getElementById('seller-username');
    if (el) el.textContent = `👋 ${user.name}`;
  }

  async function loadSellerData() {
    try {
      const { listings } = await getMyListings();
      renderMyListings(listings);
      document.getElementById('kpi-total').textContent  = listings.length;
      document.getElementById('kpi-active').textContent = listings.filter(l => l.status === 'active').length;
      const totalQty = listings.reduce((s, l) => s + Number(l.quantity), 0);
      document.getElementById('kpi-qty').textContent = totalQty;
    } catch(err) {
      document.getElementById('my-listings-container').innerHTML =
        '<p style="color:red">Please login first.</p>';
    }

    try {
      const { messages } = await getInbox();
      renderInbox(messages);
    } catch(err) {
      document.getElementById('inbox-container').innerHTML =
        '<p style="color:#9CA3AF">Could not load inbox.</p>';
    }
  }

  loadSellerData();

  document.getElementById('new-listing-btn').addEventListener('click', () => {
    document.getElementById('listing-modal').classList.add('open');
  });
}

function closeModal() {
  document.getElementById('listing-modal').classList.remove('open');
  document.getElementById('modal-error').style.display = 'none';
}

async function submitListing() {
  const errEl = document.getElementById('modal-error');
  errEl.style.display = 'none';
  const data = {
    title:       document.getElementById('m-title').value,
    category:    document.getElementById('m-category').value,
    description: document.getElementById('m-desc').value,
    quantity:    document.getElementById('m-qty').value,
    unit:        document.getElementById('m-unit').value || 'Cauldrons',
    price:       document.getElementById('m-price').value,
    location:    document.getElementById('m-location').value,
  };
  if (!data.title || !data.quantity || !data.price) {
    errEl.textContent = 'Title, Quantity and Price are required.';
    errEl.style.display = 'block';
    return;
  }
  try {
    await createListing(data);
    closeModal();
    const { listings } = await getMyListings();
    renderMyListings(listings);
    document.getElementById('kpi-total').textContent  = listings.length;
    document.getElementById('kpi-active').textContent = listings.filter(l => l.status === 'active').length;
    alert('✅ Listing created!');
  } catch(err) {
    errEl.textContent = err.message;
    errEl.style.display = 'block';
  }
}

async function handleDelete(id) {
  if (!confirm('Remove this listing?')) return;
  try {
    await deleteListing(id);
    const { listings } = await getMyListings();
    renderMyListings(listings);
  } catch(err) { alert(err.message); }
}

// ─── CHECKOUT PAGE ────────────────────────────────────────────
if (document.getElementById('checkout-form')) {
  document.getElementById('checkout-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    if (!getToken()) {
      alert('Please login to complete your order!');
      window.location.href = 'login.html';
      return;
    }

    const cart = getCart();
    if (!cart.length) {
      alert('Your vault is empty!');
      return;
    }

    const delivery_addr = document.getElementById('delivery-addr').value;
    const vault_number  = document.getElementById('vault-number').value;
    const signature     = document.getElementById('signature').value;
    const total         = cart.reduce((s, i) => s + i.price, 0);

    try {
      // Place one order per cart item
      for (const item of cart) {
        await placeOrder({
          listing_id:   item.id,
          delivery_addr,
          vault_number,
          signature,
          total_price:  item.price
        });
      }
      alert('🎉 Contract Sealed! Materials will be delivered via Owl Post. Total: ' + total + ' Galleons');
      localStorage.removeItem('circuify_cart');
      window.location.href = 'buyer.html';
    } catch(err) {
      alert('Order failed: ' + err.message);
    }
  });
}
