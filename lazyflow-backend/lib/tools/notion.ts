import type { ToolDefinition } from "@/lib/tools/types";

const NOTION_API = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";

type NotionInput = {
  action: "create_page";
  title: string;
  content?: string; // plain text or simple markdown (# heading, ## heading, **bold**)
};

export const notionTool: ToolDefinition<NotionInput> = {
  name: "notion",
  description: "Create pages in the user's Notion workspace.",
  async execute(input) {
    const token = process.env.NOTION_TOKEN;
    const parentPageId = process.env.NOTION_PARENT_PAGE_ID;

    if (!token || !parentPageId) {
      return {
        output: "Notion credentials not configured (NOTION_TOKEN / NOTION_PARENT_PAGE_ID missing).",
        status: "error"
      };
    }

    if (input.action === "create_page") {
      const blocks = contentToBlocks(input.content ?? "");

      const response = await fetch(`${NOTION_API}/pages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Notion-Version": NOTION_VERSION,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          parent: { page_id: parentPageId },
          properties: {
            title: {
              title: [{ text: { content: input.title } }]
            }
          },
          children: blocks
        })
      });

      const data = (await response.json()) as { url?: string; message?: string };

      if (!response.ok) {
        return {
          output: `Notion API error: ${data.message ?? response.statusText}`,
          status: "error"
        };
      }

      return {
        output: `Page created successfully!\nTitle: ${input.title}\nURL: ${data.url ?? "(see Notion)"}`,
        status: "success"
      };
    }

    return { output: "Unsupported notion action.", status: "error" };
  }
};

// ── Markdown → Notion blocks ──────────────────────────────────────────────────

type NotionBlock =
  | { object: "block"; type: "heading_1"; heading_1: { rich_text: RichText[] } }
  | { object: "block"; type: "heading_2"; heading_2: { rich_text: RichText[] } }
  | { object: "block"; type: "heading_3"; heading_3: { rich_text: RichText[] } }
  | { object: "block"; type: "paragraph"; paragraph: { rich_text: RichText[] } }
  | { object: "block"; type: "divider"; divider: Record<string, never> };

type RichText = { type: "text"; text: { content: string }; annotations?: { bold?: boolean } };

function richText(content: string, bold = false): RichText {
  const base: RichText = { type: "text", text: { content } };
  if (bold) base.annotations = { bold: true };
  return base;
}

function parseInline(line: string): RichText[] {
  // Split on **bold** markers
  const parts = line.split(/(\*\*.*?\*\*)/g);
  return parts
    .filter((p) => p.length > 0)
    .map((p) =>
      p.startsWith("**") && p.endsWith("**")
        ? richText(p.slice(2, -2), true)
        : richText(p)
    );
}

function contentToBlocks(content: string): NotionBlock[] {
  const lines = content.split("\n");
  const blocks: NotionBlock[] = [];

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (line.startsWith("### ")) {
      blocks.push({ object: "block", type: "heading_3", heading_3: { rich_text: parseInline(line.slice(4)) } });
    } else if (line.startsWith("## ")) {
      blocks.push({ object: "block", type: "heading_2", heading_2: { rich_text: parseInline(line.slice(3)) } });
    } else if (line.startsWith("# ")) {
      blocks.push({ object: "block", type: "heading_1", heading_1: { rich_text: parseInline(line.slice(2)) } });
    } else if (line === "---" || line === "***") {
      blocks.push({ object: "block", type: "divider", divider: {} });
    } else {
      // Empty line → empty paragraph (spacer)
      blocks.push({ object: "block", type: "paragraph", paragraph: { rich_text: line ? parseInline(line) : [] } });
    }
  }

  return blocks;
}
