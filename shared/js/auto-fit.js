/**
 * Auto-Fit 16:9 Scaler for Stream Overlays & Scenes
 * - In OBS Studio (1920x1080): 100% 1:1 lossless native rendering, zero scaling.
 * - In Browser Tabs / Dynamic Previews / Mobile / Tablet:
 *   Automatically fits the 1920x1080 canvas to the viewport, maintaining aspect ratio.
 */
(function () {
  'use strict';

  function applyFit() {
    // If inside an iframe (like the control panel preview monitor), let parent handle it
    if (window.self !== window.top) return;

    const target = document.querySelector('.overlay-canvas') ||
                   document.querySelector('.scene-wrapper') ||
                   document.querySelector('.scene-layout');
    if (!target) return;

    const w = window.innerWidth || document.documentElement.clientWidth || screen.width;
    const h = window.innerHeight || document.documentElement.clientHeight || screen.height;

    // OBS Studio exact 1080p
    if (w === 1920 && h === 1080) {
      target.style.transform = 'none';
      target.style.position = 'relative';
      target.style.margin = '0';
      return;
    }

    // Set cinematic dark letterbox background in browser tabs
    if (document.documentElement) {
      document.documentElement.style.setProperty('background-color', '#07090e', 'important');
      document.documentElement.style.width = '100%';
      document.documentElement.style.height = '100%';
      document.documentElement.style.overflow = 'hidden';
    }
    if (document.body) {
      document.body.style.setProperty('background-color', '#07090e', 'important');
      document.body.style.width = '100%';
      document.body.style.height = '100%';
      document.body.style.overflow = 'hidden';
      document.body.style.display = 'flex';
      document.body.style.alignItems = 'center';
      document.body.style.justifyContent = 'center';
      document.body.style.margin = '0';
      document.body.style.padding = '0';
    }

    const scale = Math.min(w / 1920, h / 1080);
    target.style.transform = `scale(${scale})`;
    target.style.transformOrigin = 'center center';
    target.style.flexShrink = '0';
  }

  window.addEventListener('resize', applyFit);
  window.addEventListener('orientationchange', () => {
    setTimeout(applyFit, 100);
    setTimeout(applyFit, 300);
  });
  if (screen.orientation) {
    screen.orientation.addEventListener('change', () => {
      setTimeout(applyFit, 100);
      setTimeout(applyFit, 300);
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyFit);
  } else {
    applyFit();
  }
  window.addEventListener('load', applyFit);
  setTimeout(applyFit, 50);
  setTimeout(applyFit, 200);
})();
