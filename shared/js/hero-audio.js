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
    this.heroName = (options.heroName || 'vexana').toLowerCase();
    this.volume = options.volume || 1.0;
    this.rate = options.rate || 1.05;
    this.pitch = options.pitch || 1.1;

    this.selectedVoice = null;
    this.queue = [];
    this.isSpeaking = false;
    this.initVoices();
  }

  initVoices() {
    if (!('speechSynthesis' in window)) return;
    const setVoice = () => {
      const voices = window.speechSynthesis.getVoices();
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

  speak(text) {
    if (!this.enabled || !('speechSynthesis' in window)) return;
    if (!text || text.trim().length === 0) return;

    this.queue.push(text.trim());
    this.processQueue();
  }

  processQueue() {
    if (this.isSpeaking || this.queue.length === 0) return;
    this.isSpeaking = true;

    const rawText = this.queue.shift();
    const utterance = new SpeechSynthesisUtterance(rawText);
    if (this.selectedVoice) utterance.voice = this.selectedVoice;
    utterance.volume = this.volume;
    utterance.rate = this.rate;
    utterance.pitch = this.pitch;

    utterance.onend = () => {
      this.isSpeaking = false;
      setTimeout(() => this.processQueue(), 250);
    };
    utterance.onerror = () => {
      this.isSpeaking = false;
      this.processQueue();
    };

    window.speechSynthesis.speak(utterance);
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
