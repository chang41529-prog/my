# lphang LP Archive v3

GitHub Pages에 바로 업로드할 수 있는 정적 LP 아카이브 사이트입니다.

## 포함 기능
- 앨범명 / 아티스트 / 수록곡 통합 검색
- 발매년도 / 장르 / 제목 / 아티스트 / 최근추가순 정렬
- 장르 필터
- 수동 등록 / 수정 / 삭제
- Discogs 검색 결과를 이용한 빠른 추가
- JSON 내보내기 / 불러오기
- 브라우저 localStorage 저장

## GitHub 업로드 방법
1. 압축을 풉니다.
2. 폴더째 업로드하지 말고, 안의 파일들을 GitHub 저장소 첫 화면(root)에 올립니다.
3. 저장소 Settings → Pages → Deploy from a branch → main / (root)로 설정합니다.
4. 1~2분 뒤 사이트 주소를 열어 확인합니다.

## Discogs 연동 사용 방법
1. Discogs 개발자 페이지에서 Consumer Key / Secret을 발급받습니다.
2. 사이트 상단의 "Discogs 검색으로 앨범 추가" 영역에 키를 입력합니다.
3. 검색어를 입력하고 결과에서 "바로 추가" 또는 "폼에 채우기"를 누릅니다.

## 주의
- 데이터와 Discogs 키는 현재 사용하는 브라우저에만 저장됩니다.
- 정적 GitHub Pages 사이트이므로, 다른 기기와 자동 동기화되지는 않습니다.
- Discogs API 정책 변경 시 검색 인증 방식이 달라질 수 있습니다.
