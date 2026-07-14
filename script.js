const categories = (window.G10_CATEGORIES || []).filter((category) => category.id !== "all");
const products = window.G10_PRODUCTS || [];
const PRODUCT_BATCH_SIZE = 24;

if ("scrollRestoration" in window.history) {
  window.history.scrollRestoration = "manual";
}

const views = {
  home: document.querySelector("#homeView"),
  category: document.querySelector("#categoryView"),
  photo: document.querySelector("#photoView")
};

const pageKicker = document.querySelector("#pageKicker");
const pageTitle = document.querySelector("#pageTitle");
const backButton = document.querySelector("#backButton");
const categoryGrid = document.querySelector("#categoryGrid");
const categoryName = document.querySelector("#categoryName");
const categoryCount = document.querySelector("#categoryCount");
const productList = document.querySelector("#productList");
const originalPhoto = document.querySelector("#originalPhoto");

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
let touchStartedOnControl = false;
let suppressNextClick = false;
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
    activeCategory,
    activeProductId,
    categoryScroll,
    renderedProductCount
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

  backButton.classList.toggle("visible", viewName !== "home");

  if (viewName === "home") {
    pageKicker.textContent = "MEN'S WHOLESALE";
    pageTitle.textContent = "G-10";
  } else if (viewName === "category") {
    const category = getCategory(activeCategory);
    pageKicker.textContent = "Products";
    pageTitle.textContent = category ? category.label : "Products";
  } else {
    pageKicker.textContent = "Original Photo";
    pageTitle.textContent = activeProductId;
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
  return `
    <button class="product-card photo-only" type="button" data-product="${product.id}" aria-label="View ${product.id}">
      <img src="${product.image}" alt="${product.id}" loading="lazy" decoding="async" width="480" height="620">
    </button>
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
    requestAnimationFrame(() => {
      const productCard = productList.querySelector(`[data-product="${productId}"]`);
      if (!productCard) {
        return;
      }

      productCard.scrollIntoView({ block: "center", behavior: "auto" });
      productCard.classList.add("return-focus");
      setTimeout(() => productCard.classList.remove("return-focus"), 1400);
    });
  });
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
  originalPhoto.src = product.image;
  originalPhoto.alt = product.id;

  if (openedFromCategory && !restoringHistory && window.history) {
    window.history.replaceState(getHistoryState("category"), "", window.location.href);
  }

  showView("photo", options);
  preloadAdjacentPhotos();
}

function preloadAdjacentPhotos() {
  const currentIndex = activeCategoryProducts.findIndex(
    (product) => product.id === activeProductId
  );
  if (currentIndex < 0 || activeCategoryProducts.length < 2) {
    return;
  }

  [-1, 1].forEach((step) => {
    const nextIndex =
      (currentIndex + step + activeCategoryProducts.length) % activeCategoryProducts.length;
    const preloadImage = new Image();
    preloadImage.src = activeCategoryProducts[nextIndex].image;
  });
}

function openAdjacentPhoto(step) {
  const currentIndex = activeCategoryProducts.findIndex(
    (product) => product.id === activeProductId
  );
  if (currentIndex < 0 || activeCategoryProducts.length < 2) {
    return;
  }

  const nextIndex =
    (currentIndex + step + activeCategoryProducts.length) % activeCategoryProducts.length;
  openPhoto(activeCategoryProducts[nextIndex].id, { history: "replace" });
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

productList.addEventListener("click", (event) => {
  if (suppressNextClick) {
    event.preventDefault();
    suppressNextClick = false;
    return;
  }

  const button = event.target.closest("[data-product]");
  if (button) {
    openPhoto(button.dataset.product);
  }
});

backButton.addEventListener("click", goBack);

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
    touchSwipeLocked = false;
    touchStartedOnControl = Boolean(event.target.closest("a, .back-button"));
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
    const horizontalSwipe = Math.abs(deltaX) > 18 && Math.abs(deltaX) > deltaY * 1.15;

    if (
      horizontalSwipe &&
      (currentView === "photo" || (allowedStartArea && deltaX > 0))
    ) {
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

    if (
      currentView === "photo" &&
      touchSwipeLocked &&
      Math.abs(deltaX) > 42 &&
      deltaY < 96 &&
      elapsed < 1200
    ) {
      suppressNextClick = true;
      openAdjacentPhoto(deltaX < 0 ? 1 : -1);
      setTimeout(() => {
        suppressNextClick = false;
      }, 250);
      return;
    }

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

window.addEventListener("popstate", (event) => {
  const state = event.state;
  restoringHistory = true;

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
  } else {
    showHome({ history: "skip" });
  }

  restoringHistory = false;
});

window.addEventListener("scroll", loadMoreProductsNearBottom, { passive: true });

renderCategories();
showHome({ history: "replace" });
