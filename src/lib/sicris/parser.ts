// Parsers for SICRIS / COBISS responses.

import { z } from 'zod';

import type { Publication } from '@/lib/types';

// Bibliography JSON
// GET https://bib.cobiss.net/biblioweb/authorCobissList/si/slv/cris/{id}/{sort}/{from}/{to}

const RawUnit = z.object({
  id: z.string(),
  title: z.string().optional().default(''),
  parentTitle: z.string().optional(),
  fullTitle: z.string().optional(),
  yearFrom: z.string().optional(),
  typology: z.string().optional().default(''),
  typologyDescr: z.string().optional(),
});

const RawUnitList = z.array(RawUnit);

export function parseBibliographyJson(raw: unknown): Publication[] {
  const units = RawUnitList.parse(raw);
  return units.map((u) => ({
    id: u.id,
    title: stripTags(u.title),
    parentTitle: u.parentTitle ? stripTags(u.parentTitle) : undefined,
    year: Number(u.yearFrom ?? 0) || 0,
    typology: normalizeTypology(u.typology),
    typologyDescr: u.typologyDescr,
  }));
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, '').trim();
}

function normalizeTypology(t: string): string {
  return t.trim();
}
