const categories = (window.G10_CATEGORIES || []).filter((category) => category.id !== "all");
const products = window.G10_PRODUCTS || [];
const ORDERS_API_URL =
  "https://script.google.com/macros/s/AKfycbwJcVoujktzyHrm_u-cBlejopXlvLteavvvB6p4G2ZJUCmyHADi8MPah3GiRXDr-3Wr/exec";

const views = {
  home: document.querySelector("#homeView"),
  category: document.querySelector("#categoryView"),
  detail: document.querySelector("#detailView"),
  cart: document.querySelector("#cartView")
};

const pageKicker = document.querySelector("#pageKicker");
const pageTitle = document.querySelector("#pageTitle");
const backButton = document.querySelector("#backButton");
const categoryGrid = document.querySelector("#categoryGrid");
const categoryName = document.querySelector("#categoryName");
const categoryCount = document.querySelector("#categoryCount");
const productList = document.querySelector("#productList");
const detailCard = document.querySelector("#detailCard");
const cartItems = document.querySelector("#cartItems");
const cartSummary = document.querySelector("#cartSummary");
const stickyCount = document.querySelector("#stickyCount");
const headerCartCount = document.querySelector("#headerCartCount");
const customerName = document.querySelector("#customerName");
const customerPhone = document.querySelector("#customerPhone");
const orderNote = document.querySelector("#orderNote");
const sendWhatsapp = document.querySelector("#sendWhatsapp");
const submitOrder = document.querySelector("#submitOrder");

let currentView = "home";
let activeCategory = "";
let activeProductId = "";
let cart = [];
let touchStartX = 0;
let touchStartY = 0;
let touchStartTime = 0;
let touchStartedOnControl = false;
let touchSwipeLocked = false;
let suppressNextClick = false;

function showView(viewName) {
  currentView = viewName;

  Object.entries(views).forEach(([name, element]) => {
    element.classList.toggle("active", name === viewName);
  });

  backButton.classList.toggle("visible", viewName !== "home");

  if (viewName === "home") {
    pageKicker.textContent = "MEN'S WHOLESALE";
    pageTitle.textContent = "G-10";
  }

  if (viewName === "category") {
    const category = getCategory(activeCategory);
    pageKicker.textContent = "Products";
    pageTitle.textContent = category ? category.label : "Products";
  }

  if (viewName === "detail") {
    pageKicker.textContent = "Product Detail";
    pageTitle.textContent = activeProductId || "Detail";
  }

  if (viewName === "cart") {
    pageKicker.textContent = "Send Order";
    pageTitle.textContent = "My Order";
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function goBack() {
  if (currentView === "detail") {
    openCategory(activeCategory);
    return;
  }

  if (currentView !== "home") {
    showView("home");
  }
}

function isSwipeBlockingElement(element) {
  return Boolean(
    element.closest(
      "a, input, select, textarea, .back-button, .cart-icon, .bottom-nav button, .add-button, [data-remove], #clearCart, #copyOrder"
    )
  );
}

function getCategory(categoryId) {
  return categories.find((category) => category.id === categoryId);
}

function getCategoryProducts(categoryId) {
  return products.filter((product) => product.category === categoryId);
}

function renderCategories() {
  categoryGrid.innerHTML = categories
    .map((category) => {
      const categoryProducts = getCategoryProducts(category.id);
      const cover = categoryProducts[0] ? categoryProducts[0].image : "";

      return `
        <button class="category-card" type="button" data-category="${category.id}">
          ${
            cover
              ? `<img src="${cover}" alt="${category.english}" loading="lazy">`
              : '<div class="category-placeholder" aria-hidden="true">G10</div>'
          }
          <span>${category.label}</span>
          <small>${category.english} · ${categoryProducts.length}</small>
        </button>
      `;
    })
    .join("");
}

function openCategory(categoryId) {
  activeCategory = categoryId;
  const category = getCategory(categoryId);
  const categoryProducts = getCategoryProducts(categoryId);

  categoryName.textContent = category.label;
  categoryCount.textContent = `${categoryProducts.length} products`;
  productList.innerHTML =
    categoryProducts.length === 0
      ? '<p class="empty-products">Photos are currently off shelf. ဓာတ်ပုံများ ယာယီဖြုတ်ထားပါသည်။</p>'
      : categoryProducts
          .map(
            (product) => `
        <button class="product-card photo-only" type="button" data-product="${product.id}" aria-label="${product.id}">
          <img src="${product.image}" alt="${product.id}" loading="lazy" width="480" height="620">
        </button>
      `
          )
          .join("");

  showView("category");
}

function openProduct(productId) {
  activeProductId = productId;
  const product = products.find((item) => item.id === productId);

  detailCard.innerHTML = `
    <img class="detail-image" src="${product.image}" alt="${product.id}">
    <div class="detail-body" data-id="${product.id}">
      <div class="detail-title">
        <div>
          <span>${product.categoryLabel}</span>
          <h2>${product.id}</h2>
        </div>
        <strong>${product.categoryEnglish}</strong>
      </div>
      <div class="detail-controls">
        <label>
          颜色
          <select data-color>
            <option value="1色">1色</option>
            <option value="2色">2色</option>
            <option value="3色">3色</option>
            <option value="4色">4色</option>
            <option value="5色">5色</option>
          </select>
        </label>
        <label>
          尺码
          <select data-size>
            ${product.sizes.map((size) => `<option value="${size}">${size}</option>`).join("")}
          </select>
        </label>
        <label>
          数量
          <input data-qty type="number" min="${product.minQty}" value="${product.minQty}" inputmode="numeric">
        </label>
      </div>
      <button class="add-button" type="button" data-add="${product.id}">Add to Order</button>
    </div>
  `;

  showView("detail");
}

function addToCart(productId) {
  const product = products.find((item) => item.id === productId);
  const detail = detailCard.querySelector(`[data-id="${productId}"]`);
  const size = detail.querySelector("[data-size]").value;
  const color = detail.querySelector("[data-color]").value;
  const qtyValue = Number(detail.querySelector("[data-qty]").value);
  const qty = Number.isFinite(qtyValue) && qtyValue > 0 ? qtyValue : 1;
  const existing = cart.find((item) => item.id === product.id && item.size === size && item.color === color);

  if (existing) {
    existing.qty += qty;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      category: product.categoryLabel,
      size,
      color,
      qty
    });
  }

  renderCart();
  showView("cart");
}

function removeCartItem(index) {
  cart.splice(index, 1);
  renderCart();
}

function getTotalQty() {
  return cart.reduce((total, item) => total + item.qty, 0);
}

function createOrderId() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return [
    "G10",
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    "-",
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds())
  ].join("");
}

function buildItemsText() {
  return cart
    .map((item, index) => `${index + 1}. ${item.id} ${item.category} 颜色${item.color} 尺码${item.size} 数量${item.qty}`)
    .join("; ");
}

function buildOrderPayload() {
  return {
    orderId: createOrderId(),
    customerName: customerName.value.trim(),
    customerPhone: customerPhone.value.trim(),
    itemsText: buildItemsText(),
    totalQty: getTotalQty(),
    note: orderNote.value.trim()
  };
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
      lines.push(`${index + 1}. ${item.id} | ${item.category} | Size ${item.size} | Color ${item.color} | Qty ${item.qty}`);
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
  headerCartCount.textContent = totalQty;

  if (cart.length === 0) {
    cartItems.innerHTML = '<p class="empty-cart">Select products first. အရင်ဆုံး ပစ္စည်းရွေးပါ။</p>';
  } else {
    cartItems.innerHTML = cart
      .map(
        (item, index) => `
          <div class="cart-item">
            <div>
              <strong>${item.id}</strong>
              <span>${item.category} · Size ${item.size} · Color ${item.color} · Qty ${item.qty}</span>
            </div>
            <button type="button" data-remove="${index}">Remove</button>
          </div>
        `
      )
      .join("");
  }

  sendWhatsapp.href = `https://wa.me/?text=${encodeURIComponent(buildOrderText())}`;
}

async function submitOrderToSheet() {
  if (cart.length === 0) {
    alert("请先选择商品 / Please select products first.");
    return;
  }

  if (!customerName.value.trim() || !customerPhone.value.trim()) {
    alert("请填写客户姓名和电话 / Please enter name and phone.");
    showView("cart");
    return;
  }

  const payload = buildOrderPayload();
  submitOrder.disabled = true;
  submitOrder.textContent = "Submitting...";

  try {
    await fetch(ORDERS_API_URL, {
      method: "POST",
      mode: "no-cors",
      headers: {
        "Content-Type": "text/plain;charset=utf-8"
      },
      body: JSON.stringify(payload)
    });

    submitOrder.textContent = "Submitted";
    alert("订单已提交 / Order submitted.");
  } catch {
    submitOrder.textContent = "Submit Order";
    alert("提交失败，请复制订单发给我们 / Submit failed, please copy order text.");
  } finally {
    setTimeout(() => {
      submitOrder.disabled = false;
      submitOrder.textContent = "Submit Order";
    }, 1800);
  }
}

categoryGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-category]");
  if (button) {
    openCategory(button.dataset.category);
  }
});

productList.addEventListener("click", (event) => {
  if (suppressNextClick) {
    event.preventDefault();
    suppressNextClick = false;
    return;
  }

  const button = event.target.closest("[data-product]");
  if (button) {
    openProduct(button.dataset.product);
  }
});

detailCard.addEventListener("click", (event) => {
  const button = event.target.closest("[data-add]");
  if (button) {
    addToCart(button.dataset.add);
  }
});

cartItems.addEventListener("click", (event) => {
  const button = event.target.closest("[data-remove]");
  if (button) {
    removeCartItem(Number(button.dataset.remove));
  }
});

backButton.addEventListener("click", goBack);

document.addEventListener(
  "touchstart",
  (event) => {
    const touch = event.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    touchStartTime = Date.now();
    touchStartedOnControl = isSwipeBlockingElement(event.target);
    touchSwipeLocked = false;
  },
  { passive: true }
);

document.addEventListener(
  "touchmove",
  (event) => {
    if (currentView === "home" || touchStartedOnControl) {
      return;
    }

    const touch = event.touches[0];
    const deltaX = touch.clientX - touchStartX;
    const deltaY = Math.abs(touch.clientY - touchStartY);
    const allowedStartArea = touchStartX < Math.min(window.innerWidth * 0.82, 340);

    if (allowedStartArea && deltaX > 18 && Math.abs(deltaX) > deltaY * 1.15) {
      touchSwipeLocked = true;
      event.preventDefault();
    }
  },
  { passive: false }
);

document.addEventListener(
  "touchend",
  (event) => {
    if (currentView === "home" || touchStartedOnControl) {
      return;
    }

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - touchStartX;
    const deltaY = Math.abs(touch.clientY - touchStartY);
    const elapsed = Date.now() - touchStartTime;
    const allowedStartArea = touchStartX < Math.min(window.innerWidth * 0.82, 340);

    if (allowedStartArea && (touchSwipeLocked || deltaX > 42) && deltaY < 96 && elapsed < 1200) {
      suppressNextClick = true;
      goBack();
      setTimeout(() => {
        suppressNextClick = false;
      }, 350);
    }
  },
  { passive: true }
);

document.querySelector("#homeNav").addEventListener("click", () => showView("home"));
document.querySelector("#cartNav").addEventListener("click", () => showView("cart"));
document.querySelector("#headerCart").addEventListener("click", () => showView("cart"));
document.querySelector("#clearCart").addEventListener("click", () => {
  cart = [];
  renderCart();
});
submitOrder.addEventListener("click", submitOrderToSheet);

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

renderCategories();
renderCart();
showView("home");
