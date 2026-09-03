import { FileText, Construction } from "lucide-react";

const FONT = "'Plus Jakarta Sans', sans-serif";

/**
 * Shared "coming soon" placeholder used by report pages that don't yet have a
 * full implementation. Keeps the whole Reports set navigable with a consistent
 * look. `title` is the report name (no category names ever shown).
 */
export default function ReportPlaceholder({ title, icon, notes }) {
  return (
    <div style={{ fontFamily: FONT, padding: "6px 2px" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 11,
            background: "linear-gradient(135deg,#1f8cff,#4338ca)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
          }}
        >
          {icon || <FileText size={19} />}
        </div>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800, color: "#1e1b4b" }}>{title}</div>
          <div style={{ fontSize: 12, color: "#9ca3af" }}>Report</div>
        </div>
      </div>

      <div
        style={{
          background: "#fff",
          border: "1.5px solid #e0e7ff",
          borderRadius: 20,
          padding: "60px 24px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 14,
          textAlign: "center",
          color: "#9ca3af",
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 18,
            background: "#eef2ff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#4338ca",
          }}
        >
          <Construction size={28} />
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#1e1b4b" }}>{title}</div>
        <div style={{ fontSize: 12, maxWidth: 420 }}>
          The report is not implemented yet. The navigation and routing are ready —
          connect the data source and filters here when available.
        </div>
        {notes && <div style={{ fontSize: 12, color: "#6366f1", fontWeight: 600 }}>{notes}</div>}
      </div>
    </div>
  );
}
