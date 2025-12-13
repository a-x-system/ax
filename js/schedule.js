
import { supabase, getAllProfiles, getShiftTypes } from './supabaseClient.js';

export class ScheduleManager {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.currentDate = new Date();
    this.profiles = [];
    this.shiftTypes = [];
    this.scheduleData = []; // Кэш графика
  }

  async init() {
    this.container.innerHTML = '<div class="loader">Загрузка графика...</div>';
    
    // Параллельная загрузка справочников
    const [profiles, shifts] = await Promise.all([
      getAllProfiles(),
      getShiftTypes()
    ]);
    
    this.profiles = profiles;
    this.shiftTypes = shifts;
    
    this.renderControls();
    await this.loadMonthData();
  }

  renderControls() {
    const y = this.currentDate.getFullYear();
    const m = this.currentDate.getMonth();
    const monthName = new Date(y, m, 1).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });

    this.container.innerHTML = `
      <div class="schedule-controls">
        <div class="month-nav">
          <button id="schedPrev" class="btn btn-sm">←</button>
          <h2 style="text-transform: capitalize; margin: 0 15px;">${monthName}</h2>
          <button id="schedNext" class="btn btn-sm">→</button>
        </div>
        <div class="actions">
           <button class="btn btn-primary" onclick="alert('Функция копирования в разработке')">Копировать прошлый</button>
        </div>
      </div>
      <div class="table-responsive">
        <table class="schedule-table" id="schedTable">
          <thead>
            <tr id="schedHeaderRow"><th>Сотрудник</th></tr>
          </thead>
          <tbody id="schedBody"></tbody>
        </table>
      </div>
    `;

    document.getElementById('schedPrev').onclick = () => this.changeMonth(-1);
    document.getElementById('schedNext').onclick = () => this.changeMonth(1);
  }

  changeMonth(delta) {
    this.currentDate.setMonth(this.currentDate.getMonth() + delta);
    this.renderControls(); // Перерисовать заголовок
    this.loadMonthData(); // Загрузить данные
  }

  async loadMonthData() {
    const y = this.currentDate.getFullYear();
    const m = this.currentDate.getMonth() + 1;
    const monthStr = `${y}-${String(m).padStart(2, '0')}`; // "2025-12"

    // Запрос к Supabase
    const { data, error } = await supabase
      .from('schedule')
      .select('*')
      .eq('month', monthStr);

    if (error) {
      console.error('Ошибка загрузки:', error);
      return;
    }

    this.scheduleData = data || [];
    this.renderTable(y, m - 1);
  }

  renderTable(year, month) {
    const headerRow = document.getElementById('schedHeaderRow');
    const tbody = document.getElementById('schedBody');
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // 1. Заголовки дней
    // Очистить старые (кроме первого "Сотрудник")
    while (headerRow.children.length > 1) {
      headerRow.removeChild(headerRow.lastChild);
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const th = document.createElement('th');
      const dateObj = new Date(year, month, d);
      const dayName = dateObj.toLocaleDateString('ru-RU', { weekday: 'short' });
      
      th.innerHTML = `${d}<br><small>${dayName}</small>`;
      if (dayName === 'сб' || dayName === 'вс') th.classList.add('weekend');
      headerRow.appendChild(th);
    }
    // Колонка "Итого"
    const thTotal = document.createElement('th');
    thTotal.textContent = 'Итого';
    headerRow.appendChild(thTotal);

    // 2. Строки сотрудников
    tbody.innerHTML = '';
    
    if (this.profiles.length === 0) {
      tbody.innerHTML = '<tr><td colspan="35">Нет сотрудников. Добавьте их в базу.</td></tr>';
      return;
    }

    this.profiles.forEach(user => {
      const tr = document.createElement('tr');
      
      // Имя
      const tdName = document.createElement('td');
      tdName.className = 'sticky-col';
      tdName.textContent = user.full_name || 'Без имени';
      tr.appendChild(tdName);

      let totalHours = 0;

      // Ячейки дней
      for (let d = 1; d <= daysInMonth; d++) {
        const td = document.createElement('td');
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        
        // Поиск смены в кэше
        const record = this.scheduleData.find(s => s.user_id === user.id && s.date === dateStr);
        const shiftId = record ? record.shift_id : '';

        // Селект
        const select = document.createElement('select');
        select.className = `shift-select shift-${shiftId || 'none'}`;
        select.dataset.userId = user.id;
        select.dataset.date = dateStr;
        
        // Опция "Пусто" (Выходной)
        const optDefault = document.createElement('option');
        optDefault.value = '';
        optDefault.text = '';
        select.appendChild(optDefault);

        // Опции смен
        this.shiftTypes.forEach(st => {
          const opt = document.createElement('option');
          opt.value = st.id;
          opt.textContent = st.id; // Кратко: "1", "2"
          opt.title = st.title; // Тултип: "10:00-19:00"
          if (String(st.id) === String(shiftId)) opt.selected = true;
          select.appendChild(opt);
        });

        // Подсчет часов (грубо, для примера)
        if (shiftId) {
          const shiftInfo = this.shiftTypes.find(s => s.id === shiftId);
          if (shiftInfo) totalHours += 9; // Пока хардкод, потом сделаем расчет из start_time/end_time
        }

        // Событие сохранения
        select.onchange = (e) => this.handleShiftChange(e.target);

        td.appendChild(select);
        tr.appendChild(td);
      }

      // Итого часов
      const tdTotal = document.createElement('td');
      tdTotal.innerHTML = `<b>${totalHours}</b>`;
      tr.appendChild(tdTotal);

      tbody.appendChild(tr);
    });
  }

  async handleShiftChange(select) {
    const userId = select.dataset.userId;
    const date = select.dataset.date;
    const shiftId = select.value ? parseInt(select.value) : null;
    const monthStr = date.slice(0, 7);

    // Визуальная реакция сразу
    select.className = `shift-select shift-${shiftId || 'none'} saving`;

    // Отправка в БД
    const { error } = await supabase
      .from('schedule')
      .upsert({
        user_id: userId,
        date: date,
        month: monthStr,
        shift_id: shiftId,
        is_day_off: !shiftId
      }, { onConflict: 'user_id, date' });

    if (error) {
      alert('Ошибка сохранения!');
      select.classList.add('error');
    } else {
      select.classList.remove('saving');
      // Обновить кэш
      const idx = this.scheduleData.findIndex(s => s.user_id === userId && s.date === date);
      if (idx >= 0) {
        this.scheduleData[idx].shift_id = shiftId;
      } else {
        this.scheduleData.push({ user_id: userId, date, month: monthStr, shift_id: shiftId });
      }
    }
  }
}
