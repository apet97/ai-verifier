// Enhanced AI Verifier Popup
const TAGS = [
  { id: 'fully',    label: 'Fully AI-Generated',    color: '#e74c3c', icon: '🤖' },
  { id: 'visuals',  label: 'AI-Assisted Visuals',   color: '#f39c12', icon: '🎨' },
  { id: 'voice',    label: 'AI Voice/Narration',    color: '#8e44ad', icon: '🗣️' },
  { id: 'script',   label: 'AI-Scripted Content',   color: '#3498db', icon: '📝' },
  { id: 'deepfake', label: 'Deepfake/Face Swap',    color: '#9b59b6', icon: '👤' },
  { id: 'music',    label: 'AI-Generated Music',    color: '#1abc9c', icon: '🎵' }
];

// Load and save settings
async function loadSettings() {
  try {
    const result = await chrome.storage.local.get(['filterSettings']);
    return result.filterSettings || {
      enabled: false,
      threshold: 75,
      hideVideos: false,
      blurThumbnails: true,
      showWarning: true
    };
  } catch (e) {
    console.error('Error loading settings:', e);
    return { enabled: false, threshold: 75, hideVideos: false, blurThumbnails: true, showWarning: true };
  }
}

async function saveSettings(settings) {
  try {
    await chrome.storage.local.set({ filterSettings: settings });
    return true;
  } catch (e) {
    console.error('Error saving settings:', e);
    return false;
  }
}

// Load user statistics
async function loadStats() {
  try {
    const [tagsResult, filteredResult] = await Promise.all([
      chrome.storage.local.get(['userTags']),
      chrome.storage.local.get(['filteredCount'])
    ]);
    
    const userTags = tagsResult.userTags || {};
    const filteredCount = filteredResult.filteredCount || 0;
    
    return {
      totalTagged: Object.keys(userTags).length,
      totalFiltered: filteredCount,
      tagBreakdown: getTagBreakdown(userTags)
    };
  } catch (e) {
    console.error('Error loading stats:', e);
    return { totalTagged: 0, totalFiltered: 0, tagBreakdown: {} };
  }
}

function getTagBreakdown(userTags) {
  const breakdown = {};
  Object.values(userTags).forEach(tag => {
    breakdown[tag] = (breakdown[tag] || 0) + 1;
  });
  return breakdown;
}

// Update UI elements
function updateThresholdLabel(value) {
  document.getElementById('thresholdLabel').textContent = value + '%';
}

function toggleFilterOptions(enabled) {
  const container = document.getElementById('thresholdContainer');
  const options = document.getElementById('filterOptions');
  
  if (enabled) {
    container.classList.remove('disabled');
    options.classList.remove('disabled');
  } else {
    container.classList.add('disabled');
    options.classList.add('disabled');
  }
}

function updateStats(stats) {
  document.getElementById('totalTagged').textContent = stats.totalTagged;
  document.getElementById('totalFiltered').textContent = stats.totalFiltered;
}

function updateTagLegend(tagBreakdown) {
  const container = document.getElementById('tagLegend');
  container.innerHTML = '';
  
  TAGS.forEach(tag => {
    const count = tagBreakdown[tag.id] || 0;
    
    const item = document.createElement('div');
    item.className = 'tag-item';
    
    item.innerHTML = `
      <div class="tag-icon">${tag.icon}</div>
      <div class="tag-info">
        <div class="tag-name">${tag.label}</div>
        <div class="tag-count">${count} tagged</div>
      </div>
    `;
    
    container.appendChild(item);
  });
}

// Export user data
async function exportData() {
  try {
    const [tagsResult, settingsResult] = await Promise.all([
      chrome.storage.local.get(['userTags']),
      chrome.storage.local.get(['filterSettings'])
    ]);
    
    const exportData = {
      userTags: tagsResult.userTags || {},
      filterSettings: settingsResult.filterSettings || {},
      exportDate: new Date().toISOString(),
      version: '0.2.0'
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-verifier-data-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    
    // Show success message
    showMessage('Data exported successfully!');
  } catch (e) {
    console.error('Error exporting data:', e);
    showMessage('Failed to export data', true);
  }
}

// Clear all data
async function clearAllData() {
  if (!confirm('Are you sure you want to clear all tagged videos and settings? This cannot be undone.')) {
    return;
  }
  
  try {
    await chrome.storage.local.clear();
    
    // Reset UI to defaults
    const defaultSettings = {
      enabled: false,
      threshold: 75,
      hideVideos: false,
      blurThumbnails: true,
      showWarning: true
    };
    
    await saveSettings(defaultSettings);
    await initializeUI();
    
    showMessage('All data cleared successfully!');
  } catch (e) {
    console.error('Error clearing data:', e);
    showMessage('Failed to clear data', true);
  }
}

// Show temporary message
function showMessage(text, isError = false) {
  const message = document.createElement('div');
  message.style.cssText = `
    position: fixed;
    top: 10px;
    left: 50%;
    transform: translateX(-50%);
    background: ${isError ? '#e74c3c' : '#4CAF50'};
    color: white;
    padding: 8px 16px;
    border-radius: 4px;
    font-size: 12px;
    z-index: 1000;
    transition: opacity 0.3s ease;
  `;
  message.textContent = text;
  
  document.body.appendChild(message);
  
  setTimeout(() => {
    message.style.opacity = '0';
    setTimeout(() => message.remove(), 300);
  }, 2000);
}

// Initialize UI
async function initializeUI() {
  const settings = await loadSettings();
  const stats = await loadStats();
  
  // Set up filter controls
  const filterEnabled = document.getElementById('filterEnabled');
  const threshold = document.getElementById('threshold');
  const hideVideos = document.getElementById('hideVideos');
  const blurThumbnails = document.getElementById('blurThumbnails');
  const showWarning = document.getElementById('showWarning');
  
  // Load current settings
  filterEnabled.checked = settings.enabled;
  threshold.value = settings.threshold;
  hideVideos.checked = settings.hideVideos;
  blurThumbnails.checked = settings.blurThumbnails;
  showWarning.checked = settings.showWarning;
  
  updateThresholdLabel(settings.threshold);
  toggleFilterOptions(settings.enabled);
  
  // Set up event listeners
  filterEnabled.addEventListener('change', async () => {
    settings.enabled = filterEnabled.checked;
    await saveSettings(settings);
    toggleFilterOptions(settings.enabled);
    showMessage('Filter settings updated');
  });
  
  threshold.addEventListener('input', () => {
    updateThresholdLabel(threshold.value);
  });
  
  threshold.addEventListener('change', async () => {
    settings.threshold = parseInt(threshold.value);
    await saveSettings(settings);
    showMessage('Threshold updated');
  });
  
  hideVideos.addEventListener('change', async () => {
    settings.hideVideos = hideVideos.checked;
    await saveSettings(settings);
    showMessage('Filter mode updated');
  });
  
  blurThumbnails.addEventListener('change', async () => {
    settings.blurThumbnails = blurThumbnails.checked;
    await saveSettings(settings);
    showMessage('Blur setting updated');
  });
  
  showWarning.addEventListener('change', async () => {
    settings.showWarning = showWarning.checked;
    await saveSettings(settings);
    showMessage('Warning setting updated');
  });
  
  // Set up action buttons
  document.getElementById('exportData').addEventListener('click', exportData);
  document.getElementById('clearData').addEventListener('click', clearAllData);
  
  // Set up copy buttons for crypto addresses
  document.querySelectorAll('.copy-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const address = e.target.getAttribute('data-address');
      try {
        await navigator.clipboard.writeText(address);
        e.target.textContent = 'Copied!';
        e.target.classList.add('copied');
        
        setTimeout(() => {
          e.target.textContent = 'Copy';
          e.target.classList.remove('copied');
        }, 2000);
        
        showMessage('Address copied to clipboard!');
      } catch (err) {
        console.error('Failed to copy address:', err);
        showMessage('Failed to copy address', true);
      }
    });
  });
  
  // Update stats and tag legend
  updateStats(stats);
  updateTagLegend(stats.tagBreakdown);
}

// Initialize when popup opens
document.addEventListener('DOMContentLoaded', initializeUI);

// Listen for storage changes to update stats in real-time
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && (changes.userTags || changes.filteredCount)) {
    loadStats().then(stats => {
      updateStats(stats);
      updateTagLegend(stats.tagBreakdown);
    });
  }
});