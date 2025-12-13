
import { supabase, getCurrentUser } from './supabaseClient.js';

export class Calendar {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.cursor = new Date();
    this.shifts = new Map(); 
    this.init();
  }

  async init() {
    this.renderStructure();
    this.attachEvents();
    await this.loadMyShifts();
  }

  async loadMyShifts() {
    const user = await getCurrentUser();
    if (!user) return;

    const y = this.cursor.getFullYear();
    const m = this.cursor.getMonth() + 1;
    const monthStr = `${y}-${String(m).padStart(2, '0')}`;

    // Запрос: График + Тип смены
    const { data } = await supabase
      .from('schedule')
      .select('date, shift_id, shifts(title, start_time, end_time)')
      .eq('user_id', user.id)
      .eq('month', monthStr);

    this.shifts.clear();
    if (data) {
      data.forEach(item => {
        if (item.shift_id && item.shifts) {
          this.shifts.set(item.date, item.shifts);
        }
      });
    }
    this.render();
  }

  renderStructure() {
    this.container.innerHTML = `
      <div class="card calendar-card">
        <div class="cal-header">
          <div class="cal-title" id="calTitle"></div>
          <div class="cal-nav">
            <button class="cal-btn" id="calPrev">←</button>
            <button class="cal-btn" id="calToday">Сегодня</button>
            <button class="cal-btn" id="calNext">→</button>
          </div>
        </div>
        <div class="cal-grid" id="calDow"></div>
        <div class="cal-grid" id="calGrid"></div>
      </div>
    `;

    const dowRow = document.getElementById('calDow');
    const DOW = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
    DOW.forEach(d => {
      const el = document.createElement('div');
      el.className = 'cal-dow';
      el.textContent = d;
      dowRow.appendChild(el);
    });
  }

  attachEvents() {
    document.getElementById('calPrev').onclick = () => {
      this.cursor.setMonth(this.cursor.getMonth() - 1);
      this.loadMyShifts(); // Перезагружаем данные при смене месяца
    };
    document.getElementById('calNext').onclick = () => {
      this.cursor.setMonth(this.cursor.getMonth() + 1);
      this.loadMyShifts();
    };
    document.getElementById('calToday').onclick = () => {
      this.cursor = new Date();
      this.loadMyShifts();
    };
  }

  render() {
    const grid = document.getElementById('calGrid');
    const title = document.getElementById('calTitle');
    grid.innerHTML = '';

    const y = this.cursor.getFullYear();
    const m = this.cursor.getMonth();
    
    title.textContent = new Date(y, m, 1).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
    title.style.textTransform = 'capitalize';

    const firstDay = new Date(y, m, 1);
    let startOffset = firstDay.getDay(); 
    if (startOffset === 0) startOffset = 7;
    startOffset -= 1;

    for(let i=0; i<startOffset; i++) {
      const el = document.createElement('div');
      el.className = 'cal-day other';
      grid.appendChild(el);
    }

    const daysInMonth = new Date(y, m+1, 0).getDate();
    const todayStr = new Date().toISOString().slice(0, 10);

    for(let d=1; d<=daysInMonth; d++) {
      const dateObj = new Date(y, m, d);
      const dateKey = new Date(dateObj.getTime() - (dateObj.getTimezoneOffset() * 60000)).toISOString().slice(0, 10);

      const cell = document.createElement('div');
      cell.className = 'cal-day';
      if (dateKey === todayStr) cell.classList.add('today');

      const num = document.createElement('div');
      num.className = 'daynum';
      num.textContent = d;
      cell.appendChild(num);

      if (this.shifts.has(dateKey)) {
        const shift = this.shifts.get(dateKey);
        const marker = document.createElement('div');
        marker.className = 'shift-marker';
        // Показываем время "10:00-19:00"
        marker.textContent = `${shift.start_time.slice(0,5)}-${shift.end_time.slice(0,5)}`;
        cell.appendChild(marker);
        cell.style.background = '#e3f2fd'; // Подсветка рабочего дня
      }

      grid.appendChild(cell);
    }
  }
}
