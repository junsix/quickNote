import Note from '../models/Note.js';

/**
 * StorageService 클래스 - Chrome 스토리지 작업을 추상화
 */
class StorageService {
  /**
   * 생성자
   * @param {string} storageKey - 스토리지에 저장되는 키 이름
   */
  constructor(storageKey = 'notes') {
    this.storageKey = storageKey;
  }

  /**
   * 모든 노트를 가져옴
   * @returns {Promise<Note[]>} Note 객체 배열
   */
  async getAllNotes() {
    return new Promise((resolve) => {
      chrome.storage.sync.get([this.storageKey], (result) => {
        const notesData = result[this.storageKey] || [];
        const notes = notesData.map(note => Note.fromJSON(note));
        resolve(notes);
      });
    });
  }

  /**
   * ID로 특정 노트 가져오기
   * @param {string} id - 노트 ID
   * @returns {Promise<Note|null>} 찾은 노트 또는 null
   */
  async getNoteById(id) {
    const notes = await this.getAllNotes();
    return notes.find(note => note.id === id) || null;
  }

  /**
   * 새 노트 추가
   * @param {Note} note - 추가할 Note 객체
   * @returns {Promise<void>}
   */
  async addNote(note) {
    const notes = await this.getAllNotes();
    notes.unshift(note); // 배열 맨 앞에 추가
    return this.saveNotes(notes);
  }

  /**
   * 노트 업데이트
   * @param {string} id - 업데이트할 노트의 ID
   * @param {Object} data - 업데이트할 데이터
   * @returns {Promise<void>}
   */
  async updateNote(id, data) {
    const notes = await this.getAllNotes();
    const noteIndex = notes.findIndex(note => note.id === id);
    
    if (noteIndex !== -1) {
      notes[noteIndex].update(data);
      return this.saveNotes(notes);
    }
  }

  /**
   * 노트의 고정 상태 토글
   * @param {string} id - 노트 ID
   * @returns {Promise<boolean>} 토글 후 고정 상태
   */
  async togglePinNote(id) {
    const notes = await this.getAllNotes();
    const noteIndex = notes.findIndex(note => note.id === id);
    
    if (noteIndex !== -1) {
      notes[noteIndex].togglePin();
      await this.saveNotes(notes);
      return notes[noteIndex].pinned;
    }
    return false;
  }

  /**
   * 노트의 완료 상태 토글
   * @param {string} id - 노트 ID
   * @returns {Promise<boolean>} 토글 후 완료 상태
   */
  async toggleCompleteNote(id) {
    const notes = await this.getAllNotes();
    const noteIndex = notes.findIndex(note => note.id === id);
    
    if (noteIndex !== -1) {
      notes[noteIndex].toggleComplete();
      await this.saveNotes(notes);
      return notes[noteIndex].completed;
    }
    return false;
  }

  /**
   * 노트 삭제
   * @param {string} id - 삭제할 노트 ID
   * @returns {Promise<boolean>} 삭제 성공 여부
   */
  async deleteNote(id) {
    const notes = await this.getAllNotes();
    const filteredNotes = notes.filter(note => note.id !== id);
    
    if (filteredNotes.length !== notes.length) {
      await this.saveNotes(filteredNotes);
      return true;
    }
    return false;
  }

  /**
   * 노트에 리마인더 설정
   * @param {string} id - 노트 ID
   * @param {Date} reminderDate - 리마인더 날짜
   * @returns {Promise<void>}
   */
  async setReminder(id, reminderDate) {
    const notes = await this.getAllNotes();
    const noteIndex = notes.findIndex(note => note.id === id);
    
    if (noteIndex !== -1) {
      notes[noteIndex].setReminder(reminderDate);
      return this.saveNotes(notes);
    }
  }

  /**
   * 노트 배열을 스토리지에 저장
   * @param {Note[]} notes - 저장할 노트 배열
   * @returns {Promise<void>}
   */
  async saveNotes(notes) {
    return new Promise((resolve) => {
      const notesData = notes.map(note => note.toJSON());
      chrome.storage.sync.set({ [this.storageKey]: notesData }, resolve);
    });
  }

  /**
   * 검색 및 필터 조건에 맞는 노트 가져오기
   * @param {string} searchQuery - 검색어
   * @param {string} filter - 필터 조건
   * @param {string} sortType - 정렬 방식
   * @returns {Promise<Note[]>} 필터링된 노트 배열
   */
  async getFilteredNotes(searchQuery, filter, sortType) {
    const allNotes = await this.getAllNotes();
    
    // 필터 적용
    let filteredNotes = allNotes.filter(note => note.matchesFilter(filter));
    
    // 검색어 적용
    if (searchQuery) {
      filteredNotes = filteredNotes.filter(note => note.matchesSearch(searchQuery));
    }
    
    // 정렬 적용
    filteredNotes = this.sortNotes(filteredNotes, sortType);
    
    return filteredNotes;
  }

  /**
   * 노트 정렬
   * @param {Note[]} notes - 정렬할 노트 배열
   * @param {string} sortType - 정렬 유형
   * @returns {Note[]} 정렬된 노트 배열
   */
  sortNotes(notes, sortType) {
    const sortedNotes = [...notes];
    
    switch(sortType) {
      case 'newest':
        return sortedNotes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      case 'oldest':
        return sortedNotes.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      case 'title':
        return sortedNotes.sort((a, b) => {
          const titleA = a.title || '';
          const titleB = b.title || '';
          return titleA.localeCompare(titleB);
        });
      default:
        return sortedNotes;
    }
  }
}

export default StorageService;