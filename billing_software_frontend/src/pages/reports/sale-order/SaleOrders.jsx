import { useState, useEffect, useMemo, useRef, useCallback } from "react";
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

const fmtStatus = (s) => {
  const m = { paid: "Paid", not_paid: "Unpaid", pending: "Partial", overdue: "Overdue" };
  return m[s] || s || "-";
};

const ORDER_TYPES = [
  { value: "sale_order", label: "Sale Order" },
  { value: "purchase_order", label: "Purchase Order" },
];

const ORDER_STATUSES = [
  { value: "all", label: "All Orders" },
  { value: "open", label: "Open Orders" },
  { value: "pending", label: "Partial Open Orders" },
  { value: "paid", label: "Close Orders" },
];

function matchesStatus(o, filter) {
  if (filter === "all") return true;
  const bal = o.balance;
  const adv = o.advance;
  if (filter === "paid") return bal === 0;
  if (filter === "open") return bal > 0 && adv === 0;
  if (filter === "pending") return bal > 0 && adv > 0;
  return true;
}

export default function SaleOrders() {
  const [fromDate, setFromDate] = useState(() => toInputDate(FIRST_OF_MONTH));
  const [toDate, setToDate] = useState(() => toInputDate(TODAY));
  const [orderType, setOrderType] = useState("sale_order");
  const [orderStatus, setOrderStatus] = useState("all");
  const [partyQuery, setPartyQuery] = useState("");
  const [partyResults, setPartyResults] = useState([]);
  const [selectedParty, setSelectedParty] = useState(null);
  const [orders, setOrders] = useState([]);
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
          setOrders(
            data.map((r) => ({
              date: r.created_at,
              orderNo: r.invoice_no || "-",
              name: r.customer_name || "-",
              dueDate: r.due_date || "-",
              status: r.payment_status || "not_paid",
              type: "Sale Order",
              total: parseFloat(r.total_amount) || 0,
              advance: parseFloat(r.paid_amount) || 0,
              balance: parseFloat(r.balance_amount) || 0,
            }))
          );
        } else {
          const params = { company_id: companyId || 0, start_date: fromDate, end_date: toDate };
          if (selectedParty?.id) params.supplier_id = selectedParty.id;
          const res = await api.get("/purchase/get_purchases", { params });
          if (cancelled) return;
          const data = Array.isArray(res?.data?.data) ? res.data.data : [];
          setOrders(
            data.map((r) => {
              const bal = parseFloat(r.balance_amount) || 0;
              const adv = parseFloat(r.paid_amount) || 0;
              let status = "paid";
              if (bal > 0) status = adv > 0 ? "pending" : "not_paid";
              return {
                date: r.purchase_date || r.created_at,
                orderNo: r.purchase_no || "-",
                name: r.supplier_name || "-",
                dueDate: "-",
                status,
                type: "Purchase Order",
                total: parseFloat(r.total_amount) || 0,
                advance: adv,
                balance: bal,
              };
            })
          );
        }
      } catch (err) {
        console.error("Sale order load error", err);
        if (!cancelled) setOrders([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [companyId, fromDate, toDate, orderType, selectedParty]);

  const filteredOrders = useMemo(() => {
    if (orderStatus === "all") return orders;
    return orders.filter((o) => matchesStatus(o, orderStatus));
  }, [orders, orderStatus]);

  const totalAmount = useMemo(
    () => filteredOrders.reduce((s, o) => s + o.total, 0),
    [filteredOrders]
  );

  useEffect(() => {
    if (!activeDropdown && !partyResults.length) return;
    const handler = (e) => {
      if (!e.target.closest(".so-dropdown") && !e.target.closest(".so-party-wrap")) {
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
    if (!filteredOrders.length) { alert("No data to export"); return; }
    const data = filteredOrders.map((o) => ({
      Date: fmtDate(o.date),
      "Order No.": o.orderNo,
      Name: o.name,
      "Due Date": fmtDate(o.dueDate),
      Status: fmtStatus(o.status),
      Type: o.type,
      Total: o.total,
      Advance: o.advance,
      Balance: o.balance,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sale Orders");
    XLSX.writeFile(wb, `SaleOrders_${fromDate}_${toDate}.xlsx`);
  };

  const handlePrint = () => { window.print(); };

  const fmtMoney = (n) =>
    `${symbol}${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const selectedTypeLabel = ORDER_TYPES.find((t) => t.value === orderType)?.label || "Sale Order";
  const selectedStatusLabel = ORDER_STATUSES.find((s) => s.value === orderStatus)?.label || "All Orders";

  return (
    <>
      <style>{`
        .so-page{padding:16px 20px;max-width:1200px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
        .so-top-bar{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px;flex-wrap:wrap}
        .so-date-group{display:flex;align-items:center;gap:6px}
        .so-date-field{display:flex;align-items:center;gap:4px}
        .so-date-field input[type="date"]{padding:5px 8px;font-size:13px;border:1px solid #e2e8f0;border-radius:6px;background:#fff;outline:none;color:#334155}
        .so-date-field input[type="date"]:focus{border-color:#3b82f6}
        .so-date-sep{font-size:13px;color:#64748b}
        .so-actions{display:flex;align-items:center;gap:8px}
        .so-action-btn{display:flex;align-items:center;gap:4px;padding:5px 12px;font-size:12px;font-weight:500;border-radius:16px;border:1px solid #e2e8f0;background:#fff;cursor:pointer;color:#475569;transition:background .15s}
        .so-action-btn:hover{background:#f1f5f9}
        .so-filter-row{display:flex;align-items:center;gap:10px;margin-bottom:12px;flex-wrap:wrap}
        .so-filter-label{font-size:11px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;margin-right:2px}
        .so-party-wrap{position:relative;flex:0 1 220px;min-width:140px}
        .so-party-input{width:100%;padding:5px 10px;font-size:13px;border:1px solid #e2e8f0;border-radius:6px;background:#fff;outline:none}
        .so-party-input:focus{border-color:#3b82f6;box-shadow:0 0 0 2px rgba(59,130,246,.12)}
        .so-party-results{position:absolute;top:calc(100% + 2px);left:0;right:0;background:#fff;border:1px solid #e2e8f0;border-radius:8px;box-shadow:0 4px 14px rgba(0,0,0,.1);z-index:1100;max-height:200px;overflow-y:auto}
        .so-party-item{padding:7px 10px;font-size:13px;cursor:pointer;border-bottom:1px solid #f1f5f9;display:flex;flex-direction:column;gap:1px}
        .so-party-item:last-child{border-bottom:none}
        .so-party-item:hover{background:#f8fafc}
        .so-party-item-name{font-weight:500;color:#1e293b}
        .so-party-item-phone{font-size:11px;color:#94a3b8}
        .so-dropdown{position:relative}
        .so-dropdown-trigger{display:flex;align-items:center;gap:4px;padding:5px 10px;font-size:13px;font-weight:500;border:1px solid #e2e8f0;border-radius:6px;background:#fff;cursor:pointer;white-space:nowrap;color:#334155;transition:background .15s}
        .so-dropdown-trigger:hover{background:#f8fafc}
        .so-dropdown-trigger svg{color:#94a3b8}
        .so-dropdown-menu{position:absolute;top:calc(100% + 2px);left:0;min-width:100%;background:#fff;border:1px solid #e2e8f0;border-radius:8px;box-shadow:0 4px 14px rgba(0,0,0,.1);z-index:1100;overflow:hidden}
        .so-dropdown-item{padding:7px 12px;font-size:13px;cursor:pointer;white-space:nowrap;color:#334155;transition:background .12s}
        .so-dropdown-item:hover{background:#f1f5f9}
        .so-dropdown-item.so-active{background:#eff6ff;color:#2563eb;font-weight:500}
        .so-table-wrap{border:1px solid #e2e8f0;border-radius:8px;overflow-x:auto;-webkit-overflow-scrolling:touch;background:#fff}
        .so-table{width:100%;border-collapse:collapse;min-width:740px}
        .so-table th{padding:8px 10px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;color:#64748b;background:#f8fafc;border-bottom:1px solid #e2e8f0;text-align:left;white-space:nowrap}
        .so-table th.so-r{text-align:right}
        .so-table th.so-c{text-align:center}
        .so-table td{padding:7px 10px;font-size:13px;color:#334155;border-bottom:1px solid #f1f5f9}
        .so-table td.so-r{text-align:right;font-variant-numeric:tabular-nums}
        .so-table td.so-c{text-align:center}
        .so-table tbody tr:hover{background:#f8fafc}
        .so-status-paid{color:#16a34a;font-weight:500}
        .so-status-not_paid{color:#dc2626;font-weight:500}
        .so-status-pending{color:#d97706;font-weight:500}
        .so-status-overdue{color:#dc2626;font-weight:500;font-style:italic}
        .so-empty{padding:48px 20px;text-align:center;color:#94a3b8;font-size:14px}
        .so-loading{padding:24px;text-align:center;color:#94a3b8;font-size:13px}
        .so-total-bar{display:flex;justify-content:flex-end;padding:10px 16px;font-size:14px;font-weight:600;color:#1e293b}
        .so-print-area{display:none}
        @media print{
          .so-print-area{display:block}
          body *{visibility:hidden!important}
          #sale-orders-print-area,#sale-orders-print-area *{visibility:visible!important}
          #sale-orders-print-area{position:absolute!important;left:0!important;top:0!important;width:100%!important;margin:0!important;padding:10mm!important;background:#fff!important;box-shadow:none!important;border:none!important}
          .so-no-print{display:none!important}
        }
        .so-print-title{font-size:16px;font-weight:700;margin-bottom:6px;color:#1e293b}
        .so-print-meta{font-size:11px;color:#475569;margin-bottom:10px;line-height:1.7}
        .so-print-table{width:100%;border-collapse:collapse;margin-top:8px;font-size:10px}
        .so-print-table th,.so-print-table td{padding:4px 6px;border:1px solid #cbd5e1}
        .so-print-table th{background:#f1f5f9;font-weight:600;font-size:10px;text-transform:uppercase}
        .so-print-table td.so-r{text-align:right}
        .so-print-total{margin-top:8px;font-weight:600;font-size:12px;text-align:right}
        @media(max-width:900px){.so-top-bar{flex-wrap:wrap}.so-filter-row{gap:8px}}
        @media(max-width:600px){.so-top-bar{flex-direction:column;align-items:stretch}.so-date-group{flex-wrap:wrap}.so-filter-row{flex-direction:column;align-items:stretch}.so-party-wrap{flex:1 1 100%}}
      `}</style>

      <div id="sale-orders-print-area" className="so-print-area">
        <div className="so-print-title">SALE ORDERS</div>
        <div className="so-print-meta">
          <div>Date Range: {fmtDate(fromDate)} - {fmtDate(toDate)}</div>
          <div>Party: {selectedParty?.name || "All"}</div>
          <div>Order Type: {selectedTypeLabel}</div>
          <div>Status: {selectedStatusLabel}</div>
        </div>
        <table className="so-print-table">
          <thead>
            <tr>
              <th>Date</th><th>Order No.</th><th>Name</th><th>Due Date</th>
              <th>Status</th><th>Type</th><th className="so-r">Total</th>
              <th className="so-r">Advance</th><th className="so-r">Balance</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map((o, i) => (
              <tr key={i}>
                <td>{fmtDate(o.date)}</td><td>{o.orderNo}</td><td>{o.name}</td>
                <td>{fmtDate(o.dueDate)}</td><td>{fmtStatus(o.status)}</td><td>{o.type}</td>
                <td className="so-r">{fmtMoney(o.total)}</td>
                <td className="so-r">{fmtMoney(o.advance)}</td>
                <td className="so-r">{fmtMoney(o.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="so-print-total">Total Amount: {fmtMoney(totalAmount)}</div>
      </div>

      <div className="so-page so-no-print">
        <div className="so-top-bar">
          <div className="so-date-group">
            <div className="so-date-field">
              <Calendar size={14} color="#94a3b8" />
              <span className="so-date-sep">From</span>
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div className="so-date-field">
              <span className="so-date-sep">To</span>
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
          </div>
          <div className="so-actions">
            <button className="so-action-btn" onClick={handleExportExcel}>
              <FileSpreadsheet size={14} /> Excel Report
            </button>
            <button className="so-action-btn" onClick={handlePrint}>
              <Printer size={14} /> Print
            </button>
          </div>
        </div>

        <div className="so-filter-row">
          <span className="so-filter-label">Filters</span>

          <div className="so-party-wrap">
            <div style={{ position: "relative" }}>
              <Search size={13} style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", pointerEvents: "none" }} />
              <input
                className="so-party-input"
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
              <div className="so-party-results">
                {partyResults.map((p, i) => (
                  <div key={p.id || i} className="so-party-item" onClick={() => { selectParty(p); setActiveDropdown(null); }}>
                    <span className="so-party-item-name">{p.name}</span>
                    {p.phone && <span className="so-party-item-phone">{p.phone}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="so-dropdown">
            <button className="so-dropdown-trigger" onClick={() => setActiveDropdown(activeDropdown === "type" ? null : "type")}>
              {selectedTypeLabel} <ChevronDown size={14} />
            </button>
            {activeDropdown === "type" && (
              <div className="so-dropdown-menu">
                {ORDER_TYPES.map((t) => (
                  <div
                    key={t.value}
                    className={`so-dropdown-item${orderType === t.value ? " so-active" : ""}`}
                    onClick={() => { setOrderType(t.value); setActiveDropdown(null); }}
                  >
                    {t.label}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="so-dropdown">
            <button className="so-dropdown-trigger" onClick={() => setActiveDropdown(activeDropdown === "status" ? null : "status")}>
              {selectedStatusLabel} <ChevronDown size={14} />
            </button>
            {activeDropdown === "status" && (
              <div className="so-dropdown-menu">
                {ORDER_STATUSES.map((s) => (
                  <div
                    key={s.value}
                    className={`so-dropdown-item${orderStatus === s.value ? " so-active" : ""}`}
                    onClick={() => { setOrderStatus(s.value); setActiveDropdown(null); }}
                  >
                    {s.label}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="so-table-wrap">
          <table className="so-table">
            <thead>
              <tr>
                <th>DATE</th>
                <th>ORDER NO.</th>
                <th>NAME</th>
                <th>DUE DATE</th>
                <th className="so-c">STATUS</th>
                <th className="so-c">TYPE</th>
                <th className="so-r">TOTAL</th>
                <th className="so-r">ADVANCE</th>
                <th className="so-r">BALANCE</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} className="so-loading">Loading...</td></tr>
              ) : filteredOrders.length === 0 ? (
                <tr><td colSpan={9} className="so-empty">No Sale Orders found.</td></tr>
              ) : (
                filteredOrders.map((o, i) => (
                  <tr key={i}>
                    <td>{fmtDate(o.date)}</td>
                    <td>{o.orderNo}</td>
                    <td>{o.name}</td>
                    <td>{fmtDate(o.dueDate)}</td>
                    <td className="so-c">
                      <span className={`so-status-${o.status}`}>{fmtStatus(o.status)}</span>
                    </td>
                    <td className="so-c">{o.type}</td>
                    <td className="so-r">{fmtMoney(o.total)}</td>
                    <td className="so-r">{fmtMoney(o.advance)}</td>
                    <td className="so-r">{fmtMoney(o.balance)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="so-total-bar">
          Total Amount: {fmtMoney(totalAmount)}
        </div>
      </div>
    </>
  );
}
