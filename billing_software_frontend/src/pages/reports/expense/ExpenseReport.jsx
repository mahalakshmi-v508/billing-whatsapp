import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../services/api";
import * as XLSX from "xlsx";
import {
  Calendar,
  ChevronDown,
  FileSpreadsheet,
  FileText,
  MoreVertical,
  Pencil,
  Plus,
  Printer,
  Search,
  Trash2,
  X,
  BarChart3,
  Eye,
} from "lucide-react";

const today = () => new Date();
const firstOfMonth = () => new Date(today().getFullYear(), today().getMonth(), 1);
const toInputDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export default function ExpenseReport() {
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
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState("month");
  const [fromDate, setFromDate] = useState(toInputDate(firstOfMonth()));
  const [toDate, setToDate] = useState(toInputDate(today()));
  const [search, setSearch] = useState("");
  const [activeTxnMenuId, setActiveTxnMenuId] = useState(null);

  const fetchCompanies = async () => {
    try {
      const res = await api.get(`/company/get_companies_by_admin?admin_id=${adminId || 0}&role=${user?.role || "admin"}`);
      const list = Array.isArray(res?.data?.data) ? res.data.data : Array.isArray(res?.data) ? res.data : [];
      setCompanies(list);

      if (!companyId && list.length > 0) {
        const first = list[0];
        setCompanyId(first.id);
        localStorage.setItem("selected_company_id", String(first.id));
      }
    } catch (err) {
      console.error("Company load error", err);
    }
  };

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const query = {
        company_id: companyId || 0,
        admin_id: adminId || 0,
        from_date: fromDate,
        to_date: toDate,
        search: search.trim(),
      };

      const res = await api.get("/expense/list", { params: query });
      const rows = Array.isArray(res?.data?.data) ? res.data.data : [];
      setExpenses(rows);
    } catch (err) {
      console.error("Expense report load error", err);
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, [adminId, user?.role]);

  useEffect(() => {
    fetchExpenses();
  }, [companyId, fromDate, toDate, search]);

  const filteredExpenses = useMemo(() => {
    const q = (search || "").trim().toLowerCase();
    if (!q) return expenses;

    return expenses.filter((e) => {
      return [
        e.party_name,
        e.expense_no,
        e.category_name,
        e.payment_type,
        e.party_phone,
        e.description,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [expenses, search]);

  const totalAmount = filteredExpenses.reduce((sum, e) => sum + Number(e.total_amount || 0), 0);
  const totalBalance = filteredExpenses.reduce((sum, e) => sum + Number(e.balance_amount || 0), 0);

  const handleExportExcel = () => {
    if (!filteredExpenses.length) {
      alert("No expense data available to export.");
      return;
    }

    const rows = filteredExpenses.map((item, idx) => ({
      "S.No": idx + 1,
      Date: item.expense_date || "-",
      "Exp. No.": item.expense_no || item.id,
      Party: item.party_name || "-",
      "Category Name": item.category_name || "-",
      "Payment Type": item.payment_type || "Cash",
      Amount: item.total_amount || 0,
      "Balance Due": item.balance_amount || 0,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Expense Report");
    XLSX.writeFile(wb, `ExpenseReport_${companyId || "all"}.xlsx`);
  };

  const handleDelete = async (expense) => {
    if (!window.confirm(`Delete expense ${expense.expense_no || expense.id}?`)) return;
    try {
      const res = await api.post("/expense/delete", { id: expense.id });
      if (res.data.status) fetchExpenses();
      else alert(res.data.message || "Unable to delete expense");
    } catch (err) {
      console.error(err);
      alert("Unable to delete expense");
    }
  };

  return (
    <div className="expense-report-root">
      <style>{`
        .expense-report-root {
          min-width: 100%;
          background: #f8fafc;
          color: #334155;
          font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
        }

        .expense-report-card {
          min-height: 520px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
          padding: 0;
          overflow: hidden;
        }

        .expense-report-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          min-height: 64px;
          padding: 11px 16px;
          background: #f8fafc;
          border-bottom: 1px solid #dbe3ea;
          gap: 24px;
          flex-wrap: nowrap;
        }

        .expense-filter-strip {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: nowrap;
          min-width: 0;
          flex: 1 1 auto;
        }

        .expense-filter-title {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: fit-content;
          white-space: nowrap;
          font-size: 17px;
          font-weight: 800;
          color: #334155;
          background: #eef2f6;
          border-radius: 7px;
          padding: 8px 14px;
          height: 40px;
          box-shadow: inset 0 0 0 1px rgba(15,23,42,0.05);
          border: 1px solid #ccd5df;
        }

        .expense-filter-label {
          font-size: 13px;
          font-weight: 600;
          color: #475569;
          white-space: nowrap;
          min-width: fit-content;
          line-height: 1;
        }

        .expense-date-input {
          width: 145px;
          height: 40px;
          padding: 7px 12px;
          font-size: 14px;
          line-height: 1.2;
          border-radius: 6px;
          border: 1px solid #cbd5e1;
          background: #fff;
          color: #475569;
          outline: none;
          box-shadow: none;
        }

        .expense-company-select {
          width: 150px;
          height: 40px;
          padding: 7px 12px;
          font-size: 14px;
          line-height: 1.2;
          border-radius: 6px;
          border: 1px solid #cbd5e1;
          background: #fff;
          color: #475569;
          outline: none;
          box-shadow: none;
        }

        .expense-actions {
          display: flex;
          align-items: center;
          gap: 18px;
          flex-wrap: nowrap;
          flex-shrink: 0;
          justify-content: flex-end;
        }

        .expense-action {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          border: none;
          background: transparent;
          color: #475569;
          font-size: 12px;
          font-weight: 700;
          padding: 6px 8px;
          min-width: 56px;
          cursor: pointer;
          white-space: nowrap;
          height: 44px;
        }

        .expense-action svg {
          width: 20px;
          height: 20px;
          color: #475569;
        }

        .expense-action:hover {
          color: #1e293b;
          background: #eef2f6;
          border-radius: 8px;
        }

        .expense-content {
          padding: 14px 16px 0;
        }

        .expense-transactions-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 0 0 8px;
        }

        .expense-transactions-title {
          font-size: 16px;
          font-weight: 800;
          color: #334155;
          letter-spacing: 0.02em;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .expense-transactions-count {
          color: #64748b;
          font-size: 12px;
          font-weight: 600;
        }

        .expense-search-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .expense-search-wrap {
          position: relative;
          width: 260px;
        }

        .expense-search-wrap svg {
          position: absolute;
          left: 10px;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
          width: 16px;
          height: 16px;
        }

        .expense-search {
          width: 100%;
          height: 40px;
          padding: 8px 12px 8px 34px;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          background: #fff;
          color: #334155;
          font-size: 13px;
          outline: none;
        }

        .expense-add-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          height: 40px;
          padding: 0 16px;
          background: linear-gradient(135deg, #ee3444 0%, #cc1f2c 100%);
          color: #fff;
          font-size: 13px;
          font-weight: 800;
          border-radius: 8px;
          border: none;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0,0,0,0.08);
          white-space: nowrap;
        }

        .expense-add-button:hover {
          background: linear-gradient(135deg, #d72734 0%, #b91c28 100%);
        }

        .expense-table-scroll {
          width: 100%;
          overflow-x: auto;
          border: 1px solid #dbe3ea;
          border-radius: 6px;
          background: #fff;
        }

        .expense-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
        }

        .expense-table thead tr {
          background: #eef2f6;
        }

        .expense-table thead th {
          height: 40px;
          padding: 8px 11px;
          border-right: 1px solid #cbd5e1;
          border-bottom: 1px solid #cbd5e1;
          color: #334155;
          background: #eef2f6;
          font-size: 11px;
          font-weight: 800;
          line-height: 1.1;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          text-align: center;
          vertical-align: middle;
        }

        .expense-table thead th:last-child {
          border-right: none;
        }

        .expense-table tbody td {
          height: 46px;
          padding: 10px 11px;
          border-right: 1px solid #e2e8f0;
          border-bottom: 1px solid #e2e8f0;
          background: #fff;
          color: #334155;
          font-size: 12px;
          line-height: 1.35;
          text-align: center;
          vertical-align: middle;
          white-space: nowrap;
        }

        .expense-table tbody td:last-child {
          border-right: none;
        }

        .expense-table tbody tr {
          background: #fff;
        }

        .expense-table tbody tr:hover {
          background: #f8fafc;
        }

        .expense-table tbody td.amount-cell,
        .expense-table tbody td.balance-cell {
          font-weight: 700;
          color: #334155;
        }

        .expense-table tbody td.actions-cell {
          width: 70px;
          text-align: center;
        }

        .expense-table tbody .expense-action-menu {
          position: absolute;
          right: 0;
          top: 34px;
          z-index: 99;
          background: #fff;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          box-shadow: 0 5px 12px rgba(0, 0, 0, 0.16);
          min-width: 150px;
          overflow: hidden;
        }

        .expense-table tbody .expense-action-menu button {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          padding: 9px 12px;
          background: #fff;
          color: #334155;
          border: none;
          font-size: 12px;
          font-weight: 600;
          text-align: left;
          cursor: pointer;
        }

        .expense-table tbody .expense-action-menu button:hover {
          background: #eef2f6;
        }

        @media (max-width: 900px) {
          .expense-report-topbar,
          .expense-transactions-head,
          .expense-report-footer {
            flex-wrap: wrap;
          }
          .expense-filter-strip {
            flex-wrap: wrap;
          }
          .expense-actions {
            width: 100%;
            justify-content: flex-start;
          }
        }
      `}</style>

      <div className="expense-report-card">
        <div className="expense-report-topbar">
          <div className="expense-filter-strip">
            <span className="expense-filter-title">
              <span>This Month</span>
              <ChevronDown size={14} style={{ color: "#475569" }} />
            </span>

            <span className="expense-filter-label">Between</span>
            <input type="date" className="expense-date-input" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />

            <span className="expense-filter-label">To</span>
            <input type="date" className="expense-date-input" value={toDate} onChange={(e) => setToDate(e.target.value)} />

            <select className="expense-company-select" value={companyId} onChange={(e) => {
              const v = e.target.value;
              setCompanyId(v);
              localStorage.setItem("selected_company_id", String(v));
            }}>
              <option value="0">All Firms</option>
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name || c.company_name}</option>)}
            </select>
          </div>

          <div className="expense-actions">
            <button className="expense-action">
              <BarChart3 size={18} />
              <span>Graph</span>
            </button>
            <button className="expense-action" onClick={handleExportExcel}>
              <FileSpreadsheet size={18} />
              <span>Excel Report</span>
            </button>
            <button className="expense-action" onClick={() => window.print()}>
              <Printer size={18} />
              <span>Print</span>
            </button>
          </div>
        </div>

        <div className="expense-content">
          <div className="expense-transactions-head">
            <div className="expense-transactions-title-wrap">
              <span className="expense-transactions-title">Transactions</span>
            </div>

            <div className="expense-search-row">
              <div className="expense-search-wrap">
                <Search size={15} />
                <input value={search} placeholder="Search expense" onChange={(e) => setSearch(e.target.value)} className="expense-search" />
              </div>

              <button className="expense-add-button" onClick={() => navigate("/purchases/expenses/add")}>+ Add Expense</button>
            </div>
          </div>

          <div className="expense-table-scroll">
            <table className="expense-table">
              <colgroup>
                <col style={{ width: "11%" }} />
                <col style={{ width: "11%" }} />
                <col style={{ width: "11%" }} />
                <col style={{ width: "14%" }} />
                <col style={{ width: "14%" }} />
                <col style={{ width: "13%" }} />
                <col style={{ width: "13%" }} />
                <col style={{ width: "13%" }} />
              </colgroup>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Exp. No.</th>
                  <th>Party</th>
                  <th>Category Name</th>
                  <th>Payment Type</th>
                  <th>Amount</th>
                  <th>Balance Due</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="8" className="px-4 py-6 text-center text-sm">Loading...</td></tr>
                ) : filteredExpenses.length === 0 ? (
                  <tr><td colSpan="8" className="px-4 py-6 text-center text-sm">No expense records found.</td></tr>
                ) : filteredExpenses.map((row) => (
                  <tr key={row.id}>
                    <td>{row.expense_date || "-"}</td>
                    <td>{row.expense_no || row.id}</td>
                    <td>{row.party_name || "-"}</td>
                    <td>{row.category_name || "-"}</td>
                    <td>{row.payment_type || "Cash"}</td>
                    <td className="amount-cell">₹{Number(row.total_amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                    <td className="balance-cell">₹{Number(row.balance_amount || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                    <td className="actions-cell">
                      <div className="relative">
                        <button className="p-2 rounded hover:bg-slate-100" onClick={(e) => { e.stopPropagation(); setActiveTxnMenuId(activeTxnMenuId === row.id ? null : row.id); }}>
                          <MoreVertical size={16} />
                        </button>
                        {activeTxnMenuId === row.id && (
                          <div className="expense-action-menu">
                            <button onClick={() => { navigate(`/purchases/expenses/edit/${row.id}`); setActiveTxnMenuId(null); }}><Pencil size={14}/> Edit</button>
                            <button onClick={() => { handleDelete(row); setActiveTxnMenuId(null); }}><Trash2 size={14}/> Delete</button>
                            <button onClick={() => { setActiveTxnMenuId(null); navigate(`/purchases/expenses/add`); }}><Plus size={14}/> Add Expense</button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

