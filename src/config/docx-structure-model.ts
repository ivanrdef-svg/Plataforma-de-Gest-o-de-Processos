/**
 * Build 024 — representação intermediária estrutural de um documento .docx.
 *
 * Modelo deliberadamente neutro: nenhum campo amarra o resultado ao conceito
 * de POP (sem título de seção, sem tipo de etapa). A tradução para POP é
 * responsabilidade de outra camada, em outra etapa.
 */

export interface DocxElementBase {
  /** Identificador estável dentro do documento processado (ex. "element-001"). */
  id: string;
  /** Posição documental, iniciando em 0. */
  order: number;
}

export interface DocxHeadingElement extends DocxElementBase {
  type: "heading";
  /** Nível extraído do estilo (1, 2, 3...). */
  level: number;
  text: string;
}

export interface DocxParagraphElement extends DocxElementBase {
  type: "paragraph";
  text: string;
}

export interface DocxListItem {
  text: string;
  /** Nível de indentação (w:ilvl), iniciando em 0. */
  level: number;
}

export interface DocxListElement extends DocxElementBase {
  type: "list";
  ordered: boolean;
  items: DocxListItem[];
}

export interface DocxTableCell {
  text: string;
}

export interface DocxTableRow {
  cells: DocxTableCell[];
}

export interface DocxTableElement extends DocxElementBase {
  type: "table";
  rows: DocxTableRow[];
}

export type DocxElement =
  DocxHeadingElement | DocxParagraphElement | DocxListElement | DocxTableElement;

export interface DocxDocumentStructure {
  sourceDocumentId: string;
  /** Ordem documental preservada. Vazio é um resultado válido. */
  elements: DocxElement[];
  parsedAt: string;
  /** Avisos não fatais (ex. elemento não suportado ignorado). */
  warnings: string[];
}

/** Erro específico de origem: arquivo não é um .docx legível. */
export class DocxSourceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DocxSourceError";
  }
}
