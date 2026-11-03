/**
 * MLBB Stream Scenes - Real Live Chat Engine
 * (Yayın Başlıyor, Mola ve Yayın Bitti sahneleri için simülasyonsuz gerçek chat)
 */

(function () {
  'use strict';

  function escapeHtml(str) {
    return String(str || '').replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  document.addEventListener('DOMContentLoaded', () => {
    const feed = document.getElementById('chat-messages');
    if (!feed) return;

    function initChatWidget() {
      const config = window.OVERLAY_CONFIG || {};
      const savedWidgetUrl = localStorage.getItem('stream_chat_widget_url') || (config && config.chatWidgetUrl);

      if (savedWidgetUrl && savedWidgetUrl.trim().startsWith('http')) {
        feed.classList.add('has-widget-iframe');
        feed.innerHTML = `
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
        feed.classList.remove('has-widget-iframe');
        feed.innerHTML = '';
        return false;
      }
    }

    const isWidgetActive = initChatWidget();

    if (!isWidgetActive && window.location.protocol.startsWith('http')) {
      fetch('/api/chat-widget')
        .then(r => r.json())
        .then(d => {
          if (d && d.url && d.url.trim().startsWith('http')) {
            localStorage.setItem('stream_chat_widget_url', d.url.trim());
            initChatWidget();
          }
        })
        .catch(() => {});
    }

    function addMessage(author, text, badge = 'sub') {
      if (!author && !text) return;
      if (feed.classList.contains('has-widget-iframe')) return;

      const entry = document.createElement('div');
      entry.className = 'large-chat-entry';

      let badgeClass = badge || 'sub';
      let badgeLabel = (badge || 'CHAT').toUpperCase();
      if (badgeClass === 'tiktok') badgeLabel = 'TIKTOK';
      if (badgeClass === 'kick') badgeLabel = 'KICK';

      const badgeHtml = badgeClass ? `<span class="chat-badge ${badgeClass}">${badgeLabel}</span>` : '';
      entry.innerHTML = `
        <div class="large-chat-header-row">
          ${badgeHtml}
          <span class="large-chat-author">${escapeHtml(author)}</span>
        </div>
        <span class="large-chat-text">${escapeHtml(text)}</span>
      `;

      feed.appendChild(entry);
      feed.scrollTop = feed.scrollHeight;

      while (feed.children.length > 25) {
        feed.removeChild(feed.firstChild);
      }
    }

    // Dışarıdan olay dinleme (BroadcastChannel + postMessage + Polling)
    function handleEvent(data) {
      if (!data) return;
      if (data.type === 'TEST_CHAT' || data.type === 'CHAT_MESSAGE' || data.type === 'chat') {
        const user = data.username || data.user || data.sender?.username || 'İzleyici';
        const msg = data.content || data.text || data.message || '';
        const badge = data.badge || (data.platform ? data.platform.toLowerCase() : 'sub');
        addMessage(user, msg, badge);
      } else if (data.type === 'SET_CHAT_WIDGET') {
        if (data.url) {
          localStorage.setItem('stream_chat_widget_url', data.url);
        } else {
          localStorage.removeItem('stream_chat_widget_url');
        }
        initChatWidget();
      }
    }

    try {
      const bus1 = new BroadcastChannel('kick_hero_bus');
      bus1.onmessage = (e) => handleEvent(e.data);
    } catch (e) {}

    try {
      const bus2 = new BroadcastChannel('kick_stream_bus');
      bus2.onmessage = (e) => handleEvent(e.data);
    } catch (e) {}

    window.addEventListener('message', (e) => {
      if (e.data && typeof e.data === 'object') {
        handleEvent(e.data);
      }
    });

    // Sunucu Polling Entegrasyonu (TikTok Live + Yerel Olaylar)
    let lastPollTime = Date.now() - 5000;
    setInterval(() => {
      fetch(`/api/poll?since=${lastPollTime}`)
        .then(r => r.json())
        .then(resData => {
          if (resData && resData.events && resData.events.length > 0) {
            resData.events.forEach(ev => {
              if (ev.time > lastPollTime) lastPollTime = ev.time;
              handleEvent(ev);
            });
          }
        })
        .catch(() => {});
    }, 1000);

    // Kick Pusher WebSocket doğrudan bağlantısı
    const config = window.OVERLAY_CONFIG || {};
    const kickSlug = config.kickChannel || localStorage.getItem('kick_channel') || 'cihanatas';
    if (kickSlug) {
      fetch(`/api/kick/channel?slug=${encodeURIComponent(kickSlug)}`)
        .then(r => {
          if (!r.ok) throw new Error('Proxy fallback');
          return r.json();
        })
        .catch(() => fetch(`https://kick.com/api/v2/channels/${encodeURIComponent(kickSlug)}`).then(res => res.json()))
        .then(kData => {
          const chatroomId = kData?.chatroom?.id;
          if (!chatroomId) return;
          const ws = new WebSocket('wss://ws-us2.pusher.com/app/34bf7a0ff419a2a775b9?protocol=7&client=js&version=7.4.0&flash=false');
          ws.onopen = () => {
            ws.send(JSON.stringify({ event: 'pusher:subscribe', data: { channel: `chatrooms.${chatroomId}.v2` } }));
          };
          ws.onmessage = (evt) => {
            try {
              const packet = JSON.parse(evt.data);
              if (packet.event === 'pusher:ping') {
                ws.send(JSON.stringify({ event: 'pusher:pong', data: {} }));
                return;
              }
              if (packet.event === 'App\\Events\\ChatMessageEvent') {
                const cData = typeof packet.data === 'string' ? JSON.parse(packet.data) : packet.data;
                const sender = cData.sender?.username || 'Kickİzleyici';
                const content = cData.content || '';
                const isSub = (cData.sender?.badges || []).some(b => b.type === 'subscriber');
                const isMod = (cData.sender?.badges || []).some(b => b.type === 'moderator');
                const badge = isMod ? 'mod' : (isSub ? 'sub' : 'kick');
                addMessage(sender, content, badge);
              }
            } catch (e) {}
          };
          ws.onclose = () => {
            setTimeout(() => {
              // Gerekirse yeniden bağlan
            }, 10000);
          };
        })
        .catch(() => {});
    }

    window.addSceneChatMessage = addMessage;
  });
})();
