/* Перенос прогресса между устройствами и адресами: JSON-файл, без сервера. */
(function () {
'use strict';
const APP = 'shket-i-manya', VERSION = 1, LIMIT = 2 * 1024 * 1024;
const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
function encode(state) {
  return JSON.stringify({ app: APP, version: VERSION, exportedAt: new Date().toISOString(), state }, null, 2);
}
function decode(text) {
  if (typeof text !== 'string' || text.length > LIMIT) throw new Error('Файл слишком большой. Нужен файл сохранения «Шкета и Мани».');
  let file;
  try {
    file = JSON.parse(text.replace(/^\uFEFF/, ''), (key, value) => {
      if (['__proto__', 'constructor', 'prototype'].includes(key)) throw new Error('bad key');
      return value;
    });
  } catch (e) { throw new Error('Не удалось прочитать файл. Выбери сохранение с расширением .json.'); }
  if (!isObject(file) || file.app !== APP || file.version !== VERSION || !isObject(file.state)) throw new Error('Это не поддерживаемый файл сохранения «Шкета и Мани».');
  const data = file.state;
  if (!isObject(data.seen) || !isObject(data.outfit) || !Number.isFinite(data.first) || data.first <= 0) throw new Error('В файле не хватает данных прогресса. Выбери другую копию.');
  for (const key of ['seen', 'outfit', 'fed', 'cooked', 'clean']) {
    if (data[key] !== undefined && !isObject(data[key])) throw new Error('Файл сохранения повреждён.');
  }
  for (const key of ['fresh', 'unlocked']) {
    if (data[key] !== undefined && (!Array.isArray(data[key]) || data[key].some(v => typeof v !== 'string'))) throw new Error('Файл сохранения повреждён.');
  }
  if (data.plants !== undefined && (!Array.isArray(data.plants) || data.plants.length !== 3 || data.plants.some(v => !Number.isInteger(v) || v < 0 || v > 5))) throw new Error('Файл сохранения повреждён.');
  if (data.cur != null && (!isObject(data.cur) || typeof data.cur.id !== 'string')) throw new Error('Файл сохранения повреждён.');
  for (const key of ['last', 'visits', 'hideBest', 'photos', 'pengHugs']) {
    if (data[key] !== undefined && (!Number.isFinite(data[key]) || data[key] < 0)) throw new Error('Файл сохранения повреждён.');
  }
  return data;
}
function init(adapter) {
  const $ = id => document.getElementById(id);
  const exportButton = $('saveExport'), importButton = $('saveImport'), input = $('saveFile'), status = $('saveStatus');
  if (!exportButton || !importButton || !input || !status) return;
  exportButton.addEventListener('click', async () => {
    exportButton.disabled = true;
    try {
      const text = encode(adapter.getState());
      const stamp = new Date().toISOString().slice(0, 10);
      const name = `shket-i-manya-${stamp}.json`;
      const file = new File([text], name, { type: 'application/json' });
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file] });
        status.textContent = 'Копия отправлена через «Поделиться». Если выбрала «Сохранить в Файлы», её можно загрузить на новом адресе.';
      } else {
        const url = URL.createObjectURL(file), link = document.createElement('a');
        link.href = url; link.download = name; document.body.appendChild(link); link.click(); link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 60000);
        status.textContent = 'Файл отправлен на скачивание. Проверь «Загрузки» перед переходом на новый адрес.';
      }
    } catch (e) { status.textContent = e.name === 'AbortError' ? 'Сохранение отменено. Прогресс остался здесь.' : 'Не удалось сохранить файл. Попробуй ещё раз.'; }
    finally { exportButton.disabled = false; }
  });
  importButton.addEventListener('click', () => { input.value = ''; input.click(); });
  input.addEventListener('change', async () => {
    const file = input.files && input.files[0];
    if (!file) return;
    importButton.disabled = true;
    try {
      if (file.size > LIMIT) throw new Error('Файл слишком большой. Выбери файл сохранения .json.');
      const data = decode(await file.text());
      const cards = Object.keys(data.seen).length;
      if (!window.confirm(`В копии ${cards} открыток. Восстановить этот прогресс? Текущий прогресс на этом устройстве будет заменён.`)) { status.textContent = 'Загрузка отменена. Текущий прогресс сохранён.'; return; }
      adapter.restore(data);
    } catch (e) { status.textContent = e.name === 'QuotaExceededError' || e.name === 'SecurityError' ? 'Браузер не дал записать прогресс. Освободи место или разреши хранение данных и попробуй снова.' : e.message; }
    finally { importButton.disabled = false; input.value = ''; }
  });
}
window.GAME_SAVES = { init, encode, decode };
})();
