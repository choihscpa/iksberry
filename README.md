# 익산 블루베리 농장 웹사이트

「블루베리농장_시스템_구축지침(v0.1)」의 **2단계 – 고객용 웹사이트(소개 + 주문폼)** 구현입니다.
빌드 도구 없이 순수 HTML/CSS/JS 로 만들어 **GitHub Pages 무료 배포**가 바로 가능합니다.

## 폴더 구조
```
index.html          고객용 사이트: 홈·농장이야기·상품·주문·FAQ·푸터 (한 페이지)
admin.html          관리자 페이지: 주문·미수금 조회 / 수금등록 / 발송처리
css/style.css       스타일 (모바일 우선, 자연 그린 + 블루베리 퍼플)
js/config.js        ★ 농장 정보·계좌·배송비·주문서버 URL  (여기만 고치면 됨)
js/products.js      ★ 상품 목록
js/main.js          고객 사이트 로직 (건드릴 필요 없음)
js/admin.js         관리자 페이지 로직 (건드릴 필요 없음)
backend/Code.gs     ★ Google Apps Script 백엔드 (주문저장·알림·수금관리)
backend/SETUP.md    백엔드 설치 가이드 (구글시트+웹앱 배포)
```

## 내용 수정 방법 (개발 지식 불필요)
- **농장명·연락처·계좌·배송비·사업자정보** → `js/config.js` 값 수정
- **판매 상품·가격** → `js/products.js` 배열 수정 (`sale: false` 로 두면 숨김)
- 상품/농장 사진은 `img/` 폴더에 넣고 각 항목의 `img` 값에 경로 지정 (예: `"img/bb-1kg.jpg"`)
- **카톡 공유 미리보기 이미지**: `img/og-cover.jpg`(권장 1200×630) 를 넣고, `index.html` 의 `og:image` 를 배포 주소로 교체하면 링크 공유 시 썸네일이 표시됩니다.

## 로컬에서 미리보기
```bash
cd iksberry
python3 -m http.server 8777
```
브라우저에서 `http://localhost:8777` 접속. (파일을 직접 열면 JS가 동작하지 않으니 서버로 여세요.)

## GitHub Pages 배포
1. GitHub 새 저장소 생성 후 이 폴더 내용을 업로드(push)
2. 저장소 **Settings → Pages → Source: main 브랜치 / root** 선택
3. 몇 분 뒤 `https://<계정>.github.io/<저장소명>/` 으로 공개
4. (선택) 도메인 연결 시 `CNAME` 파일 추가

## 현재 동작 방식
- 주문 접수 시 **주문번호(YYYYMMDD-순번) 생성 → 입금 계좌 안내 모달** 표시 (계좌이체 기반, 수수료 0)
- `config.js`의 `orderEndpoint` 가 비어 있으므로 아직 서버 저장은 하지 않고 안내만 합니다.

## 백엔드 연동 (지침 1·3단계) — 구현 완료
`backend/` 폴더에 Google Apps Script 백엔드가 포함되어 있습니다. [backend/SETUP.md](backend/SETUP.md) 순서대로:
1. 구글시트 생성 → `Code.gs` 붙여넣기 → `setup()` 실행 = **시트(상품/회원/주문/주문상세/수금/배송/대시보드) 자동 생성**
2. 웹앱 배포 → URL 을 `js/config.js` 의 `orderEndpoint` 에 입력
3. 이후 고객 주문이 **시트 자동 저장 + 형에게 알림 메일 + 고객 주문확인 메일(계좌 포함)** 로 처리됨
4. `admin.html` 에서 **수금등록(통장/현금/어머니)·발송처리**, 대시보드에서 **어머니 미정산 현금잔액** 확인

## 확인 필요(지침 8번) — 확정 시 반영할 항목
상품 구성·가격, 판매 시기, 배송비 정책, 어머니 수금 방식, 초기 회원 명단, 농장명/도메인, 사진·소개글.
현재는 예시 데이터로 채워져 있습니다.
