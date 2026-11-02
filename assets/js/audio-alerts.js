/**
 * Profesyonel Espor Ses Efektleri, Alert Motoru ve TTS (Text-to-Speech) Sesli Okuma
 */

class SoundFX {
  constructor() {
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

  // Yeni Takipçi Sesi (Sevimli Peri / Sakura Arpeggio Chime)
  playFollowerSound() {
    this.ensureContext();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    // Pentatonik peri ışıltısı: E5, G#5, B5, E6, G#6
    const notes = [659.25, 830.61, 987.77, 1318.51, 1661.22];
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.07);

      gain.gain.setValueAtTime(0, now + i * 0.07);
      gain.gain.linearRampToValueAtTime(0.22, now + i * 0.07 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.38);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + i * 0.07);
      osc.stop(now + i * 0.07 + 0.42);
    });
  }

  // Yeni Abone Sesi (Görkemli Espor Fanfare / Level-Up)
  playSubscriberSound() {
    this.ensureContext();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    const chords = [
      { f: 587.33, t: 0 },    // D5
      { f: 739.99, t: 0.12 }, // F#5
      { f: 880.00, t: 0.24 }, // A5
      { f: 1174.66, t: 0.36 } // D6
    ];

    chords.forEach(c => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(c.f, now + c.t);

      gain.gain.setValueAtTime(0, now + c.t);
      gain.gain.linearRampToValueAtTime(0.3, now + c.t + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + c.t + 0.6);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + c.t);
      osc.stop(now + c.t + 0.65);
    });
  }

  // Bağış / Tip Sesi (Zengin Coin / Cash Chime)
  playDonationSound() {
    this.ensureContext();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;

    [987.77, 1318.51, 1567.98].forEach((f, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(f, now + i * 0.09);

      gain.gain.setValueAtTime(0, now + i * 0.09);
      gain.gain.linearRampToValueAtTime(0.28, now + i * 0.09 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.09 + 0.5);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + i * 0.09);
      osc.stop(now + i * 0.09 + 0.55);
    });
  }
}

// -------------------------------------------------------------
// TEXT-TO-SPEECH (TTS) MOTORU (Web Speech API)
// -------------------------------------------------------------
class TTSManager {
  constructor(config = {}) {
    this.enabled = config.ttsEnabled !== false;
    this.volume = config.ttsVolume || 1.0;
    this.rate = config.ttsRate || 1.05; // Akıcı Türkçe hızı
    this.pitch = config.ttsPitch || 1.0;
    this.readAllChat = config.ttsReadAllChat === true;
    this.readDonations = config.ttsReadDonations !== false;
    this.selectedVoice = null;

    this.queue = [];
    this.isSpeaking = false;

    this.initVoices();
  }

  initVoices() {
    if (!('speechSynthesis' in window)) {
      console.warn('Tarayıcınızda Text-To-Speech (SpeechSynthesis) desteklenmiyor.');
      return;
    }

    const setVoice = () => {
      const voices = window.speechSynthesis.getVoices();
      // Türkçe sesler arasından kadın sesi tercih et, yoksa ilk Türkçe sesi seç
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

  speak(text, options = {}) {
    if (!this.enabled || !('speechSynthesis' in window)) return;
    if (!text || text.trim().length === 0) return;

    // Filtreleme: Bot komutları (!, /, .), URL ve aşırı uzun spamları temizle
    const cleanText = this.sanitizeText(text);
    if (!cleanText) return;

    this.queue.push({ text: cleanText, ...options });
    this.processQueue();
  }

  sanitizeText(text) {
    if (text.startsWith('!') || text.startsWith('/') || text.startsWith('.')) return null;
    // URL'leri temizle
    text = text.replace(/https?:\/\/\S+/gi, '');
    // Tekrarlanan harfleri kısalt (örn: gooooolllll -> gool)
    text = text.replace(/(.)\1{3,}/gi, '$1$1');
    // Maksimum 120 karakter
    if (text.length > 120) {
      text = text.substring(0, 120) + '...';
    }
    return text.trim();
  }

  processQueue() {
    if (this.isSpeaking || this.queue.length === 0) return;

    this.isSpeaking = true;
    const item = this.queue.shift();

    const utterance = new SpeechSynthesisUtterance(item.text);
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

  stop() {
    this.queue = [];
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    this.isSpeaking = false;
  }
}

// -------------------------------------------------------------
// ALERT MOTORU (GÖRSEL POPUP + SES + PARÇACIKLAR)
// -------------------------------------------------------------
class AlertEngine {
  constructor(soundFX, ttsManager) {
    this.sfx = soundFX;
    this.tts = ttsManager;
    this.queue = [];
    this.isDisplaying = false;
    this.alertBox = null;
    this.createDom();
  }

  createDom() {
    let container = document.getElementById('esports-alert-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'esports-alert-container';
      container.className = 'esports-alert-container';
      document.body.appendChild(container);
    }
    this.alertBox = container;
  }

  trigger(type, data) {
    // type: 'follower', 'sub', 'donation'
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
    let title = "YENİ BİLDİRİM";
    let subtitle = "";
    let iconSvg = "";
    let voiceText = "";

    switch (type) {
      case 'follower':
        this.sfx.playFollowerSound();
        title = "YENİ TAKİPÇİ!";
        subtitle = `${data.username} Şafak Vadisi'ne Katıldı!`;
        iconSvg = `<svg viewBox="0 0 24 24" width="36" height="36" fill="#53fc18"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`;
        voiceText = `Yeni takipçi: ${data.username}!`;
        break;

      case 'sub':
        this.sfx.playSubscriberSound();
        title = "YENİ ABONELİK!";
        subtitle = `${data.username} ${data.months ? data.months + '. Ay' : '1. Ay'} Abone Oldu!`;
        iconSvg = `<svg viewBox="0 0 24 24" width="36" height="36" fill="#ffd000"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg>`;
        voiceText = `Teşekkürler ${data.username}, aramıza abone olarak katıldı!`;
        break;

      case 'donation':
        this.sfx.playDonationSound();
        title = "DESTEK GELDİ!";
        subtitle = `${data.username} ${data.amount} gönderdi!`;
        iconSvg = `<svg viewBox="0 0 24 24" width="36" height="36" fill="#00f0ff"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/></svg>`;
        voiceText = `${data.username} ${data.amount} destek gönderdi. ${data.message || ''}`;
        break;
    }

    const card = document.createElement('div');
    card.className = `alert-card alert-type-${type}`;
    card.innerHTML = `
      <div class="alert-glow"></div>
      <div class="alert-icon-ring">${iconSvg}</div>
      <div class="alert-content">
        <div class="alert-header-tag">KICK CANLI BİLDİRİM</div>
        <div class="alert-main-title">${title}</div>
        <div class="alert-sub-title">${subtitle}</div>
        ${data.message ? `<div class="alert-message">"${data.message}"</div>` : ''}
      </div>
    `;

    this.alertBox.appendChild(card);

    // TTS ile sesli oku
    if (this.tts && voiceText) {
      setTimeout(() => this.tts.speak(voiceText), 400);
    }

    // 4.5 saniye sonra kapat ve sıradakine geç
    setTimeout(() => {
      card.classList.add('alert-hide');
      setTimeout(() => {
        if (card.parentNode) card.parentNode.removeChild(card);
        this.isDisplaying = false;
        this.process();
      }, 500);
    }, 4500);
  }
}

window.SoundFX = SoundFX;
window.TTSManager = TTSManager;
window.AlertEngine = AlertEngine;
