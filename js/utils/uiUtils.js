import { formatDate, highlightText, formatUrl } from './formatUtils.js';

/**
 * 메모 요소 생성 함수
 * @param {Object} note - 메모 객체
 * @param {string} searchQuery - 검색어 (하이라이트용)
 * @param {Object} handlers - 이벤트 핸들러 객체
 * @returns {HTMLElement} 생성된 메모 요소
 */
export function createNoteElement(note, searchQuery, handlers) {
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
  if (searchQuery && titleText) {
    titleDiv.innerHTML = highlightText(titleText, searchQuery);
  } else {
    titleDiv.textContent = titleText;
  }
  noteContent.appendChild(titleDiv);
  
  // 메모 내용
  if (note.title || note.content.length > 30) { // 제목이 있거나 내용이 길면 내용 표시
    const contentDiv = document.createElement('div');
    contentDiv.className = 'note-content';
    
    // 검색어에 따른 내용 하이라이트 처리
    if (searchQuery && note.content) {
      contentDiv.innerHTML = highlightText(note.content, searchQuery);
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
    const displayUrl = formatUrl(note.url);
    
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
      if (searchQuery && tag.toLowerCase().includes(searchQuery.toLowerCase())) {
        tagSpan.innerHTML = `
          <span class="material-icons" style="font-size: 12px; margin-right: 2px;">label</span>
          ${highlightText(tag, searchQuery)}`;
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
    if (handlers.onSetReminder) handlers.onSetReminder(note.id);
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
    if (handlers.onTogglePin) handlers.onTogglePin(note.id);
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
    if (handlers.onToggleComplete) handlers.onToggleComplete(note.id);
  };
  actionGroup2.appendChild(completeButton);
  
  // 삭제 버튼
  const deleteButton = document.createElement('button');
  deleteButton.className = 'button-icon delete-btn ripple';
  deleteButton.innerHTML = `<span class="material-icons">delete_outline</span>`;
  deleteButton.title = '메모 삭제';
  deleteButton.onclick = (e) => {
    e.stopPropagation();
    if (handlers.onDelete) handlers.onDelete(note.id);
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
    reminderBadge.className = 'note-reminder';
    reminderBadge.innerHTML = `<span class="material-icons" style="font-size: 14px;">alarm</span> ${formatDate(note.reminder)}`;
    noteContent.appendChild(reminderBadge);
  }
  
  // 클릭 효과 및 메모 편집 모달 열기
  noteDiv.addEventListener('click', () => {
    // 클릭 효과
    noteDiv.style.transform = 'scale(0.98)';
    setTimeout(() => {
      noteDiv.style.transform = '';
      // 메모 편집 모달 열기
      if (handlers.onEdit) handlers.onEdit(note.id);
    }, 200);
  });
  
  return noteDiv;
}

/**
 * 토스트 메시지 표시
 * @param {HTMLElement} toastElement - 토스트 요소
 * @param {string} message - 표시할 메시지
 * @param {string} type - 토스트 유형 ('success', 'error', 'info' 등)
 */
export function showToast(toastElement, message, type = 'success') {
  // 아이콘 설정
  let icon = 'check_circle';
  switch(type) {
    case 'error':
      icon = 'error_outline';
      break;
    case 'warning':
      icon = 'warning';
      break;
    case 'info':
      icon = 'info';
      break;
    default:
      icon = 'check_circle';
  }
  
  // 토스트 메시지 내용 설정
  toastElement.innerHTML = `
    <span class="material-icons" style="margin-right: 8px;">${icon}</span>
    ${message}
  `;
  
  // 토스트 표시
  toastElement.classList.add('show');
  
  // 일정 시간 후 토스트 숨기기
  setTimeout(() => {
    toastElement.classList.remove('show');
  }, 3000);
}

/**
 * Material 디자인 입력 필드 셋업
 */
export function setupMaterialInputs() {
  const inputs = document.querySelectorAll('input, textarea');
  
  inputs.forEach(input => {
    // 값이 있으면 has-content 클래스 추가
    if (input.value) {
      input.classList.add('has-content');
    }
    
    // 입력 필드 이벤트 리스너 추가
    input.addEventListener('input', () => {
      if (input.value) {
        input.classList.add('has-content');
      } else {
        input.classList.remove('has-content');
      }
    });
  });
}

/**
 * 리마인더 모달 생성
 * @param {Object} options - 옵션 객체
 * @returns {HTMLElement} 생성된 모달 요소
 */
export function createReminderModal(options = {}) {
  const { onSave, onCancel, reminderDate = new Date() } = options;
  
  // 모달 컨테이너 생성
  const modal = document.createElement('div');
  modal.className = 'modal';
  modal.id = 'reminderModal';
  modal.style.display = 'flex';
  
  const modalContent = document.createElement('div');
  modalContent.className = 'modal-content';
  
  // 모달 헤더 생성
  const modalHeader = document.createElement('div');
  modalHeader.className = 'modal-header';
  
  const headerTitle = document.createElement('h2');
  headerTitle.textContent = '리마인더 설정';
  
  const closeButton = document.createElement('button');
  closeButton.className = 'close-button';
  closeButton.innerHTML = '<span class="material-icons">close</span>';
  closeButton.addEventListener('click', () => closeModal(modal, onCancel));
  
  modalHeader.appendChild(headerTitle);
  modalHeader.appendChild(closeButton);
  
  // 현재 날짜/시간 계산
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  
  // 기존 리마인더 있으면 사용
  let dateValue = `${year}-${month}-${day}`;
  let timeValue = `${hours}:${minutes}`;
  
  if (reminderDate) {
    const date = new Date(reminderDate);
    dateValue = `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
    timeValue = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  }
  
  // 모달 본문 생성
  const modalBody = document.createElement('div');
  modalBody.className = 'modal-body';
  modalBody.innerHTML = `
    <div class="date-time-header">
      <span class="material-icons">event</span>
      <span>일정 시간을 선택해주세요</span>
    </div>
    
    <div class="date-time-inputs">
      <div>
        <label for="reminderDate">날짜</label>
        <input type="date" id="reminderDate" value="${dateValue}" min="${year}-${month}-${day}">
      </div>
      <div>
        <label for="reminderTime">시간</label>
        <input type="time" id="reminderTime" value="${timeValue}">
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
  
  // 모달 구성 완료
  modalContent.appendChild(modalHeader);
  modalContent.appendChild(modalBody);
  modal.appendChild(modalContent);
  
  // 모달 이벤트 핸들러 추가
  setTimeout(() => {
    // 빠른 선택 버튼 이벤트
    const presetButtons = modalBody.querySelectorAll('.preset-btn');
    presetButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const dateInput = modalBody.querySelector('#reminderDate');
        const timeInput = modalBody.querySelector('#reminderTime');
        
        if (dateInput && timeInput) {
          const currentDate = new Date();
          
          if (btn.dataset.hours) {
            // X시간 후 설정
            const hours = parseInt(btn.dataset.hours);
            const futureDate = new Date(currentDate.getTime() + (hours * 60 * 60 * 1000));
            
            dateValue = `${futureDate.getFullYear()}-${(futureDate.getMonth()+1).toString().padStart(2, '0')}-${futureDate.getDate().toString().padStart(2, '0')}`;
            timeValue = `${futureDate.getHours().toString().padStart(2, '0')}:${futureDate.getMinutes().toString().padStart(2, '0')}`;
          } else if (btn.dataset.time === 'tomorrow-9') {
            // 내일 오전 9시
            const tomorrow = new Date(currentDate);
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(9, 0, 0, 0);
            
            dateValue = `${tomorrow.getFullYear()}-${(tomorrow.getMonth()+1).toString().padStart(2, '0')}-${tomorrow.getDate().toString().padStart(2, '0')}`;
            timeValue = '09:00';
          } else if (btn.dataset.time === 'tomorrow-18') {
            // 내일 오후 6시
            const tomorrow = new Date(currentDate);
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(18, 0, 0, 0);
            
            dateValue = `${tomorrow.getFullYear()}-${(tomorrow.getMonth()+1).toString().padStart(2, '0')}-${tomorrow.getDate().toString().padStart(2, '0')}`;
            timeValue = '18:00';
          }
          
          dateInput.value = dateValue;
          timeInput.value = timeValue;
          
          // 버튼 활성화 상태
          presetButtons.forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
        }
      });
    });
    
    // 저장 버튼 이벤트
    const saveButton = modal.querySelector('#saveReminder');
    if (saveButton) {
      saveButton.addEventListener('click', () => {
        const dateInput = modal.querySelector('#reminderDate');
        const timeInput = modal.querySelector('#reminderTime');
        
        if (dateInput && timeInput && dateInput.value && timeInput.value) {
          const reminderDate = new Date(`${dateInput.value}T${timeInput.value}`);
          
          if (!isNaN(reminderDate.getTime())) {
            closeModal(modal, () => {
              if (onSave) onSave(reminderDate);
            });
          }
        }
      });
    }
    
    // 취소 버튼 이벤트
    const cancelButton = modal.querySelector('#cancelReminder');
    if (cancelButton) {
      cancelButton.addEventListener('click', () => {
        closeModal(modal, onCancel);
      });
    }
    
    // 모달 외부 클릭 시 닫기
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeModal(modal, onCancel);
      }
    });
  }, 0);
  
  setTimeout(() => {
    modal.classList.add('show');
  }, 10);
  
  return modal;
}

/**
 * 모달 닫기
 * @param {HTMLElement} modal - 모달 요소
 * @param {Function} callback - 모달이 닫힌 후 실행할 콜백
 */
export function closeModal(modal, callback) {
  modal.classList.remove('show');
  setTimeout(() => {
    modal.remove();
    if (callback) callback();
  }, 300);
}