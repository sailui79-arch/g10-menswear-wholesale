const grid = document.querySelector("#productGrid");

function renderProducts(products) {
  const fragment = document.createDocumentFragment();

  products.forEach((product) => {
    const card = document.createElement("article");
    card.className = "product-card";
    card.innerHTML = `
      <img src="${product.image}" alt="${product.name}" loading="lazy" width="520" height="650">
      <div>
        <h3>${product.name}</h3>
        <p>${product.id} · ${product.category}</p>
        <p>${product.note}</p>
      </div>
    `;
    fragment.appendChild(card);
  });

  grid.replaceChildren(fragment);
}

renderProducts(window.G10_PRODUCTS || []);
