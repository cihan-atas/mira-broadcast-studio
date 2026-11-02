/**
 * =============================================================
 * MLBB HEROES OVERLAY - DYNAMIC ENGINE (V3)
 * - Canvas Parçacık Motoru (Hero'ya özel 5 farklı tema)
 * - Canlı Chat Simülatörü & BroadcastChannel Entegrasyonu
 * - Dinamik Ses Dalgaları (Audio Visualizer)
 * - Gerçek Zamanlı Saat & Yayın Uptime Sayacı
 * - Web Audio API ile Çevrimdışı Sentetik Alert Sesleri (SFX)
 * - Dinamik Alert Bildirim Bannerı
 * - OBS / TikTok Kılavuz Modu ('H' tuşu)
 * =============================================================
 */

(function () {
  'use strict';

  // Global Yapılandırma
  const heroName = (window.HERO_CONFIG && window.HERO_CONFIG.heroName) || 'vexana';

  // =============================================================
  // 0. AUTO-FIT 16:9 SCALER (YENİ SEKME & TARAYICI & MOBİL ÖNİZLEME UYUMU)
  // - OBS'te (1920x1080) tam 1:1 kayıpsız piksel piksel renderlanır.
  // - Yeni sekmede / laptop / tablet / mobilde ekranı taşmadan tam doldurur.
  // =============================================================
  function applyAutoFit() {
    // If inside an iframe (like the control panel preview monitor), let parent handle it
    if (window.self !== window.top) return;

    const target = document.querySelector('.overlay-canvas') ||
                   document.querySelector('.scene-wrapper') ||
                   document.querySelector('.scene-layout');
    if (!target) return;

    const w = window.innerWidth || document.documentElement.clientWidth || screen.width;
    const h = window.innerHeight || document.documentElement.clientHeight || screen.height;

    if (w === 1920 && h === 1080) {
      target.style.transform = 'none';
      return;
    }

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

  window.addEventListener('resize', applyAutoFit);
  window.addEventListener('orientationchange', () => {
    setTimeout(applyAutoFit, 100);
    setTimeout(applyAutoFit, 300);
  });
  if (screen.orientation) {
    screen.orientation.addEventListener('change', () => {
      setTimeout(applyAutoFit, 100);
      setTimeout(applyAutoFit, 300);
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyAutoFit);
  } else {
    applyAutoFit();
  }
  window.addEventListener('load', applyAutoFit);
  setTimeout(applyAutoFit, 60);
  setTimeout(applyAutoFit, 200);

  // =============================================================
  // 1. DİNAMİK CANVAS PARÇACIK MOTORU (HERO THEMED PARTICLES)
  // =============================================================
  function initHeroParticles() {
    const canvas = document.getElementById('hero-particles');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let width = (canvas.width = 1920);
    let height = (canvas.height = 1080);

    const particles = [];
    const maxParticles = 45;

    // Herolara özel parçacık ayarları
    const configs = {
      vexana: {
        color: ['rgba(168, 85, 247, ', 'rgba(192, 132, 252, ', 'rgba(16, 185, 129, '],
        type: 'soul',
        speedY: -0.7,
        speedX: 0.3,
        size: [3, 7]
      },
      zetian: {
        color: ['rgba(255, 215, 0, ', 'rgba(245, 158, 11, ', 'rgba(239, 68, 68, '],
        type: 'ember',
        speedY: -1.2,
        speedX: 0.6,
        size: [2.5, 6]
      },
      nana: {
        color: ['rgba(255, 133, 162, ', 'rgba(244, 114, 182, ', 'rgba(147, 197, 253, '],
        type: 'star',
        speedY: -0.5,
        speedX: 0.4,
        size: [3, 8]
      },
      carmilla: {
        color: ['rgba(217, 4, 41, ', 'rgba(239, 35, 60, ', 'rgba(141, 153, 174, '],
        type: 'petal',
        speedY: 0.9, // Yapraklar aşağı doğru dökülür
        speedX: 0.5,
        size: [4, 9]
      },
      atlas: {
        color: ['rgba(0, 245, 212, ', 'rgba(56, 189, 248, ', 'rgba(14, 165, 233, '],
        type: 'bubble',
        speedY: -0.8,
        speedX: 0.25,
        size: [3, 9]
      }
    };

    const cfg = configs[heroName] || configs.vexana;

    class Particle {
      constructor() {
        this.reset(true);
      }

      reset(init = false) {
        this.x = Math.random() * width;
        this.y = init ? Math.random() * height : cfg.speedY < 0 ? height + 20 : -20;
        this.size = cfg.size[0] + Math.random() * (cfg.size[1] - cfg.size[0]);
        this.baseColor = cfg.color[Math.floor(Math.random() * cfg.color.length)];
        this.alpha = 0.15 + Math.random() * 0.65;
        this.vx = (Math.random() - 0.5) * cfg.speedX;
        this.vy = cfg.speedY * (0.6 + Math.random() * 0.8);
        this.angle = Math.random() * Math.PI * 2;
        this.spin = (Math.random() - 0.5) * 0.04;
        this.pulse = Math.random() * Math.PI * 2;
      }

      update() {
        this.x += this.vx + Math.sin(this.pulse) * 0.4;
        this.y += this.vy;
        this.angle += this.spin;
        this.pulse += 0.03;

        if (cfg.speedY < 0 && this.y < -30) this.reset();
        else if (cfg.speedY > 0 && this.y > height + 30) this.reset();
        if (this.x < -30 || this.x > width + 30) this.reset();
      }

      draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        const currentAlpha = Math.max(0.1, Math.min(1, this.alpha + Math.sin(this.pulse) * 0.2));
        ctx.fillStyle = this.baseColor + currentAlpha + ')';

        if (cfg.type === 'star') {
          // Nana'nın tatlı parıldayan yıldızları
          drawStar(ctx, 0, 0, 4, this.size, this.size * 0.45);
        } else if (cfg.type === 'petal') {
          // Carmilla'nın dökülen vampir gül yaprakları
          ctx.beginPath();
          ctx.ellipse(0, 0, this.size * 1.3, this.size * 0.7, 0, 0, Math.PI * 2);
          ctx.fill();
        } else if (cfg.type === 'bubble') {
          // Atlas'ın derin deniz parıldayan baloncukları
          ctx.beginPath();
          ctx.arc(0, 0, this.size, 0, Math.PI * 2);
          ctx.strokeStyle = this.baseColor + (currentAlpha + 0.2) + ')';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(-this.size * 0.3, -this.size * 0.3, this.size * 0.25, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255,255,255,0.7)';
          ctx.fill();
        } else {
          // Vexana ruhları & Zetian anka kıvılcımları
          ctx.beginPath();
          ctx.arc(0, 0, this.size, 0, Math.PI * 2);
          ctx.shadowBlur = 12;
          ctx.shadowColor = this.baseColor + '1)';
          ctx.fill();
        }

        ctx.restore();
      }
    }

    function drawStar(c, cx, cy, spikes, outerRadius, innerRadius) {
      let rot = (Math.PI / 2) * 3;
      let step = Math.PI / spikes;
      c.beginPath();
      c.moveTo(cx, cy - outerRadius);
      for (let i = 0; i < spikes; i++) {
        c.lineTo(cx + Math.cos(rot) * outerRadius, cy + Math.sin(rot) * outerRadius);
        rot += step;
        c.lineTo(cx + Math.cos(rot) * innerRadius, cy + Math.sin(rot) * innerRadius);
        rot += step;
      }
      c.lineTo(cx, cy - outerRadius);
      c.closePath();
      c.fill();
    }

    for (let i = 0; i < maxParticles; i++) {
      particles.push(new Particle());
    }

    function animate() {
      ctx.clearRect(0, 0, width, height);
      for (let i = 0; i < particles.length; i++) {
        particles[i].update();
        particles[i].draw();
      }
      requestAnimationFrame(animate);
    }
    animate();
  }

  // =============================================================
  // 2. DİNAMİK SES DALGALARI (AUDIO VISUALIZER)
  // =============================================================
  function initAudioVisualizer() {
    const container = document.getElementById('visualizer-bars');
    if (!container) return;

    container.innerHTML = '';
    const barCount = 16;
    const bars = [];

    for (let i = 0; i < barCount; i++) {
      const b = document.createElement('div');
      b.className = 'viz-bar';
      // Renk geçişi (hero'ya göre)
      b.style.backgroundColor = 'var(--primary-color, #a855f7)';
      container.appendChild(b);
      bars.push(b);
    }

    let phase = 0;
    setInterval(() => {
      phase += 0.2;
      bars.forEach((b, idx) => {
        const sinVal = Math.sin(phase + idx * 0.45);
        const cosVal = Math.cos(phase * 0.7 + idx * 0.3);
        const rand = Math.random() * 25;
        const heightPct = Math.max(12, Math.min(100, Math.abs(sinVal * 45 + cosVal * 30 + rand)));
        b.style.height = `${heightPct}%`;
      });
    }, 90);
  }

  // =============================================================
  // 3. GERÇEK ZAMANLI SAAT & YAYIN UPTIME SAYACI
  // =============================================================
  function initStreamTimers() {
    const clockEl = document.getElementById('live-clock');
    const uptimeEl = document.getElementById('stream-uptime');

    function updateClock() {
      const now = new Date();
      const h = String(now.getHours()).padStart(2, '0');
      const m = String(now.getMinutes()).padStart(2, '0');
      const s = String(now.getSeconds()).padStart(2, '0');
      if (clockEl) clockEl.textContent = `${h}:${m}:${s}`;
    }
    updateClock();
    setInterval(updateClock, 1000);

    let uptimeSec = 1420; // 00:23:40 ile başlar, dinamik ilerler
    function updateUptime() {
      uptimeSec++;
      const uh = String(Math.floor(uptimeSec / 3600)).padStart(2, '0');
      const um = String(Math.floor((uptimeSec % 3600) / 60)).padStart(2, '0');
      const us = String(uptimeSec % 60).padStart(2, '0');
      if (uptimeEl) uptimeEl.textContent = `● ${uh}:${um}:${us} CANLI`;
    }
    updateUptime();
    setInterval(updateUptime, 1000);
  }

  // =============================================================
  // 4. WEB AUDIO API SENTETİK ALERT SES MOTORU (100% OFFLINE)
  // =============================================================
  const WebAudioSFX = {
    ctx: null,
    getCtx() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) this.ctx = new AudioCtx();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return this.ctx;
    },
    playTone(freq, type, duration, delay = 0, gainLevel = 0.15) {
      const c = this.getCtx();
      if (!c) return;
      setTimeout(() => {
        try {
          const osc = c.createOscillator();
          const gain = c.createGain();
          osc.type = type;
          osc.frequency.setValueAtTime(freq, c.currentTime);
          gain.gain.setValueAtTime(gainLevel, c.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
          osc.connect(gain);
          gain.connect(c.destination);
          osc.start();
          osc.stop(c.currentTime + duration);
        } catch (e) {}
      }, delay);
    },
    playFollower() {
      this.playTone(523.25, 'sine', 0.25, 0, 0.2); // C5
      this.playTone(659.25, 'sine', 0.25, 120, 0.2); // E5
      this.playTone(783.99, 'sine', 0.45, 240, 0.25); // G5
    },
    playSub() {
      this.playTone(440, 'triangle', 0.2, 0, 0.25);
      this.playTone(554.37, 'triangle', 0.2, 100, 0.25);
      this.playTone(659.25, 'triangle', 0.2, 200, 0.25);
      this.playTone(880, 'triangle', 0.6, 320, 0.3);
    },
    playDonation() {
      this.playTone(587.33, 'sine', 0.15, 0, 0.25);
      this.playTone(739.99, 'sine', 0.15, 90, 0.25);
      this.playTone(880.00, 'sine', 0.15, 180, 0.25);
      this.playTone(1174.66, 'sine', 0.7, 270, 0.35);
    }
  };

  // =============================================================
  // 5. DİNAMİK ALERT BİLDİRİM BANNERI VE HEDEF GÜNCELLEMESİ
  // =============================================================
  let currentGoal = {
    title: (window.HERO_CONFIG && window.HERO_CONFIG.goalTitle) || "TAKİPÇİ HEDEFİ",
    current: parseInt(localStorage.getItem('stream_goal_current') || 1, 10),
    target: (window.HERO_CONFIG && window.HERO_CONFIG.goalTarget) || 50
  };

  function updateGoalDisplay(g) {
    currentGoal = { ...currentGoal, ...g };
    const titleEl = document.getElementById('goal-title');
    const counterEl = document.getElementById('goal-counter');
    const fillEl = document.getElementById('goal-fill');

    if (titleEl) titleEl.textContent = currentGoal.title;
    if (counterEl) counterEl.textContent = `${currentGoal.current} / ${currentGoal.target}`;
    if (fillEl) {
      const pct = Math.min(100, Math.max(0, (currentGoal.current / (currentGoal.target || 1)) * 100));
      fillEl.style.width = `${pct}%`;
    }
  }

  function updateRecentStat(type, value) {
    let el = document.getElementById(`recent-${type}`) || document.getElementById(type);
    if (!el && type === 'top-donor') el = document.getElementById('top-donor');
    const card = el ? el.closest('.hero-stat-card') : null;
    if (el) el.textContent = value;
    if (card) {
      card.classList.remove('flash-update');
      void card.offsetWidth; // reflow
      card.classList.add('flash-update');
    }
  }

  function triggerAlertBanner(alertType, payload) {
    const container = document.getElementById('alert-container');
    if (!container) return;

    // Ses çal
    if (alertType === 'follower') WebAudioSFX.playFollower();
    else if (alertType === 'sub') WebAudioSFX.playSub();
    else if (alertType === 'donation' || alertType === 'gift') WebAudioSFX.playDonation();

    const titleMap = {
      follower: 'YENİ TAKİPÇİ!',
      sub: 'YENİ ABONE!',
      donation: 'BAĞIŞ / DESTEK!',
      gift: 'TIKTOK HEDİYESİ!'
    };

    const headerTag = titleMap[alertType] || 'CANLI BİLDİRİM';
    const username = payload.username || 'Gizemli Kahraman';
    let subTitle = 'Ailemize Hoş Geldin!';
    if (alertType === 'donation') subTitle = `${payload.amount || '100₺'} Bağış Yaptı!`;
    else if (alertType === 'gift') subTitle = `${payload.giftName || 'Gül (x10)'} Gönderdi! 🌹`;
    const userMsg = payload.message || '';

    container.innerHTML = `
      <div class="hero-alert-card" style="border: 2px solid var(--primary-color, #a855f7); background: var(--glass-bg, rgba(18, 10, 28, 0.95));">
        <div class="hero-alert-icon-ring" style="box-shadow: 0 0 18px var(--primary-glow, rgba(168, 85, 247, 0.8));">
          <img src="assets/images/avatar.jpg" alt="Avatar">
        </div>
        <div class="hero-alert-content">
          <span class="hero-alert-header-tag" style="color: var(--secondary-color, #10b981);">${headerTag}</span>
          <h3 class="hero-alert-main-title" style="color: #fff; text-shadow: 0 0 12px var(--primary-glow);">${username}</h3>
          <span class="hero-alert-sub-title">${subTitle}</span>
          ${userMsg ? `<p class="hero-alert-message">"${userMsg}"</p>` : ''}
        </div>
      </div>
    `;

    // 4.5 saniye sonra kaldır
    setTimeout(() => {
      const card = container.querySelector('.hero-alert-card');
      if (card) {
        card.classList.add('alert-hide');
        setTimeout(() => (container.innerHTML = ''), 400);
      }
    }, 4500);

    // Üst Bar & Hedef Güncelleme
    if (alertType === 'follower') {
      updateRecentStat('follower', username);
      currentGoal.current += 1;
      updateGoalDisplay(currentGoal);
    } else if (alertType === 'sub') {
      updateRecentStat('sub', username);
    } else if (alertType === 'donation') {
      updateRecentStat('donation', `${username} (${payload.amount || '100₺'})`);
      currentGoal.current += Math.max(1, Math.floor(parseInt(payload.amount || 20) / 10));
      updateGoalDisplay(currentGoal);
    } else if (alertType === 'gift') {
      const giftVal = `${username} (${payload.giftName || 'Gül x10'})`;
      updateRecentStat('gift', giftVal);
      updateRecentStat('donation', giftVal);
      if (payload.topDonor || (payload.diamonds && payload.diamonds >= 100)) {
        updateRecentStat('top-donor', `${username} (${payload.amount || payload.diamonds + ' 💎'})`);
      }
      currentGoal.current += 1;
      updateGoalDisplay(currentGoal);
    }
  }

  // =============================================================
  // 6. DİNAMİK CANLI CHAT SİSTEMİ (Simülatör veya Gerçek BotRix / TikFinity Widget)
  // =============================================================
  function initLiveChatSystem() {
    const feed = document.getElementById('chat-messages');
    const panel = document.querySelector('.hero-chat-panel');
    if (!feed || !panel) return;

    let savedWidgetUrl = localStorage.getItem('stream_chat_widget_url') || (window.HERO_CONFIG && window.HERO_CONFIG.chatWidgetUrl) || (window.OVERLAY_CONFIG && window.OVERLAY_CONFIG.chatWidgetUrl);

    if (savedWidgetUrl && savedWidgetUrl.trim().startsWith('http')) {
      // Gerçek Widget Modu (BotRix, TikFinity, StreamElements, Restream vb.)
      feed.innerHTML = `
        <iframe src="${savedWidgetUrl.trim()}" 
                style="width: 100%; height: 100%; border: none; background: transparent;" 
                allowtransparency="true"></iframe>
      `;
      const liveTag = panel.querySelector('.hero-chat-live-tag');
      if (liveTag) {
        liveTag.textContent = '● CANLI ENTEGRE';
        liveTag.style.borderColor = '#10b981';
        liveTag.style.color = '#10b981';
        liveTag.style.background = 'rgba(16, 185, 129, 0.2)';
      }
    } else {
      // Saf Gerçek Canlı Chat Modu (Simülasyonsuz)
      initRealLiveChat();

      if (window.location.protocol.startsWith('http')) {
        fetch('/api/chat-widget')
          .then(r => r.json())
          .then(d => {
            if (d && d.url && d.url.trim().startsWith('http')) {
              localStorage.setItem('stream_chat_widget_url', d.url.trim());
              initLiveChatSystem();
            }
          })
          .catch(() => {});
      }
    }
  }

  function escapeHtml(str) {
    return String(str || '').replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function initRealLiveChat() {
    const feed = document.getElementById('chat-messages');
    const panel = document.querySelector('.hero-chat-panel');
    if (!feed) return;

    // Temiz başlangıç - simüle mesaj yok
    feed.innerHTML = '';

    const liveTag = panel ? panel.querySelector('.hero-chat-live-tag') : null;
    if (liveTag) {
      liveTag.textContent = '● CANLI SOHBET';
      liveTag.style.borderColor = '#10b981';
      liveTag.style.color = '#10b981';
      liveTag.style.background = 'rgba(16, 185, 129, 0.2)';
    }

    function addChatMessage(author, text, badge = 'sub') {
      if (!author && !text) return;
      const entry = document.createElement('div');
      entry.className = 'hero-chat-entry';

      let badgeClass = badge || 'sub';
      let badgeLabel = (badge || 'CHAT').toUpperCase();
      if (badgeClass === 'tiktok') badgeLabel = 'TIKTOK';
      if (badgeClass === 'kick') badgeLabel = 'KICK';

      const badgeHtml = badgeClass ? `<span class="chat-badge ${badgeClass}">${badgeLabel}</span>` : '';
      entry.innerHTML = `
        <div class="hero-chat-entry-header">
          ${badgeHtml}
          <span class="hero-chat-author" style="color: var(--primary-color, #c084fc);">${escapeHtml(author)}</span>
        </div>
        <span class="hero-chat-text">${escapeHtml(text)}</span>
      `;

      feed.appendChild(entry);
      feed.scrollTop = feed.scrollHeight;

      while (feed.children.length > 25) {
        feed.removeChild(feed.firstChild);
      }
    }

    // Dışarıdan ve WebSocket'ten çağrılacak fonksiyon
    window.addCustomChatMessage = addChatMessage;

    // Kick Pusher WebSocket doğrudan bağlantısı
    const kickSlug = (window.HERO_CONFIG && window.HERO_CONFIG.kickChannel) || (window.OVERLAY_CONFIG && window.OVERLAY_CONFIG.kickChannel) || localStorage.getItem('kick_channel') || 'cihanatas';
    initKickPusher(kickSlug, addChatMessage);
  }

  function initKickPusher(channelSlug, onMessage) {
    if (!channelSlug) return;
    const fetchUrl = `/api/kick/channel?slug=${encodeURIComponent(channelSlug)}`;
    fetch(fetchUrl)
      .then(res => {
        if (!res.ok) throw new Error('Proxy fallback');
        return res.json();
      })
      .catch(() => fetch(`https://kick.com/api/v2/channels/${encodeURIComponent(channelSlug)}`).then(r => r.json()))
      .then(data => {
        if (!data) return;

        // Gerçek canlı takipçi sayısını Kick sunucusundan eşitle
        const fCount = data.followers_count ?? data.followersCount;
        if (typeof fCount === 'number') {
          currentGoal.current = fCount;
          localStorage.setItem('stream_goal_current', fCount);
          updateGoalDisplay(currentGoal);
        }

        const chatroomId = data?.chatroom?.id;
        const channelId = data?.id;

        const pusherAppKey = '32cbd69e4b950ba97041';
        const wsUrl = `wss://ws-us2.pusher.com/app/${pusherAppKey}?protocol=7&client=js&version=8.4.0-rc2&flash=false`;
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          if (chatroomId) {
            ws.send(JSON.stringify({
              event: 'pusher:subscribe',
              data: { channel: `chatrooms.${chatroomId}.v2` }
            }));
          }
          if (channelId) {
            ws.send(JSON.stringify({
              event: 'pusher:subscribe',
              data: { channel: `channel.${channelId}` }
            }));
          }
        };

        ws.onmessage = (msg) => {
          try {
            const packet = JSON.parse(msg.data);
            if (packet.event === 'pusher:ping') {
              ws.send(JSON.stringify({ event: 'pusher:pong', data: {} }));
              return;
            }
            // Canlı Chat Mesajı
            if (packet.event === 'App\\Events\\ChatMessageEvent') {
              const chatData = typeof packet.data === 'string' ? JSON.parse(packet.data) : packet.data;
              const sender = chatData.sender?.username || 'Kickİzleyici';
              const content = chatData.content || '';
              const isSub = (chatData.sender?.badges || []).some(b => b.type === 'subscriber');
              const isMod = (chatData.sender?.badges || []).some(b => b.type === 'moderator');
              const badge = isMod ? 'mod' : (isSub ? 'sub' : 'kick');
              if (onMessage) onMessage(sender, content, badge);
            }
            // Canlı Yeni Takipçi Olayı (Pusher üzerinden anlık tetiklenir)
            else if (packet.event === 'App\\Events\\FollowersUpdated') {
              const evData = typeof packet.data === 'string' ? JSON.parse(packet.data) : packet.data;
              const newFollowerName = evData.follower?.username || 'Yeni Takipçi';
              const updatedCount = evData.followersCount || evData.followers_count;

              triggerAlertBanner('follower', { username: newFollowerName });
              updateRecentStat('follower', newFollowerName);
              localStorage.setItem('recent_follower', newFollowerName);

              if (typeof updatedCount === 'number') {
                currentGoal.current = updatedCount;
              } else {
                currentGoal.current += 1;
              }
              localStorage.setItem('stream_goal_current', currentGoal.current);
              updateGoalDisplay(currentGoal);
            }
            // Canlı Yeni Abone Olayı
            else if (packet.event === 'App\\Events\\SubscriptionEvent') {
              const evData = typeof packet.data === 'string' ? JSON.parse(packet.data) : packet.data;
              const subUser = evData.username || 'Yeni Abone';
              triggerAlertBanner('sub', { username: subUser });
              updateRecentStat('sub', subUser);
              localStorage.setItem('recent_sub', subUser);
            }
            // Canlı Hediye Abone Olayı
            else if (packet.event === 'App\\Events\\GiftedSubscriptionsEvent') {
              const evData = typeof packet.data === 'string' ? JSON.parse(packet.data) : packet.data;
              const gifter = evData.gifter_username || 'Destekçi';
              const giftCount = evData.gifted_usernames?.length || 1;
              triggerAlertBanner('sub', { username: gifter, months: `${giftCount} Hediye Abone` });
              updateRecentStat('sub', `${gifter} (${giftCount} Hediye)`);
            }
          } catch (e) {}
        };

        ws.onclose = () => {
          setTimeout(() => initKickPusher(channelSlug, onMessage), 10000);
        };
      })
      .catch(() => {});

    // Periyodik Kick Canlı Takipçi Güncellemesi (Her 45 saniyede bir)
    setInterval(() => {
      fetch(`/api/kick/channel?slug=${encodeURIComponent(channelSlug)}`)
        .then(r => r.json())
        .then(kData => {
          const count = kData?.followers_count ?? kData?.followersCount;
          if (typeof count === 'number') {
            currentGoal.current = count;
            localStorage.setItem('stream_goal_current', count);
            updateGoalDisplay(currentGoal);
          }
        })
        .catch(() => {});
    }, 45000);
  }

  // =============================================================
  // 7. CANLI MÜZİK SENKRONİZASYONU (Spotify / Snip / Tuna / API)
  // =============================================================
  function initRealTimeMusicSync() {
    const trackEl = document.querySelector('.audio-track-title');
    if (!trackEl) return;

    function updateTitle(title) {
      if (trackEl && title && trackEl.textContent !== title) {
        trackEl.style.opacity = '0.3';
        trackEl.style.transition = 'opacity 0.2s';
        setTimeout(() => {
          trackEl.textContent = title.startsWith('♪') ? title : `♪ ${title}`;
          trackEl.style.opacity = '1';
        }, 200);
      }
    }

    function fetchNowPlaying() {
      fetch('/api/now-playing')
        .then(res => res.json())
        .then(data => {
          if (data && data.title) updateTitle(data.title);
        })
        .catch(() => {});
    }
    fetchNowPlaying();
    setInterval(fetchNowPlaying, 2500);

    window.updateNowPlayingTitle = updateTitle;
  }

  // =============================================================
  // 8. HABERLEŞME KANALLARI (BroadcastChannel + postMessage)
  // =============================================================
  function initEventBus() {
    function handleIncomingEvent(eventObj) {
      if (!eventObj || typeof eventObj !== 'object') return;

      if (eventObj.type === 'TEST_ALERT' || eventObj.type === 'LIVE_ALERT') {
        triggerAlertBanner(eventObj.alertType, eventObj.payload || {});
      } else if (eventObj.type === 'UPDATE_GOAL' && eventObj.goal) {
        updateGoalDisplay(eventObj.goal);
      } else if (eventObj.type === 'UPDATE_SONG' && eventObj.title) {
        if (window.updateNowPlayingTitle) window.updateNowPlayingTitle(eventObj.title);
      } else if (eventObj.type === 'SET_CHAT_WIDGET') {
        if (eventObj.url) {
          localStorage.setItem('stream_chat_widget_url', eventObj.url);
        } else {
          localStorage.removeItem('stream_chat_widget_url');
        }
        window.location.reload();
      } else if (eventObj.type === 'TEST_CHAT' || eventObj.type === 'CHAT_MESSAGE' || eventObj.type === 'chat') {
        if (window.addCustomChatMessage) {
          const user = eventObj.username || eventObj.user || eventObj.sender?.username || 'İzleyici';
          const msg = eventObj.content || eventObj.text || eventObj.message || '';
          const badge = eventObj.badge || (eventObj.platform ? eventObj.platform.toLowerCase() : 'sub');
          window.addCustomChatMessage(user, msg, badge);
        }
      }
    }

    try {
      const bus1 = new BroadcastChannel('kick_hero_bus');
      bus1.onmessage = (e) => handleIncomingEvent(e.data);
    } catch (e) {}

    try {
      const bus2 = new BroadcastChannel('kick_stream_bus');
      bus2.onmessage = (e) => handleIncomingEvent(e.data);
    } catch (e) {}

    window.addEventListener('message', (e) => {
      if (e.data && typeof e.data === 'object') {
        handleIncomingEvent(e.data);
      }
    });

    // Sunucu Polling Entegrasyonu (OBS içinde tek başına çalışırken bile gerçek olayları yakalar)
    let lastPollTime = Date.now() - 5000;
    setInterval(() => {
      fetch(`/api/poll?since=${lastPollTime}`)
        .then(r => r.json())
        .then(data => {
          if (data && data.events && data.events.length > 0) {
            data.events.forEach(ev => {
              if (ev.time > lastPollTime) lastPollTime = ev.time;
              handleIncomingEvent(ev);
            });
          }
        })
        .catch(() => {});
    }, 1000);
  }

  // =============================================================
  // 9. KLAVYE KISAYOLLARI & OBS KILAVUZ MODU
  // =============================================================
  function initKeyboardControls() {
    let guideVisible = true;

    function toggleGuides() {
      guideVisible = !guideVisible;
      const gameGuide = document.querySelector('.game-setup-guide');
      const camGuide = document.querySelector('.webcam-guide-box');
      if (gameGuide) gameGuide.classList.toggle('guide-hidden', !guideVisible);
      if (camGuide) camGuide.classList.toggle('guide-hidden', !guideVisible);
    }

    window.addEventListener('keydown', (e) => {
      // H Tuşu: OBS / TikTok Kılavuzunu aç/kapa
      if (e.key === 'h' || e.key === 'H') {
        toggleGuides();
      }
      // 1-5 Tuşları: Hızlı Hero Geçişi
      const heroMap = { '1': 'vexana', '2': 'zetian', '3': 'nana', '4': 'carmilla', '5': 'atlas' };
      if (heroMap[e.key] && heroMap[e.key] !== heroName) {
        window.location.href = `../${heroMap[e.key]}/in-game.html`;
      }
    });

    const hintBtn = document.getElementById('guide-hint-toggle');
    if (hintBtn) {
      hintBtn.addEventListener('click', toggleGuides);
    }
  }

  // =============================================================
  // BAŞLATMA DÖNGÜSÜ
  // =============================================================
  document.addEventListener('DOMContentLoaded', () => {
    initHeroParticles();
    initAudioVisualizer();
    initStreamTimers();
    initLiveChatSystem();
    initRealTimeMusicSync();
    initEventBus();
    initKeyboardControls();
    updateGoalDisplay(currentGoal);

    const savedFollower = localStorage.getItem('recent_follower');
    updateRecentStat('follower', savedFollower || '-');

    const savedSub = localStorage.getItem('recent_sub');
    updateRecentStat('sub', savedSub || '-');

    const savedDonation = localStorage.getItem('recent_donation');
    updateRecentStat('donation', savedDonation || '-');
  });
})();
