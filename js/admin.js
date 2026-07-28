/* ============================================================
   관리자 페이지 로직 — Apps Script 웹앱과 통신
   ============================================================ */
(function () {
  "use strict";
  var CFG = window.FARM_CONFIG || {};
  var API = CFG.orderEndpoint || "";
  var won = function (n) { return (Number(n) || 0).toLocaleString("ko-KR") + "원"; };
  var num = function (s) { return Number(String(s).replace(/[^0-9.-]/g, "")) || 0; };

  var state = { token: "", tab: "orders", data: null };
  var $ = function (id) { return document.getElementById(id); };

  // ---------- 로그인 ----------
  function login() {
    var pw = $("pw").value.trim();
    if (!pw) return;
    if (!API) { $("loginErr").textContent = "config.js 의 orderEndpoint(웹앱 URL)를 먼저 설정하세요."; return; }
    $("loginErr").textContent = "확인 중…";
    state.token = pw;
    load(function (ok) {
      if (ok) {
        sessionStorage.setItem("adminToken", pw);
        $("loginBox").hidden = true;
        $("app").hidden = false;
      } else {
        $("loginErr").textContent = "비밀번호가 올바르지 않습니다.";
      }
    });
  }

  // ---------- 데이터 로드 ----------
  function load(cb) {
    fetch(API + "?action=admin&token=" + encodeURIComponent(state.token))
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (!res.ok) { cb && cb(false); return; }
        state.data = res;
        render();
        cb && cb(true);
      })
      .catch(function () { cb && cb(false); });
  }

  // ---------- 렌더 ----------
  function render() {
    var s = state.data.summary || {};
    $("stats").innerHTML =
      stat("오늘 주문", s.todayCount + "건") +
      stat("오늘 매출", won(s.todaySum)) +
      stat("미수금 잔액", won(s.unpaidSum)) +
      stat("어머니 미정산", won(s.motherUnsettled), "mother");
    renderView();
  }

  // 탭에 따라 주문 표 / 상품관리 패널 전환
  function renderView() {
    var isProd = state.tab === "products";
    $("ordersPanel").hidden = isProd;
    $("productsPanel").hidden = !isProd;
    if (isProd) renderProductsPanel();
    else renderTable();
  }
  function stat(label, val, cls) {
    return '<div class="stat ' + (cls || "") + '"><span>' + label + "</span><b>" + val + "</b></div>";
  }

  function renderTable() {
    var list = state.tab === "unpaid" ? state.data.unpaid : state.data.orders;
    var tbody = document.querySelector("#tbl tbody");
    if (!list || !list.length) {
      tbody.innerHTML = '<tr><td class="muted">주문이 없습니다.</td></tr>';
      return;
    }
    var head =
      "<tr><th>주문번호</th><th>주문자</th><th>연락처</th><th>합계</th>" +
      "<th>수금</th><th>상태</th><th>처리</th></tr>";
    var rows = list.map(function (o) {
      var pay = pill(o.payStatus);
      var st = pill(o.status);
      var actions =
        '<button class="btn-sm" data-pay="' + o.orderNo + '" data-total="' + num(o.total) + '" data-name="' + o.name + '">수금등록</button> ' +
        '<button class="btn-sm ship" data-ship="' + o.orderNo + '" data-name="' + o.name + '">발송</button>';
      return "<tr><td><b>" + o.orderNo + "</b><br><small style='color:#6a6472'>" + (o.date || "") + "</small></td>" +
        "<td>" + o.name + "</td><td>" + o.phone + "</td><td>" + o.total + "</td>" +
        "<td>" + pay + "</td><td>" + st + (o.tracking ? "<br><small>" + o.tracking + "</small>" : "") + "</td>" +
        "<td>" + actions + "</td></tr>";
    }).join("");
    tbody.innerHTML = head + rows;
  }
  function pill(v) {
    if (!v || v === "-") return "-";
    return '<span class="pill pill--' + v + '">' + v + "</span>";
  }

  // ---------- 상품관리 ----------
  function renderProductsPanel() {
    var list = (state.data && state.data.products) || [];
    var box = $("prodList");
    if (!box) return;
    box.innerHTML = list.map(function (p) { return prodCard(p, false); }).join("") ||
      '<p class="muted">등록된 상품이 없습니다. ‘＋ 새 상품 추가’ 로 등록하세요.</p>';
  }

  function esc(s) { return String(s == null ? "" : s).replace(/"/g, "&quot;"); }

  function prodCard(p, isNew) {
    p = p || {};
    var cat = p.category || "생과";
    var opt = function (v) { return '<option' + (cat === v ? " selected" : "") + ">" + v + "</option>"; };
    var saleY = (p.sale === false || p.sale === "N") ? "" : " selected";
    var saleN = (p.sale === false || p.sale === "N") ? " selected" : "";
    return (
      '<div class="prod' + (isNew ? " new" : "") + '" data-code="' + esc(p.code) + '">' +
      '<div class="prod__grid">' +
      '<div class="f-code"><label>상품코드' + (isNew ? " (영문·숫자)" : "") + '</label>' +
        '<input data-f="code" value="' + esc(p.code) + '"' + (isNew ? ' placeholder="예: BB-FR-1"' : " readonly") + "></div>" +
      '<div class="f-name"><label>상품명</label><input data-f="name" value="' + esc(p.name) + '"></div>' +
      '<div><label>구분</label><select data-f="category">' + opt("생과") + opt("냉동") + opt("가공") + "</select></div>" +
      '<div><label>규격</label><input data-f="unit" value="' + esc(p.unit) + '" placeholder="1kg"></div>' +
      '<div><label>단가(원)</label><input data-f="price" type="number" value="' + (p.price || 0) + '"></div>' +
      '<div><label>재고</label><input data-f="stock" type="number" value="' + (p.stock || 0) + '"></div>' +
      '<div><label>판매여부</label><select data-f="sale"><option value="Y"' + saleY + ">판매중</option><option value=\"N\"" + saleN + ">숨김</option></select></div>" +
      '<div class="f-desc"><label>설명</label><input data-f="desc" value="' + esc(p.desc) + '"></div>' +
      '<div class="f-img"><label>이미지 경로 (예: img/bb-1kg.jpg)</label><input data-f="img" value="' + esc(p.img) + '"></div>' +
      "</div>" +
      '<div class="prod__foot">' +
      (isNew ? "" : '<button class="btn-del" data-del-prod>삭제</button>') +
      '<button class="btn-sm" data-save-prod>저장</button>' +
      "</div></div>"
    );
  }

  function collectProd(row) {
    var get = function (f) { var el = row.querySelector('[data-f="' + f + '"]'); return el ? el.value.trim() : ""; };
    return {
      code: get("code"), name: get("name"), category: get("category"), unit: get("unit"),
      price: num(get("price")), stock: num(get("stock")), sale: get("sale"),
      desc: get("desc"), img: get("img"),
    };
  }

  function saveProd(row) {
    var data = collectProd(row);
    if (!data.code) { alert("상품코드를 입력하세요."); return; }
    if (!data.name) { alert("상품명을 입력하세요."); return; }
    post(Object.assign({ action: "saveProduct", token: state.token }, data), null, null);
  }

  function delProd(row) {
    var code = row.dataset.code;
    if (!confirm("‘" + code + "’ 상품을 삭제할까요?")) return;
    post({ action: "deleteProduct", token: state.token, code: code }, null, null);
  }

  function addProdRow() {
    var box = $("prodList");
    var wrap = document.createElement("div");
    wrap.innerHTML = prodCard({ category: "생과", sale: "Y" }, true);
    box.insertBefore(wrap.firstChild, box.firstChild);
  }

  // ---------- 액션: 수금등록 / 발송 ----------
  function openPay(orderNo, total, name) {
    $("payOrderInfo").textContent = orderNo + " · " + name + " · 합계 " + won(total);
    $("payAmount").value = total;
    $("payMethod").value = "통장";
    $("payReceiver").value = "";
    $("payMsg").textContent = "";
    $("payModal").dataset.order = orderNo;
    $("payModal").hidden = false;
  }
  function submitPay() {
    var orderNo = $("payModal").dataset.order;
    post({
      action: "collect", token: state.token, orderNo: orderNo,
      amount: num($("payAmount").value), method: $("payMethod").value,
      receiver: $("payReceiver").value.trim(),
    }, $("payMsg"), $("payModal"));
  }
  function openShip(orderNo, name) {
    $("shipOrderInfo").textContent = orderNo + " · " + name;
    $("shipCourier").value = "";
    $("shipTracking").value = "";
    $("shipMsg").textContent = "";
    $("shipModal").dataset.order = orderNo;
    $("shipModal").hidden = false;
  }
  function submitShip() {
    var orderNo = $("shipModal").dataset.order;
    post({
      action: "ship", token: state.token, orderNo: orderNo,
      courier: $("shipCourier").value.trim(), tracking: $("shipTracking").value.trim(),
    }, $("shipMsg"), $("shipModal"));
  }

  function post(payload, msgEl, modal) {
    if (msgEl) msgEl.textContent = "저장 중…";
    fetch(API, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (res.ok) {
          if (msgEl) msgEl.textContent = "✅ 저장되었습니다";
          setTimeout(function () { if (modal) modal.hidden = true; load(); }, 700);
        } else {
          if (msgEl) msgEl.textContent = "실패: " + (res.error || "");
          else alert("실패: " + (res.error || ""));
        }
      })
      .catch(function () { if (msgEl) msgEl.textContent = "전송 실패"; else alert("전송 실패"); });
  }

  // ---------- 이벤트 ----------
  document.addEventListener("DOMContentLoaded", function () {
    $("loginBtn").addEventListener("click", login);
    $("pw").addEventListener("keydown", function (e) { if (e.key === "Enter") login(); });
    $("logoutBtn").addEventListener("click", function () {
      sessionStorage.removeItem("adminToken");
      location.reload();
    });
    $("refreshBtn").addEventListener("click", function () { load(); });

    document.querySelectorAll(".tabs button").forEach(function (b) {
      b.addEventListener("click", function () {
        document.querySelectorAll(".tabs button").forEach(function (x) { x.classList.remove("is-active"); });
        b.classList.add("is-active");
        state.tab = b.dataset.tab;
        renderView();
      });
    });

    $("addProdBtn").addEventListener("click", addProdRow);

    document.body.addEventListener("click", function (e) {
      var pay = e.target.closest("[data-pay]");
      if (pay) openPay(pay.dataset.pay, num(pay.dataset.total), pay.dataset.name);
      var ship = e.target.closest("[data-ship]");
      if (ship) openShip(ship.dataset.ship, ship.dataset.name);
      var savep = e.target.closest("[data-save-prod]");
      if (savep) saveProd(savep.closest(".prod"));
      var delp = e.target.closest("[data-del-prod]");
      if (delp) delProd(delp.closest(".prod"));
      if (e.target.matches("[data-close]")) {
        $("payModal").hidden = true; $("shipModal").hidden = true;
      }
    });
    $("paySubmit").addEventListener("click", submitPay);
    $("shipSubmit").addEventListener("click", submitShip);

    // 세션 자동 로그인
    var saved = sessionStorage.getItem("adminToken");
    if (saved) { $("pw").value = saved; login(); }
  });
})();
