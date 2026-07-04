// Storefront notice / announcement types.
//
// A notice is either a POSTER (an image the customer taps to open a link) or a
// CUSTOM design built in the Canva-style editor (gradient background + movable
// text/button elements). Poster data lives in `image_url` + `button_link`;
// custom data lives in the `config` jsonb column.

export type NoticeType = "poster" | "custom";

export type NoticeElementKind = "text" | "button";

// Elements are positioned by PERCENT of the 4:3 canvas, so the admin editor and
// the storefront render identically at any size. Font size is px at the
// reference canvas width (NOTICE_REF_W) and scaled proportionally on render.
export interface NoticeElement {
  id: string;
  kind: NoticeElementKind;
  text: string;
  xPct: number; // 0-100, top-left X
  yPct: number; // 0-100, top-left Y
  fontSize: number; // px at reference width
  color: string;
  bold?: boolean;
  align?: "left" | "center" | "right";
  // button only
  link?: string;
  bg?: string;
  textColor?: string;
}

export interface NoticeGradient {
  from: string;
  to: string;
  angle: number; // degrees
}

export interface NoticeCustomConfig {
  gradient: NoticeGradient;
  elements: NoticeElement[];
}

// A row from the `notices` table.
export interface NoticeRow {
  id: string;
  partner_id?: string;
  image_url: string | null;
  type: string | null; // "poster" | "custom" | legacy "fixed"|"scheduled"
  is_active: boolean;
  show_always?: boolean;
  button_text?: string | null;
  button_link?: string | null;
  starts_at?: string | null;
  expires_at?: string | null;
  priority?: number | null;
  config?: NoticeCustomConfig | null;
  created_at?: string;
}

// Reference canvas width (px) that fontSize values are authored against.
export const NOTICE_REF_W = 800;
// Design aspect ratio of the notice canvas (width:height).
export const NOTICE_ASPECT = 4 / 3;

export const DEFAULT_GRADIENT: NoticeGradient = { from: "#7c3aed", to: "#ec4899", angle: 135 };

export function gradientCss(g: NoticeGradient): string {
  return `linear-gradient(${g.angle}deg, ${g.from}, ${g.to})`;
}

// A fresh custom config with a heading + subtitle + button seeded.
export function defaultCustomConfig(): NoticeCustomConfig {
  return {
    gradient: { ...DEFAULT_GRADIENT },
    elements: [
      { id: "h", kind: "text", text: "Something new!", xPct: 10, yPct: 22, fontSize: 56, color: "#ffffff", bold: true, align: "left" },
      { id: "s", kind: "text", text: "Tell your customers what's happening.", xPct: 10, yPct: 45, fontSize: 26, color: "#f1f5f9", align: "left" },
      { id: "b", kind: "button", text: "Learn more", xPct: 10, yPct: 66, fontSize: 24, color: "#111827", link: "", bg: "#ffffff", textColor: "#111827", align: "left" },
    ],
  };
}

// Normalize any notice row into what the modal should render.
export type RenderableNotice =
  | { id: string; kind: "poster"; imageUrl: string; link: string | null }
  | { id: string; kind: "custom"; config: NoticeCustomConfig; link: string | null }
  | { id: string; kind: "legacy"; title: string; description: string; tag: string; link: string | null };

export function toRenderable(n: NoticeRow): RenderableNotice | null {
  const link = n.button_link || null;
  // A custom notice with no elements would render a blank box — treat as nothing.
  if (n.type === "custom" && n.config?.elements && n.config.elements.length > 0) {
    return { id: n.id, kind: "custom", config: n.config, link };
  }
  if (n.type === "poster" && n.image_url && /^https?:\/\//.test(n.image_url)) {
    return { id: n.id, kind: "poster", imageUrl: n.image_url, link };
  }
  // Legacy: image_url held `json:{title,description,tag}` text notices.
  if (n.image_url?.startsWith("json:")) {
    try {
      const d = JSON.parse(n.image_url.slice(5));
      return { id: n.id, kind: "legacy", title: d.title || "", description: d.description || "", tag: d.tag || "", link };
    } catch {
      /* fall through */
    }
  }
  // A plain image URL with no type still renders as a poster.
  if (n.image_url && /^https?:\/\//.test(n.image_url)) {
    return { id: n.id, kind: "poster", imageUrl: n.image_url, link };
  }
  return null;
}
