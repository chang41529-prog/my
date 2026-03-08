# lphang LP Archive

GitHub Pages에 바로 업로드해서 사용할 수 있는 정적 LP 아카이브 사이트입니다.

## 구성 파일
- `index.html`
- `styles.css`
- `app.js`
- `albums.json`

## 기능
- LP 등록 / 수정 / 삭제
- 검색 / 장르 필터 / 정렬
- 상세보기 모달
- JSON 내보내기 / 불러오기
- 기본 샘플 데이터 제공
- 브라우저 localStorage 저장

## GitHub Pages 배포 방법
1. GitHub에서 새 저장소 생성
2. 이 압축 파일을 풀고 모든 파일 업로드
3. 저장소의 **Settings → Pages**로 이동
4. **Build and deployment**에서 **Deploy from a branch** 선택
5. **Branch**를 `main` / `/root`로 선택 후 저장
6. 1~3분 뒤 생성된 URL로 접속

## 주의
- 이 사이트는 정적 사이트이므로 서버 DB 없이 브라우저에 저장됩니다.
- 다른 PC나 브라우저에서는 localStorage 데이터가 자동 동기화되지 않습니다.
- 데이터를 옮길 때는 `JSON 내보내기` 기능을 사용하세요.
