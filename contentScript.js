// AI Verifier content script - Fixed for initial load
console.log('AI Verifier: Content script loaded');

// Global flag to track if extension context is still valid
let extensionInvalidated = false;

const TAGS = [
  { id: 'fully',    label: 'Fully AI-Generated',    color: '#e74c3c', icon: '🤖' },
  { id: 'visuals',  label: 'AI-Assisted Visuals',   color: '#f39c12', icon: '🎨' },
  { id: 'voice',    label: 'AI Voice/Narration',    color: '#8e44ad', icon: '🗣️' },
  { id: 'script',   label: 'AI-Scripted Content',   color: '#3498db', icon: '📝' },
  { id: 'deepfake', label: 'Deepfake/Face Swap',    color: '#9b59b6', icon: '👤' },
  { id: 'music',    label: 'AI-Generated Music',    color: '#1abc9c', icon: '🎵' }
];

function getVideoIdFromUrl(url) {
  try {
    const u = new URL(url, location.origin);
    return u.searchParams.get('v');
  } catch (e) {
    return null;
  }
}

// Check if extension context is valid
function isExtensionContextValid() {
  if (extensionInvalidated) return false;
  
  try {
    const valid = chrome?.runtime?.id !== undefined;
    if (!valid) {
      extensionInvalidated = true;
      console.log('AI Verifier: Extension context invalidated - stopping all operations');
    }
    return valid;
  } catch (e) {
    extensionInvalidated = true;
    console.log('AI Verifier: Extension context invalidated - stopping all operations');
    return false;
  }
}

// Storage helpers with context validation
async function getUserTag(videoId) {
  if (!isExtensionContextValid()) {
    console.log('AI Verifier: Extension context invalidated, skipping getUserTag');
    return null;
  }
  
  try {
    const result = await chrome.storage.local.get(['userTags']);
    const tags = result.userTags || {};
    return tags[videoId] || null;
  } catch (e) {
    if (e.message?.includes('Extension context invalidated')) {
      console.log('AI Verifier: Extension context invalidated during getUserTag');
      return null;
    }
    console.error('AI Verifier: Error getting tag', e);
    return null;
  }
}

async function saveUserTag(videoId, tag) {
  if (!isExtensionContextValid()) {
    console.log('AI Verifier: Extension context invalidated, skipping saveUserTag');
    return false;
  }
  
  try {
    const result = await chrome.storage.local.get(['userTags']);
    const tags = result.userTags || {};
    if (tag) {
      tags[videoId] = tag;
    } else {
      delete tags[videoId];
    }
    await chrome.storage.local.set({ userTags: tags });
    console.log('AI Verifier: Saved tag', { videoId, tag });
    return true;
  } catch (e) {
    if (e.message?.includes('Extension context invalidated')) {
      console.log('AI Verifier: Extension context invalidated during saveUserTag');
      return false;
    }
    console.error('AI Verifier: Error saving tag', e);
    return false;
  }
}

// Simple notification system
function showNotification(message, isError = false) {
  console.log('AI Verifier: Notification:', message);
  
  // Remove existing notifications
  document.querySelectorAll('.ai-verifier-notification').forEach(n => n.remove());
  
  const notification = document.createElement('div');
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed !important;
    top: 20px !important;
    right: 20px !important;
    padding: 12px 16px !important;
    background: ${isError ? '#f44336' : '#4CAF50'} !important;
    color: white !important;
    border-radius: 6px !important;
    font-size: 14px !important;
    z-index: 999999 !important;
    box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
    font-family: Arial, sans-serif !important;
    max-width: 300px !important;
  `;
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    if (notification.parentNode) {
      notification.remove();
    }
  }, 3000);
}

// Create AI selector button
function createAIButton() {
  const button = document.createElement('button');
  button.className = 'ai-verifier-btn';
  button.innerHTML = '🤖 AI';
  button.title = 'Tag this video as AI-generated content';
  button.style.cssText = `
    margin-left: 8px !important;
    padding: 6px 12px !important;
    border: 1px solid #ccc !important;
    border-radius: 4px !important;
    background: #fff !important;
    font-size: 13px !important;
    font-weight: 500 !important;
    cursor: pointer !important;
    color: #333 !important;
    position: relative !important;
  `;
  
  // Create dropdown
  const dropdown = document.createElement('div');
  dropdown.className = 'ai-verifier-menu';
  dropdown.style.cssText = `
    position: fixed !important;
    background: white !important;
    border: 1px solid #ccc !important;
    border-radius: 4px !important;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
    z-index: 999999 !important;
    min-width: 200px !important;
    display: none !important;
    margin-top: 2px !important;
  `;
  
  // Add tag options
  TAGS.forEach(tag => {
    const option = document.createElement('div');
    option.innerHTML = `${tag.icon} ${tag.label}`;
    option.style.cssText = `
      padding: 10px 12px !important;
      cursor: pointer !important;
      border-bottom: 1px solid #eee !important;
      font-size: 13px !important;
    `;
    
    option.onmouseenter = () => option.style.background = '#f5f5f5';
    option.onmouseleave = () => option.style.background = '';
    
    option.onclick = async (e) => {
      e.stopPropagation();
      dropdown.style.display = 'none';
      
      const videoId = getVideoIdFromUrl(location.href);
      if (!videoId) return;
      
      if (!isExtensionContextValid()) {
        showNotification('Extension needs to be reloaded', true);
        return;
      }
      
      button.disabled = true;
      button.innerHTML = '⏳';
      
      try {
        chrome.runtime.sendMessage(
          { type: 'submitTag', videoId, tag: tag.id },
          async (response) => {
            if (chrome.runtime.lastError) {
              console.log('AI Verifier: Runtime error:', chrome.runtime.lastError);
              showNotification('Extension needs to be reloaded', true);
              button.disabled = false;
              return;
            }
            
            if (response && response.ok) {
              await saveUserTag(videoId, tag.id);
              updateButtonState(button);
              showNotification(`Tagged as: ${tag.label}`);
            } else {
              showNotification('Failed to submit tag', true);
            }
            button.disabled = false;
          }
        );
      } catch (e) {
        console.log('AI Verifier: Error sending message:', e);
        showNotification('Extension needs to be reloaded', true);
        button.disabled = false;
      }
    };
    
    dropdown.appendChild(option);
  });
  
  // Add remove option
  const removeOption = document.createElement('div');
  removeOption.innerHTML = '❌ Remove Tag';
  removeOption.style.cssText = `
    padding: 10px 12px !important;
    cursor: pointer !important;
    font-size: 13px !important;
    color: #e74c3c !important;
    border-top: 1px solid #eee !important;
  `;
  
  removeOption.onmouseenter = () => removeOption.style.background = '#fee';
  removeOption.onmouseleave = () => removeOption.style.background = '';
  
  removeOption.onclick = async (e) => {
    e.stopPropagation();
    dropdown.style.display = 'none';
    
    const videoId = getVideoIdFromUrl(location.href);
    if (!videoId) return;
    
    await saveUserTag(videoId, null);
    updateButtonState(button);
    showNotification('Removed AI tag');
  };
  
  dropdown.appendChild(removeOption);
  
  // Button click handler
  button.onclick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    
    console.log('AI Verifier: Button clicked');
    
    const isVisible = dropdown.style.display === 'block';
    
    // Close all other dropdowns
    document.querySelectorAll('.ai-verifier-menu').forEach(d => {
      d.style.display = 'none';
    });
    
    if (!isVisible) {
      // Position dropdown relative to button
      const rect = button.getBoundingClientRect();
      dropdown.style.top = (rect.bottom + 2) + 'px';
      dropdown.style.left = rect.left + 'px';
      dropdown.style.display = 'block';
      
      // Append to body for better positioning
      document.body.appendChild(dropdown);
    } else {
      dropdown.style.display = 'none';
    }
  };
  
  // Close dropdown when clicking outside or scrolling
  const closeDropdown = () => {
    dropdown.style.display = 'none';
  };
  
  document.addEventListener('click', (e) => {
    if (!button.contains(e.target) && !dropdown.contains(e.target)) {
      closeDropdown();
    }
  }, true);
  
  // Hide dropdown on scroll
  document.addEventListener('scroll', closeDropdown, true);
  window.addEventListener('scroll', closeDropdown, true);
  
  // Hide dropdown on window resize
  window.addEventListener('resize', closeDropdown);
  
  return button;
}

// Update button state based on current video tag
async function updateButtonState(button) {
  const videoId = getVideoIdFromUrl(location.href);
  if (!videoId || !button) return;
  
  try {
    const tagId = await getUserTag(videoId);
    
    if (tagId) {
      const tag = TAGS.find(t => t.id === tagId);
      if (tag) {
        button.innerHTML = `${tag.icon} Tagged`;
        button.style.background = tag.color;
        button.style.color = 'white';
        button.style.borderColor = tag.color;
        button.title = `Tagged as: ${tag.label}`;
      } else {
        button.innerHTML = '✓ Tagged';
        button.style.background = '#4CAF50';
        button.style.color = 'white';
        button.title = 'Tagged as AI-generated';
      }
    } else {
      button.innerHTML = '🤖 AI';
      button.style.background = '#fff';
      button.style.color = '#333';
      button.style.borderColor = '#ccc';
      button.title = 'Tag this video as AI-generated content';
    }
  } catch (e) {
    console.error('AI Verifier: Error updating button state', e);
  }
}

// Simple badge system
function injectBadges() {
  // Stop all operations if extension context is invalidated
  if (extensionInvalidated || !isExtensionContextValid()) {
    return;
  }
  
  const renderers = document.querySelectorAll('ytd-rich-item-renderer, ytd-video-renderer');
  
  renderers.forEach(async renderer => {
    if (renderer.dataset.aiProcessed) return;
    renderer.dataset.aiProcessed = 'true';
    
    const link = renderer.querySelector('a#thumbnail');
    if (!link) return;
    
    const videoId = getVideoIdFromUrl(link.href);
    if (!videoId) return;
    
    // Check for user tag first
    const userTag = await getUserTag(videoId);
    if (userTag) {
      const tag = TAGS.find(t => t.id === userTag);
      if (tag) {
        addBadge(renderer, `${tag.icon} Tagged`, tag.color);
        return;
      }
    }
    
    // Get confidence from API
    if (isExtensionContextValid()) {
      try {
        chrome.runtime.sendMessage({ type: 'getConfidence', videoId }, (response) => {
          if (chrome.runtime.lastError) {
            console.log('AI Verifier: Runtime error getting confidence:', chrome.runtime.lastError);
            addBadge(renderer, 'AI ?%', '#999');
            return;
          }
          
          if (!response || response.confidence == null) {
            addBadge(renderer, 'AI ?%', '#999');
            return;
          }
          
          const confidence = response.confidence;
          let text, color;
          
          if (confidence > 80) {
            text = `🚨 AI ${confidence}%`;
            color = '#e74c3c';
          } else if (confidence > 50) {
            text = `⚠️ AI ${confidence}%`;
            color = '#f39c12';
          } else {
            text = `✓ Human ${100-confidence}%`;
            color = '#2ecc71';
          }
          
          addBadge(renderer, text, color);
        });
      } catch (e) {
        console.log('AI Verifier: Error getting confidence:', e);
        addBadge(renderer, 'AI ?%', '#999');
      }
    } else {
      addBadge(renderer, 'AI ?%', '#999');
    }
  });
}

function addBadge(renderer, text, color) {
  // Remove existing badge
  const existingBadge = renderer.querySelector('.ai-verifier-badge');
  if (existingBadge) existingBadge.remove();
  
  const badge = document.createElement('span');
  badge.className = 'ai-verifier-badge';
  badge.textContent = text;
  badge.style.cssText = `
    display: inline-block !important;
    margin-left: 6px !important;
    padding: 3px 8px !important;
    border-radius: 12px !important;
    font-size: 11px !important;
    font-weight: 600 !important;
    background: ${color} !important;
    color: white !important;
    box-shadow: 0 1px 3px rgba(0,0,0,0.2) !important;
  `;
  
  const title = renderer.querySelector('#video-title');
  if (title && title.parentElement) {
    title.parentElement.appendChild(badge);
  }
}

// Enhanced button injection with better YouTube detection
let currentVideoId = null;
let buttonInjected = false;
let injectionAttempts = 0;

// Improved container finding with fallback strategies
function findButtonContainer() {
  const selectors = [
    '#top-level-buttons-computed',
    '#actions-inner #top-level-buttons-computed',
    '#menu-container #top-level-buttons-computed',
    'ytd-menu-renderer #top-level-buttons-computed',
    '.ytd-watch-flexy #actions #top-level-buttons-computed',
    '#actions #menu-container',
    '.top-level-buttons',
    '#watch-header .top-level-buttons',
    '.ytd-video-primary-info-renderer #menu-container',
    '#actions',
    '#menu-container'
  ];
  
  for (const selector of selectors) {
    const container = document.querySelector(selector);
    if (container && container.offsetParent !== null) { // Ensure it's visible
      return container;
    }
  }
  
  return null;
}

function injectButton() {
  // Stop all operations if extension context is invalidated
  if (extensionInvalidated || !isExtensionContextValid()) {
    return;
  }
  
  const videoId = getVideoIdFromUrl(location.href);
  
  // Only inject on watch pages
  if (!location.href.includes('watch') || !videoId) {
    currentVideoId = null;
    buttonInjected = false;
    return;
  }
  
  // If same video and button exists, just update it
  if (videoId === currentVideoId && buttonInjected) {
    const existingButton = document.querySelector('.ai-verifier-btn');
    if (existingButton && existingButton.parentNode) {
      updateButtonState(existingButton);
      return;
    }
  }
  
  // New video - reset state
  if (videoId !== currentVideoId) {
    currentVideoId = videoId;
    buttonInjected = false;
    injectionAttempts = 0;
  }
  
  // Remove any existing buttons
  document.querySelectorAll('.ai-verifier-btn').forEach(btn => btn.remove());
  
  // Find container
  const container = findButtonContainer();
  
  if (!container) {
    injectionAttempts++;
    console.log(`AI Verifier: Container not found, attempt ${injectionAttempts}`);
    
    // Retry up to 20 times with exponential backoff
    if (injectionAttempts < 20) {
      const delay = Math.min(injectionAttempts * 100, 2000);
      setTimeout(injectButton, delay);
    }
    return;
  }
  
  // Create and inject button
  try {
    const button = createAIButton();
    container.appendChild(button);
    buttonInjected = true;
    injectionAttempts = 0;
    
    // Update initial state
    updateButtonState(button);
    
    console.log('AI Verifier: Button injected for video', videoId);
  } catch (e) {
    console.error('AI Verifier: Error injecting button:', e);
    buttonInjected = false;
  }
}

// Wait for document to be ready before starting
function waitForDocument() {
  return new Promise((resolve) => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', resolve);
    } else {
      resolve();
    }
  });
}

// Main initialization
async function init() {
  console.log('AI Verifier: Initializing...');
  
  // Wait for basic DOM
  await waitForDocument();
  
  let lastUrl = location.href;
  let lastVideoId = null;
  
  // Initial injection with staggered attempts
  const initialInject = () => {
    injectButton();
    setTimeout(injectButton, 100);
    setTimeout(injectButton, 300);
    setTimeout(injectButton, 600);
    setTimeout(injectButton, 1000);
    setTimeout(injectButton, 2000);
    setTimeout(injectBadges, 1500);
  };
  
  // Start initial injection
  initialInject();
  
  // YouTube SPA navigation detection
  function handleYouTubeNavigation() {
    const newUrl = location.href;
    const newVideoId = getVideoIdFromUrl(newUrl);
    
    if (newUrl !== lastUrl || newVideoId !== lastVideoId) {
      console.log('AI Verifier: YouTube navigation detected', { 
        oldUrl: lastUrl, 
        newUrl, 
        oldVideoId: lastVideoId, 
        newVideoId 
      });
      
      lastUrl = newUrl;
      lastVideoId = newVideoId;
      currentVideoId = null;
      buttonInjected = false;
      
      // Staggered injection after navigation
      setTimeout(injectButton, 50);
      setTimeout(injectButton, 150);
      setTimeout(injectButton, 300);
      setTimeout(injectButton, 600);
      setTimeout(injectButton, 1200);
      setTimeout(injectButton, 2400);
    }
  }
  
  // 1. History API interception
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;
  
  history.pushState = function(...args) {
    originalPushState.apply(this, args);
    setTimeout(handleYouTubeNavigation, 0);
  };
  
  history.replaceState = function(...args) {
    originalReplaceState.apply(this, args);
    setTimeout(handleYouTubeNavigation, 0);
  };
  
  window.addEventListener('popstate', handleYouTubeNavigation);
  
  // 2. Enhanced MutationObserver
  const observer = new MutationObserver((mutations) => {
    let navigationDetected = false;
    let shouldInject = false;
    
    mutations.forEach(mutation => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === 1) {
            // Watch for YouTube page structure changes
            if (node.matches && (
              node.matches('ytd-watch-flexy') ||
              node.matches('ytd-page-manager') ||
              node.matches('#columns') ||
              node.matches('#primary') ||
              node.matches('#top-level-buttons-computed') ||
              node.matches('#menu-container') ||
              node.matches('.ytd-video-primary-info-renderer') ||
              node.matches('ytd-video-primary-info-renderer') ||
              node.matches('#info-contents')
            )) {
              navigationDetected = true;
              shouldInject = true;
            }
            
            // Check descendants
            if (node.querySelector && (
              node.querySelector('ytd-watch-flexy') ||
              node.querySelector('ytd-page-manager') ||
              node.querySelector('#top-level-buttons-computed') ||
              node.querySelector('#menu-container') ||
              node.querySelector('.ytd-video-primary-info-renderer')
            )) {
              navigationDetected = true;
              shouldInject = true;
            }
          }
        });
      }
    });
    
    if (navigationDetected) {
      console.log('AI Verifier: DOM changes suggest navigation, checking URL');
      handleYouTubeNavigation();
    }
    
    if (shouldInject) {
      setTimeout(injectButton, 50);
      setTimeout(injectButton, 200);
      setTimeout(injectButton, 500);
    }
    
    // Always update badges
    setTimeout(injectBadges, 800);
  });
  
  observer.observe(document, {
    childList: true,
    subtree: true
  });
  
  // 3. Title change detection
  let lastTitle = document.title;
  const titleObserver = new MutationObserver(() => {
    if (document.title !== lastTitle) {
      lastTitle = document.title;
      console.log('AI Verifier: Title changed to:', document.title);
      setTimeout(handleYouTubeNavigation, 100);
    }
  });
  
  // Wait for title element if not ready
  const observeTitle = () => {
    const titleElement = document.querySelector('title');
    if (titleElement) {
      titleObserver.observe(titleElement, {
        childList: true,
        characterData: true
      });
    } else {
      setTimeout(observeTitle, 100);
    }
  };
  observeTitle();
  
  // 4. URL polling with smarter logic
  setInterval(() => {
    if (location.href !== lastUrl) {
      console.log('AI Verifier: URL change detected via polling');
      handleYouTubeNavigation();
    }
    
    // Check for missing button on watch pages
    if (location.href.includes('watch') && !document.querySelector('.ai-verifier-btn')) {
      const container = findButtonContainer();
      if (container) {
        console.log('AI Verifier: Missing button detected via polling, container available');
        injectButton();
      }
    }
  }, 200);
  
  // 5. Periodic fallback injection
  setInterval(() => {
    if (location.href.includes('watch') && !document.querySelector('.ai-verifier-btn')) {
      console.log('AI Verifier: Fallback injection - button missing');
      injectButton();
    }
  }, 3000);
  
  // 6. YouTube-specific event listeners
  document.addEventListener('yt-navigate-start', () => {
    console.log('AI Verifier: yt-navigate-start event');
    handleYouTubeNavigation();
  });
  
  document.addEventListener('yt-navigate-finish', () => {
    console.log('AI Verifier: yt-navigate-finish event');
    setTimeout(injectButton, 200);
    setTimeout(injectButton, 800);
  });
  
  // 7. Visibility change detection
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && location.href.includes('watch')) {
      console.log('AI Verifier: Page became visible, checking button');
      setTimeout(injectButton, 200);
    }
  });
  
  window.addEventListener('focus', () => {
    if (location.href.includes('watch')) {
      console.log('AI Verifier: Window focused, checking button');
      setTimeout(injectButton, 200);
    }
  });
}

// Start initialization immediately
init();

// Also ensure we start when everything is loaded
window.addEventListener('load', () => {
  setTimeout(() => {
    console.log('AI Verifier: Window load event, ensuring button injection');
    injectButton();
    setTimeout(injectButton, 300);
    setTimeout(injectButton, 800);
  }, 200);
});