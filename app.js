let citySelector;
let orderHistoryList = [];
let isSyncing = false;
let currentUserId = ""; // 全域儲存 LINE UID
let currentUserDisplayName = ""; // 全域儲存 LINE 顯示名稱
let shippingBatchesReady = false;
const PUBLIC_PRODUCT_CATALOG = [
  {
    id: "p10A",
    code: "10A",
    variety: "牛奶梨",
    category: "一般禮盒",
    grade: "10 A",
    weight: "9.1~10兩",
    count: "12顆",
    price: 700,
    active: true,
    sortOrder: 1,
  },
  {
    id: "p11A",
    code: "11A",
    variety: "牛奶梨",
    category: "一般禮盒",
    grade: "11 A",
    weight: "10.1~11兩",
    count: "10顆",
    price: 700,
    active: true,
    sortOrder: 2,
  },
  {
    id: "p12A",
    code: "12A",
    variety: "牛奶梨",
    category: "一般禮盒",
    grade: "12 A",
    weight: "11.1~12兩",
    count: "10顆",
    price: 800,
    active: true,
    sortOrder: 3,
  },
  {
    id: "p13A",
    code: "13A",
    variety: "牛奶梨",
    category: "一般禮盒",
    grade: "13 A",
    weight: "12.1~13兩",
    count: "10顆",
    price: 900,
    active: true,
    sortOrder: 4,
  },
  {
    id: "p14A",
    code: "14A",
    variety: "牛奶梨",
    category: "一般禮盒",
    grade: "14 A",
    weight: "13.1~14兩",
    count: "10顆",
    price: 1000,
    active: true,
    sortOrder: 5,
  },
  {
    id: "p15A",
    code: "15A",
    variety: "牛奶梨",
    category: "一般禮盒",
    grade: "15 A",
    weight: "14.1~15兩",
    count: "10顆",
    price: 1100,
    active: true,
    sortOrder: 6,
  },
  {
    id: "p17A",
    code: "17A",
    variety: "蔗香梨",
    category: "一般禮盒",
    grade: "17 A",
    weight: "15.1~17兩",
    count: "8顆",
    price: 1200,
    active: true,
    sortOrder: 7,
  },
  {
    id: "p19A",
    code: "19A",
    variety: "蔗香梨",
    category: "一般禮盒",
    grade: "19 A",
    weight: "17.1~19兩",
    count: "8顆",
    price: 1300,
    active: true,
    sortOrder: 8,
  },
  {
    id: "p21A",
    code: "21A",
    variety: "蔗香梨",
    category: "一般禮盒",
    grade: "21 A",
    weight: "19.1~21兩",
    count: "6顆",
    price: 1200,
    active: true,
    sortOrder: 9,
  },
  {
    id: "p25A",
    code: "25A",
    variety: "蔗香梨",
    category: "一般禮盒",
    grade: "25 A",
    weight: "23.1~25兩",
    count: "6顆",
    price: 1500,
    active: true,
    sortOrder: 10,
  },
  {
    id: "p27A",
    code: "27A",
    variety: "蔗香梨",
    category: "一般禮盒",
    grade: "27 A",
    weight: "25.1~26兩",
    count: "5顆",
    price: 1500,
    active: true,
    sortOrder: 11,
  },
  {
    id: "p30A",
    code: "30A",
    variety: "蔗香梨",
    category: "兩粒裝",
    grade: "30 A",
    weight: "28.1~30兩",
    count: "2顆",
    price: 600,
    active: true,
    sortOrder: 12,
  },
  {
    id: "p32A",
    code: "32A",
    variety: "蔗香梨",
    category: "兩粒裝",
    grade: "32 A",
    weight: "30.1~32兩",
    count: "2顆",
    price: 700,
    active: true,
    sortOrder: 13,
  },
  {
    id: "p34A",
    code: "34A",
    variety: "蔗香梨",
    category: "兩粒裝",
    grade: "34 A",
    weight: "32.1兩以上",
    count: "2顆",
    price: 800,
    active: true,
    sortOrder: 14,
  },
];

// ⚡ 核心修復：DOMContentLoaded 時啟動 LIFF 與基礎事件綁定
document.addEventListener("DOMContentLoaded", function () {
  console.log("DOM 載入完成，啟動 LIFF 初始化...");
  renderPublicProductCatalog();
  // 1. 初始化 LINE LIFF

  liff
    .init({
      liffId: "2010333281-Ra5txFF3", // 妳的 LIFF ID
    })
    .then(() => {
      console.log("LIFF 初始化成功！");
      if (!liff.isLoggedIn()) {
        liff.login();
      } else {
        liff
          .getProfile()
          .then((profile) => {
            currentUserId = profile.userId;
            currentUserDisplayName = String(
              profile && profile.displayName ? profile.displayName : "",
            ).trim();
            // 同步填入隱藏欄位
            const uidInput = document.getElementById("lineUserIdInput");
            if (uidInput) uidInput.value = currentUserId;
            console.log("成功撈到 UID 並填入欄位:", currentUserId);
          })
          .catch((err) => {
            console.error("撈取 LINE Profile 失敗:", err);
          });
      }
    })
    .catch((err) => {
      console.error("LIFF 初始化失敗:", err);
    });

  // 2. 初始化台灣地址選擇器
  if (document.getElementById("twzipcode_wrap")) {
    citySelector = new TwCitySelector({
      el: "#twzipcode_wrap",
      elCounty: ".county",
      elDistrict: ".district",
      hasZipcode: false,
    });
  }

  // 3. 讀取可選的希望寄出批次
  fetchShippingBatches();

  // 4. 監聽付款方式變更與表單送出事件
  const paymentMethodSelect = document.getElementById("paymentMethod");
  if (paymentMethodSelect) {
    paymentMethodSelect.addEventListener("change", handlePaymentChange);
    handlePaymentChange(); // 初始執行一次
  }

  const orderForm = document.getElementById("orderForm");
  if (orderForm) {
    orderForm.addEventListener("submit", submitOrder);
  }
});

function getActivePublicProducts() {
  return PUBLIC_PRODUCT_CATALOG.filter((product) => product.active === true).sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );
}

function renderPublicProductCatalog() {
  const sectionRoot = document.getElementById("productCatalogSections");
  const tabsRoot = document.getElementById("productVarietyTabs");
  if (!sectionRoot || !tabsRoot) return;

  const products = getActivePublicProducts();
  const varieties = [...new Set(products.map((product) => product.variety))];

  tabsRoot.innerHTML = varieties
    .map(
      (variety, index) =>
        `<button type="button" class="product-tab ${index === 0 ? "active" : ""}" data-variety="${variety}" onclick="switchProductVariety('${variety}')">${variety}</button>`,
    )
    .join("");

  sectionRoot.innerHTML = varieties
    .map((variety, index) => {
      const groups = [...new Set(products.filter((product) => product.variety === variety).map((product) => product.category))];
      const groupHtml = groups
        .map((category) => renderProductCategory(variety, category))
        .join("");
      return `<div class="product-variety-panel" data-variety-panel="${variety}" style="${index === 0 ? "" : "display:none"}">${groupHtml}</div>`;
    })
    .join("");
}

function switchProductVariety(variety) {
  document.querySelectorAll(".product-tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.variety === variety);
  });
  document.querySelectorAll(".product-variety-panel").forEach((panel) => {
    panel.style.display = panel.dataset.varietyPanel === variety ? "" : "none";
  });
}

function renderProductCategory(variety, category) {
  const products = getActivePublicProducts().filter(
    (product) => product.variety === variety && product.category === category,
  );
  const categoryNote =
    category === "兩粒裝"
      ? '<p class="product-category-note">兩粒裝一次需購買 6 盒才享免運；未滿 6 盒暫不出貨。</p>'
      : "";

  return `
    <section class="product-category">
      <div class="product-category-heading">
        <div>
          <h2>${variety}</h2>
          <p>${category}</p>
        </div>
        <span>${products.length} 款</span>
      </div>
      ${categoryNote}
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>A數 / 等級</th>
              <th>重量區間</th>
              <th>顆數</th>
              <th>售價</th>
              <th>訂購數量(盒)</th>
            </tr>
          </thead>
          <tbody>
            ${products.map(renderProductTableRow).join("")}
          </tbody>
        </table>
      </div>
      <div class="product-cards">
        ${products.map(renderProductCard).join("")}
      </div>
    </section>
  `;
}

function renderProductTableRow(product) {
  return `
    <tr>
      <td class="product-grade">${product.grade}</td>
      <td>${product.weight}</td>
      <td>${product.count}</td>
      <td class="product-price">$${product.price.toLocaleString()}</td>
      <td>${renderQtyControl(product, "qty-input")}</td>
    </tr>
  `;
}

function renderProductCard(product) {
  return `
    <div class="card">
      <div class="card-header">
        <span class="card-title">${product.grade}</span>
        <span class="card-price">$${product.price.toLocaleString()}</span>
      </div>
      <div class="card-body">
        <span>${product.weight}</span>
        <span>${product.count}</span>
      </div>
      <div class="card-footer">
        <span>訂購數量：</span>
        ${renderQtyControl(product, "qty-input-mobile")}
      </div>
    </div>
  `;
}

function renderQtyControl(product, inputClass) {
  return `
    <div class="qty-control">
      <button type="button" class="qty-btn" onclick="stepQty(this, -1)">-</button>
      <input
        type="number"
        class="${inputClass}"
        data-id="${product.id}"
        data-code="${product.code}"
        data-level="${product.grade}"
        data-variety="${product.variety}"
        data-category="${product.category}"
        data-weight="${product.weight}"
        data-count="${product.count}"
        data-price="${product.price}"
        min="0"
        value="0"
        onchange="syncAndCalculate('${product.id}', this.value)"
      />
      <button type="button" class="qty-btn" onclick="stepQty(this, 1)">+</button>
    </div>
  `;
}

// 付款方式切換邏輯
function handlePaymentChange() {
  calculate();
}

async function fetchShippingBatches() {
  const select = document.getElementById("requestedShippingBatchId");
  const status = document.getElementById("shippingBatchStatus");
  const submitButton =
    document.getElementById("submitBtn") ||
    document.querySelector(".submit-btn");

  shippingBatchesReady = false;
  if (select) {
    select.disabled = true;
    select.innerHTML = '<option value="">批次讀取中...</option>';
  }
  if (submitButton) submitButton.disabled = true;

  try {
    const gasUrl =
      "https://script.google.com/macros/s/AKfycby9r7QgpvOJ7KP_3uVI9eYHkzeJnPVFhP7Z3uQdQBvMogYglPoim79H3HJpjyUAgW57/exec";
    const requestUrl = new URL(gasUrl);
    requestUrl.searchParams.set("action", "readShippingBatches");
    requestUrl.searchParams.set("t", String(Date.now()));

    const response = await fetch(requestUrl.toString(), {
      method: "GET",
      cache: "no-store",
    });
    const payload = await response.json();

    if (
      !response.ok ||
      payload?.ok !== true ||
      payload?.action !== "readShippingBatches" ||
      !Array.isArray(payload.batches) ||
      payload.batches.length === 0
    ) {
      throw new Error("SHIPPING_BATCHES_UNAVAILABLE");
    }

    const batches = payload.batches.map((batch) => {
      const normalized = {
        batchId: String(batch?.batchId ?? "").trim(),
        displayLabel: String(batch?.displayLabel ?? "").trim(),
        shippingStartDate: String(batch?.shippingStartDate ?? "").trim(),
        shippingEndDate: String(batch?.shippingEndDate ?? "").trim(),
        sortOrder: batch?.sortOrder,
      };

      if (
        !normalized.batchId ||
        !normalized.displayLabel ||
        !normalized.shippingStartDate ||
        !normalized.shippingEndDate ||
        !Number.isInteger(normalized.sortOrder)
      ) {
        throw new Error("SHIPPING_BATCHES_INVALID_RESPONSE");
      }

      return normalized;
    });

    select.innerHTML = '<option value="">請選擇希望寄出批次</option>';
    batches.forEach((batch) => {
      const option = document.createElement("option");
      option.value = batch.batchId;
      option.textContent = batch.displayLabel;
      select.appendChild(option);
    });

    select.disabled = false;
    shippingBatchesReady = true;
    if (submitButton) submitButton.disabled = false;
    if (status) {
      status.textContent = "請選擇一個希望寄出批次。";
      status.style.color = "";
    }
  } catch (error) {
    if (select) {
      select.disabled = true;
      select.innerHTML = '<option value="">批次讀取失敗</option>';
    }
    if (submitButton) submitButton.disabled = true;
    if (status) {
      status.textContent = "目前無法讀取寄出批次，請稍後重新整理頁面。";
      status.style.color = "var(--accent-color)";
    }
  }
}

// 數量加減按鈕
function stepQty(button, step) {
  const qtyControl = button.closest(".qty-control");
  const input = qtyControl.querySelector("input");
  let currentVal = parseInt(input.value) || 0;
  currentVal += step;
  if (currentVal < 0) currentVal = 0;
  input.value = currentVal;

  // 觸發變更事件以利同步
  input.dispatchEvent(new Event("change"));
}

// 雙向同步桌機與手機版數量
function syncAndCalculate(id, val) {
  const intVal = parseInt(val) || 0;
  const pcInput = document.querySelector(`.qty-input[data-id="${id}"]`);
  const mobileInput = document.querySelector(
    `.qty-input-mobile[data-id="${id}"]`,
  );

  if (pcInput && parseInt(pcInput.value) !== intVal) pcInput.value = intVal;
  if (mobileInput && parseInt(mobileInput.value) !== intVal)
    mobileInput.value = intVal;

  calculate();
}

// 精準計費核心（移除 RWD 視窗判定，直接統計不跳 bug）
function calculate() {
  const pcInputs = document.querySelectorAll(".qty-input");
  let totalBoxes = 0;
  let subTotal = 0;

  // 因為雙向同步了，直接統一計算桌機版的數值即為正確總數
  pcInputs.forEach((input) => {
    const qty = parseInt(input.value) || 0;
    const price = parseInt(input.getAttribute("data-price")) || 0;
    totalBoxes += qty;
    subTotal += qty * price;
  });

  // 運費規則：3 的倍數免運
  let shippingFee = 0;
  if (totalBoxes > 0) {
    const remainder = totalBoxes % 3;
    if (remainder === 1) shippingFee = 150;
    else if (remainder === 2) shippingFee = 250;
  }

  // 貨到付款手續費邏輯
  let codFee = 0;
  const paymentMethodEl = document.getElementById("paymentMethod");
  const payMethod = paymentMethodEl ? paymentMethodEl.value : "轉帳匯款";
  const codRow = document.getElementById("codFeeRow");

  if (totalBoxes > 0 && payMethod === "貨到付款") {
    codFee = 30;
    if (codRow) codRow.style.display = "flex";
  } else {
    if (codRow) codRow.style.display = "none";
  }

  const grandTotal = subTotal + shippingFee + codFee;

  // 渲染畫面的統計數據
  if (document.getElementById("totalBoxes"))
    document.getElementById("totalBoxes").innerText = totalBoxes;
  if (document.getElementById("subTotal"))
    document.getElementById("subTotal").innerText = subTotal.toLocaleString();
  if (document.getElementById("shippingFee"))
    document.getElementById("shippingFee").innerText =
      shippingFee.toLocaleString();
  if (document.getElementById("codFee"))
    document.getElementById("codFee").innerText = codFee;
  if (document.getElementById("grandTotal"))
    document.getElementById("grandTotal").innerText =
      grandTotal.toLocaleString();
}

// 寄件人同收件人勾選邏輯
function toggleSameAsReceiver() {
  const isChecked = document.getElementById("sameAsReceiver").checked;
  if (isChecked) {
    isSyncing = true;
    syncSenderIfChecked();
    isSyncing = false;
  } else {
    if (document.getElementById("senderName"))
      document.getElementById("senderName").value = "";
    if (document.getElementById("senderPhone"))
      document.getElementById("senderPhone").value = "";
  }
}

function syncSenderIfChecked() {
  const isChecked = document.getElementById("sameAsReceiver").checked;
  const customerNameInput = document.getElementById("customerName"); // 修正為對齊 HTML 的 ID
  const customerPhoneInput = document.getElementById("customerPhone");

  if (isChecked && customerNameInput && customerPhoneInput) {
    const cName = customerNameInput.value.trim();
    const cPhone = customerPhoneInput.value.trim();

    if (document.getElementById("senderName"))
      document.getElementById("senderName").value = cName;
    if (document.getElementById("senderPhone"))
      document.getElementById("senderPhone").value = cPhone;
  }
}

function handleSenderInput() {
  if (!isSyncing && document.getElementById("sameAsReceiver")) {
    document.getElementById("sameAsReceiver").checked = false;
  }
}

// 送出訂單給 GAS 後端
async function submitOrder(e) {
  if (e) e.preventDefault();

  // 🛡️ 防呆安全鎖
  const lineUserId =
    document.getElementById("lineUserIdInput").value || currentUserId;
  if (!lineUserId) {
    alert(
      "錯誤：尚未成功取得 LINE 帳號權限（UID 為空），請確認您是在 LINE 軟體內開啟此網頁，或稍等數秒重新點擊。",
    );
    return;
  }
  const lineIdToken =
    typeof liff !== "undefined" && typeof liff.getIDToken === "function"
      ? liff.getIDToken()
      : "";
  const lineAccessToken =
    typeof liff !== "undefined" && typeof liff.getAccessToken === "function"
      ? liff.getAccessToken()
      : "";
  if (!lineIdToken && !lineAccessToken) {
    alert(
      "錯誤：尚未成功取得 LINE 身分驗證，請重新開啟訂購頁後再送出。",
    );
    return;
  }

  const total = document.getElementById("grandTotal").innerText;
  const boxes = document.getElementById("totalBoxes").innerText;
  const shipping = document.getElementById("shippingFee").innerText;

  if (total === "0" || boxes === "0") {
    alert("請至少選擇一盒商品！");
    return;
  }

  // 抓取地址元件值
  const countySel = document.querySelector("#twzipcode_wrap .county");
  const districtSel = document.querySelector("#twzipcode_wrap .district");
  const county = countySel ? countySel.value : "";
  const district = districtSel ? districtSel.value : "";
  const detailAddrEl = document.getElementById("address_detail");
  const detailAddr = detailAddrEl ? detailAddrEl.value : "";

  // 抓取各欄位（此處已全面校正對齊 HTML 欄位識別碼）
  const senderName = document.getElementById("senderName")
    ? document.getElementById("senderName").value
    : "";
  const senderPhone = document.getElementById("senderPhone")
    ? document.getElementById("senderPhone").value
    : "";
  const receiverName = document.getElementById("customerName")
    ? document.getElementById("customerName").value
    : "";
  const receiverPhone = document.getElementById("customerPhone")
    ? document.getElementById("customerPhone").value
    : "";
  const paymentMethod = document.getElementById("paymentMethod")
    ? document.getElementById("paymentMethod").value
    : "轉帳匯款";
  const requestedShippingBatchId = document.getElementById(
    "requestedShippingBatchId",
  )
    ? document.getElementById("requestedShippingBatchId").value.trim()
    : "";
  const noteEl = document.getElementById("note");
  const note = noteEl ? noteEl.value : "";

  if (
    !senderName ||
    !senderPhone ||
    !receiverName ||
    !receiverPhone ||
    !county ||
    !district ||
    !detailAddr
  ) {
    alert("請完整填寫收件資訊、完整宅配地址與寄件人資訊！");
    return;
  }

  if (!shippingBatchesReady) {
    alert("寄出批次尚未載入完成，請稍後再試。");
    return;
  }

  if (!requestedShippingBatchId) {
    alert("請選擇希望寄出批次！");
    return;
  }

  const fullAddress = `${county}${district}${detailAddr}`;
  const orderItems = [];
  let twoPieceBoxes = 0;

  // 統一抓取桌機版輸入框撈取選購明細即可（因為數值已同步）
  document.querySelectorAll(".qty-input").forEach((input) => {
    const qty = parseInt(input.value) || 0;
    if (qty > 0) {
      if (input.getAttribute("data-category") === "兩粒裝") {
        twoPieceBoxes += qty;
      }
      orderItems.push({
        code: input.getAttribute("data-code"),
        level: input.getAttribute("data-level"),
        variety: input.getAttribute("data-variety"),
        category: input.getAttribute("data-category"),
        weight: input.getAttribute("data-weight"),
        price: input.getAttribute("data-price"),
        qty: qty,
      });
    }
  });

  if (twoPieceBoxes > 0 && twoPieceBoxes < 6) {
    alert("蔗香梨兩粒裝一次需購買 6 盒才享免運；未滿 6 盒暫不出貨。");
    return;
  }

  const codFeeSaved = paymentMethod === "貨到付款" ? "30" : "0";
  // 封裝要傳給 GAS 的完美 JSON 結構
  const data = {
    lineUserId: lineUserId,
    idToken: lineIdToken,
    accessToken: lineAccessToken,
    lineDisplayName: currentUserDisplayName,
    senderName: senderName,
    senderPhone: senderPhone,
    name: receiverName,
    phone: receiverPhone,
    address: fullAddress,
    paymentMethod: paymentMethod,
    requestedShippingBatchId: requestedShippingBatchId,
    note: note,
    shippingFee: shipping,
    codFee: codFeeSaved,
    total: total,
    boxes: boxes,
    items: orderItems,
  };

  const btn =
    document.getElementById("submitBtn") ||
    document.querySelector(".submit-btn");
  const originalBtnText = btn ? btn.innerText : "送出訂單";

  if (btn) {
    btn.innerText = "正在送出訂單...";
    btn.disabled = true;
  }

  try {
    const myGasUrl =
      "https://script.google.com/macros/s/AKfycby9r7QgpvOJ7KP_3uVI9eYHkzeJnPVFhP7Z3uQdQBvMogYglPoim79H3HJpjyUAgW57/exec";
    const noCacheUrl =
      myGasUrl +
      (myGasUrl.includes("?") ? "&" : "?") +
      "t=" +
      new Date().getTime();

    const response = await fetch(noCacheUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
      body: JSON.stringify(data),
    });
    const result = await response.json();

    if (
      !response.ok ||
      result?.status !== "success" ||
      String(result?.requestedShippingBatchId ?? "").trim() !==
        requestedShippingBatchId ||
      !String(result?.requestedShippingBatchLabel ?? "").trim()
    ) {
      throw new Error(result?.message || "ORDER_SUBMIT_FAILED");
    }

    data.requestedShippingBatchId = String(
      result.requestedShippingBatchId,
    ).trim();
    data.requestedShippingBatchLabel = String(
      result.requestedShippingBatchLabel,
    ).trim();

    // 渲染成功區塊資訊（如果 HTML 有對應元素的話）
    if (document.getElementById("successName"))
      document.getElementById("successName").innerText = data.senderName;
    if (document.getElementById("successBoxes"))
      document.getElementById("successBoxes").innerText = data.boxes;
    if (document.getElementById("successTotal"))
      document.getElementById("successTotal").innerText = data.total;
    if (document.getElementById("successPayment"))
      document.getElementById("successPayment").innerText = data.paymentMethod;
    const successBlock = document.getElementById("successBlock");
    if (successBlock) {
      let batchSummary = document.getElementById("successShippingBatch");
      if (!batchSummary) {
        batchSummary = document.createElement("p");
        batchSummary.id = "successShippingBatch";
        const paymentBox = successBlock.querySelector(
          ".payment-instruction-box",
        );
        successBlock.insertBefore(batchSummary, paymentBox || null);
      }
      batchSummary.textContent =
        "希望寄出批次：" + data.requestedShippingBatchLabel;
    }
    if (document.getElementById("successReceiverName"))
      document.getElementById("successReceiverName").innerText = data.name;

    if (document.getElementById("successReceiverPhone"))
      document.getElementById("successReceiverPhone").innerText = data.phone;

    if (document.getElementById("successReceiverAddress"))
      document.getElementById("successReceiverAddress").innerText =
        data.address;

    const transferAlert = document.getElementById("transferAlertBlock");
    const codAlert = document.getElementById("codAlertBlock");
    if (data.paymentMethod === "貨到付款") {
      if (transferAlert) transferAlert.style.display = "none";
      if (codAlert) codAlert.style.display = "block";
    } else {
      if (transferAlert) transferAlert.style.display = "block";
      if (codAlert) codAlert.style.display = "none";
    }

    orderHistoryList.push(data);
    renderHistoryList();

    if (document.getElementById("successBlock")) {
      document.getElementById("successBlock").style.display = "block";

      if (orderHistoryList.length >= 2) {
        document
          .getElementById("historySection")
          ?.scrollIntoView({ behavior: "smooth" });
      } else {
        document
          .getElementById("successBlock")
          ?.scrollIntoView({ behavior: "smooth" });
      }
    }
    if (btn) btn.innerText = "訂單已成功送出！";

    // 如果想要讓使用者送完單自動關閉 LIFF 視窗，可以在這裡解開註解：
    // setTimeout(() => { liff.closeWindow(); }, 2000);
  } catch (error) {
    console.error(error);
    const message = String(error?.message || "").trim();
    const friendlyMessages = {
      LINE_ID_TOKEN_MISSING:
        "LINE 身分驗證缺少 idToken，請確認前台 app.js 已更新，並重新開啟 LINE 訂購頁。",
      LINE_ID_TOKEN_VERIFY_FAILED:
        "LINE 身分驗證失敗，請重新開啟 LINE 訂購頁後再試。",
      LINE_ACCESS_TOKEN_MISSING:
        "LINE 身分驗證缺少 access token，請重新開啟 LINE 訂購頁後再試。",
      LINE_ACCESS_TOKEN_VERIFY_FAILED:
        "LINE access token 驗證失敗，請重新開啟 LINE 訂購頁後再試。",
      LINE_UID_MISMATCH:
        "LINE 身分資料不一致，請重新開啟 LINE 訂購頁後再試。",
      PUBLIC_ORDER_REQUIRED_FIELDS: "訂購資料未填完整，請檢查必填欄位。",
      PUBLIC_ORDER_PHONE_INVALID: "電話格式不正確，請重新確認電話號碼。",
      ORDER_AMOUNT_MISMATCH: "訂單金額驗證失敗，請重新整理頁面後再送出。",
      ORDER_SHIPPING_FEE_MISMATCH:
        "運費驗證失敗，請重新整理頁面後再送出。",
      ORDER_BOXES_MISMATCH: "盒數驗證失敗，請重新整理頁面後再送出。",
    };
    alert(friendlyMessages[message] || `訂單送出失敗，請稍後再試\n${message}`);
    if (btn) {
      btn.innerText = originalBtnText;
      btn.disabled = false;
    }
  }
}

// 重設下一單的表單內容
function resetFormForNext() {
  const orderForm = document.getElementById("orderForm");
  if (orderForm) orderForm.reset();
  if (citySelector) citySelector.reset();

  document
    .querySelectorAll(".qty-input, .qty-input-mobile")
    .forEach((input) => (input.value = 0));

  const currentUid =
    document.getElementById("lineUserIdInput").value || currentUserId;
  handlePaymentChange();

  if (document.getElementById("lineUserIdInput")) {
    document.getElementById("lineUserIdInput").value = currentUid;
  }

  const btn =
    document.getElementById("submitBtn") ||
    document.querySelector(".submit-btn");
  if (btn) {
    btn.innerText = "送出訂單";
    btn.disabled = false;
  }

  if (document.getElementById("successBlock"))
    document.getElementById("successBlock").style.display = "none";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// 歷史多單列表渲染（連單功能）
function renderHistoryList() {
  const container = document.getElementById("historyContainer");
  if (!container) return;
  container.innerHTML = "";

  orderHistoryList.forEach((order, index) => {
    const itemDetailsArray = order.items.map((item) => {
      const itemSubtotal = parseInt(item.price) * parseInt(item.qty);
      return `${item.level} (單價$${parseInt(item.price).toLocaleString()} × ${item.qty}盒 = $${itemSubtotal.toLocaleString()})`;
    });
    const itemDetailsText = itemDetailsArray.join("<br>     ");

    const isFreeShipping = parseInt(order.shippingFee.replace(/,/g, "")) === 0;
    const shippingText = isFreeShipping
      ? `<span style="color: var(--primary-color); font-weight: bold;">免運費 (0元)</span>`
      : `$ ${order.shippingFee} 元`;

    const codFeeText =
      order.codFee === "30"
        ? `<div class="history-item-row"><span class="history-item-label">物流手續費：</span><span style="color:var(--accent-color);">$ 30 元</span></div>`
        : "";

    const noteHtml = order.note
      ? `<div class="history-item-row"><span class="history-item-label">備註說明：</span><span style="color: var(--accent-color); font-weight: bold;">${order.note}</span></div>`
      : "";

    const cardHtml = `
  <div class="history-card" style="
    border: 1px solid #EDEAE1;
    padding: 15px;
    border-radius: 12px;
    margin-bottom: 15px;
    background: #F8F6F1;
  ">

    <div class="history-card-header" style="
      border-bottom: 1px dashed #EDEAE1;
      padding-bottom:8px;
      margin-bottom:8px;
      font-weight:bold;
    "><div style="
    display:flex;
    justify-content:space-between;
    align-items:center;
    margin-bottom:8px;
  ">
    <span style="font-weight:bold;">
      ✓ 訂單 ${index + 1}
    </span>

    <span style="
      color: var(--accent-color);
      font-weight:bold;
      font-size:1.8rem;
    ">
      $ ${order.total}
    </span>
  </div>

 <div style="
  display:flex;
  align-items:flex-start;
  gap:6px;
  margin-bottom:4px;
">
  <span style="
    color:var(--text-muted);
    flex-shrink:0;
  ">
    收件人｜
  </span>
  <span>${order.name}</span>
</div>

<div style="
  display:flex;
  align-items:flex-start;
  gap:6px;
  margin-bottom:4px;
">
  <span style="
    color:var(--text-muted);
    flex-shrink:0;
  ">
    聯絡電話｜
  </span>
  <span>${order.phone}</span>
</div>

<div style="
  display:flex;
  align-items:flex-start;
  gap:6px;
">
  <span style="
    color:var(--text-muted);
    flex-shrink:0;
  ">
    配送地址｜
  </span>
  <span style="
    flex:1;
    word-break:break-word;
  ">
    ${order.address}
  </span>
</div>
  </div>
    
              <div style="padding: 5px 0; font-size: 0.95em; line-height: 1.6;">
                <div class="history-item-row">
                  <span class="history-item-label" style="color:var(--text-muted);">品項明細：</span><span>${itemDetailsText}</span>
                </div>
                <div class="history-item-row">
                  <span class="history-item-label" style="color:var(--text-muted);">黑貓運費：</span><span>${shippingText}</span>
                </div>
                ${codFeeText}
           
                ${
                  order.requestedShippingBatchLabel
                    ? `<div class="history-item-row"><span class="history-item-label" style="color:var(--text-muted);">希望寄出批次：</span><span style="font-weight:bold;">${order.requestedShippingBatchLabel}</span></div>`
                    : `<div class="history-item-row"><span class="history-item-label" style="color:var(--text-muted);">預訂出貨日：</span><span style="font-weight:bold;">${order.shippingDate || ""}</span></div>`
                }
                <div class="history-item-row" style="border-top: 1px solid #F5F2EC; margin-top: 6px; padding-top: 6px;">
                  <span class="history-item-label" style="color:var(--text-muted);">寄件人姓名：</span><span>${order.senderName}</span>
                </div>
                <div class="history-item-row" style="background-color: var(--secondary-color); padding: 8px 12px; border-radius: 8px; margin-top: 10px;">
                  <span class="history-item-label" style="color: var(--primary-color); font-weight: bold;">付款狀態：</span>
                  <span style="color: var(--primary-color); font-weight: bold;">${order.paymentMethod}（後台處理中）</span>
                </div>
                ${noteHtml}
              </div>
            </div>
          `;
    container.insertAdjacentHTML("beforeend", cardHtml);
  });

  const historySection = document.getElementById("historySection");
  if (historySection) {
    historySection.style.display =
      orderHistoryList.length >= 1 ? "block" : "none";
  }
}
