const enabled = document.querySelector('#enabled');
const size = document.querySelector('#size');
const indicator = document.querySelector('.size-indicator');
let indicatorReady = false;
let pending = null;
let saving = false;
const sizes = [...size.querySelectorAll('input')].map(input => Number(input.value));
let saved = {enabled: true, size: 24};
function selectedSize() { return Number(size.querySelector('input:checked').value); }
function preview() {
  const image = document.querySelector('#preview');
  image.width = image.height = selectedSize();
  image.hidden = !enabled.checked;
  document.querySelector('#original').hidden = enabled.checked;
  document.body.dataset.enabled = String(enabled.checked);
  const selected = size.querySelector('input:checked').closest('label');
  if (!indicatorReady) indicator.style.transition = 'none';
  indicator.style.width = `${selected.offsetWidth}px`;
  indicator.style.transform = `translateX(${selected.offsetLeft}px)`;
  indicator.hidden = false;
  if (!indicatorReady) {
    indicator.getBoundingClientRect();
    indicatorReady = true;
    indicator.style.transition = '';
  }
  selected.scrollIntoView({block: 'nearest', inline: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'});
}
function apply(settings) {
  enabled.checked = settings.enabled;
  size.querySelector(`input[value="${settings.size}"]`).checked = true;
  preview();
}
function save() {
  pending = {enabled: enabled.checked, size: selectedSize()};
  preview();
  if (!saving) void flush();
}
// Serialize writes while letting selection stay responsive. A newer choice
// replaces the queued value; an older write must never restore an older UI.
async function flush() {
  saving = true;
  while (pending) {
    const settings = pending;
    pending = null;
    try {
      await chrome.storage.local.set({settings});
      saved = settings;
    } catch {
      if (!pending) {
        apply(saved);
        console.warn('UniEmoji: 保存失败，已恢复上次设置');
      }
    }
  }
  saving = false;
}
chrome.storage.local.get('settings').then(({settings}) => {
  saved = {enabled: settings?.enabled !== false, size: sizes.includes(settings?.size) ? settings.size : 24};
  apply(saved);
  enabled.disabled = size.disabled = false;
}).catch(() => {
  console.warn('UniEmoji: 无法读取设置，请重新打开扩展');
});
enabled.addEventListener('change', save);
size.addEventListener('change', save);
