import { NextRequest, NextResponse } from "next/server";
import { fetchFromHasura } from "@/lib/hasuraClient";
import type { QuestionnaireAnswer } from "@/lib/whatsappFlow/questionnaire";

// Questionnaire submissions for a partner — what the "Responses" screen reads.
// Rows are written by the flow engine when a customer submits a WhatsApp Flow
// form (see recordQuestionnaireResponse in whatsappFlow/engine.ts).

const LIST = `
  query QuestionnaireResponses($limit: Int!, $offset: Int!, $where: whatsapp_questionnaire_responses_bool_exp!) {
    whatsapp_questionnaire_responses(
      where: $where
      order_by: { submitted_at: desc }
      limit: $limit
      offset: $offset
    ) {
      id
      flow_id
      flow_name
      node_id
      contact_phone
      contact_name
      answers
      summary
      submitted_at
    }
    whatsapp_questionnaire_responses_aggregate(where: $where) {
      aggregate { count }
    }
  }
`;

// Distinct questionnaires that have at least one response, for the filter.
const SOURCES = `
  query QuestionnaireSources($p: uuid!) {
    whatsapp_questionnaire_responses(
      where: { partner_id: { _eq: $p } }
      distinct_on: node_id
    ) {
      node_id
      flow_id
      flow_name
    }
  }
`;

interface ResponseRow {
  id: string;
  flow_id: string | null;
  flow_name: string | null;
  node_id: string;
  contact_phone: string;
  contact_name: string | null;
  answers: QuestionnaireAnswer[];
  summary: string | null;
  submitted_at: string;
}

/**
 * The table's columns, derived from the rows themselves rather than from the
 * questionnaire as it is authored TODAY. A question renamed or deleted last week
 * still has answers in the table, and they would vanish from the screen if the
 * columns came from the current graph.
 */
function deriveColumns(rows: ResponseRow[]): { name: string; label: string }[] {
  const seen = new Map<string, string>();
  for (const r of rows) {
    for (const a of r.answers || []) {
      if (!seen.has(a.name)) seen.set(a.name, a.label || a.name);
    }
  }
  return [...seen].map(([name, label]) => ({ name, label }));
}

function csvCell(v: unknown): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(rows: ResponseRow[], columns: { name: string; label: string }[]): string {
  const head = ["Submitted", "Customer", "Phone", "Questionnaire", ...columns.map((c) => c.label)];
  const lines = [head.map(csvCell).join(",")];
  for (const r of rows) {
    const byName = new Map((r.answers || []).map((a) => [a.name, a.value]));
    lines.push(
      [
        r.submitted_at,
        r.contact_name || "",
        r.contact_phone,
        r.flow_name || "",
        ...columns.map((c) => byName.get(c.name) ?? ""),
      ]
        .map(csvCell)
        .join(","),
    );
  }
  return lines.join("\n");
}

// GET /api/whatsapp/questionnaire-responses?partnerId=&nodeId=&flowId=&limit=&offset=&format=csv
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const partnerId = q.get("partnerId");
  if (!partnerId) {
    return NextResponse.json({ error: "Missing partnerId" }, { status: 400 });
  }

  const nodeId = q.get("nodeId");
  const flowId = q.get("flowId");
  const csv = q.get("format") === "csv";
  // A CSV is meant to be the whole thing, so it ignores the screen's paging.
  const limit = csv
    ? 5000
    : Math.max(1, Math.min(200, Number(q.get("limit")) || 50));
  const offset = csv ? 0 : Math.max(0, Number(q.get("offset")) || 0);

  const where: Record<string, unknown> = { partner_id: { _eq: partnerId } };
  if (nodeId) where.node_id = { _eq: nodeId };
  if (flowId) where.flow_id = { _eq: flowId };

  try {
    const [listRes, sourcesRes] = await Promise.all([
      fetchFromHasura(LIST, { limit, offset, where }),
      csv ? Promise.resolve(null) : fetchFromHasura(SOURCES, { p: partnerId }),
    ]);
    const rows: ResponseRow[] = listRes?.whatsapp_questionnaire_responses || [];
    const columns = deriveColumns(rows);

    if (csv) {
      const name = `questionnaire-responses-${new Date().toISOString().slice(0, 10)}.csv`;
      return new NextResponse(toCsv(rows, columns), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${name}"`,
        },
      });
    }

    return NextResponse.json({
      responses: rows,
      columns,
      total:
        listRes?.whatsapp_questionnaire_responses_aggregate?.aggregate?.count ?? rows.length,
      sources: sourcesRes?.whatsapp_questionnaire_responses || [],
    });
  } catch (e: any) {
    console.error("List questionnaire responses failed:", e);
    return NextResponse.json(
      { error: e?.message || "Failed to load responses" },
      { status: 500 },
    );
  }
}
