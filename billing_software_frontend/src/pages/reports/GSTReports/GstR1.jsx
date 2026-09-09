import { useEffect, useMemo, useRef, useState } from "react";
import api from "../../../services/api";
import * as XLSX from "xlsx";
import { FileDown, Printer, FileJson, ReceiptText, ArrowDownLeft, RefreshCw } from "lucide-react";

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

/** Standard numeric formatter. */
const fmtNum = (n) =>
  Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Is this supply a non-tax / exempt transaction?
 *
 * A transaction is treated as non-tax / exempt when its GST/tax amount is 0
 * (no tax charged). For sale invoices the tax amount is the invoice's
 * `gst_total`; for sale returns (credit notes) it is `tax_total`. Transactions
 * with tax > 0 are normal GST supplies.
 *
 * No invoice number / party name / amount is ever used for this decision.
 */
const isNonTaxExempt = (taxAmount) => Number(taxAmount || 0) <= 0;

/**
 * Resolve the GSTIN/UIN display for a row.
 *
 * The checkbox toggles between the two lists: when OFF only taxable supplies
 * (tax > 0) are shown, each with the party's own GST number (customer.gst_no).
 * When ON only non-tax supplies (tax = 0) are shown, each marked EXEMPT.
 * The company/seller GSTIN is never used.
 */
const resolveGstinLabel = (customerGstNo, exempt) => {
  if (exempt) return "EXEMPT";
  return (customerGstNo || "").toString().trim() || "N/A";
};

/** Print a DOM node via a hidden iframe (same approach as Day Book). */
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
    `<html><head><title>${title || "GST R1"}</title>
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
 * GST R1 — Outward supplies (Sales) return report.
 *
 * Data is sourced from the existing sale-invoice API (the same one the Sale
 * report and Sale Invoices page use) so no new backend is required. Each
 * invoice's line items carry a per-item GST percentage, letting us slice the
 * table by tax rate. Sale returns are pulled from the existing credit-note
 * (sale return) API.
 */
export default function GstR1() {
  const { adminId } = auth();

  const now = new Date();
  const [fromMonth, setFromMonth] = useState(now.getMonth() + 1);
  const [fromYear, setFromYear] = useState(now.getFullYear());
  const [toMonth, setToMonth] = useState(now.getMonth() + 1);
  const [toYear, setToYear] = useState(now.getFullYear());
  const [considerExempt, setConsiderExempt] = useState(false);
  const [activeTab, setActiveTab] = useState("sale"); // "sale" | "return"

  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [invoices, setInvoices] = useState([]);
  const [creditNotes, setCreditNotes] = useState([]);
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

  /* ── Fetch sale invoices + credit notes for the selected firm/range ── */
  const fetchReport = async (companyId) => {
    if (!companyId) return;
    setLoading(true);
    try {
      const params = { company_id: Number(companyId) };
      if (start) params.from_date = start;
      if (end) params.to_date = end;

      const invRes = await api.get("/invoice/get_filtered_invoices", { params });
      const invData = invRes.data?.status ? invRes.data.data || [] : [];
      setInvoices(invData);

      const cnRes = await api.get("/credit_note/list", {
        params: { company_id: Number(companyId) },
      });
      let cnData = cnRes.data?.status ? cnRes.data.data || [] : [];
      if (start && end) {
        cnData = cnData.filter((c) => {
          const d = c.return_date || c.created_at;
          return d >= start && d <= end;
        });
      }
      setCreditNotes(cnData);
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

  /**
   * Build the outward (sale) supply rows. Each invoice is expanded into its
   * line items so we can show GST correctly per rate.
   *
   * The ONLY source of truth for the taxable / non-tax decision is the actual
   * GST/tax amount of the transaction (invoice.gst_total; credit_note.tax_total
   * for returns). The checkbox toggles between the two lists:
   *  - OFF: only taxable supplies (tax > 0), shown with the party's own GSTIN
   *  - ON : only non-tax supplies (tax = 0), shown as EXEMPT
   */
  const saleRows = useMemo(() => {
    const rows = [];
    invoices.forEach((inv) => {
      const customerGstNo = ((inv.customer_gst_no) || "").toString().trim();
      const exempt = isNonTaxExempt(inv.gst_total);
      if (exempt !== considerExempt) return;
      const products = Array.isArray(inv.products) ? inv.products : [];
      if (products.length > 0) {
        products.forEach((p) => {
          const gstPct = Number(p.gst || p.gst_percentage || p.gstPercent || 0);
          const qty = Number(p.qty || p.quantity || 1);
          const price = Number(p.price || p.unit_price || p.rate || 0);
          const lineValue = qty * price;
          rows.push({
            gstin: resolveGstinLabel(customerGstNo, exempt),
            party_name: inv.customer_name || "Cash Sale",
            invoice_no: inv.invoice_no,
            date: inv.created_at,
            value: lineValue,
            tax_rate: gstPct,
          });
        });
      } else {
        const gstPct = 0;
        const value = Number(inv.sub_total || inv.total_amount || 0);
        rows.push({
          gstin: resolveGstinLabel(customerGstNo, exempt),
          party_name: inv.customer_name || "Cash Sale",
          invoice_no: inv.invoice_no,
          date: inv.created_at,
          value,
          tax_rate: gstPct,
        });
      }
    });
    return rows;
  }, [invoices, considerExempt]);

  /* ── Sale return rows (credit notes) ────────────────────────────── */
  const returnRows = useMemo(() => {
    const rows = [];
    creditNotes.forEach((c) => {
      const customerGstNo = ((c.customer_gst_no) || "").toString().trim();
      const exempt = isNonTaxExempt(c.tax_total);
      if (exempt !== considerExempt) return;
      const taxAmt = Number(c.tax_total || 0);
      rows.push({
        gstin: resolveGstinLabel(customerGstNo, exempt),
        party_name: c.customer_name || "Cash Customer",
        invoice_no: c.return_no || c.invoice_no || "-",
        date: c.return_date || c.created_at,
        value: Number(c.total_amount || 0),
        tax_rate: taxAmt && Number(c.sub_total) ? Math.round((taxAmt / Number(c.sub_total)) * 100) : 0,
      });
    });
    return rows;
  }, [creditNotes, considerExempt]);

  const activeRows = activeTab === "sale" ? saleRows : returnRows;

  const totals = useMemo(() => {
    return activeRows.reduce(
      (acc, r) => {
        acc.value += r.value || 0;
        return acc;
      },
      { value: 0 }
    );
  }, [activeRows]);

  /* ── Filter change helper ───────────────────────────────────────── */

  /* ── Export to JSON ─────────────────────────────────────────────── */
  const exportJson = () => {
    if (activeRows.length === 0) {
      alert("No data available to export.");
      return;
    }
    const blob = new Blob([JSON.stringify(activeRows, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `GST_R1_${activeTab}_${fromYear}-${fromMonth || "00"}_to_${toYear}-${toMonth || "00"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ── Export to Excel ────────────────────────────────────────────── */
  const exportXls = () => {
    if (activeRows.length === 0) {
      alert("No data available to export.");
      return;
    }
    const data = activeRows.map((r) => ({
      "GSTIN/UIN": r.gstin,
      "Party Name": r.party_name,
      "Invoice No": r.invoice_no,
      Date: r.date,
      "Value (₹)": r.value,
      "Tax Rate (%)": r.tax_rate,
    }));
    data.push({
      "GSTIN/UIN": "TOTAL",
      "Party Name": "",
      "Invoice No": "",
      Date: "",
      "Value (₹)": totals.value,
      "Tax Rate (%)": "",
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `GST R1 ${activeTab === "sale" ? "Outward" : "Return"}`);
    XLSX.writeFile(wb, `GST_R1_${activeTab}.xlsx`);
  };

  /* ── Print ──────────────────────────────────────────────────────── */
  const handlePrint = () => {
    if (activeRows.length === 0) {
      alert("No data available to print.");
      return;
    }
    const el = document.createElement("div");
    el.innerHTML = `
      <h2>GST R1 — ${activeTab === "sale" ? "Outward Supplies (Sales)" : "Sale Returns"}</h2>
      <div class="meta">
        Period: ${start || "All"} → ${end || "All"} &nbsp;|&nbsp;
        Consider non-tax as exempted: ${considerExempt ? "Yes" : "No"} &nbsp;|&nbsp;
        ${activeRows.length} record(s)
      </div>
      <table>
        <thead>
          <tr>
            <th>GSTIN/UIN</th><th>Party Name</th><th>Invoice No</th><th>Date</th>
            <th class="r">Value</th><th class="r">Tax Rate</th>
          </tr>
        </thead>
        <tbody>
          ${activeRows
            .map(
              (r) => `<tr>
                <td>${r.gstin || "-"}</td><td>${r.party_name}</td><td>${r.invoice_no}</td><td>${r.date || "-"}</td>
                <td class="r">${fmtNum(r.value)}</td><td class="r">${r.tax_rate}%</td>
              </tr>`
            )
            .join("")}
          <tr class="total">
            <td colspan="4">TOTAL</td>
            <td class="r">${fmtNum(totals.value)}</td><td></td>
          </tr>
        </tbody>
      </table>`;
    printElement(el, `GST R1 ${activeTab}`);
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
        <div style={{ width: 38, height: 38, borderRadius: 11, background: "linear-gradient(135deg,#8b5cf6,#4338ca)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", flexShrink: 0 }}>
          <ReceiptText size={19} />
        </div>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800, color: "#1e1b4b" }}>GST R1 — Outward Supplies</div>
          <div style={{ fontSize: 12, color: "#9ca3af" }}>Sales &amp; sale returns GST return</div>
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
          { key: "sale", label: "Sale / Outward" },
          { key: "return", label: "Sale Return" },
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
            {t.key === "sale" ? <ReceiptText size={14} /> : <ArrowDownLeft size={14} />}
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
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 720 }}>
            <thead>
              <tr style={{ background: "#f8fafc", borderBottom: "1.5px solid " + BORDER }}>
                {["GSTIN/UIN", "Party Name", "Invoice No.", "Date", "Value (₹)", "Tax Rate"].map((h) => (
                  <th key={h} style={{ padding: "10px 12px", fontSize: 11, fontWeight: 700, color: "#334155", borderRight: "1px solid " + BORDER, whiteSpace: "nowrap", textAlign: "left" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ padding: 48, textAlign: "center", color: "#94a3b8" }}>
                    Loading GST R1 data…
                  </td>
                </tr>
              ) : !selectedCompany ? (
                <tr>
                  <td colSpan={6} style={{ padding: 48, textAlign: "center", color: "#94a3b8" }}>
                    Select a firm to generate the report.
                  </td>
                </tr>
              ) : activeRows.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: 48, textAlign: "center", color: "#64748b" }}>
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
                  </tr>
                ))
              )}
            </tbody>
            {activeTab === "sale" && !loading && selectedCompany && saleRows.length > 0 && (
              <tfoot>
                <tr style={{ background: "#eef2ff", borderTop: "2px solid " + INDIGO }}>
                  <td style={{ padding: "10px 12px", fontWeight: 800, color: "#1e1b4b" }} colSpan={4}>TOTAL</td>
                  <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 800 }}>{fmtNum(totals.value)}</td>
                  <td style={{ padding: "10px 12px" }} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
