/**
 * AlarmService 클래스 - Chrome 알람 관리 기능 제공
 */
class AlarmService {
  /**
   * 리마인더 알람 설정
   * @param {string} noteId - 메모 ID
   * @param {string} reminderTime - ISO 형식의 알람 시간
   * @returns {Promise<void>}
   */
  static setReminderAlarm(noteId, reminderTime) {
    return new Promise((resolve) => {
      const alarmName = `reminder_${noteId}`;
      const reminderDate = new Date(reminderTime);
      
      // 알람 생성 (현재 시간과의 차이를 분 단위로 계산)
      const now = new Date();
      const delayInMinutes = Math.max(0.1, (reminderDate.getTime() - now.getTime()) / (1000 * 60));
      
      chrome.alarms.create(alarmName, {
        delayInMinutes: delayInMinutes
      }, resolve);
    });
  }
  
  /**
   * 리마인더 알람 제거
   * @param {string} noteId - 메모 ID
   * @returns {Promise<boolean>} 알람 제거 성공 여부
   */
  static removeReminderAlarm(noteId) {
    return new Promise((resolve) => {
      const alarmName = `reminder_${noteId}`;
      chrome.alarms.clear(alarmName, (wasCleared) => {
        resolve(wasCleared);
      });
    });
  }
  
  /**
   * 주간 리포트 알람 설정
   * @returns {Promise<void>}
   */
  static setupWeeklyReportAlarms() {
    return new Promise((resolve) => {
      // 금요일 18시 알람
      chrome.alarms.create('weeklyReport_friday', {
        periodInMinutes: 10080, // 1주일
        when: this.getNextFridayAtTime(18, 0).getTime()
      });
      
      // 월요일 9시 알람
      chrome.alarms.create('weeklyReport_monday', {
        periodInMinutes: 10080, // 1주일
        when: this.getNextMondayAtTime(9, 0).getTime()
      }, resolve);
    });
  }
  
  /**
   * 다음 금요일의 특정 시간을 구하는 함수
   * @param {number} hours - 시간 (0-23)
   * @param {number} minutes - 분 (0-59)
   * @returns {Date} 다음 금요일 날짜
   */
  static getNextFridayAtTime(hours, minutes) {
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
  
  /**
   * 다음 월요일의 특정 시간을 구하는 함수
   * @param {number} hours - 시간 (0-23)
   * @param {number} minutes - 분 (0-59)
   * @returns {Date} 다음 월요일 날짜
   */
  static getNextMondayAtTime(hours, minutes) {
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
}

export default AlarmService;