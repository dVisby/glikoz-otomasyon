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
