import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import api from "../../../services/api";
import * as XLSX from "xlsx";
import { getCurrencySymbol, parseRowItems } from "../../../utils/expenseDocument";
import { Calendar, ChevronDown, FileSpreadsheet, Filter, Plus, Printer, Search } from "lucide-react";

const today = () => new Date();
const firstOfMonth = () => new Date(today().getFullYear(), today().getMonth(), 1);
const toInputDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const PERIOD_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "week", label: "This Week" },
  { value: "last_week", label: "Last Week" },
  { value: "month", label: "This Month" },
  { value: "year", label: "This Year" },
  { value: "custom", label: "Custom" },
];

const periodLabel = (value) => PERIOD_OPTIONS.find((option) => option.value === value)?.label || "This Month";

const getPeriodDates = (value) => {
  const current = today();
  const start = new Date(current);
  const end = new Date(current);

  if (value === "yesterday") {
    start.setDate(start.getDate() - 1);
    end.setDate(end.getDate() - 1);
  } else if (value === "week" || value === "last_week") {
    const day = current.getDay();
    const mondayOffset = day === 0 ? 6 : day - 1;
    start.setDate(start.getDate() - mondayOffset - (value === "last_week" ? 7 : 0));
    end.setDate(start.getDate() + 6);
  } else if (value === "year") {
    start.setMonth(0, 1);
    end.setMonth(11, 31);
  } else {
    start.setDate(1);
  }

  return { from: toInputDate(start), to: toInputDate(end) };
};

const FILTER_COLUMNS = [
  { key: "EXPENSE ITEM", field: "item_name" },
  { key: "UNIT PRICE", field: "unit_price" },
  { key: "QUANTITY", field: "quantity" },
  { key: "AMOUNT", field: "amount" },
];

const formatAmount = (symbol, n) =>
  `${symbol}${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatQty = (n) => `${Number(n || 0)}`;

export default function ExpenseItemReport() {
  const navigate = useNavigate();

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  }, []);

  const adminId = user?.role === "cashier" ? user?.admin_id : user?.id;
  const savedCompanyId = localStorage.getItem("selected_company_id") || user?.company_id || 0;

  const [companies, setCompanies] = useState([]);
  const [companyId, setCompanyId] = useState(savedCompanyId || 0);
  const [symbol, setSymbol] = useState("₹");
  const [period, setPeriod] = useState("month");
  const [fromDate, setFromDate] = useState(toInputDate(firstOfMonth()));
  const [toDate, setToDate] = useState(toInputDate(today()));
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  const [periodMenuPosition, setPeriodMenuPosition] = useState(null);
  const [activeFilterCol, setActiveFilterCol] = useState("");
  const [filterAnchor, setFilterAnchor] = useState(null);
  const [filterPos, setFilterPos] = useState(null);
  const filterRef = useRef(null);
  const [colFilters, setColFilters] = useState({ "EXPENSE ITEM": "", "UNIT PRICE": "", QUANTITY: "", AMOUNT: "" });

  useEffect(() => {
    let cancelled = false;
    const loadCompanies = async () => {
      try {
        const res = await api.get(`/company/get_companies_by_admin?admin_id=${adminId || 0}&role=${user?.role || "admin"}`);
        if (cancelled) return;
        const list = Array.isArray(res?.data?.data) ? res.data.data : Array.isArray(res?.data) ? res.data : [];
        setCompanies(list);
        if (!savedCompanyId && list.length > 0) {
          setCompanyId(list[0].id);
          localStorage.setItem("selected_company_id", String(list[0].id));
        }
      } catch (err) {
        if (cancelled) return;
        console.error("Company load error", err);
      }
    };
    loadCompanies();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminId, user?.role]);

  useEffect(() => {
    let mounted = true;
    getCurrencySymbol(Number(companyId)).then((s) => {
      if (mounted) setSymbol(s || "₹");
    });
    return () => {
      mounted = false;
    };
  }, [companyId]);

  useEffect(() => {
    let cancelled = false;
    const loadExpenses = async () => {
      setLoading(true);
      try {
        const params = {
          company_id: companyId || 0,
          admin_id: adminId || 0,
          from_date: fromDate,
          to_date: toDate,
        };
        const res = await api.get("/expense/list", { params });
        if (cancelled) return;
        setExpenses(Array.isArray(res?.data?.data) ? res.data.data : []);
      } catch (err) {
        console.error("Expense item report load error", err);
        if (!cancelled) setExpenses([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    loadExpenses();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [companyId, fromDate, toDate]);

  useEffect(() => {
    const closeOnOutside = (event) => {
      if (!event.target.closest("[data-eir-menu-container]")) {
        setPeriodMenuPosition(null);
        setActiveFilterCol("");
        setFilterAnchor(null);
        setFilterPos(null);
      }
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") {
        setPeriodMenuPosition(null);
        setActiveFilterCol("");
        setFilterAnchor(null);
        setFilterPos(null);
      }
    };
    document.addEventListener("mousedown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  useLayoutEffect(() => {
    if (filterRef.current && filterAnchor) {
      const { width } = filterRef.current.getBoundingClientRect();
      const left = Math.max(8, Math.min(filterAnchor.left, window.innerWidth - width - 8));
      setFilterPos({ top: filterAnchor.bottom + 4, left });
    }
  }, [filterAnchor, activeFilterCol]);

  const handlePeriodChange = (value) => {
    setPeriod(value);
    if (value !== "custom") {
      const dates = getPeriodDates(value);
      setFromDate(dates.from);
      setToDate(dates.to);
    }
    setPeriodMenuPosition(null);
  };

  const togglePeriodMenu = (event) => {
    if (periodMenuPosition) {
      setPeriodMenuPosition(null);
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    setPeriodMenuPosition({ top: rect.bottom + 4, left: rect.left, width: rect.width });
  };

  const toggleFilterMenu = (event, key) => {
    event.stopPropagation();
    if (activeFilterCol === key) {
      setActiveFilterCol("");
      setFilterAnchor(null);
      setFilterPos(null);
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    setPeriodMenuPosition(null);
    setFilterAnchor({ top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right, width: rect.width });
    setFilterPos(null);
    setActiveFilterCol(key);
  };

  const itemRows = useMemo(() => {
    const rows = [];
    expenses.forEach((expense) => {
      const items = parseRowItems(expense?.items);
      items.forEach((it) => {
        const name = String(it.item_name || it.name || "").trim();
        if (!name) return;
        const quantity = Number(it.quantity ?? it.qty ?? 0);
        const unitPrice = Number(it.unit_price ?? it.price ?? 0);
        const amount = Number(it.amount ?? it.total_amount ?? "") || quantity * unitPrice;
        rows.push({ key: `${expense.id}-${rows.length}`, item_name: name, unit_price: unitPrice, quantity, amount });
      });
    });
    return rows;
  }, [expenses]);

  const displayedRows = useMemo(() => {
    const q = (search || "").trim().toLowerCase();
    let rows = itemRows;
    if (q) rows = rows.filter((r) => r.item_name.toLowerCase().includes(q));

    const active = FILTER_COLUMNS.filter((c) => (colFilters[c.key] || "").trim());
    if (active.length > 0) {
      rows = rows.filter((row) =>
        active.every((c) => {
          const cell = String(row[c.field] ?? "");
          return cell.toLowerCase().includes((colFilters[c.key] || "").trim().toLowerCase());
        })
      );
    }
    return rows;
  }, [itemRows, search, colFilters]);

  const totals = useMemo(() => {
    let quantity = 0;
    let amount = 0;
    displayedRows.forEach((r) => {
      quantity += Number(r.quantity || 0);
      amount += Number(r.amount || 0);
    });
    return { quantity, amount };
  }, [displayedRows]);

  const selectedCompany = useMemo(
    () => companies.find((c) => Number(c.id) === Number(companyId)) || null,
    [companies, companyId]
  );
  const firmLabel = selectedCompany ? selectedCompany.company_name || selectedCompany.name || "Selected Firm" : "All Firms";

  const handleExportExcel = () => {
    if (!displayedRows.length) {
      alert("No expense item data available to export.");
      return;
    }
    const data = displayedRows.map((r) => ({
      "Expense Item": r.item_name,
      "Unit Price": Number(r.unit_price || 0),
      Quantity: Number(r.quantity || 0),
      Amount: Number(r.amount || 0),
    }));
    data.push({
      "Expense Item": "Total",
      "Unit Price": "",
      Quantity: totals.quantity,
      Amount: totals.amount,
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Expense Item Report");
    XLSX.writeFile(wb, `ExpenseItemReport_${fromDate}_${toDate}.xlsx`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="expense-item-report-root">
      <style>{`
        .expense-item-report-root {
          min-width: 100%;
          height: 100%;
          background: #ffffff;
          border-radius: 10px;
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
          color: #334155;
          font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
        }

        .eir-wrap {
          padding: 18px 22px 22px;
          background: #ffffff;
        }

        .eir-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
        }

        .eir-filter-strip {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          min-width: 0;
          flex: 1 1 auto;
        }

        .eir-period-btn {
          display: flex;
          align-items: center;
          gap: 7px;
          height: 34px;
          padding: 0 12px;
          font-size: 12.5px;
          font-weight: 700;
          color: #1e293b;
          background: #f1f5f9;
          border: 1px solid #d8e0ea;
          border-radius: 7px;
          cursor: pointer;
          font-family: inherit;
          white-space: nowrap;
        }

        .eir-period-btn:hover {
          background: #e9eef4;
        }

        .eir-between-label {
          font-size: 12.5px;
          font-weight: 600;
          color: #64748b;
          white-space: nowrap;
        }

        .eir-date-group {
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .eir-date-input {
          display: flex;
          align-items: center;
          gap: 5px;
          height: 34px;
          width: 150px;
          padding: 0 8px;
          font-size: 12.5px;
          font-weight: 600;
          color: #1e293b;
          border: 1px solid #d8e0ea;
          border-radius: 7px;
          background: #fff;
          cursor: pointer;
        }

        .eir-date-input:focus-within {
          border-color: #c3cdd9;
          box-shadow: 0 0 0 2px rgba(15, 23, 42, 0.06);
        }

        .eir-date-input svg {
          width: 14px;
          height: 14px;
          color: #94a3b8;
          flex-shrink: 0;
        }

        .eir-date-input input {
          border: none;
          outline: none;
          background: transparent;
          font: inherit;
          color: inherit;
          width: 100%;
          min-width: 0;
        }

        .eir-company-select {
          height: 34px;
          width: 150px;
          padding: 0 10px;
          font-size: 12.5px;
          font-weight: 600;
          color: #1e293b;
          border: 1px solid #d8e0ea;
          border-radius: 7px;
          background: #fff;
          cursor: pointer;
          outline: none;
        }

        .eir-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }

        .eir-action {
          display: flex;
          align-items: center;
          gap: 6px;
          height: 34px;
          padding: 0 12px;
          border: 1px solid #e2e8f0;
          border-radius: 9999px;
          background: #fff;
          color: #475569;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.03em;
          text-transform: uppercase;
          cursor: pointer;
          font-family: inherit;
          white-space: nowrap;
          transition: background 0.15s ease, color 0.15s ease;
        }

        .eir-action svg {
          width: 15px;
          height: 15px;
          color: #ee3444;
        }

        .eir-action:hover {
          background: #f8fafc;
          color: #1e293b;
        }

        .eir-period-menu {
          position: fixed;
          z-index: 10000;
          min-width: 150px;
          background: #fff;
          border: 1px solid #d8e0ea;
          border-radius: 8px;
          box-shadow: 0 10px 26px rgba(15, 23, 42, 0.16);
          overflow: hidden;
          padding: 4px;
        }

        .eir-period-menu button {
          display: block;
          width: 100%;
          padding: 8px 12px;
          border: none;
          background: #fff;
          color: #334155;
          font-size: 12px;
          font-weight: 600;
          text-align: left;
          cursor: pointer;
          border-radius: 5px;
        }

        .eir-period-menu button:hover {
          background: #f1f5f9;
        }

        .eir-table-area {
          margin-top: 18px;
        }

        .eir-table-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          flex-wrap: wrap;
          margin-bottom: 12px;
        }

        .eir-search-wrap {
          position: relative;
          width: 240px;
          max-width: 100%;
        }

        .eir-search-wrap > svg {
          position: absolute;
          left: 10px;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
          width: 15px;
          height: 15px;
          pointer-events: none;
        }

        .eir-search {
          width: 100%;
          height: 34px;
          padding: 7px 12px 7px 32px;
          border: 1px solid #d8e0ea;
          border-radius: 7px;
          background: #fff;
          color: #334155;
          font-size: 12.5px;
          outline: none;
        }

        .eir-search:focus {
          border-color: #c3cdd9;
          box-shadow: 0 0 0 2px rgba(15, 23, 42, 0.06);
        }

        .eir-add-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          height: 34px;
          padding: 0 16px;
          background: linear-gradient(135deg, #ee3444 0%, #cc1f2c 100%);
          color: #fff;
          font-size: 12.5px;
          font-weight: 800;
          border-radius: 9999px;
          border: none;
          cursor: pointer;
          box-shadow: 0 2px 6px rgba(204, 31, 44, 0.28);
          white-space: nowrap;
          font-family: inherit;
          transition: filter 0.15s ease;
        }

        .eir-add-btn svg {
          width: 14px;
          height: 14px;
        }

        .eir-add-btn:hover {
          filter: brightness(1.05);
        }

        .eir-table-scroll {
          width: 100%;
          overflow-x: auto;
        }

        .eir-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 560px;
        }

        .eir-table thead th {
          padding: 10px 8px;
          border-bottom: 1px solid #e2e8f0;
          color: #64748b;
          font-size: 10.5px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          white-space: nowrap;
          position: relative;
        }

        .eir-table thead th.eir-left { text-align: left; }
        .eir-table thead th.eir-right { text-align: right; }

        .eir-th-inner {
          display: inline-flex;
          align-items: center;
          justify-content: flex-end;
          gap: 5px;
          width: 100%;
        }

        .eir-table thead th.eir-left .eir-th-inner { justify-content: flex-start; }

        .eir-filter-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 20px;
          height: 20px;
          border: none;
          background: transparent;
          border-radius: 4px;
          cursor: pointer;
          padding: 0;
          color: #cbd5e1;
          flex-shrink: 0;
        }

        .eir-filter-btn:hover {
          background: #e9eef4;
          color: #64748b;
        }

        .eir-filter-btn.is-active {
          color: #ee3444;
        }

        .eir-table tbody td {
          padding: 11px 8px;
          border-bottom: 1px solid #f1f5f9;
          color: #334155;
          font-size: 13px;
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 340px;
        }

        .eir-table tbody tr:last-child td {
          border-bottom: none;
        }

        .eir-table tbody td.eir-left { text-align: left; }
        .eir-table tbody td.eir-right {
          text-align: right;
          font-variant-numeric: tabular-nums;
        }

        .eir-table tbody td.eir-item {
          font-weight: 600;
          color: #1e293b;
        }

        .eir-table tbody td.eir-money {
          font-weight: 700;
          color: #1e293b;
        }

        .eir-empty-cell {
          padding: 42px 12px !important;
          text-align: center !important;
          color: #94a3b8;
          font-size: 13px;
          font-weight: 600;
          max-width: none !important;
          white-space: normal !important;
        }

        .eir-foot {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 28px;
          margin-top: 14px;
          padding-top: 12px;
          border-top: 2px solid #eef2f7;
        }

        .eir-foot .eir-foot-qty {
          font-size: 13px;
          font-weight: 800;
          color: #1e293b;
        }

        .eir-foot .eir-foot-amt {
          font-size: 15px;
          font-weight: 800;
          color: #1e293b;
          font-variant-numeric: tabular-nums;
        }

        .eir-foot .eir-foot-label {
          font-size: 12.5px;
          font-weight: 700;
          color: #64748b;
          margin-right: 6px;
        }

        .eir-filter-pop {
          position: fixed;
          z-index: 10000;
          width: 208px;
          background: #fff;
          border: 1px solid #d8e0ea;
          border-radius: 8px;
          box-shadow: 0 10px 26px rgba(15, 23, 42, 0.16);
          overflow: hidden;
          padding: 8px;
        }

        .eir-filter-input {
          width: 100%;
          height: 32px;
          padding: 6px 10px;
          font-size: 12.5px;
          border: 1px solid #d8e0ea;
          border-radius: 5px;
          background: #fff;
          color: #334155;
          outline: none;
          box-sizing: border-box;
        }

        .eir-filter-input:focus {
          border-color: #c3cdd9;
          box-shadow: 0 0 0 2px rgba(15, 23, 42, 0.06);
        }

        .eir-filter-pop-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
          margin-top: 8px;
        }

        .eir-filter-pop-actions button {
          border: none;
          background: transparent;
          font-size: 12px;
          font-weight: 700;
          color: #64748b;
          cursor: pointer;
          padding: 3px 6px;
          border-radius: 4px;
          font-family: inherit;
        }

        .eir-filter-pop-actions button:hover {
          background: #f1f5f9;
          color: #111827;
        }

        /* Print-only report sheet */
        .eir-print-sheet {
          display: none;
        }

        @media print {
          .eir-print-sheet {
            display: block;
          }
          body * { visibility: hidden !important; }
          #expense-item-print-area, #expense-item-print-area * { visibility: visible !important; }
          #expense-item-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 10mm !important;
            background: #ffffff !important;
            box-shadow: none !important;
            border: none !important;
          }
          .eir-no-print { display: none !important; }
        }

        @media (max-width: 900px) {
          .eir-toolbar {
            flex-direction: column;
            align-items: stretch;
          }
          .eir-filter-strip {
            width: 100%;
          }
          .eir-actions {
            justify-content: flex-end;
          }
        }

        @media (max-width: 640px) {
          .eir-filter-strip {
            flex-direction: column;
            align-items: stretch;
          }
          .eir-date-group {
            width: 100%;
          }
          .eir-date-input {
            width: 100%;
          }
          .eir-company-select {
            width: 100%;
          }
          .eir-search-wrap {
            width: 100%;
          }
        }
      `}</style>

      <div className="eir-wrap">
        <div className="eir-toolbar eir-no-print">
          <div className="eir-filter-strip">
            <button type="button" className="eir-period-btn" data-eir-menu-container onClick={togglePeriodMenu}>
              {periodLabel(period)}
              <ChevronDown size={14} style={{ color: "#64748b" }} />
            </button>

            <span className="eir-between-label">Between</span>

            <div className="eir-date-group">
              <label className="eir-date-input">
                <Calendar />
                <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              </label>
              <span className="eir-between-label">To</span>
              <label className="eir-date-input">
                <Calendar />
                <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
              </label>
            </div>

            <select
              className="eir-company-select"
              value={companyId}
              onChange={(e) => {
                const v = e.target.value;
                setCompanyId(v);
                localStorage.setItem("selected_company_id", String(v));
              }}
            >
              <option value="0">ALL FIRMS</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.company_name || c.name}</option>
              ))}
            </select>
          </div>

          <div className="eir-actions">
            <button type="button" className="eir-action" onClick={handleExportExcel} title="Export to Excel">
              <FileSpreadsheet /> Excel Report
            </button>
            <button type="button" className="eir-action" onClick={handlePrint} title="Print report">
              <Printer /> Print
            </button>
          </div>
        </div>

        <div className="eir-table-area">
          <div className="eir-table-toolbar eir-no-print">
            <div className="eir-search-wrap">
              <Search size={15} />
              <input value={search} placeholder="Search expense item" onChange={(e) => setSearch(e.target.value)} className="eir-search" />
            </div>

            <button type="button" className="eir-add-btn" onClick={() => navigate("/purchases/expenses/add")}>
              <Plus /> Add Expense
            </button>
          </div>

          <div className="eir-table-scroll">
            <table className="eir-table">
              <thead>
                <tr>
                  {FILTER_COLUMNS.map((c, i) => (
                    <th key={c.key} className={i === 0 ? "eir-left" : "eir-right"}>
                      <span className="eir-th-inner">
                        {c.key}
                        <button
                          type="button"
                          className={`eir-filter-btn ${(colFilters[c.key] || "").trim() ? "is-active" : ""}`}
                          data-eir-menu-container
                          onClick={(e) => toggleFilterMenu(e, c.key)}
                          title={`Filter ${c.key.toLowerCase()}`}
                        >
                          <Filter size={11} />
                        </button>
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="4" className="eir-empty-cell">Loading...</td></tr>
                ) : displayedRows.length === 0 ? (
                  <tr><td colSpan="4" className="eir-empty-cell">No expense items found.</td></tr>
                ) : (
                  displayedRows.map((r) => (
                    <tr key={r.key}>
                      <td className="eir-left eir-item" title={r.item_name}>{r.item_name}</td>
                      <td className="eir-right eir-money">{formatAmount(symbol, r.unit_price)}</td>
                      <td className="eir-right">{formatQty(r.quantity)}</td>
                      <td className="eir-right eir-money">{formatAmount(symbol, r.amount)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="eir-foot">
            <span>
              <span className="eir-foot-label">Total Quantity:</span>
              <span className="eir-foot-qty">{formatQty(totals.quantity)}</span>
            </span>
            <span>
              <span className="eir-foot-label">Total Amount:</span>
              <span className="eir-foot-amt">{formatAmount(symbol, totals.amount)}</span>
            </span>
          </div>
        </div>
      </div>

      {periodMenuPosition && createPortal(
        <div className="eir-period-menu" data-eir-menu-container style={periodMenuPosition}>
          {PERIOD_OPTIONS.map((option) => (
            <button key={option.value} type="button" onClick={() => handlePeriodChange(option.value)}>
              {option.label}
            </button>
          ))}
        </div>,
        document.body,
      )}

      {activeFilterCol && createPortal(
        <div ref={filterRef} className="eir-filter-pop" data-eir-menu-container style={filterPos || { visibility: "hidden", top: 0, left: 0 }}>
          <input
            autoFocus
            className="eir-filter-input"
            placeholder={`Filter ${activeFilterCol.toLowerCase()}...`}
            value={colFilters[activeFilterCol] || ""}
            onChange={(e) => setColFilters((p) => ({ ...p, [activeFilterCol]: e.target.value }))}
          />
          <div className="eir-filter-pop-actions">
            <button type="button" onClick={() => { setColFilters((p) => ({ ...p, [activeFilterCol]: "" })); setActiveFilterCol(""); setFilterAnchor(null); }}>Clear</button>
            <button type="button" onClick={() => { setActiveFilterCol(""); setFilterAnchor(null); }}>Done</button>
          </div>
        </div>,
        document.body,
      )}

      <div className="eir-print-sheet" id="expense-item-print-area">
        <style>{`
          #expense-item-print-area {
            font-family: Arial, Helvetica, sans-serif;
            color: #111827;
            font-size: 12px;
          }
          #expense-item-print-area .eirp-head {
            font-size: 16px;
            font-weight: 800;
            text-transform: uppercase;
            margin-bottom: 6px;
          }
          #expense-item-print-area .eirp-meta {
            font-size: 11px;
            color: #374151;
            margin-bottom: 3px;
          }
          #expense-item-print-area table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
          }
          #expense-item-print-area th,
          #expense-item-print-area td {
            border: 1px solid #9ca3af;
            padding: 5px 7px;
            text-align: left;
            font-size: 11.5px;
          }
          #expense-item-print-area th {
            background: #f3f4f6;
            font-weight: 700;
            text-transform: uppercase;
          }
          #expense-item-print-area td.num,
          #expense-item-print-area th.num {
            text-align: right;
          }
          #expense-item-print-area .eirp-total {
            margin-top: 8px;
            text-align: right;
            font-weight: 700;
            font-size: 12px;
          }
        `}</style>
        <div className="eirp-head">Expense Item Report</div>
        <div className="eirp-meta">
          Date Range: {new Date(`${fromDate}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
          {" - "}
          {new Date(`${toDate}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
        </div>
        <div className="eirp-meta">Firm: {firmLabel}</div>
        <table>
          <thead>
            <tr>
              <th>Expense Item</th>
              <th className="num">Unit Price</th>
              <th className="num">Quantity</th>
              <th className="num">Amount</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="4">Loading...</td></tr>
            ) : displayedRows.length === 0 ? (
              <tr><td colSpan="4">No expense items found.</td></tr>
            ) : (
              displayedRows.map((r) => (
                <tr key={r.key}>
                  <td>{r.item_name}</td>
                  <td className="num">{formatAmount(symbol, r.unit_price)}</td>
                  <td className="num">{formatQty(r.quantity)}</td>
                  <td className="num">{formatAmount(symbol, r.amount)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        <div className="eirp-total">
          Total Quantity: {formatQty(totals.quantity)}&nbsp;&nbsp;&nbsp;&nbsp;Total Amount: {formatAmount(symbol, totals.amount)}
        </div>
      </div>
    </div>
  );
}