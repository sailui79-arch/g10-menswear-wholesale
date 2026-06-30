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

window.G10_PRODUCTS = [];
