// --- 2. GLOBAL STATE ---
let currentUser = null;
let globalEmployees = [];
let globalShiftTypes = [];
let globalMerch = [];

// --- 3. HELPER FUNCTIONS (API) ---
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
