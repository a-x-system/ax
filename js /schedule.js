class ScheduleManager {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.currentDate = new Date();
    this.employees = [];
    this.shiftTypes = [];
    this.scheduleData = [];
  }

  async init() {
    this.container.innerHTML = '<div class="loader">Загрузка...</div>';
    
    // Use global cached data
    this.employees = await getAllEmployees();
    this.shiftTypes = await getShiftTypes();
    
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
      </div>
      <div class="table-responsive">
        <table class="schedule-table" id="schedTable">
          <thead id="schedHead"></thead>
          <tbody id="schedBody"></tbody>
          <tfoot id="schedFoot"></tfoot>
        </table>
      </div>
      <div id="schedLegend" class="legend-grid"></div>
    `;
    document.getElementById('schedPrev').onclick = () => this.changeMonth(-1);
    document.getElementById('schedNext').onclick = () => this.changeMonth(1);
    this.renderLegend();
  }
  
  renderLegend() {
    const leg = document.getElementById('schedLegend');
    leg.innerHTML = '';
    
    // Define Groups
    const groups = [
        { title: 'Директор (1.0)', ids: [1, 2], color: '#ffeb3b', textColor: '#000' },
        { title: 'Продавцы (0.75)', ids: [3, 4, 5, 6, 7], color: '#4caf50', textColor: '#fff' },
        { title: 'Продавцы (0.5)', ids: [8, 9, 10, 11, 12], color: '#2196f3', textColor: '#fff' }
    ];

    groups.forEach(group => {
        // Group Header
        const header = document.createElement('div');
        header.className = 'legend-header';
        header.textContent = group.title;
        leg.appendChild(header);

        // Filter shifts for this group
        const groupShifts = this.shiftTypes.filter(s => group.ids.includes(s.id));
        
        groupShifts.forEach(s => {
           const div = document.createElement('div');
           div.className = 'legend-item';
           div.innerHTML = `<div class="legend-key" style="border-color:${group.color}; color:${group.color}">${s.id}</div> 
                            <span>${s.start_time.slice(0,5)} - ${s.end_time.slice(0,5)}</span>`;
           leg.appendChild(div);
        });
    });

    // Output any other shifts not in groups (e.g. Cleaners or custom)
    const knownIds = groups.flatMap(g => g.ids);
    const others = this.shiftTypes.filter(s => !knownIds.includes(s.id));
    
    if (others.length > 0) {
        const header = document.createElement('div');
        header.className = 'legend-header';
        header.textContent = 'Прочие';
        leg.appendChild(header);
        
        others.forEach(s => {
           const div = document.createElement('div');
           div.className = 'legend-item';
           div.innerHTML = `<div class="legend-key">${s.id}</div> <span>${s.start_time.slice(0,5)} - ${s.end_time.slice(0,5)}</span>`;
           leg.appendChild(div);
        });
    }

    // Добавим B - выходной
    const headerB = document.createElement('div');
    headerB.className = 'legend-header';
    headerB.textContent = 'Обозначения';
    leg.appendChild(headerB);

    const divB = document.createElement('div');
    divB.className = 'legend-item';
    divB.innerHTML = `<div class="legend-key key-b">B</div> <span>Выходной</span>`;
    leg.appendChild(divB);
  }

  changeMonth(delta) {
    this.currentDate.setMonth(this.currentDate.getMonth() + delta);
    this.renderControls();
    this.loadMonthData();
  }

  async loadMonthData() {
    const y = this.currentDate.getFullYear();
    const m = this.currentDate.getMonth() + 1;
    const monthStr = `${y}-${String(m).padStart(2, '0')}`;
    if (!supabase) { this.scheduleData = []; this.renderTable(y, m - 1); return; }
    const { data } = await supabase.from('schedule').select('*').eq('month', monthStr);
    this.scheduleData = data || [];
    this.renderTable(y, m - 1);
  }

  renderTable(year, month) {
    const thead = document.getElementById('schedHead');
    const tbody = document.getElementById('schedBody');
    const tfoot = document.getElementById('schedFoot');
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // --- HEADER ---
    let headerHtml = '<tr><th rowspan="2">№</th><th rowspan="2" class="sticky-col">Фамилия И. О.</th><th rowspan="2">Должность</th>';
    // Days Row
    for (let d = 1; d <= daysInMonth; d++) {
       const dateObj = new Date(year, month, d);
       const dayName = dateObj.toLocaleDateString('ru-RU', { weekday: 'short' });
       const isWeekend = (dayName === 'сб' || dayName === 'вс') ? 'weekend' : '';
       headerHtml += `<th class="${isWeekend}">${d}</th>`;
    }
    headerHtml += '<th rowspan="2">Итого<br>часов</th><th rowspan="2">Вых</th></tr><tr>';
    // Day Names Row
    for (let d = 1; d <= daysInMonth; d++) {
       const dateObj = new Date(year, month, d);
       const dayName = dateObj.toLocaleDateString('ru-RU', { weekday: 'short' });
       const isWeekend = (dayName === 'сб' || dayName === 'вс') ? 'weekend' : '';
       headerHtml += `<th class="${isWeekend}" style="font-size:10px">${dayName}</th>`;
    }
    headerHtml += '</tr>';
    thead.innerHTML = headerHtml;

    // --- BODY ---
    tbody.innerHTML = '';
    if (this.employees.length === 0) { tbody.innerHTML = '<tr><td colspan="40">Нет сотрудников.</td></tr>'; return; }
    
    // Arrays for totals per day
    const dayCounts = new Array(daysInMonth + 1).fill(0);

    this.employees.forEach((user, idx) => {
      const tr = document.createElement('tr');
      
      // Meta info
      let roleName = user.role === 'director' ? 'Директор' : (user.role === 'senior_seller' ? 'Ст. продавец' : 'Продавец');
      tr.innerHTML = `
        <td>${idx + 1}</td>
        <td class="sticky-col" style="text-align:left; padding-left:10px;">${user.full_name}</td>
        <td>${roleName}</td>
      `;

      let totalHours = 0;
      let totalDaysOff = 0;

      for (let d = 1; d <= daysInMonth; d++) {
        const td = document.createElement('td');
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        
        // Logic
        const record = this.scheduleData.find(s => s.user_id === user.id && s.date === dateStr);
        const shiftId = record ? record.shift_id : null; // null = B
        
        // Styling
        if (shiftId) dayCounts[d]++; // Count workers for this day
        else totalDaysOff++;

        // Check permissions
        const canEdit = ['director', 'senior_seller'].includes(currentUser.role);

        if (canEdit) {
            const select = document.createElement('select');
            select.className = `cell-input ${shiftId ? 'cell-work' : 'cell-b'}`;
            select.dataset.userId = user.id;
            select.dataset.date = dateStr;
            
            // Options: B (null) + Shifts
            const optB = document.createElement('option'); optB.value = ''; optB.text = 'B'; 
            if (!shiftId) optB.selected = true;
            select.appendChild(optB);
            
            // Filter shifts based on user role
            let allowedShifts = this.shiftTypes;
            if (user.role === 'director') {
                // Director sees mainly director shifts (1-2)
                allowedShifts = this.shiftTypes.filter(st => [1, 2].includes(st.id));
            } else {
                // Sellers: 3-12
                allowedShifts = this.shiftTypes.filter(st => ![1, 2].includes(st.id));
            }
            
            // If current shift is not in allowed list (e.g. legacy data), add it anyway to avoid hidden value
            if (shiftId && !allowedShifts.find(s => s.id === shiftId)) {
                const missing = this.shiftTypes.find(s => s.id === shiftId);
                if (missing) allowedShifts.push(missing);
            }
            
            allowedShifts.sort((a,b) => a.id - b.id).forEach(st => {
              const opt = document.createElement('option');
              opt.value = st.id; 
              // Show time in the dropdown for clarity
              opt.textContent = `${st.id} | ${st.start_time.slice(0,5)}-${st.end_time.slice(0,5)}`; 
              if (String(st.id) === String(shiftId)) opt.selected = true;
              select.appendChild(opt);
            });
            
            // Add tooltip
            if (shiftId) {
               const s = this.shiftTypes.find(x => x.id === shiftId);
               if (s) select.title = `Смена ${s.id}: ${s.start_time.slice(0,5)} - ${s.end_time.slice(0,5)}`;
            }
            
            select.onchange = (e) => this.handleShiftChange(e.target);
            td.appendChild(select);
        } else {
            // Read-only view for sellers
            const div = document.createElement('div');
            div.className = `cell-input ${shiftId ? 'cell-work' : 'cell-b'}`;
            div.style.cursor = 'default';
            
            if (shiftId) {
               const s = this.shiftTypes.find(x => x.id === shiftId);
               // Show ID + Time for sellers too
               div.textContent = s ? `${s.id}` : shiftId;
               if (s) div.title = `${s.start_time.slice(0,5)} - ${s.end_time.slice(0,5)}`;
               div.style.fontSize = '11px';
            } else {
               div.textContent = 'B';
            }
            
            td.appendChild(div);
        }
        
        // Calculate Hours
        if (shiftId) {
            const shiftInfo = this.shiftTypes.find(s => s.id === shiftId);
            if (shiftInfo) {
               // Use precise work_hours from DB if available
               if (shiftInfo.work_hours !== undefined && shiftInfo.work_hours !== null) {
                   totalHours += parseFloat(shiftInfo.work_hours);
               } else {
                   // Fallback calculation
                   const startH = parseInt(shiftInfo.start_time.split(':')[0]);
                   const endH = parseInt(shiftInfo.end_time.split(':')[0]);
                   let duration = endH - startH;
                   if (duration < 0) duration += 24; 
                   totalHours += (duration - 1); // Approx break
               }
            }
        }

        tr.appendChild(td);
      }
      
      tr.innerHTML += `<td><b>${totalHours}</b></td><td>${totalDaysOff}</td>`;
      tbody.appendChild(tr);
    });

    // --- FOOTER (Totals) ---
    let footHtml = '<tr><td colspan="3" style="text-align:right; font-weight:bold; padding-right:10px;">Итого смен:</td>';
    for (let d = 1; d <= daysInMonth; d++) {
        footHtml += `<td><b>${dayCounts[d]}</b></td>`;
    }
    footHtml += '<td>-</td><td>-</td></tr>';
    tfoot.innerHTML = footHtml;
  }

  async handleShiftChange(select) {
    const userId = select.dataset.userId;
    const date = select.dataset.date;
    const val = select.value; 
    const shiftId = val ? parseInt(val) : null;
    const monthStr = date.slice(0, 7);
    
    // Optimistic UI update
    if (select.tagName === 'SELECT') {
         select.className = `cell-input ${shiftId ? 'cell-work' : 'cell-b'} saving`;
    }

    const { error } = await supabase.from('schedule').upsert({
      user_id: userId, date: date, month: monthStr, shift_id: shiftId, is_day_off: !shiftId
    }, { onConflict: 'user_id, date' });

    if (error) { 
        alert('Ошибка!'); 
        if (select.classList) select.classList.add('error'); 
    }
    else {
      if (select.classList) select.classList.remove('saving');
      // Update cache
      const idx = this.scheduleData.findIndex(s => s.user_id === userId && s.date === date);
      if (idx >= 0) {
         if (shiftId === null) {
             this.scheduleData[idx].shift_id = null;
         } else {
             this.scheduleData[idx].shift_id = shiftId;
         }
      } else {
        this.scheduleData.push({ user_id: userId, date, month: monthStr, shift_id: shiftId });
      }
    }
  }
}
