// Authorship factor (faktor avtorstva) – Pravilnik IER, Priloga 3, tabela 2.
//
// 1,0  Prvi avtor, vodilni avtor, korespondenčni avtor (single author of
//      record, project leader, principal mentor, sole award recipient).
// 0,7  Enakovredno avtorstvo (equal authorship, co-mentor, co-editor, joint
//      award).
// 0,3  Ostalo avtorstvo (other co-authorship).
//
// Label wording aligns with the supervisor's 2026-05-28 review note:
// "prvi, vodilni, korespondencni (1.0); enakovredni (0.7); ostalo avtorstvo
// (0.3)".

import type { AuthorshipRole } from '@/lib/types';

export function authorshipFactor(role?: AuthorshipRole): number {
  switch (role) {
    case 'first-or-corresponding':
      return 1.0;
    case 'equal-or-co':
      return 0.7;
    case 'other-coauthor':
      return 0.3;
    default:
      // SICRIS bibliography feed does not distinguish corresponding author.
      // Default to equal/co (0,7) and let the user override per publication.
      return 0.7;
  }
}

export function authorshipLabel(role?: AuthorshipRole): string {
  switch (role) {
    case 'first-or-corresponding':
      return 'Prvi / vodilni / korespondenčni';
    case 'equal-or-co':
      return 'Enakovredni';
    case 'other-coauthor':
      return 'Ostalo avtorstvo';
    default:
      return 'Privzeto (enakovredno)';
  }
}
