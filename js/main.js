/* ============================================================
   익산 블루베리 농장 — 메인 스크립트
   상품 렌더링 / 수량·합계 계산 / 주문 접수
   ============================================================ */
(function () {
  "use strict";

  const CFG = window.FARM_CONFIG || {};
  let PRODUCTS = [];
  let qty = {}; // 상품별 현재 수량 상태 { 상품코드: 수량 }
  const won = (n) => (n || 0).toLocaleString("ko-KR") + "원";

  // 상품 목록 세팅 (판매중만) + 수량 초기화
  function setProducts(list) {
    PRODUCTS = (list || []).filter((p) => p.sale !== false);
    qty = {};
    PRODUCTS.forEach((p) => (qty[p.code] = 0));
  }

  // 상품 로드: 백엔드(orderEndpoint) 연동 시 구글시트에서 실시간 조회, 아니면 products.js 예시로 폴백
  function loadProducts() {
    const fallback = window.FARM_PRODUCTS || [];
    if (!CFG.orderEndpoint) return Promise.resolve(fallback);
    return fetch(CFG.orderEndpoint + "?action=products")
      .then((r) => r.json())
      .then((res) => (res && res.ok && res.products && res.products.length) ? res.products : fallback)
      .catch(() => fallback);
  }

  // ---------- 설정값을 페이지에 주입 ----------
  function applyConfig() {
    document.querySelectorAll("[data-farm-name]").forEach((el) => {
      if (CFG.farmName) el.textContent = CFG.farmName;
    });
    setText("[data-tagline]", CFG.tagline);
    setText("[data-intro]", CFG.intro);
    setText("[data-location]", CFG.location);
    setText("[data-cert]", CFG.certNumber);

    // 연락처 (여러 곳: 농장이야기·푸터)
    if (CFG.phone) {
      document.querySelectorAll("[data-phone-link]").forEach((el) => {
        el.textContent = CFG.phone;
        el.setAttribute("href", "tel:" + CFG.phone.replace(/[^0-9+]/g, ""));
      });
    }
    // 이메일 (링크 + 방침 내 표기)
    if (CFG.email) {
      document.querySelectorAll("[data-email-link]").forEach((el) => {
        el.textContent = CFG.email;
        el.setAttribute("href", "mailto:" + CFG.email);
      });
      setText("[data-email-plain]", CFG.email);
    }
    setText("[data-phone-plain]", CFG.phone);
    // 카카오 채널
    const kakao = document.querySelector("[data-kakao-slot]");
    if (kakao && CFG.kakaoChannelUrl) {
      kakao.innerHTML =
        '💬 <a href="' + CFG.kakaoChannelUrl + '" target="_blank" rel="noopener">카카오톡 채널</a>';
    }
    // 사업자 정보 (있는 항목만 표시)
    const b = CFG.business || {};
    setText("[data-biz-company]", b.company);
    setText("[data-biz-owner]", b.owner);
    setText("[data-biz-address]", b.address);
    toggleBizLine("[data-biz-reg-line]", "[data-biz-reg]", b.regNumber);
    toggleBizLine("[data-biz-mail-line]", "[data-biz-mail]", b.mailOrderNumber);

    // 계좌 박스 (주문 섹션)
    renderAccount();
    // 연도
    const y = document.getElementById("year");
    if (y) y.textContent = new Date().getFullYear();
  }

  function setText(sel, val) {
    if (!val) return;
    document.querySelectorAll(sel).forEach((el) => (el.textContent = val));
  }

  // 사업자등록번호/통신판매업 등 값이 있을 때만 해당 줄 표시
  function toggleBizLine(lineSel, valSel, val) {
    const line = document.querySelector(lineSel);
    if (!line) return;
    if (val) {
      line.hidden = false;
      setText(valSel, val);
    } else {
      line.hidden = true;
    }
  }

  function renderAccount() {
    const box = document.getElementById("accountBox");
    const a = CFG.bankAccount || {};
    if (!box) return;
    box.innerHTML =
      "입금 계좌 : <strong>" +
      (a.bank || "") + " " + (a.number || "") +
      "</strong><br />예금주 : " + (a.holder || "");
  }

  // ---------- 상품 카드 렌더링 ----------
  function renderProducts(filter) {
    const grid = document.getElementById("productGrid");
    if (!grid) return;
    const list = filter && filter !== "전체"
      ? PRODUCTS.filter((p) => p.category === filter)
      : PRODUCTS;

    grid.innerHTML = list
      .map((p) => {
        const src = p.img || defaultImg(p.category);
        const img = '<div class="card__img"><img src="' + src + '" alt="' + p.name + '" loading="lazy" /></div>';
        return (
          '<article class="card">' + img +
          '<div class="card__body">' +
          '<span class="card__tag">' + p.category + "</span>" +
          '<h3 class="card__name">' + p.name + "</h3>" +
          '<p class="card__desc">' + (p.desc || "") + "</p>" +
          '<p class="card__price">' + won(p.price) +
          (p.unit ? ' <small>/ ' + p.unit + "</small>" : "") + "</p>" +
          '<div class="card__add"><button type="button" class="btn btn--primary" data-add="' +
          p.code + '">주문에 담기</button></div>' +
          "</div></article>"
        );
      })
      .join("");
  }

  // 상품에 이미지가 없을 때 구분별 기본 사진
  function defaultImg(category) {
    if (category === "가공") return "img/farm4.jpg";
    if (category === "냉동") return "img/farm4.jpg";
    return "img/farm5.jpg"; // 생과 등 기본
  }

  // ---------- 주문폼 상품 리스트 ----------
  function renderOrderItems() {
    const wrap = document.getElementById("orderItems");
    if (!wrap) return;
    wrap.innerHTML = PRODUCTS.map(
      (p) =>
        '<div class="order__item">' +
        '<div class="order__item-info">' +
        '<div class="order__item-name">' + p.name + "</div>" +
        '<div class="order__item-price">' + won(p.price) + "</div></div>" +
        '<div class="qty">' +
        '<button type="button" data-step="-1" data-code="' + p.code + '" aria-label="수량 감소">−</button>' +
        '<input type="number" min="0" value="' + qty[p.code] + '" data-qty="' + p.code + '" inputmode="numeric" />' +
        '<button type="button" data-step="1" data-code="' + p.code + '" aria-label="수량 증가">+</button>' +
        "</div></div>"
    ).join("");
  }

  // ---------- 합계 계산 ----------
  function calcTotals() {
    let sum = 0;
    PRODUCTS.forEach((p) => (sum += p.price * (qty[p.code] || 0)));
    const s = CFG.shipping || {};
    let ship = 0;
    if (sum > 0) {
      ship = s.fee || 0;
      if (s.freeThreshold != null && sum >= s.freeThreshold) ship = 0;
    }
    document.getElementById("sumProducts").textContent = won(sum);
    document.getElementById("sumShipping").textContent = ship === 0 && sum > 0 ? "무료" : won(ship);
    document.getElementById("sumTotal").textContent = won(sum + ship);
    return { sum, ship, total: sum + ship };
  }

  function setQty(code, val) {
    qty[code] = Math.max(0, parseInt(val, 10) || 0);
    const input = document.querySelector('[data-qty="' + code + '"]');
    if (input) input.value = qty[code];
    calcTotals();
  }

  // ---------- 이벤트 바인딩 ----------
  function bindEvents() {
    // 내비 토글
    const toggle = document.querySelector(".nav__toggle");
    const menu = document.querySelector(".nav__menu");
    if (toggle && menu) {
      toggle.addEventListener("click", () => {
        const open = menu.classList.toggle("is-open");
        toggle.setAttribute("aria-expanded", open);
      });
      menu.querySelectorAll("a").forEach((a) =>
        a.addEventListener("click", () => menu.classList.remove("is-open"))
      );
    }

    // 상품 필터
    document.querySelectorAll(".chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        document.querySelectorAll(".chip").forEach((c) => c.classList.remove("is-active"));
        chip.classList.add("is-active");
        renderProducts(chip.dataset.filter);
      });
    });

    // 이벤트 위임 (카드 담기 / 수량 조절)
    document.body.addEventListener("click", (e) => {
      const add = e.target.closest("[data-add]");
      if (add) {
        setQty(add.dataset.add, (qty[add.dataset.add] || 0) + 1);
        renderOrderItems();
        flashHint("‘" + productName(add.dataset.add) + "’ 담김 · 아래 주문서에서 확인하세요");
        document.getElementById("order").scrollIntoView({ behavior: "smooth" });
      }
      const step = e.target.closest("[data-step]");
      if (step) {
        setQty(step.dataset.code, (qty[step.dataset.code] || 0) + parseInt(step.dataset.step, 10));
      }
      const pv = e.target.closest("[data-privacy]");
      if (pv) { e.preventDefault(); openModal("privacyModal"); }
      if (e.target.matches("[data-close]")) closeModal();
    });

    // 수량 직접 입력
    document.body.addEventListener("input", (e) => {
      if (e.target.matches("[data-qty]")) setQty(e.target.dataset.qty, e.target.value);
    });

    // 주소 검색 (버튼 + 기본주소 칸 클릭)
    const addrBtn = document.getElementById("addrSearchBtn");
    if (addrBtn) addrBtn.addEventListener("click", openPostcode);
    const addr1 = document.getElementById("address1");
    if (addr1) addr1.addEventListener("click", openPostcode);
    const pcClose = document.getElementById("postcodeClose");
    if (pcClose) pcClose.addEventListener("click", closePostcode);

    // 수령인 동일 체크: 체크 시 수령인 칸에 주문자 정보를 그대로 채우고 잠금
    const same = document.getElementById("sameAsOrderer");
    if (same) {
      same.addEventListener("change", syncReceiver);
      const on = document.querySelector("[name=ordererName]");
      const op = document.querySelector("[name=ordererPhone]");
      if (on) on.addEventListener("input", () => { if (same.checked) syncReceiver(); });
      if (op) op.addEventListener("input", () => { if (same.checked) syncReceiver(); });
      syncReceiver(); // 초기 상태(기본 체크) 반영
    }

    // 주문 제출
    const form = document.getElementById("orderForm");
    if (form) form.addEventListener("submit", onSubmit);

    // ESC 로 모달 닫기
    document.addEventListener("keydown", (e) => e.key === "Escape" && closeModal());
  }

  function productName(code) {
    const p = PRODUCTS.find((x) => x.code === code);
    return p ? p.name : code;
  }

  let hintTimer;
  function flashHint(msg) {
    const hint = document.getElementById("orderHint");
    if (!hint) return;
    hint.textContent = msg;
    clearTimeout(hintTimer);
    hintTimer = setTimeout(() => (hint.textContent = ""), 3500);
  }

  // 수령인=주문자 체크 시 수령인 칸을 주문자 값으로 채우고 읽기전용, 해제 시 편집 가능
  function syncReceiver() {
    const same = document.getElementById("sameAsOrderer");
    const rn = document.querySelector("[name=receiverName]");
    const rp = document.querySelector("[name=receiverPhone]");
    const on = document.querySelector("[name=ordererName]");
    const op = document.querySelector("[name=ordererPhone]");
    if (!same || !rn || !rp) return;
    if (same.checked) {
      rn.value = on ? on.value : "";
      rp.value = op ? op.value : "";
      rn.readOnly = true; rp.readOnly = true;
      rn.classList.add("is-locked"); rp.classList.add("is-locked");
    } else {
      rn.readOnly = false; rp.readOnly = false;
      rn.classList.remove("is-locked"); rp.classList.remove("is-locked");
      rn.focus();
    }
  }

  // 주소 3필드(우편번호·기본·상세)를 한 문자열로 합침
  function buildAddress(form) {
    const zip = (form.zipcode ? form.zipcode.value.trim() : "");
    const a1 = (form.address1 ? form.address1.value.trim() : "");
    const a2 = (form.address2 ? form.address2.value.trim() : "");
    return (a1 + " " + a2).trim() + (zip ? " [" + zip + "]" : "");
  }

  // 다음(카카오) 우편번호 서비스 — 폼 안 작은 창(인라인 임베드)
  function openPostcode() {
    if (typeof daum === "undefined" || !daum.Postcode) {
      flashHint("주소 검색을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
      return;
    }
    const box = document.getElementById("postcodeBox");
    const wrap = document.getElementById("postcodeWrap");
    if (!box || !wrap) return;
    wrap.innerHTML = ""; // 이전 임베드 정리
    box.hidden = false;
    new daum.Postcode({
      width: "100%",
      height: "100%",
      maxSuggestItems: 5,
      oncomplete: function (data) {
        const zip = document.getElementById("zipcode");
        const a1 = document.getElementById("address1");
        const a2 = document.getElementById("address2");
        if (zip) zip.value = data.zonecode;
        if (a1) a1.value = data.roadAddress || data.jibunAddress;
        closePostcode();
        if (a2) a2.focus(); // 상세주소 입력으로 이동
      },
    }).embed(wrap);
    box.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
  function closePostcode() {
    const box = document.getElementById("postcodeBox");
    const wrap = document.getElementById("postcodeWrap");
    if (box) box.hidden = true;
    if (wrap) wrap.innerHTML = "";
  }

  // ---------- 주문 제출 ----------
  function onSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const totals = calcTotals();

    // 담은 상품
    const items = PRODUCTS.filter((p) => qty[p.code] > 0).map((p) => ({
      code: p.code, name: p.name, price: p.price, qty: qty[p.code], amount: p.price * qty[p.code],
    }));
    if (items.length === 0) {
      flashHint("주문할 상품을 1개 이상 담아 주세요.");
      document.getElementById("products").scrollIntoView({ behavior: "smooth" });
      return;
    }
    if (!form.reportValidity()) return;

    const same = document.getElementById("sameAsOrderer").checked;
    const data = {
      ordererName: form.ordererName.value.trim(),
      ordererPhone: form.ordererPhone.value.trim(),
      ordererEmail: form.ordererEmail.value.trim(),
      receiverName: same ? form.ordererName.value.trim() : form.receiverName.value.trim(),
      receiverPhone: same ? form.ordererPhone.value.trim() : form.receiverPhone.value.trim(),
      address: buildAddress(form),
      memo: form.memo.value.trim(),
      items: items,
      productAmount: totals.sum,
      shipping: totals.ship,
      total: totals.total,
      orderedAt: new Date().toISOString(),
    };

    submitOrder(data, form);
  }

  function submitOrder(data, form) {
    const btn = form.querySelector('button[type="submit"]');
    // 백엔드(Apps Script) 미연동 시: 로컬 주문번호로 접수 안내
    if (!CFG.orderEndpoint) {
      showComplete(localOrderNo(), data);
      resetOrder(form);
      return;
    }
    // 백엔드 연동 시: Apps Script 웹앱으로 전송
    btn.disabled = true;
    btn.textContent = "접수 중…";
    fetch(CFG.orderEndpoint, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" }, // Apps Script CORS 회피용
      body: JSON.stringify(data),
    })
      .then((r) => r.json())
      .then((res) => {
        showComplete(res.orderNo || localOrderNo(), data);
        resetOrder(form);
      })
      .catch(() => {
        flashHint("전송에 실패했습니다. 전화 또는 카카오로 주문해 주세요.");
      })
      .finally(() => {
        btn.disabled = false;
        btn.textContent = "주문 접수하기";
      });
  }

  // 지침 3.3 주문번호 형식: YYYYMMDD-순번 (로컬 임시 번호)
  function localOrderNo() {
    const d = new Date();
    const ymd = d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate());
    const seq = pad(Math.floor(Math.random() * 900) + 100, 3);
    return ymd + "-" + seq;
  }
  const pad = (n, len = 2) => String(n).padStart(len, "0");

  function resetOrder(form) {
    form.reset();
    syncReceiver(); // 기본 체크 상태로 수령인 칸 재동기화
    PRODUCTS.forEach((p) => (qty[p.code] = 0));
    renderOrderItems();
    calcTotals();
  }

  // ---------- 완료 모달 ----------
  function showComplete(orderNo, data) {
    const a = CFG.bankAccount || {};
    const body = document.getElementById("modalBody");
    body.innerHTML =
      '<h3 id="modalTitle">✅ 주문이 접수되었습니다</h3>' +
      "<p>아래 주문번호로 접수되었습니다. 입금 확인 후 발송해 드립니다.</p>" +
      '<div class="modal__order-no">' + orderNo + "</div>" +
      '<div class="modal__acct">' +
      "<strong>입금 안내</strong><br />" +
      (a.bank || "") + " " + (a.number || "") + "<br />" +
      "예금주 : " + (a.holder || "") + "<br />" +
      "입금액 : <strong>" + won(data.total) + "</strong></div>" +
      "<p style='font-size:.88rem;color:#6a6472'>입금자명을 주문자명(" +
      data.ordererName + ")과 동일하게 해주시면 확인이 빠릅니다." +
      (CFG.phone ? " 문의 : " + CFG.phone : "") + "</p>" +
      '<button class="btn btn--primary btn--block" data-close>확인</button>';
    const modal = document.getElementById("orderModal");
    modal.hidden = false;
    document.body.style.overflow = "hidden";
  }
  function openModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.hidden = false;
    document.body.style.overflow = "hidden";
  }
  function closeModal() {
    // 열려 있는 모든 모달 닫기 (주문완료·개인정보처리방침)
    document.querySelectorAll(".modal").forEach((m) => (m.hidden = true));
    document.body.style.overflow = "";
  }

  // ---------- 초기화 ----------
  document.addEventListener("DOMContentLoaded", () => {
    applyConfig();
    bindEvents();
    const grid = document.getElementById("productGrid");
    if (grid) grid.innerHTML = '<p class="products__note">상품을 불러오는 중…</p>';
    loadProducts().then((list) => {
      setProducts(list);
      renderProducts("전체");
      renderOrderItems();
      calcTotals();
    });
  });
})();
