import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../services/api";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import html2pdf from "html2pdf.js";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
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
import ReportPagination from "../../../components/reports/ReportPagination";
import { showToast } from "../../../utils/reportToast";

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

/* ─────────────────────────────────────────────────────────────
   EXPENSE GRAPH — Vyapar-style summary shown above the
   transactions. Uses ONLY the expense records already loaded by
   the page (/expense/list) and the same date-range used by the
   page filters — no fake/static data, no extra API.
   ───────────────────────────────────────────────────────────── */
const GRAPH_MODES = [
  { key: "daily", label: "Daily" },
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
  { key: "yearly", label: "Yearly" },
];

const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const DAY_MS = 86400000;
const pad2 = (n) => String(n).padStart(2, "0");

const toDay = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(`${String(dateStr).slice(0, 10)}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
};

const addDaysISO = (dateStr, n) => {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};

const daysDiff = (fromISO, toISO) =>
  Math.round(
    (new Date(`${toISO}T00:00:00`).getTime() - new Date(`${fromISO}T00:00:00`).getTime()) / DAY_MS
  );

const fmtGraphMoney = (v) =>
  `₹${Number(v || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const fmtGraphAxis = (v) => `₹${Number(v || 0).toLocaleString("en-IN")}`;

/* Dynamic Y-axis scale based on the ACTUAL maximum expense, so the chart
   is never distorted to a fixed 0–100 range. */
function niceScale(maxValue) {
  if (!(maxValue > 0)) return { max: 0, ticks: [0] };
  const rawStep = maxValue / 5;
  const mag = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const norm = rawStep / mag;
  const step = Math.max(1, mag * (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10));
  const top = Math.ceil(maxValue / step) * step;
  const ticks = [];
  for (let v = 0; v <= top; v = Math.round((v + step) * 100) / 100) ticks.push(v);
  return { max: top, ticks };
}

function buildExpenseSeries(expenses, mode, fromDate, toDate, period) {
  /* Mirror the page's API query range so zero-filled buckets line up
     exactly with what /expense/list actually returned. */
  const effFrom = period === "Between" ? fromDate : getFirstDayOfMonthISO();
  const effTo = period === "Between" ? toDate : getTodayISO();

  const start = toDay(effFrom);
  const end = toDay(effTo);
  if (!start || !end || start.getTime() > end.getTime()) {
    return { buckets: [], scale: niceScale(0) };
  }

  const sums = new Map();
  (expenses || []).forEach((exp) => {
    const edate = String(exp.expense_date || "").slice(0, 10);
    if (!edate) return;
    const amount = Number(exp.total_amount || 0);
    if (mode === "daily") {
      sums.set(edate, (sums.get(edate) || 0) + amount);
    } else if (mode === "weekly") {
      const idx = Math.floor(daysDiff(effFrom, edate) / 7);
      if (idx >= 0) sums.set(idx, (sums.get(idx) || 0) + amount);
    } else if (mode === "monthly") {
      const key = edate.slice(0, 7);
      sums.set(key, (sums.get(key) || 0) + amount);
    } else {
      const key = edate.slice(0, 4);
      sums.set(key, (sums.get(key) || 0) + amount);
    }
  });

  const buckets = [];

  if (mode === "daily") {
    const days = daysDiff(effFrom, effTo) + 1;
    for (let i = 0; i < days; i++) {
      const date = addDaysISO(effFrom, i);
      const [y, m, d] = date.split("-");
      buckets.push({
        key: `d-${date}`,
        label: `${pad2(Number(d))}/${pad2(Number(m))}`,
        tooltipTitle: `Date: ${pad2(Number(d))}/${pad2(Number(m))}/${y}`,
        amount: sums.get(date) || 0,
      });
    }
  } else if (mode === "weekly") {
    const weekCount = Math.max(1, Math.ceil((daysDiff(effFrom, effTo) + 1) / 7));
    for (let w = 0; w < weekCount; w++) {
      buckets.push({
        key: `w-${w}`,
        label: `Week ${w + 1}`,
        tooltipTitle: `Week: Week ${w + 1}`,
        amount: sums.get(w) || 0,
      });
    }
  } else if (mode === "monthly") {
    let y = start.getFullYear();
    let m = start.getMonth();
    const endY = end.getFullYear();
    const endM = end.getMonth();
    while (y < endY || (y === endY && m <= endM)) {
      const key = `${y}-${pad2(m + 1)}`;
      buckets.push({
        key: `m-${key}`,
        label: MONTH_SHORT[m],
        tooltipTitle: `Month: ${MONTH_SHORT[m]} ${y}`,
        amount: sums.get(key) || 0,
      });
      m += 1;
      if (m > 11) {
        m = 0;
        y += 1;
      }
    }
  } else {
    for (let y = start.getFullYear(); y <= end.getFullYear(); y++) {
      const key = String(y);
      buckets.push({
        key: `y-${key}`,
        label: key,
        tooltipTitle: `Year: ${key}`,
        amount: sums.get(key) || 0,
      });
    }
  }

  const maxAmount = buckets.reduce((mx, b) => Math.max(mx, b.amount), 0);
  return { buckets, scale: niceScale(maxAmount) };
}

function ExpenseGraphTooltip({ active, payload }) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0]?.payload;
  if (!point) return null;
  return (
    <div className="expense-graph-tooltip">
      <div>{point.tooltipTitle}</div>
      <div className="expense-graph-tooltip-amount">Amount: {fmtGraphMoney(point.amount)}</div>
    </div>
  );
}

function ExpenseGraph({ expenses, loading, period, fromDate, toDate }) {
  const [mode, setMode] = useState("daily");

  const { buckets, scale } = useMemo(
    () => buildExpenseSeries(expenses, mode, fromDate, toDate, period),
    [expenses, mode, fromDate, toDate, period]
  );

  const noData = !expenses || expenses.length === 0 || buckets.length === 0;
  const angledDaily = mode === "daily" && buckets.length > 10;

  return (
    <section id="expense-graph" className="expense-graph expense-report-no-print">
      <div className="expense-graph-head">
        <h3 className="expense-graph-title">Expense Graph</h3>
        <div className="expense-graph-tabs">
          {GRAPH_MODES.map((m) => (
            <button
              key={m.key}
              type="button"
              className={`expense-graph-tab ${mode === m.key ? "active" : ""}`}
              onClick={() => setMode(m.key)}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {loading && noData ? (
        <div className="expense-graph-empty">Loading expense data...</div>
      ) : noData ? (
        <div className="expense-graph-empty">No expense data available for the selected period.</div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={buckets} margin={{ top: 12, right: 14, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="expenseGraphFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2563eb" stopOpacity={0.16} />
                <stop offset="100%" stopColor="#2563eb" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#eef2f8" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11.5, fill: "#64748b" }}
              tickLine={false}
              axisLine={{ stroke: "#cbd5e1" }}
              interval="preserveStartEnd"
              minTickGap={8}
              angle={angledDaily ? -35 : 0}
              textAnchor={angledDaily ? "end" : "middle"}
              height={angledDaily ? 46 : 30}
            />
            <YAxis
              tick={{ fontSize: 11.5, fill: "#64748b" }}
              tickLine={false}
              axisLine={false}
              width={62}
              domain={[0, scale.max || 100]}
              ticks={scale.max > 0 ? scale.ticks : undefined}
              tickFormatter={fmtGraphAxis}
            />
            <Tooltip
              content={(props) => <ExpenseGraphTooltip {...props} />}
              cursor={{ stroke: "#c7d2fe", strokeDasharray: "4 4" }}
            />
            <Area
              type="monotone"
              dataKey="amount"
              stroke="#2563eb"
              strokeWidth={2.5}
              fill="url(#expenseGraphFill)"
              dot={{ r: 3.2, fill: "#2563eb", stroke: "#fff", strokeWidth: 1.5 }}
              activeDot={{ r: 5, fill: "#2563eb", stroke: "#fff", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </section>
  );
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
  const [graphModalOpen, setGraphModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

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
        showToast(res.data.message || "Unable to delete this expense", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Error deleting expense", "error");
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
        showToast(
          `Expense duplicated as ${res.data.expense_no || res.data.invoice_no || "New"}`,
          "success"
        );
      } else {
        setDocBusyText("");
        showToast(res.data.message || "Unable to duplicate expense", "error");
      }
    } catch (err) {
      setDocBusyText("");
      console.error(err);
      showToast("Error duplicating expense", "error");
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
        showToast(err.message, "error");
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
        showToast(err.message, "error");
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
        showToast("Could not prepare the expense document", "error");
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
        /*
         * FIX PDF HORIZONTAL CROPPING / EMPTY PAYMENT BOXES
         *
         * Same recipe as the working Purchase PDF: measure the real rendered
         * expense voucher width instead of forcing html2canvas to capture only
         * the fixed 794px box. The inline width is applied, layout gets one
         * frame, then the FULL rendered width is captured and jsPDF scales the
         * complete image down to the A4 page — so nothing on the right side
         * (nor the PAID/BALANCE boxes) is ever cropped out.
         */
        const originalWidth = element.style.width;
        const originalMaxWidth = element.style.maxWidth;
        const originalOverflow = element.style.overflow;
        const originalBoxSizing = element.style.boxSizing;

        const contentWidth = Math.max(
          element.scrollWidth || 0,
          element.offsetWidth || 0,
          element.clientWidth || 0,
          794
        );

        try {
          element.style.width = `${contentWidth}px`;
          element.style.maxWidth = "none";
          element.style.overflow = "visible";
          element.style.boxSizing = "border-box";

          /* Give the browser one frame to recalculate layout after resizing. */
          await new Promise((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(resolve))
          );

          const captureWidth = Math.max(
            element.scrollWidth || 0,
            element.offsetWidth || 0,
            contentWidth
          );

          const opt = {
            margin: [6, 6, 6, 6],
            filename: `expense-${docAction.detail.expense_no || docAction.detail.id || ""}.pdf`,
            image: { type: "jpeg", quality: 0.98 },
            html2canvas: {
              scale: 2,
              useCORS: true,
              logging: false,
              backgroundColor: "#ffffff",
              scrollX: 0,
              scrollY: 0,
              windowWidth: captureWidth,
              width: captureWidth,
              x: 0,
              y: 0,
            },
            pagebreak: {
              mode: ["css", "legacy"],
            },
            jsPDF: {
              unit: "mm",
              format: "a4",
              orientation: "portrait",
              compress: true,
            },
          };

          const url = await html2pdf()
            .set(opt)
            .from(element)
            .output("bloburl");

          window.open(url, "_blank");
        } catch (err) {
          console.error(err);
          showToast("Could not generate the PDF", "error");
        } finally {
          /* Restore the hidden render container so other actions are unaffected. */
          element.style.width = originalWidth;
          element.style.maxWidth = originalMaxWidth;
          element.style.overflow = originalOverflow;
          element.style.boxSizing = originalBoxSizing;
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
      showToast("No data available to export", "warning");
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

  const totalRows = filteredExpenses.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
  const safePage = Math.min(page, totalPages);
  const pagedRows = filteredExpenses.slice((safePage - 1) * rowsPerPage, safePage * rowsPerPage);

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
        .expense-graph {
          background: #fff;
          border: 1px solid #dde2ea;
          border-radius: 12px;
          padding: 18px 20px 12px;
          margin-top: 18px;
          box-shadow: 0 1px 2px rgba(0,0,0,.04);
        }
        .expense-graph-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
          padding-bottom: 14px;
          border-bottom: 1px solid #eef2f8;
        }
        .expense-graph-title {
          margin: 0;
          font-size: 18px;
          font-weight: 800;
          color: #304254;
        }
        .expense-graph-tabs {
          display: flex;
          align-items: center;
          gap: 4px;
          flex-wrap: wrap;
        }
        .expense-graph-tab {
          background: transparent;
          border: none;
          border-bottom: 2px solid transparent;
          color: #94a3b8;
          font-size: 13px;
          font-weight: 700;
          padding: 8px 14px;
          cursor: pointer;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }
        .expense-graph-tab:hover { color: #40536b; }
        .expense-graph-tab.active { color: #2563eb; border-bottom-color: #2563eb; }
        .expense-graph-empty {
          padding: 56px 20px;
          text-align: center;
          color: #94a3b8;
          font-size: 14px;
          font-weight: 600;
        }
        .expense-graph-tooltip {
          background: #0f172a;
          color: #fff;
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 12px;
          font-weight: 600;
          line-height: 1.55;
          box-shadow: 0 10px 24px rgba(0,0,0,.18);
          white-space: nowrap;
        }
        .expense-graph-tooltip-amount { color: #93c5fd; }
        @media (max-width: 760px) {
          .expense-graph { padding: 14px 10px 8px; }
          .expense-graph-title { font-size: 16px; }
          .expense-graph-tab { padding: 7px 10px; font-size: 12px; }
        }
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
            <button
              className="graph-action"
              onClick={() => setGraphModalOpen(true)}
            >
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
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedRows.map((expense) => (
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

        <div className="expense-report-no-print">
          <ReportPagination
            total={totalRows}
            page={safePage}
            rowsPerPage={rowsPerPage}
            onPageChange={setPage}
            onRowsPerPageChange={(v) => { setRowsPerPage(v); setPage(1); }}
          />
        </div>
      </div>
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

      {/* ── EXPENSE GRAPH MODAL — opens only when the Graph button is clicked ── */}
      {graphModalOpen && (
        <div className="modal-backdrop" onClick={() => setGraphModalOpen(false)}>
          <div className="preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="preview-head">
              <h3>Expense Graph</h3>
              <button className="row-menu-button" onClick={() => setGraphModalOpen(false)}><X size={18} /></button>
            </div>
            <div className="preview-content">
              <ExpenseGraph
                expenses={filteredExpenses}
                loading={loading}
                period={period}
                fromDate={fromDate}
                toDate={toDate}
              />
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          OFF-SCREEN EXPENSE DOCUMENT used by Open PDF / Print
          (kept off the painted viewport — never display:none /
           visibility:hidden so html2canvas can still rasterise it. Width is
           max-content so the capture always has the voucher's real width and
           jsPDF scales the complete image down to the A4 page — nothing on the
           right side is ever cropped.)
      ===================================================== */}
      {docAction && (
        <div
          aria-hidden
          style={{
            position: "fixed",
            top: 0,
            left: "-10000px",
            width: "max-content",
            minWidth: 794,
            background: "#fff",
            zIndex: -1,
            overflow: "visible",
          }}
        >
          <div
            id="row-action-expense"
            style={{
              background: "#fff",
              width: "max-content",
              minWidth: 794,
              maxWidth: "none",
              overflow: "visible",
              boxSizing: "border-box",
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