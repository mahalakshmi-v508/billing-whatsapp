import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import api from "../../../services/api";
import { getCurrencySymbol } from "../../../utils/expenseDocument";
import { Calendar, ChevronDown, FileSpreadsheet, Printer, Search } from "lucide-react";
import * as XLSX from "xlsx";

const toInputDate = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const TODAY = new Date();
const FIRST_OF_MONTH = new Date(TODAY.getFullYear(), TODAY.getMonth(), 1);

const fmtDate = (d) => {
  if (!d || d === "-") return "-";
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return String(d);
    return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch { return String(d); }
};

const ORDER_TYPES = [
  { value: "sale_order", label: "Sale Order" },
  { value: "purchase_order", label: "Purchase Order" },
];

const STATUSES = [
  { value: "all", label: "All Status" },
  { value: "open", label: "Open Orders" },
  { value: "pending", label: "Partial Open Orders" },
  { value: "paid", label: "Close Orders" },
];

function matchesStatus(line, filter) {
  if (filter === "all") return true;
  const bal = line.balance;
  const adv = line.advance;
  if (filter === "paid") return bal === 0;
  if (filter === "open") return bal > 0 && adv === 0;
  if (filter === "pending") return bal > 0 && adv > 0;
  return true;
}

const parseNum = (v) => {
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
};

function parseSaleLine(p) {
  const name = p?.product_name || p?.name || p?.item_name || p?.item || "-";
  const qty = parseNum(p?.qty) || parseNum(p?.quantity) || 1;
  const price = parseNum(p?.price) || parseNum(p?.unit_price);
  let amount = parseNum(p?.amount);
  if (!amount) amount = parseNum(p?.total_amount) || parseNum(p?.line_total) || parseNum(p?.total);
  if (!amount) amount = qty * price;
  return { name: String(name), qty, amount };
}

function parsePurchaseLine(it) {
  const name = it?.product_name || it?.name || "-";
  const qty = parseNum(it?.quantity) || 1;
  let amount = parseNum(it?.total_amount) || parseNum(it?.amount);
  if (!amount) amount = qty * parseNum(it?.price);
  return { name: String(name), qty, amount };
}

export default function SaleOrderItem() {
  const [fromDate, setFromDate] = useState(() => toInputDate(FIRST_OF_MONTH));
  const [toDate, setToDate] = useState(() => toInputDate(TODAY));
  const [orderType, setOrderType] = useState("sale_order");
  const [orderStatus, setOrderStatus] = useState("all");
  const [partyQuery, setPartyQuery] = useState("");
  const [partyResults, setPartyResults] = useState([]);
  const [selectedParty, setSelectedParty] = useState(null);
  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [symbol, setSymbol] = useState("\u20B9");
  const [activeDropdown, setActiveDropdown] = useState(null);

  const user = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("user") || "{}"); } catch { return {}; }
  }, []);
  const adminId = user?.admin_id || user?.id || 0;
  const companyId = useMemo(() => {
    const v = localStorage.getItem("selected_company_id");
    return v ? Number(v) : 0;
  }, []);

  const debounceRef = useRef(null);

  useEffect(() => {
    let m = true;
    getCurrencySymbol(companyId).then((s) => { if (m) setSymbol(s || "\u20B9"); });
    return () => { m = false; };
  }, [companyId]);

  const searchParty = useCallback(async (q) => {
    if (!q || q.length < 1) { setPartyResults([]); return; }
    try {
      if (orderType === "sale_order") {
        const res = await api.get(`/customer/customer_search?admin_id=${adminId}&q=${encodeURIComponent(q)}`);
        setPartyResults(Array.isArray(res?.data?.data) ? res.data.data.map((c) => ({ id: c.id, name: c.name, phone: c.phone || "" })) : []);
      } else {
        const res = await api.get(`/supplier/get_all?company_id=${companyId}`);
        const all = Array.isArray(res?.data?.data) ? res.data.data : [];
        setPartyResults(
          all
            .filter((s) => (s.supplier_name || "").toLowerCase().includes(q.toLowerCase()))
            .map((s) => ({ id: s.id, name: s.supplier_name, phone: s.phone || "" }))
            .slice(0, 10)
        );
      }
    } catch { setPartyResults([]); }
  }, [orderType, adminId, companyId]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      const flat = [];
      try {
        if (orderType === "sale_order") {
          const params = {
            company_id: companyId || 0,
            from_date: fromDate,
            to_date: toDate,
            payment_method: "all",
            payment_status: "all",
            customer_name: selectedParty?.name || "",
            brand_id: 0,
          };
          const res = await api.get("/invoice/get_filtered_invoices", { params });
          if (cancelled) return;
          const data = Array.isArray(res?.data?.data) ? res.data.data : [];
          data.forEach((r) => {
            const bal = parseNum(r.balance_amount);
            const adv = parseNum(r.paid_amount);
            const items = Array.isArray(r.products) ? r.products : [];
            items.forEach((p) => {
              const parsed = parseSaleLine(p);
              flat.push({ ...parsed, balance: bal, advance: adv });
            });
          });
        } else {
          const params = { company_id: companyId || 0, start_date: fromDate, end_date: toDate };
          if (selectedParty?.id) params.supplier_id = selectedParty.id;
          const listRes = await api.get("/purchase/get_purchases", { params });
          if (cancelled) return;
          const list = Array.isArray(listRes?.data?.data) ? listRes.data.data : [];
          const detailResults = await Promise.all(
            list.map((p) =>
              api.get("/purchase/get_purchase_by_id", { params: { id: p.id } }).catch(() => null)
            )
          );
          if (cancelled) return;
          detailResults.forEach((dr, idx) => {
            const p = list[idx];
            if (!dr?.data?.data) return;
            const bal = parseNum(p.balance_amount);
            const adv = parseNum(p.paid_amount);
            const items = Array.isArray(dr.data.data.items) ? dr.data.data.items : [];
            items.forEach((it) => {
              const parsed = parsePurchaseLine(it);
              flat.push({ ...parsed, balance: bal, advance: adv });
            });
          });
        }
        setLines(flat);
      } catch (err) {
        console.error("Sale order item load error", err);
        if (!cancelled) setLines([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [companyId, fromDate, toDate, orderType, selectedParty]);

  const reportedRows = useMemo(() => {
    const statusLines = orderStatus === "all" ? lines : lines.filter((l) => matchesStatus(l, orderStatus));
    const map = new Map();
    statusLines.forEach((l) => {
      const key = l.name.trim().toLowerCase() || l.name;
      if (!map.has(key)) map.set(key, { name: l.name, qty: 0, amount: 0 });
      const entry = map.get(key);
      entry.qty += l.qty;
      entry.amount += l.amount;
    });
    return Array.from(map.values()).sort(
      (a, b) => b.amount - a.amount || String(a.name).localeCompare(String(b.name))
    );
  }, [lines, orderStatus]);

  const totalQty = useMemo(() => reportedRows.reduce((s, r) => s + r.qty, 0), [reportedRows]);
  const totalAmount = useMemo(() => reportedRows.reduce((s, r) => s + r.amount, 0), [reportedRows]);

  useEffect(() => {
    if (!activeDropdown && !partyResults.length) return;
    const handler = (e) => {
      if (!e.target.closest(".soi-dropdown") && !e.target.closest(".soi-party-wrap")) {
        setActiveDropdown(null);
        setPartyResults([]);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [activeDropdown, partyResults.length]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") {
        setActiveDropdown(null);
        setPartyResults([]);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  const handleOrderType = (value) => {
    setOrderType(value);
    setSelectedParty(null);
    setPartyQuery("");
    setPartyResults([]);
    setActiveDropdown(null);
  };

  const handlePartyInput = (e) => {
    const q = e.target.value;
    setPartyQuery(q);
    if (!q) { setPartyResults([]); setSelectedParty(null); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchParty(q), 300);
  };

  const selectParty = (party) => {
    setSelectedParty(party);
    setPartyQuery(party.name);
    setPartyResults([]);
  };

  const clearParty = () => {
    setSelectedParty(null);
    setPartyQuery("");
    setPartyResults([]);
  };

  const handleExportExcel = () => {
    if (!reportedRows.length) { alert("No data to export"); return; }
    const data = reportedRows.map((r) => ({
      "Item Name": r.name,
      Quantity: r.qty,
      Amount: r.amount,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sale Order Item");
    XLSX.writeFile(wb, `SaleOrderItem_${fromDate}_${toDate}.xlsx`);
  };

  const handlePrint = () => { window.print(); };

  const fmtMoney = (n) =>
    `${symbol}${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const fmtQty = (n) =>
    Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

  const selectedTypeLabel = ORDER_TYPES.find((t) => t.value === orderType)?.label || "Sale Order";
  const selectedStatusLabel = STATUSES.find((s) => s.value === orderStatus)?.label || "All Status";

  return (
    <>
      <style>{`
        .soi-page{padding:16px 20px;max-width:1200px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
        .soi-top-bar{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px;flex-wrap:wrap}
        .soi-date-group{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
        .soi-date-field{display:flex;align-items:center;gap:4px}
        .soi-date-field input[type="date"]{padding:5px 8px;font-size:13px;border:1px solid #e2e8f0;border-radius:6px;background:#fff;outline:none;color:#334155}
        .soi-date-field input[type="date"]:focus{border-color:#3b82f6}
        .soi-date-sep{font-size:13px;color:#64748b}
        .soi-actions{display:flex;align-items:center;gap:8px}
        .soi-action-btn{display:flex;align-items:center;gap:4px;padding:5px 12px;font-size:12px;font-weight:500;border-radius:16px;border:1px solid #e2e8f0;background:#fff;cursor:pointer;color:#475569;transition:background .15s}
        .soi-action-btn:hover{background:#f1f5f9}
        .soi-filter-row{display:flex;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap}
        .soi-filter-label{font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;margin-right:2px}
        .soi-party-wrap{position:relative;flex:0 1 220px;min-width:140px}
        .soi-party-input{width:100%;padding:5px 10px;font-size:13px;border:1px solid #e2e8f0;border-radius:6px;background:#fff;outline:none}
        .soi-party-input:focus{border-color:#3b82f6;box-shadow:0 0 0 2px rgba(59,130,246,.12)}
        .soi-party-results{position:absolute;top:calc(100% + 2px);left:0;right:0;background:#fff;border:1px solid #e2e8f0;border-radius:8px;box-shadow:0 4px 14px rgba(0,0,0,.1);z-index:1100;max-height:200px;overflow-y:auto}
        .soi-party-item{padding:7px 10px;font-size:13px;cursor:pointer;border-bottom:1px solid #f1f5f9;display:flex;flex-direction:column;gap:1px}
        .soi-party-item:last-child{border-bottom:none}
        .soi-party-item:hover{background:#f8fafc}
        .soi-party-item-name{font-weight:500;color:#1e293b}
        .soi-party-item-phone{font-size:11px;color:#94a3b8}
        .soi-dropdown{position:relative}
        .soi-dropdown-trigger{display:flex;align-items:center;gap:4px;padding:5px 10px;font-size:13px;font-weight:500;border:1px solid #e2e8f0;border-radius:6px;background:#fff;cursor:pointer;white-space:nowrap;color:#334155;transition:background .15s}
        .soi-dropdown-trigger:hover{background:#f8fafc}
        .soi-dropdown-trigger svg{color:#94a3b8}
        .soi-dropdown-menu{position:absolute;top:calc(100% + 2px);left:0;min-width:100%;background:#fff;border:1px solid #e2e8f0;border-radius:8px;box-shadow:0 4px 14px rgba(0,0,0,.1);z-index:1100;overflow:hidden}
        .soi-dropdown-item{padding:7px 12px;font-size:13px;cursor:pointer;white-space:nowrap;color:#334155;transition:background .12s}
        .soi-dropdown-item:hover{background:#f1f5f9}
        .soi-dropdown-item.soi-active{background:#eff6ff;color:#2563eb;font-weight:500}
        .soi-table-wrap{border:1px solid #e2e8f0;border-radius:8px;overflow-x:auto;-webkit-overflow-scrolling:touch;background:#fff}
        .soi-table{width:100%;border-collapse:collapse;min-width:380px}
        .soi-table th{padding:8px 10px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;color:#64748b;background:#f8fafc;border-bottom:1px solid #e2e8f0;text-align:left;white-space:nowrap}
        .soi-table th.soi-r{text-align:right}
        .soi-table td{padding:7px 10px;font-size:13px;color:#334155;border-bottom:1px solid #f1f5f9}
        .soi-table td.soi-r{text-align:right;font-variant-numeric:tabular-nums}
        .soi-table tbody tr:hover{background:#f8fafc}
        .soi-table td.soi-name{font-weight:600;color:#1e293b}
        .soi-empty{padding:48px 20px;text-align:center;color:#94a3b8;font-size:14px}
        .soi-loading{padding:24px;text-align:center;color:#94a3b8;font-size:13px}
        .soi-total-bar{display:flex;justify-content:flex-end;align-items:baseline;gap:16px;padding:10px 16px 2px;font-size:14px}
        .soi-total-bar .soi-total-label{font-weight:600;color:#475569}
        .soi-total-bar .soi-total-value{font-weight:700;color:#1e293b;font-variant-numeric:tabular-nums}
        .soi-print-area{display:none}
        @media print{
          .soi-print-area{display:block}
          body *{visibility:hidden!important}
          #sale-order-item-print-area,#sale-order-item-print-area *{visibility:visible!important}
          #sale-order-item-print-area{position:absolute!important;left:0!important;top:0!important;width:100%!important;margin:0!important;padding:10mm!important;background:#fff!important;box-shadow:none!important;border:none!important}
          .soi-no-print{display:none!important}
        }
        .soi-print-title{font-size:16px;font-weight:700;margin-bottom:6px;color:#1e293b}
        .soi-print-meta{font-size:11px;color:#475569;margin-bottom:10px;line-height:1.7}
        .soi-print-table{width:100%;border-collapse:collapse;margin-top:8px;font-size:10px}
        .soi-print-table th,.soi-print-table td{padding:4px 6px;border:1px solid #cbd5e1}
        .soi-print-table th{background:#f1f5f9;font-weight:600;font-size:10px;text-transform:uppercase}
        .soi-print-table td.soi-r{text-align:right}
        .soi-print-total{margin-top:8px;font-weight:600;font-size:12px;text-align:right}
        @media(max-width:900px){.soi-top-bar{flex-wrap:wrap}.soi-filter-row{gap:8px}}
        @media(max-width:600px){.soi-top-bar{flex-direction:column;align-items:stretch}.soi-date-group{flex-wrap:wrap}.soi-filter-row{flex-direction:column;align-items:stretch}.soi-party-wrap{flex:1 1 100%}}
      `}</style>

      <div id="sale-order-item-print-area" className="soi-print-area">
        <div className="soi-print-title">SALE ORDER ITEM REPORT</div>
        <div className="soi-print-meta">
          <div>Date: {fmtDate(fromDate)} - {fmtDate(toDate)}</div>
          <div>Party: {selectedParty?.name || "All"}</div>
          <div>Order Type: {selectedTypeLabel}</div>
          <div>Status: {selectedStatusLabel}</div>
        </div>
        <table className="soi-print-table">
          <thead>
            <tr>
              <th>Item Name</th><th className="soi-r">Quantity</th><th className="soi-r">Amount</th>
            </tr>
          </thead>
          <tbody>
            {reportedRows.map((r, i) => (
              <tr key={i}>
                <td>{r.name}</td>
                <td className="soi-r">{fmtQty(r.qty)}</td>
                <td className="soi-r">{fmtMoney(r.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="soi-print-total">Total&nbsp;&nbsp;&nbsp;{fmtQty(totalQty)}&nbsp;&nbsp;&nbsp;{fmtMoney(totalAmount)}</div>
      </div>

      <div className="soi-page soi-no-print">
        <div className="soi-top-bar">
          <div className="soi-date-group">
            <div className="soi-date-field">
              <Calendar size={14} color="#94a3b8" />
              <span className="soi-date-sep">From</span>
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div className="soi-date-field">
              <span className="soi-date-sep">To</span>
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
          </div>
          <div className="soi-actions">
            <button className="soi-action-btn" onClick={handleExportExcel}>
              <FileSpreadsheet size={14} /> Excel Report
            </button>
            <button className="soi-action-btn" onClick={handlePrint}>
              <Printer size={14} /> Print
            </button>
          </div>
        </div>

        <div className="soi-filter-row">
          <span className="soi-filter-label">Filters</span>

          <div className="soi-party-wrap">
            <div style={{ position: "relative" }}>
              <Search size={13} style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", pointerEvents: "none" }} />
              <input
                className="soi-party-input"
                style={{ paddingLeft: 26 }}
                placeholder="Party filter"
                value={partyQuery}
                onChange={handlePartyInput}
              />
              {selectedParty && (
                <button
                  onClick={clearParty}
                  style={{ position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 14, lineHeight: 1 }}
                  title="Clear"
                >
                  &times;
                </button>
              )}
            </div>
            {partyResults.length > 0 && (
              <div className="soi-party-results">
                {partyResults.map((p, i) => (
                  <div key={p.id || i} className="soi-party-item" onClick={() => { selectParty(p); setActiveDropdown(null); }}>
                    <span className="soi-party-item-name">{p.name}</span>
                    {p.phone && <span className="soi-party-item-phone">{p.phone}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="soi-dropdown">
            <button className="soi-dropdown-trigger" onClick={() => setActiveDropdown(activeDropdown === "type" ? null : "type")}>
              {selectedTypeLabel} <ChevronDown size={14} />
            </button>
            {activeDropdown === "type" && (
              <div className="soi-dropdown-menu">
                {ORDER_TYPES.map((t) => (
                  <div
                    key={t.value}
                    className={`soi-dropdown-item${orderType === t.value ? " soi-active" : ""}`}
                    onClick={() => handleOrderType(t.value)}
                  >
                    {t.label}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="soi-dropdown">
            <button className="soi-dropdown-trigger" onClick={() => setActiveDropdown(activeDropdown === "status" ? null : "status")}>
              {selectedStatusLabel} <ChevronDown size={14} />
            </button>
            {activeDropdown === "status" && (
              <div className="soi-dropdown-menu">
                {STATUSES.map((s) => (
                  <div
                    key={s.value}
                    className={`soi-dropdown-item${orderStatus === s.value ? " soi-active" : ""}`}
                    onClick={() => { setOrderStatus(s.value); setActiveDropdown(null); }}
                  >
                    {s.label}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="soi-table-wrap">
          <table className="soi-table">
            <thead>
              <tr>
                <th>ITEM NAME</th>
                <th className="soi-r">QUANTITY</th>
                <th className="soi-r">AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={3} className="soi-loading">Loading...</td></tr>
              ) : reportedRows.length === 0 ? (
                <tr><td colSpan={3} className="soi-empty">No sale order items found.</td></tr>
              ) : (
                reportedRows.map((r, i) => (
                  <tr key={i}>
                    <td className="soi-name">{r.name}</td>
                    <td className="soi-r">{fmtQty(r.qty)}</td>
                    <td className="soi-r">{fmtMoney(r.amount)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="soi-total-bar">
          <span className="soi-total-label">Total Quantity:</span>
          <span className="soi-total-value">{fmtQty(totalQty)}</span>
          <span className="soi-total-label" style={{ marginLeft: 10 }}>Total Amount:</span>
          <span className="soi-total-value">{fmtMoney(totalAmount)}</span>
        </div>
      </div>
    </>
  );
}