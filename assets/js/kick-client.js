/**
 * Kick Canlı WebSocket Bağlantısı ve Stream Deck / Test Olay Dinleyicisi
 */

class KickClient {
  constructor(config = {}, onMessage = null, onAlert = null) {
    this.channelSlug = config.kickChannel || (typeof localStorage !== 'undefined' ? localStorage.getItem('mira_streamer_username') : null) || "";
    this.onMessage = onMessage;
    this.onAlert = onAlert;
    this.ws = null;
    this.chatroomId = null;
    this.isConnected = false;
    this.broadcast = new BroadcastChannel('kick_stream_bus');

    this.initBroadcastListener();
    if (this.channelSlug) {
      this.connectKick();
    }
  }

  // 1. Kontrol Panelinden (index.html) Gelen Test / Tetikleme Mesajlarını Dinle
  initBroadcastListener() {
    const handleBusMsg = (data) => {
      if (!data) return;
      if ((data.type === 'TEST_ALERT' || data.type === 'LIVE_ALERT') && this.onAlert) {
        this.onAlert(data.alertType, data.payload);
      } else if ((data.type === 'TEST_CHAT' || data.type === 'CHAT_MESSAGE' || data.type === 'chat') && this.onMessage) {
        this.onMessage({
          sender: { username: data.username || data.user || "KickFan" },
          content: data.content || data.text || data.message || ""
        });
      } else if (data.type === 'CONFIG_UPDATE') {
        window.location.reload();
      }
    };

    this.broadcast.onmessage = (event) => handleBusMsg(event.data);
    try {
      const heroBus = new BroadcastChannel('kick_hero_bus');
      heroBus.onmessage = (event) => handleBusMsg(event.data);
    } catch (e) {}
  }

  // 2. Kick Canlı Chat ve Olaylarına Bağlan (Pusher WebSocket)
  async connectKick() {
    try {
      let data = null;
      try {
        const proxyRes = await fetch(`/api/kick/channel?slug=${encodeURIComponent(this.channelSlug)}`);
        if (proxyRes.ok) data = await proxyRes.json();
      } catch (e) {}

      if (!data || !data.chatroom) {
        const res = await fetch(`https://kick.com/api/v2/channels/${encodeURIComponent(this.channelSlug)}`);
        if (res.ok) data = await res.json();
      }

      if (!data) throw new Error("Kick kanalı bulunamadı");
      
      this.chatroomId = data.chatroom?.id;
      const channelId = data.id;

      if (!this.chatroomId) {
        console.warn("Chatroom ID alınamadı");
        return;
      }

      console.log(`Kick Chatroom bulundu: ${this.chatroomId}`);
      this.startPusher(this.chatroomId, channelId);
    } catch (err) {
      console.log("Kick API doğrudan bağlantısı (CORS/RateLimit olabilir), test ve yayın modu aktif:", err.message);
    }
  }

  startPusher(chatroomId, channelId) {
    const pusherAppKey = "32cbd69e4b950ba97041"; // Kick genel Pusher anahtarı
    const wsUrl = `wss://ws-us2.pusher.com/app/${pusherAppKey}?protocol=7&client=js&version=8.4.0-rc2&flash=false`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.isConnected = true;
        console.log("Kick WebSocket bağlandı!");
        // Chat Odasına Abone Ol
        this.sendPusher('pusher:subscribe', {
          channel: `chatrooms.${chatroomId}.v2`
        });

        // Kanal Olaylarına Abone Ol (Takip, Sub vb.)
        if (channelId) {
          this.sendPusher('pusher:subscribe', {
            channel: `channel.${channelId}`
          });
        }
      };

      this.ws.onmessage = (msg) => {
        try {
          const packet = JSON.parse(msg.data);
          this.handlePacket(packet);
        } catch (e) {
          console.error("Paket parse hatası:", e);
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        // 5 saniye sonra yeniden bağlan
        setTimeout(() => this.connectKick(), 5000);
      };
    } catch (e) {
      console.warn("WebSocket başlatılamadı:", e);
    }
  }

  sendPusher(event, data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ event, data }));
    }
  }

  handlePacket(packet) {
    if (packet.event === 'pusher:ping') {
      this.sendPusher('pusher:pong', {});
      return;
    }

    if (!packet.data) return;
    let data;
    try {
      data = typeof packet.data === 'string' ? JSON.parse(packet.data) : packet.data;
    } catch (e) {
      data = packet.data;
    }

    // Chat Mesajı Olayı
    if (packet.event === 'App\\Events\\ChatMessageEvent') {
      if (this.onMessage) {
        this.onMessage({
          sender: { username: data.sender?.username || "Anonim" },
          content: data.content || ""
        });
      }
    }
    // Abone Olayı
    else if (packet.event === 'App\\Events\\SubscriptionEvent') {
      if (this.onAlert) {
        this.onAlert('sub', {
          username: data.username || "Gizli Abone",
          months: data.months || 1
        });
      }
    }
    // Hediye Abone Olayı
    else if (packet.event === 'App\\Events\\GiftedSubscriptionsEvent') {
      if (this.onAlert) {
        this.onAlert('sub', {
          username: data.gifter_username || "Destekçi",
          months: `${data.gifted_usernames?.length || 1} Hediye`
        });
      }
    }
    // Takipçi Güncellemesi
    else if (packet.event === 'App\\Events\\FollowersUpdated') {
      if (this.onAlert) {
        this.onAlert('follower', {
          username: data.follower?.username || "Yeni Takipçi",
          count: data.followersCount || data.followers_count
        });
      }
    }
  }

  // Kontrol Panelinden Alert Gönderme Metodu
  static emitTestAlert(alertType, payload) {
    const bus = new BroadcastChannel('kick_stream_bus');
    bus.postMessage({ type: 'TEST_ALERT', alertType, payload });
  }

  // Kontrol Panelinden Chat Gönderme Metodu
  static emitTestChat(username, content) {
    const bus = new BroadcastChannel('kick_stream_bus');
    bus.postMessage({ type: 'TEST_CHAT', username, content });
  }
}

window.KickClient = KickClient;
