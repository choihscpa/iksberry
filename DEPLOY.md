# GitHub Pages 배포 가이드

이 폴더를 그대로 GitHub 에 올리면 **무료로 HTTPS 웹사이트**가 됩니다. 빌드 과정이 없어 파일만 올리면 끝입니다.

배포 방법은 두 가지입니다. **깃(git)을 모르면 방법 A(웹 업로드)** 를 쓰세요.

---

## 방법 A. 웹에서 업로드 (깃 몰라도 됨, 추천)

1. [github.com](https://github.com) 가입/로그인 → 우측 상단 **＋ → New repository**
2. 저장소 설정
   - **Repository name**: `iksberry` (또는 원하는 이름)
   - **Public** 선택 (Pages 무료는 공개 저장소)
   - **Create repository** 클릭
3. 다음 화면에서 **uploading an existing file** 링크 클릭
4. 이 폴더 안의 **모든 파일·폴더를 드래그**해서 업로드
   - `index.html`, `admin.html`, `README.md`, `DEPLOY.md`, `.nojekyll`
   - `css/`, `js/`, `img/`, `backend/` 폴더
   - ⚠️ 숨김파일 `.nojekyll` 도 꼭 포함 (Mac Finder 에서 `Cmd+Shift+.` 로 숨김파일 표시)
5. 아래 **Commit changes** 클릭
6. → **Pages 설정** 으로 이동 (아래 공통 3단계)

---

## 방법 B. 깃 명령어로 올리기

이 폴더는 이미 `git init` + 첫 커밋이 되어 있습니다. GitHub 에서 빈 저장소(README 체크 해제)를 만든 뒤:

```bash
cd /Users/solver/vscode/iksberry
git remote add origin https://github.com/<your-id>/iksberry.git
git branch -M main
git push -u origin main
```

`<your-id>` 를 본인 GitHub 아이디로 바꾸세요. 로그인은 브라우저 인증 또는 토큰으로 진행됩니다.

---

## 공통. GitHub Pages 켜기

1. 저장소 상단 **Settings → 좌측 Pages**
2. **Build and deployment → Source: Deploy from a branch**
3. **Branch: `main` / 폴더: `/ (root)`** 선택 → **Save**
4. 1~2분 뒤 페이지 상단에 공개 주소가 표시됨:
   ```
   https://<your-id>.github.io/iksberry/
   ```
   - 관리자 페이지: `https://<your-id>.github.io/iksberry/admin.html`

---

## 배포 후 체크리스트

- [ ] 사이트 접속 → 홈·상품·주문폼 정상 표시 확인
- [ ] `js/config.js` 의 농장명·계좌·연락처를 **실제 정보로 교체**
- [ ] `js/products.js` 의 상품·가격을 **실제 판매 정보로 교체**
- [ ] 백엔드 배포 후(→ [backend/SETUP.md](backend/SETUP.md)) `orderEndpoint` 에 웹앱 URL 입력
- [ ] `img/og-cover.jpg`(1200×630) 추가 후 `index.html` 의 `og:image` 를 배포 주소로 교체 (카톡 미리보기)
- [ ] `backend/Code.gs` 의 `ADMIN_TOKEN`(관리자 비밀번호) 변경 확인

## 사이트 수정 후 반영
- **방법 A**: 저장소에서 해당 파일 열기 → 연필(Edit) → 수정 → Commit. 1~2분 뒤 자동 반영
- **방법 B**: 파일 수정 후
  ```bash
  git add -A && git commit -m "내용 수정" && git push
  ```

## (선택) 개인 도메인 연결
연 1.5~2만원 도메인을 쓰면 `blueberryfarm.com` 같은 주소 사용 가능:
1. 도메인 등록업체(가비아·후이즈 등)에서 도메인 구입
2. GitHub **Settings → Pages → Custom domain** 에 도메인 입력
3. 도메인 업체 DNS 에 GitHub 안내대로 CNAME/A 레코드 설정
4. 저장소에 `CNAME` 파일이 자동 생성됨 (도메인명 한 줄)

## 참고
- **주의**: `backend/Code.gs` 안에는 관리자 비밀번호가 들어갑니다. 공개 저장소라도 소스는 보이니, 비밀번호는 반드시 기본값에서 바꾸고, 민감정보(진짜 계좌 비밀번호 등)는 코드에 넣지 마세요. (입금받는 계좌번호 자체는 고객에게 안내되는 정보라 공개돼도 무방합니다.)
- GitHub Pages 는 정적 사이트만 호스팅합니다. 주문 저장·수금관리 같은 동적 기능은 `backend/`(Google Apps Script)가 담당합니다.
