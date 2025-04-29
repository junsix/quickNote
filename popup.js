// DOM 요소
const memoTitleInput = document.getElementById('memoTitle'); // 제목 입력 필드
const memoContentInput = document.getElementById('memoContent');
const tagInput = document.getElementById('tagInput');
const includeUrlCheckbox = document.getElementById('includeUrl');
const currentUrlDisplay = document.getElementById('currentUrl');
const setReminderCheckbox = document.getElementById('setReminder');
const reminderContainer = document.getElementById('reminderContainer');
const reminderTimeInput = document.getElementById('reminderTime');
const saveButton = document.getElementById('saveButton');
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toastMessage');
const viewListButton = document.getElementById('viewListButton');

// 태그 제안 관련 변수
const tagSuggestions = document.getElementById('tagSuggestions');
let allTags = [];

// 현재 URL
let currentUrl = '';
let currentTabId = null;

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', function() {
  // 현재 탭 URL 가져오기
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    if (tabs.length > 0) {
      currentUrl = tabs[0].url;
      currentTabId = tabs[0].id;
      currentUrlDisplay.textContent = currentUrl;
    }
  });
  
  // 기존 메모에서 태그 가져오기
  loadAllTags();
  
  // 이벤트 리스너 등록
  saveButton.addEventListener('click', saveMemo);
  setReminderCheckbox.addEventListener('change', toggleReminderInput);
  tagInput.addEventListener('input', handleTagInput);
  tagInput.addEventListener('keydown', handleTagKeydown);
  viewListButton.addEventListener('click', openNotesList);
  
  // 리마인더 기본값 설정
  const now = new Date();
  now.setMinutes(now.getMinutes() + 30); // 30분 후로 기본 설정
  reminderTimeInput.value = now.toISOString().substring(0, 16);
  
  // 자동 포커스
  memoTitleInput.focus();
});

// 모든 태그 로드
function loadAllTags() {
  chrome.storage.sync.get(['notes'], function(result) {
    if (result.notes) {
      const tagSet = new Set();
      result.notes.forEach(note => {
        if (note.tags && Array.isArray(note.tags)) {
          note.tags.forEach(tag => tagSet.add(tag));
        }
      });
      allTags = Array.from(tagSet);
    }
  });
}

// 태그 입력 핸들러
function handleTagInput() {
  // 현재 입력 중인 태그
  const input = tagInput.value;
  const lastTag = input.split(',').pop().trim();
  
  if (lastTag.length < 2) {
    tagSuggestions.innerHTML = '';
    tagSuggestions.classList.add('hidden');
    return;
  }
  
  // 태그 제안
  const matchingTags = allTags.filter(tag => 
    tag.toLowerCase().includes(lastTag.toLowerCase()) && tag.toLowerCase() !== lastTag.toLowerCase()
  );
  
  if (matchingTags.length > 0) {
    tagSuggestions.innerHTML = '';
    matchingTags.forEach(tag => {
      const item = document.createElement('div');
      item.className = 'tag-suggestion-item';
      item.textContent = tag;
      item.addEventListener('click', () => {
        const tags = tagInput.value.split(',');
        tags.pop();
        tags.push(tag);
        tagInput.value = tags.join(', ') + (tags.length > 0 ? ', ' : '');
        tagSuggestions.innerHTML = '';
        tagSuggestions.classList.add('hidden');
        tagInput.focus();
      });
      tagSuggestions.appendChild(item);
    });
    tagSuggestions.classList.remove('hidden');
  } else {
    tagSuggestions.innerHTML = '';
    tagSuggestions.classList.add('hidden');
  }
}

// 태그 입력 시 키보드 이벤트 핸들러
function handleTagKeydown(e) {
  if (e.key === 'Escape') {
    tagSuggestions.innerHTML = '';
    tagSuggestions.classList.add('hidden');
  } else if (e.key === 'ArrowDown' && !tagSuggestions.classList.contains('hidden')) {
    const firstItem = tagSuggestions.querySelector('.tag-suggestion-item');
    if (firstItem) {
      firstItem.focus();
      e.preventDefault();
    }
  }
}

// 리마인더 입력 토글
function toggleReminderInput() {
  if (setReminderCheckbox.checked) {
    reminderContainer.classList.remove('hidden');
  } else {
    reminderContainer.classList.add('hidden');
  }
}

// 메모 저장
function saveMemo() {
  const title = memoTitleInput.value.trim(); // 제목 가져오기
  const content = memoContentInput.value.trim();
  
  // 제목이나 내용 중 하나는 필수
  if (!title && !content) {
    showToast('제목이나 내용을 입력해주세요.');
    return;
  }
  
  // 태그 처리
  const tags = tagInput.value
    .split(',')
    .map(tag => tag.trim())
    .filter(tag => tag);
  
  const newMemo = {
    id: Date.now().toString(),
    title: title, // 제목 필드 추가
    content: content,
    tags: tags,
    url: includeUrlCheckbox.checked ? currentUrl : null,
    reminder: setReminderCheckbox.checked ? new Date(reminderTimeInput.value).toISOString() : null,
    createdAt: new Date().toISOString(),
    pinned: false,
    completed: false
  };
  
  // 저장소에 메모 저장
  chrome.storage.sync.get(['notes'], function(result) {
    const notes = result.notes || [];
    notes.unshift(newMemo); // 최신 메모가 맨 앞에 오도록 추가
    
    chrome.storage.sync.set({ notes }, function() {
      // 리마인더 설정된 경우 background에 알림
      if (newMemo.reminder) {
        chrome.runtime.sendMessage({
          type: 'SET_REMINDER',
          id: newMemo.id,
          time: newMemo.reminder
        });
      }
      
      // 토스트 메시지로 저장 성공 알림
      showToast('메모가 저장되었습니다.');
      
      // 입력 필드 초기화
      memoTitleInput.value = '';
      memoContentInput.value = '';
      tagInput.value = '';
      setReminderCheckbox.checked = false;
      toggleReminderInput();
    });
  });
}

// 팝업 닫기
function closePopup() {
  window.close();
}

// 메모 목록 페이지 열기
function openNotesList() {
  chrome.tabs.create({ url: 'list.html' });
  closePopup();
}

// 토스트 메시지 표시
function showToast(message) {
  toastMessage.textContent = message;
  toast.classList.remove('hidden');
  
  // 자동으로 사라지게 설정
  setTimeout(() => {
    toast.classList.add('hidden');
  }, 3000);
}