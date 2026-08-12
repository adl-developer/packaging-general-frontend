import {
  LegalContactCard,
  LegalList,
  LegalSection,
  LegalShell,
  LegalSubheading,
  LegalText,
  LegalToc,
} from "@/components/legal/legal-page";
import type { LegalDoc } from "@/lib/site-content";

/**
 * Renders an admin-edited legal document (Settings → Terms & Conditions /
 * Privacy Policy in the admin portal) with the same shell, table of contents
 * and typography as the built-in pages, so an edited document doesn't look
 * like a different site.
 *
 * The body is markdown-lite, matching what the admin editor documents:
 *   `## Heading`   — a numbered section (drives the table of contents)
 *   `### Heading`  — a subheading inside a section
 *   `- item`       — a bullet list item
 *   blank line     — paragraph break
 * Everything is rendered as TEXT (React escaping) — an admin pasting HTML
 * gets the HTML shown, not executed.
 */

type Block =
  | { kind: "p"; text: string }
  | { kind: "h3"; text: string }
  | { kind: "ul"; items: string[] };

type Section = { id: string; title: string; blocks: Block[] };

function slugify(text: string, taken: Set<string>): string {
  const base =
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 40) || "section";
  let id = base;
  let n = 2;
  while (taken.has(id)) id = `${base}-${n++}`;
  taken.add(id);
  return id;
}

function parse(body: string): { lead: Block[]; sections: Section[] } {
  const lead: Block[] = [];
  const sections: Section[] = [];
  const taken = new Set<string>();
  let current: Block[] = lead;

  // Paragraphs may wrap across lines; gather until a blank line or a marker.
  let paragraph: string[] = [];
  let list: string[] | null = null;

  const flush = () => {
    if (list && list.length) current.push({ kind: "ul", items: list });
    list = null;
    if (paragraph.length)
      current.push({ kind: "p", text: paragraph.join(" ") });
    paragraph = [];
  };

  for (const rawLine of body.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) {
      flush();
      continue;
    }
    if (line.startsWith("## ")) {
      flush();
      const title = line.slice(3).trim();
      const section: Section = {
        id: slugify(title, taken),
        title,
        blocks: [],
      };
      sections.push(section);
      current = section.blocks;
      continue;
    }
    if (line.startsWith("### ")) {
      flush();
      current.push({ kind: "h3", text: line.slice(4).trim() });
      continue;
    }
    if (line.startsWith("- ")) {
      if (paragraph.length) flush();
      list = list ?? [];
      list.push(line.slice(2).trim());
      continue;
    }
    if (list) flush();
    paragraph.push(line);
  }
  flush();

  return { lead, sections };
}

function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <>
      {blocks.map((block, i) => {
        if (block.kind === "h3")
          return <LegalSubheading key={i}>{block.text}</LegalSubheading>;
        if (block.kind === "ul")
          return (
            <LegalList key={i}>
              {block.items.map((item, j) => (
                <li key={j}>{item}</li>
              ))}
            </LegalList>
          );
        return <LegalText key={i}>{block.text}</LegalText>;
      })}
    </>
  );
}

function formatUpdated(iso: string): string {
  const parsed = Date.parse(iso);
  if (Number.isNaN(parsed)) return iso;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(parsed));
}

export function CustomLegalPage({
  doc,
  eyebrow,
  title,
  tocHeading,
  contactIntro,
}: {
  doc: LegalDoc;
  eyebrow: string;
  title: string;
  tocHeading: string;
  contactIntro: string;
}) {
  const { lead, sections } = parse(doc.body);

  return (
    <LegalShell
      eyebrow={eyebrow}
      title={title}
      updated={formatUpdated(doc.effectiveDate)}
      lead={
        lead.length ? (
          // The lead slot is a single styled paragraph in LegalShell; extra
          // lead blocks render below the TOC would be odd, so join them here.
          lead
            .map((b) => (b.kind === "ul" ? b.items.join(" ") : b.text))
            .join(" ")
        ) : (
          <>{title} for Packaging General.</>
        )
      }
    >
      {sections.length > 0 && (
        <LegalToc
          heading={tocHeading}
          items={sections.map((s) => ({ id: s.id, label: s.title }))}
        />
      )}

      {sections.map((section, i) => (
        <LegalSection
          key={section.id}
          id={section.id}
          title={`${i + 1}. ${section.title}`}
        >
          <Blocks blocks={section.blocks} />
        </LegalSection>
      ))}

      <LegalContactCard intro={contactIntro} />
    </LegalShell>
  );
}
