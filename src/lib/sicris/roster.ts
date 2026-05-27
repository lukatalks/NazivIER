// Roster of IER (Inštitut za ekonomska raziskovanja) researchers,
// scraped from https://www.ier.si/zaposleni in May 2026.
// SICRIS IDs are taken directly from the bibliografije.ier.si links on the page.
// ORCIDs are filled in where they could be matched on OpenAlex
// (https://api.openalex.org/authors/orcid:{ORCID}); when missing, the OpenAlex
// resolver falls back to name search filtered by the IER institution.

export interface RosterEntry {
  sicrisId: string;
  fullName: string;
  /** Position label as shown on ier.si/zaposleni. */
  role?: string;
  /** Publication count at the time of caching, useful for the picker label. */
  publicationCount?: number;
  /** Programme group code (0502-001, 0502-002, etc.) */
  programmeGroup?: string;
  /** ORCID for direct OpenAlex lookup; falls back to name search if absent. */
  orcid?: string;
  /** Institutional email (helps the user pick the right SICRIS ID). */
  email?: string;
}

export const IER_ROSTER_SEED: RosterEntry[] = [
  // Leadership
  {
    sicrisId: '15636',
    fullName: 'dr. Damjan Kavaš',
    role: 'Direktor',
    email: 'damjan.kavas@ier.si',
    orcid: '0000-0003-1915-837X',
  },
  // Researchers (alphabetical)
  {
    sicrisId: '33234',
    fullName: 'dr. Tjaša Bartolj',
    role: 'Raziskovalka',
    email: 'tjasa.bartolj@ier.si',
  },
  {
    sicrisId: '54736',
    fullName: 'Enia Bearzotti, mag.',
    role: 'Raziskovalka',
    email: 'enia.bearzotti@ier.si',
    orcid: '0009-0001-3043-3339',
  },
  {
    sicrisId: '13617',
    fullName: 'dr. Janez Bešter',
    role: 'Raziskovalec',
    email: 'janez.bester@ier.si',
  },
  {
    sicrisId: '27501',
    fullName: 'dr. Matjaž Črnigoj',
    role: 'Raziskovalec',
    email: 'matjaz.crnigoj@ier.si',
  },
  {
    sicrisId: '38168',
    fullName: 'dr. Miha Dominko',
    role: 'Raziskovalec',
    email: 'miha.dominko@ier.si',
    orcid: '0000-0003-1809-0078',
  },
  {
    sicrisId: '51523',
    fullName: 'dr. Barbara Kalar',
    role: 'Raziskovalka',
    email: 'barbara.kalar@ier.si',
    orcid: '0000-0003-0218-5080',
  },
  {
    sicrisId: '18431',
    fullName: 'mag. Klemen Koman',
    role: 'Raziskovalec',
    email: 'klemen.koman@ier.si',
  },
  {
    sicrisId: '13199',
    fullName: 'mag. Matej Koren',
    role: 'Raziskovalec',
    email: 'matej.koren@ier.si',
  },
  {
    sicrisId: '19042',
    fullName: 'dr. Nataša Kump',
    role: 'Raziskovalka',
    email: 'natasa.kump@ier.si',
  },
  {
    sicrisId: '59851',
    fullName: 'Brigita Milanič, mag.',
    role: 'Raziskovalka',
    email: 'brigita.milanic@ier.si',
  },
  {
    sicrisId: '61323',
    fullName: 'Otto Močnek, mag.',
    role: 'Raziskovalec',
    email: 'otto.mocnek@ier.si',
  },
  {
    sicrisId: '23544',
    fullName: 'dr. Nika Murovec',
    role: 'Raziskovalka',
    email: 'nika.murovec@ier.si',
    programmeGroup: '0502-002',
  },
  {
    sicrisId: '30812',
    fullName: 'dr. Marko Ogorevc',
    role: 'Raziskovalec',
    email: 'marko.ogorevc@ier.si',
  },
  {
    sicrisId: '33182',
    fullName: 'dr. Kaja Primc',
    role: 'Raziskovalka',
    email: 'kaja.primc@ier.si',
    orcid: '0000-0002-8372-3831',
  },
  {
    sicrisId: '59852',
    fullName: 'Luka Radičević, mag.',
    role: 'Raziskovalec',
    email: 'luka.radicevic@ier.si',
  },
  {
    sicrisId: '60510',
    fullName: 'dr. Andraž Rangus',
    role: 'Raziskovalec',
    email: 'andraz.rangus@ier.si',
  },
  {
    sicrisId: '15323',
    fullName: 'dr. Renata Slabe Erker',
    role: 'Raziskovalka',
    email: 'renata.erker@ier.si',
    orcid: '0000-0003-2566-9563',
  },
  {
    sicrisId: '21498',
    fullName: 'mag. Sonja Uršič',
    role: 'Raziskovalka',
    email: 'sonja.ursic@ier.si',
  },
  {
    sicrisId: '24563',
    fullName: 'dr. Miroslav Verbič',
    role: 'Raziskovalec',
    email: 'miroslav.verbic@ier.si',
    orcid: '0000-0001-5506-0973',
  },
  {
    sicrisId: '51926',
    fullName: 'dr. Darja Zabavnik',
    role: 'Raziskovalka',
    email: 'darja.zabavnik@ier.si',
    orcid: '0009-0008-7077-1894',
  },
];

export const IER_ORGANIZATION = {
  id: '656',
  code: '0502',
  fullName: 'Inštitut za ekonomska raziskovanja',
  shortName: 'IER',
  website: 'https://www.ier.si',
  staffPage: 'https://www.ier.si/zaposleni',
  programmeGroups: [
    { code: '0502-001', name: 'Skupina za mednarodno ekonomijo' },
    { code: '0502-002', name: 'Skupina za gospodarski razvoj', lead: 'dr. Nika Murovec' },
    { code: '0502-003', name: 'Skupina za strateško planiranje', lead: 'dr. Janez Bešter' },
    { code: '0502-004', name: 'Skupina za socialni razvoj', lead: 'dr. Tjaša Bartolj' },
  ],
};
