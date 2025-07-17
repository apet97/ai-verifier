
const ids = ['blockFully','blockVisuals','blockVoice','blockScript'];
const els = Object.fromEntries(ids.map(id => [id, document.getElementById(id)]));
const wlArea = document.getElementById('whitelist');

chrome.storage.sync.get(['filters','whitelist'], data => {
  const f = data.filters ?? {};
  ids.forEach(id => els[id].checked = !!f[id]);
  wlArea.value = (data.whitelist ?? []).join('\n');
});

document.getElementById('save').addEventListener('click', () => {
  const filters = {};
  ids.forEach(id => filters[id] = els[id].checked);
  const wl = wlArea.value.split(/\s+/).filter(Boolean);
  chrome.storage.sync.set({ filters, whitelist: wl }, () => alert('Saved ✓'));
});
