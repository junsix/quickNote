// DOM 요소 참조
const notesContainer = document.getElementById('notesList');
const newNoteTitle = document.getElementById('newNoteTitle');
const newNoteContent = document.getElementById('newNoteContent');
const newNoteTags = document.getElementById('newNoteTags');
const saveNoteBtn = document.getElementById('saveNoteBtn');
const filterSelect = document.getElementById('filterSelect');
const openReportBtn = document.getElementById('openReportBtn');

// 메모 편집 모달 요소
const editNoteModal = document.getElementById('editNoteModal');
const editNoteTitle = document.getElementById('editNoteTitle');
const editNoteContent = document.getElementById('editNoteContent');
const editNoteTags = document.getElementById('editNoteTags');
const saveEditBtn = document.getElementById('saveEditBtn');
const closeEditModal = document.getElementById('closeEditModal');

// 토스트 메시지 요소
const toastElement = document.getElementById('toast');

// 현재 편집 중인 메모 ID
let currentEditingNoteId = null;

// 현재 필터 옵션
let currentFilter = 'all';
let currentSearchQuery = '';

document.addEventListener('DOMContentLoaded', () => {
  loadNotes();
  
  // 이벤트 리스너 등록
  saveNoteBtn.addEventListener('click', addNewNote);
  filterSelect.addEventListener('change', handleFilterChange);
  openReportBtn.addEventListener('click', openWeeklyReport);
  
  // 메모 편집 모달 이벤트 리스너 등록
  saveEditBtn.addEventListener('click', saveEditNote);
  closeEditModal.addEventListener('click', closeEditNoteModal);
  
  // 모달 외부 클릭 시 닫기
  editNoteModal.addEventListener('click', (e) => {
    if (e.target === editNoteModal) {
      closeEditNoteModal();
    }
  });
  
  // 검색 기능 리스너 등록
  const searchInput = document.getElementById('searchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  
  searchInput.addEventListener('input', handleSearchInput);
  clearSearchBtn.addEventListener('click', clearSearch);
  
});

// 검색 입력 처리
function handleSearchInput(e) {
  const searchValue = e.target.value.trim().toLowerCase();
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  
  // 지우기 버튼 표시/숨김
  if (searchValue.length > 0) {
    clearSearchBtn.classList.add('visible');
  } else {
    clearSearchBtn.classList.remove('visible');
  }
  
  // 검색어 저장 및 노트 필터링
  currentSearchQuery = searchValue;
  loadNotes(); // 노트를 다시 불러오며 검색 적용
}

// 검색 지우기 버튼 처리
function clearSearch() {
  const searchInput = document.getElementById('searchInput');
  const clearSearchBtn = document.getElementById('clearSearchBtn');
  
  searchInput.value = '';
  clearSearchBtn.classList.remove('visible');
  
  // 검색어 초기화 및 노트 다시 불러오기
  currentSearchQuery = '';
  loadNotes();
  
  // 입력 필드에 포커스
  searchInput.focus();
}

// 저장소에서 메모 가져와서 표시
function loadNotes() {
  chrome.storage.sync.get(['notes'], (result) => {
    const notes = result.notes || [];
    renderNotes(notes);
  });
}

// 메모 목록 렌더링 - 검색 기능 추가
function renderNotes(notes) {
  // 컨테이너 비우기
  notesContainer.innerHTML = '';
  
  // 필터링 및 검색 적용
  let filteredNotes = filterNotes(notes, currentFilter);
  
  // 검색어가 있으면 필터링
  if (currentSearchQuery) {
    filteredNotes = filteredNotes.filter(note => {
      // 제목, 내용, 태그에서 검색
      const titleMatch = note.title && note.title.toLowerCase().includes(currentSearchQuery);
      const contentMatch = note.content && note.content.toLowerCase().includes(currentSearchQuery);
      const tagMatch = note.tags && note.tags.some(tag => tag.toLowerCase().includes(currentSearchQuery));
      
      return titleMatch || contentMatch || tagMatch;
    });
  }
  
  if (filteredNotes.length === 0) {
    // 검색 결과가 없는 경우 메시지 표시
    if (currentSearchQuery) {
      notesContainer.innerHTML = `
        <div class="empty-state">
          <span class="material-icons" style="font-size: 48px; opacity: 0.5;">search_off</span>
          <p>'${currentSearchQuery}'에 대한 검색 결과가 없습니다.</p>
        </div>`;
    } else {
      notesContainer.innerHTML = `
        <div class="empty-state">
          <span class="material-icons" style="font-size: 48px; opacity: 0.5;">notes</span>
          <p>메모가 없습니다.</p>
        </div>`;
    }
    return;
  }
  
  // 고정된 메모를 상단에 표시
  const pinnedNotes = filteredNotes.filter(note => note.pinned);
  const unpinnedNotes = filteredNotes.filter(note => !note.pinned);
  const sortedNotes = [...pinnedNotes, ...unpinnedNotes];
  
  // 메모 목록 생성
  sortedNotes.forEach(note => {
    const noteElement = createNoteElement(note);
    notesContainer.appendChild(noteElement);
  });
}

// 필터에 따른 메모 필터링
function filterNotes(notes, filter) {
  switch(filter) {
    case 'pinned':
      return notes.filter(note => note.pinned);
    case 'active':
      return notes.filter(note => !note.completed);
    case 'completed':
      return notes.filter(note => note.completed);
    default:
      return notes;
  }
}

// 필터 변경 핸들러
function handleFilterChange() {
  currentFilter = filterSelect.value;
  loadNotes();
}

// 메모 요소 생성 함수에 하이라이트 기능 추가
function createNoteElement(note) {
  const noteDiv = document.createElement('div');
  noteDiv.className = `note-entry ${note.pinned ? 'pinned' : ''} ${note.completed ? 'completed' : ''}`;
  noteDiv.dataset.id = note.id;
  
  // 메모 콘텐츠 컨테이너
  const noteContent = document.createElement('div');
  noteContent.className = 'note-content-container';
  
  // 메모 제목 (제목이 있으면 표시, 없으면 내용 일부를 제목으로 사용)
  const titleDiv = document.createElement('div');
  titleDiv.className = 'note-title';
  
  // 검색어에 따른 제목 하이라이트 처리
  const titleText = note.title || (note.content.length > 30 ? note.content.substring(0, 30) + '...' : note.content);
  if (currentSearchQuery && titleText) {
    titleDiv.innerHTML = highlightText(titleText, currentSearchQuery);
  } else {
    titleDiv.textContent = titleText;
  }
  noteContent.appendChild(titleDiv);
  
  // 메모 내용
  if (note.title || note.content.length > 30) { // 제목이 있거나 내용이 길면 내용 표시
    const contentDiv = document.createElement('div');
    contentDiv.className = 'note-content';
    
    // 검색어에 따른 내용 하이라이트 처리
    if (currentSearchQuery && note.content) {
      contentDiv.innerHTML = highlightText(note.content, currentSearchQuery);
    } else {
      contentDiv.textContent = note.content;
    }
    noteContent.appendChild(contentDiv);
  }
  
  // 메타 데이터 컨테이너 (URL, 태그, 날짜)
  const metaContainer = document.createElement('div');
  metaContainer.className = 'note-meta';
  
  // 메모가 웹페이지에서 저장된 경우 URL 표시
  if (note.url) {
    const urlDiv = document.createElement('div');
    urlDiv.className = 'note-url';
    
    // URL을 짧게 표시
    const urlObj = new URL(note.url);
    const displayUrl = urlObj.hostname + (urlObj.pathname !== '/' ? urlObj.pathname : '');
    
    urlDiv.innerHTML = `
      <span class="material-icons" style="font-size: 14px; vertical-align: middle;">link</span>
      <a href="${note.url}" target="_blank">${displayUrl}</a>`;
    metaContainer.appendChild(urlDiv);
  }
  
  // 태그 표시
  if (note.tags && note.tags.length > 0) {
    const tagsDiv = document.createElement('div');
    tagsDiv.className = 'tags-container';
    
    note.tags.forEach(tag => {
      const tagSpan = document.createElement('span');
      tagSpan.className = 'tag';
      
      // 검색어에 따른 태그 하이라이트 처리
      if (currentSearchQuery && tag.toLowerCase().includes(currentSearchQuery)) {
        tagSpan.innerHTML = `
          <span class="material-icons" style="font-size: 12px; margin-right: 2px;">label</span>
          ${highlightText(tag, currentSearchQuery)}`;
      } else {
        tagSpan.innerHTML = `
          <span class="material-icons" style="font-size: 12px; margin-right: 2px;">label</span>
          ${tag}`;
      }
      tagsDiv.appendChild(tagSpan);
    });
    
    metaContainer.appendChild(tagsDiv);
  }
  
  // 메모 작성 날짜
  const dateDiv = document.createElement('div');
  dateDiv.className = 'note-date';
  dateDiv.innerHTML = `
    <span class="material-icons" style="font-size: 14px; vertical-align: middle;">schedule</span>
    ${formatDate(note.createdAt)}`;
  metaContainer.appendChild(dateDiv);
  
  // 메타 데이터 컨테이너를 추가
  noteContent.appendChild(metaContainer);
  
  // 노트 컨텐츠 추가
  noteDiv.appendChild(noteContent);
  
  // 메모 액션 버튼들
  const actionsDiv = document.createElement('div');
  actionsDiv.className = 'note-actions';
  
  // 버튼 그룹 1 (왼쪽)
  const actionGroup1 = document.createElement('div');
  
  // 리마인더 버튼
  const reminderButton = document.createElement('button');
  reminderButton.className = 'button-icon reminder-btn ripple';
  reminderButton.innerHTML = `<span class="material-icons">${note.reminder ? 'alarm_on' : 'alarm_add'}</span>`;
  reminderButton.title = note.reminder ? '리마인더 변경' : '리마인더 설정';
  reminderButton.onclick = (e) => {
    e.stopPropagation();
    setReminder(note.id);
  };
  actionGroup1.appendChild(reminderButton);
  
  // 버튼 그룹 2 (오른쪽)
  const actionGroup2 = document.createElement('div');
  
  // 고정/해제 버튼
  const pinButton = document.createElement('button');
  pinButton.className = 'button-icon pin-btn ripple';
  pinButton.innerHTML = `<span class="material-icons">${note.pinned ? 'push_pin' : 'push_pin'}</span>`;
  pinButton.title = note.pinned ? '고정 해제' : '고정하기';
  pinButton.style.color = note.pinned ? 'var(--color-warning)' : 'var(--text-secondary)';
  pinButton.onclick = (e) => {
    e.stopPropagation();
    togglePinNote(note.id);
  };
  actionGroup2.appendChild(pinButton);
  
  // 완료/미완료 버튼
  const completeButton = document.createElement('button');
  completeButton.className = 'button-icon complete-btn ripple';
  completeButton.innerHTML = `<span class="material-icons">${note.completed ? 'replay' : 'check_circle_outline'}</span>`;
  completeButton.title = note.completed ? '미완료로 표시' : '완료로 표시';
  completeButton.style.color = note.completed ? 'var(--color-success)' : 'var(--text-secondary)';
  completeButton.onclick = (e) => {
    e.stopPropagation();
    toggleCompleteNote(note.id);
  };
  actionGroup2.appendChild(completeButton);
  
  // 삭제 버튼
  const deleteButton = document.createElement('button');
  deleteButton.className = 'button-icon delete-btn ripple';
  deleteButton.innerHTML = `<span class="material-icons">delete_outline</span>`;
  deleteButton.title = '메모 삭제';
  deleteButton.onclick = (e) => {
    e.stopPropagation();
    deleteNote(note.id);
  };
  deleteButton.addEventListener('mouseover', () => {
    deleteButton.style.color = 'var(--color-error)';
  });
  deleteButton.addEventListener('mouseout', () => {
    deleteButton.style.color = 'var(--text-secondary)';
  });
  actionGroup2.appendChild(deleteButton);
  
  // 액션 그룹을 액션 div에 추가
  actionsDiv.appendChild(actionGroup1);
  actionsDiv.appendChild(actionGroup2);
  
  // 액션 div를 메모 요소에 추가
  noteDiv.appendChild(actionsDiv);
  
  // 리마인더가 있는 경우 배지 표시
  if (note.reminder) {
    const reminderBadge = document.createElement('div');
    reminderBadge.className = 'badge';
    reminderBadge.innerHTML = `<span class="material-icons" style="font-size: 14px;">alarm</span>`;
    noteDiv.appendChild(reminderBadge);
  }
  
  // 클릭 효과 및 메모 편집 모달 열기
  noteDiv.addEventListener('click', () => {
    // 클릭 효과
    noteDiv.style.transform = 'scale(0.98)';
    setTimeout(() => {
      noteDiv.style.transform = '';
      // 메모 편집 모달 열기
      openEditNoteModal(note.id);
    }, 200);
  });
  
  return noteDiv;
}

// 검색어 하이라이트 함수
function highlightText(text, query) {
  // HTML 특수문자 이스케이프
  const escapeHtml = (str) => {
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
  };
  
  // 텍스트와 검색어 이스케이프
  const escapedText = escapeHtml(text);
  const escapedQuery = escapeHtml(query);
  
  // 대소문자 구분 없이 검색어를 하이라이트
  const regex = new RegExp(escapedQuery, 'gi');
  return escapedText.replace(regex, match => `<span class="search-highlight">${match}</span>`);
}

// 날짜 포맷팅 함수
function formatDate(dateString) {
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

// 새 메모 추가
function addNewNote() {
  const title = newNoteTitle.value.trim();
  const content = newNoteContent.value.trim();
  
  // 제목이나 내용 중 하나는 필수
  if (!title && !content) return;
  
  const tags = newNoteTags.value
    .split(',')
    .map(tag => tag.trim())
    .filter(tag => tag);
  
  // 메모 객체 생성 (초기값은 null로 설정)
  const newNote = {
    id: Date.now().toString(),
    title: title,
    content: content,
    tags: tags,
    url: null,  // URL은 현재 탭에서 가져올 예정
    reminder: null,
    createdAt: new Date().toISOString(),
    pinned: false,
    completed: false
  };
  
  // 현재 활성화된 탭의 URL 가져오기
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    // 활성 탭이 있으면 URL 저장
    if (tabs && tabs.length > 0 && tabs[0].url) {
      // chrome:// 페이지나 확장 페이지는 제외
      if (!tabs[0].url.startsWith('chrome://') && !tabs[0].url.startsWith('chrome-extension://')) {
        newNote.url = tabs[0].url;
      }
    }
    
    // 저장소에 메모 저장
    chrome.storage.sync.get(['notes'], (result) => {
      const notes = result.notes || [];
      notes.unshift(newNote);
      
      chrome.storage.sync.set({ notes }, () => {
        // 입력 필드 초기화
        newNoteTitle.value = '';
        newNoteContent.value = '';
        newNoteTags.value = '';
        newNoteTitle.classList.remove('has-content');
        newNoteContent.classList.remove('has-content');
        newNoteTags.classList.remove('has-content');
        
        // 성공 토스트 메시지 표시
        showToast('메모가 저장되었습니다.');
        
        // 화면 갱신
        loadNotes();
      });
    });
  });
}

// 토스트 메시지 표시
function showToast(message) {
  toastElement.innerHTML = `
    <span class="material-icons" style="margin-right: 8px;">check_circle</span>
    ${message}
  `;
  toastElement.classList.add('show');
  
  setTimeout(() => {
    toastElement.classList.remove('show');
  }, 3000);
}

// 메모 삭제
function deleteNote(noteId) {
  const confirmDelete = confirm('메모를 삭제하시겠습니까?');
  if (!confirmDelete) return;
  
  chrome.storage.sync.get(['notes'], (result) => {
    const notes = result.notes || [];
    const updatedNotes = notes.filter(note => note.id !== noteId);
    
    chrome.storage.sync.set({ notes: updatedNotes }, () => {
      loadNotes();
      showToast('메모가 삭제되었습니다.');
    });
  });
}

// 메모 고정/해제 토글
function togglePinNote(noteId) {
  chrome.storage.sync.get(['notes'], (result) => {
    const notes = result.notes || [];
    const noteIndex = notes.findIndex(note => note.id === noteId);
    
    if (noteIndex !== -1) {
      const isPinned = notes[noteIndex].pinned;
      notes[noteIndex].pinned = !isPinned;
      
      chrome.storage.sync.set({ notes }, () => {
        loadNotes();
        showToast(isPinned ? '메모 고정이 해제되었습니다.' : '메모가 고정되었습니다.');
      });
    }
  });
}

// 메모 완료/미완료 토글
function toggleCompleteNote(noteId) {
  chrome.storage.sync.get(['notes'], (result) => {
    const notes = result.notes || [];
    const noteIndex = notes.findIndex(note => note.id === noteId);
    
    if (noteIndex !== -1) {
      const isCompleted = notes[noteIndex].completed;
      notes[noteIndex].completed = !isCompleted;
      
      chrome.storage.sync.set({ notes }, () => {
        loadNotes();
        showToast(isCompleted ? '메모가 미완료로 표시되었습니다.' : '메모가 완료로 표시되었습니다.');
      });
    }
  });
}

// Material Design 스타일 날짜 선택기 개선
function createDateTimePicker() {
  const container = document.createElement('div');
  container.className = 'date-time-picker';
  
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  
  container.innerHTML = `
    <div class="date-time-header">
      <span class="material-icons">event</span>
      <span>일정 시간을 선택해주세요</span>
    </div>
    
    <div class="date-time-inputs">
      <div>
        <label for="reminderDate">날짜</label>
        <input type="date" id="reminderDate" value="${year}-${month}-${day}" min="${year}-${month}-${day}">
      </div>
      <div>
        <label for="reminderTime">시간</label>
        <input type="time" id="reminderTime" value="${hours}:${minutes}">
      </div>
    </div>
    
    <div class="preset-times">
      <div class="preset-header">빠른 선택</div>
      <div class="preset-buttons">
        <button class="preset-btn ripple" data-hours="1">1시간 후</button>
        <button class="preset-btn ripple" data-hours="3">3시간 후</button>
        <button class="preset-btn ripple" data-time="tomorrow-9">내일 오전 9시</button>
        <button class="preset-btn ripple" data-time="tomorrow-18">내일 오후 6시</button>
      </div>
    </div>
    
    <div class="date-time-actions">
      <button id="cancelReminder" class="ripple">취소</button>
      <button id="saveReminder" class="ripple">설정 완료</button>
    </div>
  `;
  
  return container;
}

// 리마인더 설정 함수 개선
function setReminder(noteId) {
  // 현재 노트 정보 가져오기
  chrome.storage.sync.get(['notes'], (result) => {
    const notes = result.notes || [];
    const note = notes.find(n => n.id === noteId);
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'reminderModal';
    modal.style.display = 'flex';
    
    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';
    
    // 모달 헤더 추가
    const modalHeader = document.createElement('div');
    modalHeader.className = 'modal-header';
    
    const headerTitle = document.createElement('h2');
    headerTitle.textContent = '리마인더 설정';
    
    const closeButton = document.createElement('button');
    closeButton.className = 'close-button';
    closeButton.innerHTML = '<span class="material-icons">close</span>';
    closeButton.addEventListener('click', () => closeModal(modal));
    
    modalHeader.appendChild(headerTitle);
    modalHeader.appendChild(closeButton);
    
    // 모달 바디 추가
    const modalBody = document.createElement('div');
    modalBody.className = 'modal-body';
    
    const dateTimePicker = createDateTimePicker();
    modalBody.appendChild(dateTimePicker);
    
    // 기존 리마인더가 있는 경우 해당 값 설정
    if (note && note.reminder) {
      const reminderDate = new Date(note.reminder);
      const year = reminderDate.getFullYear();
      const month = (reminderDate.getMonth() + 1).toString().padStart(2, '0');
      const day = reminderDate.getDate().toString().padStart(2, '0');
      const hours = reminderDate.getHours().toString().padStart(2, '0');
      const minutes = reminderDate.getMinutes().toString().padStart(2, '0');
      
      const dateInput = dateTimePicker.querySelector('#reminderDate');
      const timeInput = dateTimePicker.querySelector('#reminderTime');
      
      if (dateInput) dateInput.value = `${year}-${month}-${day}`;
      if (timeInput) timeInput.value = `${hours}:${minutes}`;
    }
    
    // 모달 컨텐츠에 헤더와 바디 추가
    modalContent.appendChild(modalHeader);
    modalContent.appendChild(modalBody);
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // 모달 외부 클릭 시 닫기
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal(modal);
      }
    });
    
    // 키보드 Esc 키로 모달 닫기
    document.addEventListener('keydown', function escHandler(e) {
      if (e.key === 'Escape') {
        closeModal(modal);
        document.removeEventListener('keydown', escHandler);
      }
    });
    
    // 빠른 선택 버튼 이벤트 리스너 등록
    const presetBtns = modalBody.querySelectorAll('.preset-btn');
    presetBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const dateInput = modalBody.querySelector('#reminderDate');
        const timeInput = modalBody.querySelector('#reminderTime');
        const now = new Date();
        
        if (btn.dataset.hours) {
          // X시간 후
          const presetHours = parseInt(btn.dataset.hours);
          const futureDate = new Date(now.getTime() + presetHours * 60 * 60 * 1000);
          
          const year = futureDate.getFullYear();
          const month = (futureDate.getMonth() + 1).toString().padStart(2, '0');
          const day = futureDate.getDate().toString().padStart(2, '0');
          const hours = futureDate.getHours().toString().padStart(2, '0');
          const minutes = futureDate.getMinutes().toString().padStart(2, '0');
          
          dateInput.value = `${year}-${month}-${day}`;
          timeInput.value = `${hours}:${minutes}`;
          
        } else if (btn.dataset.time === 'tomorrow-9') {
          // 내일 오전 9시
          const tomorrow = new Date(now);
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(9, 0, 0, 0);
          
          const year = tomorrow.getFullYear();
          const month = (tomorrow.getMonth() + 1).toString().padStart(2, '0');
          const day = tomorrow.getDate().toString().padStart(2, '0');
          
          dateInput.value = `${year}-${month}-${day}`;
          timeInput.value = '09:00';
          
        } else if (btn.dataset.time === 'tomorrow-18') {
          // 내일 오후 6시
          const tomorrow = new Date(now);
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(18, 0, 0, 0);
          
          const year = tomorrow.getFullYear();
          const month = (tomorrow.getMonth() + 1).toString().padStart(2, '0');
          const day = tomorrow.getDate().toString().padStart(2, '0');
          
          dateInput.value = `${year}-${month}-${day}`;
          timeInput.value = '18:00';
        }
        
        // 버튼 활성화 상태 표시
        presetBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
    
    setTimeout(() => {
      modal.classList.add('show');
    }, 10);
    
    const saveButton = modalBody.querySelector('#saveReminder');
    
    saveButton.addEventListener('click', () => {
      const dateInput = modalBody.querySelector('#reminderDate');
      const timeInput = modalBody.querySelector('#reminderTime');
      
      if (!dateInput.value || !timeInput.value) {
        showToast('날짜와 시간을 모두 입력해주세요.');
        return;
      }
      
      const reminderDate = new Date(`${dateInput.value}T${timeInput.value}`);
      
      if (isNaN(reminderDate.getTime())) {
        showToast('유효한 날짜와 시간을 입력해주세요.');
        return;
      }
      
      if (reminderDate <= new Date()) {
        showToast('미래의 시간으로 설정해주세요.');
        return;
      }
      
      saveReminderToNote(noteId, reminderDate);
      closeModal(modal);
    });
    
  });
}

// 모달 닫기
function closeModal(modal) {
  modal.classList.remove('show');
  setTimeout(() => {
    modal.remove();
  }, 300);
}

// 리마인더 저장
function saveReminderToNote(noteId, reminderDate) {
  chrome.storage.sync.get(['notes'], (result) => {
    const notes = result.notes || [];
    const noteIndex = notes.findIndex(note => note.id === noteId);
    
    if (noteIndex !== -1) {
      notes[noteIndex].reminder = reminderDate.toISOString();
      
      chrome.storage.sync.set({ notes }, () => {
        // 백그라운드에 리마인더 설정 메시지 전송
        chrome.runtime.sendMessage({
          type: 'SET_REMINDER',
          id: noteId,
          time: reminderDate.toISOString()
        });
        
        loadNotes();
        showToast('리마인더가 설정되었습니다.');
      });
    }
  });
}

// 메모 리스트 페이지 열기
function openNoteList() {
  chrome.tabs.create({ url: 'list.html' });
}

// 주간 리포트 페이지 열기
function openWeeklyReport() {
  chrome.tabs.create({ url: 'report.html' });
}

// 메모 편집 모달 열기
function openEditNoteModal(noteId) {
  // 현재 편집 중인 메모 ID 저장
  currentEditingNoteId = noteId;
  
  // 메모 정보 불러오기
  chrome.storage.sync.get(['notes'], (result) => {
    const notes = result.notes || [];
    const note = notes.find(n => n.id === noteId);
    
    if (note) {
      // 모달에 메모 정보 채우기
      editNoteTitle.value = note.title || '';
      editNoteContent.value = note.content || '';
      editNoteTags.value = note.tags ? note.tags.join(', ') : '';
      
      // 입력 필드에 has-content 클래스 추가 (라벨 위치 조정을 위함)
      if (note.title) editNoteTitle.classList.add('has-content');
      if (note.content) editNoteContent.classList.add('has-content');
      if (note.tags && note.tags.length > 0) editNoteTags.classList.add('has-content');
      
      // 모달 표시
      editNoteModal.style.display = 'flex';
      setTimeout(() => {
        editNoteModal.classList.add('show');
        // 내용에 포커스
        editNoteContent.focus();
      }, 10);
    }
  });
}

// 메모 편집 내용 저장
function saveEditNote() {
  // 필드 값 가져오기
  const title = editNoteTitle.value.trim();
  const content = editNoteContent.value.trim();
  
  // 제목이나 내용 중 하나는 필수
  if (!title && !content) {
    alert('제목이나 내용 중 하나는 입력해주세요.');
    return;
  }
  
  // 태그 처리
  const tags = editNoteTags.value
    .split(',')
    .map(tag => tag.trim())
    .filter(tag => tag);
  
  // 메모 정보 업데이트
  chrome.storage.sync.get(['notes'], (result) => {
    const notes = result.notes || [];
    const noteIndex = notes.findIndex(note => note.id === currentEditingNoteId);
    
    if (noteIndex !== -1) {
      // 기존 메모 속성 유지하면서 내용 업데이트
      notes[noteIndex] = {
        ...notes[noteIndex],
        title: title,
        content: content,
        tags: tags,
        updatedAt: new Date().toISOString() // 수정 시간 추가
      };
      
      // 저장
      chrome.storage.sync.set({ notes }, () => {
        // 모달 닫기
        closeEditNoteModal();
        
        // 성공 메시지 표시
        showToast('메모가 수정되었습니다.');
        
        // 메모 목록 갱신
        loadNotes();
      });
    }
  });
}

// 메모 편집 모달 닫기
function closeEditNoteModal() {
  // 모달 애니메이션 효과와 함께 닫기
  editNoteModal.classList.remove('show');
  
  // 애니메이션 종료 후 모달 숨기기
  setTimeout(() => {
    editNoteModal.style.display = 'none';
    
    // 입력 필드 초기화
    editNoteTitle.value = '';
    editNoteContent.value = '';
    editNoteTags.value = '';
    editNoteTitle.classList.remove('has-content');
    editNoteContent.classList.remove('has-content');
    editNoteTags.classList.remove('has-content');
    
    // 현재 편집 중인 메모 ID 초기화
    currentEditingNoteId = null;
  }, 300);
}