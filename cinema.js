/* Просмотр готового мультфильма. Звук запускается только действием зрителя. */
(function () {
'use strict';
function init(film, onCover) {
  const $ = id => document.getElementById(id);
  const sheet = $('cinema'), video = $('filmVideo'), play = $('filmPlay'), offline = $('filmOffline'), status = $('filmStatus');
  let previousFocus = null, failed = false;
  $('filmTitle').textContent = film.title;
  video.poster = film.poster;
  function fullURL() { return new URL(film.src, location.href).href; }
  async function cached() {
    if (!('caches' in window)) return false;
    try { return !!(await caches.match(fullURL())); } catch (e) { return false; }
  }
  function close() {
    video.pause(); sheet.hidden = true; onCover(false);
    if (previousFocus && previousFocus.isConnected) previousFocus.focus();
  }
  function open() {
    if (!sheet.hidden) return;
    previousFocus = document.activeElement; sheet.hidden = false;
    onCover(true);
    if (!video.getAttribute('src')) video.src = film.src;
    failed = !!video.error; play.hidden = false;
    play.textContent = video.currentTime > 0 && !video.ended ? 'Продолжить' : 'Смотреть со звуком';
    status.textContent = 'Нажми «Смотреть» — и включи звук, чтобы услышать героев.';
    $('filmClose').focus();
    cached().then(ok => { offline.disabled = ok; offline.textContent = ok ? 'Мультик доступен офлайн' : 'Сохранить мультик офлайн'; });
  }
  play.addEventListener('click', async () => {
    try {
      if (video.ended) video.currentTime = 0;
      if (failed || video.error) { video.load(); failed = false; }
      video.muted = false;
      await video.play();
    } catch (e) {
      if (sheet.hidden) return;
      status.textContent = e.name === 'NotAllowedError' ? 'Нажми кнопку воспроизведения прямо на видео.' : 'Не удалось запустить мультик. Проверь интернет и попробуй ещё раз.';
      play.hidden = false;
    }
  });
  video.addEventListener('playing', () => { play.hidden = true; status.textContent = 'Приятного просмотра, Вета!'; });
  video.addEventListener('pause', () => {
    if (sheet.hidden || video.ended) return;
    play.hidden = false; play.textContent = 'Продолжить';
  });
  video.addEventListener('ended', () => { play.hidden = false; play.textContent = 'Посмотреть ещё раз'; status.textContent = 'Пингвин тоже свой. И очень любимый.'; });
  video.addEventListener('error', () => {
    if (sheet.hidden) return;
    failed = true; play.hidden = false; play.textContent = 'Попробовать ещё раз';
    status.textContent = 'Ролик не загрузился. Подключись к интернету или сохрани его офлайн при следующем просмотре.';
  });
  offline.addEventListener('click', async () => {
    if (!navigator.serviceWorker || !navigator.serviceWorker.controller) { status.textContent = 'Для офлайн-копии закрой и снова открой обновлённое приложение с интернетом.'; return; }
    offline.disabled = true; status.textContent = 'Сохраняем мультик на телефон…';
    try {
      const response = await fetch(fullURL());
      if (!response.ok) throw new Error('download');
      await response.arrayBuffer();
      if (!(await cached())) throw new Error('cache');
      offline.textContent = 'Мультик доступен офлайн'; status.textContent = 'Готово! Можно смотреть без интернета.';
    } catch (e) { offline.disabled = false; status.textContent = 'Не получилось сохранить. Проверь интернет и свободное место, затем попробуй снова.'; }
  });
  $('filmClose').addEventListener('click', close);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !sheet.hidden) close(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) video.pause(); });
  return { open, close, isOpen: () => !sheet.hidden };
}
window.CINEMA = { init };
})();
