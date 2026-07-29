/**
 * §7-5의 "없음" 문구 모음.
 *
 * 예전에는 mapper가 구워 넣은 영어 sentinel('Unknown Source', '-')을 화면에서
 * 되돌려 번역하고, `mirrorUrl === originalUrl` 문자열 비교로 "네이버 미러 없음"을
 * 추측했다. 이제 mapper가 null을 그대로 보존하므로 여기서는 null을 사람이 읽을
 * 문구로 바꾸기만 한다. 미러 유무는 `mirrorUrl !== null`로 직접 판정한다.
 */

/** `publisherName`이 없을 때 (§7-5). */
export function displaySource(source: string | null): string {
  return source && source.length > 0 ? source : '언론사 미확인';
}

/** `publishedAt`이 없거나 파싱 불가일 때 (§7-5). */
export function displayPublishedAt(publishedAt: string | null): string {
  return publishedAt && publishedAt.length > 0
    ? publishedAt
    : '발행 시각 미확인';
}

/** 기사 제목이 없을 때. */
export function displayArticleTitle(title: string | null): string {
  return title && title.length > 0 ? title : '기사 제목이 없습니다.';
}
