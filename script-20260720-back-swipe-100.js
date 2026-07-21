const categories = (window.G10_CATEGORIES || []).filter((category) => category.id !== "all");
const products = window.G10_PRODUCTS || [];
const PRODUCT_BATCH_SIZE = 24;
const ORDERS_API_URL =
  "https://script.google.com/macros/s/AKfycbwJcVoujktzyHrm_u-cBlejopXlvLteavvvB6p4G2ZJUCmyHADi8MPah3GiRXDr-3Wr/exec";
const ORDER_NOTIFICATION_EMAIL = "sailui79@gmail.com";
const CART_STORAGE_KEY = "g10-selected-products";
const IOS_DEVICE = /iPhone|iPad|iPod/i.test(navigator.userAgent);

if ("scrollRestoration" in window.history) {
  window.history.scrollRestoration = "manual";
}

const views = {
  home: document.querySelector("#homeView"),
  category: document.querySelector("#categoryView"),
  photo: document.querySelector("#photoView"),
  cart: document.querySelector("#cartView")
};

const pageKicker = document.querySelector("#pageKicker");
const pageTitle = document.querySelector("#pageTitle");
const backButton = document.querySelector("#backButton");
const categoryGrid = document.querySelector("#categoryGrid");
const categoryName = document.querySelector("#categoryName");
const categoryCount = document.querySelector("#categoryCount");
const productList = document.querySelector("#productList");
let originalPhoto = document.querySelector("#originalPhoto");
const photoStage = document.querySelector("#photoStage");
const photoSelectButton = document.querySelector("#photoSelectButton");
const headerCart = document.querySelector("#headerCart");
const headerCartCount = document.querySelector("#headerCartCount");
const stickyCount = document.querySelector("#stickyCount");
const cartItems = document.querySelector("#cartItems");
const cartSummary = document.querySelector("#cartSummary");
const customerName = document.querySelector("#customerName");
const customerPhone = document.querySelector("#customerPhone");
const orderNote = document.querySelector("#orderNote");
const submitOrder = document.querySelector("#submitOrder");
const orderStatus = document.querySelector("#orderStatus");

let currentView = "home";
let activeCategory = "";
let activeProductId = "";
let activeCategoryProducts = [];
let renderedProductCount = 0;
let categoryScroll = 0;
let touchStartX = 0;
let touchStartY = 0;
let touchStartTime = 0;
let touchSwipeLocked = false;
let touchEdgeBack = false;
let touchStartedOnControl = false;
let suppressNextClick = false;
let restoringHistory = false;
let ignoreNextPopstate = false;
let cartReturnView = "home";
let cartReturnScroll = 0;
let photoZoomed = false;
let photoTapMoved = false;
let photoScrollTimer = 0;
let photoScrollFrame = 0;
let photoScrollProgrammatic = false;
let cart = loadCart();

function getCategory(categoryId) {
  return categories.find((category) => category.id === categoryId);
}

function getCategoryProducts(categoryId) {
  return products.filter((product) => product.category === categoryId).reverse();
}

function loadCart() {
  try {
    const savedIds = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || "[]");
    return Array.isArray(savedIds)
      ? savedIds.filter((id) => products.some((product) => product.id === id))
      : [];
  } catch {
    return [];
  }
}

function saveCart() {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
}

function isSelected(productId) {
  return cart.includes(productId);
}

function getHistoryState(viewName = currentView) {
  return {
    g10: true,
    view: viewName,
    activeCategory,
    activeProductId,
    categoryScroll,
    renderedProductCount,
    cartReturnView,
    cartReturnScroll
  };
}

function getHistoryUrl(viewName) {
  const baseUrl = `${window.location.pathname}${window.location.search}`;
  if (viewName === "category" && activeCategory) {
    return `${baseUrl}#category/${encodeURIComponent(activeCategory)}`;
  }
  if (viewName === "photo" && activeProductId) {
    return `${baseUrl}#photo/${encodeURIComponent(activeProductId)}`;
  }
  if (viewName === "cart") {
    return `${baseUrl}#selected`;
  }
  return `${baseUrl}#home`;
}

function updateHistory(viewName, mode = "push") {
  if (restoringHistory || !window.history) {
    return;
  }

  const state = getHistoryState(viewName);
  const url = getHistoryUrl(viewName);
  if (mode === "replace") {
    window.history.replaceState(state, "", url);
  } else {
    window.history.pushState(state, "", url);
  }
}

function showView(viewName, options = {}) {
  currentView = viewName;
  document.body.classList.toggle("photo-mode", viewName === "photo");

  Object.entries(views).forEach(([name, element]) => {
    element.classList.toggle("active", name === viewName);
  });

  backButton.classList.toggle("visible", viewName !== "home");

  if (viewName === "home") {
    pageKicker.textContent = "MEN'S WHOLESALE";
    pageTitle.textContent = "G-10";
  } else if (viewName === "category") {
    const category = getCategory(activeCategory);
    pageKicker.textContent = "Products";
    pageTitle.textContent = category ? category.label : "Products";
  } else if (viewName === "photo") {
    pageKicker.textContent = "Original Photo";
    pageTitle.textContent = activeProductId;
  } else {
    pageKicker.textContent = "Selected Products";
    pageTitle.textContent = "My Selection";
  }

  if (options.history !== "skip") {
    updateHistory(viewName, options.history);
  }

  requestAnimationFrame(() => {
    window.scrollTo({
      top: options.restoreScroll ? options.scrollTop || 0 : 0,
      behavior: options.smooth ? "smooth" : "auto"
    });
  });
}

function createProductCard(product) {
  const selected = isSelected(product.id);
  return `
    <div class="product-card photo-only${selected ? " selected" : ""}" data-card="${product.id}">
      <button class="product-photo-button" type="button" data-product="${product.id}" aria-label="View ${product.id}">
        <img src="${product.image}" alt="${product.id}" loading="lazy" decoding="async" width="480" height="620">
      </button>
      <button class="select-product" type="button" data-select="${product.id}" aria-label="${selected ? "Remove" : "Select"} ${product.id}">${selected ? "✓" : "+"}</button>
    </div>
  `;
}

function appendProductBatch() {
  if (currentView !== "category" || renderedProductCount >= activeCategoryProducts.length) {
    return;
  }

  const nextProducts = activeCategoryProducts.slice(
    renderedProductCount,
    renderedProductCount + PRODUCT_BATCH_SIZE
  );

  productList.insertAdjacentHTML("beforeend", nextProducts.map(createProductCard).join(""));
  renderedProductCount += nextProducts.length;
}

function loadMoreProductsNearBottom() {
  if (currentView !== "category") {
    return;
  }

  const distanceToBottom =
    document.documentElement.scrollHeight - window.innerHeight - window.scrollY;

  if (distanceToBottom < 900) {
    appendProductBatch();
  }
}

function renderCategories() {
  const categoryCovers = {
    jeans: "./assets/category-covers-20260719/jeans.webp",
    tshirt: "./assets/category-covers-20260719/tshirt.webp",
    polo: "./assets/category-covers-20260719/polo.webp",
    shirt: "./assets/category-covers-20260719/shirt.webp",
    outerwear: "./assets/category-covers-20260719/outerwear.webp",
    sweater: "./assets/category-covers-20260719/sweater.webp",
    winter: "./assets/category-covers-20260719/winter.webp",
    suit: "./assets/category-covers-20260719/suit.webp"
  };

  categoryGrid.innerHTML = categories
    .map((category) => {
      const categoryProducts = getCategoryProducts(category.id);
      const cover = categoryProducts.length > 0 ? categoryCovers[category.id] || categoryProducts[0].image : "";

      return `
        <button class="category-card" type="button" data-category="${category.id}">
          ${
            cover
              ? `<img src="${cover}" alt="${category.english}" loading="lazy" decoding="async">`
              : '<div class="category-placeholder" aria-hidden="true">G10</div>'
          }
          <span>${category.label}</span>
          <small>${category.english} · ${categoryProducts.length}</small>
        </button>
      `;
    })
    .join("");
}

function openCategory(categoryId, options = {}) {
  const category = getCategory(categoryId);
  if (!category) {
    return;
  }

  activeCategory = categoryId;
  activeCategoryProducts = getCategoryProducts(categoryId);
  renderedProductCount = 0;

  categoryName.textContent = category.label;
  categoryCount.textContent = `${activeCategoryProducts.length} products`;
  productList.innerHTML = activeCategoryProducts.length
    ? ""
    : '<p class="empty-products">Photos are currently off shelf. ဓာတ်ပုံများ ယာယီဖြုတ်ထားပါသည်။</p>';

  showView("category", options);
  const focusIndex = options.focusProductId
    ? activeCategoryProducts.findIndex((product) => product.id === options.focusProductId)
    : -1;
  const targetCount = Math.max(
    PRODUCT_BATCH_SIZE,
    options.renderedCount || 0,
    focusIndex + 1
  );
  do {
    appendProductBatch();
  } while (
    renderedProductCount < targetCount &&
    renderedProductCount < activeCategoryProducts.length
  );

  if (focusIndex >= 0) {
    focusProductInList(options.focusProductId);
  }
}

function focusProductInList(productId) {
  requestAnimationFrame(() => {
    const productCard = productList.querySelector(`[data-card="${productId}"]`);
    if (!productCard) {
      return;
    }

    productCard.scrollIntoView({ block: "center", behavior: "auto" });
    productCard.classList.add("return-focus");
    setTimeout(() => productCard.classList.remove("return-focus"), 900);
  });
}

function updateSelectionControls(productId) {
  const selected = isSelected(productId);
  const card = productList.querySelector(`[data-card="${productId}"]`);
  const selectButton = card ? card.querySelector("[data-select]") : null;

  if (card) {
    card.classList.toggle("selected", selected);
  }
  if (selectButton) {
    selectButton.textContent = selected ? "✓" : "+";
    selectButton.setAttribute("aria-label", `${selected ? "Remove" : "Select"} ${productId}`);
  }

  if (activeProductId === productId) {
    photoSelectButton.classList.toggle("selected", selected);
    photoSelectButton.setAttribute("aria-label", selected ? "Remove selected product" : "Select product");
    photoSelectButton.setAttribute("title", selected ? "Remove selected product" : "Select product");
  }
}

function toggleSelection(productId) {
  if (!products.some((product) => product.id === productId)) {
    return;
  }

  cart = isSelected(productId)
    ? cart.filter((id) => id !== productId)
    : [...cart, productId];
  saveCart();
  updateSelectionControls(productId);
  renderCart();
}

function getSelectedProducts() {
  return cart
    .map((id) => products.find((product) => product.id === id))
    .filter(Boolean);
}

function openCart(options = {}) {
  if (currentView !== "cart") {
    cartReturnView = currentView;
    cartReturnScroll = window.scrollY;
  }
  renderCart();
  showView("cart", options);
}

function revealProductInList(productId) {
  const productIndex = activeCategoryProducts.findIndex(
    (product) => product.id === productId
  );

  if (productIndex < 0) {
    return;
  }

  while (
    renderedProductCount <= productIndex &&
    renderedProductCount < activeCategoryProducts.length
  ) {
    appendProductBatch();
  }

  focusProductInList(productId);
}

function openPhoto(productId, options = {}) {
  const product = products.find((item) => item.id === productId);
  if (!product) {
    return;
  }

  const openedFromCategory = currentView === "category";
  if (openedFromCategory) {
    categoryScroll = window.scrollY;
  }
  activeProductId = product.id;
  setPhotoZoom(false);
  renderNativePhotoGallery(product.id);
  updatePhotoViewer();
  updateSelectionControls(product.id);

  if (openedFromCategory && !restoringHistory && window.history) {
    window.history.replaceState(getHistoryState("category"), "", getHistoryUrl("category"));
  }

  showView("photo", options);
}

function renderNativePhotoGallery(productId) {
  const activeIndex = Math.max(
    0,
    activeCategoryProducts.findIndex((product) => product.id === productId)
  );

  photoStage.innerHTML = activeCategoryProducts
    .map((product, index) => {
      const priority = Math.abs(index - activeIndex) <= 1 ? "eager" : "lazy";
      return `<img class="original-photo" data-photo-id="${product.id}" src="${product.image}" alt="${product.id}" loading="${priority}" decoding="async" />`;
    })
    .join("");

  originalPhoto = photoStage.querySelector(`[data-photo-id="${productId}"]`);
  photoScrollProgrammatic = true;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      photoStage.scrollLeft = activeIndex * photoStage.clientWidth;
      photoScrollProgrammatic = false;
    });
  });
}

function syncNativePhotoFromPosition(commitHistory = false) {
  if (currentView !== "photo" || photoScrollProgrammatic || !photoStage.clientWidth) {
    return;
  }

  const index = Math.max(
    0,
    Math.min(
      activeCategoryProducts.length - 1,
      Math.round(photoStage.scrollLeft / photoStage.clientWidth)
    )
  );
  const product = activeCategoryProducts[index];
  if (!product) {
    return;
  }

  if (product.id !== activeProductId) {
    setPhotoZoom(false);
    activeProductId = product.id;
    originalPhoto = photoStage.querySelector(`[data-photo-id="${product.id}"]`);
    updateSelectionControls(product.id);
  }

  if (commitHistory) {
    updateHistory("photo", "replace");
  }
}

function finishNativePhotoScroll() {
  syncNativePhotoFromPosition(true);
}

function updatePhotoViewer() {
}

function setPhotoZoom(zoomed, event) {
  photoZoomed = zoomed;
  originalPhoto.classList.toggle("zoomed", zoomed);
  if (zoomed && event) {
    const rect = originalPhoto.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    originalPhoto.style.transformOrigin = `${x}% ${y}%`;
  } else {
    originalPhoto.style.transformOrigin = "50% 50%";
  }
}

function createOrderId() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return `G10-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

function getPublicImageUrl(imagePath) {
  return new URL(imagePath, window.location.href).href;
}

function buildOrderText() {
  const lines = [
    "G-10 Selected Products",
    `Customer: ${customerName.value.trim() || "-"}`,
    `Phone / WeChat: ${customerPhone.value.trim() || "-"}`,
    ""
  ];

  getSelectedProducts().forEach((product, index) => {
    lines.push(`${index + 1}. ${product.id} | ${product.categoryLabel}`);
    lines.push(getPublicImageUrl(product.image));
  });

  if (orderNote.value.trim()) {
    lines.push("", `Note: ${orderNote.value.trim()}`);
  }

  return lines.join("\n");
}

function buildOrderPayload() {
  const selectedProducts = getSelectedProducts();
  const items = selectedProducts.map((product) => ({
    id: product.id,
    category: product.categoryLabel,
    imageUrl: getPublicImageUrl(product.image)
  }));

  return {
    orderId: createOrderId(),
    notificationEmail: ORDER_NOTIFICATION_EMAIL,
    customerName: customerName.value.trim(),
    customerPhone: customerPhone.value.trim(),
    itemsText: items.map((item, index) => `${index + 1}. ${item.id} ${item.category}`).join("; "),
    imageUrls: items.map((item) => item.imageUrl),
    items,
    totalQty: items.length,
    note: orderNote.value.trim(),
    submittedAt: new Date().toISOString()
  };
}

function renderCart() {
  const selectedProducts = getSelectedProducts();
  const count = selectedProducts.length;
  headerCartCount.textContent = count;
  stickyCount.textContent = count;
  cartSummary.textContent = `${count} products`;

  if (count === 0) {
    cartItems.innerHTML = '<p class="empty-cart">Select product photos first. အရင်ဆုံး ပစ္စည်းဓာတ်ပုံရွေးပါ။</p>';
    return;
  }

  cartItems.innerHTML = selectedProducts
    .map(
      (product) => `
        <div class="cart-item">
          <div class="cart-product">
            <div class="cart-thumb">
              <img src="${product.image}" alt="${product.id}" loading="lazy" decoding="async">
            </div>
            <div>
              <strong>${product.id}</strong>
              <span>${product.categoryLabel}</span>
            </div>
          </div>
          <button type="button" data-remove="${product.id}">Remove</button>
        </div>
      `
    )
    .join("");
}

async function submitOrderToSheet() {
  if (cart.length === 0) {
    orderStatus.textContent = "请先选择商品照片 · Please select products first.";
    return;
  }

  if (!customerName.value.trim() || !customerPhone.value.trim()) {
    orderStatus.textContent = "请填写姓名和电话 / WeChat · Please enter name and contact.";
    return;
  }

  const payload = buildOrderPayload();
  submitOrder.disabled = true;
  submitOrder.textContent = "တင်နေသည်... · Submitting...";
  orderStatus.textContent = "";

  try {
    await fetch(ORDERS_API_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });

    orderStatus.textContent = `提交成功 · Order ${payload.orderId} submitted.`;
    submitOrder.textContent = "တင်ပြီးပါပြီ · Submitted";
  } catch {
    orderStatus.textContent = "提交失败，请复制选货单发到 WeChat。";
    submitOrder.textContent = "ရွေးထားသည်များ ပို့မည် · Submit";
  } finally {
    setTimeout(() => {
      submitOrder.disabled = false;
      submitOrder.textContent = "ရွေးထားသည်များ ပို့မည် · Submit";
    }, 1800);
  }
}

function showHome(options = {}) {
  activeCategory = "";
  activeProductId = "";
  showView("home", options);
}

function goBack() {
  if (currentView === "home") {
    return;
  }

  if (currentView === "photo" && activeCategory) {
    const viewedProductId = activeProductId;
    activeProductId = "";

    // Restore the category immediately so the customer does not have to wait
    // for the browser's asynchronous history event before seeing the page.
    showView("category", {
      history: "skip",
      restoreScroll: true,
      scrollTop: categoryScroll
    });
    revealProductInList(viewedProductId);

    if (window.history && window.history.state && window.history.state.g10) {
      ignoreNextPopstate = true;
      window.history.back();
    } else if (window.history) {
      window.history.replaceState(getHistoryState("category"), "", getHistoryUrl("category"));
    }
    return;
  }

  if (window.history && window.history.state && window.history.state.g10) {
    window.history.back();
  } else {
    showHome({ history: "replace" });
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

  const selectButton = event.target.closest("[data-select]");
  if (selectButton) {
    toggleSelection(selectButton.dataset.select);
    return;
  }

  const photoButton = event.target.closest("[data-product]");
  if (photoButton) {
    openPhoto(photoButton.dataset.product);
  }
});

backButton.addEventListener("click", goBack);
headerCart.addEventListener("click", openCart);
photoSelectButton.addEventListener("click", () => toggleSelection(activeProductId));
photoStage.addEventListener("click", (event) => {
  const tappedPhoto = event.target.closest(".original-photo");
  if (!tappedPhoto) {
    return;
  }
  if (suppressNextClick || photoTapMoved) {
    return;
  }
  goBack();
});
photoStage.addEventListener("scroll", () => {
  if (!photoScrollFrame) {
    photoScrollFrame = requestAnimationFrame(() => {
      photoScrollFrame = 0;
      syncNativePhotoFromPosition(false);
    });
  }
  clearTimeout(photoScrollTimer);
  photoScrollTimer = setTimeout(finishNativePhotoScroll, 60);
}, { passive: true });
photoStage.addEventListener("scrollend", finishNativePhotoScroll);
document.querySelector("#homeNav").addEventListener("click", () => showHome());
document.querySelector("#cartNav").addEventListener("click", openCart);
document.querySelector("#clearCart").addEventListener("click", () => {
  const removedIds = [...cart];
  cart = [];
  saveCart();
  removedIds.forEach(updateSelectionControls);
  renderCart();
});
submitOrder.addEventListener("click", submitOrderToSheet);
document.querySelector("#copyOrder").addEventListener("click", async (event) => {
  const button = event.currentTarget;
  try {
    await navigator.clipboard.writeText(buildOrderText());
    button.textContent = "Copied";
    setTimeout(() => {
      button.textContent = "Copy for WeChat";
    }, 1400);
  } catch {
    window.prompt("Copy selected products", buildOrderText());
  }
});

document.addEventListener(
  "touchstart",
  (event) => {
    if (currentView === "home") {
      return;
    }

    const touch = event.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    touchStartTime = Date.now();
    photoTapMoved = false;
    touchSwipeLocked = false;
    touchEdgeBack = false;
    touchStartedOnControl = Boolean(
      event.target.closest(
        "a, input, textarea, .back-button, .cart-icon, .select-product, .photo-select-button, .bottom-nav button, [data-remove], #clearCart, #submitOrder, #copyOrder"
      )
    );
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
    if (currentView === "photo" && (Math.abs(deltaX) > 10 || deltaY > 10)) {
      photoTapMoved = true;
    }
    const horizontalSwipe = Math.abs(deltaX) > 18 && Math.abs(deltaX) > deltaY * 1.15;

    // In WeChat, a right swipe beginning at the left edge closes the whole
    // webview. Capture it on internal pages and use it as the site's Back.
    const isEdgeBack =
      horizontalSwipe &&
      deltaX > 0 &&
      touchStartX <= 100 &&
      (!IOS_DEVICE || touchStartX > 44);
    if (isEdgeBack) {
      touchEdgeBack = true;
      touchSwipeLocked = true;
      event.preventDefault();
      return;
    }

    // The original-photo gallery uses the browser's native horizontal scroll.
    // Do not prevent it here; WeChat/Safari handles tracking and inertia itself.
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
    if (
      touchEdgeBack &&
      deltaX > 42 &&
      deltaY < 96 &&
      elapsed < 1200
    ) {
      suppressNextClick = true;
      goBack();
      setTimeout(() => {
        suppressNextClick = false;
      }, 250);
      return;
    }

  },
  { passive: true }
);

document.addEventListener(
  "touchcancel",
  () => {},
  { passive: true }
);

window.addEventListener("popstate", (event) => {
  const state = event.state;
  restoringHistory = true;

  if (ignoreNextPopstate) {
    ignoreNextPopstate = false;
    restoringHistory = false;
    return;
  }

  if (state && state.g10 && state.view === "category" && state.activeCategory) {
    const viewedProductId = currentView === "photo" ? activeProductId : state.activeProductId;
    categoryScroll = state.categoryScroll || 0;
    const canRestoreFromMemory =
      currentView === "photo" &&
      activeCategory === state.activeCategory &&
      activeCategoryProducts.length > 0 &&
      productList.childElementCount > 0;

    activeProductId = "";

    if (canRestoreFromMemory) {
      // The category page is still in the DOM behind the photo view. Reuse it so
      // images and rendered batches remain untouched, then return to the product
      // matching the last original photo the customer viewed.
      showView("category", {
        history: "skip",
        restoreScroll: true,
        scrollTop: categoryScroll
      });
      revealProductInList(viewedProductId);
    } else {
      // Rebuild only when this history entry cannot be recovered from memory,
      // for example after a full page reload.
      openCategory(state.activeCategory, {
        history: "skip",
        renderedCount: state.renderedProductCount,
        restoreScroll: true,
        scrollTop: categoryScroll,
        focusProductId: viewedProductId
      });
    }
  } else if (state && state.g10 && state.view === "photo" && state.activeProductId) {
    activeCategory = state.activeCategory || "";
    categoryScroll = state.categoryScroll || 0;
    openPhoto(state.activeProductId, { history: "skip" });
  } else if (state && state.g10 && state.view === "cart") {
    cartReturnView = state.cartReturnView || "home";
    cartReturnScroll = state.cartReturnScroll || 0;
    renderCart();
    showView("cart", { history: "skip" });
  } else {
    showHome({ history: "skip" });
  }

  restoringHistory = false;
});

window.addEventListener("scroll", loadMoreProductsNearBottom, { passive: true });

renderCategories();
renderCart();
showHome({ history: "replace" });
