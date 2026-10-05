/**
 * Seed data for the e-Mrejesho mockup: sectors, institutions, services, FAQs,
 * regions/districts, the sample account and the seeded submissions.
 * Everything here is restored by "Rejesha data ya mfano" (reset demo data).
 */

export type Language = 'sw' | 'en';
export interface Text {
  sw: string;
  en: string;
}
export const txt = (sw: string, en: string): Text => ({ sw, en });

// ---------------------------------------------------------------------------
// Sectors

export type SectorIcon =
  | 'zap' | 'droplets' | 'landmark' | 'fingerprint' | 'shield' | 'radio-tower' | 'construction' | 'heart-pulse'
  | 'graduation-cap' | 'map' | 'briefcase' | 'trees' | 'bar-chart' | 'leaf' | 'users' | 'gem' | 'fish';

export interface Sector {
  id: string;
  name: Text;
  icon: SectorIcon;
}

export const SECTORS: Sector[] = [
  { id: 'nishati', name: txt('Nishati', 'Energy'), icon: 'zap' },
  { id: 'maji', name: txt('Maji', 'Water'), icon: 'droplets' },
  { id: 'fedha-na-kodi', name: txt('Fedha na Kodi', 'Finance and Tax'), icon: 'landmark' },
  { id: 'utambulisho-na-uhamiaji', name: txt('Utambulisho na Uhamiaji', 'Identity and Immigration'), icon: 'fingerprint' },
  { id: 'ulinzi-na-usalama', name: txt('Ulinzi na Usalama', 'Defence and Security'), icon: 'shield' },
  { id: 'mawasiliano-na-tehama', name: txt('Mawasiliano na Tehama', 'Communication and ICT'), icon: 'radio-tower' },
  { id: 'ujenzi-na-uchukuzi', name: txt('Ujenzi na Uchukuzi', 'Works and Transport'), icon: 'construction' },
  { id: 'afya', name: txt('Afya', 'Health'), icon: 'heart-pulse' },
  { id: 'elimu', name: txt('Elimu', 'Education'), icon: 'graduation-cap' },
  { id: 'ardhi', name: txt('Sekta ya Ardhi', 'Land Sector'), icon: 'map' },
  { id: 'kazi-na-ajira', name: txt('Kazi na Ajira', 'Labour and Employment'), icon: 'briefcase' },
  { id: 'maliasili-na-utalii', name: txt('Maliasili na Utalii', 'Natural Resources and Tourism'), icon: 'trees' },
  { id: 'nyaraka-na-takwimu', name: txt('Nyaraka na Takwimu', 'Records and Statistics'), icon: 'bar-chart' },
  { id: 'mazingira', name: txt('Sekta ya Mazingira', 'Environment Sector'), icon: 'leaf' },
  { id: 'maendeleo-ya-jamii', name: txt('Maendeleo ya Jamii', 'Community Development'), icon: 'users' },
  { id: 'madini', name: txt('Sekta ya Madini', 'Mining Sector'), icon: 'gem' },
  { id: 'mifugo-na-uvuvi', name: txt('Mifugo na Uvuvi', 'Livestock and Fisheries'), icon: 'fish' },
];

export const sectorById = (id: string | undefined) => SECTORS.find((s) => s.id === id);

// ---------------------------------------------------------------------------
// Institutions

export interface Service {
  id: string;
  name: Text;
}

export interface Faq {
  id: string;
  q: Text;
  a: Text;
}

export interface Institution {
  id: string;
  short: string;
  full: string;
  sector: string;
  services: Service[];
  phone: string;
  email: string;
  /** Coloured initials badge; otherwise the coat of arms is shown. */
  badge?: { initials: string; color: string };
  faqs: Faq[];
}

const S = (id: string, sw: string, en: string): Service => ({ id, name: txt(sw, en) });
const F = (id: string, qsw: string, asw: string, qen: string, aen: string): Faq => ({ id, q: txt(qsw, qen), a: txt(asw, aen) });

let phoneSeed = 211;
function inst(
  id: string,
  short: string,
  full: string,
  sector: string,
  services: Service[],
  extra: Partial<Pick<Institution, 'phone' | 'email' | 'badge' | 'faqs'>> = {},
): Institution {
  phoneSeed += 37;
  return {
    id,
    short,
    full,
    sector,
    services,
    phone: extra.phone ?? `+255 22 2${String(phoneSeed).padStart(3, '0')} ${String(1000 + ((phoneSeed * 53) % 9000)).slice(0, 4)}`,
    email: extra.email ?? `info@${id.replace(/[^a-z0-9]/g, '')}.go.tz`,
    badge: extra.badge,
    faqs: extra.faqs ?? [],
  };
}

const tbcServices = (z: string) => [
  S(`${z}-radio`, 'Matangazo ya redio', 'Radio broadcasting'),
  S(`${z}-tv`, 'Matangazo ya televisheni', 'Television broadcasting'),
  S(`${z}-signal`, 'Mawimbi na usikivu', 'Signal and reception'),
];

const TBC_ZONES: [string, string, string][] = [
  ['tbc-southern', 'TBC-SOUTHERN ZONE', 'SOUTHERN ZONE'],
  ['tbc-central', 'TBC-CENTRAL ZONE', 'CENTRAL ZONE'],
  ['tbc-northern', 'TBC-NORTHERN ZONE', 'NORTHERN ZONE'],
  ['tbc-western', 'TBC-WESTERN ZONE', 'WESTERN ZONE'],
  ['tbc-eastern', 'TBC - EASTERN ZONE', 'EASTERN ZONE'],
  ['tbc-southern-highland', 'TBC-SOUTHERN HIGHLAND ZONE', 'SOUTHERN HIGHLAND ZONE'],
  ['tbc-lake', 'TBC-LAKE ZONE', 'LAKE ZONE'],
  ['tbc-lake-nyasa', 'TBC-LAKE NYASA ZONE', 'LAKE NYASA ZONE'],
  ['tbc-zanzibar', 'TBC - ZANZIBAR ZONE', 'ZANZIBAR ZONE'],
];

export const INSTITUTIONS: Institution[] = [
  // --- Nishati
  inst('tanesco', 'TANESCO', 'Shirika la Umeme Tanzania', 'nishati', [
    S('tanesco-outage', 'Kukatika kwa umeme', 'Power outage'),
    S('tanesco-luku', 'Huduma za LUKU', 'LUKU prepaid meters'),
    S('tanesco-connection', 'Maunganisho mapya ya umeme', 'New electricity connection'),
    S('tanesco-billing', 'Bili na malipo', 'Bills and payments'),
    S('tanesco-safety', 'Usalama wa miundombinu ya umeme', 'Electrical infrastructure safety'),
  ], {
    phone: '0748 550 000',
    email: 'customer.service@tanesco.co.tz',
    badge: { initials: 'TN', color: '#0b62a4' },
    faqs: [
      F('tanesco-faq-1',
        'Nifanye nini umeme ukikatika katika eneo langu?',
        'Piga simu kituo cha huduma kwa wateja 0748 550 000 (bure saa 24) au wasilisha lalamiko kupitia e-Mrejesho ukieleza mkoa, wilaya na mtaa wako. Taarifa hupelekwa moja kwa moja kwa mafundi wa TANESCO wa eneo husika.',
        'What should I do when there is a power outage in my area?',
        'Call the customer service centre on 0748 550 000 (free, 24 hours) or submit a complaint through e-Mrejesho stating your region, district and street. The report goes directly to the TANESCO technicians for that area.'),
      F('tanesco-faq-2',
        'Ninawezaje kununua LUKU kwa simu?',
        'Tumia M-Pesa, Mixx by Yas, Airtel Money, HaloPesa au benki: chagua Lipa Bili, kisha LUKU, weka namba ya mita na kiasi. Utapokea tokeni ya tarakimu 20 kwa SMS.',
        'How can I buy LUKU with my phone?',
        'Use M-Pesa, Mixx by Yas, Airtel Money, HaloPesa or your bank: choose Pay Bill, then LUKU, enter the meter number and the amount. You will receive a 20-digit token by SMS.'),
      F('tanesco-faq-3',
        'Ninaombaje kuunganishiwa umeme?',
        'Omba kupitia mfumo wa NIKONEKT au ofisi ya TANESCO iliyo karibu: jaza fomu, ambatisha nakala ya kitambulisho cha NIDA na ramani ya eneo, kisha lipia gharama ya maunganisho kwa namba ya malipo utakayopewa.',
        'How do I apply for an electricity connection?',
        'Apply through the NIKONEKT system or the nearest TANESCO office: fill in the form, attach a copy of your NIDA ID and a sketch map of the site, then pay the connection fee with the control number you are given.'),
      F('tanesco-faq-4',
        'Mita yangu ya LUKU haikubali tokeni, nifanye nini?',
        'Hakikisha umeingiza tarakimu zote 20 kwa usahihi. Ikiendelea kukataa, wasiliana na huduma kwa wateja ukiwa na namba ya mita na tokeni uliyopokea.',
        'My LUKU meter does not accept the token. What should I do?',
        'Make sure you entered all 20 digits correctly. If it still refuses, contact customer service with your meter number and the token you received.'),
    ],
  }),
  inst('rea', 'REA', 'Wakala wa Nishati Vijijini', 'nishati', [
    S('rea-rural', 'Umeme vijijini', 'Rural electrification'),
    S('rea-connection', 'Maunganisho ya REA', 'REA connections'),
    S('rea-renewable', 'Miradi ya nishati jadidifu', 'Renewable energy projects'),
  ], { badge: { initials: 'RE', color: '#2e7d32' } }),
  inst('ewura', 'EWURA', 'Mamlaka ya Udhibiti wa Huduma za Nishati na Maji', 'nishati', [
    S('ewura-fuel-prices', 'Bei za mafuta', 'Fuel prices'),
    S('ewura-fuel-quality', 'Ubora wa mafuta', 'Fuel quality'),
    S('ewura-tariffs', 'Bei za umeme na maji', 'Electricity and water tariffs'),
    S('ewura-licensing', 'Leseni', 'Licensing'),
  ], { badge: { initials: 'EW', color: '#1565c0' } }),

  // --- Maji
  inst('dawasa', 'DAWASA', 'Mamlaka ya Majisafi na Usafi wa Mazingira Dar es Salaam', 'maji', [
    S('dawasa-supply', 'Upatikanaji wa maji', 'Water supply'),
    S('dawasa-billing', 'Bili za maji', 'Water bills'),
    S('dawasa-connection', 'Maunganisho mapya ya maji', 'New water connection'),
    S('dawasa-leak', 'Uvujaji wa mabomba', 'Pipe leaks'),
    S('dawasa-sewerage', 'Majitaka', 'Sewerage'),
  ], {
    phone: '0800 110 064',
    email: 'info@dawasa.go.tz',
    badge: { initials: 'DW', color: '#0277bd' },
    faqs: [
      F('dawasa-faq-1',
        'Nifanye nini maji yakikosekana mtaani kwangu?',
        'Toa taarifa kupitia namba ya bure 0800 110 064 au wasilisha lalamiko kupitia e-Mrejesho ukieleza wilaya na mtaa. DAWASA itatoa taarifa ya chanzo cha tatizo na muda wa kurejesha huduma.',
        'What should I do when there is no water in my street?',
        'Report it on the free number 0800 110 064 or submit a complaint through e-Mrejesho stating your district and street. DAWASA will tell you the cause and when the service will be restored.'),
      F('dawasa-faq-2',
        'Ninawezaje kulipia bili ya maji?',
        'Lipa kwa namba ya malipo (control number) iliyo kwenye bili yako kupitia simu ya mkononi au benki. Unaweza pia kupata namba ya malipo kwa kupiga *152*00#.',
        'How can I pay my water bill?',
        'Pay with the control number on your bill through mobile money or a bank. You can also get the control number by dialling *152*00#.'),
      F('dawasa-faq-3',
        'Ninaombaje kuunganishiwa maji?',
        'Jaza fomu ya maombi katika ofisi ya DAWASA ya eneo lako au mtandaoni, ambatisha kitambulisho na barua ya Serikali ya Mtaa. Utapimiwa na kupewa makadirio ya gharama ndani ya siku 7.',
        'How do I apply for a water connection?',
        'Fill in the application form at your local DAWASA office or online, and attach your ID and a letter from the street government. The site will be surveyed and you will receive a cost estimate within 7 days.'),
      F('dawasa-faq-4',
        'Bili yangu ni kubwa kuliko matumizi, nifanye nini?',
        'Omba usomaji upya wa mita kupitia ofisi ya huduma kwa wateja au e-Mrejesho. Uhakiki hufanyika ndani ya siku 7 na marekebisho huonekana kwenye bili inayofuata.',
        'My bill is higher than my usage. What should I do?',
        'Request a meter re-reading at the customer service office or through e-Mrejesho. It is checked within 7 days and any correction appears on the next bill.'),
    ],
  }),
  inst('ruwasa', 'RUWASA', 'Wakala wa Usambazaji Maji na Usafi wa Mazingira Vijijini', 'maji', [
    S('ruwasa-supply', 'Maji vijijini', 'Rural water supply'),
    S('ruwasa-water-points', 'Vituo vya kuchotea maji', 'Water points'),
    S('ruwasa-projects', 'Miradi ya maji', 'Water projects'),
  ], { badge: { initials: 'RW', color: '#00838f' } }),

  // --- Fedha na Kodi
  inst('tra', 'TRA', 'Mamlaka ya Mapato Tanzania', 'fedha-na-kodi', [
    S('tra-tin', 'Usajili wa TIN', 'TIN registration'),
    S('tra-efd', 'Risiti za EFD', 'EFD receipts'),
    S('tra-property-tax', 'Kodi ya majengo', 'Property tax'),
    S('tra-customs', 'Forodha', 'Customs'),
    S('tra-vehicle', 'Usajili wa magari', 'Vehicle registration'),
  ], {
    phone: '0800 750 075',
    email: 'services@tra.go.tz',
    badge: { initials: 'TRA', color: '#c79100' },
    faqs: [
      F('tra-faq-1',
        'Ninawezaje kupata TIN?',
        'Omba TIN mtandaoni kupitia mfumo wa TRA ukitumia Namba ya Utambulisho wa Taifa (NIN) ya NIDA. TIN ya mtu binafsi hutolewa bila malipo na hutumwa kwa barua pepe.',
        'How can I get a TIN?',
        'Apply for a TIN online through the TRA system using your NIDA National ID Number (NIN). A personal TIN is free of charge and is sent by email.'),
      F('tra-faq-2',
        'Ninalipaje kodi ya majengo?',
        'Pata namba ya malipo kwa kupiga *152*00# na kuchagua Kodi ya Majengo, au kupitia benki, ukitumia namba ya mita ya LUKU ya jengo husika.',
        'How do I pay property tax?',
        'Get a control number by dialling *152*00# and choosing Property Tax, or through a bank, using the LUKU meter number of the building.'),
      F('tra-faq-3',
        'Ninawezaje kupata cheti cha ukaaji wa kodi (Tax Clearance)?',
        'Omba kupitia ofisi ya TRA au mtandaoni baada ya kuwasilisha ritani zote na kulipa kodi zote zinazodaiwa.',
        'How can I get a tax clearance certificate?',
        'Apply at a TRA office or online after filing all returns and paying all outstanding taxes.'),
      F('tra-faq-4',
        'Nifanye nini nikipewa risiti isiyo ya EFD?',
        'Dai risiti halali ya EFD kila unaponunua. Toa taarifa kwa TRA kupitia namba ya bure 0800 750 075 au e-Mrejesho, ukitaja jina la biashara na mahali ilipo.',
        'What should I do if I am given a non-EFD receipt?',
        'Always ask for a valid EFD receipt. Report it to TRA on the free number 0800 750 075 or through e-Mrejesho, giving the business name and location.'),
    ],
  }),
  inst('bot', 'BoT', 'Benki Kuu ya Tanzania', 'fedha-na-kodi', [
    S('bot-currency', 'Sarafu na noti', 'Currency and banknotes'),
    S('bot-complaints', 'Malalamiko dhidi ya benki', 'Complaints against banks'),
    S('bot-securities', 'Dhamana za Serikali', 'Government securities'),
  ]),

  // --- Utambulisho na Uhamiaji
  inst('nida', 'NIDA', 'Mamlaka ya Vitambulisho vya Taifa', 'utambulisho-na-uhamiaji', [
    S('nida-registration', 'Usajili wa vitambulisho', 'ID registration'),
    S('nida-collection', 'Kuchukua kitambulisho', 'ID card collection'),
    S('nida-nin', 'Namba ya Utambulisho (NIN)', 'National ID number (NIN)'),
    S('nida-replacement', 'Kitambulisho mbadala', 'Replacement ID card'),
    S('nida-correction', 'Marekebisho ya taarifa', 'Correction of details'),
  ], {
    phone: '0800 117 777',
    email: 'info@nida.go.tz',
    badge: { initials: 'NIDA', color: '#1b5e20' },
    faqs: [
      F('nida-faq-1',
        'Ninawezaje kupata Namba ya Utambulisho wa Taifa (NIN)?',
        'Jisajili katika ofisi ya NIDA ya wilaya yako ukiwa na cheti cha kuzaliwa na nyaraka za uthibitisho. Baada ya usajili, unaweza kupata namba yako ya NIN kwa kupiga *152*00# na kuchagua NIDA, au kupitia tovuti ya NIDA kwa kuweka majina yako na tarehe ya kuzaliwa.',
        'How can I get my National Identification Number (NIN)?',
        'Register at the NIDA office in your district with your birth certificate and supporting documents. After registration you can get your NIN by dialling *152*00# and choosing NIDA, or on the NIDA website by entering your names and date of birth.'),
      F('nida-faq-2',
        'Kitambulisho changu kiko tayari, nitakichukuaje?',
        'Fika katika ofisi ya NIDA ya wilaya ulipojisajilia ukiwa na nakala ya fomu ya usajili au namba yako ya NIN. Kitambulisho hukabidhiwa kwa mwenye kitambulisho mwenyewe tu.',
        'My ID card is ready. How do I collect it?',
        'Go to the NIDA office in the district where you registered with a copy of your registration form or your NIN. The card is only handed to the card holder in person.'),
      F('nida-faq-3',
        'Nimepoteza kitambulisho changu, nifanye nini?',
        'Toa taarifa polisi upate taarifa ya upotevu (Loss Report), kisha omba kitambulisho mbadala katika ofisi ya NIDA na ulipe ada ya TZS 20,000.',
        'I have lost my ID card. What should I do?',
        'Report the loss to the police to get a Loss Report, then apply for a replacement card at a NIDA office and pay the fee of TZS 20,000.'),
      F('nida-faq-4',
        'Ni nyaraka gani zinahitajika kujisajili?',
        'Cheti cha kuzaliwa pamoja na mojawapo ya hizi: cheti cha elimu, pasipoti, kadi ya mpiga kura au barua ya utambulisho kutoka Serikali ya Mtaa.',
        'Which documents are needed to register?',
        'A birth certificate together with one of these: an education certificate, a passport, a voter card or an introduction letter from the street government.'),
    ],
  }),
  inst('uhamiaji', 'Uhamiaji', 'Idara ya Uhamiaji Tanzania', 'utambulisho-na-uhamiaji', [
    S('uhamiaji-passport', 'Pasipoti', 'Passports'),
    S('uhamiaji-visa', 'Visa', 'Visas'),
    S('uhamiaji-permits', 'Vibali vya ukaazi', 'Residence permits'),
    S('uhamiaji-citizenship', 'Uraia', 'Citizenship'),
  ]),
  inst('rita', 'RITA', 'Wakala wa Usajili, Ufilisi na Udhamini', 'utambulisho-na-uhamiaji', [
    S('rita-birth', 'Vyeti vya kuzaliwa', 'Birth certificates'),
    S('rita-death', 'Vyeti vya vifo', 'Death certificates'),
    S('rita-marriage', 'Usajili wa ndoa', 'Marriage registration'),
    S('rita-trustees', 'Udhamini', 'Trustees'),
  ], { badge: { initials: 'RT', color: '#6a1b9a' } }),

  // --- Ulinzi na Usalama
  inst('polisi', 'Polisi', 'Jeshi la Polisi Tanzania', 'ulinzi-na-usalama', [
    S('polisi-report', 'Kutoa taarifa ya uhalifu', 'Reporting a crime'),
    S('polisi-traffic', 'Usalama barabarani', 'Road safety'),
    S('polisi-loss', 'Taarifa ya upotevu', 'Loss report'),
    S('polisi-conduct', 'Mwenendo wa askari', 'Police conduct'),
  ], { phone: '112' }),
  inst('zimamoto', 'Zimamoto', 'Jeshi la Zimamoto na Uokoaji', 'ulinzi-na-usalama', [
    S('zimamoto-fire', 'Uzimaji Moto', 'Firefighting'),
    S('zimamoto-rescue', 'Maokozi', 'Rescue'),
    S('zimamoto-inspection', 'Ukaguzi wa kinga ya moto', 'Fire safety inspection'),
  ], { phone: '114' }),

  // --- Mawasiliano na Tehama
  inst('ttcl-ruvuma', 'TTCL - RUVUMA', 'Tanzania Telecommunication Company Ltd - Ruvuma', 'mawasiliano-na-tehama', [
    S('ttcl-ruvuma-internet', 'Intaneti', 'Internet'),
    S('ttcl-ruvuma-phone', 'Huduma za simu', 'Phone services'),
    S('ttcl-ruvuma-billing', 'Bili', 'Billing'),
  ]),
  ...TBC_ZONES.map(([id, short, zone]) =>
    inst(id, short, `Tanzania Broadcasting Corporation - ${zone}`, 'mawasiliano-na-tehama', tbcServices(id)),
  ),
  inst('habari-maelezo', 'HABARI MAELEZO', 'Information Service Department', 'mawasiliano-na-tehama', [
    S('maelezo-press', 'Taarifa kwa vyombo vya habari', 'Press releases'),
    S('maelezo-accreditation', 'Ithibati ya waandishi wa habari', 'Press accreditation'),
    S('maelezo-info', 'Habari za Serikali', 'Government information'),
  ]),
  inst('pdpc', 'PDPC', 'Tume ya Ulinzi wa Taarifa Binafsi', 'mawasiliano-na-tehama', [
    S('pdpc-complaint', 'Malalamiko ya faragha', 'Privacy complaints'),
    S('pdpc-registration', 'Usajili wa wakusanyaji taarifa', 'Data controller registration'),
    S('pdpc-awareness', 'Elimu kwa umma', 'Public awareness'),
  ], { badge: { initials: 'PDPC', color: '#283593' } }),
  inst('tcra', 'TCRA', 'Mamlaka ya Mawasiliano Tanzania', 'mawasiliano-na-tehama', [
    S('tcra-sim', 'Usajili wa laini za simu', 'SIM card registration'),
    S('tcra-fraud', 'Utapeli mtandaoni', 'Online fraud'),
    S('tcra-quality', 'Ubora wa huduma za mawasiliano', 'Quality of communication services'),
    S('tcra-broadcasting', 'Utangazaji', 'Broadcasting'),
  ], { badge: { initials: 'TCRA', color: '#00695c' } }),
  inst('ttcl', 'TTCL', 'Tanzania Telecommunication Corporation', 'mawasiliano-na-tehama', [
    S('ttcl-internet', 'Intaneti', 'Internet'),
    S('ttcl-phone', 'Simu za mezani na mkononi', 'Fixed and mobile phones'),
    S('ttcl-billing', 'Bili', 'Billing'),
  ], { badge: { initials: 'TTCL', color: '#0d47a1' } }),
  inst('ega', 'eGA', 'Mamlaka ya Serikali Mtandao', 'mawasiliano-na-tehama', [
    S('ega-systems', 'Mifumo ya Serikali Mtandao', 'e-Government systems'),
    S('ega-email', 'Barua pepe za Serikali', 'Government email'),
    S('ega-support', 'Msaada wa kiufundi', 'Technical support'),
  ], { email: 'barua@ega.go.tz', badge: { initials: 'eGA', color: '#0089c7' } }),

  // --- Ujenzi na Uchukuzi
  inst('tanroads', 'TANROADS', 'Wakala wa Barabara Tanzania', 'ujenzi-na-uchukuzi', [
    S('tanroads-damage', 'Uharibifu wa barabara', 'Road damage'),
    S('tanroads-bridges', 'Madaraja', 'Bridges'),
    S('tanroads-weighbridge', 'Mizani', 'Weighbridges'),
    S('tanroads-reserve', 'Hifadhi ya barabara', 'Road reserve'),
    S('tanroads-projects', 'Miradi ya barabara', 'Road projects'),
  ], {
    email: 'tanroadshq@tanroads.go.tz',
    badge: { initials: 'TR', color: '#e65100' },
    faqs: [
      F('tanroads-faq-1',
        'Nitatoaje taarifa ya barabara iliyoharibika?',
        'Wasilisha lalamiko kupitia e-Mrejesho au ofisi ya Meneja wa TANROADS wa mkoa, ukieleza jina la barabara, eneo na aina ya uharibifu (mashimo, daraja, mifereji).',
        'How do I report a damaged road?',
        'Submit a complaint through e-Mrejesho or at the regional TANROADS Manager\'s office, stating the road name, the location and the kind of damage (potholes, bridge, drainage).'),
      F('tanroads-faq-2',
        'TANROADS inahusika na barabara zipi?',
        'TANROADS inasimamia barabara kuu (trunk roads) na barabara za mikoa. Barabara za wilaya na mitaa husimamiwa na TARURA.',
        'Which roads is TANROADS responsible for?',
        'TANROADS manages trunk roads and regional roads. District and street roads are managed by TARURA.'),
      F('tanroads-faq-3',
        'Ninaombaje kibali cha kufanya kazi ndani ya hifadhi ya barabara?',
        'Wasilisha maombi kwa Meneja wa TANROADS wa mkoa pamoja na michoro ya eneo na maelezo ya kazi. Kibali hutolewa baada ya ukaguzi wa eneo.',
        'How do I apply for a permit to work inside the road reserve?',
        'Submit an application to the regional TANROADS Manager with site drawings and a description of the work. The permit is issued after a site inspection.'),
      F('tanroads-faq-4',
        'Mizani ya magari inafanyaje kazi?',
        'Magari yenye uzito zaidi ya tani 3.5 hupimwa kwenye mizani. Kuzidisha uzito ni kosa chini ya Sheria ya Udhibiti wa Uzito wa Magari ya Afrika Mashariki ya mwaka 2016.',
        'How do weighbridges work?',
        'Vehicles over 3.5 tonnes are weighed at weighbridges. Overloading is an offence under the East African Community Vehicle Load Control Act, 2016.'),
    ],
  }),
  inst('latra', 'LATRA', 'Mamlaka ya Udhibiti Usafiri Ardhini', 'ujenzi-na-uchukuzi', [
    S('latra-fares', 'Nauli', 'Fares'),
    S('latra-licensing', 'Leseni za usafirishaji', 'Transport licences'),
    S('latra-conduct', 'Huduma za mabasi na bodaboda', 'Bus and motorcycle taxi services'),
  ], { badge: { initials: 'LT', color: '#ad1457' } }),
  inst('trc', 'TRC', 'Shirika la Reli Tanzania', 'ujenzi-na-uchukuzi', [
    S('trc-tickets', 'Tiketi za treni', 'Train tickets'),
    S('trc-sgr', 'Huduma za SGR', 'SGR services'),
    S('trc-cargo', 'Mizigo', 'Cargo'),
  ], { badge: { initials: 'TRC', color: '#4e342e' } }),
  inst('dart', 'DART', 'Wakala wa Mabasi Yaendayo Haraka Dar es Salaam', 'ujenzi-na-uchukuzi', [
    S('dart-service', 'Huduma za mabasi ya mwendokasi', 'BRT bus service'),
    S('dart-cards', 'Kadi za usafiri', 'Travel cards'),
    S('dart-stations', 'Vituo', 'Stations'),
  ], { badge: { initials: 'DT', color: '#00897b' } }),

  // --- Afya
  inst('msd', 'MSD', 'Bohari ya Dawa', 'afya', [
    S('msd-supply', 'Upatikanaji wa dawa', 'Availability of medicines'),
    S('msd-equipment', 'Vifaa tiba', 'Medical equipment'),
    S('msd-orders', 'Maagizo ya vituo vya afya', 'Health facility orders'),
  ], { badge: { initials: 'MSD', color: '#2e7d32' } }),
  inst('nhif', 'NHIF', 'Mfuko wa Taifa wa Bima ya Afya', 'afya', [
    S('nhif-membership', 'Uanachama', 'Membership'),
    S('nhif-cards', 'Kadi za bima ya afya', 'Health insurance cards'),
    S('nhif-claims', 'Huduma vituoni na madai', 'Facility services and claims'),
  ], { badge: { initials: 'NHIF', color: '#1565c0' } }),
  inst('muhimbili', 'MNH', 'Hospitali ya Taifa Muhimbili', 'afya', [
    S('mnh-outpatient', 'Huduma za wagonjwa wa nje', 'Outpatient services'),
    S('mnh-appointments', 'Miadi ya madaktari bingwa', 'Specialist appointments'),
    S('mnh-billing', 'Malipo ya matibabu', 'Medical bills'),
    S('mnh-customer', 'Huduma kwa wateja', 'Customer care'),
  ]),

  // --- Elimu
  inst('heslb', 'HESLB', 'Bodi ya Mikopo ya Wanafunzi wa Elimu ya Juu', 'elimu', [
    S('heslb-application', 'Maombi ya mkopo', 'Loan applications'),
    S('heslb-allocation', 'Upangaji wa mkopo', 'Loan allocation'),
    S('heslb-disbursement', 'Malipo ya fedha za mkopo', 'Loan disbursement'),
    S('heslb-repayment', 'Urejeshaji wa mkopo', 'Loan repayment'),
  ], {
    email: 'info@heslb.go.tz',
    badge: { initials: 'HESLB', color: '#5d4037' },
    faqs: [
      F('heslb-faq-1',
        'Dirisha la maombi ya mkopo hufunguliwa lini?',
        'Kwa kawaida dirisha hufunguliwa kuanzia Juni hadi Agosti kila mwaka kupitia mfumo wa maombi wa HESLB (OLAMS). Tarehe kamili hutangazwa kwenye tovuti ya HESLB.',
        'When does the loan application window open?',
        'The window usually opens from June to August every year through the HESLB online application system (OLAMS). The exact dates are announced on the HESLB website.'),
      F('heslb-faq-2',
        'Nitajuaje kama nimepata mkopo?',
        'Ingia kwenye akaunti yako ya OLAMS kuona hali ya maombi na kiasi ulichopangiwa. Orodha za awamu pia hutangazwa kwenye tovuti ya HESLB.',
        'How will I know whether I have been given a loan?',
        'Log in to your OLAMS account to see the status of your application and the amount allocated. Batch lists are also published on the HESLB website.'),
      F('heslb-faq-3',
        'Ninarejeshaje mkopo wangu?',
        'Mwajiri hukata asilimia 15 ya mshahara ghafi kila mwezi. Waliojiajiri hulipa kwa namba ya malipo kupitia simu au benki; kiwango cha chini ni TZS 100,000 kwa mwezi.',
        'How do I repay my loan?',
        'Your employer deducts 15 percent of your gross salary every month. Self-employed beneficiaries pay with a control number through mobile money or a bank; the minimum is TZS 100,000 per month.'),
      F('heslb-faq-4',
        'Ninawezaje kukata rufaa kuhusu kiasi nilichopangiwa?',
        'Wasilisha rufaa kupitia OLAMS ndani ya muda uliotangazwa, ukiambatisha nyaraka zinazothibitisha hali yako ya kiuchumi.',
        'How can I appeal against the amount allocated to me?',
        'Submit an appeal through OLAMS within the announced period, attaching documents that prove your financial situation.'),
    ],
  }),
  inst('necta', 'NECTA', 'Baraza la Mitihani la Tanzania', 'elimu', [
    S('necta-results', 'Matokeo ya mitihani', 'Examination results'),
    S('necta-certificates', 'Vyeti', 'Certificates'),
    S('necta-verification', 'Uhakiki wa vyeti', 'Certificate verification'),
    S('necta-registration', 'Usajili wa watahiniwa', 'Candidate registration'),
  ], { badge: { initials: 'NECTA', color: '#37474f' } }),

  // --- Ardhi
  inst('wizara-ardhi', 'Wizara ya Ardhi', 'Wizara ya Ardhi, Nyumba na Maendeleo ya Makazi', 'ardhi', [
    S('ardhi-titles', 'Hati miliki', 'Title deeds'),
    S('ardhi-surveying', 'Upimaji wa ardhi', 'Land surveying'),
    S('ardhi-disputes', 'Migogoro ya ardhi', 'Land disputes'),
    S('ardhi-rent', 'Kodi ya pango la ardhi', 'Land rent'),
  ]),

  // --- Kazi na Ajira
  inst('nssf', 'NSSF', 'Mfuko wa Taifa wa Hifadhi ya Jamii', 'kazi-na-ajira', [
    S('nssf-registration', 'Usajili wa wanachama', 'Member registration'),
    S('nssf-contributions', 'Michango', 'Contributions'),
    S('nssf-benefits', 'Mafao', 'Benefits'),
    S('nssf-statement', 'Taarifa ya michango', 'Contribution statement'),
  ], { badge: { initials: 'NSSF', color: '#1a237e' } }),
  inst('ajira', 'Sekretarieti ya Ajira', 'Sekretarieti ya Ajira katika Utumishi wa Umma', 'kazi-na-ajira', [
    S('ajira-vacancies', 'Nafasi za kazi', 'Job vacancies'),
    S('ajira-portal', 'Mfumo wa maombi ya kazi', 'Recruitment portal'),
    S('ajira-interviews', 'Usaili', 'Interviews'),
  ]),

  // --- Maliasili na Utalii
  inst('tanapa', 'TANAPA', 'Hifadhi za Taifa Tanzania', 'maliasili-na-utalii', [
    S('tanapa-parks', 'Hifadhi za Taifa', 'National parks'),
    S('tanapa-fees', 'Ada za kuingia', 'Entry fees'),
    S('tanapa-wildlife', 'Wanyamapori', 'Wildlife'),
    S('tanapa-tourism', 'Utalii', 'Tourism'),
  ], { badge: { initials: 'TNP', color: '#558b2f' } }),
  inst('ncaa', 'NCAA', 'Mamlaka ya Hifadhi ya Ngorongoro', 'maliasili-na-utalii', [
    S('ncaa-tourism', 'Utalii Ngorongoro', 'Ngorongoro tourism'),
    S('ncaa-permits', 'Vibali', 'Permits'),
    S('ncaa-community', 'Huduma kwa jamii', 'Community services'),
  ], { badge: { initials: 'NCAA', color: '#795548' } }),

  // --- Nyaraka na Takwimu
  inst('nbs', 'NBS', 'Ofisi ya Taifa ya Takwimu', 'nyaraka-na-takwimu', [
    S('nbs-census', 'Sensa', 'Census'),
    S('nbs-data', 'Takwimu rasmi', 'Official statistics'),
    S('nbs-surveys', 'Tafiti', 'Surveys'),
  ]),
  inst('nyaraka', 'Nyaraka za Taifa', 'Idara ya Kumbukumbu na Nyaraka za Taifa', 'nyaraka-na-takwimu', [
    S('nyaraka-records', 'Kumbukumbu za Serikali', 'Government records'),
    S('nyaraka-archives', 'Nyaraka za kihistoria', 'Historical archives'),
    S('nyaraka-access', 'Upatikanaji wa nyaraka', 'Access to records'),
  ]),

  // --- Mazingira
  inst('nemc', 'NEMC', 'Baraza la Taifa la Hifadhi na Usimamizi wa Mazingira', 'mazingira', [
    S('nemc-eia', 'Tathmini ya athari kwa mazingira', 'Environmental impact assessment'),
    S('nemc-pollution', 'Uchafuzi wa mazingira', 'Pollution'),
    S('nemc-noise', 'Kelele', 'Noise pollution'),
  ], { badge: { initials: 'NEMC', color: '#33691e' } }),
  inst('vpo-mazingira', 'OMR - Mazingira', 'Ofisi ya Makamu wa Rais (Muungano na Mazingira)', 'mazingira', [
    S('vpo-environment', 'Hifadhi ya mazingira', 'Environmental conservation'),
    S('vpo-climate', 'Mabadiliko ya tabianchi', 'Climate change'),
    S('vpo-union', 'Masuala ya Muungano', 'Union matters'),
  ]),

  // --- Maendeleo ya Jamii
  inst('wizara-jamii', 'Wizara ya Jamii', 'Wizara ya Maendeleo ya Jamii, Jinsia, Wanawake na Makundi Maalum', 'maendeleo-ya-jamii', [
    S('jamii-gender', 'Jinsia na watoto', 'Gender and children'),
    S('jamii-ngos', 'Usajili wa NGOs', 'NGO registration'),
    S('jamii-welfare', 'Ustawi wa jamii', 'Social welfare'),
  ]),
  inst('tasaf', 'TASAF', 'Mfuko wa Maendeleo ya Jamii', 'maendeleo-ya-jamii', [
    S('tasaf-payments', 'Malipo ya walengwa', 'Beneficiary payments'),
    S('tasaf-projects', 'Miradi ya jamii', 'Community projects'),
    S('tasaf-enrolment', 'Uandikishaji', 'Enrolment'),
  ], { badge: { initials: 'TASAF', color: '#ef6c00' } }),

  // --- Madini
  inst('tume-madini', 'Tume ya Madini', 'Tume ya Madini Tanzania', 'madini', [
    S('madini-licences', 'Leseni za madini', 'Mining licences'),
    S('madini-markets', 'Masoko ya madini', 'Mineral markets'),
    S('madini-safety', 'Usalama migodini', 'Mine safety'),
  ]),
  inst('gst', 'GST', 'Taasisi ya Jiolojia na Utafiti wa Madini Tanzania', 'madini', [
    S('gst-surveys', 'Utafiti wa jiolojia', 'Geological surveys'),
    S('gst-lab', 'Huduma za maabara', 'Laboratory services'),
    S('gst-maps', 'Ramani za jiolojia', 'Geological maps'),
  ], { badge: { initials: 'GST', color: '#6d4c41' } }),

  // --- Mifugo na Uvuvi
  inst('wizara-mifugo', 'Wizara ya Mifugo', 'Wizara ya Mifugo na Uvuvi', 'mifugo-na-uvuvi', [
    S('mifugo-livestock', 'Huduma za mifugo', 'Livestock services'),
    S('mifugo-fisheries', 'Uvuvi', 'Fisheries'),
    S('mifugo-permits', 'Vibali', 'Permits'),
  ]),
  inst('tvla', 'TVLA', 'Wakala wa Maabara ya Veterinari Tanzania', 'mifugo-na-uvuvi', [
    S('tvla-vaccines', 'Chanjo za mifugo', 'Livestock vaccines'),
    S('tvla-lab', 'Uchunguzi wa magonjwa', 'Disease diagnosis'),
  ], { badge: { initials: 'TVLA', color: '#00796b' } }),
  inst('tafiri', 'TAFIRI', 'Taasisi ya Utafiti wa Uvuvi Tanzania', 'mifugo-na-uvuvi', [
    S('tafiri-research', 'Utafiti wa uvuvi', 'Fisheries research'),
    S('tafiri-training', 'Mafunzo kwa wavuvi', 'Training for fishers'),
  ], { badge: { initials: 'TFR', color: '#0277bd' } }),
];

export const institutionById = (id: string | undefined) => INSTITUTIONS.find((i) => i.id === id);
export const institutionsInSector = (sectorId: string) => INSTITUTIONS.filter((i) => i.sector === sectorId);

export function serviceById(id: string | undefined): { service: Service; institution: Institution } | undefined {
  for (const institution of INSTITUTIONS) {
    const service = institution.services.find((s) => s.id === id);
    if (service) return { service, institution };
  }
  return undefined;
}

/** Services shown in "Mrejesho wa Huduma" on the landing page. */
export const FEATURED_SERVICES = [
  'tanesco-outage', 'dawasa-supply', 'nida-collection', 'tra-tin',
  'tanroads-damage', 'heslb-application', 'zimamoto-fire', 'zimamoto-rescue',
  'uhamiaji-visa', 'nhif-cards', 'latra-fares', 'ardhi-titles',
];

// ---------------------------------------------------------------------------
// Feedback types and statuses

export type FeedbackType = 'lalamiko' | 'pendekezo' | 'ulizo' | 'pongezi';
export const FEEDBACK_TYPES: FeedbackType[] = ['lalamiko', 'pendekezo', 'ulizo', 'pongezi'];

export type Status = 'imepokelewa' | 'inashughulikiwa' | 'imejibiwa' | 'imefungwa';
export const STATUSES: Status[] = ['imepokelewa', 'inashughulikiwa', 'imejibiwa', 'imefungwa'];

export type Mode = 'personal' | 'anonymous' | 'account' | 'civil-servant';
export const MODES: Mode[] = ['personal', 'anonymous', 'account', 'civil-servant'];

// ---------------------------------------------------------------------------
// Regions and districts

export const REGIONS = [
  'Arusha', 'Dar es Salaam', 'Dodoma', 'Geita', 'Iringa', 'Kagera', 'Katavi', 'Kigoma', 'Kilimanjaro', 'Lindi',
  'Manyara', 'Mara', 'Mbeya', 'Morogoro', 'Mtwara', 'Mwanza', 'Njombe', 'Pwani', 'Rukwa', 'Ruvuma', 'Shinyanga',
  'Simiyu', 'Singida', 'Songwe', 'Tabora', 'Tanga', 'Kaskazini Unguja', 'Kusini Unguja', 'Mjini Magharibi',
  'Kaskazini Pemba', 'Kusini Pemba',
];

export const DISTRICTS: Record<string, string[]> = {
  'Dar es Salaam': ['Ilala', 'Kinondoni', 'Temeke', 'Ubungo', 'Kigamboni'],
  Dodoma: ['Dodoma Jiji', 'Bahi', 'Chamwino', 'Chemba', 'Kondoa', 'Kondoa Mji', 'Kongwa', 'Mpwapwa'],
  Arusha: ['Arusha Jiji', 'Arusha Vijijini', 'Meru', 'Karatu', 'Longido', 'Monduli', 'Ngorongoro'],
  Mwanza: ['Nyamagana', 'Ilemela', 'Buchosa', 'Kwimba', 'Magu', 'Misungwi', 'Sengerema', 'Ukerewe'],
  Mbeya: ['Mbeya Jiji', 'Mbeya Vijijini', 'Busokelo', 'Chunya', 'Kyela', 'Mbarali', 'Rungwe'],
  Morogoro: ['Morogoro Manispaa', 'Morogoro Vijijini', 'Gairo', 'Ifakara Mji', 'Kilosa', 'Malinyi', 'Mlimba', 'Mvomero', 'Ulanga'],
};

// ---------------------------------------------------------------------------
// General help FAQs (/msaada/maswali)

export const HELP_FAQS: Faq[] = [
  F('help-1', 'e-Mrejesho ni nini?',
    'e-Mrejesho ni mfumo wa kielektroniki wa Serikali wa kutuma, kupokea na kufuatilia malalamiko, mapendekezo, maulizo na pongezi kwa taasisi za umma.',
    'What is e-Mrejesho?',
    'e-Mrejesho is the Government electronic system for sending, receiving and tracking complaints, suggestions, inquiries and compliments to public institutions.'),
  F('help-2', 'Je, lazima nijisajili ili kutuma mrejesho?',
    'Hapana. Unaweza kutuma kwa kuweka taarifa binafsi, bila kujulikana, au kupitia akaunti ya eMrejesho. Akaunti inakusaidia kuona mrejesho wako wote sehemu moja.',
    'Do I have to register to send feedback?',
    'No. You can submit with your personal details, anonymously, or through an eMrejesho account. An account lets you see all your feedback in one place.'),
  F('help-3', 'Ninatumaje mrejesho?',
    'Tafuta taasisi au sekta, bonyeza Tuma Mrejesho, chagua namna ya kuwasilisha, jaza taarifa za mrejesho na za ziada, kisha thibitisha na bonyeza Wasilisha.',
    'How do I send feedback?',
    'Find the institution or sector, press Send Feedback, choose how to submit, fill in the feedback and additional details, then confirm and press Submit.'),
  F('help-4', 'Namba ya kumbukumbu ni nini?',
    'Ni namba unayopewa baada ya kuwasilisha mrejesho, kwa mfano EMR-2026-48213. Itumie kufuatilia hatua za mrejesho wako.',
    'What is a reference number?',
    'It is the number you receive after submitting feedback, for example EMR-2026-48213. Use it to track the progress of your feedback.'),
  F('help-5', 'Ninafuatiliaje mrejesho wangu?',
    'Bonyeza Fuatilia Mrejesho, weka namba ya kumbukumbu na bonyeza Fuatilia. Utaona hatua: Imepokelewa, Inashughulikiwa, Imejibiwa na Imefungwa.',
    'How do I track my feedback?',
    'Press Track Feedback, enter the reference number and press Track. You will see the stages: Received, In progress, Answered and Closed.'),
  F('help-6', 'Je, taarifa zangu ziko salama nikituma bila kujulikana?',
    'Ndiyo. Ukichagua Bila Kujulikana, jina na namba yako ya simu havihifadhiwi; unaweza kufuatilia kwa namba ya kumbukumbu pekee.',
    'Is my identity protected if I submit anonymously?',
    'Yes. When you choose Anonymous, your name and phone number are not stored; you can track only with the reference number.'),
  F('help-7', 'Ninaweza kutuma mrejesho bila intaneti?',
    'Ndiyo. Piga *152*00# kisha chagua 3 kwa e-Mrejesho, au tuma SMS bure kwenda 15555.',
    'Can I send feedback without internet?',
    'Yes. Dial *152*00# and choose 3 for e-Mrejesho, or send a free SMS to 15555.'),
  F('help-8', 'Taasisi hujibu mrejesho kwa muda gani?',
    'Taasisi hutakiwa kupokea mrejesho ndani ya siku 3 za kazi na kuujibu ndani ya siku 14, kutegemea uzito wa suala.',
    'How long do institutions take to respond?',
    'Institutions are expected to acknowledge feedback within 3 working days and respond within 14 days, depending on the complexity of the issue.'),
];

// ---------------------------------------------------------------------------
// Accounts and submissions

export interface Account {
  username: string;
  fullName: string;
  phone: string;
  email: string;
  region: string;
  passwordHash: string;
}

/** Simple non-cryptographic hash (cyrb53) so passwords are never stored in plain text. PoC only. */
export function hashPassword(password: string): string {
  const str = `emrejesho:${password}`;
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
}

export const SAMPLE_ACCOUNT: Account = {
  username: 'rahma.mbuyu',
  fullName: 'Rahma Mbuyu',
  phone: '0712345678',
  email: 'rahma.mbuyu@example.co.tz',
  region: 'Dar es Salaam',
  passwordHash: hashPassword('Demo@2026'),
};

export interface StatusEvent {
  status: Status;
  date: string;
}

export interface Submission {
  ref: string;
  institutionId: string;
  serviceId: string;
  type: FeedbackType;
  description: string;
  attachment?: { name: string; size: number };
  region: string;
  district: string;
  location: string;
  incidentDate?: string;
  mode: Mode;
  fullName?: string;
  phone?: string;
  email?: string;
  checkNumber?: string;
  /** Username of the logged-in account that submitted it (never set for anonymous). */
  owner?: string;
  status: Status;
  history: StatusEvent[];
  response?: string;
  createdAt: string;
}

export function seedSubmissions(): Submission[] {
  return [
    {
      ref: 'EMR-2026-48213',
      institutionId: 'tanesco',
      serviceId: 'tanesco-outage',
      type: 'lalamiko',
      description:
        'Kukatika kwa umeme mara kwa mara katika mtaa wetu wa Sinza. Umeme hukatika karibu kila jioni kwa saa kadhaa bila taarifa yoyote, na hali hii imeharibu vifaa vya nyumbani. Tunaomba tatizo hili lishughulikiwe.',
      region: 'Dar es Salaam',
      district: 'Ubungo',
      location: 'Sinza',
      incidentDate: '2026-09-17',
      mode: 'account',
      fullName: 'Rahma Mbuyu',
      phone: '0712345678',
      owner: 'rahma.mbuyu',
      status: 'inashughulikiwa',
      history: [
        { status: 'imepokelewa', date: '2026-09-18T09:14:00.000Z' },
        { status: 'inashughulikiwa', date: '2026-09-20T07:40:00.000Z' },
      ],
      createdAt: '2026-09-18T09:14:00.000Z',
    },
    {
      ref: 'EMR-2026-31877',
      institutionId: 'dawasa',
      serviceId: 'dawasa-billing',
      type: 'pendekezo',
      description:
        'Napendekeza DAWASA itume bili za maji kwa SMS kila mwezi kabla ya tarehe ya mwisho ya malipo, ili wateja tuweze kulipa kwa wakati na kuepuka adhabu ya kuchelewa.',
      region: 'Dar es Salaam',
      district: 'Ubungo',
      location: 'Kimara',
      mode: 'account',
      fullName: 'Rahma Mbuyu',
      phone: '0712345678',
      owner: 'rahma.mbuyu',
      status: 'imejibiwa',
      history: [
        { status: 'imepokelewa', date: '2026-09-02T10:05:00.000Z' },
        { status: 'inashughulikiwa', date: '2026-09-04T08:30:00.000Z' },
        { status: 'imejibiwa', date: '2026-09-10T12:15:00.000Z' },
      ],
      response:
        'Ndugu mteja, tunashukuru kwa pendekezo lako. DAWASA imeanza kutuma bili kwa SMS kwa wateja wote waliosajili namba zao za simu. Tafadhali tembelea ofisi ya huduma kwa wateja Ubungo au piga 0800 110 064 kusajili namba yako.',
      createdAt: '2026-09-02T10:05:00.000Z',
    },
    {
      ref: 'EMR-2026-27560',
      institutionId: 'nida',
      serviceId: 'nida-collection',
      type: 'ulizo',
      description:
        'Nilijisajili mwezi Machi katika ofisi ya NIDA Ubungo. Ningependa kujua kama kitambulisho changu cha taifa kiko tayari na nikichukue wapi.',
      region: 'Dar es Salaam',
      district: 'Ubungo',
      location: 'Ubungo Kibangu',
      mode: 'personal',
      fullName: 'Rahma Mbuyu',
      phone: '0712345678',
      owner: 'rahma.mbuyu',
      status: 'imefungwa',
      history: [
        { status: 'imepokelewa', date: '2026-08-11T06:50:00.000Z' },
        { status: 'inashughulikiwa', date: '2026-08-12T09:00:00.000Z' },
        { status: 'imejibiwa', date: '2026-08-20T11:30:00.000Z' },
        { status: 'imefungwa', date: '2026-08-28T08:00:00.000Z' },
      ],
      response:
        'Kitambulisho chako kiko tayari katika ofisi ya NIDA Wilaya ya Ubungo. Tafadhali fika ukiwa na nakala ya fomu ya usajili ili ukabidhiwe.',
      createdAt: '2026-08-11T06:50:00.000Z',
    },
    {
      ref: 'EMR-2026-50921',
      institutionId: 'tanroads',
      serviceId: 'tanroads-damage',
      type: 'lalamiko',
      description:
        'Barabara ya Morogoro eneo la Kibaha Maili Moja ina mashimo makubwa yanayosababisha msongamano na hatari ya ajali, hasa nyakati za mvua.',
      region: 'Pwani',
      district: 'Kibaha',
      location: 'Maili Moja',
      mode: 'anonymous',
      status: 'imepokelewa',
      history: [{ status: 'imepokelewa', date: '2026-10-03T15:20:00.000Z' }],
      createdAt: '2026-10-03T15:20:00.000Z',
    },
  ];
}
