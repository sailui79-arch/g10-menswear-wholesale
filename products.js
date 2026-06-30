const G10_CATEGORIES = [
  { id: "all", label: "အားလုံး", english: "All" },
  { id: "jeans", label: "ဂျင်းဘောင်းဘီ", english: "Jeans" },
  { id: "casual", label: "ပေါ့ပေါ့ပါးပါး ဘောင်းဘီ", english: "Casual Pants" },
  { id: "tshirt", label: "တီရှပ်", english: "T-Shirts" },
  { id: "polo", label: "ပိုလိုရှပ်", english: "POLO" },
  { id: "shirt", label: "ရှပ်အင်္ကျီ", english: "Shirts" },
  { id: "outerwear", label: "အပေါ်ထပ်အင်္ကျီ", english: "Jackets" },
  { id: "sweater", label: "ဆွယ်တာ", english: "Sweater" },
  { id: "winter", label: "ဆောင်းရာသီဝတ်စုံ", english: "Winter" },
  { id: "suit", label: "ဝတ်စုံ", english: "Suits" }
];

window.G10_CATEGORIES = G10_CATEGORIES;

const G10_CATEGORY_ROTATION = G10_CATEGORIES.filter((category) => category.id !== "all");

window.G10_PRODUCTS = Array.from({ length: 62 }, (_, index) => {
  const photoNumber = 22145 + index;
  const serial = String(index + 1).padStart(3, "0");
  const category = G10_CATEGORY_ROTATION[index % G10_CATEGORY_ROTATION.length];

  return {
    id: `G10-${serial}`,
    name: category.label,
    category: category.id,
    categoryLabel: category.label,
    categoryEnglish: category.english,
    image: `./products/2026-06-27/${photoNumber}.JPG`,
    sizes: ["M", "L", "XL", "2XL", "3XL"],
    minQty: 1
  };
});
