import { useEffect, useMemo, useRef, useState } from "react";
import api from "../../../services/api";
import * as XLSX from "xlsx";
import { FileDown, Printer, FileJson, Truck, ArrowUpRight, RefreshCw } from "lucide-react";

/* ─── Theme reused from the rest of the Reports pages ─────────────── */
const FONT = "'Plus Jakarta Sans', sans-serif";
const INDIGO = "#4338ca";
const BORDER = "#e2e8f0";

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Build YYYY-MM-DD boundaries for an (optional) month/year range. */
function buildRange(fromMonth, fromYear, toMonth, toYear) {
  const start =
    fromMonth && fromYear
      ? `${fromYear}-${String(fromMonth).padStart(2, "0")}-01`
      : "";
  let end = "";
  if (toMonth && toYear) {
    const lastDay = new Date(toYear, toMonth, 0).getDate();
    end = `${toYear}-${String(toMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  }
  return { start, end };
}

const fmtNum = (n) =>
  Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Print a DOM node via a hidden iframe. */
function printElement(element, title) {
  const iframe = document.createElement("iframe");
  Object.assign(iframe.style, {
    position: "fixed", width: "0", height: "0",
    border: "0", visibility: "hidden", right: "0", bottom: "0",
  });
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(
    `<html><head><title>${title || "GST R2"}</title>
     <style>
       body{font-family:Arial,Helvetica,sans-serif;margin:0;padding:28px;color:#1e1b4b;}
       h2{margin:0 0 4px;font-size:18px;}
       .meta{color:#64748b;font-size:12px;margin-bottom:18px;}
       table{width:100%;border-collapse:collapse;font-size:10px;}
       th,td{border:1px solid #e2e8f0;padding:6px 8px;text-align:left;}
       th{background:#f1f5f9;color:#334155;}
       td.r,th.r{text-align:right;}
       tr.total td{background:#eef2ff;font-weight:700;}
     </style></head>
     <body>${element.innerHTML}</body></html>`
  );
  doc.close();
  const win = iframe.contentWindow;
  const fire = () => { try { win.focus(); win.print(); } finally { setTimeout(() => iframe.remove(), 1500); } };
  if (doc.readyState === "complete") fire();
  else win.addEventListener("load", fire);
}

function auth() {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return { adminId: user?.role === "admin" ? user?.id : user?.admin_id || null };
  } catch {
    return { adminId: null };
  }
}

/**
 * GST R2 — Inward supplies (Purchases) return report.
 *
 * Data is sourced from the existing purchase API (the same one the Purchase
 * Bills report and GST Purchase report use) so no new backend is required.
 * Purchase returns are pulled from the existing debit-note (purchase return)
 * API. The invoice/tax amounts are split into CGST / SGST / IGST placeholders
 * (capped as available on each record).
 */
export default function GstR2() {
  const { adminId } = auth();

  const now = new Date();
  const [fromMonth, setFromMonth] = useState(now.getMonth() + 1);
  const [fromYear, setFromYear] = useState(now.getFullYear());
  const [toMonth, setToMonth] = useState(now.getMonth() + 1);
  const [toYear, setToYear] = useState(now.getFullYear());
  const [considerExempt, setConsiderExempt] = useState(false);
  const [activeTab, setActiveTab] = useState("purchase"); // "purchase" | "return"

  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [purchases, setPurchases] = useState([]);
  const [debitNotes, setDebitNotes] = useState([]);
  const [loading, setLoading] = useState(false);

  const tableWrapRef = useRef(null);

  /* ── Load companies (firm selector) ─────────────────────────────── */
  useEffect(() => {
    if (!adminId) return;
    api
      .get(`/company/get_companies_by_admin?admin_id=${adminId}`)
      .then((res) => {
        if (!res.data?.status) return;
        const list = res.data.data || [];
        setCompanies(list);
        const saved = localStorage.getItem("selected_company_id");
        const match = saved ? list.find((c) => String(c.id) === String(saved)) : null;
        if (match) {
          setSelectedCompany(String(match.id));
        } else if (list.length === 1) {
          setSelectedCompany(String(list[0].id));
        }
      })
      .catch(() => {});
  }, [adminId]);

  const { start, end } = useMemo(
    () => buildRange(fromMonth, fromYear, toMonth, toYear),
    [fromMonth, fromYear, toMonth, toYear]
  );

  /* ── Fetch purchases + debit notes for the selected firm/range ── */
  const fetchReport = async (companyId) => {
    if (!companyId) return;
    setLoading(true);
    try {
      const purRes = await api.get("/purchase/get_purchases", {
        params: { company_id: Number(companyId), status: "submitted" },
      });
      let purData = purRes.data?.status ? purRes.data.data || [] : [];
      if (start && end) {
        purData = purData.filter((p) => p.purchase_date >= start && p.purchase_date <= end);
      }
      setPurchases(purData);

      const dnRes = await api.get("/debit_note/list", {
        params: { company_id: Number(companyId) },
      });
      let dnData = dnRes.data?.status ? dnRes.data.data || [] : [];
      if (start && end) {
        dnData = dnData.filter((d) => (d.return_date || d.created_at) >= start && (d.return_date || d.created_at) <= end);
      }
      setDebitNotes(dnData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => {
      if (selectedCompany) fetchReport(selectedCompany);
    }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCompany, start, end]);

  /* ── Inward (purchase) rows ─────────────────────────────────────── */
  const purchaseRows = useMemo(() => {
    return purchases.map((p) => {
      const gstin = (p.supplier_gstin || "").trim();
      const taxAmt = Number(p.gst_total || p.tax_total || 0);
      const taxable = !gstin && considerExempt ? 0 : Number(p.sub_total || 0);
      return {
        gstin: gstin || (considerExempt ? "EXEMPT" : "N/A"),
        party_name: p.supplier_name || "Unknown Supplier",
        invoice_no: p.purchase_no || "-",
        date: p.purchase_date,
        value: Number(p.total_amount || 0),
        tax_rate: taxAmt && Number(p.sub_total) ? Math.round((taxAmt / Number(p.sub_total)) * 100) : 0,
        taxable,
        cgst: taxAmt / 2,
        sgst: taxAmt / 2,
        igst: 0,
        total_tax: taxAmt,
        total: Number(p.total_amount || 0),
      };
    });
  }, [purchases, considerExempt]);

  /* ── Purchase return rows (debit notes) ─────────────────────────── */
  const returnRows = useMemo(() => {
    return debitNotes.map((d) => {
      const gstin = (d.supplier_gstin || "").trim();
      const taxAmt = Number(d.tax_total || 0);
      const taxable = !gstin && considerExempt ? 0 : Number(d.sub_total || 0);
      return {
        gstin: gstin || (considerExempt ? "EXEMPT" : "N/A"),
        party_name: d.supplier_name || "Unknown Supplier",
        invoice_no: d.bill_no || d.return_no || "-",
        date: d.return_date || d.created_at,
        value: Number(d.total_amount || 0),
        tax_rate: taxAmt && Number(d.sub_total) ? Math.round((taxAmt / Number(d.sub_total)) * 100) : 0,
        taxable,
        cgst: taxAmt / 2,
        sgst: taxAmt / 2,
        igst: 0,
        total_tax: taxAmt,
        total: Number(d.total_amount || 0),
      };
    });
  }, [debitNotes, considerExempt]);

  const activeRows = activeTab === "purchase" ? purchaseRows : returnRows;

  const totals = useMemo(() => {
    return activeRows.reduce(
      (acc, r) => {
        acc.value += r.value || 0;
        acc.taxable += r.taxable || 0;
        acc.cgst += r.cgst || 0;
        acc.sgst += r.sgst || 0;
        acc.igst += r.igst || 0;
        acc.total_tax += r.total_tax || 0;
        acc.total += r.total || 0;
        return acc;
      },
      { value: 0, taxable: 0, cgst: 0, sgst: 0, igst: 0, total_tax: 0, total: 0 }
    );
  }, [activeRows]);

  /* ── Export JSON ────────────────────────────────────────────────── */
  const exportJson = () => {
    if (activeRows.length === 0) {
      alert("No data available to export.");
      return;
    }
    const blob = new Blob([JSON.stringify(activeRows, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `GST_R2_${activeTab}_${fromYear}-${fromMonth || "00"}_to_${toYear}-${toMonth || "00"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ── Export Excel ───────────────────────────────────────────────── */
  const exportXls = () => {
    if (activeRows.length === 0) {
      alert("No data available to export.");
      return;
    }
    const data = activeRows.map((r) => ({
      "Supplier GSTIN/UIN": r.gstin,
      "Supplier/Party Name": r.party_name,
      "Invoice No": r.invoice_no,
      "Invoice Date": r.date,
      "Value (₹)": r.value,
      "Tax Rate (%)": r.tax_rate,
      "Taxable Value (₹)": r.taxable,
      "CGST (₹)": r.cgst,
      "SGST (₹)": r.sgst,
      "IGST (₹)": r.igst,
      "Total Tax (₹)": r.total_tax,
      "Total (₹)": r.total,
    }));
    data.push({
      "Supplier GSTIN/UIN": "TOTAL",
      "Supplier/Party Name": "",
      "Invoice No": "",
      "Invoice Date": "",
      "Value (₹)": totals.value,
      "Tax Rate (%)": "",
      "Taxable Value (₹)": totals.taxable,
      "CGST (₹)": totals.cgst,
      "SGST (₹)": totals.sgst,
      "IGST (₹)": totals.igst,
      "Total Tax (₹)": totals.total_tax,
      "Total (₹)": totals.total,
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `GST R2 ${activeTab === "purchase" ? "Inward" : "Return"}`);
    XLSX.writeFile(wb, `GST_R2_${activeTab}.xlsx`);
  };

  /* ── Print ──────────────────────────────────────────────────────── */
  const handlePrint = () => {
    if (activeRows.length === 0) {
      alert("No data available to print.");
      return;
    }
    const el = document.createElement("div");
    el.innerHTML = `
      <h2>GST R2 — ${activeTab === "purchase" ? "Inward Supplies (Purchases)" : "Purchase Returns"}</h2>
      <div class="meta">
        Period: ${start || "All"} → ${end || "All"} &nbsp;|&nbsp;
        Consider non-tax as exempted: ${considerExempt ? "Yes" : "No"} &nbsp;|&nbsp;
        ${activeRows.length} record(s)
      </div>
      <table>
        <thead>
          <tr>
            <th>Supplier GSTIN/UIN</th><th>Supplier/Party Name</th><th>Invoice No</th><th>Invoice Date</th>
            <th class="r">Value</th><th class="r">Tax Rate</th><th class="r">Taxable</th>
            <th class="r">CGST</th><th class="r">SGST</th><th class="r">IGST</th>
            <th class="r">Total Tax</th><th class="r">Total</th>
          </tr>
        </thead>
        <tbody>
          ${activeRows
            .map(
              (r) => `<tr>
                <td>${r.gstin || "-"}</td><td>${r.party_name}</td><td>${r.invoice_no}</td><td>${r.date || "-"}</td>
                <td class="r">${fmtNum(r.value)}</td><td class="r">${r.tax_rate}</td>
                <td class="r">${fmtNum(r.taxable)}</td><td class="r">${fmtNum(r.cgst)}</td>
                <td class="r">${fmtNum(r.sgst)}</td><td class="r">${fmtNum(r.igst)}</td>
                <td class="r">${fmtNum(r.total_tax)}</td><td class="r">${fmtNum(r.total)}</td>
              </tr>`
            )
            .join("")}
          <tr class="total">
            <td colspan="4">TOTAL</td>
            <td class="r">${fmtNum(totals.value)}</td><td></td><td class="r">${fmtNum(totals.taxable)}</td>
            <td class="r">${fmtNum(totals.cgst)}</td><td class="r">${fmtNum(totals.sgst)}</td>
            <td class="r">${fmtNum(totals.igst)}</td><td class="r">${fmtNum(totals.total_tax)}</td>
            <td class="r">${fmtNum(totals.total)}</td>
          </tr>
        </tbody>
      </table>`;
    printElement(el, `GST R2 ${activeTab}`);
  };

  const selectStyle = {
    padding: "9px 12px",
    border: "1.5px solid " + BORDER,
    borderRadius: 9,
    fontSize: 13,
    fontFamily: FONT,
    color: "#334155",
    outline: "none",
    background: "#fff",
    minWidth: 150,
  };
  const actionBtn = (color) => ({
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 14px",
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 700,
    color: "#fff",
    background: color,
    border: "none",
    cursor: "pointer",
    fontFamily: FONT,
  });

  return (
    <div style={{ fontFamily: FONT, padding: "8px 18px 20px" }}>
      {/* ── HEADER ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
        <div style={{ width: 38, height: 38, borderRadius: 11, background: "linear-gradient(135deg,#0ea5e9,#4338ca)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", flexShrink: 0 }}>
          <Truck size={19} />
        </div>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800, color: "#1e1b4b" }}>GST R2 — Inward Supplies</div>
          <div style={{ fontSize: 12, color: "#9ca3af" }}>Purchases &amp; purchase returns GST return</div>
        </div>
      </div>

      {/* ── FILTER BAR ── */}
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: 12, marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 5 }}>From</div>
          <div style={{ display: "flex", gap: 8 }}>
            <select value={fromMonth} onChange={(e) => setFromMonth(Number(e.target.value))} style={selectStyle}>
              {monthNames.map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
            <select value={fromYear} onChange={(e) => setFromYear(Number(e.target.value))} style={selectStyle}>
              {Array.from({ length: 12 }, (_, i) => now.getFullYear() - 5 + i)
                .map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
            </select>
          </div>
        </div>

        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 5 }}>To</div>
          <div style={{ display: "flex", gap: 8 }}>
            <select value={toMonth} onChange={(e) => setToMonth(Number(e.target.value))} style={selectStyle}>
              {monthNames.map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>
            <select value={toYear} onChange={(e) => setToYear(Number(e.target.value))} style={selectStyle}>
              {Array.from({ length: 12 }, (_, i) => now.getFullYear() - 5 + i)
                .map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
            </select>
          </div>
        </div>

        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", marginBottom: 5 }}>Firm</div>
          <select value={selectedCompany} onChange={(e) => setSelectedCompany(e.target.value)} style={selectStyle}>
            <option value="">Select firm…</option>
            {companies.map((c) => (
              <option key={c.id} value={String(c.id)}>{c.company_name}</option>
            ))}
          </select>
        </div>

        <label style={{ display: "inline-flex", alignItems: "flex-end", gap: 7, paddingBottom: 9, cursor: "pointer", userSelect: "none", fontSize: 12, fontWeight: 600, color: "#475569" }}>
          <input
            type="checkbox"
            checked={considerExempt}
            onChange={(e) => setConsiderExempt(e.target.checked)}
            style={{ width: 16, height: 16, accentColor: "#4338ca", cursor: "pointer" }}
          />
          Consider non-tax as exempted
        </label>

        <div style={{ marginLeft: "auto", display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={exportJson} style={actionBtn("#0891b2")} disabled={!selectedCompany}>
            <FileJson size={15} /> Export JSON
          </button>
          <button onClick={exportXls} style={actionBtn("#16a34a")} disabled={!selectedCompany}>
            <FileDown size={15} /> Export XLS
          </button>
          <button onClick={handlePrint} style={actionBtn("#dc2626")} disabled={!selectedCompany}>
            <Printer size={15} /> Print
          </button>
        </div>
      </div>

      {/* ── TABS ── */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        {[
          { key: "purchase", label: "Purchase / Inward" },
          { key: "return", label: "Purchase Return" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 16px",
              borderRadius: 9,
              border: "1.5px solid " + (activeTab === t.key ? INDIGO : BORDER),
              background: activeTab === t.key ? INDIGO : "#fff",
              color: activeTab === t.key ? "#fff" : "#475569",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              fontFamily: FONT,
            }}
          >
            {t.key === "purchase" ? <ArrowUpRight size={14} /> : <ArrowUpRight size={14} />}
            {t.label}
          </button>
        ))}
        <div style={{ marginLeft: "auto", alignSelf: "center", display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#64748b" }}>
          {loading && <RefreshCw size={14} className="animate-spin" style={{ animation: "spin 1s linear infinite" }} />}
          <strong>{activeRows.length}</strong> record(s)
        </div>
      </div>

      {/* ── TABLE ── */}
      <div style={{ border: "1.5px solid " + BORDER, borderRadius: 10, background: "#fff", overflow: "hidden" }}>
        <div ref={tableWrapRef} style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 1000 }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1.5px solid " + BORDER }}>
                {["Supplier GSTIN/UIN", "Supplier/Party Name", "Invoice No.", "Invoice Date", "Value (₹)", "Tax Rate", "Taxable (₹)", "CGST (₹)", "SGST (₹)", "IGST (₹)", "Total Tax (₹)", "Total (₹)"].map((h) => (
                  <th key={h} style={{ padding: "10px 12px", fontSize: 11, fontWeight: 700, color: "#334155", borderRight: "1px solid " + BORDER, whiteSpace: "nowrap", textAlign: "left" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={12} style={{ padding: 48, textAlign: "center", color: "#94a3b8" }}>
                    Loading GST R2 data…
                  </td>
                </tr>
              ) : !selectedCompany ? (
                <tr>
                  <td colSpan={12} style={{ padding: 48, textAlign: "center", color: "#94a3b8" }}>
                    Select a firm to generate the report.
                  </td>
                </tr>
              ) : activeRows.length === 0 ? (
                <tr>
                  <td colSpan={12} style={{ padding: 48, textAlign: "center", color: "#64748b" }}>
                    No records found for the selected period.
                  </td>
                </tr>
              ) : (
                activeRows.map((r, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "9px 12px", fontFamily: "monospace", color: "#64748b", whiteSpace: "nowrap" }}>{r.gstin}</td>
                    <td style={{ padding: "9px 12px", fontWeight: 600, color: "#1e293b", whiteSpace: "nowrap" }}>{r.party_name}</td>
                    <td style={{ padding: "9px 12px", color: "#334155", whiteSpace: "nowrap" }}>{r.invoice_no}</td>
                    <td style={{ padding: "9px 12px", color: "#475569", whiteSpace: "nowrap" }}>{r.date ? new Date(r.date).toLocaleDateString("en-IN") : "-"}</td>
                    <td style={{ padding: "9px 12px", textAlign: "right", whiteSpace: "nowrap" }}>{fmtNum(r.value)}</td>
                    <td style={{ padding: "9px 12px", textAlign: "right", whiteSpace: "nowrap" }}>{r.tax_rate}%</td>
                    <td style={{ padding: "9px 12px", textAlign: "right", whiteSpace: "nowrap" }}>{fmtNum(r.taxable)}</td>
                    <td style={{ padding: "9px 12px", textAlign: "right", whiteSpace: "nowrap" }}>{fmtNum(r.cgst)}</td>
                    <td style={{ padding: "9px 12px", textAlign: "right", whiteSpace: "nowrap" }}>{fmtNum(r.sgst)}</td>
                    <td style={{ padding: "9px 12px", textAlign: "right", whiteSpace: "nowrap" }}>{fmtNum(r.igst)}</td>
                    <td style={{ padding: "9px 12px", textAlign: "right", whiteSpace: "nowrap" }}>{fmtNum(r.total_tax)}</td>
                    <td style={{ padding: "9px 12px", textAlign: "right", fontWeight: 700, whiteSpace: "nowrap" }}>{fmtNum(r.total)}</td>
                  </tr>
                ))
              )}
            </tbody>
            {activeTab === "purchase" && !loading && selectedCompany && purchaseRows.length > 0 && (
              <tfoot>
                <tr style={{ background: "#eef2ff", borderTop: "2px solid " + INDIGO }}>
                  <td style={{ padding: "10px 12px", fontWeight: 800, color: "#1e1b4b" }} colSpan={4}>TOTAL</td>
                  <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 800 }}>{fmtNum(totals.value)}</td>
                  <td style={{ padding: "10px 12px" }} />
                  <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 800 }}>{fmtNum(totals.taxable)}</td>
                  <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 800 }}>{fmtNum(totals.cgst)}</td>
                  <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 800 }}>{fmtNum(totals.sgst)}</td>
                  <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 800 }}>{fmtNum(totals.igst)}</td>
                  <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 800 }}>{fmtNum(totals.total_tax)}</td>
                  <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 800 }}>{fmtNum(totals.total)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
