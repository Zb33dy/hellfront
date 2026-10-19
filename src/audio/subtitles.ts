import type { Lang } from '../core/i18n';
import { CAMPAIGN_LINES } from './voiceLinesCampaign';

export interface VoiceLine {
  id: string;
  file: string;
  en: string;
  tr: string;
  /** i18n key of the speaker shown in the subtitle (default: Command). */
  speaker?: string;
  /** Not over the radio: played dry and in the open (boss voices). */
  dry?: boolean;
}

// Radio script for Chapter 1. Audio is English; subtitles in EN/TR.
export const VOICE_LINES: VoiceLine[] = [
  { id: 'v_intro', file: 'voice/v_intro.mp3',
    en: 'Command to Hellfront. Hangar Seven went dark forty minutes ago. Whatever is down there, it is not ours anymore. Find a way through.',
    tr: 'Komuta\'dan Hellfront\'a. Hangar Yedi kırk dakika önce karardı. Aşağıda her ne varsa, artık bizden değil. Bir yol bul.' },
  { id: 'v_contact', file: 'voice/v_contact.mp3',
    en: 'Movement on your deck. Those are not our people anymore. Weapons free.',
    tr: 'Güvertende hareket var. Onlar artık bizim insanlarımız değil. Serbest ateş.' },
  { id: 'v_shotgun', file: 'voice/v_shotgun.mp3',
    en: 'Combat shotgun. Get close and make it count.',
    tr: 'Savaş pompalısı. Yaklaş ve her atışı değerlendir.' },
  { id: 'v_red', file: 'voice/v_red.mp3',
    en: 'East exit is sealed. The deck officer\'s red keycard should be up on the north catwalk. Use the cargo lift.',
    tr: 'Doğu çıkışı mühürlü. Güverte subayının kırmızı kartı kuzey iskelesinde olmalı. Yük asansörünü kullan.' },
  { id: 'v_hangarWave', file: 'voice/v_hangarWave.mp3',
    en: 'Demons detected! Multiple contacts in the hangar. They are coming out of nowhere!',
    tr: 'İblisler tespit edildi! Hangarda çok sayıda hedef. Hiçlikten çıkıp geliyorlar!' },
  { id: 'v_redKey', file: 'voice/v_redKey.mp3',
    en: 'Red keycard confirmed. The red door is on the east wall. Move.',
    tr: 'Kırmızı kart doğrulandı. Kırmızı kapı doğu duvarında. İlerle.' },
  { id: 'v_hangarClear', file: 'voice/v_hangarClear.mp3',
    en: 'Hangar is quiet. Good shooting, marine.',
    tr: 'Hangar sessiz. İyi atıştı, asker.' },
  { id: 'v_chainsword', file: 'voice/v_chainsword.mp3',
    en: 'A chainsword. Old school. Up close, it will tear through anything.',
    tr: 'Zincirli kılıç. Eski usul. Yakın mesafede her şeyi parçalar.' },
  { id: 'v_nukage', file: 'voice/v_nukage.mp3',
    en: 'Nukage processing. That sludge will burn right through your boots. Stay on the walkways. The blue keycard is on the central platform.',
    tr: 'Atık işleme. O çamur postallarını eritir. Yürüme yollarında kal. Mavi kart merkez platformda.' },
  { id: 'v_ambush', file: 'voice/v_ambush.mp3',
    en: 'Ambush! Big ones, closing fast! Get that blade ready!',
    tr: 'Pusu! Büyükler geliyor, hızla yaklaşıyorlar! Kılıcını hazırla!' },
  { id: 'v_secret', file: 'voice/v_secret.mp3',
    en: 'Huh. That room is not on any schematic.',
    tr: 'Hm. O oda hiçbir şemada yok.' },
  { id: 'v_control', file: 'voice/v_control.mp3',
    en: 'Control room is crawling with them. Clear it, and the exit lock will release.',
    tr: 'Kontrol odası onlarla dolu. Temizle, çıkış kilidi açılacak.' },
  { id: 'v_exitOpen', file: 'voice/v_exitOpen.mp3',
    en: 'Lock is open. Get to the transit pad. Now.',
    tr: 'Kilit açıldı. Transit platformuna git. Hemen.' },
  { id: 'v_complete', file: 'voice/v_complete.mp3',
    en: 'Good work, marine. Hangar Seven is clear. Stand by for the next drop.',
    tr: 'İyi iş, asker. Hangar Yedi temiz. Bir sonraki iniş için beklemede kal.' },
  ...CAMPAIGN_LINES,
];

export function lineText(line: VoiceLine, lang: Lang): string {
  return lang === 'tr' ? line.tr : line.en;
}

export function estimateDuration(text: string): number {
  return Math.max(1.6, text.split(/\s+/).length * 0.36 + 0.6);
}
