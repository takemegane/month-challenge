"use client";

import { useEffect } from 'react';

export default function AppleTouchIcon() {
  useEffect(() => {
    const updateAppleTouchIcon = async () => {
      try {
        // Check if we have uploaded icons
        const iconExists = await fetch('/icons/icon-180.png', { method: 'HEAD' })
          .then(res => res.ok)
          .catch(() => false);

        let iconUrl = '/icons/icon-180.png';
        if (!iconExists) {
          // Fallback to other sizes or API
          iconUrl = '/icons/icon-192.png';
        }

        // Remove existing apple-touch-icon
        const existingAppleIcons = document.querySelectorAll("link[rel='apple-touch-icon']");
        existingAppleIcons.forEach(icon => icon.remove());

        // Add apple-touch-icon with cache busting
        const appleIcon = document.createElement('link');
        appleIcon.rel = 'apple-touch-icon';
        appleIcon.sizes = '180x180';
        appleIcon.href = `${iconUrl}?t=${Date.now()}`;
        document.head.appendChild(appleIcon);

        console.log('Apple Touch Icon updated to:', appleIcon.href);
      } catch (error) {
        console.error('Failed to update Apple Touch Icon:', error);
      }
    };

    updateAppleTouchIcon();

    // Listen for custom apple icon update events
    const handleAppleIconUpdate = () => {
      console.log('Apple Touch Icon update event received');
      setTimeout(updateAppleTouchIcon, 100);
    };

    window.addEventListener('faviconUpdate', handleAppleIconUpdate);

    return () => {
      window.removeEventListener('faviconUpdate', handleAppleIconUpdate);
    };
  }, []);

  return null;
}