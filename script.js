const categories = window.G10_CATEGORIES || [];
const products = window.G10_PRODUCTS || [];
const tabs = document.querySelector(".category-tabs");
const list = document.querySelector("#productList");
const activeCategoryName = document.querySelector("#activeCategoryName");
const productCount = document.querySelector("#productCount");
const cartItems = document.querySelector("#cartItems");
const cartSummary = document.querySelector("#cartSummary");
const stickyCount = document.querySelector("#stickyCount");
const cartPanel = document.querySelector("#cartPanel");
const customerName = document.querySelector("#customerName");
const customerPhone = document.querySelector("#customerPhone");
const orderNote = document.querySelector("#orderNote");
const sendWhatsapp = document.querySelector("#sendWhatsapp");

let activeCategory = "all";
let cart = [];

function renderTabs() {
  const fragment = document.createDocumentFragment();

  categories.forEach((category) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = category.id === activeCategory ? "active" : "";
    button.dataset.category = category.id;
    button.innerHTML = `<strong>${category.label}</strong><span>${category.english}</span>`;
    fragment.appendChild(button);
  });

  tabs.replaceChildren(fragment);
}

function getVisibleProducts() {
  if (activeCategory === "all") {
    return products;
  }

  return products.filter((product) => product.category === activeCategory);
}

function renderProducts() {
  const visibleProducts = getVisibleProducts();
  const active = categories.find((category) => category.id === activeCategory);
  const fragment = document.createDocumentFragment();

  activeCategoryName.textContent = active ? active.label : "All";
  productCount.textContent = `${visibleProducts.length} items`;

  visibleProducts.forEach((product) => {
    const card = document.createElement("article");
    card.className = "product-card";
    card.dataset.id = product.id;
    card.innerHTML = `
      <img src="${product.image}" alt="${product.id}" loading="lazy" width="480" height="620">
      <div class="product-body">
        <div class="product-title">
          <h2>${product.name}</h2>
          <span>${product.id}</span>
        </div>
        <div class="product-meta">
          <span>${product.categoryEnglish}</span>
          <span>Wholesale</span>
        </div>
        <div class="product-controls">
          <label>
            Size
            <select data-size>
              ${product.sizes.map((size) => `<option value="${size}">${size}</option>`).join("")}
            </select>
          </label>
          <label>
            Qty
            <input data-qty type="number" min="${product.minQty}" value="${product.minQty}" inputmode="numeric">
          </label>
        </div>
        <button class="add-button" type="button" data-add="${product.id}">Add to Order</button>
      </div>
    `;
    fragment.appendChild(card);
  });

  list.replaceChildren(fragment);
}

function addToCart(productId) {
  const product = products.find((item) => item.id === productId);
  const card = document.querySelector(`[data-id="${productId}"]`);
  const size = card.querySelector("[data-size]").value;
  const qtyValue = Number(card.querySelector("[data-qty]").value);
  const qty = Number.isFinite(qtyValue) && qtyValue > 0 ? qtyValue : 1;
  const existing = cart.find((item) => item.id === product.id && item.size === size);

  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      category: product.categoryLabel,
      size,
      qty
    });
  }

  renderCart();
}

function removeCartItem(index) {
  cart.splice(index, 1);
  renderCart();
}

function getTotalQty() {
  return cart.reduce((total, item) => total + item.qty, 0);
}

function buildOrderText() {
  const lines = [
    "G-10 Wholesale Order",
    `Customer: ${customerName.value.trim() || "-"}`,
    `Phone: ${customerPhone.value.trim() || "-"}`,
    ""
  ];

  if (cart.length === 0) {
    lines.push("No products selected.");
  } else {
    cart.forEach((item, index) => {
      lines.push(`${index + 1}. ${item.id} | ${item.category} | Size ${item.size} | Qty ${item.qty}`);
    });
  }

  const note = orderNote.value.trim();
  if (note) {
    lines.push("", `Note: ${note}`);
  }

  return lines.join("\n");
}

function renderCart() {
  const totalQty = getTotalQty();
  cartSummary.textContent = `${cart.length} products · ${totalQty} pcs`;
  stickyCount.textContent = totalQty;

  if (cart.length === 0) {
    cartItems.innerHTML = '<p class="empty-cart">Select products above. အပေါ်မှ ပစ္စည်းရွေးပါ။</p>';
  } else {
    cartItems.innerHTML = cart
      .map(
        (item, index) => `
          <div class="cart-item">
            <div>
              <strong>${item.id}</strong>
              <span>${item.category} · Size ${item.size} · Qty ${item.qty}</span>
            </div>
            <button type="button" data-remove="${index}">Remove</button>
          </div>
        `
      )
      .join("");
  }

  sendWhatsapp.href = `https://wa.me/?text=${encodeURIComponent(buildOrderText())}`;
}

tabs.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) {
    return;
  }

  activeCategory = button.dataset.category;
  renderTabs();
  renderProducts();
});

list.addEventListener("click", (event) => {
  const button = event.target.closest("[data-add]");
  if (!button) {
    return;
  }

  addToCart(button.dataset.add);
  cartPanel.scrollIntoView({ behavior: "smooth", block: "start" });
});

cartItems.addEventListener("click", (event) => {
  const button = event.target.closest("[data-remove]");
  if (!button) {
    return;
  }

  removeCartItem(Number(button.dataset.remove));
});

document.querySelector("#clearFilter").addEventListener("click", () => {
  activeCategory = "all";
  renderTabs();
  renderProducts();
});

document.querySelector("#clearCart").addEventListener("click", () => {
  cart = [];
  renderCart();
});

document.querySelector("#openCart").addEventListener("click", () => {
  cartPanel.scrollIntoView({ behavior: "smooth", block: "start" });
});

document.querySelector("#copyOrder").addEventListener("click", async () => {
  const text = buildOrderText();

  try {
    await navigator.clipboard.writeText(text);
    document.querySelector("#copyOrder").textContent = "Copied";
    setTimeout(() => {
      document.querySelector("#copyOrder").textContent = "Copy Order Text";
    }, 1400);
  } catch {
    window.prompt("Copy order text", text);
  }
});

[customerName, customerPhone, orderNote].forEach((field) => {
  field.addEventListener("input", renderCart);
});

renderTabs();
renderProducts();
renderCart();
