/* =========================================================
   A small Markdown renderer for notes.

   Builds React elements directly — never HTML strings — so a
   note can't inject markup or scripts. Supported:

     # Heading  ## Smaller  ### Smallest
     **bold**  *italic*  ~~struck~~  `code`
     - bullet  1. numbered  - [ ] checklist  - [x] done
     > quote    ``` code block ```    ---
     [text](https://…) and bare https:// links

   Checklist boxes call onToggle(lineIndex) so the page can flip
   that line's [ ] ↔ [x] in the note itself.
   ========================================================= */

const LIST = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;
const TASK = /^\[( |x|X)\]\s+(.*)$/;
const SAFE_URL = /^(https?:\/\/|mailto:)/i;

/* ---- Inline: code, bold, italic, strike, links ---- */

const INLINE = /(`[^`\n]+`)|(\*\*[^*\n]+?\*\*)|(~~[^~\n]+?~~)|(\*[^*\s][^*\n]*?\*|\b_[^_\s][^_\n]*?_\b)|(\[[^\]\n]+\]\([^)\s]+\))|(https?:\/\/[^\s<]*[^\s<.,;:!?)\]'"])/g;

function inline(text, keyBase) {
  const out = [];
  let last = 0, i = 0;
  for (const m of text.matchAll(INLINE)) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    const key = keyBase + "-" + i++;
    if (m[1]) out.push(<code key={key}>{tok.slice(1, -1)}</code>);
    else if (m[2]) out.push(<strong key={key}>{inline(tok.slice(2, -2), key)}</strong>);
    else if (m[3]) out.push(<s key={key}>{inline(tok.slice(2, -2), key)}</s>);
    else if (m[4]) out.push(<em key={key}>{inline(tok.slice(1, -1), key)}</em>);
    else if (m[5]) {
      const label = tok.slice(1, tok.indexOf("]("));
      const href = tok.slice(tok.indexOf("](") + 2, -1);
      out.push(SAFE_URL.test(href)
        ? <a key={key} href={href} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>{inline(label, key)}</a>
        : tok);
    } else if (m[6]) {
      out.push(<a key={key} href={tok} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>{tok}</a>);
    }
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/* ---- Blocks ---- */

function parse(text) {
  const lines = String(text || "").replace(/\r\n?/g, "\n").split("\n");
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^```/.test(line.trim())) {
      const code = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i].trim())) code.push(lines[i++]);
      i++;                                   // the closing fence (or the end)
      blocks.push({ type: "code", text: code.join("\n") });
      continue;
    }
    if (!line.trim()) { i++; continue; }
    const h = /^(#{1,3})\s+(.*)$/.exec(line);
    if (h) { blocks.push({ type: "heading", level: h[1].length, text: h[2] }); i++; continue; }
    if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) { blocks.push({ type: "hr" }); i++; continue; }
    if (/^>\s?/.test(line)) {
      const quote = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) quote.push(lines[i++].replace(/^>\s?/, ""));
      blocks.push({ type: "quote", lines: quote });
      continue;
    }
    if (LIST.test(line)) {
      const ordered = /\d/.test(LIST.exec(line)[2]);
      const items = [];
      while (i < lines.length && LIST.test(lines[i]) && /\d/.test(LIST.exec(lines[i])[2]) === ordered) {
        const [, indent, , rest] = LIST.exec(lines[i]);
        const task = TASK.exec(rest);
        items.push({ line: i, depth: Math.min(3, Math.floor(indent.replace(/\t/g, "  ").length / 2)),
          text: task ? task[2] : rest, task: !!task, done: !!task && task[1] !== " " });
        i++;
      }
      blocks.push({ type: "list", ordered, items });
      continue;
    }
    const para = [];
    while (i < lines.length && lines[i].trim() && !LIST.test(lines[i]) && !/^(#{1,3})\s|^>|^```/.test(lines[i])) para.push(lines[i++]);
    if (!para.length) para.push(lines[i++]);  // never stall on an odd line
    blocks.push({ type: "para", lines: para });
  }
  return blocks;
}

export default function Markdown({ text, onToggle, className = "" }) {
  const blocks = parse(text);
  return (
    <div className={"md " + className}>
      {blocks.map((b, bi) => {
        const key = "b" + bi;
        if (b.type === "code") return <pre key={key}><code>{b.text}</code></pre>;
        if (b.type === "hr") return <hr key={key} />;
        if (b.type === "heading") return <p key={key} className={"md-h md-h" + b.level}>{inline(b.text, key)}</p>;
        if (b.type === "quote") {
          return <blockquote key={key}>{b.lines.map((l, li) => <span key={li}>{li > 0 && <br />}{inline(l, key + li)}</span>)}</blockquote>;
        }
        if (b.type === "list") {
          const Tag = b.ordered ? "ol" : "ul";
          return (
            <Tag key={key} className={b.items.some((it) => it.task) ? "md-tasks" : undefined}>
              {b.items.map((it) => (
                <li key={it.line} className={(it.task ? "md-task" : "") + (it.done ? " is-done" : "") + (it.depth ? " md-depth" + it.depth : "")}>
                  {it.task ? (
                    <label onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" checked={it.done} disabled={!onToggle}
                        onChange={() => onToggle && onToggle(it.line)} />
                      <span>{inline(it.text, key + it.line)}</span>
                    </label>
                  ) : inline(it.text, key + it.line)}
                </li>
              ))}
            </Tag>
          );
        }
        return <p key={key}>{b.lines.map((l, li) => <span key={li}>{li > 0 && <br />}{inline(l, key + li)}</span>)}</p>;
      })}
    </div>
  );
}
