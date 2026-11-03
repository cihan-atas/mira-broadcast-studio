/**
 * MLBB Heroes - Özel Ses Efektleri, Hero TTS ve Canlı Alert Motoru
 */

class HeroSoundFX {
  constructor(heroName = 'vexana') {
    this.heroName = heroName.toLowerCase();
    this.ctx = null;
    this.initAudioContext();
  }

  initAudioContext() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      this.ctx = new AudioContextClass();
    }
  }

  ensureContext() {
    if (!this.ctx) this.initAudioContext();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setHero(heroName) {
    this.heroName = heroName.toLowerCase();
  }

  // 1. Yeni Takipçi Sesi (Hero'ya özel melodi)
  playFollowerSound() {
    this.ensureContext();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    switch (this.heroName) {
      case 'vexana':
        // Spectral Ghost Chime (Amethyst efsun arpej)
        [329.63, 392.00, 493.88, 659.25, 987.77].forEach((f, i) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, now + i * 0.08);
          gain.gain.setValueAtTime(0, now + i * 0.08);
          gain.gain.linearRampToValueAtTime(0.25, now + i * 0.08 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.45);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now + i * 0.08);
          osc.stop(now + i * 0.08 + 0.5);
        });
        break;

      case 'zetian':
        // Imperial Celestial Gong & Bell (Guzheng pentatonic)
        [440.00, 554.37, 659.25, 830.61, 1108.73].forEach((f, i) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(f, now + i * 0.07);
          gain.gain.setValueAtTime(0, now + i * 0.07);
          gain.gain.linearRampToValueAtTime(0.3, now + i * 0.07 + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.5);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now + i * 0.07);
          osc.stop(now + i * 0.07 + 0.55);
        });
        break;

      case 'nana':
        // Kawaii Sweet Pop Sparkle (Toy Chime)
        [659.25, 830.61, 987.77, 1318.51, 1661.22].forEach((f, i) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, now + i * 0.06);
          gain.gain.setValueAtTime(0, now + i * 0.06);
          gain.gain.linearRampToValueAtTime(0.28, now + i * 0.06 + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.35);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now + i * 0.06);
          osc.stop(now + i * 0.06 + 0.38);
        });
        break;

      case 'carmilla':
        // Gothic Cathedral Chime & Blood Resonance
        [220.00, 261.63, 329.63, 440.00, 523.25].forEach((f, i) => {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(f, now + i * 0.09);
          gain.gain.setValueAtTime(0, now + i * 0.09);
          gain.gain.linearRampToValueAtTime(0.18, now + i * 0.09 + 0.03);
          gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.09 + 0.6);
          osc.connect(gain);
          gain.connect(this.ctx.destination);
          osc.start(now + i * 0.09);
          osc.stop(now + i * 0.09 + 0.65);
        });
        break;

      case 'atlas':
        // Oceanic Sonar Ping & Hydropressure Wave
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.5);
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.35, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + 0.65);
        break;
    }
  }

  // 2. Yeni Abone Sesi (Görkemli Hero Fanfare)
  playSubscriberSound() {
    this.ensureContext();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const chords = [
      { f: 440.00, t: 0 },
      { f: 554.37, t: 0.12 },
      { f: 659.25, t: 0.24 },
      { f: 880.00, t: 0.36 },
      { f: 1108.73, t: 0.48 }
    ];

    chords.forEach(c => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(c.f, now + c.t);
      gain.gain.setValueAtTime(0, now + c.t);
      gain.gain.linearRampToValueAtTime(0.3, now + c.t + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + c.t + 0.65);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + c.t);
      osc.stop(now + c.t + 0.7);
    });
  }

  // 3. Bağış / Destek Sesi
  playDonationSound() {
    this.ensureContext();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    [987.77, 1318.51, 1567.98, 1975.53].forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + i * 0.08);
      gain.gain.setValueAtTime(0, now + i * 0.08);
      gain.gain.linearRampToValueAtTime(0.28, now + i * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.5);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.55);
    });
  }
}

class HeroTTSManager {
  constructor(options = {}) {
    this.enabled = options.ttsEnabled !== undefined ? options.ttsEnabled : true;
    this.ttsAlertsEnabled = options.ttsAlertsEnabled !== undefined ? options.ttsAlertsEnabled : true;
    this.ttsChatEnabled = options.ttsChatEnabled !== undefined ? options.ttsChatEnabled : true;
    this.outputMode = options.outputMode || 'all';
    this.heroName = (options.heroName || 'vexana').toLowerCase();
    this.volume = options.volume !== undefined ? options.volume : 1.0;
    this.autoDucking = options.autoDucking !== undefined ? options.autoDucking : true;
    this.obsMusicSource = options.obsMusicSource || (typeof localStorage !== 'undefined' ? localStorage.getItem('mira_obs_music_source') : null) || 'Desktop Audio';
    this.rate = options.rate !== undefined ? options.rate : 1.0;
    this.pitch = options.pitch !== undefined ? options.pitch : 1.0;
    this.voiceName = options.voiceName || 'mira_natural_tr';
    this.voiceLang = options.voiceLang || 'tr';
    this.readStreamerSelf = options.readStreamerSelf || false;
    this.filterBotCommands = options.filterBotCommands !== false;
    this.filterUrls = options.filterUrls !== false;
    this.maxChatLength = options.maxChatLength || 100;
    this.chatFormat = options.chatFormat || '{user}: {message}';
    this.alertTemplates = options.alertTemplates || {
      follower: '{user} aramıza katıldı, hoş geldin!',
      sub: 'Teşekkürler {user}, {months}. ayında abone oldu!',
      donation: '{user}, {amount} destek gönderdi: {message}',
      gift: '{user}, {gift} hediyesi gönderdi!'
    };

    this.selectedVoice = null;
    this.queue = [];
    this.isPlaying = false;
    this.currentAudio = null;
    this.initVoices();
  }

  initVoices() {
    if (!('speechSynthesis' in window)) return;
    const setVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      if (!voices || voices.length === 0) return;

      if (this.voiceName && this.voiceName !== 'mira_natural_tr') {
        const found = voices.find(v => v.name === this.voiceName);
        if (found) {
          this.selectedVoice = found;
          return;
        }
      }

      const trVoices = voices.filter(v => v.lang.includes('tr') || v.lang.includes('TR'));
      const femaleTr = trVoices.find(v => {
        const name = (v.name || '').toLowerCase();
        return name.includes('filiz') || name.includes('yelda') || name.includes('seda') || name.includes('female');
      });
      this.selectedVoice = femaleTr || trVoices[0] || voices[0];
    };
    setVoice();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = setVoice;
    }
  }

  setVoiceByName(name) {
    this.voiceName = name;
    if (name === 'mira_natural_tr') return;
    if (!('speechSynthesis' in window)) return;
    const voices = window.speechSynthesis.getVoices();
    const found = voices.find(v => v.name === name);
    if (found) this.selectedVoice = found;
  }

  applyConfig(cfg = {}) {
    if (cfg.ttsAlertsEnabled !== undefined) this.ttsAlertsEnabled = !!cfg.ttsAlertsEnabled;
    if (cfg.ttsChatEnabled !== undefined) this.ttsChatEnabled = !!cfg.ttsChatEnabled;
    if (cfg.outputMode !== undefined) this.outputMode = cfg.outputMode;
    if (cfg.volume !== undefined) this.volume = parseFloat(cfg.volume);
    if (cfg.autoDucking !== undefined) this.autoDucking = !!cfg.autoDucking;
    if (cfg.obsMusicSource !== undefined) this.obsMusicSource = cfg.obsMusicSource;
    if (cfg.rate !== undefined) this.rate = parseFloat(cfg.rate);
    if (cfg.pitch !== undefined) this.pitch = parseFloat(cfg.pitch);
    if (cfg.voiceName !== undefined) this.setVoiceByName(cfg.voiceName);
    if (cfg.chatFormat !== undefined) this.chatFormat = cfg.chatFormat;
    if (cfg.readStreamerSelf !== undefined) this.readStreamerSelf = !!cfg.readStreamerSelf;
    if (cfg.filterBotCommands !== undefined) this.filterBotCommands = !!cfg.filterBotCommands;
    if (cfg.filterUrls !== undefined) this.filterUrls = !!cfg.filterUrls;
    if (cfg.maxChatLength !== undefined) this.maxChatLength = parseInt(cfg.maxChatLength, 10);
    if (cfg.alertTemplates) this.alertTemplates = { ...this.alertTemplates, ...cfg.alertTemplates };
  }

  sanitizeText(text) {
    if (!text) return null;
    let clean = String(text).trim();
    if (this.filterBotCommands && /^[!\/\.\?]/.test(clean)) return null;
    if (this.filterUrls) {
      clean = clean.replace(/https?:\/\/\S+/gi, '').trim();
    }
    if (!clean) return null;
    clean = clean.replace(/(.)\1{3,}/gi, '$1$1');
    if (this.maxChatLength && clean.length > this.maxChatLength) {
      clean = clean.substring(0, this.maxChatLength) + '...';
    }
    return clean.trim();
  }

  // ========================================================
  // TEKİL SES KİLİDİ (MUTEX) — ÇOKLU OKUMAYI (2-4 DEFA) KESİNLİKLE ENGELLER
  // ========================================================
  acquireAudioLock(text, durationSec = 4.0) {
    if (typeof window === 'undefined') return true;
    if (window.self !== window.top) return false; // İframe içinde (ör: önizleme iframe'i) KESİNLİKLE ses çalma!

    // Mesaj içeriğini temizle (varsa kullanıcı adı veya ön eki atlayarak gövdeyi eşleştir)
    let core = String(text || '').trim().toLowerCase();
    const colonIdx = core.indexOf(':');
    if (colonIdx > 0 && colonIdx < 35) {
      core = core.substring(colonIdx + 1).trim();
    }
    const norm = core.replace(/[^a-z0-9ğüşıöç]/gi, '').substring(0, 70);
    if (!norm) return true;

    const lockKey = 'mira_tts_audio_lock';
    const now = Date.now();
    try {
      const raw = localStorage.getItem(lockKey);
      if (raw) {
        const data = JSON.parse(raw);
        // Aynı metin son 4 saniye içinde çalındıysa ikinci kez çalma
        if (data.norm === norm && (now - data.time) < (durationSec * 1000)) {
          return false;
        }
        // Son 1.2 saniye içinde benzer başlayan bir ses zaten başladıysa pas geç
        if ((now - data.time) < 1200 && data.norm && norm && (data.norm.startsWith(norm.substring(0, 15)) || norm.startsWith(data.norm.substring(0, 15)))) {
          return false;
        }
      }
      localStorage.setItem(lockKey, JSON.stringify({ norm: norm, time: now, win: Math.random().toString(36).substr(2, 6) }));
      return true;
    } catch (e) {
      return true;
    }
  }

  triggerDucking(enable) {
    if (!this.autoDucking) return;
    try {
      if (typeof fetch === 'function' && window.location && window.location.protocol && window.location.protocol.startsWith('http')) {
        const source = this.obsMusicSource || (typeof localStorage !== 'undefined' ? localStorage.getItem('mira_obs_music_source') : null) || 'Desktop Audio';
        fetch('/api/obs/ducking', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ duck: enable, inputName: source })
        }).catch(() => {});
      }
    } catch(e) {}
  }

  getAudioPlayer() {
    if (this.audioEl) return this.audioEl;
    let el = document.getElementById('mira-tts-audio-node');
    if (!el) {
      el = document.createElement('audio');
      el.id = 'mira-tts-audio-node';
      el.style.display = 'none';
      if (document.body) document.body.appendChild(el);
    }
    this.audioEl = el;

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx && !this.mediaSourceConnected) {
        this.audioCtx = new AudioCtx();
        const source = this.audioCtx.createMediaElementSource(el);
        this.gainNode = this.audioCtx.createGain();
        source.connect(this.gainNode);
        this.gainNode.connect(this.audioCtx.destination);
        this.mediaSourceConnected = true;
      }
    } catch(e) {}
    return this.audioEl;
  }

  speak(text) {
    if (!this.enabled) return;
    if (window.self !== window.top) return; // İframe içinde (ör: önizleme kutusu) ASLA ses çıkarma!

    // Ses çıkış hedefi kontrolü (MİRA vs OBS):
    const isStudioWindow = (window.location.pathname === '/' || window.location.pathname.endsWith('index.html'));
    if (this.outputMode === 'overlay' && isStudioWindow) return; // Yalnızca OBS modu ise Stüdyo sessiz kalır
    if (this.outputMode === 'studio' && !isStudioWindow) return;  // Yalnızca Stüdyo modu ise OBS sessiz kalır

    if (!text || !text.trim()) return;

    const cleanText = text.trim();
    if (!this.acquireAudioLock(cleanText)) {
      // Bu ses zaten başka bir pencere veya OBS sahnesi tarafından tek sefer oynatılıyor!
      return;
    }

    this.queue.push(cleanText);
    this.processQueue();
  }

  speakAlert(alertType, data = {}) {
    if (!this.ttsAlertsEnabled) return;
    const tpls = this.alertTemplates || {};
    let tpl = tpls[alertType];
    if (!tpl) {
      if (alertType === 'follower') tpl = '{user} aramıza katıldı, hoş geldin!';
      else if (alertType === 'sub') tpl = 'Teşekkürler {user}, {months}. ayında abone oldu!';
      else if (alertType === 'gift' || alertType === 'subgift') tpl = '{user}, topluluğa {gift} hediye abonelik dağıttı!';
      else if (alertType === 'donation' || alertType === 'kicks') tpl = '{user}, {amount} destek gönderdi: {message}';
      else if (alertType === 'raid') tpl = '{user}, {count} izleyiciyle baskın yaptı!';
      else tpl = '{user} bildirim gönderdi!';
    }

    const user = data.username || data.user || 'İzleyici';
    const amount = data.amount || '500 Kicks';
    const months = data.months || 1;
    const gift = data.giftName || data.gift || '5x Hediye Abonelik';
    const count = data.count || data.viewers || '35';
    const message = data.message || '';

    let text = tpl
      .replace(/\{user\}/g, user)
      .replace(/\{amount\}/g, amount)
      .replace(/\{months\}/g, months)
      .replace(/\{gift\}/g, gift)
      .replace(/\{count\}/g, count)
      .replace(/\{message\}/g, message);

    this.speak(text);
  }

  speakChat(username, message, isStreamer = false) {
    if (!this.ttsChatEnabled) return;
    if (isStreamer && !this.readStreamerSelf) return;

    const clean = this.sanitizeText(message);
    if (!clean) return;

    const tpl = this.chatFormat || '{user}: {message}';
    const text = tpl.replace(/\{user\}/g, username || 'İzleyici').replace(/\{message\}/g, clean);
    this.speak(text);
  }

  stop() {
    this.queue = [];
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      } catch(e){}
      this.currentAudio = null;
    }
    if ('speechSynthesis' in window) {
      try { window.speechSynthesis.cancel(); } catch(e){}
    }
    this.triggerDucking(false);
    this.isPlaying = false;
  }

  processQueue() {
    if (this.isPlaying || this.queue.length === 0) return;
    this.isPlaying = true;

    const rawText = this.queue.shift();

    // Sistemde ses varsa ve kullanıcı browser_speech seçtiyse SpeechSynthesis kullan
    const hasBrowserVoices = ('speechSynthesis' in window) && window.speechSynthesis.getVoices().length > 0;
    if (this.voiceName && this.voiceName !== 'mira_natural_tr' && hasBrowserVoices) {
      this.playSpeechSynthesis(rawText);
    } else {
      // Varsayılan ve en güvenilir yöntem: MİRA Doğal Ses Akışı (OBS ve Linux'ta %100 çalışır)
      this.playAudioStream(rawText);
    }
  }

  playAudioStream(text) {
    try {
      const p = typeof this.pitch === 'number' ? this.pitch : 1.0;
      const r = typeof this.rate === 'number' ? this.rate : 1.0;
      const audioUrl = `/api/tts/audio?text=${encodeURIComponent(text)}&lang=${encodeURIComponent(this.voiceLang || 'tr')}&pitch=${encodeURIComponent(p)}&rate=${encodeURIComponent(r)}`;
      const audio = this.getAudioPlayer();
      this.currentAudio = audio;

      // Web Audio GainNode ile standart %100 sınırını aşıp %250 ses yükseltme (Booster) desteği:
      const targetVol = typeof this.volume === 'number' ? Math.max(0, this.volume) : 1.0;
      if (this.gainNode) {
        if (this.audioCtx && this.audioCtx.state === 'suspended') {
          this.audioCtx.resume().catch(() => {});
        }
        this.gainNode.gain.value = targetVol;
        audio.volume = 1.0;
      } else {
        audio.volume = Math.max(0, Math.min(1.0, targetVol));
      }

      audio.src = audioUrl;

      // TTS başladığında müziği otomatik kıs (Ducking)
      this.triggerDucking(true);

      const finish = () => {
        this.isPlaying = false;
        this.currentAudio = null;
        if (this.queue.length === 0) {
          this.triggerDucking(false);
        }
        setTimeout(() => this.processQueue(), 250);
      };

      audio.onended = finish;
      audio.onerror = (e) => {
        console.warn('TTS Audio akış hatası, SpeechSynthesis deneniyor:', e);
        this.playSpeechSynthesis(text);
      };

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          console.warn('Ses oynatma engellendi, SpeechSynthesis deneniyor:', err);
          this.playSpeechSynthesis(text);
        });
      }
    } catch(err) {
      this.playSpeechSynthesis(text);
    }
  }

  playSpeechSynthesis(text) {
    if (!('speechSynthesis' in window)) {
      this.isPlaying = false;
      this.triggerDucking(false);
      setTimeout(() => this.processQueue(), 200);
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      if (this.selectedVoice) utterance.voice = this.selectedVoice;
      utterance.volume = typeof this.volume === 'number' ? Math.min(1.0, this.volume) : 1.0;
      utterance.rate = typeof this.rate === 'number' ? this.rate : 1.0;
      utterance.pitch = typeof this.pitch === 'number' ? this.pitch : 1.0;

      this.triggerDucking(true);

      const finishSynthesis = () => {
        this.isPlaying = false;
        if (this.queue.length === 0) {
          this.triggerDucking(false);
        }
        setTimeout(() => this.processQueue(), 250);
      };

      utterance.onend = finishSynthesis;
      utterance.onerror = finishSynthesis;

      window.speechSynthesis.speak(utterance);
    } catch(e) {
      this.isPlaying = false;
      this.triggerDucking(false);
      setTimeout(() => this.processQueue(), 200);
    }
  }
}

class HeroAlertEngine {
  constructor(heroName, soundFX, ttsManager) {
    this.heroName = heroName.toLowerCase();
    this.sfx = soundFX;
    this.tts = ttsManager;
    this.queue = [];
    this.isDisplaying = false;
    this.alertBox = null;
    this.createDom();
  }

  createDom() {
    let container = document.getElementById('hero-alert-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'hero-alert-container';
      container.className = 'hero-alert-container';
      document.body.appendChild(container);
    }
    this.alertBox = container;
  }

  trigger(type, data) {
    this.queue.push({ type, data });
    this.process();
  }

  process() {
    if (this.isDisplaying || this.queue.length === 0) return;
    this.isDisplaying = true;

    const { type, data } = this.queue.shift();
    this.renderAlert(type, data);
  }

  renderAlert(type, data) {
    let headerTag = "YENİ BİLDİRİM";
    let mainTitle = "";
    let subTitle = "";
    let voiceText = "";

    const user = data.username || "Değerli İzleyici";

    switch (type) {
      case 'follower':
        headerTag = "YENİ TAKİPÇİ";
        mainTitle = user;
        subTitle = "Şafak Vadisi'ne Katıldı!";
        voiceText = `Yeni takipçi: ${user} aramıza katıldı!`;
        this.sfx.playFollowerSound();
        break;

      case 'sub':
        headerTag = "YENİ ABONE";
        mainTitle = user;
        subTitle = `${data.months || 1}. Ay Aboneliği Kutlu Olsun!`;
        voiceText = `Teşekkürler ${user}, ${data.months || 1}. ay abone oldu!`;
        this.sfx.playSubscriberSound();
        break;

      case 'donation':
        headerTag = "BAĞIŞ & DESTEK";
        mainTitle = `${user} - ${data.amount || '100₺'}`;
        subTitle = data.message || "Yayıncıya destek gönderdi!";
        voiceText = `${user}, ${data.amount || '100 lira'} destek gönderdi. ${data.message || ''}`;
        this.sfx.playDonationSound();
        break;
    }

    if (this.tts && voiceText) {
      this.tts.speak(voiceText);
    }

    const card = document.createElement('div');
    card.className = `hero-alert-card hero-alert-${type}`;
    card.innerHTML = `
      <div class="hero-alert-icon-ring">
        <img src="assets/images/avatar.jpg" alt="${this.heroName}">
      </div>
      <div class="hero-alert-content">
        <span class="hero-alert-header-tag">${headerTag}</span>
        <span class="hero-alert-main-title">${mainTitle}</span>
        <span class="hero-alert-sub-title">${subTitle}</span>
        ${data.message && type === 'donation' ? `<div class="hero-alert-message">"${data.message}"</div>` : ''}
      </div>
    `;

    this.alertBox.appendChild(card);

    setTimeout(() => {
      card.classList.add('alert-hide');
      setTimeout(() => {
        if (card.parentNode) card.parentNode.removeChild(card);
        this.isDisplaying = false;
        this.process();
      }, 450);
    }, 4500);
  }
}

window.HeroSoundFX = HeroSoundFX;
window.HeroTTSManager = HeroTTSManager;
window.HeroAlertEngine = HeroAlertEngine;
