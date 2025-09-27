"use client";

import { useEffect } from 'react';

export default function FaviconUpdater() {
  useEffect(() => {
    const updateFavicon = async () => {
      try {
        // Get current icon URL
        const response = await fetch('/api/icon/current');
        const data = await response.json();

        if (data.iconUrl) {
          // Add cache busting parameter to icon URL
          const cacheBustingUrl = data.iconUrl.includes('?')
            ? `${data.iconUrl}&t=${Date.now()}`
            : `${data.iconUrl}?t=${Date.now()}`;

          // Remove existing favicon links
          const existingFavicons = document.querySelectorAll("link[rel*='icon']");
          existingFavicons.forEach(favicon => favicon.remove());

          // Create new favicon link with cache busting
          const link = document.createElement('link');
          link.rel = 'icon';
          link.type = 'image/png';
          link.href = cacheBustingUrl;
          document.head.appendChild(link);

          // Also create shortcut icon for better compatibility
          const shortcutLink = document.createElement('link');
          shortcutLink.rel = 'shortcut icon';
          shortcutLink.type = 'image/png';
          shortcutLink.href = cacheBustingUrl;
          document.head.appendChild(shortcutLink);

          console.log('Favicon updated to:', cacheBustingUrl);
        }
      } catch (error) {
        console.error('Failed to update favicon:', error);
      }
    };

    updateFavicon();

    // Listen for custom favicon update events
    const handleFaviconUpdate = () => {
      console.log('Favicon update event received');
      setTimeout(updateFavicon, 100); // Small delay to ensure icon is ready
    };

    window.addEventListener('faviconUpdate', handleFaviconUpdate);

    return () => {
      window.removeEventListener('faviconUpdate', handleFaviconUpdate);
    };
  }, []);

  return null; // This component doesn't render anything
}