# Sahne tipleri

Her sahnede `lines` (cümleler) zorunlu. Satır metninde ` | ` altyazıyı ikiye böler (tek cümle, iki ekran). `line`/`subLine`/`bigLine`/`itemsLine` sahne içi satır indeksidir (0'dan başlar). Her sahne `source` alabilir.

| type | Ne gösterir | Parametreler |
|---|---|---|
| `cubes` | Miktar sayacı + şeker küpü ızgarası + sınır çubuğu | `unit`, `perIcon`, `limit`, `limitLabel`, `max`, `steps:[{line, value, label, sub, subLine, source}]` |
| `people` | N kişide k kişi (oran) | `big`, `of`, `k`, `rows`, `label`, `sub` |
| `dots` | Toplam noktadan kaçının işaretli olduğu, sayaçlı | `total`, `highlight`, `cols`, `big?`, `unit?`, `label`, `sub`, `shape:"bean"` (fasulye/tane görünümü, iyi=zeytin) |
| `bars` | Yatay çubuk karşılaştırması (ör. besinlerdeki şeker) | `unit`, `label`, `items:[{label, value, dec?, red?, line?}]`, `limit?`, `limitLabel?`, `max?`, `big?` |
| `sensor` | CGM sensör kesiti, ölçüm sayacı | `value`, `label` |
| `day` | 24 saatlik glukoz eğrisi, öğün izleri | `label`, `meals:[{h, amp, tau?, label, red?}]`, `base?`, `band?`, `hi?` |
| `spike` | Tek yükseliş + insülin çubukları + sonuç maddeleri | `amp`, `label`, `items`, `itemsLine`, `noBig?` (temsili eğride tepe sayısını gizler) |
| `compare` | İki yanıt eğrisi (A kırmızı, B altın) | `a:{amp,label}`, `b:{amp,label}`, `counter`, `prefix`, `suffix`, `bigLine`, `label`, `xLabels?` |
| `flatten` | Eğrinin bir alışkanlıkla yumuşaması | `counter`, `unit`, `label`, `from`, `to`, `steps` |
| `statement` | Genel metin sahnesi: büyük sayı/başlık + madde listesi (krem temada ✓ işaretli) | `big?`, `unit?`, `red?`, `label?`, `title?`, `bullets:[text | {text, line}]`, `bowls:[{n, label, red?}]` (tane sayısıyla iki kase karşılaştırması) |
| `photo` | Tam ekran AI görsel arka plan + beyaz anahtar kelime hapı | `img` (episodes/<ep>/ altında yol), `keyword`, `red?`, `source?` (beyaz, gölgeli kaynak satırı), `keywordSub?` (anahtar kelimenin altında, — satıra `{"text":…, "nocap":true}` verilirse süre ayrılır ama altyazı çıkmaz; aynı hapın içinde aynı boyutta devam satırları; uzun hook başlığı için), `hook?` (hap ilk karede hazır; açılış hook'u için, timing'de ilk satır ~ -0.15 sn'den başlatılır) |
| `close` | Seri kapanışı + yasal not (her bölümde son sahne) | `title`, `disclaimer`, `ask?` (grafik altı soru satırı) |

## Sunucu klibi (`host`)
Sahne tipi değil, sahnelerin üstüne bindirilen video katmanı: yapay zekâ sunucunun (Ceren) konuşan klibi tam ekran arka plan olur; altyazı kutusu, logo rozeti, "AI ile oluşturuldu" etiketi ve (sahne `host:true` ise) başlık hapı üstünde çizilir. Altındaki sahneler yine hesaplanır; `cutaways` aralıklarında klip kısa süre gizlenip sahne görünür (klipteki göz kapanması/dudak büzülmesi gibi hataları örtmek için).
`episode.json`:
```
"host": {"name": "Ceren", "note": "AI ile oluşturuldu", "clips": [
  {"id": "hook", "file": "host/hook.mp4", "scenes": [0, 1], "at": 0.6, "dur": 12.7, "end": 12.85, "cutaways": [[9.05, 9.6]]}]}
```
`at` = klibin ilk karesinin video zamanı (klibin ses başlangıcı `voice.mp3` zamanı + 0,4 sn `VOICE_OFFSET`; kesim noktası ses çapraz ilintisiyle bulunur), `scenes` = pencerenin kapsadığı sahneler (`start`/`end` ile ezilebilir), `dur` = klibin kullanılacak süresi (sesten uzun kuyruk kırpılır), `cutaways` = video zamanında [başla, bitir]. Klip dosyaları `episodes/<ep>/host/` altında git dışında tutulur; render sırasında `out/host/<id>/` altına kare kare açılır.

## Temalar
`theme`: `krem` (varsayılan) veya `dark`. Krem: botanik dekor, beyaz kutulu altyazı, logo rozetsiz, sona doğru krem rengine kararma, ambiyans kısık ve tık sesi yok.

## Logo ve çağrı kartı (otomatik)
Son cümleden 0,9 sn sonra 5,6 sn süren kart eklenir: krem rozet üzerinde animasyonlu "Glikoz Günlüğüm" logosu (dalga çizilir, halka atar, G ve yazı belirir), altında üç satır: **Kaydet** (vurgulu), **Yorum**, **Paylaş**. Metinler episode.json `cta` alanından; yoksa genel varsayılanlar kullanılır. Uzun metin otomatik küçültülür.

- Bölüm seviyesinde `ctaNote` (metin) ve `ctaNoteSize` (px, varsayılan 34): çağrı satırlarının altına küçük gri not yazar (ör. "Detaylar açıklamada"); varsa kart paneli biraz uzar.
- Bölüm seviyesinde `ctaSize` (px): son karttaki yorum/paylaş satırlarını bu boyutta, gerekirse birden çok satıra kırarak yazar (Kaydet satırı yokken kullanışlı).
- Bölüm seviyesinde `capSize` (px, varsayılan 50): altyazı yazı boyutu; sessiz/müzikli kullanımda okunabilirlik için 60–64 önerilir.

## Arka plan: marka fotoğrafı
- Krem temada varsayılan arka plan `engine/assets/bg.jpg` (bg.js). Logo/çağrı kartı ve kapak bu fotoğrafla çizilir; köşe rozeti gizlenir.
- `"brandBg": false` → eski çizili dekor (zeytin dalı, güneş, tepeler).
- Host klibinde `"overlay": "photo"` → klip, bağlı olduğu photo sahnesinin etiket, rozet ve kaynak satırıyla çizilir (AI etiketi yok).


**Bölüm düzeyi yerleşim (2026-11-22):** `capY` (altyazı merkezi, varsayılan 1385), `pillY` (photo anahtar kelime hapı, varsayılan 640), `srcY` (photo kaynak satırı, varsayılan 1800), `badgeY` (photo logo rozeti, varsayılan 352), `srcDark` (kaynak satırı koyu renk; açık zeminde). Görselin üst yarısı boşsa yazılar oraya alınır (ör. 018: pillY 315, capY 605, badgeY 130, srcDark — kaynak satırı altta, açık kutu içinde).

**Kapak (2026-11-22):** `coverImg` (bölüm klasöründe görsel yolu; marka fotoğrafı yerine kapak zemini), `coverY` (başlık panelinin dikey merkezi, varsayılan 760).

**Doğru/yanlış sahnesi (2026-11-22):** photo sahnesine `verdict` ("DOĞRU"/"YANLIŞ") verilirse, cevap satırı (`verdictLine`, varsayılan 1) başlarken iddia hapının altında renkli rozet çıkar (yeşil/kiremit). Konum `EP.verdictY` (varsayılan 700). Kalıp: keyword "1." + keywordSub iddia, 1. satır nocap (okuma süresi), 2. satır cevap altyazısı.
- Hap yazısı varsayılan: düz siyah, Inter 700, büyük harfe çevrilmez, gölgesiz. Eski yeşil kalın büyük harf için `"pillPlain": false`.
