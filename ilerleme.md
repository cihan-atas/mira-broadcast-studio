# 🌸 MİRA BROADCAST STUDIO — Geliştirme & İlerleme Raporu (ilerleme.md)

**Versiyon:** v4.3 PRO  
**Hedef Kitle:** Kick & TikTok Live Studio'da bağımsız veya aynı anda çift yayın (Multi-Streaming) yapan kadın yayıncılar  
**Mimari:** %100 Yerel Masaüstü Uygulaması (**Linux** & **Windows** Hibrit Electron Desktop App) + **Mobil Dokunmatik Stream Deck** (LAN Wi-Fi)

---

## 📌 1. Proje Vizyonu ve Mimari Kararlar

MİRA Broadcast Studio; **Mobile Legends: Bang Bang (MLBB)** temalı 5 şampiyonluk (**💀 Vexana**, **👑 Zetian**, **🐾 Nana**, **🩸 Carmilla**, **⚓ Atlas**) lüks yayın setini ve interaktif yayın yönetim konsolunu tek bir çatı altında birleştiren profesyonel bir canlı yayın merkezidir.

### 🔑 Temel Mimari Prensipler:
1. **Sıfır Tarayıcı Bağımlılığı (Zero Desktop Browser Dependency):**
   * Masaüstü tarafında kullanıcı kesinlikle web tarayıcısına yönlendirilmez.
   * Gerek ana stüdyo kontrol paneli, gerekse *"Canlı Önizleme"* ekranı doğrudan **yerel Electron pencereleri** olarak açılır.
   * Hem **Linux (Ubuntu, Debian, Arch)** hem de **Windows (10/11)** üzerinde tek tıkla çalışan `.bat` / `.sh` ve `.exe` / `.AppImage` paketleri sunulur.
2. **Akıllı Çoklu Platform & OBS Entegrasyonu:**
   * **OBS Studio WebSocket 5.0 (Port 4455):** Stüdyodan veya mobilden seçilen sahne anında OBS Studio'da program sahnesine dönüştürülür.
   * **Kick Live & TikTok Live:** Tek tıkla platformlar arası dinamik geçiş ve canlı takipçi / hediye verisi dinleme.
   * **BotRix & Ses Entegrasyonu:** Özel şeffaf chat widget'ı ve yerel lo-fi müzik akışı (`now-playing.txt`).
3. **Dokunmatik Mobil Kumanda (Mobile Remote):**
   * Yayıncının telefonunu aynı Wi-Fi ağından dokunmatik Elgato Stream Deck gibi kullanmasını sağlayan yerel IP / QR kodlu web kumandası.

---

## 🚀 2. Tamamlanan Aşamalar & Çözülen Sorunlar

### ✅ Aşama 1: MLBB 5-Hero Dinamik Sahne & Overlay Seti
* 5 Şampiyon için tam 16:9 HD oyun çerçevesi, şeffaf oyun boşluğu, özel hero vitrini, skill rehber kartları ve dinamik ses dalgaları oluşturuldu.
* Her şampiyona özel lüks renk paleti, animasyonlu parçacık motoru ve Web Audio API ile çevrimdışı sentetik alert sesleri geliştirildi.
* 5 Temel Sahne (**1. Yayın Başlıyor**, **2. Sohbet & Giriş**, **3. Mola - BRB**, **4. Yayın Bitti**, **5. PC Oyun**) hem Kick hem TikTok için hazırlandı.

### ✅ Aşama 2: OBS 16:9 & Akıllı Auto-Fit Scaler Motoru
* OBS Studio'da tam 1920×1080 piksel 1:1 kayıpsız netlik korunurken, farklı ekran ve pencerelerde taşmayı önleyen `shared/js/auto-fit.js` motoru yazıldı.
* Hem `hero-dynamic.js` hem de `config.js` içine entegre edilerek tüm çözünürlüklerde pürüzsüz sinematik OLED siyah letterbox desteği getirildi.

### ✅ Aşama 3: Mobil Kumanda (Touch Stream Deck) & Yeni Sekme Uyum
* Mobil kumanda dar ekranlarda 2 sütunlu büyük dokunmatik butonlara dönüştürüldü.
* 20 HTML overlay dosyasındaki sabit `width=1920` etiketi `width=device-width` ile değiştirilerek mobilde yatay/dikey tam oturma ve karanlık tema sağlandı.

### ✅ Aşama 4: Electron Hibrit Masaüstü Çift Pencere ve Kapanmama Hatalarının Çözümü
* **Sorun:** Uygulama başlatıldığında HTTP soketinin açık kalması nedeniyle `createWindow()` iki kez tetikleniyor, pencerelerden biri sahipsiz kalarak kapanmıyordu.
* **Çözüm:** Soket kontrolü kilitlendi, tekil pencere koruması (`isCreatingWindow` ve `requestSingleInstanceLock`) getirildi.
* **Önizleme Penceresi:** *"Yeni Sekme"* butonu harici tarayıcıya yönlendirilmek yerine stüdyonun kendi şık, 1280×720 boyutlu yerel önizleme penceresine bağlandı. Bağımsız olarak kapatılabilir hale getirildi.

### ✅ Aşama 5: Responsive Masaüstü Grid Sıkışmasının Çözümü
* **Sorun:** Önizleme iframe'inin CSS Grid içinde 1920px genişlik dayatması sebebiyle pencere daraltıldığında Carmilla ve Atlas ekran dışına taşıyordu.
* **Çözüm:** Iframe mutlak konuma (`position: absolute`) alındı, `.hero-grid` esnek `repeat(auto-fit, minmax(170px, 1fr))` yapısına kavuşturuldu. Artık tüm pencere boyutlarında 5 şampiyon da eksiksiz ve dengeli görüntülenir.

### ✅ Aşama 6: Profesyonel Galeri Sistemi (Kendi Galerim, Ana Galeri & Boş Tuval Stüdyosu)
* **Açılışta Temiz Başlangıç (Standby Modu):** Uygulama ilk açıldığında sahneler doğrudan hazır ve aktif gelmez; kullanıcı **"🗂️ Kendi Galerim"** sekmesinde temiz bir yayın masasıyla ve sağ monitörde **"Yayın Masanız Hazır (Standby)"** ekranıyla karşılanır.
* **🏪 Ana Galeri (Uygulama Mağazası - 20 Şablon):**
  * **5 Şampiyon Sahne Paketi:** Vexana, Zetian, Nana, Carmilla, Atlas.
  * **5 Yayın Akış Sahnesi:** Yayın Başlıyor, Just Chatting, Kısa Mola (BRB), Yayın Bitti, PC Oyun Sahnesi.
  * **6 Modüler Kart & Widget:** Hero Vitrin Kartı, Neon Kamera Çerçevesi, Sosyal Medya Kartı, 4'lü Skill Rehberi Kartı, Now Playing Müzik Kartı, Canlı Takipçi Hedef Barı.
  * **4 Canlı Alert Şablonu:** Yeni Takipçi, VIP Abone, Bağış/Destek, TikTok Hediye.
* **🗂️ Kendi Galerim & Özelleştirme (Edit):** Kullanıcı Ana Galeri'den beğendiği şablonları kendi galerisine kaydedebilir (`user-gallery.json`), **"✏️ Düzenle"** ile başlıklarını, yayıncı adını, renk paletini, sosyal medya hesaplarını ve görünür modüllerini kendine göre değiştirebilir ve **"▶️ Yayına Ver"** ile tek tıkla yayına alabilir.
* **🎨 Boş Tuval (1920×1080 Blank Canvas Builder):** Kullanıcı sıfırdan boş bir 1920×1080 tuval açarak istediği modülleri (Oyun çerçevesi, Kamera, Vitrin, Chat, Müzik, Hedef, Yetenekler, Özel Duyuru Kartı) açıp kapatabilir, ekrandaki konumlarını (`Sol Üst`, `Sağ Alt`, `Alt Orta` vb.) ve neon renklerini seçerek tamamen kendine özgü sahneler oluşturabilir ([`custom-overlay.html`](file:///home/zeus/Desktop/yayın/custom-overlay.html)).

---

## 💻 3. Çift İşletim Sistemi (Linux & Windows) Mimarisi

| Özellik | Linux (Ubuntu / Debian / KDE / GNOME) | Windows (Win 10 / Win 11) |
| :--- | :--- | :--- |
| **Hızlı Başlatıcı** | [`baslat-app.sh`](file:///home/zeus/Desktop/yayın/baslat-app.sh) & [`baslat.sh`](file:///home/zeus/Desktop/yayın/baslat.sh) | [`baslat-app.bat`](file:///home/zeus/Desktop/yayın/baslat-app.bat) & [`baslat.bat`](file:///home/zeus/Desktop/yayın/baslat.bat) |
| **Masaüstü Kısayolu**| `Mira Studio.desktop` (XDG uyumlu) | Windows Masaüstü Kısayolu (`.lnk`) |
| **Uygulama İkonu** | `assets/icon.png` (256x256 RGBA) | `assets/icon.ico` (16x16 - 256x256 Çok Katmanlı) |
| **Masaüstü Çalışma**| %100 Yerel Electron GUI | %100 Yerel Electron GUI |
| **Önizleme Ekranı** | Yerel Bağımsız Electron Penceresi | Yerel Bağımsız Electron Penceresi |
| **Derleme Çıktısı** | `.AppImage` ve `.deb` (`npm run dist:linux`) | `.exe` Installer (NSIS) ve Portable (`npm run dist:win`) |

---

## 📁 4. Proje Dizin Yapısı

```text
/yayın/
├── assets/                  # İkonlar, global stiller ve yardımcı JS dosyaları
│   ├── icon.png             # Linux & Web yüksek çözünürlüklü logo
│   ├── icon.ico             # Windows çok katmanlı uygulama simgesi
│   ├── css/                 # Global font ve tema tanımları
│   └── js/                  # config.js, scene-chat.js vb.
├── kick/                    # Kick platformuna özel 5 Hero ve 5 Sahne
│   ├── vexana/              # In-Game overlay, stiller ve görseller
│   ├── zetian/
│   ├── nana/
│   ├── carmilla/
│   ├── atlas/
│   └── sahneler/            # 1-Yayın Başlıyor, 2-Sohbet, 3-Mola, 4-Bitti, Oyun-PC
├── tiktok/                  # TikTok Live Studio platformuna özel 5 Hero ve 5 Sahne
├── shared/                  # Paylaşılan ortak kütüphaneler
│   ├── css/base.css         # 1920x1080 merkezlenmiş oyun & cam katmanları
│   └── js/                  # auto-fit.js, hero-dynamic.js parçacık & ses motoru
├── baslat-app.sh            # Linux Electron masaüstü başlatıcı
├── baslat.sh                # Linux doğrudan masaüstü app çalıştırıcı
├── baslat-app.bat           # Windows Electron masaüstü başlatıcı
├── baslat.bat               # Windows doğrudan masaüstü app çalıştırıcı
├── main.js                  # Electron ana yaşam döngüsü ve çift pencere yöneticisi
├── server.js                # Yerel HTTP & WebSocket API sunucusu (Port 8080)
├── index.html               # Profesyonel Stream Deck Kontrol Paneli UI
├── package.json             # Bağımlılıklar ve Windows/Linux derleme komutları
├── .gitignore               # Gereksiz ve geçici dosyaları dışlayan kural seti
├── README.md                # Kurulum ve OBS entegrasyon kılavuzu
└── ilerleme.md              # Bu dosya: Mimari, aşamalar ve yol haritası
```

---

## 🔮 5. Gelecek Geliştirmeler & Yol Haritası (Roadmap)

1. **Paketlenmiş Tek Dosya Binary (.exe & .AppImage Derlemesi):**
   * Node.js kurulu olmayan bilgisayarlarda çift tıklamayla çalışabilmesi için `electron-builder` üzerinden tek parça Windows `MiraStudio-Setup.exe` ve Linux `MiraStudio.AppImage` paketlerinin GitHub Releases'a eklenmesi.
2. **Çift Yönlü OBS WebSocket Geri Bildirimi:**
   * Yayıncı OBS arayüzünden sahne değiştirdiğinde, Mira Studio üzerindeki aktif butonun ve görselin otomatik senkronize olması.
3. **Özelleştirilebilir Kısayol Tuşları (Global Hotkeys):**
   * Stüdyo simge durumundayken veya oyundayken (Numpad 1-5 tuşlarıyla) sahne ve alert geçişlerinin yapılabilmesi.
4. **Gelişmiş Ses Kartı & Mikrofon Entegrasyonu:**
   * Tuna ses eklentisine ek olarak yayıncının anlık mikrofon ses dalgasını overlay üzerinde görselleştirme desteği.
