const enabled = document.querySelector('#enabled');
const size = document.querySelector('#size');
const status = document.querySelector('#status');
function preview() {
  const image = document.querySelector('#preview');
  image.width = image.height = Number(size.value);
  image.hidden = !enabled.checked;
}
async function save() {
  enabled.disabled = size.disabled = true;
  try {
    await chrome.storage.local.set({settings: {enabled: enabled.checked, size: Number(size.value)}});
    preview();
    status.textContent = '已保存，对已打开的页面即时生效';
  } catch { status.textContent = '保存失败，请重新打开扩展后重试'; }
  finally { enabled.disabled = size.disabled = false; }
}
chrome.storage.local.get('settings').then(({settings = {}}) => {
  enabled.checked = settings.enabled !== false;
  size.value = String([24,32,40].includes(settings.size) ? settings.size : 32);
  enabled.disabled = size.disabled = false;
  preview();
  status.textContent = '设置保存在当前浏览器';
}).catch(() => { status.textContent = '无法读取设置，请重新打开扩展'; });
enabled.addEventListener('change', save);
size.addEventListener('change', save);
