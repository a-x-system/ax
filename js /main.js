document.addEventListener('DOMContentLoaded', async () => {
  currentUser = getCurrentUser();

  if (currentUser) {
    showAppView();
  } else {
    showLoginView();
  }
});

function showLoginView() {
  document.getElementById('login-view').style.display = 'flex';
  document.getElementById('app-view').style.display = 'none';
  initLoginEvents();
}

async function showAppView() {
  document.getElementById('login-view').style.display = 'none';
  document.getElementById('app-view').style.display = 'block';
  await initApp();
}

function initLoginEvents() {
  const toggleBtn = document.getElementById('togglePassword');
  const passInput = document.getElementById('loginPassword');
  const loginBtn = document.getElementById('btnLogin');
  
  if (toggleBtn && passInput) {
      toggleBtn.onclick = () => {
        const type = passInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passInput.setAttribute('type', type);
        toggleBtn.innerHTML = type === 'password' 
          ? '<svg viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>'
          : '<svg viewBox="0 0 24 24"><path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/></svg>';
        const svg = toggleBtn.querySelector('svg');
        if(svg) svg.style.fill = 'var(--text-muted)';
      };
  }

  if (loginBtn) {
      loginBtn.onclick = async () => {
        const login = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const err = document.getElementById('loginErrorMsg');

        if (!login || !password) { err.textContent = 'Заполните все поля'; return; }
        loginBtn.disabled = true; 
        const originalText = loginBtn.textContent;
        let dots = 0; const interval = setInterval(() => { dots = (dots + 1) % 4; loginBtn.textContent = 'Входим' + '.'.repeat(dots); }, 300);
        err.textContent = 'Проверка...'; err.style.color = '#888';

        try {
          await loginUser(login, password);
          clearInterval(interval);
          err.style.color = '#4caf50'; err.textContent = 'Успешно!'; loginBtn.textContent = 'Успешно!';
          setTimeout(() => location.reload(), 500);
        } catch (e) {
          clearInterval(interval); loginBtn.textContent = originalText; loginBtn.disabled = false;
          err.style.color = '#f44336'; err.textContent = e.message;
        }
      };

      const onEnter = (e) => {
        if (e.key === 'Enter') loginBtn.click();
      };
      document.getElementById('loginEmail')?.addEventListener('keydown', onEnter);
      passInput?.addEventListener('keydown', onEnter);
  }
}

async function initApp() {
  try {
    try {
      await preloadGlobalData();
    } catch (e) {
      console.warn('Offline mode or error preloading data:', e);
    }

    // Run seed check
    if (typeof seedShifts === 'function') {
        seedShifts().catch(e => console.log('Seed warning:', e));
    }

  // Header Info
  if (currentUser) {
       document.getElementById('headerLogin').textContent = currentUser.full_name || currentUser.login;
       const roles = { 'director': 'Директор', 'senior_seller': 'Старший продавец', 'seller': 'Продавец' };
       document.getElementById('headerRole').textContent = roles[currentUser.role] || currentUser.role;
       
       const avatarUrl = currentUser.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.full_name || 'User')}&background=333&color=fff`;
       document.getElementById('headerAvatar').src = avatarUrl;
    }

    // Theme
    if (localStorage.getItem('ax_theme') === 'light') {
      document.body.classList.add('light-theme');
    }

    // Profile Menu Events
    const pBtn = document.getElementById('profileBtn');
    const pMenu = document.getElementById('profileMenu');
    
    const newPBtn = pBtn.cloneNode(true);
    pBtn.parentNode.replaceChild(newPBtn, pBtn);
    
    newPBtn.onclick = (e) => { e.stopPropagation(); pMenu.style.display = pMenu.style.display === 'block' ? 'none' : 'block'; };
    document.addEventListener('click', () => pMenu.style.display = 'none');
    
    // Logout
    document.getElementById('logoutBtn').onclick = logoutUser;
    
    // Theme Toggle
    document.getElementById('themeBtn').onclick = (e) => {
      e.stopPropagation();
      document.body.classList.toggle('light-theme');
      localStorage.setItem('ax_theme', document.body.classList.contains('light-theme') ? 'light' : 'dark');
    };

    // Change Photo
    const avatarInput = document.getElementById('avatarUploadInput');
    if (avatarInput) {
      const changePhotoBtn = document.getElementById('changePhotoBtn');
      if (changePhotoBtn) {
         changePhotoBtn.onclick = (e) => {
           e.stopPropagation();
           avatarInput.click();
           pMenu.style.display = 'none';
         };
      }

      avatarInput.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
          if (changePhotoBtn) changePhotoBtn.textContent = 'Загрузка...';
          const url = await uploadFile('photos', file);
          const { error } = await supabase.from('employees').update({ photo_url: url }).eq('id', currentUser.id);
          if (error) throw error;
          currentUser.photo_url = url;
          localStorage.setItem('ax_user', JSON.stringify(currentUser));
          document.getElementById('headerAvatar').src = url;
          alert('Фото обновлено!');
        } catch (err) {
          alert('Ошибка: ' + err.message);
        } finally {
          e.target.value = '';
          if (changePhotoBtn) changePhotoBtn.innerHTML = '<span>📸</span> Сменить фото';
        }
      };
    }

    // Change Password
    document.getElementById('changePassBtn').onclick = (e) => {
      e.stopPropagation();
      document.getElementById('modalChangePass').style.display = 'flex';
      pMenu.style.display = 'none';
    };

    document.getElementById('btnSavePass').onclick = async () => {
      const oldP = document.getElementById('oldPass').value;
      const newP = document.getElementById('newPass').value;
      if (!oldP || !newP) return alert('Заполните поля');
      if (oldP !== currentUser.password) return alert('Старый пароль неверный');
      const { error } = await supabase.from('employees').update({ password: newP }).eq('id', currentUser.id);
      if (error) alert('Ошибка: ' + error.message);
      else {
        alert('Пароль изменен! Войдите заново.');
        logoutUser();
      }
    };

    // Tabs
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
      tab.onclick = (e) => {
        e.preventDefault();
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById(tab.getAttribute('data-tab')).classList.add('active');
      };
    });

    // Role Based Access
    const isAdmin = ['director', 'senior_seller'].includes(currentUser.role);
    
    if (isAdmin) {
      document.getElementById('adminTab').style.display = 'block';
      loadUsersTable();
    }

    const scheduleManager = new ScheduleManager('schedule-manager');
    await scheduleManager.init();

    new Calendar('calendar-wrapper');
    loadContent();
    
    const btnMy = document.getElementById('viewMySched');
    const btnTeam = document.getElementById('viewTeamSched');
    btnMy.onclick = () => {
      document.getElementById('myScheduleView').style.display = 'block';
      document.getElementById('teamScheduleView').style.display = 'none';
      btnMy.classList.add('active'); btnTeam.classList.remove('active');
    };
    btnTeam.onclick = () => {
      document.getElementById('myScheduleView').style.display = 'none';
      document.getElementById('teamScheduleView').style.display = 'block';
      btnTeam.classList.add('active'); btnMy.classList.remove('active');
    };

    const btnUpload = document.getElementById('btnUploadMerch');
    if(btnUpload) {
      const uploadInput = document.getElementById('uploadMerchInput');
      if (uploadInput) {
         btnUpload.onclick = () => uploadInput.click();
         uploadInput.onchange = handleMerchUpload;
      }
    }
    
    const btnCreate = document.getElementById('btnCreateUser');
    if(btnCreate) btnCreate.onclick = createUserHandler;

  // 1S Search
  try {
    const tab1S = document.getElementById('tab-1s');
    if (tab1S) {
        const searchInput = tab1S.querySelector('.search-input');
        const list = tab1S.querySelector('.list-group');
        if (searchInput && list) {
            const load1S = async (q='') => {
               list.innerHTML = '<div class="loader">Поиск...</div>';
               let query = supabase.from('manuals').select('*').order('title');
               if(q) query = query.ilike('title', `%${q}%`);
               const { data } = await query;
               list.innerHTML = '';
               if(!data || !data.length) { list.innerHTML = '<div>Ничего не найдено</div>'; return; }
               data.forEach(item => {
                 const el = document.createElement('div'); el.style.padding='10px'; el.style.borderBottom='1px solid #333'; el.style.cursor='pointer';
                 el.textContent = item.title;
                 el.onclick = () => alert(item.content || 'Пусто');
                 list.appendChild(el);
               });
            };
            load1S();
            searchInput.addEventListener('input', (e) => load1S(e.target.value));
        }
    }
  } catch (err) {
     console.warn('1S module init error', err);
  }

  } catch (err) {
    console.error('INIT ERROR:', err);
    alert('Ошибка запуска приложения: ' + err.message);
  }
}

async function loadContent() {
  const merchGrid = document.getElementById('merchGrid');
  if (merchGrid) {
    const items = await getMerchItems();
    merchGrid.innerHTML = items.length ? '' : '<p style="text-align:center;width:100%">Нет фото</p>';
    items.forEach(item => {
      const el = document.createElement('div');
      el.className = 'photo-card';
      el.style.backgroundImage = `url('${item.image_url}')`;
      el.innerHTML = `<div class="photo-title">${item.title}</div>`;
      merchGrid.appendChild(el);
    });
  }
}

async function handleMerchUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  const btn = document.getElementById('btnUploadMerch');
  const oldText = btn.textContent;
  btn.textContent = '...'; btn.disabled = true;
  try {
    const url = await uploadFile('photos', file);
    const title = prompt('Название:', 'Фото');
    if (title) { await createMerchItem(title, url); loadContent(); }
  } catch (err) { alert(err.message); } 
  finally { btn.textContent = oldText; btn.disabled = false; e.target.value = ''; }
}

async function loadUsersTable() {
  const tbody = document.querySelector('#usersTable tbody');
  if (!tbody) return;
  const users = await getAllEmployees();
  tbody.innerHTML = '';
  const canDelete = currentUser.role === 'director';
  users.forEach(u => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><b>${u.full_name}</b><br><small style="color:#888">${u.login} | ${u.password}</small></td>
      <td>${u.role}</td>
      <td>${canDelete ? `<button class="btn btn-sm" onclick="deleteUserHandler('${u.id}')" style="color:red">X</button>` : ''}</td>
    `;
    tbody.appendChild(tr);
  });
}

window.deleteUserHandler = async (id) => {
  if (currentUser.role !== 'director') return alert('Только директор!');
  if(!confirm('Удалить?')) return;
  const { error } = await deleteEmployee(id);
  if (error) alert(error.message); else loadUsersTable();
};

async function createUserHandler() {
  const login = document.getElementById('newUserEmail').value;
  const password = document.getElementById('newUserPass').value;
  const fullName = document.getElementById('newUserName').value;
  const role = document.getElementById('newUserRole').value;
  if (!login || !password || !fullName) return alert('Заполните все поля');
  const { error } = await createEmployee({ login, password, full_name: fullName, role });
  if (error) alert(error.message); else { alert('Сотрудник создан!'); loadUsersTable(); }
}
