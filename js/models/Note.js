/**
 * Note 클래스 - 메모 객체의 구조를 정의
 */
class Note {
  /**
   * 새 메모 객체 생성
   * @param {Object} options - 메모 초기화 옵션
   */
  constructor(options = {}) {
    this.id = options.id || Date.now().toString();
    this.title = options.title || '';
    this.content = options.content || '';
    this.tags = options.tags || [];
    this.url = options.url || null;
    this.reminder = options.reminder || null;
    this.createdAt = options.createdAt || new Date().toISOString();
    this.updatedAt = options.updatedAt || this.createdAt;
    this.pinned = options.pinned || false;
    this.completed = options.completed || false;
  }

  /**
   * JSON 객체로부터 Note 인스턴스 생성
   * @param {Object} json - Note 객체의 JSON 표현
   * @returns {Note} 생성된 Note 인스턴스
   */
  static fromJSON(json) {
    return new Note(json);
  }

  /**
   * Note 객체를 JSON으로 변환
   * @returns {Object} 메모의 JSON 표현
   */
  toJSON() {
    return {
      id: this.id,
      title: this.title,
      content: this.content,
      tags: this.tags,
      url: this.url,
      reminder: this.reminder,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      pinned: this.pinned,
      completed: this.completed
    };
  }

  /**
   * 메모에서 검색어가 포함된 지 확인
   * @param {string} query - 검색할 텍스트
   * @returns {boolean} 검색어 포함 여부
   */
  matchesSearch(query) {
    if (!query) return true;
    
    const lowercaseQuery = query.toLowerCase();
    
    // 제목, 내용, 태그에서 검색
    const titleMatch = this.title && this.title.toLowerCase().includes(lowercaseQuery);
    const contentMatch = this.content && this.content.toLowerCase().includes(lowercaseQuery);
    const tagMatch = this.tags && this.tags.some(tag => tag.toLowerCase().includes(lowercaseQuery));
    
    return titleMatch || contentMatch || tagMatch;
  }

  /**
   * 메모가 특정 필터 조건에 맞는지 확인
   * @param {string} filter - 필터 유형 (all, pinned, active, completed)
   * @returns {boolean} 필터 조건 충족 여부
   */
  matchesFilter(filter) {
    switch(filter) {
      case 'pinned':
        return this.pinned;
      case 'active':
        return !this.completed;
      case 'completed':
        return this.completed;
      case 'today':
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const createdDate = new Date(this.createdAt);
        return createdDate >= today;
      case 'thisWeek':
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // 이번 주 일요일로 설정
        weekStart.setHours(0, 0, 0, 0);
        const noteDate = new Date(this.createdAt);
        return noteDate >= weekStart;
      default:
        return true;
    }
  }
  
  /**
   * 고정 상태 토글
   */
  togglePin() {
    this.pinned = !this.pinned;
    this.updatedAt = new Date().toISOString();
  }
  
  /**
   * 완료 상태 토글
   */
  toggleComplete() {
    this.completed = !this.completed;
    this.updatedAt = new Date().toISOString();
  }
  
  /**
   * 리마인더 설정
   * @param {Date} reminderDate - 리마인더 날짜
   */
  setReminder(reminderDate) {
    this.reminder = reminderDate.toISOString();
    this.updatedAt = new Date().toISOString();
  }
  
  /**
   * 메모 내용 업데이트
   * @param {Object} data - 업데이트할 데이터 (title, content, tags 등)
   */
  update(data) {
    Object.keys(data).forEach(key => {
      if (this.hasOwnProperty(key)) {
        this[key] = data[key];
      }
    });
    
    this.updatedAt = new Date().toISOString();
  }
}

export default Note;