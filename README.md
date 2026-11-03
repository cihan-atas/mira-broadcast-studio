# 🌸 MİRA Broadcast Studio — MLBB 5-Hero Profesyonel Yayın Paketi 🎮✨

![Platform](https://img.shields.io/badge/Platform-Kick%20%7C%20TikTok%20Live-00f5a0?style=for-the-badge)
![OS](https://img.shields.io/badge/OS-Windows%20%7C%20Linux-a855f7?style=for-the-badge)
![OBS](https://img.shields.io/badge/OBS%20Studio-v28%20--%20v31%20(WebSocket%205.0)-3b82f6?style=for-the-badge)
![TTS](https://img.shields.io/badge/Audio-250%25%20Booster%20%2B%20Audio%20Ducking-f59e0b?style=for-the-badge)

**MİRA Broadcast Studio**; **Kick** ve **TikTok Live Studio** platformlarında bağımsız veya **aynı anda çift yayın (Multi-Streaming)** yapan yayıncılar için özel olarak tasarlanmış, **Mobile Legends: Bang Bang (MLBB)** temalı 5 şampiyonluk ultra lüks dinamik yayın ve stream deck paketidir:
**💀 Vexana**, **👑 Zetian**, **🐾 Nana**, **🩸 Carmilla** ve **⚓ Atlas**.

Her iki platform için sahneler **`kick/`** ve **`tiktok/`** klasörlerine ayrılmış; özel rozetler, canlı sohbet panelleri, doğal Türkçe sesli okuma (TTS), otomatik müzik kısma (Audio Ducking) ve OBS WebSocket 5.0 canlı donanım kontrolü ile donatılmıştır.

---

## 🚀 Sıfırdan Adım Adım Kurulum Rehberi

### 🪟 1. Windows Kurulum Kılavuzu (Windows 10 / 11)

Windows'ta sıfırdan kurulum yapmak ve stüdyoyu yayına hazır hale getirmek oldukça kolaydır:

#### Adım 1: Ön Gereksinimleri Yükleyin
1. **Node.js (Zorunlu):**
   - [nodejs.org](https://nodejs.org/) adresine gidin ve **LTS (Uzun Vadeli Destek)** sürümünü indirip kurun (Örn: v20 veya v22).
   - Kurulum sihirbazındaki tüm adımları varsayılan ayarlarla ("Next") tamamlayın.
2. **OBS Studio:**
   - [obsproject.com](https://obsproject.com/) adresinden güncel OBS Studio'yu (v28 veya üzeri) indirin.
3. **Git (İsteğe Bağlı):**
   - Projeyi Git ile klonlamak istiyorsanız [git-scm.com](https://git-scm.com/) kurabilirsiniz veya projeyi GitHub'dan doğrudan ZIP olarak indirebilirsiniz.

#### Adım 2: Projeyi Bilgisayarınıza İndirin
* **Seçenek A (ZIP ile - En Kolay):**
  - GitHub reposundaki yeşil **`Code`** butonuna tıklayın ve **`Download ZIP`** seçin.
  - İndirilen ZIP dosyasını masaüstünüze veya istediğiniz bir klasöre çıkartın.
* **Seçenek B (Git ile):**
  - Komut İstemi (CMD) veya PowerShell açıp şu komutu yazın:
    ```cmd
    git clone https://github.com/cihan-atas/mira-broadcast-studio.git
    cd mira-broadcast-studio
    ```

#### Adım 3: Tek Tıkla Başlatın
Klasör içerisindeki hazır başlatıcılardan size uygun olanına çift tıklayın:
* **🌸 [`baslat.bat`](file:///home/zeus/Desktop/yayın/baslat.bat) (Önerilen — Masaüstü Uygulaması):**
  - Node.js durumunu ve bağımlılıkları otomatik kontrol eder.
  - İlk açılışta gerekli kütüphaneleri otomatik kurar (`npm install`).
  - MİRA Broadcast Studio'yu bağımsız, şık bir masaüstü uygulaması (Electron) olarak açar.
* **⚡ [`baslat-server.bat`](file:///home/zeus/Desktop/yayın/baslat-server.bat) (Hafif Sunucu & Web Tarayıcı Modu):**
  - Masaüstü penceresi yerine yerel Node.js sunucusunu başlatır ve varsayılan tarayıcınızda (Chrome, Edge, Brave) `http://localhost:8080/` adresini açar. Düşük sistem kaynağı tüketimi için idealdir.

#### Adım 4: Windows OBS Studio WebSocket Bağlantısını Açın
1. OBS Studio'yu açın.
2. Üst menüden **Araçlar (Tools) ➔ WebSocket Sunucusu Ayarları (WebSocket Server Settings)** penceresini açın.
3. **"WebSocket Sunucusunu Etkinleştir"** kutucuğunu işaretleyin.
4. **Sunucu Bağlantı Noktası (Port):** `4455` (Varsayılan).
5. **Kimlik Doğrulama:** Şifreyi kapatın (veya şifresiz bırakın).
6. **Uygula** ve **Tamam**'a basın.
> [!TIP]
> MİRA Studio, OBS'e anında `🟢 OBS WS Senkronu` rozetiyle bağlanır. Windows'taki Türkçe ses aygıtı (`Masaüstü Sesi`) veya İngilizce (`Desktop Audio`) otomatik algılanır; ekstra ayar yapmanıza gerek kalmaz.

---

### 🐧 2. Linux Kurulum Kılavuzu (Ubuntu / Debian / Arch / Fedora)

#### Adım 1: Gerekli Paketleri Yükleyin
Terminali açarak dağıtımınıza uygun komutla Node.js, npm ve git paketlerini kurun:

* **Ubuntu / Debian / Linux Mint:**
  ```bash
  sudo apt update
  sudo apt install -y nodejs npm git
  ```
* **Arch Linux / Manjaro:**
  ```bash
  sudo pacman -S nodejs npm git
  ```
* **Fedora / RHEL:**
  ```bash
  sudo dnf install -y nodejs npm git
  ```

#### Adım 2: Repoyu Klonlayın ve Klasöre Girin
```bash
git clone https://github.com/cihan-atas/mira-broadcast-studio.git
cd mira-broadcast-studio
```

#### Adım 3: Çalıştırma İzinlerini Verin ve Başlatın
```bash
chmod +x baslat.sh baslat-app.sh
```

* **Masaüstü Uygulaması (Electron Modu):**
  ```bash
  ./baslat.sh
  # veya
  npm start
  ```
* **Hafif Web & Sunucu Modu:**
  ```bash
  node server.js
  ```
  Ardından tarayıcınızdan `http://localhost:8080/` adresine gidin.

#### Adım 4: Linux OBS Studio Bağlantısı
1. OBS Studio'da **Araçlar ➔ WebSocket Sunucusu Ayarları** menüsüne gidin.
2. Portun `4455` olduğundan ve sunucunun aktif olduğundan emin olun.
3. MİRA, Linux `pulse_output_capture` (Desktop Audio) aygıtını otomatik tanıyarak canlı ses kısma ve seviye kontrollerini aktifleştirir.

---

## 🌟 Öne Çıkan Gelişmiş Özellikler

### 1. 🎙️ 2.5x (%250) TTS Ses Güçlendirici (Booster) & Otomatik Müzik Kısma (Audio Ducking)
* **Web Audio API Gain Booster:** Standart web tarayıcı sesi %100 sınırında kalırken, MİRA dahili amplifikatörle sesi **%250'ye (2.5 kat)** kadar güçlendirir.
* **Akıllı Audio Ducking:** Canlı yayında bir izleyici mesaj yazdığında veya bildirim geldiğinde, MİRA OBS üzerindeki arka plan müziğini anında **%25 seviyesine (fısıltıya)** kısar. Konuşma bittiğinde müzik yumuşakça eski seviyesine yükselir.
* **Tekil Ses Kilidi (Cross-Process Mutex):** Stüdyo, önizleme çerçevesi ve OBS tarayıcı kaynakları arasında paylaşılan `mira_tts_audio_lock` kilidi sayesinde mesajlar ve alertler **asla 2 veya 4 defa eko yapmaz; kesinlikle 1 defa seslendirilir.**

### 2. 🎚️ Canlı Müzik & Tuna Kontrol Merkezi
* **OBS Müzik Sesi Sürgüsü:** Stüdyo içinden OBS'teki masaüstü müzik ses düzeyini canlı olarak ayarlayabilirsiniz (`%20 Fısıltı`, `%40 Dengeli`, `%70`, `%100 Tam`).
* **Otomatik Spotify / Snip / Tuna Senkronu:** `yayın/now-playing.txt` dosyası veya OBS Tuna eklentisi (Port: 1608) dinlenerek çalan şarkı canlı ekolayzerde ve OBS metin kaynaklarında eşzamanlı gösterilir.

### 3. 🟢 Kick Doğal Monetizasyon & Bildirim Şablonları
* TikTok'a özgü "Gül" hediyeleri Kick sahnelerinden tamamen kaldırılmıştır.
* Kick platformunun gerçek canlı etkinlikleri entegre edilmiştir:
  - 💜 **Yeni Takipçi** (Sadece gerçek takipler Takipçi Hedefini `+1` artırır!)
  - 👑 **Tier 1 Abonelik** (`Teşekkürler {user}, {months}. ayında abone oldu!`)
  - 🎁 **Hediye Abonelik (5x / 10x)** (`{user}, topluluğa {gift} hediye abonelik dağıttı!`)
  - 💎 **500 Kicks & Bağış** (`{user}, {amount} destek gönderdi: {message}`)
  - 🚀 **Yayın Baskını (Raid)** (`{user}, {count} izleyiciyle baskın yaptı!`)

### 4. 🎯 Takipçi Hedefi (Follower Goal)
* Bağış ve hediyeler takipçi hedefini yanlışlıkla artırmaz; hedef çubuğu yalnızca ve yalnızca yeni takipçi geldiğinde `+1` artar.

---

## 📂 Düzenli & Temiz Klasör Hiyerarşisi

```
mira-broadcast-studio/
├── index.html                   ← 🎛️ Canlı Yayın Kontrol Masası (Stream Deck Web UI)
├── custom-overlay.html          ← 🎨 OBS Çok Fonksiyonlu Canlı Overlay Katmanı
├── floating-chat.html           ← 🪟 Her Zaman Üstte Kalan Kompakt Canlı Sohbet Konsolu
├── server.js                    ← ⚡ Yerel Node.js Sunucusu, Kick Pusher & OBS WS Motoru
├── main.js                      ← 🖥️ Electron Masaüstü Uygulama Motoru
├── baslat.bat                   ← 🪟 Windows Otomatik Bağımlılık Denetimli Başlatıcı
├── baslat-app.bat               ← 🪟 Windows Masaüstü Electron Başlatıcı
├── baslat-server.bat            ← 🪟 Windows Hafif Web & OBS Sunucu Başlatıcı
├── baslat.sh                    ← 🐧 Linux Başlatıcı
├── baslat-app.sh                ← 🐧 Linux Electron Başlatıcı
├── tts-config.json              ← ⚙️ TTS Ses Seviyesi, Audio Ducking ve Şablon Yapılandırması
├── now-playing.txt              ← 🎵 Spotify / Tuna Müzik Senkron Dosyası
├── package.json                 ← 📦 Proje Paket Tanımları
│
├── kick/                        ← 🟢 KICK YAYIN SAHNELERİ
│   ├── vexana/                  ← 💀 Vexana Oyun İçi Sahnesi (16:9)
│   ├── zetian/                  ← 👑 Zetian Oyun İçi Sahnesi (16:9)
│   ├── nana/                    ← 🐾 Nana Oyun İçi Sahnesi (16:9)
│   ├── carmilla/                ← 🩸 Carmilla Oyun İçi Sahnesi (16:9)
│   ├── atlas/                   ← ⚓ Atlas Oyun İçi Sahnesi (16:9)
│   └── sahneler/                ← 📺 Kick Genel Sahneleri (1-Başlıyor, 2-Sohbet, 3-Mola, 4-Bitti, Oyun-PC)
│
├── tiktok/                      ← 📱 TIKTOK LIVE SAHNELERİ
│   ├── vexana/                  ← 💀 Vexana Oyun İçi Sahnesi (Son Hediye + TikTok Chat)
│   ├── zetian/                  ← 👑 Zetian Oyun İçi Sahnesi
│   ├── nana/                    ← 🐾 Nana Oyun İçi Sahnesi
│   ├── carmilla/                ← 🩸 Carmilla Oyun İçi Sahnesi
│   ├── atlas/                   ← ⚓ Atlas Oyun İçi Sahnesi
│   └── sahneler/                ← 📺 TikTok Genel Sahneleri
│
├── shared/                      ← ⚡ Ortak Kütüphaneler (hero-audio.js, hero-dynamic.js, base.css)
└── assets/                      ← 🎨 Görseller, Fontlar ve İkonlar (icon.ico, icon.png)
```

---

## 🎬 Sahne Bağlantıları Tablosu (Port: 8080)

### 🟢 1. Kick Yayın Sahneleri:
| Hero / Sahne | Canlı OBS URL Bağlantısı | Özellikler |
| :--- | :--- | :--- |
| **💀 Vexana (Kick)** | `http://localhost:8080/kick/vexana/in-game.html` | 16:9 Oyun + Şeytan Kulaklı Cam + Kick Chat + Skill Rehberi |
| **👑 Zetian (Kick)** | `http://localhost:8080/kick/zetian/in-game.html` | 16:9 Oyun + Şeytan Kulaklı Cam + Kick Chat + Skill Rehberi |
| **🐾 Nana (Kick)** | `http://localhost:8080/kick/nana/in-game.html` | 16:9 Oyun + Şeytan Kulaklı Cam + Kick Chat + Skill Rehberi |
| **🩸 Carmilla (Kick)** | `http://localhost:8080/kick/carmilla/in-game.html` | 16:9 Oyun + Şeytan Kulaklı Cam + Kick Chat + Skill Rehberi |
| **⚓ Atlas (Kick)** | `http://localhost:8080/kick/atlas/in-game.html` | 16:9 Oyun + Şeytan Kulaklı Cam + Kick Chat + Skill Rehberi |
| **⏳ Yayın Başlıyor (Kick)**| `http://localhost:8080/kick/sahneler/1-yayin-basliyor.html`| 5 Dk Geri Sayım + Kick Chat + Arka Plan Müziği |
| **💬 Just Chatting (Kick)** | `http://localhost:8080/kick/sahneler/2-sohbet.html` | Büyük Ortalanmış Kamera + Yan Kick Chat Paneli |
| **☕ Mola (Kick)** | `http://localhost:8080/kick/sahneler/3-mola.html` | "Hemen Döneceğim" + Canlı Chat |
| **🎬 Yayın Bitti (Kick)** | `http://localhost:8080/kick/sahneler/4-yayin-bitti.html` | Kapanış Teşekkürleri + Canlı Chat |
| **🎮 PC Oyunları (Sade)** | `http://localhost:8080/kick/sahneler/oyun-pc.html` | Tam Ekran PC Oyunları İçin Minimalist Üst Bar + Şeffaf Cam |

---

## 🎥 OBS Studio Sahne Kurulum Rehberi

OBS Studio'da profesyonel bir 1080p sahne oluşturmak için adım adım:

### 🎮 Oyun Sahnesi Kurulumu (Örn: Vexana Kick):
1. OBS'te **Sahneler (Scenes)** panelinden `+` ile yeni bir sahne oluşturun: `"Oyun - Vexana"`.
2. Aşağıdaki 3 katmanı sırasıyla ekleyin:

#### Katman 1 (En Altta — Oyun / Emülatör Görüntüsü):
* Kaynaklar ➔ `+` ➔ **Oyun Yakalama (Game Capture)** veya **Pencere Yakalama (Window Capture)**.
* Kaynağa sağ tıklayın ➔ **Dönüştür ➔ Dönüşümü Düzenle**:
  * **Konum (Position):** `X: 320`, `Y: 102`
  * **Boyut (Size):** `Genişlik: 1280`, `Yükseklik: 692` *(16:9 oyun alanına tam oturur)*.

#### Katman 2 (Ortada — Kamera):
* Kaynaklar ➔ `+` ➔ **Video Yakalama Aygıtı (Webcam)**.
* Dönüşümü Düzenle:
  * **Konum (Position):** `X: 10`, `Y: 848`
  * **Boyut (Size):** `Genişlik: 300`, `Yükseklik: 220` *(Sol alttaki çerçeveye tam oturur)*.

#### Katman 3 (En Üstte — MİRA Dinamik Overlay):
* Kaynaklar ➔ `+` ➔ **Tarayıcı (Browser Source)**.
* **URL:** `http://localhost:8080/kick/vexana/in-game.html`
* **Genişlik:** `1920`
* **Yükseklik:** `1080`
* *"OBS ile sesi kontrol et"* kutucuğunu işaretleyin.
* *"Sahne etkin hale geldiğinde tarayıcıyı yenile"* kutucuğunu işaretleyin.

---

## ⚡ HEM KICK HEM TIKTOK'A AYNI ANDA YAYIN YAPMA (Multi-Streaming)

Yayınınızı hem Kick'e hem de TikTok'a aynı anda vermek için 2 pratik yöntem:

### 🌟 Yöntem 1: OBS Sanal Kamera ➔ TikTok Live Studio (En Kolay)
1. OBS Studio'da tüm sahnelerinizi hazırlayın.
2. OBS'in sağ altındaki **"Sanal Kamerayı Başlat" (Start Virtual Camera)** butonuna tıklayın.
3. **TikTok Live Studio** uygulamasını açın:
   - Kaynak ekle ➔ **Kamera (Camera)** seçin.
   - Kamera aygıtı olarak **"OBS Virtual Camera"** seçin ve tam ekrana yayın.
4. OBS'ten Kick yayınınızı, TikTok Live Studio'dan da TikTok yayınınızı başlatın. Tüm hero geçişleri, efektler ve müziğiniz birebir TikTok'a da canlı akar!

### 🌟 Yöntem 2: OBS "Multiple RTMP Output" Eklentisi (%100 Doğrudan)
1. Ücretsiz **"obs-multi-rtmp"** eklentisini OBS'e kurun.
2. Ana yayın hedefine Kick RTMP bilgilerini, ikinci hedefe TikTok RTMP sunucu adresini ve yayın anahtarını girin.
3. Tek tıkla her iki platforma da aynı anda yayın basın.

---

## ⌨️ Klavye Kısayolları

| Tuş | İşlev |
| :--- | :--- |
| **`H`** | OBS / TikTok kılavuz kutularını anında gizler veya gösterir. |
| **`1`** | **💀 Vexana** sahnesine anında geçiş yapar. |
| **`2`** | **👑 Zetian** sahnesine anında geçiş yapar. |
| **`3`** | **🐾 Nana** sahnesine anında geçiş yapar. |
| **`4`** | **🩸 Carmilla** sahnesine anında geçiş yapar. |
| **`5`** | **⚓ Atlas** sahnesine anında geçiş yapar. |

---

## 🛡️ Sıkça Sorulan Sorular ve Sorun Giderme

### S: Windows'ta `baslat.bat` tıkladığımda pencere hemen kapanıyor, ne yapmalıyım?
> Bilgisayarınızda Node.js kurulu değildir. [nodejs.org](https://nodejs.org/) adresinden LTS sürümünü kurduktan sonra `baslat.bat` dosyasına tekrar çift tıklayın.

### S: OBS'te ses kısma (Audio Ducking) veya müzik ayarı çalışmıyor?
> OBS'te **Araçlar ➔ WebSocket Sunucusu Ayarları** menüsünden sunucunun aktif ve portun `4455` olduğundan emin olun. MİRA Kontrol Masası `🟢 OBS WS Senkronu` rozetini gösterdiğinde bağlantı kurulmuş demektir.

### S: Chat mesajları veya alertler sesli okunurken müzik çok mu baskın kalıyor?
> Kontrol Masasında **Müzik & Tuna** sekmesinden müzik sesini `%30 - %40` seviyesine getirin ve **"🎙️ TTS Konuşurken Müziği Otomatik Kıs (Audio Ducking)"** seçeneğini açık tutun. Ayrıca **Alerts** sekmesinden TTS Ses Gücünü `%200` veya `%250` (Maksimum Boost) olarak ayarlayabilirsiniz.

İyi yayınlar dileriz! 🎮💖
