// --- ONE-TIME SCRIPT TO SEED SHIFTS VIA API ---
// This script is meant to be run once to populate the DB if SQL access is not available directly.
// Usage: Include this file in index.html temporarily or copy-paste content into browser console.

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
  console.log('Starting seed...');
  
  for (const shift of SHIFTS_DATA) {
    const { error } = await supabase.from('shifts').upsert(shift);
    if (error) console.error(`Error upserting shift ${shift.id}:`, error);
    else console.log(`Shift ${shift.id} OK`);
  }
  
  console.log('Seed complete. Please refresh.');
}
