// Simple icon storage using environment/file-based approach
// This provides persistence across server restarts in both dev and production

let iconCache: Record<string, string> = {};

export function setIcon(size: string, base64Data: string) {
  iconCache[`icon-${size}`] = base64Data;

  // Write to file for persistence across server restarts
  try {
    const fs = require('fs');
    const path = require('path');
    const cacheFile = path.join(process.cwd(), '.icon-cache.json');
    fs.writeFileSync(cacheFile, JSON.stringify(iconCache, null, 2));
    console.log('Icons cached to file for persistence');
  } catch (error) {
    console.log('Failed to write icon cache file:', error);
  }
}

export function getIcon(size: string): string | null {
  // First check memory cache
  if (iconCache[`icon-${size}`]) {
    return iconCache[`icon-${size}`];
  }

  // Try to load from file cache for persistence across server restarts
  try {
    const fs = require('fs');
    const path = require('path');
    const cacheFile = path.join(process.cwd(), '.icon-cache.json');
    if (fs.existsSync(cacheFile)) {
      const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
      iconCache = { ...iconCache, ...cached };
      return iconCache[`icon-${size}`] || null;
    }
  } catch (error) {
    console.log('Failed to read icon cache file:', error);
  }

  return null;
}

export function hasIcons(): boolean {
  return Object.keys(iconCache).length > 0 || checkCacheFile();
}

function checkCacheFile(): boolean {
  try {
    const fs = require('fs');
    const path = require('path');
    const cacheFile = path.join(process.cwd(), '.icon-cache.json');
    return fs.existsSync(cacheFile);
  } catch (error) {
    return false;
  }
}

export function clearIcons() {
  iconCache = {};

  try {
    const fs = require('fs');
    const path = require('path');
    const cacheFile = path.join(process.cwd(), '.icon-cache.json');
    if (fs.existsSync(cacheFile)) {
      fs.unlinkSync(cacheFile);
    }
  } catch (error) {
    console.log('Failed to delete icon cache file:', error);
  }
}