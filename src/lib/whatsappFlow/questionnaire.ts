// Questionnaire step — a native WhatsApp Flow (Meta's in-chat form) authored
// from our own flow builder.
//
// A `questionnaire` node holds pages of fields. On save we compile those into
// Meta's Flow JSON, create + publish a Flow on the partner's WABA, and store the
// resulting flow id back on the node (see metaFlows.ts). At runtime the engine
// sends an `interactive.type = "flow"` message; the customer fills the form
// inside WhatsApp and Meta posts the answers back as `interactive.nfm_reply`,
// which resumes the parked run with every answer bound to a flow variable.
//
// Everything here is PURE (no I/O, no node built-ins) so the builder can import
// it in the browser and the API route can import it on the server.
//
// Docs: https://developers.facebook.com/docs/whatsapp/flows/reference/components
//       https://developers.facebook.com/docs/whatsapp/flows/reference/flowjson

// The Flow JSON version we compile to. 6.3 is the floor for everything used
// here: `label` on selection groups (4.0), global `${screen.X.form.y}` refs
// (4.0), "YYYY-MM-DD" dates (5.0), markdown in TextBody (5.1), CalendarPicker
// (6.1) and `pattern` on TextInput (6.2). Bumping it is a one-line change, but
// it also changes which WhatsApp client versions can open the form, so it stays
// as low as the components allow.
export const FLOW_JSON_VERSION = "6.3";

// Meta's Flow categories. At least one is required when creating a Flow; it only
// affects how the Flow is classified in WhatsApp Manager, never its behaviour.
export const QUESTIONNAIRE_CATEGORIES: { value: string; label: string }[] = [
  { value: "SURVEY", label: "Survey / feedback" },
  { value: "LEAD_GENERATION", label: "Lead generation" },
  { value: "CONTACT_US", label: "Contact us" },
  { value: "CUSTOMER_SUPPORT", label: "Customer support" },
  { value: "APPOINTMENT_BOOKING", label: "Appointment booking" },
  { value: "SIGN_UP", label: "Sign up" },
  { value: "OTHER", label: "Other" },
];

// ─── Field model ─────────────────────────────────────────────────
// One entry per thing a customer can be asked. Kinds ending in a display role
// ("heading" … "paragraph") render text only and produce no answer.
export type QuestionKind =
  // typed entry
  | "text"
  | "textarea"
  | "number"
  | "email"
  | "phone"
  | "password"
  | "passcode"
  // choices
  | "radio"
  | "checkbox"
  | "dropdown"
  // dates
  | "date"
  | "calendar"
  | "date_range"
  // consent
  | "optin"
  // display only
  | "heading"
  | "subheading"
  | "paragraph"
  | "caption";

export interface QuestionOption {
  /** Stable value stored in the answer. Slugified from the title on create. */
  id: string;
  title: string;
  description?: string;
}

export interface QuestionField {
  /** Builder-stable id (never sent to Meta). */
  id: string;
  kind: QuestionKind;
  /** Variable the answer lands in, and the Flow JSON field name. */
  name: string;
  /** Shown on the control itself. */
  label: string;
  /** Second label for a date range's end date. */
  labelEnd?: string;
  /** Body text for the display-only kinds. */
  text?: string;
  required?: boolean;
  /** Small grey line under an input (TextInput/TextArea/date). */
  helperText?: string;
  /** Longer prompt under a choice group's label. */
  description?: string;
  initValue?: string;
  minChars?: number;
  maxChars?: number;
  /** Regex the answer must match (text / number / password / passcode only). */
  pattern?: string;
  options?: QuestionOption[];
  minSelected?: number;
  maxSelected?: number;
  /** "YYYY-MM-DD". */
  minDate?: string;
  maxDate?: string;
}

export interface QuestionnairePage {
  id: string;
  /** Shown in the form's navigation bar. */
  title: string;
  fields: QuestionField[];
}

export interface QuestionnaireData {
  /** Chat message that carries the "open form" button. */
  headerText?: string;
  text: string;
  footerText?: string;
  /** Label of the button that opens the form (Meta: flow_cta). */
  ctaText: string;
  /** Footer label on the last page. */
  submitLabel: string;
  /** Footer label on every page but the last. */
  nextLabel: string;
  category: string;
  /**
   * Send the form once more if the customer replies with a message instead of
   * filling it in. Off by default: a form left unopened is usually a "no", and
   * re-sending it on every unrelated message is how one questionnaire turns
   * into five.
   */
  resendIfIgnored?: boolean;
  pages: QuestionnairePage[];
  // ── Written by the server on save; never edited by hand ──
  /** Meta Flow id this questionnaire was published as. */
  metaFlowId?: string;
  /** Content hash the published Flow was built from (see questionnaireHash). */
  metaFlowHash?: string;
  /** "PUBLISHED" | "DRAFT" — a draft only opens for WABA admins. */
  metaFlowStatus?: string;
  /** Last publish failure, surfaced in the builder. */
  metaFlowError?: string;
}

// ─── Per-kind metadata (drives the editor and the compiler) ──────
export interface QuestionKindMeta {
  label: string;
  /** One-liner shown in the "add field" menu. */
  hint: string;
  /** False for the display-only kinds — they never produce an answer. */
  input: boolean;
  /** Meta's limit on `label` for this component. */
  labelMax: number;
  hasOptions?: boolean;
  hasHelperText?: boolean;
  hasDescription?: boolean;
  hasPattern?: boolean;
  hasLength?: boolean;
  hasDateRange?: boolean;
  /** DatePicker has no `required` property in Flow JSON — the UI says so. */
  canRequire: boolean;
}

export const QUESTION_KIND_META: Record<QuestionKind, QuestionKindMeta> = {
  text: {
    label: "Text box",
    hint: "A single line the customer types into.",
    input: true,
    labelMax: 20,
    hasHelperText: true,
    hasPattern: true,
    hasLength: true,
    canRequire: true,
  },
  textarea: {
    label: "Long answer",
    hint: "A multi-line box, up to 600 characters.",
    input: true,
    labelMax: 20,
    hasHelperText: true,
    hasLength: true,
    canRequire: true,
  },
  number: {
    label: "Number",
    hint: "Digits only — quantity, age, table number…",
    input: true,
    labelMax: 20,
    hasHelperText: true,
    hasPattern: true,
    hasLength: true,
    canRequire: true,
  },
  email: {
    label: "Email",
    hint: "Checked as an email address by WhatsApp.",
    input: true,
    labelMax: 20,
    hasHelperText: true,
    hasLength: true,
    canRequire: true,
  },
  phone: {
    label: "Phone number",
    hint: "A phone keypad, checked as a number.",
    input: true,
    labelMax: 20,
    hasHelperText: true,
    hasLength: true,
    canRequire: true,
  },
  password: {
    label: "Hidden text",
    hint: "Typed characters are masked.",
    input: true,
    labelMax: 20,
    hasHelperText: true,
    hasPattern: true,
    hasLength: true,
    canRequire: true,
  },
  passcode: {
    label: "Passcode",
    hint: "Masked, for short numeric codes.",
    input: true,
    labelMax: 20,
    hasHelperText: true,
    hasPattern: true,
    hasLength: true,
    canRequire: true,
  },
  radio: {
    label: "Radio buttons",
    hint: "Pick exactly one of up to 20 options.",
    input: true,
    labelMax: 30,
    hasOptions: true,
    hasDescription: true,
    canRequire: true,
  },
  checkbox: {
    label: "Checkboxes",
    hint: "Pick any number of up to 20 options.",
    input: true,
    labelMax: 30,
    hasOptions: true,
    hasDescription: true,
    canRequire: true,
  },
  dropdown: {
    label: "Dropdown",
    hint: "Pick one from a long list.",
    input: true,
    labelMax: 20,
    hasOptions: true,
    canRequire: true,
  },
  date: {
    label: "Date picker",
    hint: "A spinning day / month / year wheel.",
    input: true,
    labelMax: 40,
    hasHelperText: true,
    hasDateRange: true,
    canRequire: false,
  },
  calendar: {
    label: "Calendar",
    hint: "A month calendar — one date.",
    input: true,
    labelMax: 40,
    hasHelperText: true,
    hasDescription: true,
    hasDateRange: true,
    canRequire: true,
  },
  date_range: {
    label: "Date range",
    hint: "A calendar with a from and a to date.",
    input: true,
    labelMax: 40,
    hasHelperText: true,
    hasDescription: true,
    hasDateRange: true,
    canRequire: true,
  },
  optin: {
    label: "Checkbox (agree)",
    hint: "A single tick — terms, consent, opt-in.",
    input: true,
    labelMax: 120,
    canRequire: true,
  },
  heading: {
    label: "Heading",
    hint: "Big bold text. No answer.",
    input: false,
    labelMax: 80,
    canRequire: false,
  },
  subheading: {
    label: "Subheading",
    hint: "Smaller bold text. No answer.",
    input: false,
    labelMax: 80,
    canRequire: false,
  },
  paragraph: {
    label: "Paragraph",
    hint: "A block of explanation. No answer.",
    input: false,
    labelMax: 4096,
    canRequire: false,
  },
  caption: {
    label: "Small print",
    hint: "Fine print under a question. No answer.",
    input: false,
    labelMax: 409,
    canRequire: false,
  },
};

/** Order the "add field" menu is drawn in. */
export const QUESTION_KIND_GROUPS: { label: string; kinds: QuestionKind[] }[] = [
  {
    label: "Typing",
    kinds: ["text", "textarea", "number", "email", "phone", "password", "passcode"],
  },
  { label: "Choosing", kinds: ["radio", "checkbox", "dropdown", "optin"] },
  { label: "Dates", kinds: ["date", "calendar", "date_range"] },
  { label: "Text", kinds: ["heading", "subheading", "paragraph", "caption"] },
];

// Meta caps a screen at 50 components; the Footer takes one of them.
export const MAX_FIELDS_PER_PAGE = 49;
export const MAX_OPTIONS = 20;
export const MAX_DROPDOWN_OPTIONS = 200;
export const MAX_TEXTAREA_LENGTH = 600;

// ─── Ids and names ───────────────────────────────────────────────
let seq = 0;
export const genQid = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}_${seq++}`;

/** Flow JSON field names (and our variable names) are lower snake_case. */
export function sanitizeFieldName(raw: string): string {
  return String(raw || "")
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_{2,}/g, "_")
    .slice(0, 40);
}

/** Option ids travel back to us as the raw answer, so keep them readable. */
export function optionIdFromTitle(title: string, fallbackIndex: number): string {
  const slug = sanitizeFieldName(title).slice(0, 30);
  return slug || `option_${fallbackIndex + 1}`;
}

/**
 * `flow_token` is plumbing, and a field called that would collide with it in the
 * response payload. `name` is reserved by nothing but reads badly as a variable.
 */
const RESERVED_FIELD_NAMES = new Set(["flow_token"]);

// ─── Defaults ────────────────────────────────────────────────────
export function defaultQuestionnaireField(kind: QuestionKind): QuestionField {
  const base: QuestionField = {
    id: genQid("q"),
    kind,
    name: "",
    label: "",
  };
  switch (kind) {
    case "radio":
    case "checkbox":
    case "dropdown":
      return {
        ...base,
        label: "Choose one",
        options: [
          { id: "option_1", title: "Option 1" },
          { id: "option_2", title: "Option 2" },
        ],
      };
    case "optin":
      return { ...base, label: "I agree", required: true };
    case "heading":
      return { ...base, text: "" };
    case "subheading":
    case "paragraph":
    case "caption":
      return { ...base, text: "" };
    case "date_range":
      return { ...base, label: "From", labelEnd: "To" };
    default:
      return base;
  }
}

export function defaultQuestionnairePage(index = 0): QuestionnairePage {
  return {
    id: genQid("page"),
    title: index === 0 ? "Questions" : `Page ${index + 1}`,
    fields: [],
  };
}

export function defaultQuestionnaireData(): QuestionnaireData {
  return {
    headerText: "",
    text: "We'd love your feedback — it takes less than a minute.",
    footerText: "",
    ctaText: "Answer",
    submitLabel: "Submit",
    nextLabel: "Continue",
    category: "SURVEY",
    resendIfIgnored: false,
    pages: [{ ...defaultQuestionnairePage(0) }],
  };
}

/** Every page's fields, flattened. */
export function allFields(data: QuestionnaireData): QuestionField[] {
  return (data.pages || []).flatMap((p) => p.fields || []);
}

/** Just the ones that produce an answer (and therefore a variable). */
export function answerFields(data: QuestionnaireData): QuestionField[] {
  return allFields(data).filter((f) => QUESTION_KIND_META[f.kind]?.input);
}

/**
 * The variables a questionnaire node contributes to the rest of the flow — the
 * readable one and its exact-value twin, since a Condition step branching on an
 * option wants `_raw` (an option's stored value survives re-wording its title).
 */
export function questionnaireVariables(data: QuestionnaireData): string[] {
  const out: string[] = [];
  for (const f of answerFields(data)) {
    const name = sanitizeFieldName(f.name);
    if (!name) continue;
    out.push(name, rawVariableName(name));
  }
  return out;
}

// ─── Validation ──────────────────────────────────────────────────
/** Partner-facing problem with a questionnaire, or null when it's fine. */
export function validateQuestionnaire(data: QuestionnaireData): string | null {
  const pages = data?.pages || [];
  if (!pages.length) return "A questionnaire needs at least one page.";
  if (!String(data.ctaText || "").trim())
    return "The questionnaire needs a button label (the button that opens the form).";
  if (!String(data.text || "").trim())
    return "The questionnaire needs a message to send with the form button.";

  const fields = allFields(data);
  if (!fields.length) return "Add at least one question to the questionnaire.";
  if (!answerFields(data).length)
    return "A questionnaire needs at least one question the customer can answer.";

  for (const p of pages) {
    if ((p.fields || []).length > MAX_FIELDS_PER_PAGE) {
      return `A page can hold at most ${MAX_FIELDS_PER_PAGE} items — split it into two pages.`;
    }
  }

  const seen = new Set<string>();
  for (const f of fields) {
    const meta = QUESTION_KIND_META[f.kind];
    if (!meta) return `Unknown question type "${f.kind}".`;

    if (!meta.input) {
      if (!String(f.text || "").trim())
        return `A "${meta.label}" block needs some text.`;
      continue;
    }

    if (!String(f.label || "").trim())
      return `Every question needs a label — one "${meta.label}" is blank.`;

    const name = sanitizeFieldName(f.name);
    if (!name)
      return `"${f.label}" needs an answer variable name (letters, numbers, underscores).`;
    if (RESERVED_FIELD_NAMES.has(name))
      return `"${name}" is reserved — pick another variable name for "${f.label}".`;
    if (seen.has(name))
      return `Two questions both save to {{${name}}} — variable names must be unique.`;
    seen.add(name);

    if (meta.hasOptions) {
      const opts = f.options || [];
      if (opts.length < 1) return `"${f.label}" needs at least one option.`;
      const cap = f.kind === "dropdown" ? MAX_DROPDOWN_OPTIONS : MAX_OPTIONS;
      if (opts.length > cap)
        return `"${f.label}" has ${opts.length} options — WhatsApp allows at most ${cap}.`;
      const ids = new Set<string>();
      for (const o of opts) {
        if (!String(o.title || "").trim())
          return `An option under "${f.label}" is blank.`;
        if (!o.id) return `An option under "${f.label}" has no value.`;
        if (ids.has(o.id))
          return `"${f.label}" has two options with the same value (${o.id}).`;
        ids.add(o.id);
      }
    }
  }
  return null;
}

// ─── Flow JSON compilation ───────────────────────────────────────
const clamp = (s: unknown, n: number) => String(s ?? "").slice(0, n);

/**
 * Screen ids must be stable across saves (later pages reference earlier ones)
 * AND letters-only: Meta validates screen ids against "alphabets and
 * underscores", so the obvious `PAGE_0` is rejected with a PATTERN_MISMATCH that
 * leaves the whole Flow stuck in DRAFT. Hence A, B, … Z, AA, AB.
 */
export function questionnaireScreenId(i: number): string {
  let n = Math.max(0, Math.floor(i));
  let letters = "";
  do {
    letters = String.fromCharCode(65 + (n % 26)) + letters;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return `PAGE_${letters}`;
}

/** The screen a Flow message opens on (`flow_action_payload.screen`). */
export const QUESTIONNAIRE_ENTRY_SCREEN = questionnaireScreenId(0);

const screenId = questionnaireScreenId;

function optionSource(f: QuestionField) {
  return (f.options || []).map((o, i) => {
    const item: Record<string, unknown> = {
      id: o.id || optionIdFromTitle(o.title, i),
      title: clamp(o.title, 30),
    };
    if (String(o.description || "").trim()) {
      item.description = clamp(o.description, 300);
    }
    return item;
  });
}

/** One Flow JSON component for one authored field. */
function compileField(f: QuestionField): Record<string, unknown> | null {
  const meta = QUESTION_KIND_META[f.kind];
  if (!meta) return null;
  const name = sanitizeFieldName(f.name);
  const label = clamp(f.label, meta.labelMax);
  const helper = String(f.helperText || "").trim()
    ? clamp(f.helperText, 80)
    : undefined;
  const description = String(f.description || "").trim()
    ? clamp(f.description, 300)
    : undefined;

  switch (f.kind) {
    case "heading":
      return { type: "TextHeading", text: clamp(f.text, 80) };
    case "subheading":
      return { type: "TextSubheading", text: clamp(f.text, 80) };
    case "paragraph":
      return { type: "TextBody", text: clamp(f.text, 4096) };
    case "caption":
      return { type: "TextCaption", text: clamp(f.text, 409) };

    case "text":
    case "number":
    case "email":
    case "phone":
    case "password":
    case "passcode": {
      const c: Record<string, unknown> = {
        type: "TextInput",
        name,
        label,
        "input-type": f.kind,
      };
      if (f.required) c.required = true;
      if (helper) c["helper-text"] = helper;
      if (f.initValue) c["init-value"] = String(f.initValue);
      if (Number(f.minChars) > 0) c["min-chars"] = Math.round(Number(f.minChars));
      if (Number(f.maxChars) > 0) c["max-chars"] = Math.round(Number(f.maxChars));
      // `pattern` is only honoured for these input-types (Flow JSON 6.2+).
      if (
        f.pattern &&
        (f.kind === "text" ||
          f.kind === "number" ||
          f.kind === "password" ||
          f.kind === "passcode")
      ) {
        c.pattern = String(f.pattern);
      }
      return c;
    }

    case "textarea": {
      const c: Record<string, unknown> = { type: "TextArea", name, label };
      if (f.required) c.required = true;
      if (helper) c["helper-text"] = helper;
      if (f.initValue) c["init-value"] = String(f.initValue);
      const max = Number(f.maxChars);
      if (max > 0) c["max-length"] = Math.min(MAX_TEXTAREA_LENGTH, Math.round(max));
      return c;
    }

    case "radio":
    case "checkbox": {
      const c: Record<string, unknown> = {
        type: f.kind === "radio" ? "RadioButtonsGroup" : "CheckboxGroup",
        name,
        label,
        "data-source": optionSource(f),
      };
      if (f.required) c.required = true;
      if (description) c.description = description;
      if (f.kind === "checkbox") {
        if (Number(f.minSelected) > 0)
          c["min-selected-items"] = Math.round(Number(f.minSelected));
        if (Number(f.maxSelected) > 0)
          c["max-selected-items"] = Math.round(Number(f.maxSelected));
      }
      return c;
    }

    case "dropdown": {
      const c: Record<string, unknown> = {
        type: "Dropdown",
        name,
        label,
        "data-source": optionSource(f),
      };
      if (f.required) c.required = true;
      return c;
    }

    case "date": {
      // DatePicker has no `required` property in Flow JSON — see QUESTION_KIND_META.
      const c: Record<string, unknown> = { type: "DatePicker", name, label };
      if (helper) c["helper-text"] = helper;
      if (f.minDate) c["min-date"] = f.minDate;
      if (f.maxDate) c["max-date"] = f.maxDate;
      return c;
    }

    case "calendar": {
      const c: Record<string, unknown> = {
        type: "CalendarPicker",
        name,
        label,
        mode: "single",
      };
      if (f.required) c.required = true;
      if (helper) c["helper-text"] = helper;
      if (description) c.description = description;
      if (f.minDate) c["min-date"] = f.minDate;
      if (f.maxDate) c["max-date"] = f.maxDate;
      return c;
    }

    case "date_range": {
      // In range mode `label` and `required` are both keyed by start/end date.
      const c: Record<string, unknown> = {
        type: "CalendarPicker",
        name,
        mode: "range",
        label: {
          "start-date": clamp(f.label, meta.labelMax),
          "end-date": clamp(f.labelEnd || "To", meta.labelMax),
        },
      };
      if (f.required) c.required = { "start-date": true, "end-date": true };
      if (helper) c["helper-text"] = helper;
      if (description) c.description = description;
      if (f.minDate) c["min-date"] = f.minDate;
      if (f.maxDate) c["max-date"] = f.maxDate;
      return c;
    }

    case "optin": {
      const c: Record<string, unknown> = { type: "OptIn", name, label };
      if (f.required) c.required = true;
      return c;
    }

    default:
      return null;
  }
}

/**
 * Compile the authored questionnaire into a Flow JSON document.
 *
 * One screen per page, the last one `terminal`. Every page but the last ends in
 * a Footer that navigates to the next; the last Footer `complete`s with a
 * payload naming every answer, which is exactly what comes back to us in
 * `nfm_reply.response_json`. Fields from earlier pages are pulled in with the
 * global `${screen.PAGE_n.form.field}` reference (Flow JSON 4.0+), so no data
 * has to be threaded through the navigate payloads.
 *
 * No `data_api_version` / `endpoint_uri`: this is an endpoint-less Flow, so
 * WhatsApp runs it entirely on the customer's phone and posts the result once.
 */
export function buildQuestionnaireFlowJson(
  data: QuestionnaireData,
): Record<string, unknown> {
  const pages = (data.pages || []).filter((p) => (p.fields || []).length > 0);
  const lastIndex = pages.length - 1;

  // Reference to a field's submitted value from the LAST screen's payload.
  const ref = (pageIndex: number, name: string) =>
    pageIndex === lastIndex
      ? `\${form.${name}}`
      : `\${screen.${screenId(pageIndex)}.form.${name}}`;

  const completePayload: Record<string, string> = {};
  pages.forEach((p, i) => {
    for (const f of p.fields || []) {
      if (!QUESTION_KIND_META[f.kind]?.input) continue;
      const name = sanitizeFieldName(f.name);
      if (name) completePayload[name] = ref(i, name);
    }
  });

  const screens = pages.map((p, i) => {
    const isLast = i === lastIndex;
    const children = (p.fields || [])
      .map(compileField)
      .filter(Boolean) as Record<string, unknown>[];

    children.push(
      isLast
        ? {
            type: "Footer",
            label: clamp(data.submitLabel || "Submit", 35),
            "on-click-action": { name: "complete", payload: completePayload },
          }
        : {
            type: "Footer",
            label: clamp(data.nextLabel || "Continue", 35),
            "on-click-action": {
              name: "navigate",
              next: { type: "screen", name: screenId(i + 1) },
              payload: {},
            },
          },
    );

    const screen: Record<string, unknown> = {
      id: screenId(i),
      title: clamp(p.title || (i === 0 ? "Questions" : `Page ${i + 1}`), 30),
      layout: { type: "SingleColumnLayout", children },
    };
    if (isLast) {
      screen.terminal = true;
      screen.success = true;
    }
    return screen;
  });

  return { version: FLOW_JSON_VERSION, screens };
}

/**
 * Stable fingerprint of everything that ends up inside the published Flow.
 *
 * A published Flow can't be edited, so an edit means creating a NEW Flow on
 * Meta. Comparing this hash to the one stored on the node is how a save that
 * only changed, say, the chat message body avoids re-publishing. djb2 over the
 * compiled JSON — not a security hash, just a cheap change detector that runs
 * identically in the browser and on the server.
 */
export function questionnaireHash(data: QuestionnaireData): string {
  const json = JSON.stringify(buildQuestionnaireFlowJson(data));
  let h = 5381;
  for (let i = 0; i < json.length; i++) {
    h = ((h << 5) + h + json.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(36);
}

// ─── Reading the answers back ────────────────────────────────────
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Meta sends 5.0+ dates as "YYYY-MM-DD" but older clients still send epoch ms. */
function formatDate(v: unknown): string {
  const s = String(v ?? "").trim();
  if (!s) return "";
  if (ISO_DATE.test(s)) return s;
  if (/^\d{10,}$/.test(s)) {
    const d = new Date(Number(s));
    return isNaN(d.getTime()) ? s : d.toISOString().slice(0, 10);
  }
  return s;
}

/** Human-readable form of one answer, for messages and for the inbox. */
function displayValue(f: QuestionField, raw: unknown): string {
  const meta = QUESTION_KIND_META[f.kind];
  if (raw === null || raw === undefined) return "";

  if (meta?.hasOptions) {
    const byId = new Map((f.options || []).map((o) => [o.id, o.title]));
    const ids = Array.isArray(raw)
      ? raw
      : typeof raw === "string" && raw.trim().startsWith("[")
        ? safeJsonArray(raw)
        : [raw];
    return ids
      .map((id) => byId.get(String(id)) ?? String(id))
      .filter(Boolean)
      .join(", ");
  }

  if (f.kind === "optin") {
    if (typeof raw === "boolean") return raw ? "Yes" : "No";
    return String(raw) === "true" ? "Yes" : "No";
  }

  if (f.kind === "date" || f.kind === "calendar") return formatDate(raw);

  if (f.kind === "date_range") {
    const obj =
      typeof raw === "string" ? safeJsonObject(raw) : (raw as Record<string, unknown>);
    if (obj && typeof obj === "object") {
      const from = formatDate(obj["start-date"] ?? obj.start_date);
      const to = formatDate(obj["end-date"] ?? obj.end_date);
      return from && to ? `${from} to ${to}` : from || to;
    }
    return String(raw);
  }

  return String(raw);
}

function safeJsonArray(s: string): unknown[] {
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v : [v];
  } catch {
    return [s];
  }
}

function safeJsonObject(s: string): Record<string, unknown> | null {
  try {
    const v = JSON.parse(s);
    return v && typeof v === "object" ? v : null;
  } catch {
    return null;
  }
}

/** One answered question, as stored on the response row and shown in the table. */
export interface QuestionnaireAnswer {
  name: string;
  label: string;
  kind: QuestionKind;
  /** Readable form — option titles, "Yes"/"No", "2026-08-22". */
  value: string;
  /** Exactly what WhatsApp sent, for exact matching and re-analysis. */
  raw: string;
}

export interface QuestionnaireAnswers {
  /** Variables to merge into the run: `<name>` (readable) + `<name>_raw`. */
  variables: Record<string, string>;
  /** Per-question detail, in the order the questions were asked. */
  answers: QuestionnaireAnswer[];
  /** "Rating: 5 · Comments: Loved it" — used as the reply text and inbox line. */
  summary: string;
}

/** The `_raw` twin of an answer variable. One place, so pickers and docs agree. */
export const rawVariableName = (name: string) => `${name}_raw`;

/**
 * Turn one `nfm_reply.response_json` payload into flow variables.
 *
 * Each answer lands in `{{field_name}}` in the form a partner would want to
 * write back to the customer (option TITLES, "Yes"/"No", "2026-08-22"), and the
 * value WhatsApp actually sent lands in `{{field_name}}_raw` so a Condition step
 * can match an option exactly even after its title is reworded.
 */
export function parseQuestionnaireAnswers(
  data: QuestionnaireData,
  response: Record<string, unknown>,
): QuestionnaireAnswers {
  const variables: Record<string, string> = {};
  const answers: QuestionnaireAnswer[] = [];
  const parts: string[] = [];

  for (const f of answerFields(data)) {
    const name = sanitizeFieldName(f.name);
    if (!name) continue;
    const raw = response[name];
    const shown = displayValue(f, raw);
    const exact =
      raw === null || raw === undefined
        ? ""
        : typeof raw === "object"
          ? JSON.stringify(raw)
          : String(raw);
    variables[name] = shown;
    variables[rawVariableName(name)] = exact;
    answers.push({
      name,
      label: f.label || name,
      kind: f.kind,
      value: shown,
      raw: exact,
    });
    if (shown) parts.push(`${f.label || name}: ${shown}`);
  }

  return { variables, answers, summary: parts.join(" · ") };
}

// ─── Runtime helpers ─────────────────────────────────────────────
/**
 * `flow_token` is echoed back to us with the answers. We resolve the run by
 * (partner, contact) exactly like every other reply, so the token only has to be
 * unique per send — but it carries the node id so a submission can be traced in
 * logs, and the timestamp keeps a re-sent form from reusing a spent token.
 */
export function buildFlowToken(contactPhone: string, nodeId: string): string {
  return `${contactPhone}:${nodeId}:${Date.now().toString(36)}`;
}

/** The node id encoded into a flow_token by buildFlowToken, or null. */
export function nodeIdFromFlowToken(token: unknown): string | null {
  const parts = String(token ?? "").split(":");
  // phone : nodeId : stamp — anything else is a token we didn't mint.
  return parts.length === 3 && parts[1] ? parts[1] : null;
}

/** True once the node has a Meta Flow matching the questionnaire as authored. */
export function isQuestionnairePublished(data: QuestionnaireData): boolean {
  return !!data.metaFlowId && data.metaFlowHash === questionnaireHash(data);
}

/** One-line preview for the step card in both builders. */
export function questionnaireSummary(data: QuestionnaireData): string {
  const n = answerFields(data).length;
  if (!n) return "No questions yet.";
  const pages = (data.pages || []).filter((p) => (p.fields || []).length).length;
  const q = `${n} question${n === 1 ? "" : "s"}`;
  return pages > 1 ? `${q} over ${pages} pages` : q;
}
