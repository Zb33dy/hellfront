import type { VoiceLine } from './subtitles';

const v = (id: string, en: string, tr: string): VoiceLine => ({ id, file: `voice/${id}.mp3`, en, tr });

// Radio script for Chapters 2–5. Same speaker (Command); lines without a recorded file fall back
// to procedural radio chatter, and the subtitle carries the line.
export const CAMPAIGN_LINES: VoiceLine[] = [
  // Chapter 2 — The Foundry
  v('v2_intro', 'Foundry level. The forge crews went silent three days before the outbreak. Now we know why.',
    'Dökümhane katı. Döküm ekipleri salgından üç gün önce sustu. Şimdi nedenini biliyoruz.'),
  v('v2_hall', 'Thermal readings are off the chart. Watch the slag channels. That is molten metal, marine, not water.',
    'Isı değerleri tavan yapmış. Cüruf kanallarına dikkat et. O su değil asker, erimiş metal.'),
  v('v2_ironclad', 'That is one of ours. Or it was. They welded our armor onto it. Bullets will not do much. Use the blade.',
    'O bizden biri. Ya da öyleydi. Zırhımızı üstüne kaynaklamışlar. Mermiler pek işlemez. Kılıcı kullan.'),
  v('v2_key', 'Forge override acquired. Something big just woke up north of you.',
    'Döküm kilidi alındı. Kuzeyinde büyük bir şey uyandı.'),
  v('v2_ante', 'Whatever is behind that door is bigger than anything we have logged. Stock up.',
    'O kapının ardındaki şey kaydettiğimiz her şeyden büyük. İkmalini yap.'),
  v('v2_boss', 'The Warden. It has been running the forge. Take it down!',
    'Gardiyan. Dökümhaneyi o yönetiyormuş. İndir onu!'),
  v('v2_bossDead', 'Warden is down. The freight shaft leads to the lowest level. That is where the signal comes from.',
    'Gardiyan düştü. Yük kuyusu en alt kata iniyor. Sinyal oradan geliyor.'),
  v('v2_complete', 'Foundry is quiet. Hellfront, every reading we have says the bottom of that shaft is alive.',
    'Dökümhane sessiz. Hellfront, elimizdeki her ölçüm o kuyunun dibinin canlı olduğunu söylüyor.'),

  // Chapter 3 — The Breach
  v('v3_intro', 'This is it. The breach is below you. The rock is warm. Keep moving.',
    'İşte burası. Yarık altında. Kaya sıcak. İlerlemeye devam et.'),
  v('v3_exec', 'Heavy contact. Executioner class. Watch the wind-up. When it raises that blade, get out of the way.',
    'Ağır temas. Cellat sınıfı. Hazırlanmasını izle. O kılıcı kaldırdığında yolundan çekil.'),
  v('v3_rift', 'The rift is leaking. The blue clearance card is on the far platform. Do not fall.',
    'Yarık sızıyor. Mavi yetki kartı uzak platformda. Düşme.'),
  v('v3_key', 'Clearance confirmed. They know you are coming.',
    'Yetki onaylandı. Geldiğini biliyorlar.'),
  v('v3_corridor', 'Breach chamber ahead. Marine, if you do not come back, we seal the base with you inside.',
    'Önde yarık odası var. Asker, geri dönmezsen üssü seninle birlikte mühürleriz.'),
  v('v3_core', 'That is the heart of it. Destroy the core and the breach collapses!',
    'İşte kalbi bu. Çekirdeği yok et, yarık çöksün!'),
  v('v3_coreDown', 'Core is down! Wait. Readings are climbing. It is not closing. Get to the pad, now!',
    'Çekirdek düştü! Bekle. Değerler yükseliyor. Kapanmıyor. Platforma git, hemen!'),
  v('v3_complete', 'Hellfront, respond! Hellfront! We are losing your signal!',
    'Hellfront, cevap ver! Hellfront! Sinyalini kaybediyoruz!'),

  // Chapter 4 — The Ashen Gate
  v('v4_intro', 'Hellfront, do you read? We have you. I do not know how, but we have you. Where are you?',
    'Hellfront, duyuyor musun? Seni alıyoruz. Nasıl bilmiyorum ama alıyoruz. Neredesin?'),
  v('v4_camp', 'Those domes. That is Aurora. The first expedition. They went missing forty years ago.',
    'O kubbeler. Bu Aurora. İlk sefer. Kırk yıl önce kaybolmuşlardı.'),
  v('v4_wraith', 'Fast movers! They blink when you aim. Lead your shots, and do not stop moving.',
    'Hızlı hedefler! Nişan aldığında yer değiştiriyorlar. Önünü kestir ve durma.'),
  v('v4_logs', 'Their logs say they did not find the rift. The rift found them. Something was calling.',
    'Kayıtlarına göre yarığı onlar bulmamış. Yarık onları bulmuş. Bir şey çağırıyormuş.'),
  v('v4_redKey', 'Red seal recovered. The gate is on the east ridge.',
    'Kırmızı mühür alındı. Kapı doğu sırtında.'),
  v('v4_pit', 'Bone pit. Those are not demon bones, marine. Those are ours.',
    'Kemik çukuru. Bunlar iblis kemiği değil asker. Bunlar bizim.'),
  v('v4_blueKey', 'Blue seal. That opens the causeway. They are swarming behind you!',
    'Mavi mühür. Bu geçidi açıyor. Arkanda kaynaşıyorlar!'),
  v('v4_causeway', 'There is a citadel at the end of that causeway. The signal is coming from inside.',
    'Geçidin sonunda bir hisar var. Sinyal içeriden geliyor.'),
  v('v4_complete', 'We are building a return window on your beacon. Buy us time. Kill whatever sits on that throne.',
    'İşaretçin üzerinden bir dönüş penceresi kuruyoruz. Bize zaman kazandır. O tahtta ne oturuyorsa öldür.'),

  // Chapter 5 — Throne of Ash
  v('v5_intro', 'This is the last push, Hellfront. Window is at forty percent and climbing.',
    'Bu son hamle, Hellfront. Pencere yüzde kırkta ve yükseliyor.'),
  v('v5_cloister', 'The yellow sigil is in the lava cloister. Watch your footing.',
    'Sarı mühür lav avlusunda. Adımına dikkat et.'),
  v('v5_key', 'Sigil acquired. The throne hall is open. Window at seventy percent.',
    'Mühür alındı. Taht salonu açık. Pencere yüzde yetmişte.'),
  v('v5_throne', 'There it is. The Sovereign. Everything that came through the rift answers to it.',
    'İşte orada. Hükümdar. Yarıktan gelen her şey ona hizmet ediyor.'),
  v('v5_phase', 'It is calling the ground itself! Watch the fire under your feet!',
    'Zemini çağırıyor! Ayağının altındaki ateşe dikkat et!'),
  v('v5_dead', 'It is down! The window is open! Hellfront, come home!',
    'Düştü! Pencere açık! Hellfront, eve dön!'),
  v('v5_complete', 'Welcome home, marine. Welcome home.',
    'Eve hoş geldin asker. Eve hoş geldin.'),
];
