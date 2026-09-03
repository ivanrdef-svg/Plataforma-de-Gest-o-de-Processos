/**
 * Build 024 — parser estrutural determinístico de .docx.
 *
 * Função pura: recebe bytes já em memória, não faz I/O, não usa React,
 * não usa createServerFn e não usa IA. Nenhuma interpretação semântica:
 * o texto é extraído como está, sem resumo, correção ou descarte.
 */

import JSZip from "jszip";
import { XMLParser } from "fast-xml-parser";
import {
  DocxSourceError,
  type DocxDocumentStructure,
  type DocxElement,
  type DocxListItem,
  type DocxTableRow,
} from "@/config/docx-structure-model";

const DOCUMENT_PATH = "word/document.xml";
const NUMBERING_PATH = "word/numbering.xml";

/** Nó no formato `preserveOrder` do fast-xml-parser. */
type OrderedNode = Record<string, unknown> & { ":@"?: Record<string, string> };

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  preserveOrder: true,
  trimValues: false,
  parseTagValue: false,
  parseAttributeValue: false,
});

function tagOf(node: OrderedNode): string | null {
  for (const key of Object.keys(node)) {
    if (key !== ":@") return key;
  }
  return null;
}

function childrenOf(node: OrderedNode, tag: string): OrderedNode[] {
  const value = node[tag];
  return Array.isArray(value) ? (value as OrderedNode[]) : [];
}

function attrs(node: OrderedNode): Record<string, string> {
  return node[":@"] ?? {};
}

function findChild(nodes: OrderedNode[], tag: string): OrderedNode | undefined {
  return nodes.find((n) => tagOf(n) === tag);
}

/** Concatena recursivamente todo texto (`w:t`) contido no nó. */
function extractText(nodes: OrderedNode[]): string {
  let out = "";
  for (const node of nodes) {
    const tag = tagOf(node);
    if (tag === null) continue;
    if (tag === "#text") {
      continue;
    }
    if (tag === "w:t") {
      const inner = childrenOf(node, "w:t");
      for (const textNode of inner) {
        const raw = textNode["#text"];
        if (typeof raw === "string") out += raw;
        else if (typeof raw === "number") out += String(raw);
      }
      continue;
    }
    if (tag === "w:tab") {
      out += "\t";
      continue;
    }
    if (tag === "w:br" || tag === "w:cr") {
      out += "\n";
      continue;
    }
    out += extractText(childrenOf(node, tag));
  }
  return out;
}

function normalize(text: string): string {
  return text.replace(/\u00a0/g, " ").replace(/[ \t]+\n/g, "\n").trim();
}

/** Extrai o nível de heading de um nome de estilo, de forma tolerante. */
function headingLevelFromStyle(styleId: string | undefined): number | null {
  if (!styleId) return null;
  const value = styleId.toLowerCase().replace(/[\s_-]/g, "");
  // Heading1, heading2, Ttulo1 (pt-BR), Titulo3, etc.
  const match = /^(heading|title|ttulo|titulo|berschrift|encabezado|rubrik)(\d+)$/.exec(value);
  if (match) {
    const level = Number.parseInt(match[2]!, 10);
    return Number.isFinite(level) && level > 0 ? level : null;
  }
  return null;
}

interface ParagraphInfo {
  text: string;
  headingLevel: number | null;
  listLevel: number | null;
  numId: string | null;
}

function readParagraph(paragraph: OrderedNode): ParagraphInfo {
  const kids = childrenOf(paragraph, "w:p");
  const pPr = findChild(kids, "w:pPr");
  let headingLevel: number | null = null;
  let listLevel: number | null = null;
  let numId: string | null = null;

  if (pPr) {
    const pPrKids = childrenOf(pPr, "w:pPr");
    const style = findChild(pPrKids, "w:pStyle");
    headingLevel = headingLevelFromStyle(style ? attrs(style)["w:val"] : undefined);

    const numPr = findChild(pPrKids, "w:numPr");
    if (numPr) {
      const numPrKids = childrenOf(numPr, "w:numPr");
      const ilvl = findChild(numPrKids, "w:ilvl");
      const num = findChild(numPrKids, "w:numId");
      const parsedLevel = Number.parseInt(ilvl ? (attrs(ilvl)["w:val"] ?? "0") : "0", 10);
      listLevel = Number.isFinite(parsedLevel) && parsedLevel >= 0 ? parsedLevel : 0;
      numId = num ? (attrs(num)["w:val"] ?? null) : null;
    }
  }

  return { text: normalize(extractText(kids)), headingLevel, listLevel, numId };
}

function readTableRows(table: OrderedNode): DocxTableRow[] {
  const rows: DocxTableRow[] = [];
  for (const node of childrenOf(table, "w:tbl")) {
    if (tagOf(node) !== "w:tr") continue;
    const cells: { text: string }[] = [];
    for (const cellNode of childrenOf(node, "w:tr")) {
      if (tagOf(cellNode) !== "w:tc") continue;
      cells.push({ text: normalize(extractText(childrenOf(cellNode, "w:tc"))) });
    }
    rows.push({ cells });
  }
  return rows;
}

/** Mapa numId → ordered?, derivado de numbering.xml quando disponível. */
function buildNumberingMap(numberingXml: string | null): Map<string, boolean> {
  const map = new Map<string, boolean>();
  if (!numberingXml) return map;
  try {
    const tree = parser.parse(numberingXml) as OrderedNode[];
    const root = tree.find((n) => tagOf(n) === "w:numbering");
    if (!root) return map;
    const rootKids = childrenOf(root, "w:numbering");

    // abstractNumId → ordered (baseado no numFmt do primeiro nível)
    const abstractOrdered = new Map<string, boolean>();
    for (const node of rootKids) {
      if (tagOf(node) !== "w:abstractNum") continue;
      const abstractId = attrs(node)["w:abstractNumId"];
      if (!abstractId) continue;
      const lvls = childrenOf(node, "w:abstractNum").filter((n) => tagOf(n) === "w:lvl");
      const firstLvl = lvls[0];
      if (!firstLvl) continue;
      const numFmt = findChild(childrenOf(firstLvl, "w:lvl"), "w:numFmt");
      const fmt = numFmt ? attrs(numFmt)["w:val"] : undefined;
      abstractOrdered.set(abstractId, Boolean(fmt) && fmt !== "bullet" && fmt !== "none");
    }

    for (const node of rootKids) {
      if (tagOf(node) !== "w:num") continue;
      const numId = attrs(node)["w:numId"];
      if (!numId) continue;
      const ref = findChild(childrenOf(node, "w:num"), "w:abstractNumId");
      const abstractId = ref ? attrs(ref)["w:val"] : undefined;
      map.set(numId, abstractId ? (abstractOrdered.get(abstractId) ?? false) : false);
    }
  } catch {
    return map;
  }
  return map;
}

function makeId(index: number): string {
  return `element-${String(index + 1).padStart(3, "0")}`;
}

/**
 * Converte um .docx (bytes) em uma árvore estrutural neutra.
 *
 * @throws {DocxSourceError} quando o arquivo não é um ZIP válido ou não contém
 * `word/document.xml`. Elementos não suportados NUNCA geram erro — apenas
 * entradas em `warnings`.
 */
export async function parseDocxStructure(
  fileBytes: Uint8Array | ArrayBuffer,
  sourceDocumentId: string,
): Promise<DocxDocumentStructure> {
  const warnings: string[] = [];
  const elements: DocxElement[] = [];

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(fileBytes);
  } catch {
    throw new DocxSourceError(
      "Documento inválido: o arquivo não pôde ser lido como um pacote .docx (ZIP).",
    );
  }

  const documentFile = zip.file(DOCUMENT_PATH);
  if (!documentFile) {
    throw new DocxSourceError(
      "Documento inválido: o pacote não contém 'word/document.xml' — não é um arquivo .docx do Word.",
    );
  }

  const documentXml = await documentFile.async("string");
  const numberingFile = zip.file(NUMBERING_PATH);
  const numberingMap = buildNumberingMap(numberingFile ? await numberingFile.async("string") : null);

  let tree: OrderedNode[];
  try {
    tree = parser.parse(documentXml) as OrderedNode[];
  } catch {
    throw new DocxSourceError("Documento inválido: 'word/document.xml' não é um XML legível.");
  }

  const root = tree.find((n) => tagOf(n) === "w:document");
  if (!root) {
    throw new DocxSourceError("Documento inválido: raiz 'w:document' não encontrada.");
  }
  const body = findChild(childrenOf(root, "w:document"), "w:body");
  if (!body) {
    throw new DocxSourceError("Documento inválido: corpo 'w:body' não encontrado.");
  }

  const nodes = childrenOf(body, "w:body");
  const unsupported = new Set<string>();

  // Acumulador de itens de lista consecutivos.
  let pendingItems: DocxListItem[] = [];
  let pendingNumId: string | null = null;

  const flushList = () => {
    if (pendingItems.length === 0) return;
    elements.push({
      id: makeId(elements.length),
      order: elements.length,
      type: "list",
      ordered: pendingNumId ? (numberingMap.get(pendingNumId) ?? false) : false,
      items: pendingItems,
    });
    pendingItems = [];
    pendingNumId = null;
  };

  for (const node of nodes) {
    const tag = tagOf(node);
    if (tag === null || tag === "#text") continue;

    if (tag === "w:p") {
      const info = readParagraph(node);

      if (info.listLevel !== null) {
        // Muda de numeração => encerra a lista anterior.
        if (pendingItems.length > 0 && pendingNumId !== info.numId) flushList();
        pendingNumId = info.numId;
        pendingItems.push({ text: info.text, level: info.listLevel });
        continue;
      }

      flushList();

      if (info.headingLevel !== null) {
        elements.push({
          id: makeId(elements.length),
          order: elements.length,
          type: "heading",
          level: info.headingLevel,
          text: info.text,
        });
        continue;
      }

      if (info.text.length > 0) {
        elements.push({
          id: makeId(elements.length),
          order: elements.length,
          type: "paragraph",
          text: info.text,
        });
      }
      continue;
    }

    if (tag === "w:tbl") {
      flushList();
      elements.push({
        id: makeId(elements.length),
        order: elements.length,
        type: "table",
        rows: readTableRows(node),
      });
      continue;
    }

    if (tag === "w:sectPr" || tag === "w:bookmarkStart" || tag === "w:bookmarkEnd") {
      continue;
    }

    unsupported.add(tag);
  }

  flushList();

  for (const tag of unsupported) {
    warnings.push(`elemento não suportado ignorado: <${tag}>`);
  }

  return {
    sourceDocumentId,
    elements,
    parsedAt: new Date().toISOString(),
    warnings,
  };
}
