/**
 * Dinamik Durum ve Hafıza Yönetimi (State Manager)
 * Kick API Canlı Takip, LocalStorage Kalıcılığı ve Canlı OBS Senkronizasyonu
 */

class StateManager {
  constructor(config = {}) {
    this.config = config;
    this.storageKey = 'kick_overlay_state_v1';
    this.bus = new BroadcastChannel('kick_stream_bus');
    this.state = this.loadState();

    this.initBusListener();
  }

  // Varsayılan ve Kayıtlı Durumu Yükle
  loadState() {
    const saved = localStorage.getItem(this.storageKey);
    let state = null;
    if (saved) {
      try {
        state = JSON.parse(saved);
      } catch (e) {
        state = null;
      }
    }

    if (!state) {
      state = {
        goal: {
          title: this.config.goal?.title || "TAKİPÇİ HEDEFİ",
          current: this.config.goal?.current || 0,
          target: this.config.goal?.target || 100,
          unit: this.config.goal?.unit || ""
        },
        recentEvents: {
          follower: this.config.recentEvents?.follower?.name || "Henüz Yok",
          sub: this.config.recentEvents?.sub?.name || "Henüz Yok",
          donation: this.config.recentEvents?.donation?.name || "Henüz Yok"
        },
        lastSync: Date.now()
      };
      this.saveState(state);
    }
    return state;
  }

  saveState(newState) {
    this.state = { ...this.state, ...newState, lastSync: Date.now() };
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.state));
    } catch (e) {
      console.warn("LocalStorage kaydedilemedi:", e);
    }
  }

  // Kick API'den Gerçek Canlı Takipçi Sayısını Çek
  async fetchLiveKickStats(channelSlug) {
    const slug = channelSlug || this.config.kickChannel || 'cihanatas';
    if (!slug) return null;

    try {
      let data = null;
      try {
        const proxyRes = await fetch(`/api/kick/channel?slug=${encodeURIComponent(slug)}`);
        if (proxyRes.ok) data = await proxyRes.json();
      } catch (e) {}

      if (!data || data.followers_count === undefined) {
        const res = await fetch(`https://kick.com/api/v2/channels/${encodeURIComponent(slug)}`);
        if (res.ok) data = await res.json();
      }
      if (!data) throw new Error("Kick kanalı yanıt vermedi");
      
      const followersCount = data.followers_count ?? data.followersCount;
      if (typeof followersCount === 'number') {
        console.log(`Kick Canlı Takipçi Sayısı Alındı: ${followersCount}`);
        this.updateGoalCurrent(followersCount);
        return {
          followersCount,
          chatroomId: data.chatroom?.id,
          channelId: data.id
        };
      }
    } catch (err) {
      console.log("Kick API çekilemedi:", err.message);
    }
    return null;
  }

  // Hedef Değerini Güncelle ve OBS'e Canlı Yayınla
  updateGoal(title, current, target) {
    this.state.goal.title = title || this.state.goal.title;
    this.state.goal.current = parseInt(current, 10);
    this.state.goal.target = parseInt(target, 10);
    this.saveState(this.state);

    this.bus.postMessage({
      type: 'STATE_GOAL_UPDATED',
      goal: this.state.goal
    });
  }

  updateGoalCurrent(newCurrent) {
    this.state.goal.current = parseInt(newCurrent, 10);
    this.saveState(this.state);

    this.bus.postMessage({
      type: 'STATE_GOAL_UPDATED',
      goal: this.state.goal
    });
  }

  incrementGoal(amount = 1) {
    this.state.goal.current += amount;
    this.saveState(this.state);

    this.bus.postMessage({
      type: 'STATE_GOAL_UPDATED',
      goal: this.state.goal
    });
  }

  // Son Olayları Güncelle (Follower, Sub, Donation)
  updateEvent(type, name) {
    if (!name) return;
    if (type === 'follower') {
      this.state.recentEvents.follower = name;
      this.incrementGoal(1); // Takipçi geldiğinde hedef otomatik +1 artar!
    } else if (type === 'sub') {
      this.state.recentEvents.sub = name;
    } else if (type === 'donation') {
      this.state.recentEvents.donation = name;
    }
    this.saveState(this.state);

    this.bus.postMessage({
      type: 'STATE_EVENT_UPDATED',
      recentEvents: this.state.recentEvents
    });
  }

  // Yayın Veri Yolunu Dinle (Diğer sekmelerle anında eşitle)
  initBusListener() {
    this.bus.onmessage = (e) => {
      const data = e.data;
      if (!data) return;

      if (data.type === 'STATE_GOAL_UPDATED' && data.goal) {
        this.state.goal = data.goal;
        if (typeof this.onGoalChange === 'function') {
          this.onGoalChange(this.state.goal);
        }
      } else if (data.type === 'STATE_EVENT_UPDATED' && data.recentEvents) {
        this.state.recentEvents = data.recentEvents;
        if (typeof this.onEventChange === 'function') {
          this.onEventChange(this.state.recentEvents);
        }
      }
    };
  }
}

window.StateManager = StateManager;
