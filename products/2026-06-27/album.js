window.G10_ALBUM_PRODUCTS = Array.from({ length: 62 }, (_, index) => {
  const number = 22145 + index;
  const serial = String(index + 1).padStart(3, "0");

  return {
    id: `G10-0627-${serial}`,
    name: "T-Shirt · တီရှပ်",
    category: "T-Shirts",
    note: "Save photo and ask price · ဓာတ်ပုံပို့ပြီး စျေးမေးပါ",
    image: `./${number}.JPG`
  };
});
