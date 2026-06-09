import jsPDF from "jspdf";
import { db, type IncidentRow } from "@/lib/db";

interface MediaRow { id: string; file_path: string; mime_type: string | null; kind: string }

async function fetchImageDataUrl(url: string): Promise<{ data: string; format: "JPEG" | "PNG" } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    const reader = new FileReader();
    return await new Promise((resolve) => {
      reader.onload = () => {
        const data = reader.result as string;
        const format = blob.type.includes("png") ? "PNG" : "JPEG";
        resolve({ data, format });
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function downloadIncidentPdf(incident: IncidentRow) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 40;
  let y = margin;

  const ensureSpace = (h: number) => {
    if (y + h > pageH - margin) { doc.addPage(); y = margin; }
  };
  const text = (s: string, size = 10, bold = false) => {
    doc.setFontSize(size);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    const lines = doc.splitTextToSize(s, pageW - margin * 2);
    ensureSpace(lines.length * size * 1.25);
    doc.text(lines, margin, y);
    y += lines.length * size * 1.25 + 4;
  };
  const sectionTitle = (s: string) => {
    ensureSpace(28);
    doc.setDrawColor(30, 64, 175);
    doc.setLineWidth(2);
    doc.line(margin, y, margin + 24, y);
    y += 8;
    text(s, 13, true);
  };

  // Header
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageW, 80, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("RailAssist AI", margin, 38);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("Incident Report", margin, 60);
  doc.setFontSize(9);
  doc.text(`Generated ${new Date().toLocaleString()}`, pageW - margin, 60, { align: "right" });
  doc.setTextColor(0, 0, 0);
  y = 110;

  // Title + meta
  text(incident.title, 16, true);
  text(
    `ID: ${incident.id.slice(0, 8)}    Severity: ${incident.severity.toUpperCase()}    Status: ${incident.status.replace("_", " ")}    Category: ${incident.category}`,
    9,
  );
  text(
    `Reported: ${new Date(incident.created_at).toLocaleString()}` +
      (incident.location_text ? `    Location: ${incident.location_text}` : "") +
      (incident.location_lat ? `    GPS: ${incident.location_lat.toFixed(5)}, ${incident.location_lng?.toFixed(5)}` : ""),
    9,
  );
  y += 4;

  sectionTitle("Description");
  text(incident.description);

  if (incident.ai_summary) {
    sectionTitle("AI Analysis");
    text(incident.ai_summary);
    if (incident.ai_severity) text(`AI severity assessment: ${incident.ai_severity.toUpperCase()}`, 10, true);
    if (incident.ai_categories?.length) text(`Categories: ${incident.ai_categories.join(", ")}`);
  }

  if (incident.ai_suggested_actions) {
    sectionTitle("Suggested Actions");
    text(incident.ai_suggested_actions);
  }

  // Media
  const { data: media } = await db.from("incident_media").select("*").eq("incident_id", incident.id);
  const mediaRows: MediaRow[] = (media as MediaRow[]) ?? [];
  if (mediaRows.length) {
    sectionTitle(`Attached Media (${mediaRows.length})`);
    for (const m of mediaRows) {
      const { data: signed } = await db.storage.from("incident-media").createSignedUrl(m.file_path, 60 * 10);
      const url = signed?.signedUrl;
      if (!url) continue;
      if (m.kind === "image" || (m.mime_type ?? "").startsWith("image/")) {
        const img = await fetchImageDataUrl(url);
        if (!img) { text(`• ${m.file_path}`, 9); continue; }
        const imgW = pageW - margin * 2;
        const imgH = 200;
        ensureSpace(imgH + 12);
        try {
          doc.addImage(img.data, img.format, margin, y, imgW, imgH);
          y += imgH + 12;
        } catch {
          text(`• ${m.file_path}`, 9);
        }
      } else {
        text(`• ${m.kind}: ${m.file_path}`, 9);
      }
    }
  }

  // Footer page numbers
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(`Page ${i} of ${pages} — RailAssist AI confidential`, pageW / 2, pageH - 20, { align: "center" });
  }

  doc.save(`incident-${incident.id.slice(0, 8)}.pdf`);
}
