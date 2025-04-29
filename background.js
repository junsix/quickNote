// 익스텐션 설치/업데이트 시 초기화
chrome.runtime.onInstalled.addListener(function(details) {
  // 컨텍스트 메뉴 생성
  chrome.contextMenus.create({
    id: "saveSelection",
    title: "선택 영역을 메모로 저장",
    contexts: ["selection"]
  });
  
  // 알람 설정 (금요일 18시 또는 월요일 9시에 주간 리포트 알림)
  setupWeeklyReportAlarms();
  
  // 사이드패널 설정
  if (chrome.sidePanel) {
    chrome.sidePanel.setOptions({
      path: 'sidebar.html',
      enabled: true
    });
  }
});

// 명령어(단축키) 이벤트 리스너 추가
chrome.commands.onCommand.addListener((command) => {
  if (command === 'activate_side_panel') {
    if (chrome.sidePanel) {
      chrome.sidePanel.open();
    }
  }
});

// 컨텍스트 메뉴 클릭 이벤트
chrome.contextMenus.onClicked.addListener(function(info, tab) {
  if (info.menuItemId === "saveSelection" && info.selectionText) {
    // 텍스트 선택 내용을 메모로 저장
    saveSelectionAsNote(info.selectionText, tab.url);
  }
});

// 알람 이벤트 리스너
chrome.alarms.onAlarm.addListener(function(alarm) {
  if (alarm.name.startsWith('reminder_')) {
    // 메모 리마인더 알람
    const noteId = alarm.name.replace('reminder_', '');
    showReminderNotification(noteId);
  }
  else if (alarm.name === 'weeklyReport_friday' || alarm.name === 'weeklyReport_monday') {
    // 주간 리포트 알람
    showWeeklyReportNotification();
  }
});

// 메시지 처리 (팝업, 리스트 페이지 등에서 보내는 메시지)
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.type === 'SET_REMINDER') {
    // 리마인더 설정
    setReminderAlarm(request.id, request.time);
    sendResponse({ success: true });
  }
  else if (request.type === 'REMOVE_REMINDER') {
    // 리마인더 제거
    removeReminderAlarm(request.id);
    sendResponse({ success: true });
  }
  
  // 비동기적 응답을 위해 true 반환
  return true;
});

// 알림 클릭 이벤트
chrome.notifications.onClicked.addListener(function(notificationId) {
  if (notificationId.startsWith('reminder_')) {
    // 메모 리마인더 알림 클릭 → 해당 메모로 이동
    const noteId = notificationId.replace('reminder_', '');
    chrome.tabs.create({ url: `list.html?focus=${noteId}` });
  }
  else if (notificationId === 'weeklyReport') {
    // 주간 리포트 알림 클릭 → 주간 리포트 페이지 열기
    chrome.tabs.create({ url: 'report.html' });
  }
  
  // 알림 닫기
  chrome.notifications.clear(notificationId);
});

// 선택 영역을 메모로 저장
function saveSelectionAsNote(text, url) {
  const newMemo = {
    id: Date.now().toString(),
    content: text,
    tags: [],
    url: url,
    reminder: null,
    createdAt: new Date().toISOString(),
    pinned: false,
    completed: false
  };
  
  // 저장소에 메모 저장
  chrome.storage.sync.get(['notes'], function(result) {
    const notes = result.notes || [];
    notes.unshift(newMemo); // 최신 메모가 맨 앞에 오도록 추가
    
    chrome.storage.sync.set({ notes }, function() {
      // 성공 알림 표시
      chrome.notifications.create({
        type: 'basic',
        iconUrl: 'icons/icon128.png',
        title: 'QuickNote',
        message: '선택한 텍스트가 메모로 저장되었습니다.',
        buttons: [
          { title: '메모 목록 보기' }
        ]
      });
    });
  });
}

// 리마인더 알람 설정
function setReminderAlarm(noteId, reminderTime) {
  const alarmName = `reminder_${noteId}`;
  const reminderDate = new Date(reminderTime);
  
  // 알람 생성 (현재 시간과의 차이를 분 단위로 계산)
  const now = new Date();
  const delayInMinutes = Math.max(0.1, (reminderDate.getTime() - now.getTime()) / (1000 * 60));
  
  chrome.alarms.create(alarmName, {
    delayInMinutes: delayInMinutes
  });
}

// 리마인더 알람 제거
function removeReminderAlarm(noteId) {
  const alarmName = `reminder_${noteId}`;
  chrome.alarms.clear(alarmName);
}

// 리마인더 알림 표시
function showReminderNotification(noteId) {
  chrome.storage.sync.get(['notes'], function(result) {
    if (!result.notes) return;
    
    const note = result.notes.find(n => n.id === noteId);
    if (!note) return;
    
    // 알림 표시
    chrome.notifications.create(`reminder_${noteId}`, {
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'QuickNote 리마인더',
      message: note.content.length > 100 ? note.content.substring(0, 97) + '...' : note.content,
      buttons: [
        { title: '메모 보기' },
        { title: '완료로 표시' }
      ],
      priority: 2
    });
    
    // 알림 버튼 클릭 이벤트 (완료로 표시)
    chrome.notifications.onButtonClicked.addListener(function(notificationId, buttonIndex) {
      if (notificationId === `reminder_${noteId}` && buttonIndex === 1) {
        markNoteAsCompleted(noteId);
      }
    });
  });
}

// 메모 완료로 표시
function markNoteAsCompleted(noteId) {
  chrome.storage.sync.get(['notes'], function(result) {
    if (!result.notes) return;
    
    const notes = result.notes;
    const index = notes.findIndex(n => n.id === noteId);
    
    if (index !== -1) {
      notes[index].completed = true;
      chrome.storage.sync.set({ notes });
    }
  });
}

// 주간 리포트 알람 설정
function setupWeeklyReportAlarms() {
  // 금요일 18시 알람
  chrome.alarms.create('weeklyReport_friday', {
    periodInMinutes: 10080, // 1주일
    when: getNextFridayAtTime(18, 0).getTime()
  });
  
  // 월요일 9시 알람
  chrome.alarms.create('weeklyReport_monday', {
    periodInMinutes: 10080, // 1주일
    when: getNextMondayAtTime(9, 0).getTime()
  });
}

// 주간 리포트 알림 표시
function showWeeklyReportNotification() {
  chrome.notifications.create('weeklyReport', {
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title: 'QuickNote 주간 리포트',
    message: '이번 주 메모 요약과 다음 주 계획을 확인해 보세요.',
    buttons: [
      { title: '리포트 보기' }
    ],
    priority: 1
  });
}

// 다음 금요일의 특정 시간을 구하는 함수
function getNextFridayAtTime(hours, minutes) {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = 일요일, 5 = 금요일
  
  const daysUntilFriday = (dayOfWeek <= 5) ? (5 - dayOfWeek) : (12 - dayOfWeek);
  
  const nextFriday = new Date(now);
  nextFriday.setDate(now.getDate() + daysUntilFriday);
  nextFriday.setHours(hours, minutes, 0, 0);
  
  // 이미 지났으면 다음 주 금요일로
  if (nextFriday.getTime() <= now.getTime()) {
    nextFriday.setDate(nextFriday.getDate() + 7);
  }
  
  return nextFriday;
}

// 다음 월요일의 특정 시간을 구하는 함수
function getNextMondayAtTime(hours, minutes) {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = 일요일, 1 = 월요일
  
  const daysUntilMonday = (dayOfWeek <= 1) ? (1 - dayOfWeek) : (8 - dayOfWeek);
  
  const nextMonday = new Date(now);
  nextMonday.setDate(now.getDate() + daysUntilMonday);
  nextMonday.setHours(hours, minutes, 0, 0);
  
  // 이미 지났으면 다음 주 월요일로
  if (nextMonday.getTime() <= now.getTime()) {
    nextMonday.setDate(nextMonday.getDate() + 7);
  }
  
  return nextMonday;
}