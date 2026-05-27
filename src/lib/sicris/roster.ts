// Hardcoded roster of IER (Inštitut za ekonomska raziskovanja) researchers
// extracted from the SICRIS organization page (org ID 656, code 0502).
//
// This is the "fast path" for the demo — users can pick from a dropdown.
// The /api/roster route can refresh this list directly from SICRIS later.

export interface RosterEntry {
  sicrisId: string;
  fullName: string;
  /** Publication count at the time of caching, useful for the picker label. */
  publicationCount?: number;
  /** Programme group code (0502-001, 0502-002, etc.) */
  programmeGroup?: string;
  /** ORCID for direct OpenAlex lookup; falls back to name search if absent. */
  orcid?: string;
}

export const IER_ROSTER_SEED: RosterEntry[] = [
  // Programme group leads + key researchers known from SICRIS org 656.
  // ORCIDs verified via OpenAlex in May 2026.
  {
    sicrisId: '15636',
    fullName: 'dr. Damjan Kavaš',
    publicationCount: 292,
    orcid: '0000-0003-1915-837X',
  },
  {
    sicrisId: '15323',
    fullName: 'dr. Renata Slabe Erker',
    publicationCount: 328,
    orcid: '0000-0003-2566-9563',
  },
  {
    sicrisId: '24563',
    fullName: 'dr. Miroslav Verbič',
    publicationCount: 498,
    orcid: '0000-0001-5506-0973',
  },
  { sicrisId: '27501', fullName: 'dr. Matjaž Črnigoj', publicationCount: 209 },
  { sicrisId: '13617', fullName: 'dr. Janez Bešter', publicationCount: 150 },
  { sicrisId: '33182', fullName: 'dr. Kaja Primc', orcid: '0000-0002-8372-3831' },
  // Programme-group leaders from the SICRIS organization detail page (656):
  // 0502-001 Skupina za mednarodno ekonomijo  — TBD
  // 0502-002 Skupina za gospodarski razvoj    — dr. Nika Murovec
  // 0502-003 Skupina za strateško planiranje  — dr. Janez Bešter (above)
  // 0502-004 Skupina za socialni razvoj       — dr. Tjaša Bartolj
];

export const IER_ORGANIZATION = {
  id: '656',
  code: '0502',
  fullName: 'Inštitut za ekonomska raziskovanja',
  programmeGroups: [
    { code: '0502-001', name: 'Skupina za mednarodno ekonomijo' },
    { code: '0502-002', name: 'Skupina za gospodarski razvoj', lead: 'dr. Nika Murovec' },
    { code: '0502-003', name: 'Skupina za strateško planiranje', lead: 'dr. Janez Bešter' },
    { code: '0502-004', name: 'Skupina za socialni razvoj', lead: 'dr. Tjaša Bartolj' },
  ],
};
