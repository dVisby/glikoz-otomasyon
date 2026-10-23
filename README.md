# Glikoz Günlüğü — Reels otomasyonu

Günlük Instagram Reels üretim hattı. Konu → araştırma → senaryo (episode.json) → ElevenLabs seslendirme → sese kilitli animasyon → MP4 + kapak + açıklama.

```
engine/            Canvas sahne kütüphanesi (player.html + scenes.js) ve fontlar
tools/glikoz.py    new · voicetext · preview · align · render
templates/         Boş bölüm şablonu
episodes/NNN-slug/ episode.json (senaryo), timing.json (ses hizası); out/ ve voice.mp3 git dışında
docs/SCENES.md     Sahne tipleri ve parametreleri
```

Takip dosyaları: `SESSIONS.md` (oturumlar), `DECISIONS.md` (kararlar), `RULES.md` (kurallar), `RELEASE.md` (bölüm yayın listesi ve kontroller).
Claude için ayrıntılı akış: `CLAUDE.md`.
