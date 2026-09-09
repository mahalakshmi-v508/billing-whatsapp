import { useState, useRef, useEffect, useMemo } from "react";
import {
  ChevronDown,
  Search,
  FileSpreadsheet,
  Printer,
  X,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import api from "../../../services/api";

const FONT = "'Plus Jakarta Sans', sans-serif";
const INDIGO = "#4338ca";
const NAVY = "#1e1b4b";
const GRAY_TEXT = "#6b7280";
const LIGHT_BORDER = "#e5e7eb";
const PAGE_SIZE = 15;

/* ── Helpers ─────────────────────────────────────────────────────────── */
function getAuth() {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return { adminId: user?.role === "admin" ? user?.id : user?.admin_id || null };
  } catch {
    return { adminId: null };
  }
}

const fmtINR = (n) =>
  "₹" + Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtINRNum = (n) =>
  Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function formatDateISO(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function parseDateISO(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function today() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/** Print a DOM node without leaving the app (hidden iframe). */
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
    `<html><head><title>${title || "Stock Summary"}</title>
     <style>
       body{font-family:Arial,Helvetica,sans-serif;margin:0;padding:28px;color:#1e1b4b;}
       h2{margin:0 0 4px;font-size:18px;}
       .business{font-size:13px;font-weight:700;color:#334155;}
       .meta{color:#64748b;font-size:12px;margin-bottom:18px;}
       table{width:100%;border-collapse:collapse;font-size:11px;}
       th,td{border:1px solid #e2e8f0;padding:7px 9px;text-align:left;}
       th{background:#f1f5f9;color:#334155;}
       td.r,th.r{text-align:right;}
       .short{color:#dc2626;font-weight:700;}
     </style></head>
     <body>${element.innerHTML}</body></html>`
  );
  doc.close();
  const win = iframe.contentWindow;
  const fire = () => { try { win.focus(); win.print(); } finally { setTimeout(() => iframe.remove(), 1500); } };
  if (doc.readyState === "complete") fire();
  else win.addEventListener("load", fire);
}

/* ── Main Component ─────────────────────────────────────────────────── */
export default function StockSummary() {
  const { adminId } = getAuth();

  const [companyId, setCompanyId] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [companyName, setCompanyName] = useState("My Company");

  const [asOf, setAsOf] = useState(today());
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState(0);
  const [showInStock, setShowInStock] = useState(false);
  const [query, setQuery] = useState("");

  const [rows, setRows] = useState([]);
  const [totals, setTotals] = useState({ stock_qty: 0, available_qty: 0, reserved_qty: 0, stock_value: 0 });
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [companyOpen, setCompanyOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);

  const companyRef = useRef(null);
  const catRef = useRef(null);

  useEffect(() => {
    function onDoc(e) {
      if (companyRef.current && !companyRef.current.contains(e.target)) setCompanyOpen(false);
      if (catRef.current && !catRef.current.contains(e.target)) setCatOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // Load companies for this admin, default to saved / single company
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
        const chosen = match || list[0] || null;
        if (chosen) {
          setCompanyId(Number(chosen.id));
          setCompanyName(chosen.company_name || "My Company");
        }
      })
      .catch(() => setError("Failed to load companies."));
  }, [adminId]);

  const selectCompany = (c) => {
    setCompanyId(Number(c.id));
    setCompanyName(c.company_name || "My Company");
    setCategoryId(0);
    setPage(1);
    setCompanyOpen(false);
  };

  // Load categories for the selected company
  useEffect(() => {
    if (!companyId) return;
    api
      .get(`/category/get_active_category?company_id=${companyId}`)
      .then((res) => setCategories(res.data?.status ? res.data.data || [] : []))
      .catch(() => setCategories([]));
  }, [companyId]);

  const selectedCatLabel = useMemo(
    () => categories.find((c) => Number(c.id) === Number(categoryId))?.name || "All Categories",
    [categories, categoryId]
  );

  // Fetch report from the backend on any filter change (server-side search debounced)
  useEffect(() => {
    if (companyId === null) return;
    const t = setTimeout(() => {
      setLoading(true);
      setError("");
      const params = {
        company_id: companyId,
        admin_id: adminId || 0,
        as_of_date: formatDateISO(asOf),
        show_in_stock: showInStock,
        search: query.trim(),
        page,
        limit: PAGE_SIZE,
      };
      if (categoryId > 0) params.category_id = categoryId;
      api
        .get("/report/stock-summary", { params })
        .then((res) => {
          if (res.data?.status) {
            setRows(res.data.data || []);
            setTotals(
              res.data.totals || { stock_qty: 0, available_qty: 0, reserved_qty: 0, stock_value: 0 }
            );
            setTotalCount(res.data.total || 0);
          } else {
            setError(res.data?.message || "Failed to load report.");
          }
        })
        .catch(() => setError("Failed to load report."))
        .finally(() => setLoading(false));
    }, query.trim() ? 350 : 0);
    return () => clearTimeout(t);
  }, [companyId, adminId, asOf, categoryId, showInStock, query, page]);

  const selectCategory = (id) => {
    setCategoryId(id);
    setPage(1);
    setCatOpen(false);
  };

  const lastPage = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const prettyAsOf = asOf.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  /* ── Stock status helpers ── */
  const stockColor = (qty) => {
    if (qty < 0) return "#dc2626";
    if (qty === 0) return "#b45309";
    return "#334155";
  };
  const stockWeight = (qty) => (qty < 0 ? 800 : qty === 0 ? 600 : 600);

  /* ── Excel export (respects current filters) ── */
  const handleExcel = () => {
    try {
      const sheetData = [
        ["Stock Summary"],
        ["As of Date", prettyAsOf],
        ["Company", companyName],
        ["Category", selectedCatLabel],
        ["Show Items in Stock", showInStock ? "Yes" : "No"],
        [],
        ["S.No", "Item Name", "Sale Price", "Purchase Price", "Stock Qty", "Available Qty For Sale", "Reserved Qty", "Stock Value"],
      ];
      rows.forEach((r, i) => {
        sheetData.push([
          (page - 1) * PAGE_SIZE + i + 1, r.item_name || "",
          fmtINRNum(r.sale_price), fmtINRNum(r.purchase_price),
          Number(r.stock_qty || 0), Number(r.available_qty || 0),
          Number(r.reserved_qty || 0), fmtINRNum(r.stock_value),
        ]);
      });
      sheetData.push([
        "Total", "Total", "", "",
        Number(totals.stock_qty || 0), Number(totals.available_qty || 0),
        Number(totals.reserved_qty || 0), fmtINRNum(totals.stock_value),
      ]);
      const ws = XLSX.utils.aoa_to_sheet(sheetData);
      ws["!cols"] = [
        { wch: 5 }, { wch: 24 }, { wch: 12 }, { wch: 14 },
        { wch: 12 }, { wch: 20 }, { wch: 12 }, { wch: 14 },
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Stock Summary");
      const buf = XLSX.write(wb, { bookType: "xlsx", type: "array", bookSST: false });
      saveAs(
        new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
        `Stock_Summary_${formatDateISO(asOf)}.xlsx`
      );
    } catch {
      setError("Excel export failed. Please try again.");
    }
  };

  /* ── Print ── */
  const handlePrint = () => {
    const buildTable = (rowsList) =>
      `<table>
        <thead><tr>
          <th>#</th><th>Item Name</th>
          <th class="r">Sale Price</th><th class="r">Purchase Price</th>
          <th class="r">Stock Qty</th><th class="r">Available Qty For Sale</th>
          <th class="r">Reserved Qty</th><th class="r">Stock Value</th>
        </tr></thead>
        <tbody>${
          rowsList
            .map(
              (r, i) => {
                const qty = Number(r.stock_qty || 0);
                return `<tr>
                  <td>${(page - 1) * PAGE_SIZE + i + 1}</td><td>${r.item_name || "-"}</td>
                  <td class="r">${fmtINR(r.sale_price)}</td><td class="r">${fmtINR(r.purchase_price)}</td>
                  <td class="r${qty < 0 ? " short" : ""}">${qty}</td>
                  <td class="r">${Number(r.available_qty || 0)}</td>
                  <td class="r">${Number(r.reserved_qty || 0)}</td>
                  <td class="r">${fmtINR(r.stock_value)}</td>
                </tr>`;
              }
            )
            .join("")
        }
        <tr>
          <td colspan="2"><strong>Total</strong></td>
          <td class="r"></td><td class="r"></td>
          <td class="r"><strong>${Number(totals.stock_qty || 0)}</strong></td>
          <td class="r"><strong>${Number(totals.available_qty || 0)}</strong></td>
          <td class="r"><strong>${Number(totals.reserved_qty || 0)}</strong></td>
          <td class="r"><strong>${fmtINR(totals.stock_value)}</strong></td>
        </tr>
        </tbody>
      </table>`;

    const now = new Date();
    const generated =
      now.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) +
      ", " +
      now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

    const el = document.createElement("div");
    el.innerHTML =
      `<h2>Stock Summary</h2>
       <div class="business">${companyName}</div>
       <div class="meta">As of ${prettyAsOf} &nbsp;|&nbsp; Category: ${selectedCatLabel} &nbsp;|&nbsp; Show Items in Stock: ${showInStock ? "Yes" : "No"} &nbsp;|&nbsp; Generated: ${generated}</div>
       ${buildTable(rows)}`;
    printElement(el, "Stock Summary");
  };

  return (
    <div style={{ fontFamily: FONT, padding: "6px 2px", display: "flex", flexDirection: "column", height: "100%" }}>
      {/* ═══════════════════════════════════════════════════════════════
          HEADER: Title + As-of Date + Company + Actions
          ═══════════════════════════════════════════════════════════════ */}
      <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 17, fontWeight: 800, color: NAVY }}>Stock Summary</span>
        </div>

        {/* As-of Date */}
        <div style={dateBoxStyle}>
          <span style={{ fontSize: 13, color: GRAY_TEXT, fontWeight: 500 }}>As of</span>
          <input
            type="date"
            value={formatDateISO(asOf)}
            onChange={(e) => { if (e.target.value) setAsOf(parseDateISO(e.target.value)); setPage(1); }}
            style={dateInputStyle}
          />
        </div>

        {/* Company */}
        <div ref={companyRef} style={{ position: "relative" }}>
          <button onClick={() => setCompanyOpen((v) => !v)} style={selectBtnStyle}>
            <span style={{ fontWeight: 600, color: NAVY }}>{companyName}</span>
            <ChevronDown size={15} style={{ color: "#94a3b8", transform: companyOpen ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
          </button>
          {companyOpen && (
            <div style={dropdownPanelStyle}>
              {companies.map((c) => (
                <button
                  key={c.id}
                  onClick={() => selectCompany(c)}
                  style={{
                    ...dropdownItemStyle,
                    background: Number(c.id) === Number(companyId) ? "#eef2ff" : "transparent",
                    color: Number(c.id) === Number(companyId) ? INDIGO : "#334155",
                    fontWeight: Number(c.id) === Number(companyId) ? 700 : 500,
                  }}
                >
                  {c.company_name || "My Company"}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: Actions */}
        <div style={{ display: "flex", gap: 8, marginLeft: "auto", alignItems: "center" }}>
          <button onClick={handleExcel} style={actionBtnStyle}>
            <FileSpreadsheet size={18} color={INDIGO} />
            <span style={{ fontSize: 11, color: NAVY, fontWeight: 600 }}>Excel</span>
          </button>
          <button onClick={handlePrint} style={actionBtnStyle}>
            <Printer size={18} color={INDIGO} />
            <span style={{ fontSize: 11, color: NAVY, fontWeight: 600 }}>Print</span>
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          FILTER ROW: Category + Show-in-stock checkbox
          ═══════════════════════════════════════════════════════════════ */}
      <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
        {/* Categories */}
        <div ref={catRef} style={{ position: "relative" }}>
          <button onClick={() => setCatOpen((v) => !v)} style={selectBtnStyle}>
            <span style={{ fontWeight: 600, color: NAVY }}>{selectedCatLabel}</span>
            <ChevronDown size={15} style={{ color: "#94a3b8", transform: catOpen ? "rotate(180deg)" : "none", transition: "transform .15s" }} />
          </button>
          {catOpen && (
            <div style={{ ...dropdownPanelStyle, maxHeight: 320, overflowY: "auto" }}>
              <button
                onClick={() => selectCategory(0)}
                style={{
                  ...dropdownItemStyle,
                  background: categoryId === 0 ? "#eef2ff" : "transparent",
                  color: categoryId === 0 ? INDIGO : "#334155",
                  fontWeight: categoryId === 0 ? 700 : 500,
                }}
              >
                All Categories
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => selectCategory(Number(c.id))}
                  style={{
                    ...dropdownItemStyle,
                    background: Number(c.id) === Number(categoryId) ? "#eef2ff" : "transparent",
                    color: Number(c.id) === Number(categoryId) ? INDIGO : "#334155",
                    fontWeight: Number(c.id) === Number(categoryId) ? 700 : 500,
                  }}
                >
                  {c.name}
                </button>
              ))}
              {categories.length === 0 && (
                <div style={{ padding: "10px 14px", fontSize: 12, color: "#9ca3af" }}>No categories found</div>
              )}
            </div>
          )}
        </div>

        {/* Show items in stock */}
        <label style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer", userSelect: "none" }}>
          <input
            type="checkbox"
            checked={showInStock}
            onChange={(e) => { setShowInStock(e.target.checked); setPage(1); }}
            style={{ width: 15, height: 15, accentColor: INDIGO, cursor: "pointer" }}
          />
          <span style={{ fontSize: 13, color: "#334155", fontWeight: 500 }}>Show items in stock</span>
        </label>
      </div>

      {/* Search field */}
      <div style={{ position: "relative", marginBottom: 10 }}>
        <Search size={15} color="#94a3b8" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", zIndex: 1 }} />
        <input
          value={query}
          onChange={(e) => { setQuery(e.target.value); setPage(1); }}
          placeholder="Search by item name, SKU/code or barcode..."
          style={searchInputStyle}
        />
        {query && (
          <button onClick={() => setQuery("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", display: "flex" }}>
            <X size={14} color="#94a3b8" />
          </button>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          STOCK SUMMARY TABLE
          ═══════════════════════════════════════════════════════════════ */}
      <div style={tableContainerStyle}>
        <div style={{ overflowX: "auto", flex: 1 }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={{ ...thStyle, width: 54, minWidth: 54 }}>S.No</th>
                <th style={{ ...thStyle, width: 220, minWidth: 220 }}>Item Name</th>
                <th style={{ ...thStyle, width: 120, minWidth: 120 }}>Sale Price</th>
                <th style={{ ...thStyle, width: 130, minWidth: 130 }}>Purchase Price</th>
                <th style={{ ...thStyle, width: 110, minWidth: 110 }}>Stock Qty</th>
                <th style={{ ...thStyle, width: 170, minWidth: 170 }}>Available Qty For Sale</th>
                <th style={{ ...thStyle, width: 120, minWidth: 120 }}>Reserved Qty</th>
                <th style={{ ...thStyle, width: 130, minWidth: 130 }}>Stock Value</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} style={emptyCellStyle}>
                    <div style={{ textAlign: "center", color: "#9ca3af", fontSize: 13 }}>Loading…</div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={8} style={emptyCellStyle}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                      <AlertCircle size={26} color="#dc2626" />
                      <div style={{ color: "#dc2626", fontSize: 13, fontWeight: 600 }}>{error}</div>
                    </div>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8} style={emptyCellStyle}>
                    <div style={{ textAlign: "center", color: "#9ca3af" }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: NAVY, marginBottom: 4 }}>No items to show</div>
                      <div style={{ fontSize: 12 }}>Try adjusting the filters, date or search.</div>
                    </div>
                  </td>
                </tr>
              ) : (
                rows.map((r, i) => {
                  const qty = Number(r.stock_qty || 0);
                  return (
                    <tr key={r.id} style={{ borderBottom: `1px solid ${LIGHT_BORDER}` }}>
                      <td style={tdStyle}>{(page - 1) * PAGE_SIZE + i + 1}</td>
                      <td style={{ ...tdStyle, fontSize: 13, fontWeight: 600, color: NAVY }}>{r.item_name || "-"}</td>
                      <td style={{ ...tdStyle, textAlign: "right" }}>{fmtINR(r.sale_price)}</td>
                      <td style={{ ...tdStyle, textAlign: "right" }}>{fmtINR(r.purchase_price)}</td>
                      <td style={{ ...tdStyle, textAlign: "right", fontWeight: stockWeight(qty), color: stockColor(qty) }}>
                        {qty}
                      </td>
                      <td style={{ ...tdStyle, textAlign: "right", fontWeight: 600, color: Number(r.available_qty) < 0 ? "#dc2626" : "#334155" }}>
                        {Number(r.available_qty)}
                      </td>
                      <td style={{ ...tdStyle, textAlign: "right" }}>{Number(r.reserved_qty || 0)}</td>
                      <td style={{ ...tdStyle, textAlign: "right", fontWeight: 700, color: NAVY }}>
                        {fmtINR(r.stock_value)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: `2px solid ${INDIGO}`, background: "#eef2ff" }}>
                <td colSpan={4} style={{ ...tdStyle, fontWeight: 800, color: NAVY, fontSize: 13 }}>Total</td>
                <td style={{ ...tdStyle, textAlign: "right", fontWeight: 800, color: NAVY, fontSize: 13 }}>
                  {Number(totals.stock_qty || 0)}
                </td>
                <td style={{ ...tdStyle, textAlign: "right", fontWeight: 800, color: NAVY, fontSize: 13 }}>
                  {Number(totals.available_qty || 0)}
                </td>
                <td style={{ ...tdStyle, textAlign: "right", fontWeight: 800, color: NAVY, fontSize: 13 }}>
                  {Number(totals.reserved_qty || 0)}
                </td>
                <td style={{ ...tdStyle, textAlign: "right", fontWeight: 800, color: NAVY, fontSize: 13 }}>
                  {fmtINR(totals.stock_value)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          PAGINATION
          ═══════════════════════════════════════════════════════════════ */}
      {totalCount > PAGE_SIZE && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12, marginTop: 10 }}>
          <span style={{ fontSize: 12, color: GRAY_TEXT }}>
            {totalCount} items · Page {Math.min(page, lastPage)} of {lastPage}
          </span>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              style={{ ...pageBtnStyle, opacity: page <= 1 ? 0.4 : 1, cursor: page <= 1 ? "not-allowed" : "pointer" }}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
              disabled={page >= lastPage}
              style={{ ...pageBtnStyle, opacity: page >= lastPage ? 0.4 : 1, cursor: page >= lastPage ? "not-allowed" : "pointer" }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════════
   STYLES
   ═════════════════════════════════════════════════════════════════════ */

const selectBtnStyle = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  padding: "8px 14px",
  background: "#fff",
  border: `1px solid ${LIGHT_BORDER}`,
  borderRadius: 8,
  cursor: "pointer",
  fontFamily: FONT,
  whiteSpace: "nowrap",
};

const actionBtnStyle = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 2,
  padding: "6px 14px",
  background: "transparent",
  border: `1px solid ${LIGHT_BORDER}`,
  borderRadius: 8,
  cursor: "pointer",
  fontFamily: FONT,
  whiteSpace: "nowrap",
};

const dateBoxStyle = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  padding: "6px 12px",
  background: "#f9fafb",
  border: `1px solid ${LIGHT_BORDER}`,
  borderRadius: 8,
  whiteSpace: "nowrap",
};

const dateInputStyle = {
  border: `1px solid ${LIGHT_BORDER}`,
  borderRadius: 6,
  padding: "5px 8px",
  fontSize: 13,
  fontFamily: FONT,
  color: "#334155",
  background: "#fff",
  outline: "none",
  width: 137,
};

const dropdownPanelStyle = {
  position: "absolute",
  top: "calc(100% + 6px)",
  left: 0,
  minWidth: 170,
  zIndex: 60,
  background: "#fff",
  border: "1.5px solid #e0e7ff",
  borderRadius: 10,
  boxShadow: "0 12px 32px rgba(30,27,75,.12)",
  overflow: "hidden",
  fontFamily: FONT,
};

const dropdownItemStyle = {
  display: "block",
  width: "100%",
  textAlign: "left",
  padding: "8px 14px",
  background: "transparent",
  border: "none",
  fontSize: 13,
  fontFamily: FONT,
  cursor: "pointer",
  transition: "background .1s",
  whiteSpace: "nowrap",
};

const searchInputStyle = {
  width: "100%",
  padding: "10px 36px 10px 38px",
  border: `1px solid ${LIGHT_BORDER}`,
  borderRadius: 8,
  fontSize: 13,
  fontFamily: FONT,
  color: "#334155",
  background: "#fff",
  outline: "none",
  boxSizing: "border-box",
};

const tableContainerStyle = {
  flex: 1,
  display: "flex",
  flexDirection: "column",
  border: `1px solid ${LIGHT_BORDER}`,
  borderRadius: 8,
  overflow: "hidden",
  background: "#fff",
  minHeight: 0,
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  fontFamily: FONT,
  tableLayout: "fixed",
};

const thStyle = {
  padding: "10px 12px",
  fontSize: 11,
  fontWeight: 700,
  color: GRAY_TEXT,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
  textAlign: "left",
  background: "#f9fafb",
  borderRight: `1px solid ${LIGHT_BORDER}`,
  borderBottom: `1px solid ${LIGHT_BORDER}`,
  whiteSpace: "nowrap",
  userSelect: "none",
  position: "sticky",
  top: 0,
  zIndex: 2,
};

const emptyCellStyle = {
  padding: "80px 24px",
  textAlign: "center",
  verticalAlign: "middle",
};

const tdStyle = {
  padding: "10px 12px",
  borderBottom: `1px solid ${LIGHT_BORDER}`,
  fontSize: 12.5,
  color: "#334155",
  verticalAlign: "middle",
};

const pageBtnStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 30,
  height: 30,
  background: "#fff",
  border: `1px solid ${LIGHT_BORDER}`,
  borderRadius: 8,
  color: NAVY,
  fontFamily: FONT,
};
