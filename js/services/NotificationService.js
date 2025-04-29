import StorageService from './StorageService.js';

/**
 * NotificationService 클래스 - 알림 기능 관리
 */
class NotificationService {
  /**
   * 생성자
   */
  constructor() {
    this.storageService = new StorageService();
  }
  
  /**
   * 리마인더 알림 표시
   * @param {string} noteId - 메모 ID
   */
  async showReminderNotification(noteId) {
    try {
      const note = await this.storageService.getNoteById(noteId);
      
      if (!note) {
        console.error('알림을 표시할 메모를 찾을 수 없습니다:', noteId);
        return;
      }
      
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
    } catch (error) {
      console.error('리마인더 알림 표시 중 오류 발생:', error);
    }
  }
  
  /**
   * 주간 리포트 알림 표시
   */
  showWeeklyReportNotification() {
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
  
  /**
   * 선택 텍스트 저장 성공 알림 표시
   */
  showSaveSelectionNotification() {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon128.png',
      title: 'QuickNote',
      message: '선택한 텍스트가 메모로 저장되었습니다.',
      buttons: [
        { title: '메모 목록 보기' }
      ]
    });
  }
  
  /**
   * 메모를 완료로 표시
   * @param {string} noteId - 메모 ID
   */
  async markNoteAsCompleted(noteId) {
    try {
      await this.storageService.updateNote(noteId, {
        completed: true
      });
    } catch (error) {
      console.error('메모 완료 처리 중 오류 발생:', error);
    }
  }
  
  /**
   * 알림 버튼 클릭 이벤트 핸들러 등록
   */
  setupNotificationButtonHandlers() {
    chrome.notifications.onButtonClicked.addListener(async (notificationId, buttonIndex) => {
      if (notificationId.startsWith('reminder_') && buttonIndex === 1) {
        // 리마인더 알림의 '완료로 표시' 버튼 클릭
        const noteId = notificationId.replace('reminder_', '');
        await this.markNoteAsCompleted(noteId);
      }
    });
  }
}

export default NotificationService;