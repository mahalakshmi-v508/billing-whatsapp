import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../services/api";
import * as XLSX from "xlsx";
import { getCurrencySymbol } from "../../../utils/expenseDocument";
import { Calendar, FileSpreadsheet, Plus, Printer } from "lucide-react";

const today = () => new Date();
const firstOfMonth = () => new Date(today().getFullYear(), today().getMonth(), 1);
const toInputDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const formatAmount = (symbol, n) =>
  `${symbol}${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function ExpenseCategoryReport() {
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

  const [companyId] = useState(savedCompanyId || 0);
  const [symbol, setSymbol] = useState("₹");
  const [fromDate, setFromDate] = useState(toInputDate(firstOfMonth()));
  const [toDate, setToDate] = useState(toInputDate(today()));
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

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
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get("/expense/categories", {
          params: {
            company_id: companyId || 0,
            admin_id: adminId || 0,
            from_date: fromDate,
            to_date: toDate,
          },
        });
        if (cancelled) return;
        const list = Array.isArray(res?.data?.data) ? res.data.data : [];
        setRows(list);
      } catch (err) {
        console.error("Expense category report load error", err);
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [companyId, adminId, fromDate, toDate]);

  const reportRows = useMemo(() => {
    return rows
      .filter((r) => Number(r.total_amount) > 0)
      .sort((a, b) => Number(b.total_amount) - Number(a.total_amount) || String(a.name || "").localeCompare(String(b.name || "")));
  }, [rows]);

  const totalAmount = useMemo(() => reportRows.reduce((sum, r) => sum + Number(r.total_amount || 0), 0), [reportRows]);

  const handleExportExcel = () => {
    if (!reportRows.length) {
      alert("No expense data available to export.");
      return;
    }
    const data = reportRows.map((r) => ({
      "Expense Category": r.name || "-",
      "Category Type": r.type || "Direct Expense",
      Amount: Number(r.total_amount || 0),
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Expense Category Report");
    XLSX.writeFile(wb, `ExpenseCategoryReport_${fromDate}_${toDate}.xlsx`);
  };

  const handlePrint = () => {
    const styleId = "expense-category-report-print-style";
    const existing = document.getElementById(styleId);
    if (existing) existing.remove();
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      @media print {
        body * { visibility: hidden !important; }
        #expense-cat-print-area, #expense-cat-print-area * { visibility: visible !important; }
        #expense-cat-print-area {
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
        .ecr-no-print { display: none !important; }
      }
    `;
    document.head.appendChild(style);
    window.print();
    setTimeout(() => document.getElementById(styleId)?.remove(), 300);
  };

  return (
    <div className="expense-category-report-root">
      <style>{`
        .expense-category-report-root {
          min-width: 100%;
          height: 100%;
          background: #ffffff;
          border-radius: 10px;
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
          color: #334155;
          font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
        }

        .ecr-wrap {
          padding: 18px 22px 22px;
          background: #ffffff;
        }

        .ecr-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
        }

        .ecr-dates {
          display: flex;
          align-items: flex-end;
          gap: 12px;
          flex-wrap: wrap;
        }

        .ecr-date-field {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .ecr-date-label {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: #94a3b8;
        }

        .ecr-date-label svg {
          width: 13px;
          height: 13px;
          color: #64748b;
        }

        .ecr-date-input {
          height: 34px;
          width: 150px;
          padding: 5px 10px;
          font-size: 13px;
          font-weight: 600;
          color: #1e293b;
          border: 1px solid #d8e0ea;
          border-radius: 7px;
          background: #fff;
          outline: none;
          box-shadow: none;
        }

        .ecr-date-input:focus {
          border-color: #c3cdd9;
          box-shadow: 0 0 0 2px rgba(15, 23, 42, 0.06);
        }

        .ecr-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }

        .ecr-icon-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 3px;
          width: 50px;
          height: 46px;
          border: 1px solid #e2e8f0;
          border-radius: 9999px;
          background: #fff;
          color: #475569;
          cursor: pointer;
          transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
        }

        .ecr-icon-btn svg {
          width: 17px;
          height: 17px;
          color: #ee3444;
        }

        .ecr-icon-btn span {
          font-size: 9.5px;
          font-weight: 800;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          color: #64748b;
        }

        .ecr-icon-btn:hover {
          background: #f8fafc;
          border-color: #d8e0ea;
        }

        .ecr-title-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-top: 22px;
        }

        .ecr-title {
          font-size: 22px;
          font-weight: 800;
          letter-spacing: 0.02em;
          text-transform: uppercase;
          color: #1e293b;
          margin: 0;
          line-height: 1.2;
        }

        .ecr-divider {
          height: 1px;
          background: #eef2f7;
          margin: 12px 0 6px;
        }

        .ecr-add-row {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 12px;
        }

        .ecr-add-btn {
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

        .ecr-add-btn svg {
          width: 14px;
          height: 14px;
        }

        .ecr-add-btn:hover {
          filter: brightness(1.05);
        }

        .ecr-table-scroll {
          width: 100%;
          overflow-x: auto;
        }

        .ecr-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 520px;
        }

        .ecr-table thead th {
          padding: 10px 8px;
          border-bottom: 1px solid #e2e8f0;
          color: #64748b;
          font-size: 10.5px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          text-align: left;
          white-space: nowrap;
        }

        .ecr-table thead th.ecr-amount {
          text-align: right;
        }

        .ecr-table tbody td {
          padding: 11px 8px;
          border-bottom: 1px solid #f1f5f9;
          color: #334155;
          font-size: 13px;
          font-weight: 500;
          text-align: left;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 320px;
        }

        .ecr-table tbody tr:last-child td {
          border-bottom: none;
        }

        .ecr-table tbody td.ecr-name {
          font-weight: 600;
          color: #1e293b;
        }

        .ecr-table tbody td.ecr-amount {
          text-align: right;
          font-weight: 700;
          color: #1e293b;
          font-variant-numeric: tabular-nums;
        }

        .ecr-empty-cell {
          padding: 42px 12px !important;
          text-align: center !important;
          color: #94a3b8;
          font-size: 13px;
          font-weight: 600;
          max-width: none !important;
          white-space: normal !important;
        }

        .ecr-total-row {
          display: flex;
          justify-content: flex-end;
          align-items: baseline;
          gap: 8px;
          margin-top: 14px;
          padding-top: 12px;
          border-top: 2px solid #eef2f7;
        }

        .ecr-total-label {
          font-size: 13px;
          font-weight: 700;
          color: #475569;
          letter-spacing: 0.02em;
        }

        .ecr-total-value {
          font-size: 15px;
          font-weight: 800;
          color: #1e293b;
          font-variant-numeric: tabular-nums;
        }

        @media (max-width: 700px) {
          .ecr-toolbar {
            flex-direction: column;
            align-items: stretch;
          }
          .ecr-actions {
            justify-content: flex-end;
          }
          .ecr-date-input {
            width: 100%;
          }
          .ecr-dates {
            flex-direction: column;
            align-items: stretch;
            gap: 8px;
          }
          .ecr-title-row {
            flex-wrap: wrap;
          }
        }
      `}</style>

      <div className="ecr-wrap" id="expense-cat-print-area">
        <div className="ecr-toolbar">
          <div className="ecr-dates">
            <div className="ecr-date-field">
              <label className="ecr-date-label">
                <Calendar /> From
              </label>
              <input type="date" className="ecr-date-input" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div className="ecr-date-field">
              <label className="ecr-date-label">
                <Calendar /> To
              </label>
              <input type="date" className="ecr-date-input" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
          </div>

          <div className="ecr-actions ecr-no-print">
            <button type="button" className="ecr-icon-btn" onClick={handleExportExcel} title="Export to Excel">
              <FileSpreadsheet />
              <span>Excel</span>
            </button>
            <button type="button" className="ecr-icon-btn" onClick={handlePrint} title="Print report">
              <Printer />
              <span>Print</span>
            </button>
          </div>
        </div>

        <div className="ecr-title-row">
          <h1 className="ecr-title">EXPENSE</h1>
          {fromDate && toDate && (
            <span style={{ fontSize: 11.5, fontWeight: 600, color: "#94a3b8", whiteSpace: "nowrap" }}>
              {new Date(`${fromDate}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
              {" — "}
              {new Date(`${toDate}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
            </span>
          )}
        </div>
        <div className="ecr-divider" />

        <div className="ecr-add-row ecr-no-print">
          <button type="button" className="ecr-add-btn" onClick={() => navigate("/purchases/expenses/add")}>
            <Plus /> Add Expense
          </button>
        </div>

        <div className="ecr-table-scroll">
          <table className="ecr-table">
            <thead>
              <tr>
                <th>Expense Category</th>
                <th>Category Type</th>
                <th className="ecr-amount">Amount</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="3" className="ecr-empty-cell">Loading...</td>
                </tr>
              ) : reportRows.length === 0 ? (
                <tr>
                  <td colSpan="3" className="ecr-empty-cell">No expense records found for the selected date range.</td>
                </tr>
              ) : (
                reportRows.map((r) => (
                  <tr key={r.id}>
                    <td className="ecr-name" title={r.name || ""}>{r.name || "-"}</td>
                    <td title={r.type || ""}>{r.type || "Direct Expense"}</td>
                    <td className="ecr-amount">{formatAmount(symbol, r.total_amount)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="ecr-total-row">
          <span className="ecr-total-label">Total Expense:</span>
          <span className="ecr-total-value">{formatAmount(symbol, totalAmount)}</span>
        </div>
      </div>
    </div>
  );
}