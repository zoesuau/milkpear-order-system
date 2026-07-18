let citySelector;
let orderHistoryList = [];
let isSyncing = false;
let currentUserId = ""; // 全域儲存 LINE UID
let currentUserDisplayName = ""; // 全域儲存 LINE 顯示名稱
let lineIdentityPromise = null;
let myOrdersList = [];
let myOrdersLoaded = false;
let focusedMyOrderNo = "";
let shippingBatchesReady = false;
let lineFriendshipState = "checking";
let lineFriendshipCheckPromise = null;
let lineOfficialAccountFriendUrl = "";
let lineLoginRedirectInProgress = false;
let orderSubmitInProgress = false;
let orderFormSupplementState = {
  successVisible: false,
  historyVisible: false,
};
const GAS_ORDERS_API_URL =
  "https://script.google.com/macros/s/AKfycby9r7QgpvOJ7KP_3uVI9eYHkzeJnPVFhP7Z3uQdQBvMogYglPoim79H3HJpjyUAgW57/exec";
const OFFSHORE_SHIPPING_KEYWORDS = ["金門", "澎湖", "連江", "馬祖", "綠島"];
const PUBLIC_PRODUCT_CATALOG_FALLBACK = [
  {
    id: "p10A",
    code: "10A",
    variety: "牛奶梨",
    category: "一般禮盒",
    grade: "10 A",
    weight: "9.1~10兩",
    count: "12顆",
    price: 700,
    active: false,
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
    active: false,
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
    active: false,
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
    stock: 8,
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
    stock: 12,
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
    active: false,
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
    active: false,
    sortOrder: 11,
  },
  {
    id: "p30A",
    code: "30A",
    variety: "蔗香梨",
    category: "兩粒禮盒",
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
    category: "兩粒禮盒",
    grade: "32 A",
    weight: "30.1~32兩",
    count: "2顆",
    price: 700,
    stock: 4,
    active: true,
    sortOrder: 13,
  },
  {
    id: "p34A",
    code: "34A",
    variety: "蔗香梨",
    category: "兩粒禮盒",
    grade: "34 A",
    weight: "32.1兩以上",
    count: "2顆",
    price: 800,
    active: true,
    sortOrder: 14,
  },
];
let PUBLIC_PRODUCT_CATALOG = [...PUBLIC_PRODUCT_CATALOG_FALLBACK];

function saveLineIdentity(userId, displayName = "") {
  const normalizedUserId = String(userId || "").trim();
  if (normalizedUserId) currentUserId = normalizedUserId;

  const normalizedDisplayName = String(displayName || "").trim();
  if (normalizedDisplayName) currentUserDisplayName = normalizedDisplayName;

  const uidInput = document.getElementById("lineUserIdInput");
  if (uidInput && currentUserId) uidInput.value = currentUserId;
}

async function initializeLineIdentity() {
  if (currentUserId) return currentUserId;
  if (lineIdentityPromise) return lineIdentityPromise;

  lineIdentityPromise = (async () => {
    if (typeof liff === "undefined") throw new Error("LIFF_SDK_UNAVAILABLE");

    await liff.init({ liffId: "2010333281-Ra5txFF3" });
    console.log("LIFF 初始化成功！");

    if (!liff.isLoggedIn()) {
      lineLoginRedirectInProgress = true;
      const redirectUrl = new URL(window.location.href);
      ["code", "state", "friendship_status_changed"].forEach((key) =>
        redirectUrl.searchParams.delete(key),
      );
      liff.login({ redirectUri: redirectUrl.toString() });
      return "";
    }

    lineLoginRedirectInProgress = false;

    // ID token 內的 sub 就是 LINE UID，不必等 getProfile 請求才能送單。
    if (typeof liff.getDecodedIDToken === "function") {
      const decodedToken = liff.getDecodedIDToken();
      saveLineIdentity(decodedToken?.sub, decodedToken?.name);
    }

    // 顯示名稱與 UID 備援；失敗時仍可以用 token 由後端驗證。
    if (typeof liff.getProfile === "function") {
      liff
        .getProfile()
        .then((profile) => {
          saveLineIdentity(profile?.userId, profile?.displayName);
        })
        .catch((error) => {
          console.warn("撈取 LINE Profile 失敗，改用 LIFF token 驗證：", error);
        });
    }

    return currentUserId;
  })();

  try {
    return await lineIdentityPromise;
  } finally {
    lineIdentityPromise = null;
  }
}

function updateOrderSubmitAvailability() {
  const button =
    document.getElementById("submitBtn") ||
    document.querySelector(".submit-btn");
  if (!button) return;
  button.disabled =
    orderSubmitInProgress ||
    !shippingBatchesReady ||
    lineFriendshipState !== "friend";
}

async function fetchLineOfficialAccountFriendUrl() {
  if (lineOfficialAccountFriendUrl) return lineOfficialAccountFriendUrl;
  const requestUrl = new URL(GAS_ORDERS_API_URL);
  requestUrl.searchParams.set("action", "readLineOfficialAccountInfo");
  requestUrl.searchParams.set("t", String(Date.now()));
  const response = await fetch(requestUrl.toString(), {
    method: "GET",
    cache: "no-store",
  });
  const payload = await response.json();
  if (
    !response.ok ||
    payload?.ok !== true ||
    payload?.action !== "readLineOfficialAccountInfo" ||
    !String(payload?.friendUrl || "").trim()
  ) {
    throw new Error("LINE_OFFICIAL_ACCOUNT_INFO_UNAVAILABLE");
  }
  lineOfficialAccountFriendUrl = String(payload.friendUrl).trim();
  return lineOfficialAccountFriendUrl;
}

async function checkLineOfficialAccountFriendshipThroughBackend() {
  const idToken =
    typeof liff !== "undefined" && typeof liff.getIDToken === "function"
      ? liff.getIDToken() || ""
      : "";
  const accessToken =
    typeof liff !== "undefined" && typeof liff.getAccessToken === "function"
      ? liff.getAccessToken() || ""
      : "";
  if (!idToken && !accessToken) {
    throw new Error("LINE_FRIENDSHIP_CHECK_UNAVAILABLE");
  }
  const response = await fetch(GAS_ORDERS_API_URL + "?t=" + Date.now(), {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({
      action: "checkLineOfficialAccountFriendship",
      idToken,
      accessToken,
    }),
  });
  const payload = await response.json();
  if (
    !response.ok ||
    payload?.ok !== true ||
    payload?.action !== "checkLineOfficialAccountFriendship"
  ) {
    throw new Error("LINE_FRIENDSHIP_CHECK_UNAVAILABLE");
  }
  return payload.friend === true;
}

function showLineFriendGate(message) {
  const gate = document.getElementById("lineFriendGate");
  const messageElement = document.getElementById("lineFriendGateMessage");
  const addFriendLink = document.getElementById("lineAddFriendLink");
  if (messageElement && message) messageElement.textContent = message;
  if (addFriendLink) {
    addFriendLink.hidden = !lineOfficialAccountFriendUrl;
    if (lineOfficialAccountFriendUrl) {
      addFriendLink.href = lineOfficialAccountFriendUrl;
    }
  }
  if (gate) gate.hidden = false;
  document.body.classList.add("line-friend-gate-open");
  updateOrderSubmitAvailability();
}

function hideLineFriendGate() {
  const gate = document.getElementById("lineFriendGate");
  if (gate) gate.hidden = true;
  document.body.classList.remove("line-friend-gate-open");
  updateOrderSubmitAvailability();
}

async function checkLineOfficialAccountFriendship(options = {}) {
  if (lineFriendshipCheckPromise) return lineFriendshipCheckPromise;
  const showGate = options.showGate !== false;
  const checkPromise = (async () => {
    lineFriendshipState = "checking";
    updateOrderSubmitAvailability();
    try {
      if (
        typeof liff === "undefined" ||
        !liff.isLoggedIn()
      ) {
        throw new Error("LINE_FRIENDSHIP_CHECK_UNAVAILABLE");
      }
      let isFriend = false;
      if (typeof liff.getFriendship === "function") {
        try {
          const friendship = await liff.getFriendship();
          isFriend = friendship?.friendFlag === true;
        } catch (liffFriendshipError) {
          console.warn(
            "LIFF 好友檢查不可用，改由後端確認:",
            liffFriendshipError,
          );
          isFriend = await checkLineOfficialAccountFriendshipThroughBackend();
        }
      } else {
        isFriend = await checkLineOfficialAccountFriendshipThroughBackend();
      }
      if (isFriend) {
        lineFriendshipState = "friend";
        hideLineFriendGate();
        return true;
      }

      lineFriendshipState = "not_friend";
      try {
        await fetchLineOfficialAccountFriendUrl();
      } catch (friendUrlError) {
        console.error("取得官方 LINE 加好友網址失敗:", friendUrlError);
      }
      if (showGate) {
        showLineFriendGate(
          "為了接收訂單成立與匯款資訊，請先加入三合院農園官方 LINE。",
        );
      }
      return false;
    } catch (error) {
      console.error("LINE 好友狀態確認失敗:", error);
      lineFriendshipState = "error";
      if (showGate) {
        showLineFriendGate(
          "目前無法確認官方 LINE 好友狀態，請重新整理頁面後再試。",
        );
      }
      return false;
    } finally {
      updateOrderSubmitAvailability();
    }
  })();
  lineFriendshipCheckPromise = checkPromise;
  try {
    return await checkPromise;
  } finally {
    if (lineFriendshipCheckPromise === checkPromise) {
      lineFriendshipCheckPromise = null;
    }
  }
}

async function recheckLineOfficialAccountFriendship() {
  const status = document.getElementById("lineFriendGateMessage");
  const button = document.getElementById("lineFriendRecheck");
  if (status) status.textContent = "正在確認是否已加入官方 LINE…";
  if (button) button.disabled = true;
  try {
    await initializeLineIdentity();
    if (lineLoginRedirectInProgress) return;
    await checkLineOfficialAccountFriendship({ showGate: true });
  } catch (error) {
    console.error("重新確認 LINE 好友狀態失敗:", error);
    lineFriendshipState = "error";
    showLineFriendGate(
      "目前無法確認官方 LINE 好友狀態，請重新開啟訂購連結後再試。",
    );
  } finally {
    if (button) button.disabled = false;
  }
}

function setCustomerNavActive(view) {
  const isMyOrders = view === "orders";
  document.getElementById("orderFormTab")?.classList.toggle("active", !isMyOrders);
  document.getElementById("myOrdersTab")?.classList.toggle("active", isMyOrders);
}

function updateCustomerViewUrl(view, orderNo = "") {
  const url = new URL(window.location.href);
  if (view === "orders") {
    url.searchParams.set("view", "orders");
    if (orderNo) url.searchParams.set("order", orderNo);
    else url.searchParams.delete("order");
  } else {
    url.searchParams.delete("view");
    url.searchParams.delete("order");
  }
  window.history.replaceState({}, "", url.toString());
}

function getInitialCustomerViewParams() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("view")) return params;

  // LIFF secondary redirect 會先把路徑與查詢參數放在 liff.state。
  const liffState = params.get("liff.state");
  if (!liffState) return params;

  try {
    const decodedState = decodeURIComponent(liffState);
    const queryIndex = decodedState.indexOf("?");
    return new URLSearchParams(
      queryIndex >= 0 ? decodedState.slice(queryIndex + 1) : decodedState,
    );
  } catch (error) {
    console.warn("無法解析 LIFF 轉址狀態:", error);
    return params;
  }
}

function showOrderFormView(options = {}) {
  const orderForm = document.getElementById("orderForm");
  const myOrdersSection = document.getElementById("myOrdersSection");
  const successBlock = document.getElementById("successBlock");
  const localHistorySection = document.getElementById("historySection");
  if (orderForm) orderForm.hidden = false;
  if (myOrdersSection) myOrdersSection.hidden = true;
  if (successBlock) {
    successBlock.style.display = orderFormSupplementState.successVisible
      ? "block"
      : "none";
  }
  if (localHistorySection) {
    localHistorySection.style.display = orderFormSupplementState.historyVisible
      ? "block"
      : "none";
  }
  setCustomerNavActive("form");
  if (options.updateUrl !== false) updateCustomerViewUrl("form");
  window.scrollTo({ top: 0, behavior: options.smooth === false ? "auto" : "smooth" });
}

function openMyOrders(orderNo = "", options = {}) {
  focusedMyOrderNo = String(orderNo || "").trim();
  const orderForm = document.getElementById("orderForm");
  const myOrdersSection = document.getElementById("myOrdersSection");
  const successBlock = document.getElementById("successBlock");
  const localHistorySection = document.getElementById("historySection");

  // 只有從訂購頁離開時才記錄，避免在「我的訂單」內重複操作時
  // 把原本應恢復的完成訂單區塊狀態覆寫成全部隱藏。
  if (!orderForm?.hidden) {
    orderFormSupplementState = {
      successVisible: successBlock?.style.display !== "none",
      historyVisible: localHistorySection?.style.display !== "none",
    };
  }

  if (orderForm) orderForm.hidden = true;
  if (myOrdersSection) myOrdersSection.hidden = false;
  if (successBlock) successBlock.style.display = "none";
  if (localHistorySection) localHistorySection.style.display = "none";
  setCustomerNavActive("orders");
  if (options.updateUrl !== false) updateCustomerViewUrl("orders", focusedMyOrderNo);
  window.scrollTo({ top: 0, behavior: options.smooth === false ? "auto" : "smooth" });
  loadMyOrders({ focusOrderNo: focusedMyOrderNo });
}

function getLineAuthTokens() {
  return {
    idToken:
      typeof liff !== "undefined" && typeof liff.getIDToken === "function"
        ? liff.getIDToken() || ""
        : "",
    accessToken:
      typeof liff !== "undefined" && typeof liff.getAccessToken === "function"
        ? liff.getAccessToken() || ""
        : "",
  };
}

async function loadMyOrders(options = {}) {
  const force = options.force === true;
  const focusOrderNo = String(options.focusOrderNo || focusedMyOrderNo || "").trim();
  const status = document.getElementById("myOrdersStatus");
  const list = document.getElementById("myOrdersList");
  if (!list) return;

  if (myOrdersLoaded && !force) {
    renderMyOrders(focusOrderNo);
    return;
  }

  if (status) status.textContent = "正在確認 LINE 帳號並讀取訂單...";
  list.innerHTML = "";

  try {
    await initializeLineIdentity();
    if (lineLoginRedirectInProgress) return;
    const tokens = getLineAuthTokens();
    if (!tokens.idToken && !tokens.accessToken) {
      throw new Error("LINE_AUTH_REQUIRED");
    }

    const response = await fetch(GAS_ORDERS_API_URL + "?t=" + Date.now(), {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "readMyOrders",
        idToken: tokens.idToken,
        accessToken: tokens.accessToken,
      }),
    });
    const payload = await response.json();
    if (!response.ok || payload?.ok !== true || !Array.isArray(payload.orders)) {
      throw new Error(payload?.message || "MY_ORDERS_UNAVAILABLE");
    }

    myOrdersList = payload.orders;
    myOrdersLoaded = true;
    renderMyOrders(focusOrderNo);
  } catch (error) {
    console.error("讀取我的訂單失敗:", error);
    if (status) status.textContent = "";
    list.innerHTML = `
      <div class="my-orders-error">
        <strong>目前無法讀取訂單</strong><br>
        請從 LINE 訂購連結重新開啟，或稍後再試。<br>
        <button type="button" onclick="loadMyOrders({ force: true })">重新讀取</button>
      </div>`;
  }
}

function getMyOrderStatusMeta(order) {
  const rawStatus = String(order?.orderStatus || "").trim();
  const cancelled = rawStatus.includes("取消");
  const shipped = !cancelled && (rawStatus.includes("寄出") || Boolean(order?.actualShippingDate));
  const scheduled =
    !cancelled &&
    (shipped || rawStatus.includes("安排出貨") || Boolean(order?.expectedShippingDate));

  let label = rawStatus || "訂單處理中";
  if (rawStatus === "待確認") label = "訂單處理中";
  if (rawStatus === "已安排出貨") label = "出貨日期已確認";

  return {
    label,
    className: cancelled ? "cancelled" : shipped ? "shipped" : "",
    cancelled,
    shipped,
    scheduled,
  };
}

function getMyOrderPaymentLabel(order) {
  const state = String(order?.paymentState || "").trim();
  if (state === "bank_paid") return "匯款已確認";
  if (state === "bank_unpaid") return "匯款待確認";
  if (state === "cod") return "貨到付款";
  if (state === "bank_paid_cod_balance") {
    return "原款已匯款＋追加款貨到付款";
  }
  return String(order?.paymentStatus || order?.paymentMethod || "待確認").trim();
}

function myOrderDetailRow(label, value) {
  const normalizedValue = String(value ?? "").trim();
  if (!normalizedValue) return "";
  return `<span class="my-order-detail-label">${escapeHtml(label)}</span><span>${escapeHtml(normalizedValue)}</span>`;
}

function renderMyOrders(focusOrderNo = "") {
  const status = document.getElementById("myOrdersStatus");
  const list = document.getElementById("myOrdersList");
  if (!list) return;
  if (status) status.textContent = "";

  if (!myOrdersList.length) {
    list.innerHTML = `
      <div class="my-orders-empty">
        <strong>目前還沒有可顯示的訂單</strong><br>
        使用同一個 LINE 帳號送單後，訂單會出現在這裡。
      </div>`;
    return;
  }

  list.innerHTML = myOrdersList
    .map((order) => {
      const statusMeta = getMyOrderStatusMeta(order);
      const orderNo = String(order?.orderNo || "").trim();
      const isFocused = focusOrderNo && orderNo === focusOrderNo;
      const amount = Number(order?.finalAmount || 0).toLocaleString("zh-TW");
      const batch = order?.expectedShippingDate
        ? `確定出貨：${escapeHtml(order.expectedShippingDate)}`
        : escapeHtml(order?.requestedShippingBatchLabel || "出貨日期待確認");
      const progress = statusMeta.cancelled
        ? `<div class="my-order-progress"><span class="my-order-progress-step done">已收到</span><span class="my-order-progress-step">已取消</span><span class="my-order-progress-step">不出貨</span></div>`
        : `<div class="my-order-progress">
            <span class="my-order-progress-step done">已收到</span>
            <span class="my-order-progress-step ${statusMeta.scheduled ? "done" : ""}">日期確認</span>
            <span class="my-order-progress-step ${statusMeta.shipped ? "done" : ""}">已出貨</span>
          </div>`;

      return `
        <article class="my-order-card" id="my-order-${escapeHtmlAttribute(orderNo)}">
          <div class="my-order-card-top">
            <div class="my-order-card-heading">
              <div>
                <p class="my-order-number">訂單 ${escapeHtml(orderNo)}</p>
                <p class="my-order-date">下單時間：${escapeHtml(order?.createdAt || "")}</p>
              </div>
              <span class="my-order-status-chip ${statusMeta.className}">${escapeHtml(statusMeta.label)}</span>
            </div>
            <div class="my-order-card-summary">
              <div>
                <p class="my-order-recipient">${escapeHtml(order?.recipientName || "")}｜${escapeHtml(order?.totalBoxes || "0")} 盒</p>
                <p class="my-order-batch">${batch}</p>
              </div>
              <p class="my-order-amount">$${amount}</p>
            </div>
          </div>
          ${progress}
          <details class="my-order-details" ${isFocused ? "open" : ""}>
            <summary>查看訂單明細</summary>
            <div class="my-order-details-body">
              <div class="my-order-detail-grid">
                ${myOrderDetailRow("付款狀態", getMyOrderPaymentLabel(order))}
                ${myOrderDetailRow("付款方式", order?.paymentMethod)}
                ${myOrderDetailRow("希望寄出", order?.requestedShippingBatchLabel)}
                ${myOrderDetailRow("確定出貨", order?.expectedShippingDate)}
                ${myOrderDetailRow("實際寄出", order?.actualShippingDate)}
                ${myOrderDetailRow("物流單號", order?.trackingNo)}
                ${myOrderDetailRow("收件人", order?.recipientName)}
                ${myOrderDetailRow("聯絡電話", order?.recipientPhone)}
                ${myOrderDetailRow("配送地址", order?.recipientAddress)}
                ${myOrderDetailRow("黑貓運費", `$${Number(order?.shippingFee || 0).toLocaleString("zh-TW")}`)}
                ${myOrderDetailRow("最後更新", order?.lastUpdatedAt)}
                ${myOrderDetailRow("備註", order?.customerNote)}
               </div>
              <div class="my-order-items"><strong>商品明細</strong>\n${escapeHtml(order?.itemsSummary || "無商品資料")}</div>
            </div>
          </details>
        </article>`;
    })
    .join("");

  if (focusOrderNo) {
    window.requestAnimationFrame(() => {
      document
        .getElementById(`my-order-${focusOrderNo}`)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }
}

// ⚡ 核心修復：DOMContentLoaded 時啟動 LIFF 與基礎事件綁定
async function initializeOrderPage() {
  console.log("DOM 載入完成，啟動 LIFF 初始化...");
  // LINE 驗證要立即開始，不要被商品 API 的網路速度卡住。
  initializeLineIdentity()
    .then(() => {
      if (lineLoginRedirectInProgress) return;
      return checkLineOfficialAccountFriendship({ showGate: true });
    })
    .catch((error) => {
      console.error("LIFF 初始化失敗:", error);
      lineFriendshipState = "error";
      showLineFriendGate("LINE 登入或好友狀態確認失敗，請重新整理頁面後再試。");
    });

  const initialViewParams = getInitialCustomerViewParams();
  if (initialViewParams.get("view") === "orders") {
    openMyOrders(initialViewParams.get("order") || "", {
      updateUrl: false,
      smooth: false,
    });
  }

  await fetchPublicProductCatalog();
  renderPublicProductCatalog();

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

  const addressDetailInput = document.getElementById("address_detail");
  if (addressDetailInput)
    addressDetailInput.addEventListener("input", calculate);
  const addressSelectorWrap = document.getElementById("twzipcode_wrap");
  if (addressSelectorWrap)
    addressSelectorWrap.addEventListener("change", calculate);

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

  document
    .getElementById("lineFriendRecheck")
    ?.addEventListener("click", recheckLineOfficialAccountFriendship);
  document.getElementById("lineAddFriendLink")?.addEventListener("click", () => {
      const message = document.getElementById("lineFriendGateMessage");
      if (message) {
        message.textContent =
          "加入完成後請回到本頁，按「我已加入，重新確認」。";
      }
    });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeOrderPage);
} else {
  initializeOrderPage();
}

function getActivePublicProducts() {
  return PUBLIC_PRODUCT_CATALOG.filter(
    (product) => product.active === true,
  ).sort((a, b) => a.sortOrder - b.sortOrder);
}

async function fetchPublicProductCatalog() {
  try {
    const requestUrl = new URL(GAS_ORDERS_API_URL);
    requestUrl.searchParams.set("action", "readPublicProductCatalog");
    requestUrl.searchParams.set("t", String(Date.now()));

    const response = await fetch(requestUrl.toString(), {
      method: "GET",
      cache: "no-store",
    });
    const payload = await response.json();

    if (
      !response.ok ||
      payload?.ok !== true ||
      payload?.action !== "readPublicProductCatalog" ||
      !Array.isArray(payload.products)
    ) {
      throw new Error("PRODUCT_CATALOG_UNAVAILABLE");
    }

    const products = payload.products.map(normalizePublicCatalogProduct);
    if (!products.length) throw new Error("PRODUCT_CATALOG_EMPTY");

    PUBLIC_PRODUCT_CATALOG = products;
    applyPublicSiteSettings(payload.siteSettings);
  } catch (error) {
    console.warn("商品清單讀取失敗，改用前台備援商品：", error);
    PUBLIC_PRODUCT_CATALOG = [...PUBLIC_PRODUCT_CATALOG_FALLBACK];
  }
}

function applyPublicSiteSettings(siteSettings) {
  const bannerUrl = String(siteSettings?.bannerImageUrl ?? "").trim();
  const bannerImg = document.querySelector(".product-banner img");
  if (bannerImg && bannerUrl) {
    bannerImg.src = bannerUrl;
  }
}

function normalizePublicCatalogProduct(product) {
  const stockValue =
    product?.stock === null || product?.stock === ""
      ? null
      : Number(product?.stock);

  return {
    id: String(product?.id ?? "").trim(),
    code: String(product?.code ?? "").trim(),
    variety: String(product?.variety ?? "").trim(),
    category: normalizePublicProductCategory(product?.category),
    grade: String(product?.grade ?? "").trim(),
    weight: "",
    count: String(product?.count ?? "").trim(),
    price: Number(product?.price),
    stock: Number.isInteger(stockValue) && stockValue >= 0 ? stockValue : null,
    active: product?.active === true,
    sortOrder: Number(product?.sortOrder),
  };
}

function normalizePublicProductCategory(category) {
  const text = String(category ?? "").trim();
  if (text === "兩粒裝" || text === "兩顆裝" || text === "兩顆禮盒") {
    return "兩粒禮盒";
  }
  return text || "一般禮盒";
}

function isTwoPieceCategory(category) {
  return normalizePublicProductCategory(category) === "兩粒禮盒";
}

function renderPublicProductCatalog() {
  const sectionRoot = document.getElementById("productCatalogSections");
  const tabsRoot = document.getElementById("productVarietyTabs");
  if (!sectionRoot || !tabsRoot) return;

  const products = getActivePublicProducts();
  const groups = groupProductsByVariety(products);
  tabsRoot.innerHTML = "";

  sectionRoot.innerHTML = `
    ${groups.map(renderProductVarietyPanel).join("")}
    <p class="product-category-note product-category-note-dynamic" id="twoPieceOrderNotice" style="display: none">
      兩顆裝禮盒一次需購買 6 盒才享免運；未滿 6 盒暫不出貨。
    </p>
  `;
  calculate();
}

function groupProductsByVariety(products) {
  const groupMap = {};
  products.forEach((product) => {
    if (!groupMap[product.variety]) {
      groupMap[product.variety] = [];
    }
    groupMap[product.variety].push(product);
  });
  return Object.keys(groupMap).map((variety) => ({
    variety,
    products: groupMap[variety],
  }));
}

function renderProductVarietyPanel(group) {
  const hasLimited = group.products.some(hasLimitedStock);
  const hasTwoPiece = group.products.some((product) =>
    isTwoPieceCategory(product.category),
  );
  const hint = hasTwoPiece
    ? "兩顆裝禮盒一次需購買 6 盒；未滿 6 盒無法出貨敬請見諒。"
    : hasLimited
      ? "因氣候影響，產量減少限量供應，有需要的朋友請提前訂購"
      : "可直接調整盒數，系統會自動計算運費。";

  return `
    <section class="product-order-panel product-variety-panel">
      <div class="product-category-heading">
        <div>
          <h2>${escapeHtml(group.variety)}</h2>
        </div>
        <span>${hasLimited ? "部分庫存有限" : "本期供應"}</span>
      </div>
      <div class="product-panel-hint">${hint}</div>
      <div class="product-direct-list">
        ${group.products.map(renderDirectProductRow).join("")}
      </div>
    </section>
  `;
}

function renderDirectProductRow(product) {
  const isTwoPiece = isTwoPieceCategory(product.category);
  const categoryBadge = isTwoPiece
    ? '<span class="product-direct-badge">兩顆裝</span>'
    : "";
  const stockText = hasLimitedStock(product)
    ? `<div class="product-direct-meta"><span class="product-direct-stock">剩 ${product.stock} 盒</span></div>`
    : "";
  const priceText = Number.isFinite(product.price)
    ? product.price.toLocaleString()
    : "0";

  return `
    <div class="product-direct-row${isTwoPiece ? " product-direct-row-featured" : ""}">
      <div class="product-direct-info">
        <div class="product-direct-title">
          <strong>${escapeHtml(product.grade)} 級別</strong>
          ${categoryBadge}
        </div>
        <div class="product-direct-count">${escapeHtml(product.count)}裝</div>
        <div class="product-direct-price">$${priceText}</div>
        ${stockText}
      </div>
      <div class="product-direct-qty-row">
        <span>訂購數量：</span>
        ${renderQtyControl(product, "qty-input product-direct-input")}
      </div>
    </div>
  `;
}

function getCategoryDisplayName(category) {
  return isTwoPieceCategory(category) ? "兩顆裝禮盒" : category;
}

function getProductDisplayLabel(product) {
  const category = isTwoPieceCategory(product.category)
    ? "兩顆裝"
    : product.variety;
  const priceText = Number.isFinite(product.price)
    ? product.price.toLocaleString()
    : "0";
  return `${category}｜${product.grade}｜${product.count}｜$${priceText}`;
}

function renderProductOption(product, selectedId = "") {
  const stockText = hasLimitedStock(product) ? `｜剩 ${product.stock} 盒` : "";
  const disabledText =
    product.stock === 0 && product.id !== selectedId ? " disabled" : "";
  const selectedText = product.id === selectedId ? " selected" : "";
  return `<option value="${escapeHtmlAttribute(product.id)}"${selectedText}${disabledText}>${escapeHtml(getProductDisplayLabel(product))}${stockText}</option>`;
}

function hasLimitedStock(product) {
  return Number.isInteger(product.stock) && product.stock >= 0;
}

function getSelectedProductQty(id) {
  const hiddenInput = findQtyInputByDataValue("id", id, ".qty-input");
  return parseInt(hiddenInput?.value || "0", 10) || 0;
}

function getRemainingStock(product) {
  if (!hasLimitedStock(product)) return null;
  return Math.max(0, product.stock - getSelectedProductQty(product.id));
}

function renderHiddenQtyInput(product) {
  return renderQtyControl(product, "qty-input");
}

function getPublicProductById(id) {
  return PUBLIC_PRODUCT_CATALOG.find((product) => product.id === id) || null;
}

function renderSelectedProductList() {
  updateTwoPieceOrderNotice();
  renderSelectedProductSummary();
}

function getSelectedOrderItemsFromHiddenInputs() {
  return [...document.querySelectorAll(".qty-input")]
    .map((input) => ({
      id: input.getAttribute("data-id"),
      variety: input.getAttribute("data-variety"),
      category: input.getAttribute("data-category"),
      level: input.getAttribute("data-level"),
      count: input.getAttribute("data-count"),
      price: parseInt(input.getAttribute("data-price"), 10) || 0,
      stock: parseOptionalInteger(input.getAttribute("data-stock")),
      qty: parseInt(input.value, 10) || 0,
    }))
    .filter((item) => item.qty > 0);
}

function renderSelectedProductSummary() {
  const summary = document.getElementById("selectedProductSummary");
  if (!summary) return;

  const items = getSelectedOrderItemsFromHiddenInputs();
  if (!items.length) {
    summary.innerHTML = `
      <div class="selected-summary-title">已選商品</div>
      <div class="selected-summary-empty">尚未選擇商品</div>
    `;
    return;
  }

  summary.innerHTML = `
    <div class="selected-summary-title">已選商品</div>
    <div class="selected-summary-list">
      ${items
        .map((item) => {
          const product = getPublicProductById(item.id);
          const label = product ? getProductDisplayLabel(product) : item.level;
          const stockText = Number.isInteger(item.stock)
            ? `<span class="selected-summary-stock">剩 ${Math.max(0, item.stock - item.qty)} 盒</span>`
            : "";
          return `
            <div class="selected-summary-item">
              <span>${escapeHtml(label)}</span>
              <strong>× ${item.qty}</strong>
              ${stockText}
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}

function updateTwoPieceOrderNotice() {
  const notice = document.getElementById("twoPieceOrderNotice");
  if (!notice) return;

  const hasTwoPieceSelected = getSelectedOrderItemsFromHiddenInputs().some(
    (item) => isTwoPieceCategory(item.category),
  );
  notice.style.display = hasTwoPieceSelected ? "" : "none";
}

function parseOptionalInteger(value) {
  if (value === null || value === "") return null;
  const parsed = parseInt(value, 10);
  return Number.isInteger(parsed) ? parsed : null;
}

function getSelectedQuantitiesByCode() {
  const selected = {};
  document.querySelectorAll(".qty-input").forEach((input) => {
    const code = String(input.getAttribute("data-code") || "").trim();
    const qty = parseInt(input.value, 10) || 0;
    if (code && qty > 0) selected[code] = qty;
  });
  return selected;
}

function applySelectedQuantitiesByCode(selected) {
  Object.entries(selected).forEach(([code, qty]) => {
    const input = findQtyInputByDataValue("code", code, ".qty-input");
    if (!input) return;
    syncAndCalculate(input.getAttribute("data-id"), qty);
  });
}

function parseStockInsufficientError(message) {
  const prefix = "PRODUCT_STOCK_INSUFFICIENT::";
  if (!String(message || "").startsWith(prefix)) return null;

  try {
    const payload = JSON.parse(String(message).slice(prefix.length));
    return Array.isArray(payload?.items) ? payload.items : null;
  } catch (error) {
    return null;
  }
}

async function handleStockInsufficientSubmitError(message) {
  const shortageItems = parseStockInsufficientError(message);
  if (!shortageItems) return false;

  const selected = getSelectedQuantitiesByCode();
  shortageItems.forEach((item) => {
    const code = String(item?.code || "").trim();
    const available = parseOptionalInteger(item?.available);
    if (code && Number.isInteger(available)) {
      selected[code] = Math.max(0, available);
    }
  });

  await fetchPublicProductCatalog();
  renderPublicProductCatalog();
  applySelectedQuantitiesByCode(selected);

  const lines = shortageItems.map((item) => {
    const grade = String(item?.grade || item?.code || "商品").trim();
    const requested = parseOptionalInteger(item?.requested);
    const available = parseOptionalInteger(item?.available);
    if (available === 0) {
      return `${grade} 已售完，請刪除這項商品。`;
    }
    return `${grade} 目前只剩 ${available} 盒，請把數量改小後再送出。`;
  });

  alert(["庫存不足，訂單尚未送出。", ...lines].join("\n"));
  return true;
}

function renderQtyControl(product, inputClass) {
  return `
    <div class="qty-control">
      <button type="button" class="qty-btn" onclick="stepQty(this, -1)">-</button>
      <input
        type="number"
        class="${escapeHtmlAttribute(inputClass)}"
        data-id="${escapeHtmlAttribute(product.id)}"
        data-code="${escapeHtmlAttribute(product.code)}"
        data-level="${escapeHtmlAttribute(product.grade)}"
        data-variety="${escapeHtmlAttribute(product.variety)}"
        data-category="${escapeHtmlAttribute(product.category)}"
        data-weight="${escapeHtmlAttribute(product.weight)}"
        data-count="${escapeHtmlAttribute(product.count)}"
        data-price="${escapeHtmlAttribute(product.price)}"
        data-stock="${hasLimitedStock(product) ? product.stock : ""}"
        min="0"
        value="0"
        onchange="syncAndCalculate(this.dataset.id, this.value)"
      />
      <button type="button" class="qty-btn" onclick="stepQty(this, 1)">+</button>
    </div>
  `;
}

// 付款方式切換邏輯
function handlePaymentChange() {
  calculate();
}

function getCurrentShippingAddress() {
  const countySel = document.querySelector("#twzipcode_wrap .county");
  const districtSel = document.querySelector("#twzipcode_wrap .district");
  const county = countySel ? countySel.value : "";
  const district = districtSel ? districtSel.value : "";
  const detailAddrEl = document.getElementById("address_detail");
  const detailAddr = detailAddrEl ? detailAddrEl.value : "";
  return `${county}${district}${detailAddr}`;
}

function isOffshoreShippingAddress(address) {
  const text = String(address || "");
  return OFFSHORE_SHIPPING_KEYWORDS.some((keyword) => text.includes(keyword));
}

function calculateShippingFeeByAddress(totalBoxes, address) {
  if (totalBoxes <= 0) return 0;

  if (isOffshoreShippingAddress(address)) {
    const fullGroups = Math.floor(totalBoxes / 3);
    const remainder = totalBoxes % 3;
    const remainderFee = remainder === 1 ? 300 : remainder === 2 ? 350 : 0;
    return fullGroups * 400 + remainderFee;
  }

  const remainder = totalBoxes % 3;
  if (remainder === 1) return 150;
  if (remainder === 2) return 250;
  return 0;
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
    const requestUrl = new URL(GAS_ORDERS_API_URL);
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
    updateOrderSubmitAvailability();
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
  const minValue = parseInt(input.getAttribute("min"), 10);
  const safeMin = Number.isInteger(minValue) ? minValue : 0;
  currentVal += step;
  if (currentVal < safeMin) currentVal = safeMin;
  input.value = currentVal;

  // 觸發變更事件以利同步
  input.dispatchEvent(new Event("change"));
}

// 雙向同步桌機與手機版數量
function syncAndCalculate(id, val) {
  let intVal = parseInt(val) || 0;
  const product = getPublicProductById(id);
  if (product && hasLimitedStock(product) && intVal > product.stock) {
    intVal = product.stock;
    alert(`${product.grade} 目前剩 ${product.stock} 盒。`);
  }
  const pcInput = findQtyInputByDataValue("id", id, ".qty-input");
  const mobileInput = findQtyInputByDataValue("id", id, ".qty-input-mobile");

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

  const shippingFee = calculateShippingFeeByAddress(
    totalBoxes,
    getCurrentShippingAddress(),
  );

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
  renderSelectedProductList();
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

  if (
    lineFriendshipState !== "friend" &&
    !(await checkLineOfficialAccountFriendship({ showGate: true }))
  ) {
    return;
  }

  let lineIdToken =
    typeof liff !== "undefined" && typeof liff.getIDToken === "function"
      ? liff.getIDToken()
      : "";
  let lineAccessToken =
    typeof liff !== "undefined" && typeof liff.getAccessToken === "function"
      ? liff.getAccessToken()
      : "";

  // 點送出時若 LIFF 還沒就緒，主動等它完成並重取憑證。
  if (!lineIdToken && !lineAccessToken) {
    try {
      await initializeLineIdentity();
    } catch (error) {
      console.error("送單前 LINE 身分確認失敗:", error);
    }

    lineIdToken =
      typeof liff !== "undefined" && typeof liff.getIDToken === "function"
        ? liff.getIDToken()
        : "";
    lineAccessToken =
      typeof liff !== "undefined" && typeof liff.getAccessToken === "function"
        ? liff.getAccessToken()
        : "";
  }

  if (!lineIdToken && !lineAccessToken) {
    alert("錯誤：尚未成功取得 LINE 身分驗證，請重新開啟訂購頁後再送出。");
    return;
  }

  // 若 profile 請求失敗，後端仍會從已驗證 token 安全取得 UID。
  const lineUserId =
    document.getElementById("lineUserIdInput").value || currentUserId;

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
      if (isTwoPieceCategory(input.getAttribute("data-category"))) {
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
    alert("蔗香梨兩顆裝禮盒一次需購買 6 盒才享免運；未滿 6 盒暫不出貨。");
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
    orderSubmitInProgress = true;
    updateOrderSubmitAvailability();
  }

  try {
    const myGasUrl = GAS_ORDERS_API_URL;
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
    data.orderNo = String(result.orderNo || "").trim();
    myOrdersLoaded = false;

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

    const {
      lineUserId: _lineUserId,
      idToken: _idToken,
      accessToken: _accessToken,
      ...historyOrder
    } = data;
    orderHistoryList.push(historyOrder);
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
      LINE_UID_MISMATCH: "LINE 身分資料不一致，請重新開啟 LINE 訂購頁後再試。",
      PUBLIC_ORDER_REQUIRED_FIELDS: "訂購資料未填完整，請檢查必填欄位。",
      PUBLIC_ORDER_PHONE_INVALID: "電話格式不正確，請重新確認電話號碼。",
      ORDER_AMOUNT_MISMATCH: "訂單金額驗證失敗，請重新整理頁面後再送出。",
      ORDER_SHIPPING_FEE_MISMATCH: "運費驗證失敗，請重新整理頁面後再送出。",
      ORDER_BOXES_MISMATCH: "盒數驗證失敗，請重新整理頁面後再送出。",
      PRODUCT_CATALOG_NOT_FOUND:
        "商品資料暫時無法讀取，請稍後再試，或聯絡小幫手確認後台設定。",
    };
    if (btn) {
      btn.innerText = originalBtnText;
      orderSubmitInProgress = false;
      updateOrderSubmitAvailability();
    }

    if (message === "LINE_OFFICIAL_ACCOUNT_FRIEND_REQUIRED") {
      lineFriendshipState = "not_friend";
      try {
        await fetchLineOfficialAccountFriendUrl();
      } catch (friendUrlError) {
        console.error("取得官方 LINE 加好友網址失敗:", friendUrlError);
      }
      showLineFriendGate(
        "為了確保訂購小卡能送達，請先加入三合院農園官方 LINE。",
      );
      return;
    }

    if (await handleStockInsufficientSubmitError(message)) {
      return;
    }

    alert(friendlyMessages[message] || `訂單送出失敗，請稍後再試\n${message}`);
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
    orderSubmitInProgress = false;
    updateOrderSubmitAvailability();
  }

  if (document.getElementById("successBlock"))
    document.getElementById("successBlock").style.display = "none";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeHtmlAttribute(value) {
  return escapeHtml(value).replace(/`/g, "&#96;");
}

function findQtyInputByDataValue(dataKey, value, selector) {
  const expected = String(value ?? "");
  return [...document.querySelectorAll(selector)].find(
    (input) => String(input.dataset?.[dataKey] ?? "") === expected,
  );
}

// 歷史多單列表渲染（連單功能）
function renderHistoryList() {
  const container = document.getElementById("historyContainer");
  if (!container) return;
  container.innerHTML = "";

  orderHistoryList.forEach((order, index) => {
    const itemDetailsArray = (order.items || []).map((item) => {
      const itemSubtotal = parseInt(item.price) * parseInt(item.qty);
      return `${escapeHtml(item.level)} (單價$${parseInt(item.price).toLocaleString()} × ${escapeHtml(item.qty)}盒 = $${itemSubtotal.toLocaleString()})`;
    });
    const itemDetailsText = itemDetailsArray.join("<br>     ");

    const shippingFee = String(order.shippingFee ?? "");
    const isFreeShipping = parseInt(shippingFee.replace(/,/g, "")) === 0;
    const shippingText = isFreeShipping
      ? `<span style="color: var(--primary-color); font-weight: bold;">免運費 (0元)</span>`
      : `$ ${escapeHtml(shippingFee)} 元`;

    const codFeeText =
      order.codFee === "30"
        ? `<div class="history-item-row"><span class="history-item-label">物流手續費：</span><span style="color:var(--accent-color);">$ 30 元</span></div>`
        : "";

    const noteHtml = order.note
      ? `<div class="history-item-row"><span class="history-item-label">備註說明：</span><span style="color: var(--accent-color); font-weight: bold;">${escapeHtml(order.note)}</span></div>`
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
      $ ${escapeHtml(order.total)}
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
  <span>${escapeHtml(order.name)}</span>
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
  <span>${escapeHtml(order.phone)}</span>
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
    ${escapeHtml(order.address)}
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
                    ? `<div class="history-item-row"><span class="history-item-label" style="color:var(--text-muted);">希望寄出批次：</span><span style="font-weight:bold;">${escapeHtml(order.requestedShippingBatchLabel)}</span></div>`
                    : `<div class="history-item-row"><span class="history-item-label" style="color:var(--text-muted);">預訂出貨日：</span><span style="font-weight:bold;">${escapeHtml(order.shippingDate || "")}</span></div>`
                }
                <div class="history-item-row" style="border-top: 1px solid #F5F2EC; margin-top: 6px; padding-top: 6px;">
                  <span class="history-item-label" style="color:var(--text-muted);">寄件人姓名：</span><span>${escapeHtml(order.senderName)}</span>
                </div>
                <div class="history-item-row" style="background-color: var(--secondary-color); padding: 8px 12px; border-radius: 8px; margin-top: 10px;">
                  <span class="history-item-label" style="color: var(--primary-color); font-weight: bold;">付款狀態：</span>
                  <span style="color: var(--primary-color); font-weight: bold;">${escapeHtml(order.paymentMethod)}（後台處理中）</span>
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
