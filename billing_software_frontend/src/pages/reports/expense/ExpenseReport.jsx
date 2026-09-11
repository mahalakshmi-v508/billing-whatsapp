import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../services/api";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import html2pdf from "html2pdf.js";
import {
  BarChart3,
  Copy,
  Eye,
  FileSpreadsheet,
  FileText,
  History,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Printer,
  Search,
  Trash2,
  X,
} from "lucide-react";
import ExpenseDocument from "./ExpenseDocument";

const formatINDate = (dateStr) => {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

const getTodayISO = () => new Date().toISOString().slice(0, 10);

const getFirstDayOfMonthISO = () => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
};

const money = (n) =>
  Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

/* Fixed dropdown geometry for smart auto-flip positioning (Purchase.jsx pattern) */
const ACTION_MENU_WIDTH = 200;
const ACTION_MENU_HEIGHT = 7 * 41 + 12; // 7 menu rows + padding
const ROW_GAP = 6;

/* Print a DOM node directly via a hidden iframe (no page navigation) */
function printElement(element) {
  const iframe = document.createElement("iframe");
  Object.assign(iframe.style, {
    position: "fixed",
    width: "0",
    height: "0",
    border: "0",
    visibility: "hidden",
    right: "0",
    bottom: "0",
  });
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;
  doc.open();
  doc.write(
    '<html><head><title>Expense Voucher</title></head>' +
      '<body style="margin:0;-webkit-print-color-adjust:exact;print-color-adjust:exact;">' +
      element.innerHTML +
      "</body></html>"
  );
  doc.close();

  const win = iframe.contentWindow;
  const fire = () => {
    try {
      win.focus();
      win.print();
    } finally {
      setTimeout(() => iframe.remove(), 1500);
    }
  };

  if (doc.readyState === "complete") {
    fire();
  } else {
    win.addEventListener("load", fire);
  }
}
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
  const [period, setPeriod] = useState("This Month");
  const [fromDate, setFromDate] = useState(getFirstDayOfMonthISO());
  const [toDate, setToDate] = useState(getTodayISO());
  const [selectedFirm, setSelectedFirm] = useState("all");
  const [companies, setCompanies] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [showGraph, setShowGraph] = useState(false);

  /* Row Actions (Purchase.jsx pattern) */
  const [actionMenu, setActionMenu] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const [previewDetail, setPreviewDetail] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");

  const [historyExpense, setHistoryExpense] = useState(null);
  const [historyRecord, setHistoryRecord] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");

  const [docBusyText, setDocBusyText] = useState("");
  const [docAction, setDocAction] = useState(null);

  const loadCompanies = async () => {
    try {
      const res = await api.get(`/company/get_companies_by_admin?admin_id=${adminId}`);
      const rows = Array.isArray(res?.data)
        ? res.data
        : res?.data?.data || res?.data?.companies || [];
      setCompanies(rows);
    } catch {
      setError("Unable to load firms.");
    }
  };

  const loadExpenses = async () => {
    setLoading(true);
    setError("");
    try {
      const params = {
        admin_id: adminId || 0,
        company_id: selectedFirm === "all" ? 0 : selectedFirm,
        from_date: period === "Between" ? fromDate : getFirstDayOfMonthISO(),
        to_date: period === "Between" ? toDate : getTodayISO(),
        search: searchTerm.trim(),
      };

      const res = await api.get("/expense/list", { params });
      const rows = Array.isArray(res?.data?.data)
        ? res.data.data
        : Array.isArray(res?.data) ? res.data : [];
      setExpenses(rows.filter((row) => !row.is_deleted));
    } catch {
      setError("Unable to fetch expense data. Please try again.");
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadCompanies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [adminId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadExpenses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, fromDate, toDate, selectedFirm, searchTerm, adminId]);

  /* current row's company object based on company_id (Purchase.jsx companyFor pattern) */
  const companyFor = (expense) =>
    companies.find((c) => String(c.id) === String(expense?.company_id)) || null;

  const loadExpenseDetail = async (expense) => {
    const res = await api.get("/expense/get_by_id", {
      params: { id: expense.id },
    });

    if (res.data?.status === false) {
      throw new Error(res.data.message || "Unable to load expense");
    }

    const data = res.data?.data ?? res.data;
    if (!data || typeof data !== "object" || Array.isArray(data) || !data.id) {
      throw new Error(res.data?.message || "Unable to load expense");
    }

    return data;
  };

  const filteredExpenses = useMemo(() => expenses, [expenses]);

  const graphData = useMemo(() => {
    const map = new Map();
    filteredExpenses.forEach((expense) => {
      const key = (expense.expense_date || "").slice(5, 7) || "00";
      map.set(key, (map.get(key) || 0) + Number(expense.total_amount || 0));
    });
    return Array.from(map.entries()).map(([month, amount]) => ({ month, amount }));
  }, [filteredExpenses]);

  const handlePeriodChange = (value) => {
    setPeriod(value);
    if (value === "This Month") {
      setFromDate(getFirstDayOfMonthISO());
      setToDate(getTodayISO());
    }
  };

  /* 3-DOT MENU — fixed position + viewport auto-flip (Purchase.jsx pattern) */
  const toggleActionMenu = (e, expense) => {
    if (actionMenu && String(actionMenu.id) === String(expense.id)) {
      setActionMenu(null);
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();

    let x = rect.right - ACTION_MENU_WIDTH;
    if (x < 10) x = 10;

    let y = rect.bottom + ROW_GAP;

    if (y + ACTION_MENU_HEIGHT > window.innerHeight - 10) {
      y = rect.top - ACTION_MENU_HEIGHT - ROW_GAP;
      if (y < 10) y = 10;
    }

    setActionMenu({ id: expense.id, x, y, expense });
  };

  const actionMenuExpense = actionMenu
    ? actionMenu.expense ||
      expenses.find((ex) => String(ex.id) === String(actionMenu.id)) ||
      null
    : null;

  /* VIEW / EDIT — existing expense edit screen */
  const handleViewEdit = (expense) => {
    setActionMenu(null);
    if (expense?.id) {
      navigate(`/purchases/expenses/edit/${expense.id}`);
    }
  };

  /* DELETE — real /expense/delete API with confirmation modal */
  const confirmDelete = (expense) => {
    setActionMenu(null);
    setDeleteTarget(expense);
  };

  const performDelete = async () => {
    if (!deleteTarget || deletingId) return;
    setDeletingId(deleteTarget.id);
    try {
      const res = await api.post("/expense/delete", {
        id: deleteTarget.id,
      });

      if (res.data.status) {
        setDeleteTarget(null);
        loadExpenses();
      } else {
        alert(res.data.message || "Unable to delete this expense");
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting expense");
    } finally {
      setDeletingId(null);
    }
  };

  /* DUPLICATE — real new expense created from the fetched record (no fake state) */
  const duplicateExpenseRow = async (expense) => {
    if (docBusyText) return;
    setActionMenu(null);
    setDocBusyText("Duplicating expense…");

    try {
      const detail = await loadExpenseDetail(expense);
      let items = [];
      try {
        items = Array.isArray(detail.items)
          ? detail.items
          : typeof detail.items === "string"
            ? JSON.parse(detail.items || "[]")
            : [];
      } catch {
        items = [];
      }

      const expenseDate = String(detail.expense_date || getTodayISO()).slice(0, 10);

      const payload = {
        admin_id: adminId || detail.admin_id,
        company_id: detail.company_id || (selectedFirm === "all" ? 0 : Number(selectedFirm)),
        cashier_id: detail.cashier_id || null,
        expense_no: "",
        expense_date: expenseDate,
        category_id: detail.category_id || null,
        category_name: detail.category_name,
        party_name: detail.party_name,
        party_phone: detail.party_phone,
        is_gst: Boolean(detail.is_gst),
        items,
        sub_total: detail.sub_total,
        tax_total: detail.tax_total,
        discount_total: detail.discount_total,
        round_off: detail.round_off,
        total_amount: detail.total_amount,
        paid_amount: detail.paid_amount,
        balance_amount: detail.balance_amount,
        payment_type: detail.payment_type,
        description: detail.description,
      };

      const res = await api.post("/expense/create", payload);
      if (res.data.status) {
        setDocBusyText("");
        loadExpenses();
        alert(
          `Expense duplicated as ${res.data.expense_no || res.data.invoice_no || "New"}`
        );
      } else {
        setDocBusyText("");
        alert(res.data.message || "Unable to duplicate expense");
      }
    } catch (err) {
      setDocBusyText("");
      console.error(err);
      alert("Error duplicating expense");
    }
  };

  /* PREVIEW — inline modal fed by the real expense record */
  const openPreview = (expense) => {
    setActionMenu(null);
    setPreviewDetail(null);
    setPreviewError("");
    setPreviewLoading(true);

    loadExpenseDetail(expense)
      .then(setPreviewDetail)
      .catch((err) =>
        setPreviewError(err.message || "Could not load expense")
      )
      .finally(() => setPreviewLoading(false));
  };

  /* OPEN PDF — fetch + render off-screen, then html2pdf -> blob url -> new tab */
  const openExpensePdf = (expense) => {
    if (docBusyText) return;
    setActionMenu(null);
    setDocBusyText("Generating PDF…");
    setDocAction(null);

    loadExpenseDetail(expense)
      .then((detail) => setDocAction({ mode: "pdf", detail }))
      .catch((err) => {
        setDocBusyText("");
        alert(err.message);
      });
  };

  /* PRINT — fetch + render off-screen, then hidden-iframe print dialog */
  const printExpenseRow = (expense) => {
    if (docBusyText) return;
    setActionMenu(null);
    setDocBusyText("Preparing print…");
    setDocAction(null);

    loadExpenseDetail(expense)
      .then((detail) => setDocAction({ mode: "print", detail }))
      .catch((err) => {
        setDocBusyText("");
        alert(err.message);
      });
  };

  /* Once the off-screen expense has painted:
       print -> hidden iframe print dialog
       pdf   -> html2pdf -> open the generated blob url in a new tab */
  useEffect(() => {
    if (!docAction) return;

    const mode = docAction.mode;

    const timer = setTimeout(async () => {
      const element = document.getElementById("row-action-expense");
      if (!element) {
        setDocAction(null);
        setDocBusyText("");
        alert("Could not prepare the expense document");
        return;
      }

      /* wait for the logo/images inside the document before capture */
      try {
        await Promise.all(
          [...element.querySelectorAll("img")].map((im) =>
            im.complete
              ? null
              : new Promise((resolve) => {
                  im.onload = resolve;
                  im.onerror = resolve;
                })
          )
        );
      } catch {
        /* ignore image wait errors */
      }

      if (mode === "print") {
        printElement(element);
      } else {
        const opt = {
          margin: [8, 8, 8, 8],
          filename: `expense-${docAction.detail.expense_no || docAction.detail.id || ""}.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: "#ffffff",
          },
          jsPDF: {
            unit: "mm",
            format: "a4",
            orientation: "portrait",
          },
        };

        try {
          const url = await html2pdf()
            .set(opt)
            .from(element)
            .output("bloburl");

          window.open(url, "_blank");
        } catch (err) {
          console.error(err);
          alert("Could not generate the PDF");
        }
      }

      setDocAction(null);
      setDocBusyText("");
    }, 350);

    return () => clearTimeout(timer);
  }, [docAction]);

  /* VIEW HISTORY — real expense record from /expense/get_by_id presented in a modal */
  const openHistory = (expense) => {
    setActionMenu(null);

    setHistoryExpense(expense);
    setHistoryRecord(null);
    setHistoryError("");
    setHistoryLoading(true);

    loadExpenseDetail(expense)
      .then(setHistoryRecord)
      .catch((err) =>
        setHistoryError(err.message || "Could not load expense history")
      )
      .finally(() => setHistoryLoading(false));
  };

  /* EXCEL EXPORT — real filtered rows for the selected range/firm */
  const handleDownloadExcel = () => {
    if (!filteredExpenses.length) {
      alert("No data available to export");
      return;
    }

    const firmName =
      companies.find((c) => String(c.id) === String(selectedFirm))?.company_name ||
      "All Firms";

    const rows = filteredExpenses.map((e, i) => ({
      "Sl No": i + 1,
      Date: formatINDate(e.expense_date),
      "Exp No": e.expense_no,
      Party: e.party_name,
      "Category Name": e.category_name,
      "Payment Type": e.payment_type,
      "Amount (₹)": Number(e.total_amount || 0),
      "Paid (₹)": Number(e.paid_amount || 0),
      "Balance Due (₹)": Number(e.balance_amount || 0),
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Expenses");

    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([buf], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(
      blob,
      `Expense_Report_${firmName}_${fromDate || "all"}_to_${toDate || "all"}.xlsx`
    );
  };

  const handlePrintReport = () => {
    window.print();
  };

  const menuItemStyle = {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "9px 12px",
    borderRadius: "8px",
    fontSize: "13.5px",
    fontWeight: "600",
    cursor: "pointer",
  };

  return (
    <div className="expense-report-page">
      <style>{`
        * { box-sizing: border-box; }
        .expense-report-page {
          min-height: 100vh;
          background: #eef2f6;
          color: #293855;
          font-family: Arial, Helvetica, sans-serif;
        }
        .expense-report-shell {
          max-width: 1200px;
          margin: 0 auto;
          background: #f8fafc;
          min-height: 760px;
          box-shadow: 0 0 16px rgba(0,0,0,.08);
          border-left: 1px solid #dde2ea;
          border-right: 1px solid #dde2ea;
          padding: 16px 24px 32px;
        }
        .expense-report-topbar {
          display: flex;
          align-items: center;
          gap: 12px;
          min-height: 56px;
          flex-wrap: wrap;
        }
        .report-title {
          font-size: 22px;
          font-weight: 700;
          color: #304254;
          margin: 0;
        }
        .date-range-row {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        .control-box {
          height: 36px;
          border: 1px solid #ccd4dc;
          border-radius: 6px;
          background: #fff;
          display: flex;
          align-items: center;
          padding: 0 12px;
          color: #63748d;
          font-weight: 700;
          min-width: 160px;
        }
        .control-box select,
        .control-box input {
          border: none;
          background: transparent;
          outline: none;
          width: 100%;
          color: #304254;
          font-weight: 700;
        }
        .between-label {
          color: #66768a;
          font-weight: 700;
          margin: 0 8px;
        }
        .report-actions {
          display: flex;
          align-items: center;
          gap: 18px;
          margin-left: auto;
          flex-wrap: wrap;
        }
        .graph-action,
        .excel-action,
        .print-action {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #40536b;
          font-weight: 700;
          font-size: 14px;
          cursor: pointer;
          background: transparent;
          border: none;
        }
        .graph-action svg,
        .excel-action svg,
        .print-action svg { width: 17px; height: 17px; }
        .heading-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 16px;
        }
        .heading-row h2 {
          font-size: 22px;
          font-weight: 800;
          margin: 0;
          color: #344258;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
.add-expense-button {
          background: linear-gradient(135deg, #e72a48, #d82727);
          color: #fff;
          border: none;
          border-radius: 28px;
          padding: 11px 22px;
          font-weight: 800;
          font-size: 14px;
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          box-shadow: 0 3px 10px rgba(210,39,39,.25);
        }
        .search-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 12px;
        }
        .search-box {
          width: 320px;
          height: 40px;
          background: #fff;
          display: flex;
          align-items: center;
          border: 1px solid #ccd6df;
          border-radius: 5px;
          padding: 0 10px;
          gap: 8px;
        }
        .search-box input {
          border: none;
          background: transparent;
          outline: none;
          width: 100%;
          color: #304254;
        }
        .trans-table-wrap {
          width: 100%;
          border: 1px solid #b9c3d2;
          border-radius: 4px;
          background: #fff;
          margin-top: 12px;
          overflow-x: auto;
          box-shadow: 0 1px 2px rgba(0,0,0,.04);
        }
        .expense-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
        }
        .expense-table th {
          background: #eef2f8;
          border-bottom: 1px solid #aebbd1;
          color: #526174;
          font-size: 12px;
          font-weight: 800;
          text-transform: uppercase;
          height: 44px;
          text-align: left;
          padding: 0 12px;
          white-space: nowrap;
        }
        .expense-table td {
          height: 50px;
          padding: 12px 14px;
          border-bottom: 1px solid #dde4ec;
          color: #304254;
          font-size: 13px;
          background: #fdfefe;
          vertical-align: middle;
        }
        .expense-table tbody tr:nth-child(even) td {
          background: #eef6f8;
        }
        .expense-table tbody tr:hover td {
          background: #eaf7f9;
        }
        .expense-table th:nth-child(1), .expense-table td:nth-child(1) { width: 11%; }
        .expense-table th:nth-child(2), .expense-table td:nth-child(2) { width: 9%; }
        .expense-table th:nth-child(3), .expense-table td:nth-child(3) { width: 11%; }
        .expense-table th:nth-child(4), .expense-table td:nth-child(4) { width: 14%; }
        .expense-table th:nth-child(5), .expense-table td:nth-child(5) { width: 12%; }
        .expense-table th:nth-child(6), .expense-table td:nth-child(6) { width: 11%; text-align: right; }
        .expense-table th:nth-child(7), .expense-table td:nth-child(7) { width: 11%; text-align: right; }
        .expense-table th:nth-child(8), .expense-table td:nth-child(8) { width: 7%; text-align: center; }
        .money-align { text-align: right !important; }
        .row-menu {
          position: relative;
        }
        .row-menu-button {
          border: none;
          background: transparent;
          cursor: pointer;
          color: #526174;
          padding: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .no-data {
          padding: 50px 20px;
          text-align: center;
          color: #65748b;
          font-size: 18px;
          font-weight: 700;
        }
        .loading { padding: 50px; text-align: center; color: #65748b; }
        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(15,23,42,.45);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        .preview-modal {
          width: min(980px, calc(100vw - 30px));
          background: #fff;
          border-radius: 12px;
          border: 1px solid #cbd5e1;
          padding: 18px;
          box-shadow: 0 16px 40px rgba(0,0,0,.28);
        }
        .preview-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }
        .preview-head h3 { margin: 0; font-size: 18px; }
        .preview-content {
          max-height: 70vh;
          overflow: auto;
          background: #f8fafc;
          padding: 12px;
          border-radius: 8px;
          border: 1px solid #dde4ec;
        }
        .preview-content table { width: 100%; border-collapse: collapse; }
        .preview-content th, .preview-content td { padding: 8px; border: 1px solid #cbd5e1; }
        @media (max-width: 760px) {
          .expense-report-shell { padding: 12px; }
          .report-actions { margin-left: 0; }
          .search-box { width: 100%; }
          .expense-table { min-width: 760px; }
        }
        @media print {
          body * { visibility: hidden; }
          #expense-report-print-area,
          #expense-report-print-area * { visibility: visible; }
          #expense-report-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 16px;
          }
          .expense-report-no-print { display: none !important; }
        }
        @keyframes er-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      <div className="expense-report-shell">
        <div className="expense-report-topbar expense-report-no-print">
          <div className="report-title">This Month</div>
          <div className="date-range-row">
            <div className="control-box">
              <select value={period} onChange={(e) => handlePeriodChange(e.target.value)}>
                <option>This Month</option>
                <option>Between</option>
              </select>
            </div>

            <span className="between-label">Between</span>
            <div className="control-box">
              <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <span className="between-label">To</span>
            <div className="control-box">
              <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>

            <div className="control-box" style={{ minWidth: 160 }}>
              <select value={selectedFirm} onChange={(e) => setSelectedFirm(e.target.value)}>
                <option value="all">ALL FIRMS</option>
                {companies.map((company) => (
                  <option key={company.id} value={company.id}>{company.company_name || company.name || `Firm ${company.id}`}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="report-actions">
            <button className="graph-action" onClick={() => setShowGraph(true)}>
              <BarChart3 /> <span>Graph</span>
            </button>
            <button className="excel-action" onClick={handleDownloadExcel}>
              <FileSpreadsheet /> <span>Excel Report</span>
            </button>
            <button className="print-action" onClick={handlePrintReport}>
              <Printer /> <span>Print</span>
            </button>
          </div>
        </div>

        <div id="expense-report-print-area">
          <div className="heading-row">
            <h2>Transactions</h2>
            <button className="add-expense-button expense-report-no-print" onClick={() => navigate("/purchases/expenses/add")}>
              <Plus size={16} /> Add Expense
            </button>
          </div>

          <div className="search-row expense-report-no-print">
            <div className="search-box">
              <Search size={16} />
              <input placeholder="Search" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </div>

          {loading ? (
            <div className="loading">Loading expenses...</div>
          ) : error ? (
            <div className="no-data">{error}</div>
          ) : filteredExpenses.length === 0 ? (
            <div className="no-data">No transactions found</div>
          ) : (
            <div className="trans-table-wrap">
              <table className="expense-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Exp. No.</th>
                    <th>Party</th>
                    <th>Category Name</th>
                    <th>Payment Type</th>
                    <th>Amount</th>
                    <th>Balance Due</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExpenses.map((expense) => (
                    <tr key={expense.id}>
                      <td>{formatINDate(expense.expense_date)}</td>
                      <td>{expense.expense_no || expense.id}</td>
                      <td>{expense.party_name || "-"}</td>
                      <td title={expense.category_name || "-"}>{expense.category_name || "-"}</td>
                      <td>{expense.payment_type || "Cash"}</td>
                      <td className="money-align">{money(expense.total_amount || 0)}</td>
                      <td className="money-align">{money(expense.balance_amount || 0)}</td>
                      <td className="row-menu">
                        <button
                          className="row-menu-button"
                          title="More actions"
                          onClick={(e) => toggleActionMenu(e, expense)}
                        >
                          <MoreHorizontal size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
{/* ── 3-DOT ACTIONS DROPDOWN (fixed, never clipped by the table scroll) ── */}
      {actionMenu && actionMenuExpense && (
        <>
          {/* Click-outside to close */}
          <div
            onClick={() => setActionMenu(null)}
            style={{ position: "fixed", inset: 0, zIndex: 55 }}
          />
          <div
            className="row-menu"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "fixed",
              left: actionMenu.x,
              top: actionMenu.y,
              zIndex: 60,
              width: ACTION_MENU_WIDTH,
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "10px",
              boxShadow: "0 8px 24px rgba(15,23,42,0.14)",
              padding: "6px",
            }}
          >
            {/* VIEW / EDIT */}
            <div
              onClick={() => handleViewEdit(actionMenuExpense)}
              style={{ ...menuItemStyle, color: "#334155" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f5f9")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <Pencil size={15} style={{ color: "#2563eb" }} />
              View / Edit
            </div>

            {/* DELETE */}
            <div
              onClick={() => confirmDelete(actionMenuExpense)}
              style={{ ...menuItemStyle, color: "#e11d48" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f5f9")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <Trash2 size={15} style={{ color: "#e11d48" }} />
              Delete
            </div>

            {/* DUPLICATE */}
            <div
              onClick={() => duplicateExpenseRow(actionMenuExpense)}
              style={{ ...menuItemStyle, color: "#334155" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f5f9")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <Copy size={15} style={{ color: "#64748b" }} />
              Duplicate
            </div>

            {/* OPEN PDF */}
            <div
              onClick={() => openExpensePdf(actionMenuExpense)}
              style={{ ...menuItemStyle, color: "#334155" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f5f9")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <FileText size={15} style={{ color: "#2563eb" }} />
              Open PDF
            </div>

            {/* PREVIEW */}
            <div
              onClick={() => openPreview(actionMenuExpense)}
              style={{ ...menuItemStyle, color: "#334155" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f5f9")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <Eye size={15} style={{ color: "#0891b2" }} />
              Preview
            </div>

            {/* PRINT */}
            <div
              onClick={() => printExpenseRow(actionMenuExpense)}
              style={{ ...menuItemStyle, color: "#334155" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f5f9")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <Printer size={15} style={{ color: "#64748b" }} />
              Print
            </div>

            {/* VIEW HISTORY */}
            <div
              onClick={() => openHistory(actionMenuExpense)}
              style={{ ...menuItemStyle, color: "#334155" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#f1f5f9")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
            >
              <History size={15} style={{ color: "#64748b" }} />
              View History
            </div>
          </div>
        </>
      )}
{/* ── DELETE CONFIRMATION MODAL ── */}
      {deleteTarget && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "rgba(15,23,42,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
        >
          <div
            className="expense-report-no-print"
            style={{
              width: "min(92vw, 460px)",
              background: "#fff",
              borderRadius: "14px",
              overflow: "hidden",
              boxShadow: "0 20px 50px rgba(15,23,42,0.25)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "15px 18px",
                borderBottom: "1px solid #e2e8f0",
              }}
            >
              <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "#17243a" }}>
                Delete Expense
              </h3>
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={!!deletingId}
                style={{ border: "none", background: "transparent", color: "#64748b", cursor: "pointer" }}
              >
                <X size={18} />
              </button>
            </div>

            <div
              style={{
                padding: "22px 20px",
                fontSize: "13.5px",
                color: "#475569",
                lineHeight: "1.55",
              }}
            >
              Are you sure you want to delete{" "}
              <strong>{deleteTarget.expense_no || `#${deleteTarget.id}`}</strong>?
              <div style={{ marginTop: "6px", fontSize: "12.5px", color: "#94a3b8" }}>
                The expense voucher record will be permanently removed.
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "9px",
                padding: "0 20px 20px",
              }}
            >
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={!!deletingId}
                style={{
                  border: "none",
                  borderRadius: "8px",
                  padding: "9px 16px",
                  background: "#f1f5f9",
                  color: "#475569",
                  fontSize: "13px",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={performDelete}
                disabled={!!deletingId}
                style={{
                  border: "none",
                  borderRadius: "8px",
                  padding: "9px 16px",
                  background: "#e11d48",
                  color: "#fff",
                  fontSize: "13px",
                  fontWeight: "600",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  opacity: deletingId ? 0.6 : 1,
                }}
              >
                {deletingId && (
                  <Loader2 size={14} style={{ animation: "er-spin 1s linear infinite" }} />
                )}
                {deletingId ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
{/* ── PREVIEW MODAL (real expense document) ── */}
      {(previewLoading || previewDetail || previewError) && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 110,
            background: "rgba(15,23,42,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
        >
          <div
            className="expense-report-no-print"
            style={{
              width: "min(94vw, 960px)",
              maxHeight: "90vh",
              background: "#fff",
              borderRadius: "14px",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 20px 50px rgba(15,23,42,0.25)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 18px",
                borderBottom: "1px solid #e2e8f0",
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "#17243a" }}>
                  Expense Preview
                </h3>
                <div style={{ marginTop: "2px", fontSize: "12px", color: "#64748b" }}>
                  {previewDetail
                    ? `${previewDetail.expense_no || `#${previewDetail.id}`} · ${previewDetail.party_name || "-"}`
                    : "\u00A0"}
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                {previewDetail && (
                  <button
                    onClick={() => printExpenseRow(previewDetail)}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      border: "none",
                      borderRadius: "8px",
                      padding: "8px 14px",
                      background: "#2563eb",
                      color: "#fff",
                      fontSize: "12.5px",
                      fontWeight: "600",
                      cursor: "pointer",
                    }}
                  >
                    <Printer size={14} />
                    Print
                  </button>
                )}
                <button
                  onClick={() => {
                    setPreviewDetail(null);
                    setPreviewError("");
                    setPreviewLoading(false);
                  }}
                  disabled={previewLoading}
                  style={{ border: "none", background: "transparent", color: "#64748b", cursor: "pointer" }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div style={{ overflow: "auto", padding: "20px", background: "#f1f5f9", flex: 1 }}>
              {previewLoading ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "10px",
                    padding: "60px 0",
                    color: "#64748b",
                    fontSize: "13.5px",
                    fontWeight: "600",
                  }}
                >
                  <Loader2 size={18} style={{ animation: "er-spin 1s linear infinite", color: "#2563eb" }} />
                  Loading expense…
                </div>
              ) : previewError ? (
                <div
                  style={{
                    padding: "60px 0",
                    textAlign: "center",
                    color: "#e11d48",
                    fontSize: "13.5px",
                    fontWeight: "600",
                  }}
                >
                  {previewError}
                </div>
              ) : (
                <div
                  id="preview-expense-document"
                  style={{
                    background: "#fff",
                    borderRadius: "6px",
                    border: "1px solid #e2e8f0",
                    overflow: "hidden",
                  }}
                >
                  <ExpenseDocument
                    expense={previewDetail}
                    company={companyFor(previewDetail)}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
{/* ── VIEW HISTORY MODAL (real expense record + timestamps) ── */}
      {historyExpense && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 120,
            background: "rgba(15,23,42,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
        >
          <div
            className="expense-report-no-print"
            style={{
              width: "min(92vw, 560px)",
              maxHeight: "88vh",
              background: "#fff",
              borderRadius: "14px",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 20px 50px rgba(15,23,42,0.25)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "15px 18px",
                borderBottom: "1px solid #e2e8f0",
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "700", color: "#17243a" }}>
                  Expense History
                </h3>
                <div style={{ marginTop: "2px", fontSize: "12px", color: "#64748b" }}>
                  {historyExpense.expense_no || `#${historyExpense.id}`} ·{" "}
                  {historyExpense.party_name || "-"}
                </div>
              </div>

              <button
                onClick={() => setHistoryExpense(null)}
                style={{ border: "none", background: "transparent", color: "#64748b", cursor: "pointer" }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ overflow: "auto", flex: 1 }}>
              {historyLoading ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "10px",
                    padding: "50px 0",
                    color: "#64748b",
                    fontSize: "13.5px",
                    fontWeight: "600",
                  }}
                >
                  <Loader2 size={18} style={{ animation: "er-spin 1s linear infinite", color: "#2563eb" }} />
                  Loading expense history…
                </div>
              ) : historyError ? (
                <div
                  style={{
                    padding: "40px 20px",
                    textAlign: "center",
                    color: "#e11d48",
                    fontSize: "13.5px",
                    fontWeight: "600",
                  }}
                >
                  {historyError}
                </div>
              ) : historyRecord ? (
                <div style={{ padding: "8px 18px" }}>
                  <div
                    style={{
                      padding: "9px 14px",
                      fontSize: "12px",
                      fontStyle: "normal",
                      color: "#94a3b8",
                      background: "#f1f5f9",
                      borderRadius: "8px",
                    }}
                  >
                    Record timeline built from the actual expense record
                    returned by the expense detail API for this voucher.
                  </div>

                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", marginTop: "10px" }}>
                    <tbody>
                      {[
                        ["Expense #", historyRecord.expense_no || `#${historyRecord.id}`],
                        ["Date", formatINDate(historyRecord.expense_date)],
                        ["Party", historyRecord.party_name || "-"],
                        ["Category", historyRecord.category_name || "-"],
                        ["Payment Type", historyRecord.payment_type || "Cash"],
                        ["Total Amount", money(historyRecord.total_amount || 0)],
                        ["Paid", money(historyRecord.paid_amount || 0)],
                        ["Balance", money(historyRecord.balance_amount || 0)],
                        ["Created At", historyRecord.created_at
                          ? new Date(historyRecord.created_at).toLocaleString("en-IN")
                          : "-"],
                        ["Last Updated", historyRecord.updated_at
                          ? new Date(historyRecord.updated_at).toLocaleString("en-IN")
                          : "-"],
                      ].map(([k, v], i) => (
                        <tr
                          key={k}
                          style={{ borderBottom: "1px solid #eef2f6", background: i % 2 === 0 ? "#ffffff" : "#f8fafc" }}
                        >
                          <td style={{ padding: "9px 12px", color: "#64748b", fontWeight: "600", width: "42%" }}>
                            {k}
                          </td>
                          <td style={{ padding: "9px 12px", color: "#334155", fontWeight: "600" }}>
                            {v}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div style={{ padding: "50px 20px", textAlign: "center", color: "#94a3b8", fontSize: "13px", fontWeight: "600" }}>
                  No history recorded for this expense yet
                </div>
              )}
            </div>
          </div>
        </div>
      )}
{/* ── EXPENSE GRAPH MODAL ── */}
      {showGraph && (
        <div className="modal-backdrop">
          <div className="preview-modal">
            <div className="preview-head">
              <h3>Expense Graph</h3>
              <button className="row-menu-button" onClick={() => setShowGraph(false)}><X /></button>
            </div>
            <div className="preview-content">
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, minHeight: 190 }}>
                {graphData.length === 0 ? <div>No data</div> : graphData.map((row) => {
                  const barHeight = Math.max(10, Math.min(180, Number(row.amount || 0) / Math.max(...graphData.map((r) => Number(r.amount || 0)), 1) * 180));
                  return (
                    <div key={row.month} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: '50px', height: `${barHeight}px`, background: '#4f8bf9', borderRadius: '4px 4px 0 0', display: 'flex', alignItems: 'end' }}>{}</div>
                      <span style={{ fontSize: 11, color: '#40536b' }}>{row.month}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          OFF-SCREEN EXPENSE DOCUMENT used by Open PDF / Print
          (kept off the painted viewport with negative z-index,
           exactly like the proven Purchase.jsx implementation —
           never display:none / visibility:hidden so html2canvas
           can still rasterise it)
      ===================================================== */}
      {docAction && (
        <div
          aria-hidden
          style={{
            position: "fixed",
            top: 0,
            left: "-10000px",
            width: 794,
            background: "#fff",
            zIndex: -1,
          }}
        >
          <div
            id="row-action-expense"
            style={{
              background: "#fff",
              width: 794,
            }}
          >
            <ExpenseDocument
              expense={docAction.detail}
              company={companyFor(docAction.detail)}
            />
          </div>
        </div>
      )}

      {/* =====================================================
          DOC ACTION BUSY TOAST
      ===================================================== */}
      {docBusyText && (
        <div
          className="expense-report-no-print"
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            zIndex: 200,
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "#fff",
            border: "1.5px solid #bfdbfe",
            borderRadius: 14,
            padding: "12px 18px",
            boxShadow: "0 12px 30px rgba(15,23,42,0.18)",
            fontSize: 12.5,
            fontWeight: 600,
          }}
        >
          <Loader2 size={17} color="#2563eb" style={{ animation: "er-spin 1s linear infinite" }} />
          <span style={{ color: "#334155" }}>{docBusyText}</span>
        </div>
      )}
    </div>
  );
}