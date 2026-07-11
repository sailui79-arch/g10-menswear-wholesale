const categories = (window.G10_CATEGORIES || []).filter((category) => category.id !== "all");
const products = window.G10_PRODUCTS || [];
const PRODUCT_BATCH_SIZE = 24;

const views = {
  home: document.querySelector("#homeView"),
  category: document.querySelector("#categoryView")
};

const pageKicker = document.querySelector("#pageKicker");
const pageTitle = document.querySelector("#pageTitle");
const backButton = document.querySelector("#backButton");
const categoryGrid = document.querySelector("#categoryGrid");
const categoryName = document.querySelector("#categoryName");
const categoryCount = document.querySelector("#categoryCount");
const productList = document.querySelector("#productList");

let currentView = "home";
let activeCategory = "";
let activeCategoryProducts = [];
let renderedProductCount = 0;
let touchStartX = 0;
let touchStartY = 0;
let touchStartTime = 0;
let touchSwipeLocked = false;
let restoringHistory = false;

function getCategory(categoryId) {
  return categories.find((category) => category.id === categoryId);
}

function getCategoryProducts(categoryId) {
  return products.filter((product) => product.category === categoryId).reverse();
}

function getHistoryState(viewName = currentView) {
  return {
    g10: true,
    view: viewName,
    activeCategory
  };
}

function updateHistory(viewName, mode = "push") {
  if (restoringHistory || !window.history) {
    return;
  }

  const state = getHistoryState(viewName);
  if (mode === "replace") {
    window.history.replaceState(state, "", window.location.href);
  } else {
    window.history.pushState(state, "", window.location.href);
  }
}

function showView(viewName, options = {}) {
  currentView = viewName;

  Object.entries(views).forEach(([name, element]) => {
    element.classList.toggle("active", name === viewName);
  });

  backButton.classList.toggle("visible", viewName === "category");

  if (viewName === "home") {
    pageKicker.textContent = "MEN'S WHOLESALE";
    pageTitle.textContent = "G-10";
  } else {
    const category = getCategory(activeCategory);
    pageKicker.textContent = "Products";
    pageTitle.textContent = category ? category.label : "Products";
  }

  if (options.history !== "skip") {
    updateHistory(viewName, options.history);
  }

  window.scrollTo({ top: 0, behavior: options.smooth ? "smooth" : "auto" });
}

function createProductCard(product) {
  return `
    <div class="product-card photo-only" aria-label="${product.id}">
      <img src="${product.image}" alt="${product.id}" loading="lazy" decoding="async" width="480" height="620">
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
  categoryGrid.innerHTML = categories
    .map((category) => {
      const categoryProducts = getCategoryProducts(category.id);
      const cover = categoryProducts[0] ? categoryProducts[0].image : "";

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
  appendProductBatch();
}

function showHome(options = {}) {
  activeCategory = "";
  showView("home", options);
}

function goBack() {
  if (currentView !== "category") {
    return;
  }

  if (window.history && window.history.state && window.history.state.g10) {
    window.history.back();
  } else {
    showHome({ history: "skip" });
  }
}

categoryGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-category]");
  if (button) {
    openCategory(button.dataset.category);
  }
});

backButton.addEventListener("click", goBack);

document.addEventListener(
  "touchstart",
  (event) => {
    if (currentView !== "category") {
      return;
    }

    const touch = event.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    touchStartTime = Date.now();
    touchSwipeLocked = false;
  },
  { passive: true }
);

document.addEventListener(
  "touchmove",
  (event) => {
    if (currentView !== "category") {
      return;
    }

    const touch = event.touches[0];
    const deltaX = touch.clientX - touchStartX;
    const deltaY = Math.abs(touch.clientY - touchStartY);
    const allowedStartArea = touchStartX < Math.min(window.innerWidth * 0.82, 340);

    if (allowedStartArea && deltaX > 18 && deltaX > deltaY * 1.15) {
      touchSwipeLocked = true;
      event.preventDefault();
    }
  },
  { passive: false }
);

document.addEventListener(
  "touchend",
  (event) => {
    if (currentView !== "category") {
      return;
    }

    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - touchStartX;
    const deltaY = Math.abs(touch.clientY - touchStartY);
    const elapsed = Date.now() - touchStartTime;
    const allowedStartArea = touchStartX < Math.min(window.innerWidth * 0.82, 340);

    if (allowedStartArea && (touchSwipeLocked || deltaX > 42) && deltaY < 96 && elapsed < 1200) {
      goBack();
    }
  },
  { passive: true }
);

window.addEventListener("popstate", (event) => {
  const state = event.state;
  restoringHistory = true;

  if (state && state.g10 && state.view === "category" && state.activeCategory) {
    openCategory(state.activeCategory, { history: "skip" });
  } else {
    showHome({ history: "skip" });
  }

  restoringHistory = false;
});

window.addEventListener("scroll", loadMoreProductsNearBottom, { passive: true });

renderCategories();
showHome({ history: "replace" });
