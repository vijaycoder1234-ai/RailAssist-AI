import jsPDF from "jspdf";
import { db, type IncidentRow } from "@/lib/db";

interface OpsTask {
  id: string;
  incident_id: string;
  priority: "low" | "medium" | "high" | "critical";
  status: string;
  due_at: string | null;
  accepted_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  completion_report: string | null;
  remarks: string | null;
  notes: string | null;
  created_at: string;
}

const PRIMARY = { r: 15, g: 23, b: 42 };
const ACCENT = { r: 30, g: 64, b: 175 };

function hoursBetween(a?: string | null, b?: string | null) {
  if (!a || !b) return null;
  const ms = new Date(b).getTime() - new Date(a).getTime();
  if (!isFinite(ms) || ms < 0) return null;
  return ms / 36e5;
}

function fmtHours(h: number | null) {
  if (h == null) return "—";
  if (h < 1) return `${Math.round(h * 60)} min`;
  if (h < 48) return `${h.toFixed(1)} h`;
  return `${(h / 24).toFixed(1)} d`;
}

export async function downloadMaintenanceOpsReport() {
  const [{ data: tasksData }, { data: incData }] = await Promise.all([
    db.from("maintenance_tasks").select("*").order("created_at", { ascending: false }),
    db.from("incidents").select("*").order("created_at", { ascending: false }),
  ]);
  const tasks = (tasksData as OpsTask[]) ?? [];
  const incidents = (incData as IncidentRow[]) ?? [];
  const incidentById = new Map(incidents.map((i) => [i.id, i] as const));

  // ---- KPIs ----
  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === "completed").length;
  const active = tasks.filter((t) => ["assigned", "accepted", "in_progress", "awaiting_verification"].includes(t.status)).length;
  const critical = tasks.filter((t) => t.priority === "critical").length;
  const overdue = tasks.filter((t) => t.due_at && t.status !== "completed" && new Date(t.due_at) < new Date()).length;
  const completionRate = total ? Math.round((completed / total) * 100) : 0;

  const acceptHours: number[] = [];
  const completeHours: number[] = [];
  tasks.forEach((t) => {
    const a = hoursBetween(t.created_at, t.accepted_at);
    const c = hoursBetween(t.created_at, t.completed_at);
    if (a != null) acceptHours.push(a);
    if (c != null) completeHours.push(c);
  });
  const avg = (xs: number[]) => (xs.length ? xs.reduce((s, v) => s + v, 0) / xs.length : null);
  const avgAccept = avg(acceptHours);
  const avgComplete = avg(completeHours);

  // breakdowns
  const byPriority: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  const byStatus: Record<string, number> = {};
  tasks.forEach((t) => {
    byPriority[t.priority] = (byPriority[t.priority] ?? 0) + 1;
    byStatus[t.status] = (byStatus[t.status] ?? 0) + 1;
  });

  // top categories from linked incidents
  const catCount: Record<string, number> = {};
  tasks.forEach((t) => {
    const inc = incidentById.get(t.incident_id);
    if (inc?.category) catCount[inc.category] = (catCount[inc.category] ?? 0) + 1;
  });
  const topCategories = Object.entries(catCount).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // ---- Build PDF ----
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 40;
  let y = margin;

  const ensureSpace = (h: number) => { if (y + h > pageH - margin) { doc.addPage(); y = margin; } };
  const text = (s: string, size = 10, bold = false, color: { r: number; g: number; b: number } = { r: 0, g: 0, b: 0 }) => {
    doc.setFontSize(size); doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setTextColor(color.r, color.g, color.b);
    const lines = doc.splitTextToSize(s, pageW - margin * 2);
    ensureSpace(lines.length * size * 1.25);
    doc.text(lines, margin, y);
    y += lines.length * size * 1.25 + 4;
  };
  const section = (s: string) => {
    ensureSpace(34);
    y += 8;
    doc.setDrawColor(ACCENT.r, ACCENT.g, ACCENT.b); doc.setLineWidth(2);
    doc.line(margin, y, margin + 28, y); y += 10;
    text(s, 14, true, PRIMARY);
  };

  // Cover header
  doc.setFillColor(PRIMARY.r, PRIMARY.g, PRIMARY.b);
  doc.rect(0, 0, pageW, 110, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold"); doc.setFontSize(22);
  doc.text("RailAssist AI", margin, 44);
  doc.setFontSize(13); doc.setFont("helvetica", "normal");
  doc.text("Maintenance Operations — Advanced Report", margin, 66);
  doc.setFontSize(9); doc.setTextColor(180, 200, 240);
  doc.text(`Generated ${new Date().toLocaleString()}`, margin, 88);
  doc.text(`${total} tasks • ${incidents.length} incidents`, pageW - margin, 88, { align: "right" });
  doc.setTextColor(0, 0, 0);
  y = 140;

  // Executive summary
  section("Executive Summary");
  text(
    `This report aggregates the live state of the maintenance workforce across ${incidents.length} reported incidents. ` +
    `Of ${total} work orders dispatched, ${completed} have been completed (${completionRate}% completion rate), ` +
    `${active} are currently active, and ${overdue} have crossed their due date without closure. ` +
    `${critical} tasks are tagged critical priority and require continuous monitoring.`,
  );

  // KPI grid
  section("Key Performance Indicators");
  const kpis: [string, string][] = [
    ["Total work orders", String(total)],
    ["Completed", `${completed} (${completionRate}%)`],
    ["Active", String(active)],
    ["Overdue", String(overdue)],
    ["Critical priority", String(critical)],
    ["Avg. time to accept", fmtHours(avgAccept)],
    ["Avg. time to complete", fmtHours(avgComplete)],
    ["Linked incidents", String(incidents.length)],
  ];
  const colW = (pageW - margin * 2) / 4;
  const rowH = 56;
  ensureSpace(rowH * 2 + 8);
  kpis.forEach((k, i) => {
    const col = i % 4; const row = Math.floor(i / 4);
    const x = margin + col * colW; const yy = y + row * rowH;
    doc.setDrawColor(220); doc.setFillColor(248, 250, 252);
    doc.roundedRect(x + 4, yy, colW - 8, rowH - 8, 6, 6, "FD");
    doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(100);
    doc.text(k[0].toUpperCase(), x + 12, yy + 16);
    doc.setFontSize(15); doc.setFont("helvetica", "bold"); doc.setTextColor(PRIMARY.r, PRIMARY.g, PRIMARY.b);
    doc.text(k[1], x + 12, yy + 36);
  });
  y += rowH * 2 + 4;
  doc.setTextColor(0, 0, 0);

  // Bar chart: priority
  section("Workload by Priority");
  const priColors: Record<string, [number, number, number]> = {
    critical: [220, 38, 38], high: [234, 88, 12], medium: [202, 138, 4], low: [22, 163, 74],
  };
  const maxPri = Math.max(1, ...Object.values(byPriority));
  const barChartW = pageW - margin * 2 - 120;
  ensureSpace(110);
  (["critical", "high", "medium", "low"] as const).forEach((p, i) => {
    const yy = y + i * 22;
    const w = (byPriority[p] / maxPri) * barChartW;
    doc.setFontSize(9); doc.setFont("helvetica", "bold"); doc.setTextColor(60);
    doc.text(p.toUpperCase(), margin, yy + 12);
    const [r, g, b] = priColors[p];
    doc.setFillColor(r, g, b);
    doc.roundedRect(margin + 80, yy, Math.max(2, w), 14, 3, 3, "F");
    doc.setFont("helvetica", "normal"); doc.setTextColor(40);
    doc.text(String(byPriority[p]), margin + 84 + Math.max(2, w) + 6, yy + 12);
  });
  y += 4 * 22 + 6;

  // Status breakdown
  section("Status Distribution");
  Object.entries(byStatus).sort((a, b) => b[1] - a[1]).forEach(([s, n]) => {
    text(`• ${s.replace(/_/g, " ")}: ${n}`);
  });

  // Top categories
  if (topCategories.length) {
    section("Top Incident Categories Requiring Maintenance");
    topCategories.forEach(([c, n]) => text(`• ${c.replace(/_/g, " ")}: ${n} task(s)`));
  }

  // Detailed task table
  section("Detailed Work Orders");
  const headers = ["#", "Incident", "Priority", "Status", "Created", "Completed"];
  const colWidths = [24, 200, 60, 90, 75, 75];
  const drawHeader = () => {
    ensureSpace(22);
    doc.setFillColor(PRIMARY.r, PRIMARY.g, PRIMARY.b);
    doc.rect(margin, y, pageW - margin * 2, 18, "F");
    doc.setFontSize(8); doc.setFont("helvetica", "bold"); doc.setTextColor(255);
    let x = margin + 4;
    headers.forEach((h, i) => { doc.text(h, x, y + 12); x += colWidths[i]; });
    y += 22;
    doc.setTextColor(0);
  };
  drawHeader();
  tasks.forEach((t, idx) => {
    const inc = incidentById.get(t.incident_id);
    const row = [
      String(idx + 1),
      (inc?.title ?? "—").slice(0, 60),
      t.priority,
      t.status.replace(/_/g, " "),
      new Date(t.created_at).toLocaleDateString(),
      t.completed_at ? new Date(t.completed_at).toLocaleDateString() : "—",
    ];
    ensureSpace(18);
    if (idx % 2 === 0) { doc.setFillColor(248, 250, 252); doc.rect(margin, y - 2, pageW - margin * 2, 16, "F"); }
    doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(30);
    let x = margin + 4;
    row.forEach((c, i) => {
      const lines = doc.splitTextToSize(String(c), colWidths[i] - 6);
      doc.text(lines[0] ?? "", x, y + 10);
      x += colWidths[i];
    });
    y += 16;
  });

  // Footer page numbers
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8); doc.setTextColor(120);
    doc.text(`Page ${i} of ${pages} — RailAssist AI confidential operations report`, pageW / 2, pageH - 20, { align: "center" });
  }

  doc.save(`maintenance-ops-report-${new Date().toISOString().slice(0, 10)}.pdf`);
}
