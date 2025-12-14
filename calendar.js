class Calendar {
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
    if (!supabase) { this.shifts.clear(); this.render(); return; }
    if (!currentUser) return;
    const y = this.cursor.getFullYear();
    const m = this.cursor.getMonth() + 1;
    const monthStr = `${y}-${String(m).padStart(2, '0')}`;

    const { data } = await supabase
      .from('schedule')
      .select('date, shift_id')
      .eq('user_id', currentUser.id)
      .eq('month', monthStr);

    this.shifts.clear();
    if (data) {
      data.forEach(item => {
        if (item.shift_id) {
          const s = (globalShiftTypes || []).find(x => String(x.id) === String(item.shift_id));
          if (s) this.shifts.set(item.date, s);
        }
      });
    }
    this.render();
  }

  renderStructure() {
    this.container.innerHTML = `
      <div class="card calendar-card" style="background:transparent; border:none; padding:0;">
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
    ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'].forEach(d => {
      const el = document.createElement('div');
      el.className = 'cal-dow';
      el.textContent = d;
      dowRow.appendChild(el);
    });
  }

  attachEvents() {
    document.getElementById('calPrev').onclick = () => { this.cursor.setMonth(this.cursor.getMonth() - 1); this.loadMyShifts(); };
    document.getElementById('calNext').onclick = () => { this.cursor.setMonth(this.cursor.getMonth() + 1); this.loadMyShifts(); };
    document.getElementById('calToday').onclick = () => { this.cursor = new Date(); this.loadMyShifts(); };
  }

  render() {
    const grid = document.getElementById('calGrid');
    const title = document.getElementById('calTitle');
    grid.innerHTML = '';
    const y = this.cursor.getFullYear();
    const m = this.cursor.getMonth();
    title.textContent = new Date(y, m, 1).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
    
    const firstDay = new Date(y, m, 1);
    let startOffset = firstDay.getDay() || 7;
    startOffset -= 1;

    for(let i=0; i<startOffset; i++) {
      const el = document.createElement('div'); el.className = 'cal-day other'; grid.appendChild(el);
    }

    const daysInMonth = new Date(y, m+1, 0).getDate();
    const todayStr = new Date().toISOString().slice(0, 10);

    for(let d=1; d<=daysInMonth; d++) {
      const dateObj = new Date(y, m, d);
      const dateKey = new Date(dateObj.getTime() - (dateObj.getTimezoneOffset() * 60000)).toISOString().slice(0, 10);
      
      const cell = document.createElement('div');
      cell.className = 'cal-day';
      if (dateKey === todayStr) cell.classList.add('today');

      const num = document.createElement('div'); num.className = 'daynum'; num.textContent = d;
      cell.appendChild(num);

      if (this.shifts.has(dateKey)) {
        const shift = this.shifts.get(dateKey);
        const marker = document.createElement('div');
        marker.className = 'shift-marker';
        // Используем текст смены (10:00-19:00)
        marker.textContent = `${shift.start_time.slice(0,5)} - ${shift.end_time.slice(0,5)}`;
        // Подсветка "рабочего" стиля
        cell.appendChild(marker);
      }
      grid.appendChild(cell);
    }
  }
}
