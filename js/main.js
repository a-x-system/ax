
import { Calendar } from './calendar.js';
import { ScheduleManager } from './schedule.js';
import { initOneS } from './oneS.js';
import { 
  getCurrentUser, getAllProfiles, updateUserRole, supabase, 
  getMerchItems, getVideos, uploadFile, createMerchItem 
} from './supabaseClient.js';

let currentUser = null;

document.addEventListener('DOMContentLoaded', async () => {
  currentUser = await getCurrentUser();
  
  if (currentUser) {
    initApp();
  } else {
    window.location.href = 'login.html';
  }

  initTabs();
});

function initTabs() {
  const tabs = document.querySelectorAll('.tab');
  const contents = document.querySelectorAll('.tab-content');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // 1. Убираем класс active у всех
      tabs.forEach(t => t.classList.remove('active'));
      contents.forEach(c => c.classList.remove('active'));

      // 2. Добавляем текущему
      tab.classList.add('active');
      const targetId = tab.getAttribute('data-tab');
      const targetContent = document.getElementById(targetId);
      
      if (targetContent) {
        targetContent.classList.add('active');
      } else {
        console.warn(`Tab content not found for: ${targetId}`);
      }
    });
  });

  // Безопасное назначение событий
  safeOnClick('viewMySched', () => switchScheduleView('my'));
  safeOnClick('viewTeamSched', () => switchScheduleView('team'));
  safeOnClick('btnCreateUser', createUserHandler);
  
  safeOnClick('logoutBtn', async () => {
    await supabase.auth.signOut();
    window.location.href = 'login.html';
  });

  // Кнопка загрузки мерча
  const btnUpload = document.getElementById('btnUploadMerch');
  const inputUpload = document.getElementById('uploadMerchInput');
  
  if (btnUpload && inputUpload) {
    btnUpload.onclick = () => inputUpload.click();
    inputUpload.onchange = handleMerchUpload;
  }
}

function safeOnClick(id, handler) {
  const el = document.getElementById(id);
  if (el) el.onclick = handler;
}

function switchScheduleView(mode) {
  const myView = document.getElementById('myScheduleView');
  const teamView = document.getElementById('teamScheduleView');
  const btnMy = document.getElementById('viewMySched');
  const btnTeam = document.getElementById('viewTeamSched');

  if (mode === 'my') {
    if(myView) myView.style.display = 'block';
    if(teamView) teamView.style.display = 'none';
    if(btnMy) btnMy.classList.add('active');
    if(btnTeam) btnTeam.classList.remove('active');
  } else {
    if(myView) myView.style.display = 'none';
    if(teamView) teamView.style.display = 'block';
    if(btnMy) btnMy.classList.remove('active');
    if(btnTeam) btnTeam.classList.add('active');
  }
}

async function initApp() {
  console.log('App init for:', currentUser.email);

  document.getElementById('userName').textContent = currentUser.full_name || currentUser.email;
  document.getElementById('userRole').textContent = currentUser.role || 'Сотрудник';
  document.getElementById('userAvatar').textContent = (currentUser.full_name || 'U')[0].toUpperCase();

  const isAdmin = ['director', 'senior_seller'].includes(currentUser.role);

  if (isAdmin) {
    const adminTab = document.getElementById('adminTab');
    const uploadBtn = document.getElementById('btnUploadMerch');
    
    if (adminTab) adminTab.style.display = 'block';
    if (uploadBtn) uploadBtn.style.display = 'block';
    
    loadUsersTable();
    
    const scheduleManager = new ScheduleManager('schedule-manager');
    await scheduleManager.init();
  } else {
    const teamBtn = document.getElementById('viewTeamSched');
    if (teamBtn) teamBtn.style.display = 'none';
  }

  const calendar = new Calendar('calendar-wrapper');

  loadContent();
  initOneS();
}

async function loadContent() {
  // Мерч
  const merchGrid = document.getElementById('merchGrid');
  if (merchGrid) {
    const items = await getMerchItems();
    if (items.length === 0) {
      merchGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">Нет фото. Загрузите первое!</p>';
    } else {
      merchGrid.innerHTML = '';
      items.forEach(item => {
        const el = document.createElement('div');
        el.className = 'photo-card';
        el.style.backgroundImage = `url('${item.image_url}')`;
        el.innerHTML = `<div class="photo-title">${item.title}</div>`;
        merchGrid.appendChild(el);
      });
    }
  }

  // Видео
  const videoGrid = document.getElementById('videoGrid');
  if (videoGrid) {
    const videos = await getVideos();
    if (videos.length === 0) {
      videoGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">Нет видео-инструкций.</p>';
    } else {
      videoGrid.innerHTML = '';
      videos.forEach(v => {
        const el = document.createElement('div');
        el.className = 'card op-card';
        el.innerHTML = `
          <h3>${v.title}</h3>
          <p>Категория: ${v.category}</p>
          <a href="${v.video_url}" target="_blank" class="btn btn-primary btn-sm">Смотреть</a>
        `;
        videoGrid.appendChild(el);
      });
    }
  }
}

async function handleMerchUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const btn = document.getElementById('btnUploadMerch');
  const originalText = btn.textContent;
  btn.textContent = 'Загрузка...';
  btn.disabled = true;

  try {
    const publicUrl = await uploadFile('photos', file);
    const title = prompt('Название фото (например "Полка с водой"):', 'Новое фото');
    if (title) {
      const { error } = await createMerchItem(title, publicUrl);
      if (error) throw error;
      alert('Фото успешно загружено!');
      loadContent(); 
    }
  } catch (err) {
    console.error(err);
    alert('Ошибка загрузки: ' + err.message);
  } finally {
    btn.textContent = originalText;
    btn.disabled = false;
    e.target.value = ''; 
  }
}

async function loadUsersTable() {
  const tbody = document.querySelector('#usersTable tbody');
  if (!tbody) return;
  
  tbody.innerHTML = '<tr><td colspan="3">Загрузка...</td></tr>';
  
  const profiles = await getAllProfiles();
  tbody.innerHTML = '';

  profiles.forEach(p => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${p.full_name || 'Без имени'}</td>
      <td>
        <select onchange="updateRole('${p.id}', this.value)" class="input-field" style="margin:0; padding: 4px;">
          <option value="seller" ${p.role==='seller'?'selected':''}>Продавец</option>
          <option value="senior_seller" ${p.role==='senior_seller'?'selected':''}>Старший</option>
          <option value="director" ${p.role==='director'?'selected':''}>Директор</option>
        </select>
      </td>
      <td>
        <button class="btn btn-sm" style="color:var(--error-color);">Удалить</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

window.updateRole = async (uid, role) => {
  const { error } = await updateUserRole(uid, role);
  if (error) alert('Ошибка обновления: ' + error.message);
  else alert('Роль обновлена!');
};

async function createUserHandler() {
  const email = document.getElementById('newUserEmail').value;
  const password = document.getElementById('newUserPass').value;
  const fullName = document.getElementById('newUserName').value;
  const role = document.getElementById('newUserRole').value;

  if (!email || !password) return alert('Введите email и пароль');

  if(!confirm('Внимание: После создания вы будете переключены на нового пользователя. Продолжить?')) return;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName }
    }
  });

  if (error) {
    alert('Ошибка: ' + error.message);
  } else {
    alert('Пользователь создан! Обновите роль в админке, если нужно.');
    document.getElementById('modalUser').style.display = 'none';
    window.location.reload();
  }
}
