
import { supabase } from './supabaseClient.js';

export async function initOneS() {
  const input = document.querySelector('#1s .search-input');
  const list = document.querySelector('#1s .list-group');

  // Изначально загружаем всё
  loadInstructions();

  input.addEventListener('input', (e) => {
    loadInstructions(e.target.value);
  });

  async function loadInstructions(query = '') {
    list.innerHTML = '<div class="loader">Поиск...</div>';

    let q = supabase.from('manuals').select('*').order('title');
    if (query) {
      q = q.ilike('title', `%${query}%`);
    }

    const { data } = await q;

    list.innerHTML = '';
    if (!data || data.length === 0) {
      list.innerHTML = '<div class="list-item">Ничего не найдено</div>';
      return;
    }

    data.forEach(item => {
      const el = document.createElement('div');
      el.className = 'list-item';
      el.textContent = item.title;
      el.onclick = () => alert(item.content || 'Текст инструкции пока пуст');
      list.appendChild(el);
    });
  }
}
