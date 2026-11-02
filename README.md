# 🌸 MLBB 5-Hero Konsept Yayın Paketi (V5 — Kick & TikTok Ayrılmış Çift Platform Seti) 🎮✨

Bu paket; **Kick** ve **TikTok Live Studio** platformlarında bağımsız veya **aynı anda çift yayın (Multi-Streaming)** yapan kadın yayıncılar için özel olarak tasarlanmış, **Mobile Legends: Bang Bang (MLBB)** temalı 5 şampiyonluk ultra lüks dinamik yayın setidir:
**💀 Vexana**, **👑 Zetian**, **🐾 Nana**, **🩸 Carmilla** ve **⚓ Atlas**.

Her iki platform için sahneler **`kick/`** ve **`tiktok/`** klasörlerine ayrı ayrı bölünmüş, platformların kendi terimleri, marka rozetleri ve canlı chat stilleriyle donatılmıştır.

---

## 🌟 Yeni Tasarım & Düzen Özellikleri

1. **📁 Tamamen Ayrılmış İki Platform Klasörü (`kick/` ve `tiktok/`):**
   - **`kick/`:** Kick yeşili marka rozeti, `KICK CANLI SOHBET`, `SON TAKİP` / `SON ABONE` / `SON DESTEK` kartları ve Kick'e özel sosyal medya pill'leri.
   - **`tiktok/`:** TikTok neon mavi & pembe marka rozeti, `TIKTOK CANLI SOHBET`, `SON TAKİP` / `SON ABONE` / `SON HEDİYE (Gül x10 / vb.)` kartları ve TikTok'a özel sosyal medya pill'leri.

2. **💎 Ultra Şık Glassmorphic Üst Sayaç Kartları (Top Stat Cards):**
   - Eski düz kutular kaldırıldı; 14px radius, `backdrop-filter: blur(14px)`, degrade border, squircle neon ikon kutuları (`32×32px`) ve dinamik parlama animasyonlu kartlar getirildi.
   - **Kick Canlı Sayaçları:**
     - 💜 `stat-card-follower`: **SON TAKİP**
     - 💚 `stat-card-sub`: **SON ABONE**
     - 💛 `stat-card-donation`: **SON DESTEK**
   - **TikTok Canlı Sayaçları:**
     - 🩵 `stat-card-follower`: **SON TAKİP**
     - 💖 `stat-card-sub`: **SON ABONE**
     - 🎁 `stat-card-gift`: **SON HEDİYE** (Gül, Aslan, Jeton vb.)

3. **🎯 TAKİPÇİ HEDEFİ (Follower Goal):**
   - Hedef çubuğu artık *"YENİ KOSTÜM HEDEFİ"* değil, **"TAKİPÇİ HEDEFİ"** olarak yapılandırılmıştır.
   - Yeni takipçi geldikçe hedef canlı olarak `+1` artar, progress bar renk geçişiyle otomatik dolar.

4. **📱 Temiz & Dengeli 3'lü Sosyal Medya Kartı (KICK, TIKTOK, YOUTUBE):**
   - Instagram ve Discord tamamen çıkarılmıştır.
   - Sadece 3 ana yayın & içerik kanalı yer alır:
     1. 🟢 **KICK:** `kick.com/mira`
     2. 📱 **TIKTOK:** `@mira_mlbb`
     3. ▶ **YOUTUBE:** `@mira.gaming`
   - Genişletilmiş kameranın tam üstünde (`300 × 150 px`) estetik 2+1 grid düzeninde sergilenir.

5. **🎮 Oyun Ekranı TAM ORTADA (`1280 × 720` — 16:9 Kusursuz HD Standart):**
   - Oyun görüntüsü ekranın tam merkezinde (`Sol: 320px, Üst: 74px`), şık neon ışıklı, köşe rünlü ve FPS/Ping sayaçlı çerçevenin içerisindedir.
   - OBS veya TikTok Live Studio'da oyun yakalama kaynağınızı bu çerçevenin arkasına tam 16:9 oranında oturtabilirsiniz.

6. **😈 Kamerada Minik Üçgen Şeytan Kulakları (Gamer Devil Ears):**
   - Sol alttaki genişletilmiş kamera çerçevesinin (`300 × 220 px`) sol ve sağ üst köşelerinde şık ve sevimli üçgen şeytan kulakları / boynuzları yer alır.
   - `-16°` ve `+16°` eğimli, çift katmanlı degrade renklere ve uçlarında parıldayan neon kıvılcımlara (`devil-ear-pulse`) sahiptir.
   - Her hero temasına göre rengini otomatik uyarlar.

7. **⚔️ Büyütülmüş Hero Skill Rehberi & Müzik Masası (`1280 × 262`):**
   - **Dinamik Ses Görselleştirici (320px):** 16 adet zıplayan ekolayzer çubuğu ve "Şu An Çalan Şarkı" bilgisi.
   - **4'lü Büyütülmüş Skill Masası (946px):** Büyük ve okunaklı yazı fontlarıyla her şampiyonun resmi yetenek detayları:
     - 🔮 **Pasif** (Tüm kurallar ve hasar tetiklemeleri)
     - ⚔️ **1. Yetenek** (Hasar ve kitle kontrolü)
     - 💥 **2. Yetenek** (Alan hasarı ve kombo)
     - 👑 **Ulti** (En güçlü yetenek mekaniği)

8. **💬 Dinamik Canlı Chat Paneli (`300 × 994`):**
   - Sağ kolon boyunca uzanır, sol kolonla simetriktir.
   - İster otomatik yapay zeka Türkçe chat simülatörü çalışır, isterseniz BotRix / TikFinity ile gerçek Kick & TikTok canlı chatini tek tıkla entegre edebilirsiniz.

---

## 🚀 Hızlı Başlatma (Windows & Linux)

### 🪟 Windows İçin (Sıfır Kurulum — Node veya Python GEREKTİRMEZ):
1. [`yayın/baslat.bat`](file:///home/zeus/Desktop/yayın/baslat.bat) dosyasına çift tıklayın.
2. Windows'un dahili PowerShell'i üzerinden yerel web sunucusu (Port: 8080) otomatik başlar ve tarayıcınızda Kontrol Masası açılır.

### 🐧 Linux İçin:
1. Terminali açıp `./baslat.sh` komutunu çalıştırın.

---

## 📂 Düzenli & Temiz Klasör Hiyerarşisi

Klasör gereksiz tüm dosyalardan arındırılmış, Kick ve TikTok için iki ana platform dizinine ayrılmıştır:

```
yayın/
├── index.html                   ← 🎛️ Canlı Yayın Kontrol Masası (Kick / TikTok Sekmeli)
├── baslat.bat                   ← 🪟 Windows Tek Tık Başlatıcı (PowerShell / Sıfır Kurulum)
├── baslat.sh                    ← 🐧 Linux Başlatıcı
├── server.js                    ← Yerel Node.js & Canlı TikTok/Kick Sunucusu (Port: 8080)
├── server.ps1                   ← Yerel PowerShell Sunucusu (Port: 8080)
├── now-playing.txt              ← Otomatik Spotify / Snip Müzik Senkron Dosyası
├── README.md                    ← Bu Detaylı Rehber Dokümanı
│
├── kick/                        ← 🟢 KICK YAYIN SAHNELERİ
│   ├── vexana/                  ← 💀 Vexana Oyun İçi Sahnesi
│   ├── zetian/                  ← 👑 Zetian Oyun İçi Sahnesi
│   ├── nana/                    ← 🐾 Nana Oyun İçi Sahnesi
│   ├── carmilla/                ← 🩸 Carmilla Oyun İçi Sahnesi
│   ├── atlas/                   ← ⚓ Atlas Oyun İçi Sahnesi
│   └── sahneler/                ← 📺 Kick Genel Yayın Sahneleri (Kick Chat Ekranlı)
│       ├── 1-yayin-basliyor.html← ⏳ Yayın Başlıyor + 5 Dk Sayaç + Kick Chat
│       ├── 2-sohbet.html        ← 💬 Just Chatting + Büyük Cam + Kick Chat
│       ├── 3-mola.html          ← ☕ Mola / BRB + Müzik + Kick Chat
│       └── 4-yayin-bitti.html   ← 🎬 Yayın Bitti / Kapanış + Kick Chat
│
├── tiktok/                      ← 📱 TIKTOK LIVE SAHNELERİ
│   ├── vexana/                  ← 💀 Vexana Oyun İçi Sahnesi (Son Hediye + TikTok Chat)
│   ├── zetian/                  ← 👑 Zetian Oyun İçi Sahnesi (Son Hediye + TikTok Chat)
│   ├── nana/                    ← 🐾 Nana Oyun İçi Sahnesi (Son Hediye + TikTok Chat)
│   ├── carmilla/                ← 🩸 Carmilla Oyun İçi Sahnesi (Son Hediye + TikTok Chat)
│   ├── atlas/                   ← ⚓ Atlas Oyun İçi Sahnesi (Son Hediye + TikTok Chat)
│   └── sahneler/                ← 📺 TikTok Genel Yayın Sahneleri (TikTok Chat Ekranlı)
│       ├── 1-yayin-basliyor.html← ⏳ Yayın Başlıyor + 5 Dk Sayaç + TikTok Chat
│       ├── 2-sohbet.html        ← 💬 Just Chatting + Büyük Cam + TikTok Chat
│       ├── 3-mola.html          ← ☕ Mola / BRB + Müzik + TikTok Chat
│       └── 4-yayin-bitti.html   ← 🎬 Yayın Bitti / Kapanış + TikTok Chat
│
├── shared/                      ← ⚡ Ortak Motorlar (base.css, hero-dynamic.js)
└── assets/                      ← 🎨 Genel Sahne Varlıkları (Görseller, Fontlar, Scriptler)
```

---

## 🎬 Sahne Bağlantıları Tablosu (Port: 8080)

### 🟢 1. Kick Yayın Sahneleri:
| Hero / Sahne | Canlı URL Bağlantısı | Özellikler |
| :--- | :--- | :--- |
| **💀 Vexana (Kick)** | `http://localhost:8080/kick/vexana/in-game.html` | 16:9 Oyun + Şeytan Kulaklı Cam + Kick Chat |
| **👑 Zetian (Kick)** | `http://localhost:8080/kick/zetian/in-game.html` | 16:9 Oyun + Şeytan Kulaklı Cam + Kick Chat |
| **🐾 Nana (Kick)** | `http://localhost:8080/kick/nana/in-game.html` | 16:9 Oyun + Şeytan Kulaklı Cam + Kick Chat |
| **🩸 Carmilla (Kick)** | `http://localhost:8080/kick/carmilla/in-game.html` | 16:9 Oyun + Şeytan Kulaklı Cam + Kick Chat |
| **⚓ Atlas (Kick)** | `http://localhost:8080/kick/atlas/in-game.html` | 16:9 Oyun + Şeytan Kulaklı Cam + Kick Chat |
| **⏳ Yayın Başlıyor (Kick)**| `http://localhost:8080/kick/sahneler/1-yayin-basliyor.html`| 5 Dk Geri Sayım + Kick Chat + BGM |
| **💬 Just Chatting (Kick)** | `http://localhost:8080/kick/sahneler/2-sohbet.html` | Büyük Ortalanmış Kamera + Kick Chat |
| **☕ Mola (Kick)** | `http://localhost:8080/kick/sahneler/3-mola.html` | "Hemen Döneceğim" + Kick Chat |
| **🎬 Yayın Bitti (Kick)** | `http://localhost:8080/kick/sahneler/4-yayin-bitti.html` | Kapanış Teşekkürleri + Kick Chat |
| **🎮 PC Oyunları (Sade - Kick)** | `http://localhost:8080/kick/sahneler/oyun-pc.html` | Tam Ekran PC Oyunları İçin Sade HUD + Şeffaf Cam + Kick Chat |

### 📱 2. TikTok Live Sahneleri:
| Hero / Sahne | Canlı URL Bağlantısı | Özellikler |
| :--- | :--- | :--- |
| **💀 Vexana (TikTok)** | `http://localhost:8080/tiktok/vexana/in-game.html` | 16:9 Oyun + Şeytan Kulaklı Cam + Son Hediye + TikTok Chat |
| **👑 Zetian (TikTok)** | `http://localhost:8080/tiktok/zetian/in-game.html` | 16:9 Oyun + Şeytan Kulaklı Cam + Son Hediye + TikTok Chat |
| **🐾 Nana (TikTok)** | `http://localhost:8080/tiktok/nana/in-game.html` | 16:9 Oyun + Şeytan Kulaklı Cam + Son Hediye + TikTok Chat |
| **🩸 Carmilla (TikTok)** | `http://localhost:8080/tiktok/carmilla/in-game.html` | 16:9 Oyun + Şeytan Kulaklı Cam + Son Hediye + TikTok Chat |
| **⚓ Atlas (TikTok)** | `http://localhost:8080/tiktok/atlas/in-game.html` | 16:9 Oyun + Şeytan Kulaklı Cam + Son Hediye + TikTok Chat |
| **⏳ Yayın Başlıyor (TikTok)**| `http://localhost:8080/tiktok/sahneler/1-yayin-basliyor.html`| 5 Dk Geri Sayım + TikTok Chat + BGM |
| **💬 Just Chatting (TikTok)**| `http://localhost:8080/tiktok/sahneler/2-sohbet.html` | Büyük Ortalanmış Kamera + TikTok Chat |
| **☕ Mola (TikTok)** | `http://localhost:8080/tiktok/sahneler/3-mola.html` | "Hemen Döneceğim" + TikTok Chat |
| **🎬 Yayın Bitti (TikTok)** | `http://localhost:8080/tiktok/sahneler/4-yayin-bitti.html` | Kapanış Teşekkürleri + TikTok Chat |
| **🎮 PC Oyunları (Sade - TikTok)** | `http://localhost:8080/tiktok/sahneler/oyun-pc.html` | Tam Ekran PC Oyunları İçin Sade HUD + Şeffaf Cam + TikTok Chat |

---

## 🎥 OBS Studio Kurulum Rehberi (Kick & Çift Yayın İçin)

OBS Studio'da profesyonel bir sahne oluşturmak için adım adım:

### 🎮 Oyun Sahnesi (Örn: Vexana Kick):
1. OBS'te sol alttaki **Sahneler (Scenes)** kutusundan `+` butonuna basıp `"Oyun - Vexana"` adında bir sahne oluşturun.
2. Sırasıyla şu 3 katmanı ekleyin:

#### Katman 1 (En Altta — Oyun Görüntüsü):
* Kaynaklar ➔ `+` ➔ **Oyun Yakalama (Game Capture)** veya **Pencere Yakalama (Window Capture)** (Mobile Legends veya Emülatör seçin).
* Kaynağa sağ tıklayın ➔ **Dönüştür (Transform)** ➔ **Dönüşümü Düzenle (Edit Transform)**:
  * **Konum (Position):** `X: 320`, `Y: 102`
  * **Boyut (Size):** `Genişlik: 1280`, `Yükseklik: 692` *(Ortadaki 16:9 pencereye tam oturur)*.

#### Katman 2 (Ortada — Kamera):
* Kaynaklar ➔ `+` ➔ **Video Yakalama Aygıtı (Webcam)** seçin.
* Dönüşümü Düzenle:
  * **Konum (Position):** `X: 10`, `Y: 848`
  * **Boyut (Size):** `Genişlik: 300`, `Yükseklik: 220` *(Sol alttaki çerçeveye tam oturur)*.

#### Katman 3 (En Üstte — Overlay):
* Kaynaklar ➔ `+` ➔ **Tarayıcı (Browser Source)** ekleyin.
* **URL:** `http://localhost:8080/kick/vexana/in-game.html`
* **Genişlik:** `1920`
* **Yükseklik:** `1080`
* *"OBS ile sesi kontrol et"* kutucuğunu işaretleyin.
* *"Sahne etkin hale geldiğinde tarayıcıyı yenile"* kutucuğunu işaretleyin.

---

## 📱 TikTok Live Studio Kurulum Rehberi

1. **TikTok Live Studio** uygulamasını açın ve **Yatay Sahne Modunu (16:9 / 1920×1080)** seçin.
2. Sahneye kaynak ekle (`+` butonu):
   - **Bağlantı / Tarayıcı (Link / Browser):**
     - URL alanına `http://localhost:8080/tiktok/vexana/in-game.html` yazın.
     - Çözünürlüğü `1920 × 1080` yapın.
   - **Kamera (Camera):**
     - Kameranızı ekleyip sol altta `300 × 220` boyutundaki çerçevenin arkasına yerleştirin.
   - **Oyun Yakalama (Game Capture):**
     - Emülatör veya telefon ekranını seçip ortadaki 16:9 alana yerleştirin.
3. Katman sıralamasında Tarayıcı kaynağının **en üstte** olduğundan emin olun.

---

## ⚡ HEM KICK HEM TIKTOK'A AYNI ANDA YAYIN YAPMA (Multi-Streaming / Çift Yayın)

Yayınınızı hem Kick'e hem de TikTok'a aynı anda vermek için 2 popüler ve pratik yöntem:

### 🌟 Yöntem 1: OBS Sanal Kamera ➔ TikTok Live Studio (En Kolay & Garantili)
1. OBS Studio'da tüm sahnelerinizi (Kick Overlay, Oyun, Şeytan Kulaklı Kamera) eksiksiz hazırlayın.
2. OBS'in sağ altındaki **"Sanal Kamerayı Başlat" (Start Virtual Camera)** butonuna tıklayın.
3. **TikTok Live Studio** uygulamasını açın:
   - Kaynak ekle ➔ **Kamera (Camera)** seçin.
   - Kamera aygıtı olarak **"OBS Virtual Camera"** seçin ve tam ekrana yayın.
4. OBS'ten Kick yayınınızı başlatın. TikTok Live Studio'dan da canlı yayını başlatın.
   *Böylece OBS'te kontrol ettiğiniz tüm hero geçişleri, oyununuz, efektler ve müziğiniz birebir TikTok yayınına da canlı akar!*

### 🌟 Yöntem 2: OBS "Multiple RTMP Output" Eklentisi (%100 Ücretsiz & Doğrudan)
1. GitHub üzerinden ücretsiz **"obs-multi-rtmp"** eklentisini kurun.
2. OBS'te sol taraftaki Multiple Output panelinde:
   - Ana yayın: Kick RTMP sunucusu ve yayın anahtarınız.
   - İkinci yayın: TikTok RTMP sunucusu ve yayın anahtarınız.
3. Tek tıkla her iki platforma da bağımsız yüksek kaliteli yayın basabilirsiniz.

---

## 💬 Canlı Sohbeti Birleştirme (Kick + TikTok Ortak Chat)

Çift yayın yaparken sağ taraftaki sohbet panelinde hem Kick hem de TikTok izleyicilerinin mesajlarını bir arada toplamak için:

1. [botrix.live](https://botrix.live) paneline gidin.
2. Hem Kick hem TikTok hesabınızı bağlayın.
3. **Widgets ➔ Chat** sekmesinden Widget URL'sini kopyalayın.
4. Kontrol Masasını ([http://localhost:8080](http://localhost:8080)) açın.
5. **"Gerçek Kick / TikTok Canlı Chat Bağlantısı"** kutusuna bu URL'yi yapıştırıp **"BAĞLA"** butonuna basın.
6. Artık her iki platformdan gelen tüm mesajlar ekrandaki şık panelinizde anında canlı olarak akar!

---

## 🎵 Canlı Müzik (Spotify / Snip / Tuna) Entegrasyonu

Alt ekolayzer panelindeki şarkı başlığını otomatik güncellemek için:

1. **Otomatik Spotify / Snip:**
   - Ücretsiz **Snip** aracını kurun.
   - Snip ayarlarından çıktı dosyasını `yayın/now-playing.txt` olarak seçin.
   - Spotify'da şarkı değiştikçe ekrandaki şarkı adı anlık olarak otomatik değişir!
2. **Kontrol Masasından Manuel:**
   - Kontrol Masasında **"Şu An Çalan Şarkı Adı"** kutusuna şarkıyı yazıp **"GÜNCELLE"** butonuna basın.

---

## 🔴 GERÇEK YAYIN CANLI VERİ ENTEGRASYONU (KICK & TIKTOK'TA CANLI ÇALIŞTIRMA)

Overlay'deki sayaçların (Son Takip, Son Hediye, Son Abone, Takipçi Hedefi) gerçek yayındayken izleyicileriniz işlem yaptıkça **anlık ve otomatik** güncellenmesi için iki platformun sistemleri hazırlandı:

### 📱 1. TikTok Live Gerçek Veri Bağlantısı (Hediyeler & Takipçiler):
TikTok'ta Twitch/Kick gibi bir abonelik kültürü yoktur; TikTok'un kalbi **HEDİYELER (Gül, Aslan, Kalp vb.)** ve **TAKİPÇİLERDİR**. Bu yüzden TikTok sahnelerimizde sayaçlar şöyledir:
- 💜 **SON TAKİP** (Son Takip Eden İzleyici)
- 🎁 **SON HEDİYE** (Son Gelen Hediye: Gül x10, Asa, Aslan vb.)
- 👑 **TOP DESTEK** (Günün en çok jeton/hediye atan 1. destekçisi)

#### Nasıl Canlı Bağlanır?
* **Yol 1 — Doğrudan Kontrol Masasından (En Kolay — Sıfır Ek Program):**
  1. TikTok'ta canlı yayını başlatın.
  2. Kontrol Masasını ([`http://localhost:8080`](http://localhost:8080)) açın.
  3. Kırmızı TikTok Canlı Veri kutusuna kullanıcı adınızı (örn: `mira_mlbb`) yazıp **"⚡ TİKTOK'A BAĞLAN"** butonuna basın.
  4. Durum `● CANLI BAĞLI` yeşil yandığı andan itibaren, yayınınızda biri Gül veya hediye attığında anında ekranda animasyonlu alert patlar, **"SON HEDİYE"** güncellenir ve **"TAKİPÇİ HEDEFİ"** canlı olarak artar!
* **Yol 2 — TikFinity Webhook (Alternatif):**
  - Bilgisayarınızda **TikFinity** kullanıyorsanız, TikFinity Webhook URL'sine `http://localhost:8080/api/webhook` adresini vermeniz yeterlidir.

---

### 🟢 2. Kick Gerçek Veri Bağlantısı (Aboneler, Takipler & Bağışlar):
Kick platformundaki resmi etkinlikler:
- 💜 **SON TAKİP**
- 💚 **SON ABONE** (5$ Aylık Abonelik)
- 💛 **SON DESTEK** (ByNoGame / Bakiye Bağışı)

#### Nasıl Canlı Bağlanır?
* **BotRix (Kick Resmi Partneri):**
  1. [botrix.live](https://botrix.live) sitesine Kick hesabınızla giriş yapın.
  2. **Alerts / Widgets ➔ Chat** veya **Event List** bağlantısını kopyalayın.
  3. Kontrol Masasında **"Gerçek Kick / TikTok Canlı Chat"** alanına yapıştırıp **"BAĞLA"** butonuna basın.
  4. Kick'te gelen her abone, chat ve takip anında ekranınıza canlı olarak yansır!

---

## ⌨️ Klavye Kısayolları Özeti

| Tuş | İşlev |
| :--- | :--- |
| **`H`** | OBS / TikTok kılavuz kutularını anında gizler veya gösterir. |
| **`1`** | **💀 Vexana** sahnesine anında geçiş yapar. |
| **`2`** | **👑 Zetian** sahnesine anında geçiş yapar. |
| **`3`** | **🐾 Nana** sahnesine anında geçiş yapar. |
| **`4`** | **🩸 Carmilla** sahnesine anında geçiş yapar. |
| **`5`** | **⚓ Atlas** sahnesine anında geçiş yapar. |

İyi yayınlar dileriz! 🎮💖
