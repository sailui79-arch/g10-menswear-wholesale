const ORDER_NOTIFICATION_EMAIL = "sailui79@gmail.com";
const ORDER_SHEET_NAME = "Orders";

function doPost(event) {
  try {
    const order = JSON.parse(event.postData.contents || "{}");
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet =
      spreadsheet.getSheetByName(ORDER_SHEET_NAME) ||
      spreadsheet.insertSheet(ORDER_SHEET_NAME);

    ensureOrderHeaders(sheet);

    const imageUrls = Array.isArray(order.imageUrls) ? order.imageUrls : [];
    sheet.appendRow([
      new Date(),
      order.orderId || "",
      order.customerName || "",
      order.customerPhone || "",
      Number(order.totalQty) || 0,
      order.itemsText || "",
      imageUrls.join("\n"),
      order.note || ""
    ]);

    MailApp.sendEmail({
      to: ORDER_NOTIFICATION_EMAIL,
      subject: `G-10 新选货单 ${order.orderId || ""}`,
      body: buildPlainTextEmail(order, imageUrls),
      htmlBody: buildHtmlEmail(order, imageUrls),
      name: "G-10 Website"
    });

    return jsonResponse({ ok: true, orderId: order.orderId || "" });
  } catch (error) {
    return jsonResponse({ ok: false, error: String(error) });
  }
}

function ensureOrderHeaders(sheet) {
  if (sheet.getLastRow() > 0) {
    return;
  }

  sheet.appendRow([
    "Submitted At",
    "Order ID",
    "Customer Name",
    "Phone / WeChat",
    "Selected Products",
    "Items",
    "Image URLs",
    "Note"
  ]);
  sheet.setFrozenRows(1);
}

function buildPlainTextEmail(order, imageUrls) {
  return [
    `订单编号：${order.orderId || "-"}`,
    `客户姓名：${order.customerName || "-"}`,
    `电话 / WeChat：${order.customerPhone || "-"}`,
    `已选商品：${order.totalQty || 0} 件`,
    "",
    order.itemsText || "",
    "",
    `备注：${order.note || "-"}`,
    "",
    ...imageUrls
  ].join("\n");
}

function buildHtmlEmail(order, imageUrls) {
  const productLinks = imageUrls
    .map(
      (url, index) =>
        `<li><a href="${escapeHtml(url)}" target="_blank">查看商品图片 ${index + 1}</a></li>`
    )
    .join("");

  return `
    <h2>G-10 新选货单</h2>
    <p><strong>订单编号：</strong>${escapeHtml(order.orderId || "-")}</p>
    <p><strong>客户姓名：</strong>${escapeHtml(order.customerName || "-")}</p>
    <p><strong>电话 / WeChat：</strong>${escapeHtml(order.customerPhone || "-")}</p>
    <p><strong>已选商品：</strong>${Number(order.totalQty) || 0} 件</p>
    <p><strong>商品：</strong>${escapeHtml(order.itemsText || "-")}</p>
    <p><strong>备注：</strong>${escapeHtml(order.note || "-")}</p>
    <ol>${productLinks}</ol>
  `;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function jsonResponse(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON
  );
}
