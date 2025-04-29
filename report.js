document.addEventListener('DOMContentLoaded', function() {
  // DOM 요소
  const dateRangeEl = document.getElementById('dateRange');
  const totalNotesEl = document.getElementById('totalNotes');
  const completedNotesEl = document.getElementById('completedNotes');
  const pendingNotesEl = document.getElementById('pendingNotes');
  const tagDistributionEl = document.getElementById('tagDistribution');
  const pinnedNotesEl = document.getElementById('pinnedNotes');
  const reminderNotesEl = document.getElementById('reminderNotes');
  const weeklyReflectionEl = document.getElementById('weeklyReflection');
  const saveReflectionButton = document.getElementById('saveReflectionButton');
  const exportReportButton = document.getElementById('exportReportButton');
  const startNewWeekButton = document.getElementById('startNewWeekButton');
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toastMessage');
  
  // 데이터 저장
  let weeklyNotes = [];
  let weeklyReflection = '';
  let reportStartDate = null;
  let reportEndDate = null;
  
  // 초기화 함수
  async function initialize() {
    // 날짜 범위 계산 (오늘이 포함된 주의 월요일부터 일요일)
    const today = new Date();
    const currentDay = today.getDay(); // 0 = 일요일, 1 = 월요일, ..., 6 = 토요일
    const monday = new Date(today);
    monday.setDate(today.getDate() - currentDay + (currentDay === 0 ? -6 : 1));
    monday.setHours(0, 0, 0, 0);
    
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    
    reportStartDate = monday;
    reportEndDate = sunday;
    
    // 날짜 범위 표시
    dateRangeEl.textContent = `${formatDate(monday)} ~ ${formatDate(sunday)}`;
    
    // 메모 데이터 로드
    await loadWeeklyNotes(monday, sunday);
    
    // 저장된 회고 로드
    await loadReflection();
    
    // 이벤트 리스너 설정
    setupEventListeners();
  }
  
  // 날짜 포맷 (YYYY-MM-DD)
  function formatDate(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
  
  // 주간 메모 로드
  async function loadWeeklyNotes(startDate, endDate) {
    return new Promise((resolve) => {
      chrome.storage.sync.get(['notes'], function(result) {
        if (!result.notes || result.notes.length === 0) {
          showNoNotesMessage();
          resolve();
          return;
        }
        
        // 해당 주의 메모만 필터링
        weeklyNotes = result.notes.filter(note => {
          const noteDate = new Date(note.createdAt);
          return noteDate >= startDate && noteDate <= endDate;
        });
        
        if (weeklyNotes.length === 0) {
          showNoNotesMessage();
          resolve();
          return;
        }
        
        // 통계 계산 및 표시
        const completedNotes = weeklyNotes.filter(note => note.completed);
        
        totalNotesEl.textContent = weeklyNotes.length;
        completedNotesEl.textContent = completedNotes.length;
        pendingNotesEl.textContent = weeklyNotes.length - completedNotes.length;
        
        // 태그별 분포 계산 및 표시
        renderTagDistribution();
        
        // 핀 고정된 중요 메모 표시
        renderPinnedNotes();
        
        // 미완료 리마인더 메모 표시
        renderReminderNotes();
        
        resolve();
      });
    });
  }
  
  // 회고 로드
  async function loadReflection() {
    return new Promise((resolve) => {
      const weekKey = `reflection_${formatDate(reportStartDate)}`;
      
      chrome.storage.sync.get([weekKey], function(result) {
        if (result[weekKey]) {
          weeklyReflection = result[weekKey];
          weeklyReflectionEl.value = weeklyReflection;
        }
        
        resolve();
      });
    });
  }
  
  // 이벤트 리스너 설정
  function setupEventListeners() {
    // 회고 저장
    saveReflectionButton.addEventListener('click', saveReflection);
    
    // 리포트 내보내기
    exportReportButton.addEventListener('click', exportReport);
    
    // 새로운 주 시작
    startNewWeekButton.addEventListener('click', startNewWeek);
  }
  
  // 태그별 분포 렌더링
  function renderTagDistribution() {
    // 태그별 메모 개수 계산
    const tagCounts = {};
    weeklyNotes.forEach(note => {
      if (note.tags && note.tags.length > 0) {
        note.tags.forEach(tag => {
          if (tagCounts[tag]) {
            tagCounts[tag]++;
          } else {
            tagCounts[tag] = 1;
          }
        });
      }
    });
    
    // 태그가 없는 경우
    if (Object.keys(tagCounts).length === 0) {
      tagDistributionEl.innerHTML = '<div class="empty-message">태그를 사용한 메모가 없습니다.</div>';
      return;
    }
    
    // 태그 정렬 (개수 내림차순)
    const sortedTags = Object.keys(tagCounts).sort((a, b) => tagCounts[b] - tagCounts[a]);
    
    // 분포 차트 생성
    tagDistributionEl.innerHTML = '';
    
    const tagChart = document.createElement('div');
    tagChart.className = 'tag-chart';
    
    sortedTags.forEach(tag => {
      const percent = (tagCounts[tag] / weeklyNotes.length) * 100;
      
      const tagBar = document.createElement('div');
      tagBar.className = 'tag-bar';
      tagBar.innerHTML = `
        <div class="tag-name">${tag}</div>
        <div class="tag-bar-container">
          <div class="tag-bar-fill" style="width: ${percent}%"></div>
        </div>
        <div class="tag-count">${tagCounts[tag]}개</div>
      `;
      
      tagChart.appendChild(tagBar);
    });
    
    tagDistributionEl.appendChild(tagChart);
  }
  
  // 핀 고정된 중요 메모 렌더링
  function renderPinnedNotes() {
    const pinnedNotes = weeklyNotes.filter(note => note.pinned);
    
    if (pinnedNotes.length === 0) {
      pinnedNotesEl.innerHTML = '<div class="empty-message">핀 고정된 메모가 없습니다.</div>';
      return;
    }
    
    pinnedNotesEl.innerHTML = '';
    
    // 핀 메모 목록 생성
    const noteList = document.createElement('div');
    noteList.className = 'report-note-list';
    
    pinnedNotes.forEach(note => {
      const noteItem = createNoteItem(note);
      noteList.appendChild(noteItem);
    });
    
    pinnedNotesEl.appendChild(noteList);
  }
  
  // 미완료 리마인더 메모 렌더링
  function renderReminderNotes() {
    const reminderNotes = weeklyNotes.filter(note => note.reminder && !note.completed);
    
    if (reminderNotes.length === 0) {
      reminderNotesEl.innerHTML = '<div class="empty-message">미완료 리마인더 메모가 없습니다.</div>';
      return;
    }
    
    reminderNotesEl.innerHTML = '';
    
    // 리마인더 메모 목록 생성
    const noteList = document.createElement('div');
    noteList.className = 'report-note-list';
    
    // 리마인더 날짜순으로 정렬
    reminderNotes
      .sort((a, b) => new Date(a.reminder) - new Date(b.reminder))
      .forEach(note => {
        const noteItem = createNoteItem(note, true);
        noteList.appendChild(noteItem);
      });
    
    reminderNotesEl.appendChild(noteList);
  }
  
  // 메모 아이템 생성
  function createNoteItem(note, showReminder = false) {
    const noteItem = document.createElement('div');
    noteItem.className = 'report-note-item';
    
    if (note.completed) noteItem.classList.add('completed');
    
    // 메모 생성 날짜
    const createdDate = new Date(note.createdAt);
    const formattedDate = `${createdDate.getFullYear()}-${String(createdDate.getMonth() + 1).padStart(2, '0')}-${String(createdDate.getDate()).padStart(2, '0')}`;
    
    // 리마인더 날짜 (옵션)
    let reminderHtml = '';
    if (showReminder && note.reminder) {
      const reminderDate = new Date(note.reminder);
      const formattedReminder = `${reminderDate.getFullYear()}-${String(reminderDate.getMonth() + 1).padStart(2, '0')}-${String(reminderDate.getDate()).padStart(2, '0')} ${String(reminderDate.getHours()).padStart(2, '0')}:${String(reminderDate.getMinutes()).padStart(2, '0')}`;
      
      reminderHtml = `<div class="note-reminder">⏰ ${formattedReminder}</div>`;
    }
    
    // 태그 표시
    const tagsHtml = note.tags && note.tags.length > 0
      ? `<div class="note-tags">${note.tags.map(tag => 
          `<span class="tag">${tag}</span>`
        ).join('')}</div>`
      : '';
    
    noteItem.innerHTML = `
      <div class="note-header">
        <div class="note-date">${formattedDate}</div>
        <div class="note-status">
          ${note.completed ? '<span class="status-completed">✓ 완료</span>' : '<span class="status-pending">⏳ 미완료</span>'}
        </div>
      </div>
      <div class="note-content">${formatContent(note.content)}</div>
      ${reminderHtml}
      ${tagsHtml}
    `;
    
    // 메모 클릭 시 목록 페이지로 이동 (해당 메모로 포커스)
    noteItem.addEventListener('click', function() {
      chrome.tabs.create({
        url: `list.html?focus=${note.id}`
      });
    });
    
    return noteItem;
  }
  
  // 메모 내용 포매팅
  function formatContent(content) {
    // 내용이 너무 길면 잘라내기
    if (content.length > 150) {
      content = content.substring(0, 147) + '...';
    }
    
    // HTML 이스케이프
    return content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
      .replace(/\n/g, '<br>');
  }
  
  // 메모 없음 메시지 표시
  function showNoNotesMessage() {
    totalNotesEl.textContent = '0';
    completedNotesEl.textContent = '0';
    pendingNotesEl.textContent = '0';
    
    tagDistributionEl.innerHTML = '<div class="empty-message">이번 주에 작성된 메모가 없습니다.</div>';
    pinnedNotesEl.innerHTML = '<div class="empty-message">핀 고정된 메모가 없습니다.</div>';
    reminderNotesEl.innerHTML = '<div class="empty-message">리마인더 메모가 없습니다.</div>';
  }
  
  // 회고 저장
  function saveReflection() {
    const reflection = weeklyReflectionEl.value.trim();
    
    if (!reflection) {
      showToast('회고 내용을 입력해 주세요.');
      return;
    }
    
    weeklyReflection = reflection;
    const weekKey = `reflection_${formatDate(reportStartDate)}`;
    
    chrome.storage.sync.set({ [weekKey]: reflection }, function() {
      showToast('회고가 저장되었습니다.');
    });
  }
  
  // 리포트 내보내기 (텍스트 형식)
  function exportReport() {
    const reportTitle = `QuickNote 주간 리포트 (${formatDate(reportStartDate)} ~ ${formatDate(reportEndDate)})`;
    
    let reportText = reportTitle + '\n\n';
    
    // 통계
    reportText += '📊 통계\n';
    reportText += `총 메모: ${totalNotesEl.textContent}개\n`;
    reportText += `완료된 메모: ${completedNotesEl.textContent}개\n`;
    reportText += `미완료 메모: ${pendingNotesEl.textContent}개\n\n`;
    
    // 태그별 분포
    reportText += '🏷️ 태그별 분포\n';
    const tagCounts = {};
    weeklyNotes.forEach(note => {
      if (note.tags && note.tags.length > 0) {
        note.tags.forEach(tag => {
          if (tagCounts[tag]) {
            tagCounts[tag]++;
          } else {
            tagCounts[tag] = 1;
          }
        });
      }
    });
    
    if (Object.keys(tagCounts).length === 0) {
      reportText += '태그를 사용한 메모가 없습니다.\n';
    } else {
      Object.keys(tagCounts).sort((a, b) => tagCounts[b] - tagCounts[a]).forEach(tag => {
        reportText += `${tag}: ${tagCounts[tag]}개\n`;
      });
    }
    reportText += '\n';
    
    // 핀 고정된 중요 메모
    reportText += '📌 중요 메모\n';
    const pinnedNotes = weeklyNotes.filter(note => note.pinned);
    
    if (pinnedNotes.length === 0) {
      reportText += '핀 고정된 메모가 없습니다.\n';
    } else {
      pinnedNotes.forEach(note => {
        const date = new Date(note.createdAt);
        reportText += `[${formatDate(date)}] ${note.content.substring(0, 50)}${note.content.length > 50 ? '...' : ''}\n`;
      });
    }
    reportText += '\n';
    
    // 미완료 리마인더 메모
    reportText += '⏰ 미완료 리마인더\n';
    const reminderNotes = weeklyNotes.filter(note => note.reminder && !note.completed);
    
    if (reminderNotes.length === 0) {
      reportText += '미완료 리마인더 메모가 없습니다.\n';
    } else {
      reminderNotes
        .sort((a, b) => new Date(a.reminder) - new Date(b.reminder))
        .forEach(note => {
          const reminderDate = new Date(note.reminder);
          const formattedReminder = `${reminderDate.getFullYear()}-${String(reminderDate.getMonth() + 1).padStart(2, '0')}-${String(reminderDate.getDate()).padStart(2, '0')} ${String(reminderDate.getHours()).padStart(2, '0')}:${String(reminderDate.getMinutes()).padStart(2, '0')}`;
          
          reportText += `[${formattedReminder}] ${note.content.substring(0, 50)}${note.content.length > 50 ? '...' : ''}\n`;
        });
    }
    reportText += '\n';
    
    // 회고
    reportText += '💭 주간 회고\n';
    reportText += weeklyReflection || '(작성된 회고가 없습니다)';
    
    // 내보내기 (클립보드 복사 또는 파일 다운로드)
    const blob = new Blob([reportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `quicknote_report_${formatDate(reportStartDate)}.txt`;
    document.body.appendChild(a);
    a.click();
    
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);
    
    showToast('리포트가 다운로드됩니다.');
  }
  
  // 새로운 주 시작하기
  function startNewWeek() {
    if (confirm('새로운 주를 시작하시겠습니까?\n\n미완료 메모는 유지되고, 완료된 메모는 그대로 유지됩니다.')) {
      showToast('새로운 주가 시작되었습니다!');
      
      // 페이지 리로드 (다음 주 리포트로 새로 고침)
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
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