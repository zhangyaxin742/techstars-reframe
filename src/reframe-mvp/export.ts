import type { TimelineSegment } from "@/src/data/reframe-demo";
import { mvpBrandContext } from "./data";

export interface MvpExportInput {
  workspaceSlug: string;
  projectSlug: string;
  segments: TimelineSegment[];
}

function getScriptLines(segments: TimelineSegment[]) {
  return segments
    .filter((segment) => segment.kind === "text-overlay" && segment.overlayText)
    .map((segment) => segment.overlayText as string);
}

function getShotRows(segments: TimelineSegment[]) {
  return segments
    .filter((segment) => segment.kind === "clip" || segment.kind === "missing")
    .map((segment, index) => ({
      order: index + 1,
      label: segment.label,
      status: segment.kind === "missing" ? "to film" : "selected",
      asset: segment.selectedAssetLabel ?? segment.mediaAssetId ?? "",
      startMs: segment.startMs,
      endMs: segment.endMs,
    }));
}

function csvEscape(value: string | number) {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function serializeMvpMarkdownBrief(input: MvpExportInput) {
  const scriptLines = getScriptLines(input.segments);
  const shotRows = getShotRows(input.segments);

  return [
    `# ${mvpBrandContext.name} Content Brief`,
    "",
    `Workspace: ${input.workspaceSlug}`,
    `Project: ${input.projectSlug}`,
    "",
    "## Context",
    "",
    `Audience: ${mvpBrandContext.card.audience}`,
    `Pain: ${mvpBrandContext.card.pain}`,
    `Goal: ${mvpBrandContext.card.conversionGoal.name}`,
    "",
    "## Script",
    "",
    ...scriptLines.map((line) => `- ${line}`),
    "",
    "## Shot List",
    "",
    ...shotRows.map((row) => `- ${row.order}. ${row.label} (${row.status})`),
    "",
  ].join("\n");
}

export function serializeMvpJsonPackage(input: MvpExportInput) {
  return JSON.stringify(
    {
      workspaceSlug: input.workspaceSlug,
      projectSlug: input.projectSlug,
      brand: mvpBrandContext.name,
      context: mvpBrandContext.card,
      script: getScriptLines(input.segments),
      storyboard: input.segments,
      shotList: getShotRows(input.segments),
    },
    null,
    2
  );
}

export function serializeMvpShotListCsv(input: MvpExportInput) {
  const rows = getShotRows(input.segments);
  return [
    ["order", "label", "status", "asset", "start_ms", "end_ms"].join(","),
    ...rows.map((row) =>
      [
        row.order,
        csvEscape(row.label),
        row.status,
        csvEscape(row.asset),
        row.startMs,
        row.endMs,
      ].join(",")
    ),
    "",
  ].join("\n");
}

export function serializeMvpScript(input: MvpExportInput) {
  return getScriptLines(input.segments).join("\n\n");
}

export function downloadTextFile(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
