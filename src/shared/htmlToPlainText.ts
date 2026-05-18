/**
 * Convert TipTap-style HTML (StarterKit: headings, paragraphs, lists, blockquote, br, inline marks)
 * into clean plain text suitable for pasting into a notes app.
 *
 * - Headings → plain line + one blank line (no `#` prefix)
 * - Paragraphs / blockquotes → text + blank line
 * - <ul><li> → "- item" lines
 * - <ol><li> → "1. item", "2. item" ... (numbering resets per list, supports `start` attr)
 * - <br> → newline
 * - HTML entities decoded
 */

const BLOCK_TAGS = new Set([
  "p", "div", "section", "article", "header", "footer",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "blockquote", "pre",
]);

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCharCode(parseInt(n, 16)));
}

type Token =
  | { kind: "text"; value: string }
  | { kind: "open"; tag: string; attrs: Record<string, string> }
  | { kind: "close"; tag: string }
  | { kind: "void"; tag: string };

function tokenize(html: string): Token[] {
  const tokens: Token[] = [];
  const re = /<\/?([a-zA-Z][a-zA-Z0-9]*)([^>]*?)\/?>/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    if (m.index > last) {
      tokens.push({ kind: "text", value: html.slice(last, m.index) });
    }
    const raw = m[0];
    const tag = m[1].toLowerCase();
    const isClose = raw.startsWith("</");
    const isSelfClose = raw.endsWith("/>") || tag === "br" || tag === "hr" || tag === "img";
    const attrs: Record<string, string> = {};
    const attrRe = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*"([^"]*)"/g;
    let am: RegExpExecArray | null;
    while ((am = attrRe.exec(m[2])) !== null) attrs[am[1].toLowerCase()] = am[2];
    if (isClose) tokens.push({ kind: "close", tag });
    else if (isSelfClose) tokens.push({ kind: "void", tag });
    else tokens.push({ kind: "open", tag, attrs });
    last = re.lastIndex;
  }
  if (last < html.length) tokens.push({ kind: "text", value: html.slice(last) });
  return tokens;
}

interface ListFrame {
  ordered: boolean;
  index: number;
}

export function htmlToPlainText(html: string | undefined | null): string {
  if (!html) return "";

  const tokens = tokenize(html);
  const out: string[] = [];
  let line = "";
  const listStack: ListFrame[] = [];
  let inListItem = false;

  const flushLine = () => {
    out.push(line.replace(/[ \t]+/g, " ").replace(/ +$/g, ""));
    line = "";
  };

  const startBlock = () => {
    if (line.length > 0) flushLine();
  };

  const endBlock = (blank: boolean) => {
    if (line.length > 0) flushLine();
    if (blank) out.push("");
  };

  // Track whether we've already emitted text inside the current <li> so a
  // second inner <p> can break to a new line (without an extra blank).
  let liHasContent = false;

  for (const tok of tokens) {
    if (tok.kind === "text") {
      const txt = decodeEntities(tok.value);
      if (!txt) continue;
      line += txt.replace(/\s+/g, " ");
    } else if (tok.kind === "void") {
      if (tok.tag === "br") flushLine();
    } else if (tok.kind === "open") {
      if (BLOCK_TAGS.has(tok.tag)) {
        if (inListItem) {
          // Inner <p>/<div> inside <li>: first one stays on the bullet line;
          // subsequent ones break to a new (indented) line, no blank.
          if (liHasContent) {
            if (line.length > 0) flushLine();
            line = "  ".repeat(listStack.length);
          }
        } else {
          startBlock();
        }
      } else if (tok.tag === "ul" || tok.tag === "ol") {
        if (inListItem) {
          // Nested list inside an <li>: break to a new line, no blank.
          if (line.length > 0) flushLine();
        } else {
          startBlock();
        }
        const start = tok.attrs.start ? parseInt(tok.attrs.start, 10) : 1;
        listStack.push({ ordered: tok.tag === "ol", index: Number.isFinite(start) ? start : 1 });
      } else if (tok.tag === "li") {
        if (line.length > 0) flushLine();
        const frame = listStack[listStack.length - 1];
        const indent = "  ".repeat(Math.max(0, listStack.length - 1));
        if (frame?.ordered) {
          line = `${indent}${frame.index}. `;
          frame.index += 1;
        } else {
          line = `${indent}- `;
        }
        inListItem = true;
        liHasContent = false;
      }
    } else if (tok.kind === "close") {
      if (BLOCK_TAGS.has(tok.tag)) {
        if (inListItem) {
          // Don't flush/blank inside an <li> — the </li> handler does that.
          if (line.trim().length > 0) liHasContent = true;
        } else {
          endBlock(true);
        }
      } else if (tok.tag === "ul" || tok.tag === "ol") {
        if (line.length > 0) flushLine();
        listStack.pop();
        if (listStack.length === 0) out.push("");
      } else if (tok.tag === "li") {
        if (line.length > 0) flushLine();
        inListItem = false;
        liHasContent = false;
      }
    }
  }
  if (line.length > 0) flushLine();

  // Collapse 3+ consecutive blank lines down to one blank line, trim edges.
  const collapsed: string[] = [];
  let blankRun = 0;
  for (const l of out) {
    if (l === "") {
      blankRun += 1;
      if (blankRun <= 1) collapsed.push("");
    } else {
      blankRun = 0;
      collapsed.push(l);
    }
  }
  while (collapsed.length && collapsed[0] === "") collapsed.shift();
  while (collapsed.length && collapsed[collapsed.length - 1] === "") collapsed.pop();

  return collapsed.join("\n");
}
