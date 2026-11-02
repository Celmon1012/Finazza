export type LegalBlock = string | { bullets: string[] };
export type LegalSection = { heading: string; blocks: LegalBlock[] };
export type LegalDoc = {
  title: string;
  meta: string;
  otherLabel: string;
  sections: LegalSection[];
  notice?: string;
};
