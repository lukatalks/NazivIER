// Authorship factor (faktor avtorstva) – Pravilnik IER, Priloga 3, tabela 2.
//
// 1,0  Edini avtor, prvi avtor, vodilni/korespondenčni avtor, vodja projekta,
//      glavni mentor, glavni urednik, edini prejemnik nagrade
// 0,7  Enakovredno avtorstvo, nagrada z več nagrajenci, somentor, sourednik
// 0,3  Ostala soavtorstva

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
      return 'Prvi / korespondenčni';
    case 'equal-or-co':
      return 'Enakovredno avtorstvo';
    case 'other-coauthor':
      return 'Ostalo soavtorstvo';
    default:
      return 'Privzeto (enakovredno)';
  }
}
