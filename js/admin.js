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
    renderTable();
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
    msgEl.textContent = "저장 중…";
    fetch(API, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (res.ok) {
          msgEl.textContent = "✅ 저장되었습니다";
          setTimeout(function () { modal.hidden = true; load(); }, 700);
        } else {
          msgEl.textContent = "실패: " + (res.error || "");
        }
      })
      .catch(function () { msgEl.textContent = "전송 실패"; });
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
        renderTable();
      });
    });

    document.body.addEventListener("click", function (e) {
      var pay = e.target.closest("[data-pay]");
      if (pay) openPay(pay.dataset.pay, num(pay.dataset.total), pay.dataset.name);
      var ship = e.target.closest("[data-ship]");
      if (ship) openShip(ship.dataset.ship, ship.dataset.name);
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
