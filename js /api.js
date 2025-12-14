// --- GLOBAL STATE ---
let currentUser = null;
let globalEmployees = [];
let globalShiftTypes = [];
let globalMerch = [];

// --- HELPER FUNCTIONS (API) ---
async function preloadGlobalData() {
  if (!supabase) { globalEmployees = []; globalShiftTypes = []; return; }
   // Parallel fetch
   const [emp, shifts] = await Promise.all([
     supabase.from('employees').select('*').order('full_name'),
     supabase.from('shifts').select('*').order('id')
   ]);
   globalEmployees = emp.data || [];
   globalShiftTypes = shifts.data || [];
}

async function loginUser(login, password) {
  if (!supabase) throw new Error('Нет соединения с сервером');
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('login', login)
    .eq('password', password)
    .single();

  if (error || !data) throw new Error('Неверный логин или пароль');
  localStorage.setItem('ax_user', JSON.stringify(data));
  return data;
}

function getCurrentUser() {
  const userStr = localStorage.getItem('ax_user');
  return userStr ? JSON.parse(userStr) : null;
}

function logoutUser() {
  localStorage.removeItem('ax_user');
  location.reload();
}

async function getAllEmployees() {
  if (globalEmployees.length > 0) return globalEmployees;
  if (!supabase) { globalEmployees = []; return globalEmployees; }
  const { data } = await supabase.from('employees').select('*').order('full_name');
  globalEmployees = data || [];
  return globalEmployees;
}

async function createEmployee(data) {
  if (!supabase) return { error: { message: 'Нет соединения' } };
  const res = await supabase.from('employees').insert(data);
  if (!res.error) {
     // Refresh cache
     const { data: newData } = await supabase.from('employees').select('*').order('full_name');
     globalEmployees = newData || [];
  }
  return res;
}

async function deleteEmployee(id) {
  if (!supabase) return { error: { message: 'Нет соединения' } };
  const res = await supabase.from('employees').delete().eq('id', id);
  if (!res.error) {
     globalEmployees = globalEmployees.filter(e => e.id !== id);
  }
  return res;
}

async function getShiftTypes() {
  // Always fetch fresh to ensure we have latest added shifts
  if (!supabase) { globalShiftTypes = []; return globalShiftTypes; }
  const { data } = await supabase.from('shifts').select('*').order('id');
  globalShiftTypes = data || [];
  return globalShiftTypes;
}

async function createShiftType(shiftData) {
  if (!supabase) return { error: { message: 'Нет соединения' } };
  // shiftData: { title, start_time, end_time }
  const res = await supabase.from('shifts').insert(shiftData);
  if (!res.error) {
     // Refresh cache
     await getShiftTypes();
  }
  return res;
}

async function getMerchItems() {
  if (!supabase) return [];
  const { data } = await supabase.from('merch_items').select('*');
  return data || [];
}

async function createMerchItem(title, url) {
  if (!supabase) return { error: { message: 'Нет соединения' } };
  return await supabase.from('merch_items').insert({ title, image_url: url });
}

async function uploadFile(bucket, file) {
  if (!supabase) throw new Error('Нет соединения');
  const ext = file.name.split('.').pop();
  const path = `${Math.random()}.${ext}`;
  await supabase.storage.from(bucket).upload(path, file);
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

// --- SEED SHIFTS ---
const SHIFTS_DATA = [
  // 1️⃣ СМЕНЫ ДИРЕКТОРА (8ч)
  { id: 1, title: '10:00–19:00', start_time: '10:00', end_time: '19:00', break_start: '14:00', break_end: '15:00', work_hours: 8 },
  { id: 2, title: '13:00–22:00', start_time: '13:00', end_time: '22:00', break_start: '15:00', break_end: '16:00', work_hours: 8 },

  // 2️⃣ СМЕНЫ ПРОДАВЦОВ 0.75 (6ч)
  { id: 3, title: '10:00–17:00', start_time: '10:00', end_time: '17:00', break_start: '13:00', break_end: '14:00', work_hours: 6 },
  { id: 4, title: '12:00–19:00', start_time: '12:00', end_time: '19:00', break_start: '15:00', break_end: '16:00', work_hours: 6 },
  { id: 5, title: '13:00–20:00', start_time: '13:00', end_time: '20:00', break_start: '16:00', break_end: '17:00', work_hours: 6 },
  { id: 6, title: '14:00–21:00', start_time: '14:00', end_time: '21:00', break_start: '17:00', break_end: '18:00', work_hours: 6 },
  { id: 7, title: '15:00–22:00', start_time: '15:00', end_time: '22:00', break_start: '18:00', break_end: '19:00', work_hours: 6 },

  // 3️⃣ СМЕНЫ ПРОДАВЦОВ 0.5 (5ч)
  { id: 8, title: '10:00–15:00', start_time: '10:00', end_time: '15:00', break_start: '12:00', break_end: '13:00', work_hours: 5 },
  { id: 9, title: '12:00–17:00', start_time: '12:00', end_time: '17:00', break_start: '14:00', break_end: '15:00', work_hours: 5 },
  { id: 10, title: '13:00–18:00', start_time: '13:00', end_time: '18:00', break_start: '15:00', break_end: '16:00', work_hours: 5 },
  { id: 11, title: '15:00–20:00', start_time: '15:00', end_time: '20:00', break_start: '17:00', break_end: '18:00', work_hours: 5 },
  { id: 12, title: '17:00–22:00', start_time: '17:00', end_time: '22:00', break_start: '19:00', break_end: '20:00', work_hours: 5 }
];

async function seedShifts() {
  if (!supabase) { console.error('Supabase not init'); return; }
  // Quietly seed/update shifts
  for (const shift of SHIFTS_DATA) {
    await supabase.from('shifts').upsert(shift);
  }
}
