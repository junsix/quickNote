/**
 * 날짜 포맷팅 함수
 * @param {string} dateString - ISO 형식의 날짜 문자열
 * @returns {string} 포맷팅된 날짜 문자열
 */
export function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return `오늘 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  } else if (diffDays === 1) {
    return '어제';
  } else if (diffDays < 7) {
    return `${diffDays}일 전`;
  } else {
    return `${date.getFullYear()}.${(date.getMonth() + 1).toString().padStart(2, '0')}.${date.getDate().toString().padStart(2, '0')}`;
  }
}

/**
 * HTML 특수 문자 이스케이프 함수
 * @param {string} str - 이스케이프할 문자열
 * @returns {string} 이스케이프된 문자열
 */
export function escapeHtml(str) {
  return str.replace(/[&<>"']/g, (match) => {
    const escape = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return escape[match];
  });
}

/**
 * 검색어 하이라이트 함수
 * @param {string} text - 원본 텍스트
 * @param {string} query - 하이라이트할 검색어
 * @returns {string} 하이라이트가 적용된 HTML
 */
export function highlightText(text, query) {
  if (!text || !query) return text;
  
  // 텍스트와 검색어 이스케이프
  const escapedText = escapeHtml(text);
  const escapedQuery = escapeHtml(query);
  
  // 대소문자 구분 없이 검색어를 하이라이트
  const regex = new RegExp(escapedQuery, 'gi');
  return escapedText.replace(regex, match => `<span class="search-highlight">${match}</span>`);
}

/**
 * 태그 문자열 파싱 함수
 * @param {string} tagString - 쉼표로 구분된 태그 문자열
 * @returns {string[]} 태그 배열
 */
export function parseTags(tagString) {
  if (!tagString) return [];
  return tagString
    .split(',')
    .map(tag => tag.trim())
    .filter(tag => tag);
}

/**
 * URL 표시용 포맷팅
 * @param {string} url - 원본 URL
 * @returns {string} 포맷팅된 URL
 */
export function formatUrl(url) {
  if (!url) return '';
  try {
    const urlObj = new URL(url);
    return urlObj.hostname + (urlObj.pathname !== '/' ? urlObj.pathname : '');
  } catch (e) {
    return url;
  }
}

/**
 * 텍스트 자르기 (길이 제한)
 * @param {string} text - 원본 텍스트
 * @param {number} maxLength - 최대 길이
 * @returns {string} 잘린 텍스트
 */
export function truncateText(text, maxLength) {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}