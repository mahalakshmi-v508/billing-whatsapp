import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import api from "../../../services/api";
import * as XLSX from "xlsx";
import {
  buildExpenseDocumentHTML,
  expensePdfBase64,
  expensePdfBlob,
  expensePdfFilename,
  fetchCompanyById,
  getCurrencySymbol,
  parseRowItems,
  printExpenseHTML,
  renderExpensePdf,
} from "../../../utils/expenseDocument";
import {
  BarChart3,
  ChevronDown,
  Copy,
  Eye,
  FileSpreadsheet,
  FileText,
  Filter,
  History,
  Mail,
  MoreVertical,
  Pencil,
  Printer,
  Search,
  Trash2,
  X,
} from "lucide-react";

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

/* Columns that support inline header filtering (client-side, on already-loaded rows). */
const FILTER_COLUMNS = [
  { key: "PARTY", label: "Party", field: "party_name" },
  { key: "CATEGORY NAME", label: "Category Name", field: "category_name" },
  { key: "PAYMENT TYPE", label: "Payment Type", field: "payment_type" },
];

const fmtINR = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

const fmtDate = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

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

  const [periodMenuPosition, setPeriodMenuPosition] = useState(null);
  const [activeTxnMenuId, setActiveTxnMenuId] = useState(null);
  const [actionMenuAnchor, setActionMenuAnchor] = useState(null);
  const [actionMenuPos, setActionMenuPos] = useState(null);
  const actionMenuRef = useRef(null);

  const [activeFilterCol, setActiveFilterCol] = useState("");
  const [filterAnchor, setFilterAnchor] = useState(null);
  const [filterPos, setFilterPos] = useState(null);
  const filterRef = useRef(null);
  const [colFilters, setColFilters] = useState({ PARTY: "", "CATEGORY NAME": "", "PAYMENT TYPE": "" });

  const [previewExpense, setPreviewExpense] = useState(null);
  const [previewContext, setPreviewContext] = useState(null);
  const [previewHtml, setPreviewHtml] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");
  const [docBusy, setDocBusy] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const [sharePhone, setSharePhone] = useState("");
  const [shareBusy, setShareBusy] = useState(false);
  const [shareMessage, setShareMessage] = useState("");
  const [historyExpense, setHistoryExpense] = useState(null);
  const [duplicating, setDuplicating] = useState(false);
  const [notice, setNotice] = useState("");
  const noticeTimer = useRef(null);

  const showNotice = (msg) => {
    setNotice(msg);
    clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setNotice(""), 2600);
  };

  const closeAllMenus = () => {
    setPeriodMenuPosition(null);
    setActiveTxnMenuId(null);
    setActionMenuAnchor(null);
    setActionMenuPos(null);
    setActiveFilterCol("");
    setFilterAnchor(null);
    setFilterPos(null);
  };

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

  useEffect(() => {
    const closeOnOutside = (event) => {
      if (!event.target.closest("[data-expense-menu-container]")) closeAllMenus();
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") closeAllMenus();
    };

    document.addEventListener("mousedown", closeOnOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  /* Measure popovers after mount so they always stay inside the viewport. */
  useLayoutEffect(() => {
    if (actionMenuRef.current && actionMenuAnchor) {
      const { width, height } = actionMenuRef.current.getBoundingClientRect();
      setActionMenuPos(placePopover(actionMenuAnchor, width, height, "right"));
    }
    if (filterRef.current && filterAnchor) {
      const { width, height } = filterRef.current.getBoundingClientRect();
      setFilterPos(placePopover(filterAnchor, width, height, "left"));
    }
  }, [actionMenuAnchor, activeTxnMenuId, filterAnchor, activeFilterCol]);

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

  const toggleActionMenu = (event, rowId) => {
    event.stopPropagation();
    if (activeTxnMenuId === rowId) {
      closeAllMenus();
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    setActiveFilterCol("");
    setFilterAnchor(null);
    setPeriodMenuPosition(null);
    setActionMenuAnchor({ top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right, width: rect.width });
    setActionMenuPos(null);
    setActiveTxnMenuId(rowId);
  };

  const toggleFilterMenu = (event, col) => {
    event.stopPropagation();
    if (activeFilterCol === col) {
      setActiveFilterCol("");
      setFilterAnchor(null);
      setFilterPos(null);
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    closeAllMenus();
    setFilterAnchor({ top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right, width: rect.width });
    setFilterPos(null);
    setActiveFilterCol(col);
  };

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

  const displayedExpenses = useMemo(() => {
    const active = FILTER_COLUMNS.filter((c) => (colFilters[c.key] || "").trim());
    if (active.length === 0) return filteredExpenses;

    return filteredExpenses.filter((row) =>
      active.every((c) => {
        const cell = String(row[c.field] || "");
        return cell.toLowerCase().includes((colFilters[c.key] || "").trim().toLowerCase());
      })
    );
  }, [filteredExpenses, colFilters]);

  const handleExportExcel = () => {
    if (!displayedExpenses.length) {
      alert("No expense data available to export.");
      return;
    }

    const rows = displayedExpenses.map((item, idx) => ({
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

  const handleDuplicate = async (row) => {
    if (!window.confirm(`Duplicate expense ${row.expense_no || row.id}? A new expense voucher will be created.`)) return;
    setDuplicating(true);
    try {
      const payload = {
        admin_id: adminId || 0,
        company_id: row.company_id || companyId || 0,
        expense_date: row.expense_date,
        category_id: row.category_id || 0,
        category_name: row.category_name || "",
        party_name: row.party_name || "",
        party_phone: row.party_phone || "",
        is_gst: row.is_gst ? true : false,
        items: parseRowItems(row.items),
        sub_total: Number(row.sub_total || 0),
        tax_total: Number(row.tax_total || 0),
        discount_total: Number(row.discount_total || 0),
        round_off: Number(row.round_off || 0),
        total_amount: Number(row.total_amount || 0),
        paid_amount: Number(row.paid_amount || 0),
        balance_amount: Number(row.balance_amount || 0),
        payment_type: row.payment_type || "Cash",
        description: row.description || "",
      };
      const res = await api.post("/expense/create", payload);
      if (res.data && res.data.status !== false) {
        showNotice("Expense duplicated successfully.");
        fetchExpenses();
      } else {
        alert(res.data?.message || "Unable to duplicate expense.");
      }
    } catch (err) {
      console.error(err);
      alert("Unable to duplicate expense.");
    } finally {
      setDuplicating(false);
      closeAllMenus();
    }
  };

  const handleOpenPdf = async (row) => {
    setDocBusy("open");
    try {
      const ctx = await resolveExpenseContext(row);
      await openPdfInTab(ctx);
    } catch (err) {
      console.error(err);
      alert("Unable to generate the expense PDF.");
    } finally {
      setDocBusy("");
      closeAllMenus();
    }
  };

  const handlePrintRow = async (row) => {
    try {
      const ctx = await resolveExpenseContext(row);
      printExpenseHTML(`Expense ${ctx.expense.expense_no || ctx.expense.id}`, buildExpenseDocumentHTML(ctx));
    } catch (err) {
      console.error(err);
      alert("Unable to print the expense document.");
    } finally {
      closeAllMenus();
    }
  };

  const openPreview = async (row) => {
    setPreviewExpense(row);
    setPreviewContext(null);
    setPreviewHtml(null);
    setPreviewError("");
    setPreviewLoading(true);
    try {
      const ctx = await resolveExpenseContext(row);
      setPreviewContext(ctx);
      setPreviewHtml(buildExpenseDocumentHTML(ctx));
    } catch (err) {
      console.error(err);
      setPreviewError("Unable to load the expense preview. Please try again.");
    } finally {
      setPreviewLoading(false);
      closeAllMenus();
    }
  };

  const closePreview = () => {
    setPreviewExpense(null);
    setPreviewContext(null);
    setPreviewHtml(null);
    setPreviewError("");
  };

  const openHistory = (row) => {
    setHistoryExpense(row);
    closeAllMenus();
  };

  /* Resolve the full, real-data context (expense detail + company + currency symbol)
     that every document action (Open PDF / Preview / Print / Save / Email) uses,
     so all of them read the same selected expense record. */
  const resolveCompanyFor = async (id) => {
    if (!id) return null;
    const fromList = companies.find((c) => Number(c.id) === Number(id));
    if (fromList) return fromList;
    return fetchCompanyById(id);
  };

  const resolveExpenseContext = async (row) => {
    const cid = Number(row?.company_id || companyId || 0);
    const [detailRes, currency] = await Promise.all([
      api.get("/expense/get_by_id", { params: { id: row?.id } }).catch(() => null),
      getCurrencySymbol(cid),
    ]);
    const expense = detailRes?.data?.data || row;
    const company = await resolveCompanyFor(Number(expense?.company_id || cid));
    return { expense, company, currency };
  };

  /* Render the selected expense document to a PDF and open it in a new browser tab.
     A placeholder tab is opened synchronously (inside the click gesture) so pop-up
     blockers cannot swallow it, then it navigates to the generated PDF blob. */
  const openPdfInTab = async (ctx) => {
    const label = ctx.expense.expense_no || ctx.expense.id || "";
    const tab = window.open("", "_blank");
    if (!tab) {
      alert("Please allow pop-ups for this site so the expense PDF can open in a new tab.");
      return;
    }
    tab.document.open();
    tab.document.write(
      `<!DOCTYPE html><html><head><title>Expense ${String(label).replace(/[<>&"]/g, "")}</title></head>` +
        `<body style="margin:0;font-family:Arial,sans-serif;background:#f1f5f9;display:flex;align-items:center;justify-content:center;height:100vh;color:#475569;font-size:15px;">` +
        `Generating expense PDF&hellip;</body></html>`
    );
    tab.document.close();
    try {
      const doc = await renderExpensePdf(ctx);
      const blob = expensePdfBlob(doc);
      const blobUrl = URL.createObjectURL(blob);
      tab.location.href = blobUrl;
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    } catch (err) {
      console.error(err);
      tab.document.open();
      tab.document.write(
        `<!DOCTYPE html><html><head><title>Error</title></head>` +
          `<body style="margin:0;font-family:Arial,sans-serif;background:#f1f5f9;display:flex;align-items:center;justify-content:center;height:100vh;color:#991b1b;font-size:15px;text-align:center;padding:24px;">` +
          `Unable to generate the expense PDF.<br/>Please close this tab and try again.</body></html>`
      );
      tab.document.close();
    }
  };

  /* ─── Preview footer actions (reuse the already-loaded context) ─── */
  const openPreviewPdf = async () => {
    if (!previewContext || docBusy) return;
    setDocBusy("open");
    try {
      await openPdfInTab(previewContext);
    } catch (err) {
      console.error(err);
      alert("Unable to generate the expense PDF.");
    } finally {
      setDocBusy("");
    }
  };

  const savePreviewPdf = async () => {
    if (!previewContext || docBusy) return;
    setDocBusy("save");
    try {
      const doc = await renderExpensePdf(previewContext);
      doc.save(expensePdfFilename(previewContext.expense));
    } catch (err) {
      console.error(err);
      alert("Unable to save the expense PDF.");
    } finally {
      setDocBusy("");
    }
  };

  const printPreviewPdf = () => {
    if (!previewContext) return;
    printExpenseHTML(`Expense ${previewContext.expense.expense_no || previewContext.expense.id}`, buildExpenseDocumentHTML(previewContext));
  };

  /* ─── Email / Share PDF (uses the app's existing WhatsApp file-send sharing) ─── */
  const openSharePdf = () => {
    if (!previewContext) return;
    setSharePhone(previewContext.expense?.party_phone || "");
    setShareMessage("");
    setShareOpen(true);
  };

  const closeSharePdf = () => {
    setShareOpen(false);
    setShareMessage("");
  };

  const sendSharedPdf = async () => {
    const phone = (sharePhone || "").trim();
    if (!phone) {
      alert("Please enter the recipient phone number.");
      return;
    }
    if (!previewContext) return;
    setShareBusy(true);
    setShareMessage("");
    try {
      const ctx = previewContext;
      const fileBase64 = await expensePdfBase64(ctx);
      const res = await api.post("/whatsapp/send_file", {
        company_id: ctx.expense?.company_id || companyId || 0,
        phone,
        file_base64: fileBase64,
        mimetype: "application/pdf",
        filename: expensePdfFilename(ctx.expense),
        caption: `Expense ${ctx.expense?.expense_no || ctx.expense?.id || ""}`,
      });
      if (res.data?.status) {
        setShareMessage("Expense PDF sent successfully.");
      } else {
        alert(res.data?.message || "Unable to send the expense PDF.");
      }
    } catch (err) {
      console.error(err);
      alert("Unable to send the expense PDF.");
    } finally {
      setShareBusy(false);
    }
  };

  /* Lock page scroll while a modal is open and close it with the Escape key. */
  useEffect(() => {
    if (!previewExpense && !shareOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onEscape = (event) => {
      if (event.key !== "Escape") return;
      if (shareOpen) {
        setShareOpen(false);
        setShareMessage("");
      } else if (previewExpense) {
        setPreviewExpense(null);
        setPreviewContext(null);
        setPreviewHtml(null);
        setPreviewError("");
      }
    };
    document.addEventListener("keydown", onEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onEscape);
    };
  }, [previewExpense, shareOpen]);

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
          min-height: 58px;
          padding: 9px 16px;
          background: #fff;
          border-bottom: 1px solid #e8edf3;
          gap: 20px;
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
          font-size: 14px;
          font-weight: 700;
          color: #1e293b;
          background: #f1f5f9;
          border-radius: 6px;
          padding: 7px 12px;
          height: 36px;
          box-shadow: inset 0 0 0 1px rgba(15,23,42,0.04);
          border: 1px solid #d8e0ea;
          cursor: pointer;
          position: relative;
          font-family: inherit;
        }

        .expense-filter-title:hover {
          background: #e9eef4;
        }

        .expense-period-menu,
        .expense-action-menu,
        .expense-filter-pop {
          position: fixed;
          z-index: 10000;
          background: #fff;
          border: 1px solid #d8e0ea;
          border-radius: 8px;
          box-shadow: 0 10px 26px rgba(15, 23, 42, 0.16);
          overflow: hidden;
        }

        .expense-period-menu {
          min-width: 150px;
          padding: 4px;
        }

        .expense-period-menu button {
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

        .expense-period-menu button:hover {
          background: #f1f5f9;
        }

        .expense-filter-label {
          font-size: 13px;
          font-weight: 600;
          color: #64748b;
          white-space: nowrap;
          min-width: fit-content;
          line-height: 1;
        }

        .expense-date-input,
        .expense-company-select {
          width: 145px;
          height: 36px;
          padding: 6px 10px;
          font-size: 13px;
          line-height: 1.2;
          border-radius: 6px;
          border: 1px solid #d8e0ea;
          background: #fff;
          color: #475569;
          outline: none;
          box-shadow: none;
        }

        .expense-company-select {
          width: 150px;
          cursor: pointer;
        }

        .expense-actions {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: nowrap;
          flex-shrink: 0;
          justify-content: flex-end;
        }

        .expense-action {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 3px;
          border: none;
          background: transparent;
          color: #475569;
          font-size: 11px;
          font-weight: 700;
          padding: 5px 8px;
          min-width: 54px;
          cursor: pointer;
          white-space: nowrap;
          height: 42px;
        }

        .expense-action svg {
          width: 19px;
          height: 19px;
          color: #475569;
        }

        .expense-action:hover {
          color: #1e293b;
          background: #f1f5f9;
          border-radius: 8px;
        }

        .expense-content {
          padding: 14px 16px 16px;
        }

        .expense-transactions-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 0 0 10px;
        }

        .expense-transactions-title {
          font-size: 13px;
          font-weight: 800;
          color: #1e293b;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .expense-transactions-count {
          color: #94a3b8;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.02em;
          text-transform: uppercase;
        }

        .expense-transactions-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding: 0 0 12px;
        }

        .expense-search-wrap {
          position: relative;
          width: 280px;
          max-width: 100%;
        }

        .expense-search-wrap > svg {
          position: absolute;
          left: 10px;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
          width: 15px;
          height: 15px;
          pointer-events: none;
        }

        .expense-search {
          width: 100%;
          height: 36px;
          padding: 7px 12px 7px 32px;
          border: 1px solid #d8e0ea;
          border-radius: 6px;
          background: #fff;
          color: #334155;
          font-size: 13px;
          outline: none;
        }

        .expense-search:focus {
          border-color: #c3cdd9;
          box-shadow: 0 0 0 2px rgba(15, 23, 42, 0.06);
        }

        .expense-add-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          height: 34px;
          padding: 0 14px;
          background: linear-gradient(135deg, #ee3444 0%, #cc1f2c 100%);
          color: #fff;
          font-size: 12.5px;
          font-weight: 800;
          border-radius: 6px;
          border: none;
          cursor: pointer;
          box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          white-space: nowrap;
          font-family: inherit;
        }

        .expense-add-button:hover {
          background: linear-gradient(135deg, #d72734 0%, #b91c28 100%);
        }

        .expense-add-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .expense-table-scroll {
          width: 100%;
          overflow-x: auto;
          border: 1px solid #e8edf3;
          border-radius: 8px;
          background: #fff;
        }

        .expense-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          min-width: 860px;
        }

        .expense-table thead th {
          height: 34px;
          padding: 7px 12px;
          border-bottom: 1px solid #e8edf3;
          color: #64748b;
          background: #f8fafc;
          font-size: 10.5px;
          font-weight: 800;
          line-height: 1.1;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          vertical-align: middle;
          white-space: nowrap;
        }

        .expense-table thead th.is-left { text-align: left; }
        .expense-table thead th.is-center { text-align: center; }
        .expense-table thead th.is-right { text-align: right; }

        .expense-th-inner {
          display: inline-flex;
          align-items: center;
          gap: 5px;
        }

        .expense-filter-btn {
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
        }

        .expense-filter-btn:hover {
          background: #e9eef4;
          color: #64748b;
        }

        .expense-filter-btn.is-active {
          color: #ee3444;
        }

        .expense-table tbody td {
          height: 38px;
          padding: 7px 12px;
          border-bottom: 1px solid #f1f5f9;
          background: #fff;
          color: #334155;
          font-size: 12.5px;
          line-height: 1.3;
          vertical-align: middle;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 220px;
        }

        .expense-table tbody td.is-left { text-align: left; }
        .expense-table tbody td.is-center { text-align: center; }
        .expense-table tbody td.is-right {
          text-align: right;
          font-variant-numeric: tabular-nums;
        }

        .expense-table tbody tr {
          background: #fff;
        }

        .expense-table tbody tr:hover td {
          background: #f8fafc;
        }

        .expense-table tbody tr:last-child td {
          border-bottom: none;
        }

        .expense-table tbody td.party-cell {
          font-weight: 600;
          color: #1e293b;
        }

        .expense-table tbody td.amount-cell,
        .expense-table tbody td.balance-cell {
          font-weight: 700;
          color: #1e293b;
        }

        .expense-table tbody td.balance-cell.has-balance {
          color: #dc2626;
        }

        .expense-table tbody td.exp-no-cell {
          font-weight: 600;
          color: #475569;
        }

        .expense-table tbody .actions-cell {
          padding: 4px 8px;
          text-align: center;
          width: 56px;
        }

        .expense-row-dot {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border: none;
          background: transparent;
          border-radius: 6px;
          color: #94a3b8;
          cursor: pointer;
          padding: 0;
        }

        .expense-row-dot:hover,
        .expense-row-dot.is-open {
          color: #334155;
          background: #eef2f7;
        }

        .expense-empty-cell {
          padding: 40px 12px !important;
          text-align: center !important;
          color: #94a3b8;
          font-size: 13px;
          font-weight: 600;
          max-width: none !important;
          overflow: visible !important;
          white-space: normal !important;
        }

        .expense-action-menu {
          min-width: 208px;
          padding: 5px;
        }

        .expense-action-menu-item {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 8px 11px;
          background: #fff;
          color: #334155;
          border: none;
          border-radius: 5px;
          font-size: 12.5px;
          font-weight: 600;
          text-align: left;
          cursor: pointer;
          font-family: inherit;
          white-space: nowrap;
        }

        .expense-action-menu-item svg {
          width: 14px;
          height: 14px;
          color: #64748b;
          flex-shrink: 0;
        }

        .expense-action-menu-item:hover {
          background: #f1f5f9;
          color: #111827;
        }

        .expense-action-menu-item.danger {
          color: #dc2626;
        }

        .expense-action-menu-item.danger svg {
          color: #dc2626;
        }

        .expense-action-menu-item.danger:hover {
          background: #fef2f2;
        }

        .expense-filter-pop {
          width: 216px;
          padding: 8px;
        }

        .expense-filter-input {
          width: 100%;
          height: 32px;
          padding: 6px 10px;
          font-size: 12.5px;
          border: 1px solid #d8e0ea;
          border-radius: 5px;
          background: #fff;
          color: #334155;
          outline: none;
        }

        .expense-filter-input:focus {
          border-color: #c3cdd9;
          box-shadow: 0 0 0 2px rgba(15, 23, 42, 0.06);
        }

        .expense-filter-pop-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
          margin-top: 8px;
        }

        .expense-filter-pop-actions button {
          border: none;
          background: transparent;
          font-size: 12px;
          font-weight: 700;
          color: #64748b;
          cursor: pointer;
          padding: 3px 6px;
          border-radius: 4px;
        }

        .expense-filter-pop-actions button:hover {
          background: #f1f5f9;
          color: #111827;
        }

        .expense-modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 100000;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(15, 23, 42, 0.45);
          padding: 16px;
        }

        .expense-modal {
          background: #fff;
          border-radius: 10px;
          width: 100%;
          max-width: 560px;
          max-height: 82vh;
          overflow: auto;
          box-shadow: 0 18px 44px rgba(15, 23, 42, 0.22);
          border: 1px solid #e8edf3;
        }

        .expense-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 18px;
          border-bottom: 1px solid #eef2f7;
          position: sticky;
          top: 0;
          background: #fff;
        }

        .expense-modal-title {
          font-size: 14px;
          font-weight: 800;
          color: #1e293b;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        .expense-modal-close {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border: none;
          background: transparent;
          border-radius: 6px;
          color: #94a3b8;
          cursor: pointer;
        }

        .expense-modal-close:hover {
          background: #f1f5f9;
          color: #334155;
        }

        .expense-modal-body {
          padding: 16px 18px;
        }

        .expense-modal-wide {
          width: min(920px, 100%);
        }

        .expense-modal-sm {
          width: min(440px, 100%);
        }

        .expense-modal-sm .expense-modal-body {
          padding-bottom: 6px;
        }

        /* A4-like document sheet shown inside the Preview modal. */
        .expense-pdf-sheet {
          background: #ffffff;
          border: 1px solid #e8edf3;
          border-radius: 6px;
          box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08);
          padding: 26px 28px;
          min-height: 420px;
          overflow-x: auto;
        }

        .expense-pdf-sheet > div {
          min-width: 620px;
        }

        .expense-modal-footer {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          justify-content: flex-end;
          align-items: center;
          padding: 12px 18px;
          border-top: 1px solid #eef2f7;
          background: #fbfcfe;
          border-radius: 0 0 10px 10px;
          position: sticky;
          bottom: 0;
          z-index: 2;
        }

        .expense-btn-primary,
        .expense-btn-ghost {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border-radius: 6px;
          font-size: 12.5px;
          font-weight: 700;
          padding: 8px 14px;
          cursor: pointer;
          border: 1px solid transparent;
          transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
        }

        .expense-btn-primary {
          background: linear-gradient(135deg, #ee3444 0%, #cc1f2c 100%);
          color: #ffffff;
        }

        .expense-btn-primary:hover:not(:disabled) {
          filter: brightness(1.05);
        }

        .expense-btn-primary:disabled,
        .expense-btn-ghost:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }

        .expense-btn-ghost {
          background: #ffffff;
          border-color: #dbe2ec;
          color: #475569;
        }

        .expense-btn-ghost:hover:not(:disabled) {
          background: #f1f5f9;
          color: #111827;
        }

        .expense-btn-ghost.expense-btn-close {
          color: #64748b;
        }

        .expense-share-input {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid #dbe2ec;
          border-radius: 6px;
          padding: 9px 12px;
          font-size: 13px;
          color: #111827;
          outline: none;
        }

        .expense-share-input:focus {
          border-color: #ee3444;
          box-shadow: 0 0 0 3px rgba(238, 52, 68, 0.12);
        }

        .expense-detail-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px 20px;
          font-size: 12.5px;
        }

        .expense-detail-grid .field-label {
          font-size: 10.5px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: #94a3b8;
          margin-bottom: 2px;
        }

        .expense-detail-grid .field-value {
          font-weight: 600;
          color: #1e293b;
          word-break: break-word;
        }

        .expense-detail-grid .col-span-2 {
          grid-column: span 2;
        }

        .expense-preview-items {
          margin-top: 14px;
        }

        .expense-preview-items-title {
          font-size: 10.5px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: #94a3b8;
          margin-bottom: 8px;
        }

        .expense-preview-items table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }

        .expense-preview-items th,
        .expense-preview-items td {
          border: 1px solid #eef2f7;
          padding: 6px 8px;
          text-align: left;
        }

        .expense-preview-items td.num,
        .expense-preview-items th.num {
          text-align: right;
        }

        .expense-preview-items th {
          background: #f8fafc;
          font-size: 10.5px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: #64748b;
        }

        .expense-notice {
          position: fixed;
          left: 50%;
          bottom: 26px;
          transform: translateX(-50%);
          z-index: 100001;
          background: #1e293b;
          color: #fff;
          font-size: 12.5px;
          font-weight: 700;
          padding: 9px 16px;
          border-radius: 8px;
          box-shadow: 0 8px 22px rgba(15, 23, 42, 0.25);
          opacity: 0;
          transition: opacity 0.18s ease;
          pointer-events: none;
        }

        .expense-notice.is-visible {
          opacity: 1;
        }

        @media (max-width: 900px) {
          .expense-report-topbar {
            flex-wrap: wrap;
            gap: 12px;
          }
          .expense-filter-strip {
            flex-wrap: wrap;
          }
          .expense-actions {
            width: 100%;
            justify-content: flex-start;
          }
          .expense-transactions-toolbar {
            flex-wrap: wrap;
          }
          .expense-search-wrap {
            width: 100%;
          }
        }
      `}</style>

      <div className="expense-report-card">
        <div className="expense-report-topbar">
          <div className="expense-filter-strip">
            <button type="button" className="expense-filter-title" data-expense-menu-container onClick={togglePeriodMenu}>
              <span>{periodLabel(period)}</span>
              <ChevronDown size={14} style={{ color: "#64748b" }} />
            </button>

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

        {periodMenuPosition && createPortal(
          <div className="expense-period-menu" data-expense-menu-container style={periodMenuPosition}>
            {PERIOD_OPTIONS.map((option) => (
              <button key={option.value} type="button" onClick={() => handlePeriodChange(option.value)}>
                {option.label}
              </button>
            ))}
          </div>,
          document.body,
        )}

        <div className="expense-content">
          <div className="expense-transactions-head">
            <span className="expense-transactions-title">Transactions</span>
            <span className="expense-transactions-count">{displayedExpenses.length} records</span>
          </div>

          <div className="expense-transactions-toolbar">
            <div className="expense-search-wrap">
              <Search size={15} />
              <input value={search} placeholder="Search expense" onChange={(e) => setSearch(e.target.value)} className="expense-search" />
            </div>

            <button className="expense-add-button" onClick={() => navigate("/purchases/expenses/add")}>+ Add Expense</button>
          </div>

          <div className="expense-table-scroll">
            <table className="expense-table">
              <thead>
                <tr>
                  <th className="is-left">Date</th>
                  <th className="is-left">Exp. No.</th>
                  <th className="is-left">
                    <span className="expense-th-inner">
                      Party
                      <button
                        type="button"
                        className={`expense-filter-btn ${(colFilters.PARTY || "").trim() ? "is-active" : ""}`}
                        data-expense-menu-container
                        onClick={(e) => toggleFilterMenu(e, "PARTY")}
                        title="Filter party"
                      >
                        <Filter size={11} />
                      </button>
                    </span>
                  </th>
                  <th className="is-left">
                    <span className="expense-th-inner">
                      Category Name
                      <button
                        type="button"
                        className={`expense-filter-btn ${(colFilters["CATEGORY NAME"] || "").trim() ? "is-active" : ""}`}
                        data-expense-menu-container
                        onClick={(e) => toggleFilterMenu(e, "CATEGORY NAME")}
                        title="Filter category"
                      >
                        <Filter size={11} />
                      </button>
                    </span>
                  </th>
                  <th className="is-left">
                    <span className="expense-th-inner">
                      Payment Type
                      <button
                        type="button"
                        className={`expense-filter-btn ${(colFilters["PAYMENT TYPE"] || "").trim() ? "is-active" : ""}`}
                        data-expense-menu-container
                        onClick={(e) => toggleFilterMenu(e, "PAYMENT TYPE")}
                        title="Filter payment type"
                      >
                        <Filter size={11} />
                      </button>
                    </span>
                  </th>
                  <th className="is-right">Amount</th>
                  <th className="is-right">Balance Due</th>
                  <th className="is-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="8" className="expense-empty-cell">Loading...</td></tr>
                ) : displayedExpenses.length === 0 ? (
                  <tr><td colSpan="8" className="expense-empty-cell">No expense records found.</td></tr>
                ) : displayedExpenses.map((row) => (
                  <tr key={row.id}>
                    <td className="is-left">{fmtDate(row.expense_date)}</td>
                    <td className="is-left exp-no-cell">{row.expense_no || row.id}</td>
                    <td className="is-left party-cell" title={row.party_name || ""}>{row.party_name || "-"}</td>
                    <td className="is-left" title={row.category_name || ""}>{row.category_name || "-"}</td>
                    <td className="is-left" title={row.payment_type || "Cash"}>{row.payment_type || "Cash"}</td>
                    <td className="is-right amount-cell">{fmtINR(row.total_amount)}</td>
                    <td className={`is-right balance-cell ${Number(row.balance_amount || 0) > 0 ? "has-balance" : ""}`}>{fmtINR(row.balance_amount)}</td>
                    <td className="actions-cell">
                      <button
                        type="button"
                        className={`expense-row-dot ${activeTxnMenuId === row.id ? "is-open" : ""}`}
                        data-expense-menu-container
                        onClick={(e) => toggleActionMenu(e, row.id)}
                        title="Expense actions"
                        aria-label="Expense actions"
                      >
                        <MoreVertical size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {activeTxnMenuId && (() => {
        const row = expenses.find((e) => e.id === activeTxnMenuId);
        if (!row) return null;
        return createPortal(
          <div ref={actionMenuRef} className="expense-action-menu" data-expense-menu-container style={actionMenuPos || { visibility: "hidden", top: 0, left: 0 }}>
            <button className="expense-action-menu-item" onClick={() => { navigate(`/purchases/expenses/edit/${row.id}`); closeAllMenus(); }}>
              <Pencil size={14} /> <span>View/Edit</span>
            </button>
            <button className="expense-action-menu-item danger" disabled={duplicating} onClick={() => { handleDelete(row); closeAllMenus(); }}>
              <Trash2 size={14} /> <span>Delete</span>
            </button>
            <button className="expense-action-menu-item" disabled={duplicating} onClick={() => handleDuplicate(row)}>
              <Copy size={14} /> <span>{duplicating ? "Duplicating..." : "Duplicate"}</span>
            </button>
            <button className="expense-action-menu-item" disabled={!!docBusy} onClick={() => handleOpenPdf(row)}>
              <FileText size={14} /> <span>Open PDF</span>
            </button>
            <button className="expense-action-menu-item" onClick={() => openPreview(row)}>
              <Eye size={14} /> <span>Preview</span>
            </button>
            <button className="expense-action-menu-item" onClick={() => handlePrintRow(row)}>
              <Printer size={14} /> <span>Print</span>
            </button>
            <button className="expense-action-menu-item" onClick={() => openHistory(row)}>
              <History size={14} /> <span>View History</span>
            </button>
          </div>,
          document.body,
        );
      })()}

      {activeFilterCol && createPortal(
        <div ref={filterRef} className="expense-filter-pop" data-expense-menu-container style={filterPos || { visibility: "hidden", top: 0, left: 0 }}>
          {(() => {
            const col = FILTER_COLUMNS.find((c) => c.key === activeFilterCol);
            if (!col) return null;
            return (
              <>
                <input
                  autoFocus
                  className="expense-filter-input"
                  placeholder={`Filter ${col.label.toLowerCase()}...`}
                  value={colFilters[col.key] || ""}
                  onChange={(e) => setColFilters((p) => ({ ...p, [col.key]: e.target.value }))}
                />
                <div className="expense-filter-pop-actions">
                  <button type="button" onClick={() => { setColFilters((p) => ({ ...p, [col.key]: "" })); setActiveFilterCol(""); }}>Clear</button>
                  <button type="button" onClick={() => setActiveFilterCol("")}>Done</button>
                </div>
              </>
            );
          })()}
        </div>,
        document.body,
      )}

      {previewExpense && (
        <div className="expense-modal-overlay" onClick={closePreview}>
          <div className="expense-modal expense-modal-wide" onClick={(e) => e.stopPropagation()}>
            <div className="expense-modal-header">
              <span className="expense-modal-title">Preview {previewExpense.expense_no ? `#${previewExpense.expense_no}` : ""}</span>
              <button className="expense-modal-close" onClick={closePreview} aria-label="Close">
                <X size={16} />
              </button>
            </div>
            <div className="expense-modal-body">
              {previewLoading ? (
                <div style={{ padding: "34px 0", textAlign: "center", color: "#94a3b8", fontSize: 13, fontWeight: 600 }}>Loading expense document...</div>
              ) : previewError ? (
                <div style={{ padding: "34px 0", textAlign: "center", color: "#b91c1c", fontSize: 13, fontWeight: 600 }}>{previewError}</div>
              ) : previewHtml ? (
                <div className="expense-pdf-sheet" dangerouslySetInnerHTML={{ __html: previewHtml }} />
              ) : null}
            </div>
            <div className="expense-modal-footer">
              <button className="expense-btn-primary" disabled={!!docBusy || !previewContext} onClick={openPreviewPdf}>
                {docBusy === "open" ? "Opening..." : "Open PDF"}
              </button>
              <button className="expense-btn-ghost" disabled={!previewContext} onClick={printPreviewPdf}>
                <Printer size={14} /> Print
              </button>
              <button className="expense-btn-ghost" disabled={!!docBusy || !previewContext} onClick={savePreviewPdf}>
                {docBusy === "save" ? "Saving..." : "Save PDF"}
              </button>
              <button className="expense-btn-ghost" disabled={!previewContext} onClick={openSharePdf}>
                <Mail size={14} /> Email PDF
              </button>
              <button className="expense-btn-ghost expense-btn-close" onClick={closePreview}>Close</button>
            </div>
          </div>
        </div>
      )}

      {shareOpen && (
        <div className="expense-modal-overlay" onClick={closeSharePdf}>
          <div className="expense-modal expense-modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="expense-modal-header">
              <span className="expense-modal-title">Email / Share PDF</span>
              <button className="expense-modal-close" onClick={closeSharePdf} aria-label="Close">
                <X size={16} />
              </button>
            </div>
            <div className="expense-modal-body">
              <p style={{ margin: "0 0 14px", fontSize: 12.5, color: "#64748b", lineHeight: 1.55 }}>
                Sends the generated expense PDF to a WhatsApp number using the firm&apos;s connected WhatsApp account.
              </p>
              <label style={{ display: "block", marginBottom: 6, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.04em", color: "#64748b" }}>Recipient phone number</label>
              <input
                className="expense-share-input"
                type="tel"
                placeholder="9876543210"
                value={sharePhone}
                onChange={(e) => setSharePhone(e.target.value)}
              />
              {shareMessage && <p style={{ margin: "14px 0 0", fontSize: 12.5, fontWeight: 700, color: "#15803d" }}>{shareMessage}</p>}
            </div>
            <div className="expense-modal-footer">
              <button className="expense-btn-primary" disabled={shareBusy} onClick={sendSharedPdf}>
                {shareBusy ? "Sending..." : "Send PDF"}
              </button>
              <button className="expense-btn-ghost expense-btn-close" onClick={closeSharePdf}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {historyExpense && (
        <div className="expense-modal-overlay" onClick={() => setHistoryExpense(null)}>
          <div className="expense-modal" onClick={(e) => e.stopPropagation()}>
            <div className="expense-modal-header">
              <span className="expense-modal-title">Expense History</span>
              <button className="expense-modal-close" onClick={() => setHistoryExpense(null)} aria-label="Close">
                <X size={16} />
              </button>
            </div>
            <div className="expense-modal-body">
              <div className="expense-detail-grid">
                <div><div className="field-label">Expense No.</div><div className="field-value">#{historyExpense.expense_no || historyExpense.id}</div></div>
                <div><div className="field-label">Party</div><div className="field-value">{historyExpense.party_name || "-"}</div></div>
                <div><div className="field-label">Category</div><div className="field-value">{historyExpense.category_name || "-"}</div></div>
                <div><div className="field-label">Total Amount</div><div className="field-value">{fmtINR(historyExpense.total_amount)}</div></div>
                <div><div className="field-label">Record Created</div><div className="field-value">{historyExpense.created_at ? fmtDate(historyExpense.created_at) : "Not recorded"}</div></div>
                <div><div className="field-label">Last Updated</div><div className="field-value">{historyExpense.updated_at ? fmtDate(historyExpense.updated_at) : "Not recorded"}</div></div>
              </div>
              <p style={{ marginTop: 16, fontSize: 12, color: "#94a3b8", fontWeight: 600 }}>
                Detailed change history is not recorded for expenses.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className={`expense-notice ${notice ? "is-visible" : ""}`}>{notice}</div>
    </div>
  );
}

/* Position a fixed popover so it never leaves the viewport; prefers opening downward.
   align "left" anchors the popover's left edge to the trigger, "right" anchors its right edge. */
const placePopover = (anchor, width, height, align = "left") => {
  const margin = 8;
  const gap = 6;
  const fitsBelow = anchor.bottom + height + gap + margin <= window.innerHeight;
  const fitsAbove = anchor.top - height - gap - margin >= margin;
  const openUp = !fitsBelow && fitsAbove;
  const top = openUp ? anchor.top - height - gap : anchor.bottom + gap;
  const desiredLeft = align === "right" ? anchor.right - width : anchor.left;
  const left = Math.min(Math.max(margin, desiredLeft), Math.max(margin, window.innerWidth - width - margin));
  return { top: Math.max(margin, top), left };
};