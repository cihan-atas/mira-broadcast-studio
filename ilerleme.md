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

### ✅ Aşama 6: Profesyonel Galeri Sistemi (60 Şablonluk Ana Mağaza: Bütün Setler + Kart Türlerine Göre Kategorize Edilmiş Modüller & Bomboş Tuval)
* **Açılışta Temiz Başlangıç (Standby Modu):** Uygulama ilk açıldığında sahneler doğrudan hazır ve aktif gelmez; kullanıcı **"🗂️ Kendi Galerim"** sekmesinde temiz bir yayın masasıyla ve sağ monitörde **"Yayın Masanız Hazır (Standby)"** ekranıyla karşılanır.
* **🏪 Ana Galeri (Uygulama Mağazası - 60 Resmi Şablon & Kart Türü Kategorisi):**
  * **⚔️ 5 Bütün Kahraman Sahne Paketi (`category: 'hero'`):** Vexana, Zetian, Nana, Carmilla ve Atlas'ın tüm kartları bir arada tam sahne setleri.
  * **📺 5 Yayın Akış Sahnesi:** Yayın Başlıyor, Just Chatting, Kısa Mola (BRB), Yayın Bitti, PC Oyun Sahnesi.
  * **🃏 Kart Türlerine Göre Kategorize Edilmiş 46 Tekil Kart (`Vitrin Kartı`, `Kamera Kartı`, `Skill Kartı` vb.):**
    * **🃏 Vitrin Kartları (6 Adet):** Genel + Vexana, Zetian, Nana, Carmilla, Atlas Vitrin Kartları.
    * **📷 Kamera Kartları (6 Adet):** Genel + Vexana, Zetian, Nana, Carmilla, Atlas Kamera Kartları.
    * **⚡ Skill Kartları (6 Adet):** Genel + Vexana, Zetian, Nana, Carmilla, Atlas 4'lü Skill Kartları.
    * **📊 Üst Bar Kartları (5 Adet):** Vexana, Zetian, Nana, Carmilla, Atlas Üst Yayın Barı Kartları.
    * **🎮 Oyun Çerçevesi Kartları (5 Adet):** Vexana, Zetian, Nana, Carmilla, Atlas 16:9 Oyun Çerçeveleri.
    * **🎵 Müzik Kartları (6 Adet):** Genel + Vexana, Zetian, Nana, Carmilla, Atlas Müzik & Ekolayzer Kartları.
    * **🌐 Sosyal Medya Kartları (6 Adet):** Genel + Vexana, Zetian, Nana, Carmilla, Atlas Sosyal Medya Kartları.
    * **💬 Sohbet Kartları (5 Adet):** Vexana, Zetian, Nana, Carmilla, Atlas Canlı Sohbet Kartları.
    * **🎯 Hedef Kartı (1 Adet):** Canlı Takipçi Hedef Barı Kartı.
  * **⚡ 4 Canlı Alert Şablonu:** Yeni Takipçi, VIP Abone, Bağış/Destek, TikTok Hediye.
* **🗂️ Kendi Galerim & Özelleştirme (Edit):** Kullanıcı Ana Galeri'den beğendiği bütün sahneleri veya tekil kahraman parçalarını kendi galerisine kaydedebilir (`user-gallery.json`), **"✏️ Düzenle"** ile başlıklarını, yayıncı adını, renk paletini, sosyal medya hesaplarını ve görünür modüllerini kendine göre değiştirebilir ve **"▶️ Yayına Ver"** ile tek tıkla yayına alabilir.
* **🎨 %100 Bomboş Tuval (1920×1080 Blank Canvas Builder):** Kullanıcı **"🎨 Boş Tuval & Editör"** sekmesine tıkladığında içinde hiçbir hazır kart, orta rehber kutusu veya efekt bulunmayan **%100 bomboş (`1920×1080`)** bir tuval açılır; modül checkbox kalabalığı olmadan doğrudan **🗂️ Kendi Galerim** veya **🏪 Ana Mağaza (40 Kahraman Parçası & Kartlar)** üzerinden istediği kartları **tek tek** tuvaline ekleyip özgürce dizebilir ([`custom-overlay.html`](file:///home/zeus/Desktop/yayın/custom-overlay.html)).

### ✅ Aşama 7: Etkileşimli Sürükle-Bırak, 8 Yönlü Boyutlandırma, Mouse Gezdirmeli 2D Hassas Renk Spektrumu & "Kartı Düzenleme Kartı"
* **Tam Genişlikli İnteraktif Tuval Modu (`studio-visual-editor-mode`):** Kullanıcı **"🎨 Boş Tuval & Editör"** sekmesine geçtiğinde veya galerisindeki herhangi bir sahne/kart üzerinde **"✏️ Düzenle"** butonuna tıkladığında, stüdyo tam genişlikli tek sütun görsel editör moduna geçer ve 1920×1080 canlı tuval fare etkileşimine (`pointer-events: auto`) açılır.
* **Canlı Sürükle-Bırak (Drag & Drop) ve 8 Yönlü Yeniden Boyutlandırma (Resize):**
  * Tuval üzerindeki tüm kartlar (`Vitrin Kartı`, `Kamera Çerçevesi`, `Oyun Çerçevesi`, `Üst Yayın Barı`, `Canlı Sohbet`, `Müzik Kartı`, `Sosyal Medya`, `Yetenek Rehberi`, `Takipçi Hedef Barı`, `Özel Kartlar`) fareyle tutulup 1920×1080 tuvalin istenilen noktasına sürüklenebilir.
  * Merkez hizalama kılavuz çizgileri (`mira-snap-guide-x`, `mira-snap-guide-y`) ile kartlar tuvalin tam ortasına kolayca hizalanır.
  * Seçilen kartın köşelerinde ve kenarlarında beliren **8 yeşil tutamaç (`nw, n, ne, e, se, s, sw, w`)** ile kartın genişliği ve yüksekliği gerçek zamanlı olarak büyütülüp küçültülebilir ([`shared/js/interactive-editor.js`](file:///home/zeus/Desktop/yayın/shared/js/interactive-editor.js)).
* **Karta Tıklayınca Açılan "✏️ Kartı Düzenleme Kartı" (`#mira-card-inspector`):**
  * Tuval üzerindeki herhangi bir karta tıklandığında hemen yanında yüzen **"Kartı Düzenleme Kartı"** açılır:
    1. **📝 Karttaki Yazılar:** Tıklanan kartın içindeki tüm başlıklar, alt başlıklar, etiketler, sosyal medya linkleri ve açıklamalar otomatik algılanır; kullanıcı yazdıkça kart üzerindeki yazı anında canlı olarak değişir.
    2. **🔤 Yazı Fontu & Boyutu:** 8 farklı yayıncı fontu (`Plus Jakarta Sans`, `Orbitron`, `Cinzel Decorative`, `Rajdhani`, `Bebas Neue`, `Montserrat`, `Playfair Display`, `JetBrains Mono`) ve `%70 - %160` arası yazı boyutu ölçeklendirme sürgüsü.
    3. **🖱️ Mouse Gezdirerek Hassas 2D Renk Paleti & Spektrumu (`#mira-spectrum-pad` & `#studio-spectrum-pad`):**
       * Hem stüdyo üst panelinde hem de karta tıklayınca açılan düzenleme kartında **2D Doygunluk/Parlaklık Spektrumu** ve **360° Gökkuşağı Ton (Hue) Şeridi** bulunur.
       * Kullanıcı **mouse'u palet üzerinde gezdirdikçe (`mousemove`)** piksel hassasiyetinde tüm ara tonları canlı olarak görür, anında **HEX (`#a855f7`)** ve **RGB (`rgb(168, 85, 247)`)** kodunu alır ve palete tıklayarak beğendiği rengi **📌 Sabitleyebilir** (`Tıkla=Sabitle / Çöz`) veya tek tıkla (`🟣 Çerçeveye Ver`, `🔤 Başlığa Ver`, `📝 Alt Yazıya Ver`, `🖼️ Arka Plana Ver`, `⚡ Tüm Karta Ver`) uygulayabilir.
       * **12'li Lüks Neon Renk Paleti:** Tek tıkla uygulanabilen hazır yayıncı renk paleti ve ayrı renk seçiciler.
    4. **🖼️ Kart Çerçeve & Arka Plan Tasarımı:** Çerçeve/neon parlama rengi, arka plan rengi, arka plan saydamlığı (`%0 - %100`) ve köşe yuvarlaklığı (`0px - 44px`).
    5. **🖼️ StreamElements Tarzı Resim, GIF, Logo & Arka Plan Görseli Ekleme (`/api/media/*` & `#mira-tb-media`):**
       * **📤 Bilgisayardan (PC'den) Resim / GIF Yükleme (`/api/media/upload`):** Kullanıcı bilgisayarından istediği **PNG, JPG, hareketli GIF, WEBP veya SVG** görselini tek tıkla yükleyebilir; yüklenen görseller `/uploads/` dizinine kalıcı olarak kaydedilir ve **Medya Kütüphanesi (`/api/media/list`)** içinde listelenir.
       * **🌌 1920×1080 Tuvalin (Sahnenin) Arka Planına Resim Ekleme (`widgetOverrides.__canvasBg`):** Bütün sahnenin arka planına PC'den resim yükleme, kütüphaneden seçme veya URL yapıştırma; **Sığdırma Modu** (`Kapla / Cover`, `Sığdır / Contain`, `100% Tam Uzat`, `Döşe / Repeat`), **Opaklık (`%0-%100`)**, **Karartma (`%0-%90`)**, **Bulanıklık (`0px-20px`)** ve **`🗑️ Arka Planı Kaldır (Şeffaf OBS)`** kontrolleri.
       * **🃏 Seçili Kartın Arka Planına veya İçine Resim Ekleme (`ov.bgImage` & `ov.cardImgSrc`):** Herhangi bir karta tıklandığında açılan **"✏️ Kartı Düzenleme Kartı"** içinden o kartın **kendi kutusunun arka planına resim ekleme** (`ov.bgImage`, sığdırma modu ve karartma yüzdesi) veya **kartın içindeki portre/logo görselini değiştirme/ekleme** (`ov.cardImgSrc`).
       * **🖼️ Tuvale Bağımsız Resim / GIF / Logo / Çerçeve Katmanı Ekleme (`cardType: 'image'`):** Tıpkı StreamElements'teki *"Add Static Image / GIF"* gibi, istenilen görseli 1920×1080 tuvale bağımsız bir kart olarak ekleyip fareyle sürükleme ve 8 yönden boyutlandırma.
    6. **📐 Konum, Boyut, Katman Yönetimi & 🗑️ Kartı Tuvalden Silme:**
       * Hassas `X`, `Y`, `Genişlik`, `Yükseklik` kutuları, **⬆️ Öne Getir**, **⬇️ Arkaya Gönder**, **👁️‍🗨️ Kartı Gizle** ve **🗑️ Kartı Tuvalden Sil** kontrolleri.
       * **4 Farklı Yoldan Kart Silme:**
         1. Seçili kartın yeşil üst etiketindeki **`🗑️ Sil`** butonu (`#mira-selection-del-btn`).
         2. Yüzen "Kartı Düzenleme Kartı" içindeki **`🗑️ Kartı Tuvalden Sil`** ve alt çubuktaki **`🗑️ Kartı Sil`** butonları (`#mira-insp-delete`, `#mira-insp-footer-del-btn`).
         3. Tuvalin altındaki **Tuvaldeki Kartlar** listesindeki her kartın yanındaki **`🗑️ Sil`** butonu.
         4. Kart seçiliyken klavyeden **`Delete` veya `Backspace`** tuşu.
    6. **🗂️ Tuvalin Altında Tüm Kartlar Listesi (`#mira-bottom-cards-dock` & `#studio-canvas-cards-bar`) — Basınca Direkt O Karta Odaklansın:**
       * Hem 1920×1080 interaktif tuvalin en altında (`#mira-bottom-cards-dock`) hem de Mira Studio'daki canlı tuval monitörünün hemen altında (`#studio-canvas-cards-bar`) tuval üzerindeki tüm aktif kartlar gerçek zamanlı olarak listelenir.
       * Kullanıcı listedeki herhangi bir karta tıkladığında (`focusWidgetById` / `focusCardOnCanvasFromStudio`), tuval **anında o kartı seçer, etrafında parlak neon odaklanma animasyonu (`mira-focus-flash`) oynatır ve hemen yanında o kartın "✏️ Kartı Düzenleme Kartı"nı açar**.
    7. **🛠️ Hızlı Sıfırlama & Default'a Çekme Merkezi (Seçili Kart veya Tüm Kartlar):**
       * **Sadece Seçili Kart İçin:** `📍 Konumu Default'a Çek`, `📐 Boyutu Sıfırla`, `🎨 Tasarımı Sıfırla`, `🔄 Seçili Kartı Sıfırla`.
       * **Tuvaldeki Tüm Kartlar İçin:** `📍 Tüm Konumları Default'a Çek`, `📐 Tüm Boyutları Sıfırla`, `🎨 Tüm Tasarımı Sıfırla`, `🔄 Tüm Tuvali Sıfırla`.
* **➕ Kendi Galerimden & Ana Mağazadan Yeni Kart Ekleme Modalı (`#mira-add-card-modal`):**
  * **🗂️ 1. Kendi Galerimden Seç:** Kullanıcının kişisel galerisine kaydettiği kartları listeler ve tek tıkla (`➕ Tuvale Ekle`) mevcut tuvalin üzerine ekler.
  * **🏪 2. Ana Mağazadan Keşfet & Galerime Kaydet:** Resmi mağazadaki modüler kartları ve alertleri keşfedip önce **📥 Galerime Kaydet** ile kişisel galeriye kaydetme, ardından kendi galerisinden seçip tuvale yerleştirme akışı sağlar.
  * **✏️ 3. Sıfırdan Özel Yazı Kartı:** Özel başlık ve açıklamayla serbest duyuru kartı ekleme imkanı sunar.
  * Tüm sürükleme, boyutlandırma, yazı ve stil değişiklikleri `user-gallery.json` içindeki `config.widgets` altında kalıcı olarak kaydedilir ve OBS Studio'da birebir aynı şekilde görünür.

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
│   └── js/                  # auto-fit.js, hero-dynamic.js, interactive-editor.js (Sürükle-Boyutlandır & Kart Düzenleyici)
├── custom-overlay.html      # Boş Tuval, Bağımsız Kartlar, Alertler ve Standby Sahne Motoru
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

---

## 🎨 6. Özel Tasarım Atölyesi (Creator Studio) & Hazır Arka Planlar (Tamamlandı)

- **🛠️ Özel Tasarım Atölyesi (Creator Studio / Design Lab):**
  - **🃏 1. Özel Kart Tasarla:** 11 kart tipi/preseti (Vitrin, Kamera, Sohbet, Sosyal, Müzik, Skill, Üst Bar, Oyun Çerçevesi, Hedef, Resim/GIF, Duyuru), özel başlıklar, yayıncı adı, rozetler, avatar/logo yükleme, kart arka plan görseli, 2D hassas renk spektrumu, fontlar, yuvarlaklık ve opaklık ayarları.
  - **🌌 2. Özel Arka Plan Tasarla:** CyberGrid, Nebula, Dark Glass, Gradient ve PC'den Resim/GIF yükleme, karartma slider (%0-%90), bulanıklık (0-20px), parçacık motoru (Ruhlar, Yıldızlar, Kar, Kapalı), tema ve parıltı renkleri.
  - **⚡ 3. Özel Alert Tasarla:** Takipçi, Abone, Bağış, Hediye bildirimleri, başlık, kullanıcı adı, tebrik mesajı, ses efekti ve canlı ses test butonu.
  - **💾 Kendi Galerime Kaydet:** Canlı 16:9 simülasyon sahnesinde anlık önizleme ve 1 tıkla `POST /api/gallery/user` ile kişisel galeriye kaydetme; ardından doğrudan boş tuvale aktarma seçeneği.
- **🌌 Hazır Arka Planlar & Tuval/Edit Entegrasyonu:**
  - 8 resmi hazır arka plan (`Vexana`, `Zetian`, `Nana`, `Carmilla`, `Atlas`, `CyberGrid`, `Nebula`, `Dark Glass`) Mağaza ve Tuval modallarına eklendi.
  - Tuval düzenleme inspector'ına **"💾 Bu Kartı Kendi Galerime Kaydet"** butonu entegre edildi.
  - Kendi Galerim sekmesinde **"🌌 Arka Planlar"** filtresi ve arka planları tuvale uygulama aksiyonları eklendi.


---

## 🚀 7. Kendi Galerim & OBS Sahnelerim Ayrımı (Tamamlandı)

- **Kendi Galerim (Kişisel Tasarım Masası):**
  - Kullanıcının tasarladığı, kaydettiği veya içe aktardığı kart, sahne, arka plan ve alert şablonlarının güvenle depolandığı alan.
  - Sahnelerim'e ekleme, düzenleme, çoğaltma, silme ve `.mira` formatında dışa aktarma yetenekleri burada yer alır.
- **Sahnelerim (OBS Aktif Sahne Masası):**
  - Sadece canlı yayında OBS'e aktarılmak üzere seçilmiş sahneleri barındırır.
  - "Galerimden Sahne Ekle" butonu yalnızca kullanıcının kendi galerisindeki kayıtlı sahneleri listeler, yabancı katalog öğeleriyle karışmaz.

---

## 📦 8. .mira Taşınabilir Şablon Paketi & Gömülü Görsel Motoru (Tamamlandı)

- **Bağımsız Taşınabilir Paket:**
  - Kullanıcı kendi bilgisayarından özel logo, resim veya arka plan yükleyip dışa aktardığında (`GET /api/gallery/export/:id` veya `GET /api/gallery/export-all`), tüm yerel `/uploads/` dosyaları taranır ve pakete Base64 olarak gömülür.
  - Başka bir kullanıcı veya bilgisayar paketi içe aktardığında (`POST /api/gallery/import`), gömülü resimler hedef sistemin `uploads/` dizinine otomatik olarak çıkartılır (`unpackAndRestoreAssets`) ve dosya yolları güncellenir. Sıfır kırık görsel veya 404 hatası garanti edilir.
- **İçe/Dışa Aktarma Deneyimi:**
  - Sürükle-bırak destekli içe aktarma modalı, bütünlük doğrulaması, şablon önizleme kartları ve tek tıkla galeriye yükleme.

---

## 🎨 9. Temiz Galeri İş Akışı & Mükerrer Kayıt Engelleme (Tamamlandı)

- **`🚀 TUVALE EKLE & KULLAN`:** Galeriye ara kayıt atmaz, tasarım doğrudan tuval sahnesine canlı katman olarak aktarılır.
- **`💾 GALERİME KAYDET`:** Yalnızca kullanıcı bilinçli olarak tıkladığında çalışır ve var olan öğeyi üzerine günceller (`PUT /api/gallery/user/:id`).
- **Tuvalde Tekil Sahne Yönetimi:** Düzenleme oturumunda sahne kimliği (`builder-edit-id`) kilitlenerek mükerrer kopyaların oluşması kalıcı olarak engellenmiştir.

---

## 📱 10. Responsive Arayüz Düzeltmeleri & Windows / Linux Çapraz Platform Mimarisi (Tamamlandı)

- **Responsive Buton & Düzen Düzeltmeleri:**
  - Laptop ve kompakt ekranlarda (1366x768, 1280x720/800) konsolun sıkışmaması için ana ızgara breakpoint'i 1320px'e çıkarıldı.
  - Kart altındaki aksiyon butonlarında metinli butonlar esnerken (`flex: 1 1 auto`), ikonlu butonlar (`📤`, `📋`, `⚙️`, `🗑️`) `.btn-icon-only` kuralı ile 36px kare buton olarak sabitlendi; butonların devasa bloklara dönüşüp satır kırması önlendi.
  - Başlık ve araç çubuğu kapsayıcılarına `flex-wrap: wrap; gap: 8px;` eklenerek butonların taşması ve kayması engellendi.
  - Aktif sahneler ızgarasına `.gallery-cards-grid` sınıfı ve `repeat(auto-fill, minmax(290px, 1fr))` uygulanarak otomatik sütun yerleşimi sağlandı.
- **Sohbet TTS Toggle Düzeltmesi:**
  - Sohbet botu arayüzündeki TTS butonunun tıklanır tıklanmaz geri kapanması sorunu; bellek konfigürasyonunun DOM tarafından ezilmesi engellenerek ve iki yönlü senkronizasyon sağlanarak giderildi.
- **Windows ve Linux %100 Çapraz Platform Eşitliği:**
  - **Dinamik Yollar:** Tüm dosya ve dizin erişimleri `path.join()`, `path.normalize()` ve `app.getPath('userData')` ile yürütülür; asla statik Unix (`/`) veya Windows (`\`) kullanılmaz.
  - **OBS WebSocket 5.0:** Standart JSON-RPC WebSocket protokolü her iki işletim sisteminde de yerel `127.0.0.1:4455` portunda tam pariteyle çalışır.
  - **Ses ve Akış:** Edge-TTS ve HTML5 Audio API doğrudan `audio/mpeg` akışı sağladığından Linux veya Windows yerel konuşma motoru farklılıklarından etkilenmez.
  - **Paketleme:** `package.json` içerisinde hem Windows NSIS/portable (`npm run pack:win`, `npm run dist:win`) hem Linux AppImage/deb (`npm run pack:linux`, `npm run dist:linux`) yapılandırmaları tam hazır durumdadır.


---

## 🧭 12. Sekme Renk Hiyerarşisi & "Özel Tasarım" Buton Boyutlandırma Revizyonu (2026-11-04)

- **Basılı Olmayan Sekmelerin Yanlış Renklerde Parlaması Sorununun Çözümü:**
  - **Kök Neden:** HTML içerisinde `tab-btn-design-creator` ve `tab-btn-my-scenes` butonlarına statik inline stillerle mor ve yeşil degradeler ve parlak renkler atanmıştı. `switchTab()` fonksiyonu `.active` sınıfını kaldırsa dahi, HTML seviyesindeki inline stiller CSS'i ezdiği için butonlar sürekli basılı/seçiliymiş gibi parlıyordu ve kullanıcının hangi sekmede olduğunu anlamasını imkansız kılıyordu.
  - **Çözüm:** Tüm butonlardaki inline renkler ve stil ezmeleri tamamen temizlendi. Bütün basılı olmayan sekmeler nötr koyu gri (`rgba(255,255,255,0.035)`, `color: #94a3b8`) baseline stiline çekildi.
  - **Tekil Aktif Vurgusu:** **Yalnızca ve yalnızca kullanıcının tıkladığı aktif sekme** (`.studio-tab-btn.active`) parlak neon zümrüt ve mor degrade, 1.5px `#00f5a0` kenarlık ve neon gölge ile belirginleştirilir. Sayı rozetleri de yalnızca seçili sekmede canlı yeşile döner.
- **Küçük Ekranlarda "Özel Tasarım" Butonunun Aşırı Büyümesi Sorununun Çözümü:**
  - **Kök Neden 1 (Navigasyon Kümeleri & Rozet Şişmesi):** Navigasyon menüsünün 3 ayrı renkli kümeye bölünmesi ve `🛠️ Özel Tasarım Atölyesi [CANVA FORGE]` metninin 35 karakteri aşması; daralan ekranlarda butonun tek başına satırı kaplamasına yol açıyordu.
  - **Kök Neden 2 (`flex: 1 1 auto`):** Kendi Galerim araç çubuğundaki `.btn-gal` öğesi alt satıra kaydığı anda satırın %100'ünü kaplayacak şekilde esniyordu.
  - **Çözüm:** 
    - Ağır küme yapısı kaldırıldı; tek parça, esnek, zarif ve mobil/tablet ekranlarda kaydırılabilir (`overflow-x: auto`) modern birleşik bir sekme çubuğu (`.studio-main-nav`) kuruldu.
    - Buton adı sade `🛠️ Özel Tasarım` olarak kısaltıldı, gereksiz `CANVA FORGE` rozeti kaldırıldı ve `flex: 0 0 auto` kuralıyla ekran daralsa bile butonun devasa bir blok haline gelmesi tamamen engellendi.
    - Kendi Galerim karşılama kutusundaki butonlar da kompakt boyutlara (`padding: 9px 16px; font-size: 12px;`) çekildi.
