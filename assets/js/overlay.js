document.addEventListener('DOMContentLoaded', () => {
  const config = window.OVERLAY_CONFIG || {};

  // 1. URL Parametreleri Desteği
  const urlParams = new URLSearchParams(window.location.search);
  const showCam = urlParams.get('cam') !== '0';
  const showChat = urlParams.get('chat') !== '0';
  const customUser = urlParams.get('user');

  if (customUser) config.streamerName = customUser;

  // 2. Dinamik Durum Yöneticisi (State Manager)
  const stateManager = new StateManager(config);

  // 3. Ses Efektleri, TTS ve Alert Motorunu Başlat
  const soundFX = new SoundFX();
  const ttsManager = new TTSManager({
    ttsEnabled: config.tts?.enabled !== false,
    ttsVolume: config.tts?.volume || 1.0,
    ttsRate: config.tts?.rate || 1.05,
    ttsPitch: config.tts?.pitch || 1.0,
    ttsReadAllChat: config.tts?.readAllChat === true,
    ttsReadDonations: config.tts?.readDonations !== false
  });

  const alertEngine = new AlertEngine(soundFX, ttsManager);

  // Global erişim
  window.streamState = stateManager;
  window.streamAlertEngine = alertEngine;
  window.streamTTS = ttsManager;
  window.streamSFX = soundFX;

  // 4. Kick Canlı WebSocket ve Dinleyici
  const kickClient = new KickClient(
    config,
    (chatMsg) => {
      // Gelen Chat Mesajı
      const added = addChatMessage(chatMsg.sender?.username || "İzleyici", chatMsg.content || "", 'kick', chatMsg.id);
      
      // Tüm sohbeti sesli okuma açıksa (yalnızca tekil yeni mesajlarda)
      if (added && config.tts?.enabled && config.tts?.readAllChat) {
        ttsManager.speak(`${chatMsg.sender?.username} diyor ki: ${chatMsg.content}`);
      }
    },
    (alertType, data) => {
      handleAlertTrigger(alertType, data);
    }
  );

  const seenAlertKeys = new Map();
  function handleAlertTrigger(alertType, data, eventId = null) {
    const now = Date.now();
    const key = eventId || `${alertType}_${(data && (data.username || data.user)) || ''}`;
    const prev = seenAlertKeys.get(key) || 0;
    if ((now - prev) < 4500) return;
    seenAlertKeys.set(key, now);

    alertEngine.trigger(alertType, data);
    if (alertType === 'follower') {
      stateManager.updateEvent('follower', data.username);
    } else if (alertType === 'sub') {
      stateManager.updateEvent('sub', data.username);
    } else if (alertType === 'donation') {
      stateManager.updateEvent('donation', `${data.username} - ${data.amount}`);
    }
  }

  // 5. DOĞRUDAN TEST DİNLEYİCİSİ (postMessage - file:// protokolünde %100 çalışır)
  window.addEventListener('message', (event) => {
    const data = event.data;
    if (!data) return;

    if (data.type === 'TEST_ALERT' || data.type === 'LIVE_ALERT') {
      handleAlertTrigger(data.alertType, data.payload, data.id);
    } else if (data.type === 'TEST_CHAT' || data.type === 'CHAT_MESSAGE' || data.type === 'chat') {
      const u = data.username || data.user || data.sender?.username || "İzleyici";
      const c = data.content || data.text || data.message || "";
      const added = addChatMessage(u, c, data.badge || 'sub', data.id);
      if (added && config.tts?.enabled && config.tts?.readAllChat) {
        ttsManager.speak(`${u} diyor ki: ${c}`);
      }
    } else if (data.type === 'UPDATE_GOAL' && data.goal) {
      stateManager.updateGoal(data.goal.title, data.goal.current, data.goal.target);
    } else if (data.type === 'SET_CHAT_WIDGET') {
      if (data.url) {
        localStorage.setItem('stream_chat_widget_url', data.url);
      } else {
        localStorage.removeItem('stream_chat_widget_url');
      }
      initChatWidget();
    }
  });

  try {
    const bus1 = new BroadcastChannel('kick_hero_bus');
    bus1.onmessage = (e) => processServerPayload(e.data);
  } catch (e) {}

  try {
    const bus2 = new BroadcastChannel('kick_stream_bus');
    bus2.onmessage = (e) => processServerPayload(e.data);
  } catch (e) {}

  // 6. YEREL SUNUCU CANLI VERİ KÖPRÜSÜ (SSE + Polling)
  if (window.location.protocol.startsWith('http')) {
    let lastPollTime = Date.now() - 5000;

    function processServerPayload(payload) {
      if (!payload) return;
      if (payload.type === 'CLEAR_CHAT') {
        if (chatMessagesEl && !chatMessagesEl.classList.contains('has-widget-iframe') && !chatMessagesEl.querySelector('iframe')) {
          chatMessagesEl.innerHTML = '';
        }
        seenOverlayChatIds.clear();
        recentOverlayChatMap.clear();
        return;
      }
      if (payload.type === 'TEST_ALERT' || payload.type === 'LIVE_ALERT') {
        handleAlertTrigger(payload.alertType, payload.payload || payload.data, payload.id);
      } else if (payload.type === 'TEST_CHAT' || payload.type === 'CHAT_MESSAGE' || payload.type === 'chat') {
        const u = payload.username || payload.user || payload.sender?.username || "İzleyici";
        const c = payload.content || payload.text || payload.message || "";
        const isStreamer = !!payload.isStreamer || payload.badge === 'streamer';
        const b = isStreamer ? 'streamer' : (payload.badge || (payload.platform ? payload.platform.toLowerCase() : 'sub'));
        const added = addChatMessage(u, c, b, payload.id);
        if (added && config.tts?.enabled && config.tts?.readAllChat) {
          ttsManager.speak(`${u} diyor ki: ${c}`);
        }
      } else if (payload.type === 'UPDATE_GOAL' && payload.goal) {
        stateManager.updateGoal(payload.goal.title, payload.goal.current, payload.goal.target);
      } else if (payload.type === 'SET_CHAT_WIDGET') {
        if (payload.url) {
          localStorage.setItem('stream_chat_widget_url', payload.url);
        } else {
          localStorage.removeItem('stream_chat_widget_url');
        }
        initChatWidget();
      } else if (payload.type === 'UPDATE_STREAMER' && payload.streamer) {
        const nick = payload.streamer.username || payload.streamer.kickSlug || 'Yayıncı';
        const userEls = document.querySelectorAll('.bind-username');
        userEls.forEach(el => el.textContent = nick);
      }
    }

    // A) SSE (Node.js)
    try {
      const sse = new EventSource('/api/events');
      sse.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          processServerPayload(payload);
        } catch (e) {}
      };
    } catch (e) {}

    // B) Polling (PowerShell HttpListener ile %100 uyumlu)
    setInterval(async () => {
      try {
        const res = await fetch(`/api/poll?since=${lastPollTime}`);
        if (res.ok) {
          const data = await res.json();
          if (data.events && data.events.length > 0) {
            for (const ev of data.events) {
              lastPollTime = Math.max(lastPollTime, ev.time || 0);
              processServerPayload(ev);
            }
          }
        }
      } catch (e) {}
    }, 400);
  }

  // 7. Kick API'den Canlı Takipçi Sayısını Otomatik Çek
  stateManager.fetchLiveKickStats();
  setInterval(() => {
    stateManager.fetchLiveKickStats();
  }, 60000);

  // 8. Hedef Çubuğu DOM Güncelleyicisi
  function renderGoal(goal) {
    const goalTitleEl = document.getElementById('goal-title');
    const goalCounterEl = document.getElementById('goal-counter');
    const goalBarFill = document.getElementById('goal-fill');

    if (goalTitleEl) {
      goalTitleEl.innerHTML = `
        <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M12 2C6.49 2 2 6.49 2 12s4.49 10 10 10 10-4.49 10-10S17.51 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3-8c0 1.66-1.34 3-3 3s-3-1.34-3-3 1.34-3 3-3 3 1.34 3 3z"/></svg>
        ${goal.title || "TAKİPÇİ HEDEFİ"}
      `;
    }
    if (goalCounterEl) {
      goalCounterEl.textContent = `${goal.current} / ${goal.target}`;
    }
    if (goalBarFill) {
      const percentage = Math.min(100, Math.max(0, Math.round((goal.current / goal.target) * 100)));
      goalBarFill.style.width = `${percentage}%`;
    }
  }

  // 9. Son Olaylar DOM Güncelleyicisi
  function renderRecentEvents(events) {
    const elFollower = document.getElementById('recent-follower');
    const elSub = document.getElementById('recent-sub');
    const elDonation = document.getElementById('recent-donation');

    if (elFollower && events.follower) elFollower.textContent = events.follower;
    if (elSub && events.sub) elSub.textContent = events.sub;
    if (elDonation && events.donation) elDonation.textContent = events.donation;
  }

  // Başlangıç render'ı
  renderGoal(stateManager.state.goal);
  renderRecentEvents(stateManager.state.recentEvents);

  // Canlı senkronizasyon dinleyicileri
  stateManager.onGoalChange = (updatedGoal) => renderGoal(updatedGoal);
  stateManager.onEventChange = (updatedEvents) => renderRecentEvents(updatedEvents);

  // 10. Yayıncı ve Rütbe Bilgileri
  const usernameEls = document.querySelectorAll('.bind-username');
  usernameEls.forEach(el => el.textContent = config.streamerName || "STREAMER");

  const rankEl = document.querySelector('.bind-rank');
  if (rankEl && config.currentRank) {
    rankEl.textContent = config.currentRank;
  }

  // Webcam ve Chat görünürlüğü
  const webcamContainer = document.querySelector('.webcam-container');
  if (webcamContainer && !showCam) webcamContainer.style.display = 'none';

  const chatContainer = document.getElementById('chat-container');
  if (chatContainer && !showChat) chatContainer.style.display = 'none';

  // 11. Sosyal Medya Döngüsü
  const socialContainer = document.getElementById('social-display');
  if (socialContainer && config.socials && config.socials.length > 0) {
    let currentIndex = 0;

    const renderSocial = (item) => {
      socialContainer.style.opacity = '0';
      setTimeout(() => {
        socialContainer.innerHTML = `
          <div class="social-pill">
            ${getSocialIcon(item.icon)}
            <span>${item.name}</span>
          </div>
        `;
        socialContainer.style.opacity = '1';
      }, 300);
    };

    renderSocial(config.socials[0]);

    if (config.socials.length > 1) {
      setInterval(() => {
        currentIndex = (currentIndex + 1) % config.socials.length;
        renderSocial(config.socials[currentIndex]);
      }, 4000);
    }
  }

  // 12. Canlı Saat
  const clockEl = document.getElementById('live-clock');
  if (clockEl) {
    const updateClock = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      clockEl.textContent = `${hours}:${minutes}`;
    };
    updateClock();
    setInterval(updateClock, 1000);
  }

  // 13. Deluxe Canlı Chat Beslemesi & Widget Entegrasyonu
  const chatMessagesEl = document.getElementById('chat-messages');

  function initChatWidget() {
    if (!chatMessagesEl || !showChat) return false;

    const savedWidgetUrl = localStorage.getItem('stream_chat_widget_url') || (config && config.chatWidgetUrl);

    if (savedWidgetUrl && savedWidgetUrl.trim().startsWith('http')) {
      chatMessagesEl.classList.add('has-widget-iframe');
      chatMessagesEl.innerHTML = `
        <iframe src="${savedWidgetUrl.trim()}" 
                style="width: 100%; height: 100%; min-height: 100%; border: none; background: transparent; overflow: hidden;" 
                allowtransparency="true"></iframe>
      `;
      const liveTag = document.querySelector('.chat-live-tag');
      if (liveTag) {
        liveTag.textContent = '● CANLI ENTEGRE';
        liveTag.style.borderColor = '#10b981';
        liveTag.style.color = '#10b981';
        liveTag.style.background = 'rgba(16, 185, 129, 0.2)';
      }
      return true;
    } else {
      chatMessagesEl.classList.remove('has-widget-iframe');
      chatMessagesEl.innerHTML = '';
      return false;
    }
  }

  initChatWidget();

  if (window.location.protocol.startsWith('http')) {
    fetch('/api/chat-widget')
      .then(r => r.json())
      .then(d => {
        const srvUrl = (d && d.url) ? d.url.trim() : '';
        if (srvUrl.startsWith('http')) {
          localStorage.setItem('stream_chat_widget_url', srvUrl);
        } else {
          localStorage.removeItem('stream_chat_widget_url');
        }
        initChatWidget();
      })
      .catch(() => {});
  }

  const seenOverlayChatIds = new Set();
  const recentOverlayChatMap = new Map();

  function addChatMessage(user, text, badge = 'sub', msgId = null) {
    const cleanText = String(text || '').trim();
    if (!cleanText) return false;
    const now = Date.now();
    if (msgId) {
      if (seenOverlayChatIds.has(msgId)) return false;
      seenOverlayChatIds.add(msgId);
      if (seenOverlayChatIds.size > 200) seenOverlayChatIds.delete(seenOverlayChatIds.values().next().value);
    }
    const norm = cleanText.toLowerCase();
    const lastT = recentOverlayChatMap.get(norm) || 0;
    if ((now - lastT) < 6000) return false;
    recentOverlayChatMap.set(norm, now);
    if (recentOverlayChatMap.size > 150) recentOverlayChatMap.delete(recentOverlayChatMap.keys().next().value);

    if (!chatMessagesEl || !showChat) return true;
    if (chatMessagesEl.classList.contains('has-widget-iframe') || chatMessagesEl.querySelector('iframe')) return true;

    const isLarge = chatMessagesEl.classList.contains('large-chat-feed');
    const msgDiv = document.createElement('div');
    msgDiv.className = isLarge ? 'large-chat-entry' : 'deluxe-chat-entry';

    let badgeClass = badge || 'sub';
    let badgeLabel = (badge || 'CHAT').toUpperCase();
    if (badgeClass === 'tiktok') badgeLabel = 'TIKTOK';
    if (badgeClass === 'kick') badgeLabel = 'KICK';
    if (badgeClass === 'streamer') {
      badgeLabel = '👑 YAYINCI';
      msgDiv.classList.add('is-streamer');
    }

    const badgeStyle = badgeClass === 'streamer' ? 'style="background:rgba(245,158,11,0.25); color:#f59e0b; border:1px solid rgba(245,158,11,0.5); font-weight:800;"' : '';
    const authorStyle = badgeClass === 'streamer' ? 'style="color:#f59e0b; font-weight:800;"' : '';
    const badgeHtml = badgeClass ? `<span class="chat-badge ${badgeClass}" ${badgeStyle}>${badgeLabel}</span>` : '';

    if (isLarge) {
      msgDiv.innerHTML = `
        <div class="large-chat-header-row">
          ${badgeHtml}
          <span class="large-chat-author" ${authorStyle}>${escapeHtml(user)}</span>
        </div>
        <span class="large-chat-text">${escapeHtml(cleanText)}</span>
      `;
    } else {
      msgDiv.innerHTML = `
        <div style="display:flex; align-items:center; gap:6px; margin-bottom:2px;">
          ${badgeHtml}
          <span class="deluxe-chat-author" ${authorStyle}>${escapeHtml(user)}</span>
        </div>
        <span class="deluxe-chat-text">${escapeHtml(cleanText)}</span>
      `;
    }

    chatMessagesEl.appendChild(msgDiv);
    while (chatMessagesEl.children.length > (isLarge ? 25 : 8)) {
      chatMessagesEl.removeChild(chatMessagesEl.firstElementChild);
    }
    chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;

    setTimeout(() => {
      if (msgDiv && msgDiv.parentNode) {
        msgDiv.style.transition = 'opacity 0.45s ease, transform 0.45s ease';
        msgDiv.style.opacity = '0';
        msgDiv.style.transform = 'translateY(-6px)';
        setTimeout(() => { if (msgDiv && msgDiv.parentNode) msgDiv.remove(); }, 450);
      }
    }, 15000);
    return true;
  }

  function escapeHtml(str) {
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function getSocialIcon(iconType) {
    switch (iconType) {
      case 'kick':
        return `<svg viewBox="0 0 24 24" width="14" height="14" fill="#53fc18"><path d="M4 3h5v6h2V5h5v5h-3v4h3v5h-5v-4h-2v6H4V3z"/></svg>`;
      case 'instagram':
        return `<svg viewBox="0 0 24 24" width="14" height="14" fill="#53fc18"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>`;
      case 'tiktok':
        return `<svg viewBox="0 0 24 24" width="14" height="14" fill="#53fc18"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>`;
      case 'youtube':
        return `<svg viewBox="0 0 24 24" width="14" height="14" fill="#53fc18"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`;
      default:
        return `<svg viewBox="0 0 24 24" width="14" height="14" fill="#53fc18"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z"/></svg>`;
    }
  }
});
