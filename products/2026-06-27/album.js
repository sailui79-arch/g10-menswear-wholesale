window.G10_ALBUM_PRODUCTS = Array.from({ length: 62 }, (_, index) => {
  const number = 22145 + index;
  const serial = String(index + 1).padStart(3, "0");

  return {
    id: `G10-0627-${serial}`,
    name: "男士短袖 T 恤",
    category: "T 恤",
    note: "今日相册，欢迎截图询价",
    image: `./${number}.JPG`
  };
});
