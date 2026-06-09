let citySelector;
let orderHistoryList = [];
let isSyncing = false;
let currentUserId = ""; // 全域儲存 LINE UID

// ⚡ 核心修復：DOMContentLoaded 時啟動 LIFF 與基礎事件綁定
document.addEventListener("DOMContentLoaded", function () {
  console.log("DOM 載入完成，啟動 LIFF 初始化...");
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

  // 3. 設定出貨日期最小值為今日
  const shippingDateInput = document.getElementById("shippingDate");
  if (shippingDateInput) {
    const today = new Date().toISOString().split("T")[0];
    shippingDateInput.min = today;
  }

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

// 付款方式切換邏輯
function handlePaymentChange() {
  const payMethodInput = document.getElementById("paymentMethod");
  const dateInput = document.getElementById("shippingDate");
  const dateNotice = document.getElementById("shippingDateNotice");
  const star = document.getElementById("dateRequiredStar");

  if (!payMethodInput || !dateInput) return;
  const payMethod = payMethodInput.value;

  if (payMethod === "轉帳匯款") {
    dateInput.value = "";
    dateInput.disabled = true;
    dateInput.required = false;
    if (star) star.style.display = "none";
    if (dateNotice) {
      dateNotice.innerHTML = `<span style="color:var(--accent-color); font-weight:bold;">💡 確認收到款項後會於 LINE 告知出貨時間，無需填寫此欄</span>`;
    }
  } else {
    dateInput.disabled = false;
    dateInput.required = true;
    if (star) star.style.display = "inline";
    if (dateNotice) {
      dateNotice.innerHTML = `<span>⚠️ 固定出貨日期為週一、週二、週三，請點擊欄位選擇日期。</span>`;
    }
  }
  calculate();
}

// 檢查出貨日是否為周一二三
function validateShippingDate(dateString) {
  if (!dateString) return;
  const dateObj = new Date(dateString);
  const dayOfWeek = dateObj.getDay();

  // 0:週日, 4:週四, 5:週五, 6:週六
  if ([0, 4, 5, 6].includes(dayOfWeek)) {
    alert("抱歉！固定出貨日期為週一、週二、週三，請重新選取適當日期。");
    document.getElementById("shippingDate").value = "";
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
  const shippingDate = document.getElementById("shippingDate")
    ? document.getElementById("shippingDate").value
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

  if (paymentMethod === "貨到付款" && !shippingDate) {
    alert("選擇貨到付款，請必須指定出貨日期！");
    return;
  }

  const fullAddress = `${county}${district}${detailAddr}`;
  const orderItems = [];

  // 統一抓取桌機版輸入框撈取選購明細即可（因為數值已同步）
  document.querySelectorAll(".qty-input").forEach((input) => {
    const qty = parseInt(input.value) || 0;
    if (qty > 0) {
      orderItems.push({
        level: input.getAttribute("data-level"),
        weight: input.getAttribute("data-weight"),
        price: input.getAttribute("data-price"),
        qty: qty,
      });
    }
  });

  const codFeeSaved = paymentMethod === "貨到付款" ? "30" : "0";
  const finalDateText =
    paymentMethod === "轉帳匯款" ? "由人工對帳後另行告知" : shippingDate;

  // 封裝要傳給 GAS 的完美 JSON 結構
  const data = {
    lineUserId: lineUserId,
    senderName: senderName,
    senderPhone: senderPhone,
    name: receiverName,
    phone: receiverPhone,
    address: fullAddress,
    paymentMethod: paymentMethod,
    shippingDate: finalDateText,
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

    await fetch(noCacheUrl, {
      method: "POST",
      mode: "no-cors",
      body: JSON.stringify(data),
    });

    // 渲染成功區塊資訊（如果 HTML 有對應元素的話）
    if (document.getElementById("successName"))
      document.getElementById("successName").innerText = data.name;
    if (document.getElementById("successBoxes"))
      document.getElementById("successBoxes").innerText = data.boxes;
    if (document.getElementById("successTotal"))
      document.getElementById("successTotal").innerText = data.total;
    if (document.getElementById("successPayment"))
      document.getElementById("successPayment").innerText = data.paymentMethod;
    if (document.getElementById("successDate"))
      document.getElementById("successDate").innerText = data.shippingDate;

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
      document
        .getElementById("successBlock")
        .scrollIntoView({ behavior: "smooth" });
    }
    if (btn) btn.innerText = "訂單已成功送出！";

    // 如果想要讓使用者送完單自動關閉 LIFF 視窗，可以在這裡解開註解：
    // setTimeout(() => { liff.closeWindow(); }, 2000);
  } catch (error) {
    console.error(error);
    alert("訂單送出失敗，請稍後再試");
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
            <div class="history-card" style="border: 1px solid #EDEAE1; padding: 15px; border-radius: 12px; margin-bottom: 15px; background: #FFF;">
              <div class="history-card-header" style="display:flex; justify-content:space-between; border-bottom: 1px dashed #EDEAE1; padding-bottom:8px; margin-bottom:8px; font-weight:bold;">
                <span>✓ 訂單 ${index + 1}：收件人 ${order.name} (${order.phone})</span>
                <span style="color: var(--accent-color); font-size: 1.1em;">應付總額：$ ${order.total} 元</span>
              </div>
              <div style="padding: 5px 0; font-size: 0.95em; line-height: 1.6;">
                <div class="history-item-row">
                  <span class="history-item-label" style="color:var(--text-muted);">品項明細：</span><span>${itemDetailsText}</span>
                </div>
                <div class="history-item-row">
                  <span class="history-item-label" style="color:var(--text-muted);">黑貓運費：</span><span>${shippingText}</span>
                </div>
                ${codFeeText}
                <div class="history-item-row">
                  <span class="history-item-label" style="color:var(--text-muted);">宅配地址：</span><span>${order.address}</span>
                </div>
                <div class="history-item-row">
                  <span class="history-item-label" style="color:var(--text-muted);">出貨日期：</span><span style="font-weight:bold;">${order.shippingDate}</span>
                </div>
                <div class="history-item-row" style="border-top: 1px solid #F5F2EC; margin-top: 6px; padding-top: 6px;">
                  <span class="history-item-label" style="color:var(--text-muted);">寄件人姓名：</span><span>${order.senderName}</span>
                </div>
                <div class="history-item-row">
                  <span class="history-item-label" style="color:var(--text-muted);">寄件人電話：</span><span>${order.senderPhone}</span>
                </div>
                <div class="history-item-row" style="background-color: var(--secondary-color); padding: 6px 10px; border-radius: 8px; margin-top: 8px;">
                  <span class="history-item-label" style="color: var(--primary-color); font-weight:bold;">付款狀態：</span><span style="color: var(--primary-color); font-weight: bold;">${order.paymentMethod}（後台處理中）</span>
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
      orderHistoryList.length >= 2 ? "block" : "none";
  }
}
