# Sahne tipleri

Her sahnede `lines` (cümleler) zorunlu. Satır metninde ` | ` altyazıyı ikiye böler (tek cümle, iki ekran). `line`/`subLine`/`bigLine`/`itemsLine` sahne içi satır indeksidir (0'dan başlar). Her sahne `source` alabilir.

| type | Ne gösterir | Parametreler |
|---|---|---|
| `cubes` | Miktar sayacı + şeker küpü ızgarası + sınır çubuğu | `unit`, `perIcon`, `limit`, `limitLabel`, `max`, `steps:[{line, value, label, sub, subLine, source}]` |
| `people` | N kişide k kişi (oran) | `big`, `of`, `k`, `rows`, `label`, `sub` |
| `dots` | Toplam noktadan kaçının işaretli olduğu, sayaçlı | `total`, `highlight`, `cols`, `big?`, `unit?`, `label`, `sub` |
| `bars` | Yatay çubuk karşılaştırması (ör. besinlerdeki şeker) | `unit`, `label`, `items:[{label, value, dec?, red?, line?}]`, `limit?`, `limitLabel?`, `max?`, `big?` |
| `sensor` | CGM sensör kesiti, ölçüm sayacı | `value`, `label` |
| `day` | 24 saatlik glukoz eğrisi, öğün izleri | `label`, `meals:[{h, amp, tau?, label, red?}]`, `base?`, `band?`, `hi?` |
| `spike` | Tek yükseliş + insülin çubukları + sonuç maddeleri | `amp`, `label`, `items`, `itemsLine` |
| `compare` | İki yanıt eğrisi (A kırmızı, B altın) | `a:{amp,label}`, `b:{amp,label}`, `counter`, `prefix`, `suffix`, `bigLine`, `label`, `xLabels?` |
| `flatten` | Eğrinin bir alışkanlıkla yumuşaması | `counter`, `unit`, `label`, `from`, `to`, `steps` |
| `statement` | Genel metin sahnesi: büyük sayı/başlık + madde listesi | `big?`, `unit?`, `red?`, `label?`, `title?`, `bullets:[text | {text, line}]` |
| `close` | Seri kapanışı + yasal not (her bölümde son sahne) | `title`, `disclaimer` |
