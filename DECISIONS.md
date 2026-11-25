# Kararlar

- 2026-10-23 — Remotion yerine tek canvas motoru + Playwright kare yakalama + ffmpeg: kurulum gerektirmiyor, deterministik, ~1 dk render.
- 2026-10-23 — Zamanlama sese göre: animasyon ve altyazı süreleri hizalanmış cümle başlangıçlarından türetilir (timing.json). Ses hızlandırılmaz veya kesilmez.
- 2026-10-23 — Hizalama, cümle aralarındaki en uzun N−1 duraklama ile yapılır (ElevenLabs'e cümleler boş satırla ayrılmış gönderilir). Kelime zaman damgası gerekirse ElevenLabs transcribe eklenebilir.
- 2026-10-23 — Ses: ElevenLabs AURA VOX (Türkçe kadın, sakin anlatım), eleven_v4.
- 2026-10-23 — Kalıcı depolama GitHub (bu repo); bulut çalışma ortamı her oturumda sıfırlanır. Video/ses dosyaları git dışında, kullanıcının ~/Movies/glikoz-gunlugu klasöründe arşivlenir.
- 2026-10-23 — Marka adı "Glikoz Günlüğüm". Logo PNG yerine kodla vektör olarak yeniden çizildi (keskinlik + animasyon). Kapanışta krem rozet (logonun orijinal renkleri), altında Kaydet öne çıkan, gerekçeli/sorulu üç çağrı satırı; ikonlar Instagram butonlarıyla çakışmasın diye ortada.
- 2026-10-24 — Logo: kullanıcının orijinal logo görseli (engine/assets/logo.png, logo.js içinde gömülü) her karede sağ üstte rozet, kapakta ve kapanış kartında büyük rozet olarak kullanılır. Vektör yeniden çizim yalnızca görsel yüklenemezse yedek. Daha yüksek çözünürlüklü/SVG dosya gelirse logo.png değiştirilir.
- 2026-10-24 — Varsayılan tema krem: hesabın mevcut feed'i (krem/zeytin/kiremit, zeytin dalı, tepeler, kalın sans) ile uyum için. Dekor kodla çiziliyor; siyah-altın tema `dark` olarak korunuyor. Krem temada UI tık sesleri kapalı, ambiyans kısık; müzik Instagram içinden eklenir.
- 2026-10-24 — Göreli risk insan ızgarasıyla gösterilmez (mutlak risk gibi okunur); göreli risk çubuk karşılaştırmasıyla verilir.
- 2026-10-23 — Görsel dil referans Reels'ten: siyah zemin, altın vurgu, yakut kırmızı, mono etiketler, her sahnede kaynak satırı.
- 2026-10-23 — Ses 60 sn'yi aşarsa yeniden üretmek yerine tam cümleler, cümle arası duraklamanın ortasından çıkarılabilir (hız/ton değişmez). Cümle aralıkları kısaysa hizalama ElevenLabs Scribe kelime zaman damgalarıyla yapılır.
- 2026-11-01 — Sunucu karakter Ceren (tamamen yapay zekâ; gerçek kişi değil): FLUX LoRA (ceren_v1, güç 0,8, guidance 2,0, yüz tarifiyle) + InfiniteTalk 480p (audio_scale 0,5), ses AURA VOX. Hook (≈8–12 sn) ve kapanış Ceren, orta kısım kaynaklı animasyon sahneleri. Hesapta 'AI ile oluşturuldu' etiketi ve açıklamada not. Tek GPU oturumunda toplu üretim; pod her zaman Terminate edilir.
- 2026-11-01 — Sunucu klibi motora video katmanı olarak eklendi (`host`, docs/SCENES.md): klip kare kare açılıp tarayıcıda çizilir, altyazı/rozet/etiket üstte kalır. InfiniteTalk'ta CFG>1 + negatif prompt ComfyUI'da çalışmıyor (multitalk ses katmanı toplu boyut hatası); kalan göz kapanması/dudak büzülmesi kısa `cutaways` ile örtülür. Klip ses hizası çapraz ilintiyle ölçülür (hook voice 0,2 sn, kapanış 47,75 sn).
- 2026-11-13 — `photo` sahne tipi: tam ekran yapay zekâ arka plan (cover-fit, yavaş zoom), üstte beyaz anahtar-kelime hapı, logo rozeti üstte yeniden çizilir; görseller episodes/<ep>/img/ altında, render sırasında data URI olarak gömülür. Marka/ürün adları (Netflix, kola) yalnızca kullanıcının sloganında; RULES'taki 'reklam dili yok' kuralı karşılaştırmalı slogan için kullanıcı kararıyla esnetildi.
- 2026-11-15 — Özen (gerçek yüz, eşinin onayıyla, 'AI ile oluşturuldu' etiketi zorunlu) FLUX LoRA `ozen_v1`: tetikleyici `ohwx_ozen`, 18 gerçek fotoğraf, 2400 adım, kimlik skoru (insightface, gerçek fotoğraf ortalamasına) 800=0.636 · 1200=0.683 · 1600=0.732 · 2000=0.738 · 2400=0.767. Kullanım: LoRA gücü 0.9, FluxGuidance 2.2, prompt'ta 'woman' ve tetikleyici. Eğitim için ComfyUI kapatılır; model adı yerine hf_cache snapshot yolu verilir (HF_HUB_OFFLINE API'ye gidemez). Yeni podda venv/hf_cache soğuk açılır: önce paralel `cat` ile ısıt.
- 2026-11-16 — Özen yürüme→durma→konuşma akışı: FLUX anahtar kare (LoRA 0.9/guidance 2.2) → Wan 2.1 I2V 480p + lightx2v (6 adım, cfg 1, shift 5, CLIP-Vision H, 81 kare/16 fps ≈5 sn) → ikinci I2V son kareden 'yavaşla ve dur' → InfiniteTalk (audio_scale 0.4) B'nin son karesinden. Yürürken dış ses (dudak senkronu yok), durunca kameraya konuşma. Yakın plan için FLUX kadrajı dinlemiyor: yüzü insightface ile bulup 480×832 kırp. RunPod MCP bağlı: komutlar exec-pod ile; şablon ComfyUI'yi kendisi başlatır, ikinci ComfyUI açma (port çakışması konteyneri yeniden başlatır). Özen klon sesi ElevenLabs 'Kuju' (EuQXS0GthjEBfvEvx7qf), Özen'in onayıyla.

- 2026-11-17 — `spike` sahnesine `noBig` seçeneği eklendi: temsili eğride tepe değeri (ör. 176) gerçek ölçüm gibi okunmasın diye büyük sayı gizlenebilir.
- 2026-11-17 — `photo` sahnesi: `source` satırı (beyaz, gölgeli) ve uzun anahtar kelimelerde otomatik font küçültme. AI görseller yalnız giriş/ipucu/ürün sahnelerinde; sayı/kaynak sahneleri grafik kalır. Açıklamaya 'Görseller yapay zekâ ile oluşturulmuştur' notu eklenir.
- 2026-11-18 — Host klibi close sahnesini kapladığında sahnenin `disclaimer` satırları video üstünde (y≈1560, koyu kutu) çizilir; kapanış notu kuralı sunuculu bölümlerde de geçerli.
- 2026-11-18 — Özen yalnızca açık istekle kullanılır (RULES.md). Varsayılan: sunucusuz animasyonlu bölüm, AURA VOX ya da sessiz.
- 2026-11-18 — Son kart: `ctaSize` seçeneği (büyük, sarılı yorum/paylaş satırları). 012'de kullanıcı isteğiyle close sahnesi kaldırıldı; yasal not caption'da.
- 2026-11-19 — `capSize` (altyazı boyutu) eklendi; capSize varken photo kaynak satırı ekranın altına (y=1800) iner, altyazıyla çakışmaz.

## 2026-11-19 — Marka fotoğrafı arka planı (brandBg)
- Krem temada çizili dekor (zeytin dalı, kiremit güneş, tepeler) yerine Muharrem'in verdiği marka fotoğrafı (`engine/assets/bg.jpg`, defter + zeytin dalı + limonlu çay; `engine/bg.js` olarak gömülü) kullanılıyor. Açılış/geçişlerde görünen arka plan, logo/çağrı kartı ve kapak bu fotoğrafla çiziliyor.
- Fotoğraf logoyu (defter) zaten taşıdığı için bu modda köşe rozeti, #id, kapanış kartındaki büyük logo diski ve kapaktaki rozet çizilmiyor; çağrı satırları ve kapak başlığı defterin üstündeki boş krem alanda yarı saydam krem panelde.
- Bundan sonraki tüm paylaşımlar için varsayılan. Eski dekor için episode.json'a `"brandBg": false`.
- Kaynak görsel 510×908 geldi; 1080×1920'ye Lanczos + hafif keskinleştirme ile büyütüldü. Daha yüksek çözünürlüklü sürüm gelirse `bg.jpg`/`bg.js` yenilenecek.
- Photo sahnelerinin overlay'i `photoOverlay()` fonksiyonuna ayrıldı; host klipleri `overlay:'photo'` ile foto sahnesi gibi etiket/rozet/kaynak gösterebiliyor.

## 2026-11-20 — Açılış hook'u
- Reels ilk karede boş arka planla değil, doğrudan hook sahnesiyle açılır: photo sahnesinde `hook:true` (anahtar kelime hapı ilk karede), timing.json'da ilk satır -0.15 sn'den başlar.
- 016: "GÜNDE 15 SİGARA" / "Hiç sigara içmesen bile… sağlığını sigara kadar etkileyebilecek bir şey var." → ardından "Adı: Yalnızlık." (kıyas Holt-Lunstad 2010 yazarlarının açıklaması; kaynak satırı ekranda).
- Kapak (marka arka planı): başlık ve alt başlık aynı font, boyut (76px'ten sığana kadar küçülür) ve renkte (#4E5B34), büyük harf. (2026-11-20)
- Photo sahnesi anahtar kelime hapı: kapak başlığıyla aynı boyut (76px, gerekirse küçülür; `pillSize` ile değişir). 016 altyazı boyutu 62→54. (2026-11-20)
- Sahne geçişi: sonraki sahne photo ise önceki sahne alttan opak kalır, gelen sahne üstüne çapraz geçer; geçişlerde marka arka planı görünmez. (2026-11-20)
- 2026-11-21: Tek AI görselle Reels: aynı görselin 2 kırpımı (z1/z2) sahne çeşitliliği için kullanılır. `statement` sahnesi marka fotoğrafı zemininde okunaksız kaldığı için photo sahneleri tercih edildi. Açıklamada tıbbi not satırı `captionDisclaimer:false` ile kapatılır (Muharrem Instagram'da kendisi yazıyor). Infografik/carousel 1080×1350, krem veil + marka fotoğrafı zemin, Playwright ekran görüntüsü.
- 2026-11-21: photo sahnesine `keywordSub` eklendi: anahtar kelimenin altında, aynı hapta, aynı boyutta devam satırları (uzun hook başlıkları için).
- 2026-11-21: Satır seviyesinde `nocap`: süre ayrılır, altyazı çıkmaz (hook yalnız başlık hapında gösterilirken).
- 2026-11-22: Bölüm düzeyi yerleşim alanları: pillY, capY, srcY, badgeY, srcDark (görselin boş bölgesine yazı yerleştirmek için).
- 2026-11-22: photo sahnesine `verdict` rozeti (DOĞRU yeşil / YANLIŞ kiremit), `verdictLine` ile açılış satırı, bölüm düzeyi `verdictY`.
- 2026-11-22: Bölüm düzeyi `pillPlain`: başlık hapı yazısı düz siyah Inter 700, büyük harf/aralık yok (kullanıcı yeşil kalın büyük harfi sevmedi).
- 2026-11-22: Altyazı kendi sahnesinin dışına taşmaz (bitiş = min(sonraki altyazı, sonraki sahne başı)); verdict rozeti altyazıyla aynı anda (L - LEAD).
- 2026-11-22: Hap yazısı varsayılanı düz siyah (pillPlain varsayılan açık); kullanıcı tüm yeni videolar için istedi.
- 2026-11-23: coverSub içinde ' | ' zorunlu satır kırma (kapakta tek kelimelik yetim satırı önlemek için).
- 2026-11-23: host.capY: sunucu klibi ekrandayken altyazı yüksekliği (yazılar üst yarıdayken yüzü kapatmasın).
- 2026-11-25: Yeni `ctaNote` alanı: son karttaki çağrı satırlarının altına not (ör. 'Detaylar açıklamada'); 028 için istendi.
