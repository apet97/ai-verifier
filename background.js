
const API_BASE = 'http://localhost:3000';

// Generate or get an anonymous user id
async function getUserId() {
  return new Promise(resolve => {
    chrome.storage.local.get(['uid'], result => {
      if (result.uid) {
        resolve(result.uid);
      } else {
        const uid = crypto.randomUUID();
        chrome.storage.local.set({ uid }, () => resolve(uid));
      }
    });
  });
}

const cache = new Map(); // confidence cache for session
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes

async function submitTag(videoId, tag) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const res = await fetch(`${API_BASE}/tag`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ videoId, tag }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    
    cache.delete(videoId); // force refresh next read
    
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }
    
    return { ok: true };
  } catch (e) {
    console.error('AI Verifier submit error', e);
    return { ok: false, error: e.message };
  }
}

async function getConfidence(videoId) {
  // Check cache with expiry
  if (cache.has(videoId)) {
    const cached = cache.get(videoId);
    if (cached && Date.now() - cached.timestamp < CACHE_EXPIRY) {
      return cached.confidence;
    }
    cache.delete(videoId);
  }
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const res = await fetch(`${API_BASE}/confidence/${videoId}`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    
    // Cache with timestamp
    cache.set(videoId, {
      confidence: data.confidence,
      timestamp: Date.now()
    });
    
    return data.confidence;
  } catch (e) {
    console.warn('AI Verifier confidence fetch failed', e);
    // Cache failure for 1 minute to avoid repeated requests
    cache.set(videoId, {
      confidence: null,
      timestamp: Date.now()
    });
    return null;
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    if (msg.type === 'submitTag') {
      const result = await submitTag(msg.videoId, msg.tag);
      sendResponse(result);
    } else if (msg.type === 'getConfidence') {
      const confidence = await getConfidence(msg.videoId);
      sendResponse({ confidence });
    }
  })();
  return true; // async response
});
