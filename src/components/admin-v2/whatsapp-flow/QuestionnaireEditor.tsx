"use client";

import * as React from "react";
import {
  ChevronDown,
  ChevronUp,
  GripVertical,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VariableTextInput } from "./VariableTextInput";
import {
  MAX_DROPDOWN_OPTIONS,
  MAX_FIELDS_PER_PAGE,
  MAX_OPTIONS,
  MAX_TEXTAREA_LENGTH,
  QUESTIONNAIRE_CATEGORIES,
  QUESTION_KIND_GROUPS,
  QUESTION_KIND_META,
  answerFields,
  defaultQuestionnaireField,
  defaultQuestionnairePage,
  isQuestionnairePublished,
  optionIdFromTitle,
  sanitizeFieldName,
  validateQuestionnaire,
  type QuestionField,
  type QuestionKind,
  type QuestionnaireData,
  type QuestionnairePage,
} from "@/lib/whatsappFlow/questionnaire";

/**
 * The questionnaire step's editor — shared verbatim by the admin-v2 flow builder
 * and the admin-v3 flow editor, so a questionnaire authored in either one is the
 * same document (and so there is only one place to fix a WhatsApp limit).
 *
 * What it edits is `QuestionnaireData` on the node: the chat message that
 * carries the "open form" button, then the pages of questions that become a
 * native WhatsApp Flow. Everything about compiling that to Flow JSON, publishing
 * it, and reading answers back lives in lib/whatsappFlow/questionnaire.ts — this
 * file is only the form over it.
 *
 * The Meta binding (metaFlowId / metaFlowHash / metaFlowStatus) is written by
 * the save endpoint, never here; the banner at the top just reports it.
 */
export function QuestionnaireEditor({
  data,
  onChange,
  variables,
}: {
  data: QuestionnaireData;
  /** Patch the node's data (same contract as the builders' updateNodeData). */
  onChange: (patch: Partial<QuestionnaireData>) => void;
  /** Flow variables offered by the "#" picker in the message fields. */
  variables: string[];
}) {
  const pages = data.pages || [];
  const problem = validateQuestionnaire(data);

  const setPages = (next: QuestionnairePage[]) => onChange({ pages: next });

  const patchPage = (pageIndex: number, patch: Partial<QuestionnairePage>) => {
    setPages(pages.map((p, i) => (i === pageIndex ? { ...p, ...patch } : p)));
  };

  const addField = (pageIndex: number, kind: QuestionKind) => {
    const page = pages[pageIndex];
    if (!page) return;
    patchPage(pageIndex, {
      fields: [...(page.fields || []), defaultQuestionnaireField(kind)],
    });
  };

  const patchField = (
    pageIndex: number,
    fieldIndex: number,
    patch: Partial<QuestionField>,
  ) => {
    const page = pages[pageIndex];
    if (!page) return;
    patchPage(pageIndex, {
      fields: (page.fields || []).map((f, i) =>
        i === fieldIndex ? { ...f, ...patch } : f,
      ),
    });
  };

  const removeField = (pageIndex: number, fieldIndex: number) => {
    const page = pages[pageIndex];
    if (!page) return;
    patchPage(pageIndex, {
      fields: (page.fields || []).filter((_, i) => i !== fieldIndex),
    });
  };

  const moveField = (pageIndex: number, fieldIndex: number, delta: number) => {
    const page = pages[pageIndex];
    if (!page) return;
    const fields = [...(page.fields || [])];
    const to = fieldIndex + delta;
    if (to < 0 || to >= fields.length) return;
    [fields[fieldIndex], fields[to]] = [fields[to], fields[fieldIndex]];
    patchPage(pageIndex, { fields });
  };

  const addPage = () => setPages([...pages, defaultQuestionnairePage(pages.length)]);

  const removePage = (pageIndex: number) => {
    if (pages.length <= 1) return;
    setPages(pages.filter((_, i) => i !== pageIndex));
  };

  const answers = answerFields(data);

  return (
    <div className="space-y-4">
      <PublishBanner data={data} problem={problem} />

      {/* ── The chat message that carries the form button ── */}
      <Section title="Message in the chat">
        <Row label="Header (optional)">
          <Input
            value={data.headerText || ""}
            onChange={(e) => onChange({ headerText: e.target.value })}
            maxLength={60}
            placeholder="Quick feedback"
          />
        </Row>
        <Row label="Message">
          <VariableTextInput
            multiline
            rows={3}
            variables={variables}
            value={data.text || ""}
            onChange={(v) => onChange({ text: v })}
            placeholder="How did we do? (type # for variables)"
          />
        </Row>
        <Row label="Footer (optional)">
          <Input
            value={data.footerText || ""}
            onChange={(e) => onChange({ footerText: e.target.value })}
            maxLength={60}
            placeholder="Takes 30 seconds"
          />
        </Row>
        <Row label="Button that opens the form">
          <Input
            value={data.ctaText || ""}
            onChange={(e) => onChange({ ctaText: e.target.value })}
            maxLength={30}
            placeholder="Answer"
          />
        </Row>
      </Section>

      {/* ── The form itself ── */}
      {pages.map((page, pageIndex) => (
        <div key={page.id} className="rounded-lg border">
          <div className="flex items-center gap-2 border-b bg-muted/40 px-2.5 py-2">
            <Input
              value={page.title || ""}
              onChange={(e) => patchPage(pageIndex, { title: e.target.value })}
              maxLength={30}
              placeholder={pageIndex === 0 ? "Questions" : `Page ${pageIndex + 1}`}
              className="h-8 flex-1 bg-background text-xs font-medium"
            />
            <span className="shrink-0 text-[11px] text-muted-foreground">
              Page {pageIndex + 1}/{pages.length}
            </span>
            {pages.length > 1 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-1.5 text-red-600 hover:text-red-700"
                onClick={() => removePage(pageIndex)}
                title="Delete this page"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>

          <div className="space-y-2 p-2.5">
            {(page.fields || []).length === 0 && (
              <p className="py-2 text-center text-xs text-muted-foreground">
                No questions on this page yet.
              </p>
            )}
            {(page.fields || []).map((field, fieldIndex) => (
              <FieldCard
                key={field.id}
                field={field}
                index={fieldIndex}
                count={(page.fields || []).length}
                onChange={(patch) => patchField(pageIndex, fieldIndex, patch)}
                onDelete={() => removeField(pageIndex, fieldIndex)}
                onMove={(delta) => moveField(pageIndex, fieldIndex, delta)}
              />
            ))}

            <AddFieldSelect
              disabled={(page.fields || []).length >= MAX_FIELDS_PER_PAGE}
              onPick={(kind) => addField(pageIndex, kind)}
            />
          </div>
        </div>
      ))}

      <Button variant="outline" size="sm" onClick={addPage} className="w-full">
        <Plus className="mr-1 h-3 w-3" /> Add a page
      </Button>

      {/* ── Buttons + behaviour ── */}
      <Section title="Form buttons">
        <div className="grid grid-cols-2 gap-2">
          <Row label="Submit button">
            <Input
              value={data.submitLabel || ""}
              onChange={(e) => onChange({ submitLabel: e.target.value })}
              maxLength={35}
              placeholder="Submit"
            />
          </Row>
          <Row label="Next-page button">
            <Input
              value={data.nextLabel || ""}
              onChange={(e) => onChange({ nextLabel: e.target.value })}
              maxLength={35}
              placeholder="Continue"
            />
          </Row>
        </div>
        <Row label="What this form is for">
          <Select
            value={data.category || "SURVEY"}
            onValueChange={(v) => onChange({ category: v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {QUESTIONNAIRE_CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Row>
        <label className="flex items-start gap-2 pt-1">
          <Switch
            checked={!!data.resendIfIgnored}
            onCheckedChange={(v) => onChange({ resendIfIgnored: v })}
          />
          <span className="text-xs leading-snug text-muted-foreground">
            Send the form once more if they reply with a message instead of
            filling it in. Off by default — an unopened form is usually a no.
          </span>
        </label>
      </Section>

      {/* ── What the rest of the flow can use ── */}
      {answers.length > 0 && (
        <div className="rounded-md border bg-muted/40 p-2 text-[11px] leading-relaxed text-muted-foreground">
          <p className="font-medium text-foreground">Answers you can use later</p>
          <p>
            In any later step, type <span className="font-mono">#</span> to insert
            one of these:
          </p>
          <dl className="mt-1 space-y-0.5">
            {answers.map((f) => {
              const name = sanitizeFieldName(f.name);
              if (!name) return null;
              return (
                <div key={f.id} className="flex gap-1.5">
                  <dt className="shrink-0 font-mono text-foreground">{`{{${name}}}`}</dt>
                  <dd className="min-w-0">— {f.label || QUESTION_KIND_META[f.kind]?.label}</dd>
                </div>
              );
            })}
          </dl>
          <p className="mt-1">
            Each one also has a{" "}
            <span className="font-mono">{"{{name_raw}}"}</span> twin holding the
            exact value WhatsApp sent — use that in a Condition step so re-wording
            an option later doesn&apos;t break the branch.
          </p>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ banner */

function PublishBanner({
  data,
  problem,
}: {
  data: QuestionnaireData;
  problem: string | null;
}) {
  if (problem) {
    return (
      <Note tone="warn" icon={AlertTriangle}>
        {problem}
      </Note>
    );
  }
  if (data.metaFlowError) {
    return (
      <Note tone="warn" icon={AlertTriangle}>
        WhatsApp didn&apos;t accept this form: {data.metaFlowError}
      </Note>
    );
  }
  if (isQuestionnairePublished(data) && data.metaFlowStatus === "PUBLISHED") {
    return (
      <Note tone="ok" icon={CheckCircle2}>
        Live on WhatsApp — customers who tap “{data.ctaText || "Answer"}” get this
        form.
      </Note>
    );
  }
  return (
    <Note tone="info" icon={Info}>
      Save the flow to publish this form to WhatsApp. It can&apos;t be sent until
      then.
    </Note>
  );
}

function Note({
  tone,
  icon: Icon,
  children,
}: {
  tone: "ok" | "warn" | "info";
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  const cls =
    tone === "ok"
      ? "border-green-200 bg-green-50 text-green-800"
      : tone === "warn"
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : "border-sky-200 bg-sky-50 text-sky-800";
  return (
    <div className={`flex gap-1.5 rounded-md border p-2 text-[11px] leading-relaxed ${cls}`}>
      <Icon className="mt-px h-3.5 w-3.5 shrink-0" />
      <span className="min-w-0">{children}</span>
    </div>
  );
}

/* ------------------------------------------------------------- field card */

function FieldCard({
  field,
  index,
  count,
  onChange,
  onDelete,
  onMove,
}: {
  field: QuestionField;
  index: number;
  count: number;
  onChange: (patch: Partial<QuestionField>) => void;
  onDelete: () => void;
  onMove: (delta: number) => void;
}) {
  const meta = QUESTION_KIND_META[field.kind];
  const [open, setOpen] = React.useState(!field.label && !field.text);
  // The variable name follows the label until someone edits it by hand — after
  // that it is theirs, because renaming a variable silently would break every
  // {{placeholder}} already written into later steps.
  const [nameTouched, setNameTouched] = React.useState(
    !!field.name && field.name !== sanitizeFieldName(field.label || ""),
  );

  const setLabel = (label: string) => {
    const patch: Partial<QuestionField> = { label };
    if (!nameTouched && meta?.input) patch.name = sanitizeFieldName(label);
    onChange(patch);
  };

  const preview = meta?.input
    ? field.label || "Untitled question"
    : field.text || `Empty ${meta?.label?.toLowerCase() || "block"}`;

  return (
    <div className="rounded-md border bg-background">
      <div className="flex items-center gap-1 px-2 py-1.5">
        <GripVertical className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="min-w-0 flex-1 text-left"
        >
          <span className="block truncate text-xs font-medium">{preview}</span>
          <span className="block truncate text-[10px] text-muted-foreground">
            {meta?.label}
            {meta?.input && field.name ? ` · {{${sanitizeFieldName(field.name)}}}` : ""}
            {field.required ? " · required" : ""}
          </span>
        </button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          disabled={index === 0}
          onClick={() => onMove(-1)}
          title="Move up"
        >
          <ChevronUp className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0"
          disabled={index === count - 1}
          onClick={() => onMove(1)}
          title="Move down"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
          onClick={onDelete}
          title="Delete"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {open && (
        <div className="space-y-2 border-t px-2 py-2">
          {!meta?.input ? (
            <Row label="Text">
              <Textarea
                rows={2}
                value={field.text || ""}
                onChange={(e) => onChange({ text: e.target.value })}
                maxLength={meta?.labelMax}
                placeholder={
                  field.kind === "heading"
                    ? "Tell us what you thought"
                    : "A short explanation…"
                }
              />
            </Row>
          ) : (
            <>
              <Row
                label={field.kind === "date_range" ? "Label for the first date" : "Question"}
                hint={`${(field.label || "").length}/${meta.labelMax}`}
              >
                <Input
                  value={field.label || ""}
                  onChange={(e) => setLabel(e.target.value)}
                  maxLength={meta.labelMax}
                  placeholder="How was the food?"
                />
              </Row>

              {field.kind === "date_range" && (
                <Row label="Label for the second date">
                  <Input
                    value={field.labelEnd || ""}
                    onChange={(e) => onChange({ labelEnd: e.target.value })}
                    maxLength={meta.labelMax}
                    placeholder="To"
                  />
                </Row>
              )}

              <Row label="Save the answer as" hint="use it later as {{name}}">
                <Input
                  value={field.name || ""}
                  onChange={(e) => {
                    setNameTouched(true);
                    onChange({ name: sanitizeFieldName(e.target.value) });
                  }}
                  placeholder="food_rating"
                />
              </Row>

              {meta.hasDescription && (
                <Row label="Description (optional)">
                  <Textarea
                    rows={2}
                    value={field.description || ""}
                    onChange={(e) => onChange({ description: e.target.value })}
                    maxLength={300}
                    placeholder="Shown under the question"
                  />
                </Row>
              )}

              {meta.hasHelperText && (
                <Row label="Helper text (optional)">
                  <Input
                    value={field.helperText || ""}
                    onChange={(e) => onChange({ helperText: e.target.value })}
                    maxLength={80}
                    placeholder="Small grey line under the box"
                  />
                </Row>
              )}

              {meta.hasOptions && (
                <OptionsEditor
                  field={field}
                  onChange={onChange}
                  max={field.kind === "dropdown" ? MAX_DROPDOWN_OPTIONS : MAX_OPTIONS}
                />
              )}

              {field.kind === "checkbox" && (
                <div className="grid grid-cols-2 gap-2">
                  <Row label="Pick at least">
                    <Input
                      type="number"
                      min={0}
                      value={field.minSelected ?? ""}
                      onChange={(e) =>
                        onChange({ minSelected: numberOrUndefined(e.target.value) })
                      }
                      placeholder="any"
                    />
                  </Row>
                  <Row label="Pick at most">
                    <Input
                      type="number"
                      min={1}
                      value={field.maxSelected ?? ""}
                      onChange={(e) =>
                        onChange({ maxSelected: numberOrUndefined(e.target.value) })
                      }
                      placeholder="any"
                    />
                  </Row>
                </div>
              )}

              {meta.hasLength && (
                <div className="grid grid-cols-2 gap-2">
                  {field.kind !== "textarea" && (
                    <Row label="Min characters">
                      <Input
                        type="number"
                        min={0}
                        value={field.minChars ?? ""}
                        onChange={(e) =>
                          onChange({ minChars: numberOrUndefined(e.target.value) })
                        }
                        placeholder="—"
                      />
                    </Row>
                  )}
                  <Row
                    label="Max characters"
                    hint={field.kind === "textarea" ? `up to ${MAX_TEXTAREA_LENGTH}` : undefined}
                  >
                    <Input
                      type="number"
                      min={1}
                      max={field.kind === "textarea" ? MAX_TEXTAREA_LENGTH : undefined}
                      value={field.maxChars ?? ""}
                      onChange={(e) =>
                        onChange({ maxChars: numberOrUndefined(e.target.value) })
                      }
                      placeholder="—"
                    />
                  </Row>
                </div>
              )}

              {meta.hasPattern && (
                <Row label="Must match (optional)" hint="regular expression">
                  <Input
                    value={field.pattern || ""}
                    onChange={(e) => onChange({ pattern: e.target.value })}
                    placeholder="[0-9]{6}"
                    className="font-mono text-xs"
                  />
                </Row>
              )}

              {meta.hasDateRange && (
                <div className="grid grid-cols-2 gap-2">
                  <Row label="Earliest date">
                    <Input
                      type="date"
                      value={field.minDate || ""}
                      onChange={(e) => onChange({ minDate: e.target.value })}
                    />
                  </Row>
                  <Row label="Latest date">
                    <Input
                      type="date"
                      value={field.maxDate || ""}
                      onChange={(e) => onChange({ maxDate: e.target.value })}
                    />
                  </Row>
                </div>
              )}

              {meta.canRequire ? (
                <label className="flex items-center gap-2 pt-0.5">
                  <Switch
                    checked={!!field.required}
                    onCheckedChange={(v) => onChange({ required: v })}
                  />
                  <span className="text-xs">Must be answered</span>
                </label>
              ) : field.kind === "date" ? (
                <p className="text-[11px] text-muted-foreground">
                  WhatsApp&apos;s date wheel can&apos;t be made compulsory — use
                  “Calendar” if the answer is required.
                </p>
              ) : null}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function numberOrUndefined(v: string): number | undefined {
  const n = Number(v);
  return v.trim() === "" || !Number.isFinite(n) ? undefined : Math.max(0, Math.round(n));
}

/* ---------------------------------------------------------------- options */

function OptionsEditor({
  field,
  onChange,
  max,
}: {
  field: QuestionField;
  onChange: (patch: Partial<QuestionField>) => void;
  max: number;
}) {
  const options = field.options || [];

  const patchOption = (i: number, title: string) => {
    const next = options.map((o, j) =>
      j === i
        ? {
            ...o,
            title,
            // An option's id is the value we get back and that Condition steps
            // match on. Keep it in step with the title while the option is still
            // being written, but never rewrite one that has already been used in
            // a saved flow — hence: only when it still looks auto-generated.
            id: o.id === optionIdFromTitle(o.title, i) || !o.id
              ? optionIdFromTitle(title, i)
              : o.id,
          }
        : o,
    );
    onChange({ options: next });
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-xs">Options ({options.length}/{max})</Label>
      {options.map((o, i) => (
        <div key={`${o.id}_${i}`} className="flex items-center gap-1">
          <Input
            value={o.title}
            onChange={(e) => patchOption(i, e.target.value)}
            maxLength={30}
            placeholder={`Option ${i + 1}`}
          />
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 shrink-0 p-0"
            disabled={options.length <= 1}
            onClick={() => onChange({ options: options.filter((_, j) => j !== i) })}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}
      {options.length < max && (
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            onChange({
              options: [
                ...options,
                {
                  id: optionIdFromTitle(`Option ${options.length + 1}`, options.length),
                  title: `Option ${options.length + 1}`,
                },
              ],
            })
          }
        >
          <Plus className="mr-1 h-3 w-3" /> Add option
        </Button>
      )}
    </div>
  );
}

/* -------------------------------------------------------------- add field */

function AddFieldSelect({
  onPick,
  disabled,
}: {
  onPick: (kind: QuestionKind) => void;
  disabled?: boolean;
}) {
  // Keyed so the Select resets to its placeholder after every pick — it is an
  // action menu, not a value.
  const [nonce, setNonce] = React.useState(0);
  return (
    <Select
      key={nonce}
      value=""
      disabled={disabled}
      onValueChange={(v) => {
        onPick(v as QuestionKind);
        setNonce((n) => n + 1);
      }}
    >
      {/* A <div>, not a <span>: SelectTrigger carries `[&>span]:line-clamp-1`,
          which would override the flex row and drop the icon onto its own line. */}
      <SelectTrigger className="h-8 text-xs">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Plus className="h-3 w-3 shrink-0" />
          {disabled ? "Page is full — add a page" : "Add a question"}
        </div>
      </SelectTrigger>
      <SelectContent>
        {QUESTION_KIND_GROUPS.map((group) => (
          <SelectGroup key={group.label}>
            <SelectLabel>{group.label}</SelectLabel>
            {group.kinds.map((kind) => (
              <SelectItem key={kind} value={kind}>
                <span className="flex flex-col">
                  <span>{QUESTION_KIND_META[kind].label}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {QUESTION_KIND_META[kind].hint}
                  </span>
                </span>
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  );
}

/* ---------------------------------------------------------------- layout */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2 rounded-lg border p-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      {children}
    </div>
  );
}

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-baseline justify-between gap-2">
        <Label className="text-xs">{label}</Label>
        {hint && <span className="text-[10px] text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </div>
  );
}
