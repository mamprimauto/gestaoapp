// Clear sessionStorage cache for timer data
// Run this in browser console to clear cached timer data

// Clear all timer-related cache entries
const cacheKeys = [];
for (let i = 0; i < sessionStorage.length; i++) {
  const key = sessionStorage.key(i);
  if (key && key.includes('timer-')) {
    cacheKeys.push(key);
  }
}

console.log(`Found ${cacheKeys.length} timer cache entries to clear:`, cacheKeys);

cacheKeys.forEach(key => {
  sessionStorage.removeItem(key);
  console.log(`Cleared cache key: ${key}`);
});

console.log('Timer cache cleared! Please refresh the page to load new timezone-corrected data.');

// Optionally reload the page
// window.location.reload();