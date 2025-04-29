document.addEventListener('DOMContentLoaded', function() {
  // DOM 요소
  const searchInput = document.getElementById('searchInput');
  const sortSelect = document.getElementById('sortSelect');
  const memoList = document.getElementById('memoList');
  const filterChips = document.getElementById('filterChips');
  const darkModeToggle = document.getElementById('darkModeToggle');
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toastMessage');
  
  // 모달 관련 요소
  const memoModal = document.getElementById('memoModal');
  const closeModalButton = document.getElementById('closeModalButton');
  const editMemoContent = document.getElementById('editMemoContent');
  const editTagInput = document.getElementById('editTagInput');
  const editTagSuggestions = document.getElementById('editTagSuggestions');
  const editIncludeUrl = document.getElementById('editIncludeUrl');
  const editCurrentUrl = document.getElementById('editCurrentUrl');
  const editSetReminder = document.getElementById('editSetReminder');
  const editReminderContainer = document.getElementById('editReminderContainer');
  const editReminderTime = document.getElementById('editReminderTime');
  const editCompleted = document.getElementById('editCompleted');
  const saveEditButton = document.getElementById('saveEditButton');
  const pinMemoButton = document.getElementById('pinMemoButton');
  const deleteMemoButton = document.getElementById('deleteMemoButton');
  
  // 상태 변수
  let allNotes = [];
  let filteredNotes = [];
  let allTags = [];
  let currentFilters = [];
  let currentEditingId = null;
  
  // 초기화 함수
  async function initialize() {
    // 테마 설정 불러오기
    loadThemePreference();
    
    // 메모 데이터 로드
    await loadNotes();
    
    // 이벤트 리스너 설정
    setupEventListeners();
  }
  
  // 테마 설정 불러오기
  function loadThemePreference() {
    chrome.storage.sync.get(['darkMode'], function(result) {
      const isDarkMode = result.darkMode || false;
      darkModeToggle.checked = isDarkMode;
      document.body.classList.toggle('dark-mode', isDarkMode);
    });
  }
  
  // 메모 데이터 로드
  async function loadNotes() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(['notes'], function(result) {
        if (result.notes && result.notes.length > 0) {
          allNotes = result.notes;
          
          // 태그 추출
          const tagSet = new Set();
          allNotes.forEach(note => {
            if (note.tags && note.tags.length) {
              note.tags.forEach(tag => tagSet.add(tag));
            }
          });
          
          allTags = Array.from(tagSet);
          
          // 최신순으로 정렬
          sortNotes('newest');
        } else {
          memoList.innerHTML = '<div class="empty-state">저장된 메모가 없습니다.<br>메모를 추가해 보세요!</div>';
        }
        
        resolve();
      });
    });
  }
  
  // 이벤트 리스너 설정
  function setupEventListeners() {
    // 검색 입력
    searchInput.addEventListener('input', function() {
      filterNotes();
    });
    
    // 정렬 방식 변경
    sortSelect.addEventListener('change', function() {
      sortNotes(this.value);
    });
    
    // 다크 모드 전환
    darkModeToggle.addEventListener('change', function() {
      const isDarkMode = this.checked;
      document.body.classList.toggle('dark-mode', isDarkMode);
      chrome.storage.sync.set({ darkMode: isDarkMode });
    });
    
    // 모달 닫기
    closeModalButton.addEventListener('click', function() {
      memoModal.classList.remove('show');
    });
    
    // 모달 외부 클릭 시 닫기
    window.addEventListener('click', function(event) {
      if (event.target === memoModal) {
        memoModal.classList.remove('show');
      }
    });
    
    // 편집 저장 버튼
    saveEditButton.addEventListener('click', saveEdit);
    
    // 핀 고정 버튼
    pinMemoButton.addEventListener('click', togglePin);
    
    // 삭제 버튼
    deleteMemoButton.addEventListener('click', deleteMemo);
    
    // 태그 자동 완성
    editTagInput.addEventListener('input', function() {
      showTagSuggestions(this.value, editTagSuggestions, (tag) => {
        const parts = editTagInput.value.split(',');
        parts.pop();
        if (parts.length > 0) {
          editTagInput.value = parts.join(',') + ', ' + tag;
        } else {
          editTagInput.value = tag;
        }
        editTagSuggestions.innerHTML = '';
        editTagInput.focus();
      });
    });
    
    // 리마인더 체크박스
    editSetReminder.addEventListener('change', function() {
      editReminderContainer.classList.toggle('hidden', !this.checked);
    });
  }
  
  // 노트 정렬
  function sortNotes(sortMethod) {
    filteredNotes = [...allNotes];
    
    switch (sortMethod) {
      case 'newest':
        filteredNotes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
      case 'oldest':
        filteredNotes.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        break;
      case 'byTag':
        filteredNotes.sort((a, b) => {
          const tagsA = a.tags ? a.tags.join('') : '';
          const tagsB = b.tags ? b.tags.join('') : '';
          return tagsA.localeCompare(tagsB);
        });
        break;
      case 'pinned':
        filteredNotes = filteredNotes.filter(note => note.pinned);
        break;
      case 'withReminder':
        filteredNotes = filteredNotes.filter(note => note.reminder);
        break;
    }
    
    // 핀 고정된 항목을 항상 위로
    if (sortMethod !== 'pinned') {
      filteredNotes.sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return 0;
      });
    }
    
    // 필터 적용
    filterNotes();
  }
  
  // 노트 필터링
  function filterNotes() {
    const searchTerm = searchInput.value.toLowerCase().trim();
    
    // 검색어와 태그 필터를 사용해 필터링
    let filtered = filteredNotes.filter(note => {
      // 검색어로 필터링
      if (searchTerm) {
        const contentMatch = note.content.toLowerCase().includes(searchTerm);
        const tagMatch = note.tags && note.tags.some(tag => 
          tag.toLowerCase().includes(searchTerm)
        );
        
        if (!contentMatch && !tagMatch) {
          return false;
        }
      }
      
      // 선택된 태그 필터로 필터링
      if (currentFilters.length > 0) {
        if (!note.tags || !note.tags.some(tag => currentFilters.includes(tag))) {
          return false;
        }
      }
      
      return true;
    });
    
    // 결과 렌더링
    renderNotes(filtered);
  }
  
  // 노트 렌더링
  function renderNotes(notes) {
    if (notes.length === 0) {
      memoList.innerHTML = '<div class="empty-state">검색 결과가 없습니다.</div>';
      return;
    }
    
    memoList.innerHTML = '';
    
    notes.forEach(note => {
      const memoCard = document.createElement('div');
      memoCard.className = 'memo-card';
      
      if (note.pinned) memoCard.classList.add('pinned');
      if (note.completed) memoCard.classList.add('completed');
      
      // 메모 생성 날짜 포매팅
      const createdDate = new Date(note.createdAt);
      const formattedDate = `${createdDate.getFullYear()}-${String(createdDate.getMonth() + 1).padStart(2, '0')}-${String(createdDate.getDate()).padStart(2, '0')}`;
      
      // URL 표시 (있는 경우에만)
      const urlDisplay = note.url ? `
        <div class="memo-url">
          <a href="${note.url}" target="_blank" title="${note.url}">${formatUrl(note.url)}</a>
        </div>
      ` : '';
      
      // 태그 표시
      const tagsDisplay = note.tags && note.tags.length > 0
        ? `<div class="memo-tags">${note.tags.map(tag => 
            `<span class="tag" data-tag="${tag}">${tag}</span>`
          ).join('')}</div>`
        : '';
      
      // 리마인더 표시
      const reminderDisplay = note.reminder
        ? `<div class="memo-reminder" title="리마인더: ${formatReminderDate(note.reminder)}">⏰</div>`
        : '';
      
      // 핀 상태 표시
      const pinnedDisplay = note.pinned
        ? '<div class="memo-pinned" title="고정된 메모">📌</div>'
        : '';
      
      // 완료 상태 표시
      const completedDisplay = note.completed
        ? '<div class="memo-completed" title="완료됨">✅</div>'
        : '';
      
      memoCard.innerHTML = `
        <div class="memo-header">
          <div class="memo-date">${formattedDate}</div>
          <div class="memo-actions">
            ${reminderDisplay}
            ${pinnedDisplay}
            ${completedDisplay}
          </div>
        </div>
        <div class="memo-content">${formatContent(note.content)}</div>
        ${urlDisplay}
        ${tagsDisplay}
      `;
      
      // 메모 카드 클릭 이벤트
      memoCard.addEventListener('click', function(e) {
        // 태그 클릭 시 태그 필터 추가
        if (e.target.classList.contains('tag')) {
          const tag = e.target.dataset.tag;
          addTagFilter(tag);
          return;
        }
        
        // URL 클릭 시 기본 동작 (링크 열기)
        if (e.target.tagName === 'A') {
          return;
        }
        
        // 메모 편집 모달 열기
        openEditModal(note);
      });
      
      memoList.appendChild(memoCard);
    });
  }
  
  // URL 형식화
  function formatUrl(url) {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return url.substring(0, 30) + (url.length > 30 ? '...' : '');
    }
  }
  
  // 리마인더 날짜 포매팅
  function formatReminderDate(reminderTime) {
    const date = new Date(reminderTime);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }
  
  // 메모 내용 포매팅 (보안을 위해 HTML 이스케이프 및 링크 자동 변환)
  function formatContent(content) {
    // HTML 이스케이프
    const escaped = content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
    
    // 개행 변환
    return escaped
      .replace(/\n/g, '<br>')
      // URL 자동 링크화
      .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>');
  }
  
  // 태그 필터 추가
  function addTagFilter(tag) {
    // 이미 필터에 있는지 확인
    if (!currentFilters.includes(tag)) {
      currentFilters.push(tag);
      renderTagFilters();
      filterNotes();
    }
  }
  
  // 태그 필터 제거
  function removeTagFilter(tag) {
    currentFilters = currentFilters.filter(t => t !== tag);
    renderTagFilters();
    filterNotes();
  }
  
  // 태그 필터 렌더링
  function renderTagFilters() {
    filterChips.innerHTML = '';
    
    currentFilters.forEach(tag => {
      const chip = document.createElement('div');
      chip.className = 'filter-chip';
      chip.innerHTML = `
        <span>${tag}</span>
        <button class="remove-filter">×</button>
      `;
      
      chip.querySelector('.remove-filter').addEventListener('click', function() {
        removeTagFilter(tag);
      });
      
      filterChips.appendChild(chip);
    });
    
    // 필터가 있을 경우 '모두 지우기' 버튼 추가
    if (currentFilters.length > 1) {
      const clearAllChip = document.createElement('div');
      clearAllChip.className = 'filter-chip clear-all';
      clearAllChip.textContent = '모두 지우기';
      
      clearAllChip.addEventListener('click', function() {
        currentFilters = [];
        renderTagFilters();
        filterNotes();
      });
      
      filterChips.appendChild(clearAllChip);
    }
  }
  
  // 태그 자동완성 표시
  function showTagSuggestions(inputText, suggestionElement, onSelect) {
    const currentTag = inputText.split(',').pop().trim();
    
    // # 없이 입력했다면 자동으로 추가
    if (currentTag && !currentTag.startsWith('#') && currentTag.length > 0) {
      const newInput = inputText.substring(0, inputText.lastIndexOf(currentTag)) + '#' + currentTag;
      return newInput;
    }
    
    suggestionElement.innerHTML = '';
    
    if (currentTag && currentTag.length > 1) {
      const suggestions = allTags.filter(tag => 
        tag.toLowerCase().includes(currentTag.toLowerCase().substring(1))
      );
      
      if (suggestions.length > 0) {
        suggestions.slice(0, 5).forEach(tag => {
          const div = document.createElement('div');
          div.textContent = tag;
          div.className = 'tag-suggestion-item';
          div.addEventListener('click', () => onSelect(tag));
          suggestionElement.appendChild(div);
        });
        suggestionElement.classList.remove('hidden');
      } else {
        suggestionElement.classList.add('hidden');
      }
    } else {
      suggestionElement.classList.add('hidden');
    }
    
    return inputText;
  }
  
  // 메모 편집 모달 열기
  function openEditModal(note) {
    currentEditingId = note.id;
    
    // 폼 초기화
    editMemoContent.value = note.content;
    editTagInput.value = note.tags ? note.tags.join(', ') : '';
    editIncludeUrl.checked = !!note.url;
    editCurrentUrl.textContent = note.url || '';
    editCurrentUrl.style.display = note.url ? 'block' : 'none';
    
    editSetReminder.checked = !!note.reminder;
    editReminderContainer.classList.toggle('hidden', !note.reminder);
    
    if (note.reminder) {
      const reminderDate = new Date(note.reminder);
      editReminderTime.valueAsNumber = reminderDate.getTime() - (reminderDate.getTimezoneOffset() * 60000);
    } else {
      const now = new Date();
      now.setHours(now.getHours() + 1);
      editReminderTime.valueAsNumber = now.getTime() - (now.getTimezoneOffset() * 60000);
    }
    
    editCompleted.checked = note.completed || false;
    
    // 핀 버튼 상태 업데이트
    pinMemoButton.classList.toggle('active', note.pinned);
    pinMemoButton.textContent = note.pinned ? '📌' : '📍';
    pinMemoButton.title = note.pinned ? '핀 고정 해제' : '핀 고정';
    
    // 모달 표시
    memoModal.classList.add('show');
    editMemoContent.focus();
  }
  
  // 편집 내용 저장
  function saveEdit() {
    if (!currentEditingId) return;
    
    const index = allNotes.findIndex(note => note.id === currentEditingId);
    if (index === -1) return;
    
    const content = editMemoContent.value.trim();
    if (!content) {
      showToast('메모 내용을 입력해 주세요.');
      return;
    }
    
    // 태그 처리
    let tags = [];
    if (editTagInput.value.trim()) {
      tags = editTagInput.value.split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0)
        .map(tag => tag.startsWith('#') ? tag : '#' + tag);
    }
    
    // URL 처리
    let url = null;
    if (editIncludeUrl.checked && editCurrentUrl.textContent) {
      url = editCurrentUrl.textContent;
    }
    
    // 리마인더 처리
    let reminder = null;
    if (editSetReminder.checked && editReminderTime.value) {
      reminder = editReminderTime.value;
      
      // 기존 알람 제거 및 새 알람 설정
      chrome.runtime.sendMessage({
        type: 'REMOVE_REMINDER',
        id: currentEditingId
      });
      
      chrome.runtime.sendMessage({
        type: 'SET_REMINDER',
        id: currentEditingId,
        time: reminder
      });
    } else {
      // 알람 제거
      chrome.runtime.sendMessage({
        type: 'REMOVE_REMINDER',
        id: currentEditingId
      });
    }
    
    // 메모 업데이트
    allNotes[index] = {
      ...allNotes[index],
      content,
      tags,
      url,
      reminder,
      completed: editCompleted.checked,
      updatedAt: new Date().toISOString()
    };
    
    // 저장
    chrome.storage.sync.set({ notes: allNotes }, function() {
      showToast('메모가 수정되었습니다.');
      memoModal.classList.remove('show');
      
      // 화면 갱신
      sortNotes(sortSelect.value);
    });
  }
  
  // 핀 고정/해제
  function togglePin() {
    if (!currentEditingId) return;
    
    const index = allNotes.findIndex(note => note.id === currentEditingId);
    if (index === -1) return;
    
    // 핀 상태 토글
    allNotes[index].pinned = !allNotes[index].pinned;
    
    // 저장
    chrome.storage.sync.set({ notes: allNotes }, function() {
      const isPinned = allNotes[index].pinned;
      showToast(isPinned ? '메모가 상단에 고정되었습니다.' : '메모 고정이 해제되었습니다.');
      
      // 버튼 상태 업데이트
      pinMemoButton.classList.toggle('active', isPinned);
      pinMemoButton.textContent = isPinned ? '📌' : '📍';
      pinMemoButton.title = isPinned ? '핀 고정 해제' : '핀 고정';
      
      // 화면 갱신
      sortNotes(sortSelect.value);
    });
  }
  
  // 메모 삭제
  function deleteMemo() {
    if (!currentEditingId) return;
    
    if (!confirm('정말 이 메모를 삭제하시겠습니까?')) return;
    
    const index = allNotes.findIndex(note => note.id === currentEditingId);
    if (index === -1) return;
    
    // 알람 제거
    chrome.runtime.sendMessage({
      type: 'REMOVE_REMINDER',
      id: currentEditingId
    });
    
    // 메모 삭제
    allNotes.splice(index, 1);
    
    // 저장
    chrome.storage.sync.set({ notes: allNotes }, function() {
      showToast('메모가 삭제되었습니다.');
      memoModal.classList.remove('show');
      
      // 화면 갱신
      sortNotes(sortSelect.value);
    });
  }
  
  // 토스트 메시지 표시
  function showToast(message) {
    toastMessage.textContent = message;
    toast.classList.remove('hidden');
    
    setTimeout(() => {
      toast.classList.add('hidden');
    }, 3000);
  }
  
  // 초기화 실행
  initialize();
});