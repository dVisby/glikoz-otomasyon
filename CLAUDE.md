# Glikoz Günlüğüm — Reels otomasyonu (Claude için çalışma talimatı)

Muharrem günlük bir konu verir; sen araştırır, senaryoyu yazar, ElevenLabs ile seslendirir, videoyu üretir ve teslim edersin.
Instagram hesabı ve marka: **Glikoz Günlüğüm** (logodaki gibi). Dil: Türkçe. Süre: 40–60 sn. Format: 1080×1920, 30 fps.

## Günlük akış
1. **Araştır.** Konudaki her sayıyı birincil/kurumsal kaynaktan doğrula (DSÖ, ADA, IDF, hakemli makale, TÜRKDEP/TURDEP, ürün etiketi). Kaynağı bulamadığın sayıyı kullanma.
2. **Bölüm aç.** `python3 tools/glikoz.py new <slug> "<Başlık>"` → `episodes/NNN-slug/episode.json`.
3. **Senaryo yaz** (episode.json). 12–18 kısa cümle; her sahneye 1–4 cümle. Sahne tipleri: `docs/SCENES.md`.
   - Ekrandaki her sayı için `source` satırı yaz. Temsili grafikleri "TEMSİLİ" diye etiketle.
   - Küçük çalışmaları büyütme: örneklem küçükse kaynak satırında belirt (ör. "11 KİŞİ").
   - Öneri/sınır ifadelerini kaynaktaki gibi kur ("ideal hedef" ile "üst sınır" farkı gibi).
   - Son sahne her zaman `close` (tıbbi tavsiye değildir notu). Ardından logo + çağrı kartı otomatik eklenir.
   - `cta` yaz: `{"save": "...", "comment": "...", "share": "..."}` — konuya özel; kaydet satırı bir gerekçe, yorum satırı bir soru taşısın.
   - Rakamların okunuşu sorunluysa satıra `"say"` alanı ekle (ör. "yüzde otuz yedi").
4. **Sessiz önizleme.** `python3 tools/glikoz.py preview <ep>` → `out/preview.png`; kontrol et (taşma, çakışma, boş sahne).
5. **Seslendir.** `python3 tools/glikoz.py voicetext <ep>` → voice.txt. ElevenLabs connector:
   `creative_generate_speech(model_id="eleven_v4", voice_id="jk1pqab9OzEmS07w0u2T" /* AURA VOX */, prompt=<voice.txt>)`,
   ardından `creative_get_flow_run_status` ile bekle. Cümleler arasında boş satır bırak (hizalama duraklamalara göre yapılır).
6. **Sesi al.** content_url'yi `curl` ile `episodes/<ep>/voice.mp3` olarak indir.
   storage.googleapis.com engelliyse: kullanıcıdan MP3'ü `~/Movies/glikoz-gunlugu/<ep>/` klasörüne koymasını iste,
   `device_stage_files` ile al.
7. **Hizala.** `python3 tools/glikoz.py align <ep>` → timing.json. Satır sayısı = cümle sayısı olmalı; uyarı çıkarsa contact sheet'te doğrula.
8. **Render.** `python3 tools/glikoz.py render <ep>` → `out/reels.mp4`, `out/kapak.jpg`, `out/aciklama.txt`, `out/contact.png`.
9. **Kontrol (zorunlu).** contact.png'yi aç: her karede altyazı o anki cümleyle eşleşiyor mu, taşma var mı, sayılar doğru mu.
   Kapak görselini aç. Sayıları kaynaklarla bir kez daha karşılaştır.
10. **Teslim.** SendUserFile ile mp4 + kapak + açıklama; masaüstü bağlıysa `~/Movies/glikoz-gunlugu/<ep>/` klasörüne de yaz.
11. **Kayıt.** `RELEASE.md` tablosuna bölümü ekle, `SESSIONS.md`'ye bir satır yaz, commit + push.

## Kurallar
- `RULES.md` içeriği bağlayıcıdır (sağlık içeriği kuralları dahil).
- Tasarım dili sabittir: siyah zemin, altın #C8B07A, yakut #E0344F, IBM Plex Mono etiketler, Jost altyazı. Yeni sahne tipi eklersen `docs/SCENES.md`'yi güncelle ve `DECISIONS.md`'ye yaz.
- Kurulum: `pip install --break-system-packages -r requirements.txt` (Chromium/Playwright ve ffmpeg gerekli; `playwright install` çalıştırma, ortamda hazır).
