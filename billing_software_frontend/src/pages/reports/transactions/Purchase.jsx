import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../services/api";
import * as XLSX from "xlsx";
import html2pdf from "html2pdf.js";
import {
  Calendar,
  ChevronDown,
  Copy,
  CreditCard,
  Eye,
  FileSpreadsheet,
  FileText,
  History,
  Loader2,
  MoreVertical,
  Pencil,
  Plus,
  Printer,
  Search,
  Share2,
  Trash2,
  Undo2,
  Upload,
  X,
} from "lucide-react";
import PurchaseDocument from "./PurchaseDocument";
import AddPaymentOutModal from "../../purchase/payment_out/AddPaymentOutModal";
import { generateInvoicePdfBase64 } from "../../../utils/invoiceShare";

const toInputDate = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

const firstOfMonth = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
};

const today = () => new Date();

const COLUMNS = [
  { key: "date", label: "DATE" },
  { key: "invoice_no", label: "INVOICE NO." },
  { key: "party_name", label: "PARTY NAME" },
  { key: "type", label: "TRANSACTION" },
  { key: "payment_type", label: "PAYMENT TYPE" },
  { key: "amount", label: "AMOUNT" },
  { key: "balance", label: "BALANCE" },
  { key: "actions", label: "ACTIONS" },
];

/* Fixed dropdown geometry used for smart auto-flip positioning */
const ACTION_MENU_WIDTH = 200;
const SHARE_MENU_WIDTH = 72;
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
    '<html><head><title>Purchase Invoice</title></head>' +
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

const PERIODS = [
  { value: "custom", label: "Custom" },
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
  { value: "year", label: "This Year" },
  { value: "all", label: "All Time" },
];

/* Official WhatsApp logo glyph (same path used by the sidebar/MainLayout) */
const WhatsAppIcon = ({ size = 16 }) => (
  <span
    style={{
      width: `${size}px`,
      height: `${size}px`,
      borderRadius: "50%",
      background: "#25D366",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    }}
  >
    <svg
      width={Math.round(size * 0.62)}
      height={Math.round(size * 0.62)}
      viewBox="0 0 24 24"
      fill="#ffffff"
      aria-hidden="true"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
    </svg>
  </span>
);

export default function Purchase() {
  const navigate = useNavigate();

  const [companies, setCompanies] = useState([]);
  const [companyFilter, setCompanyFilter] = useState("all");
  const [period, setPeriod] = useState("custom");

  const [fromDate, setFromDate] = useState(
    toInputDate(firstOfMonth())
  );
  const [toDate, setToDate] = useState(toInputDate(today()));

  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState("");
  const [uploadOpen, setUploadOpen] = useState(false);

  const [actionMenu, setActionMenu] = useState(null);
  const [shareMenu, setShareMenu] = useState(null);
  const actionMenuRef = useRef(null);
  const shareMenuRef = useRef(null);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const closeMenus = () => {
    setActionMenu(null);
    setShareMenu(null);
  };

  const [payOutSupplier, setPayOutSupplier] = useState(null);

  const [previewDetail, setPreviewDetail] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");

  const [historyPurchase, setHistoryPurchase] = useState(null);
  const [historyList, setHistoryList] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");

  const [docBusyText, setDocBusyText] = useState("");
  const [docAction, setDocAction] = useState(null);

  const fetchToken = useRef(0);

  /* =========================================================
     FORMATTERS
  ========================================================= */

  const fmtMoney = (v) =>
    "₹" +
    Number(v || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const displayDate = (val) => {
    if (!val) return "-";

    const [y, m, d] = String(val).split("-");

    return y && m && d ? `${d}/${m}/${y}` : String(val);
  };

  const txLabel = (status) => {
    if (status === "submitted") return "Purchase";
    if (status === "draft") return "Draft";

    return status || "-";
  };

  /* =========================================================
     DATE PERIOD
  ========================================================= */

  const fmtPeriodRange = (periodKey) => {
    switch (periodKey) {
      case "today": {
        const t = today();

        return {
          from: toInputDate(t),
          to: toInputDate(t),
        };
      }

      case "week": {
        const d = new Date();
        const day = (d.getDay() + 6) % 7;

        d.setDate(d.getDate() - day);

        return {
          from: toInputDate(d),
          to: toInputDate(today()),
        };
      }

      case "month":
        return {
          from: toInputDate(firstOfMonth()),
          to: toInputDate(today()),
        };

      case "year": {
        const d = new Date();

        return {
          from: toInputDate(
            new Date(d.getFullYear(), 0, 1)
          ),
          to: toInputDate(today()),
        };
      }

      case "all":
        return {
          from: "",
          to: "",
        };

      default:
        return {
          from: fromDate,
          to: toDate,
        };
    }
  };

  /* =========================================================
     LOAD PURCHASES
  ========================================================= */

  const loadPurchases = async (list, filterVal, from, to) => {
    const token = ++fetchToken.current;

    setLoading(true);
    setError(false);

    try {
      const ids = list
        .filter((c) => {
          if (filterVal === "all") return true;

          return String(c.id) === String(filterVal);
        })
        .map((c) => c.id);

      if (ids.length === 0) {
        if (token === fetchToken.current) {
          setPurchases([]);
        }

        return;
      }

      const results = await Promise.all(
        ids.map((id) => {
          const params = new URLSearchParams({
            company_id: String(id),
          });

          if (from) {
            params.append("start_date", from);
          }

          if (to) {
            params.append("end_date", to);
          }

          return api.get(
            `/purchase/get_purchases?${params.toString()}`
          );
        })
      );

      if (token !== fetchToken.current) return;

      const merged = results.flatMap(
        (r) =>
          (r.data && r.data.status ? r.data.data : []) || []
      );

      setPurchases(merged);
    } catch (err) {
      console.error("Purchase loading error:", err);

      if (token === fetchToken.current) {
        setError(true);
      }
    } finally {
      if (token === fetchToken.current) {
        setLoading(false);
      }
    }
  };

  /* =========================================================
     LOAD COMPANIES
  ========================================================= */

  useEffect(() => {
    const user = JSON.parse(
      localStorage.getItem("user") || "null"
    );

    if (!user) {
      queueMicrotask(() => setLoading(false));
      return;
    }

    const adminId =
      user.role === "cashier"
        ? user.admin_id
        : user.id;

    let active = true;

    api
      .get(
        `/company/get_companies_by_admin?admin_id=${adminId}`
      )
      .then((res) => {
        if (
          !active ||
          !res.data ||
          !res.data.status
        ) {
          return;
        }

        const list = res.data.data || [];

        setCompanies(list);

        const saved =
          localStorage.getItem(
            "selected_company_id"
          );

        const initial =
          saved &&
            list.some(
              (c) =>
                String(c.id) === String(saved)
            )
            ? saved
            : list.length
              ? String(list[0].id)
              : "all";

        setCompanyFilter(initial);

        if (list.length) {
          loadPurchases(
            list,
            initial,
            fromDate,
            toDate
          );
        } else {
          setPurchases([]);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error(
          "Company loading error:",
          err
        );

        if (active) {
          setError(true);
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* =========================================================
     FILTER HANDLERS
  ========================================================= */

  const handlePeriodChange = (val) => {
    setPeriod(val);

    const range = fmtPeriodRange(val);

    setFromDate(range.from);
    setToDate(range.to);

    loadPurchases(
      companies,
      companyFilter,
      range.from,
      range.to
    );
  };

  const handleFromChange = (val) => {
    setFromDate(val);
    setPeriod("custom");

    loadPurchases(
      companies,
      companyFilter,
      val,
      toDate
    );
  };

  const handleToChange = (val) => {
    setToDate(val);
    setPeriod("custom");

    loadPurchases(
      companies,
      companyFilter,
      fromDate,
      val
    );
  };

  const handleCompanyChange = (val) => {
    setCompanyFilter(val);

    if (val !== "all") {
      localStorage.setItem(
        "selected_company_id",
        val
      );
    }

    loadPurchases(
      companies,
      val,
      fromDate,
      toDate
    );
  };

  const retry = () =>
    loadPurchases(
      companies,
      companyFilter,
      fromDate,
      toDate
    );

  /* =========================================================
     SEARCH
  ========================================================= */

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return purchases;

    return purchases.filter((p) =>
      [
        p.purchase_no,
        p.supplier_name,
        txLabel(p.status),
        p.payment_type,
      ].some(
        (v) =>
          v &&
          String(v)
            .toLowerCase()
            .includes(q)
      )
    );
  }, [purchases, search]);

  /* =========================================================
     SUMMARY
  ========================================================= */

  const paid = filtered.reduce(
    (s, p) =>
      s + Number(p.paid_amount || 0),
    0
  );

  const unpaid = filtered.reduce(
    (s, p) =>
      s + Number(p.balance_amount || 0),
    0
  );

  const total = paid + unpaid;

  /* =========================================================
     PAYMENT
  ========================================================= */

  const openPayModal = (p) => {
    setPayOutSupplier({
      id: p.supplier_id || 0,
      supplier_name: p.supplier_name || "Party",
      pending_balance: Number(p.balance_amount || 0),
    });
  };

  /* =========================================================
     DELETE (styled confirm, no window.confirm)
  ========================================================= */

  const confirmDelete = (p) => {
    setActionMenu(null);
    setDeleteTarget(p);
  };

  const performDelete = async () => {
    if (!deleteTarget) return;

    setDeletingId(deleteTarget.id);

    try {
      const res = await api.post(
        "/purchase/delete_purchase",
        {
          id: deleteTarget.id,
        }
      );

      if (res.data.status) {
        setDeleteTarget(null);

        retry();
      } else {
        alert(
          res.data.message ||
          "Unable to delete this purchase"
        );
      }
    } catch (err) {
      console.error(err);

      alert("Error deleting purchase");
    } finally {
      setDeletingId(null);
    }
  };

  /* =========================================================
     PURCHASE DOCUMENT (preview / print / pdf)
  ========================================================= */

  const companyFor = (p) =>
    companies.find(
      (c) => String(c.id) === String(p.company_id)
    ) || null;

  const loadPurchaseDetail = async (p) => {
    const res = await api.get(
      "/purchase/get_purchase_by_id",
      {
        params: { id: p.id },
      }
    );

    if (res.data.status) return res.data.data;

    throw new Error(
      res.data.message || "Unable to load purchase"
    );
  };

  /* PREVIEW — inline modal fed by the real purchase record */
  const openPreview = (p) => {
    setActionMenu(null);

    setPreviewDetail(null);
    setPreviewError("");
    setPreviewLoading(true);

    loadPurchaseDetail(p)
      .then(setPreviewDetail)
      .catch((err) =>
        setPreviewError(
          err.message || "Could not load purchase"
        )
      )
      .finally(() => setPreviewLoading(false));
  };

  /* OPEN PDF — fetch + render off-screen, then html2pdf -> blob url -> new tab */
  const openPurchasePdf = (p) => {
    if (docBusyText) return;

    setActionMenu(null);

    setDocBusyText("Generating PDF…");
    setDocAction(null);

    loadPurchaseDetail(p)
      .then((detail) => setDocAction({ mode: "pdf", detail }))
      .catch((err) => {
        setDocBusyText("");
        alert(err.message);
      });
  };

  /* PRINT — fetch + render off-screen, then hidden-iframe print dialog */
  const printPurchase = (p) => {
    if (docBusyText) return;

    setActionMenu(null);

    setDocBusyText("Preparing print…");
    setDocAction(null);

    loadPurchaseDetail(p)
      .then((detail) => setDocAction({ mode: "print", detail }))
      .catch((err) => {
        setDocBusyText("");
        alert(err.message);
      });
  };

  /* Once the off-screen purchase has painted:
       print -> hidden iframe print dialog
       pdf   -> html2pdf -> open the generated blob url in a new tab

       IMPORTANT:
       The purchase document can be wider than the 794px A4 CSS canvas.
       Capture the COMPLETE rendered width and let jsPDF scale it down to
       the A4 printable area. This prevents the right side of the invoice
       (amount/total columns, supplier details, etc.) from being cropped. */
  useEffect(() => {
    if (!docAction) return;

    const mode = docAction.mode;

    const timer = setTimeout(async () => {
      const element = document.getElementById("row-action-purchase");

      if (!element) return;

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
      } else if (mode === "whatsapp") {
        try {
          const pdfBase64 = await generateInvoicePdfBase64({
            element,
            invoiceNo: docAction.detail?.purchase_no || "purchase",
            isPOS: false,
          });

          const phone = String(docAction.phone || "").replace(/[^0-9]/g, "");
          const normalizedPhone = phone.length === 10 ? `91${phone}` : phone;

          const res = await api.post("/whatsapp/send_file", {
            company_id: docAction.detail?.company_id || companyFilter || 0,
            phone: normalizedPhone,
            file_base64: pdfBase64,
            mimetype: "application/pdf",
            filename: `${docAction.detail?.purchase_no || "purchase"}.pdf`,
            caption: `Purchase ${docAction.detail?.purchase_no || ""}`,
          });

          if (res.data?.status) {
            alert(res.data.message || "Purchase invoice sent via WhatsApp!");
          } else {
            alert(res.data?.message || "Unable to send purchase via WhatsApp.");
          }
        } catch (err) {
          console.error(err);
          alert(
            err.response?.data?.message ||
              "Failed to send purchase via WhatsApp."
          );
        }
      } else {
        /*
         * FIX PDF HORIZONTAL CROPPING
         *
         * Measure the real rendered invoice width instead of forcing
         * html2canvas to capture only 794px. If PurchaseDocument/table
         * is wider than the A4 CSS width, html2canvas captures that full
         * width and jsPDF scales the complete image to A4.
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
            filename: `purchase-${docAction.detail.purchase_no || "purchase"}.pdf`,
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
          alert("Could not generate the PDF");
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
  }, [docAction, companyFilter]);

  /* DUPLICATE — new backend endpoint performs a real record duplicate */
  const duplicatePurchaseRow = async (p) => {
    if (docBusyText) return;

    setActionMenu(null);
    setDocBusyText("Duplicating purchase…");

    try {
      const res = await api.post(
        "/purchase/duplicate_purchase",
        {
          id: p.id,
        }
      );

      if (res.data.status) {
        setDocBusyText("");

        retry();

        alert(
          `Purchase duplicated as ${res.data.purchase_no || "Draft"}`
        );
      } else {
        setDocBusyText("");

        alert(
          res.data.message ||
          "Unable to duplicate purchase"
        );
      }
    } catch (err) {
      setDocBusyText("");

      console.error(err);

      alert("Error duplicating purchase");
    }
  };

  /* VIEW HISTORY — real payment records for this purchase */
  const openHistory = (p) => {
    setActionMenu(null);

    setHistoryPurchase(p);
    setHistoryList([]);
    setHistoryError("");
    setHistoryLoading(true);

    api
      .get("/purchase/get_payments", {
        params: { purchase_id: p.id },
      })
      .then((res) => {
        if (res.data.status) {
          setHistoryList(
            Array.isArray(res.data.data)
              ? res.data.data
              : []
          );
        } else {
          setHistoryError(
            res.data.message ||
            "Unable to load payment history"
          );
        }
      })
      .catch(() =>
        setHistoryError(
          "Could not load payment history"
        )
      )
      .finally(() => setHistoryLoading(false));
  };

  /* =========================================================
     WHATSAPP SHARE
  ========================================================= */

  const sendPurchaseWhatsApp = async (p) => {
    try {
      const detail = await loadPurchaseDetail(p);
      const supplierPhone =
        detail?.supplier?.mobile_number ||
        detail?.supplier?.phone ||
        detail?.supplier_phone ||
        detail?.supplier?.alt_mobile ||
        "";

      const cleanedPhone = String(supplierPhone || "").replace(/[^0-9]/g, "");

      if (!cleanedPhone) {
        alert("This purchase has no supplier phone number for WhatsApp.");
        return;
      }

      // Do not query #row-action-purchase here. It is rendered only after
      // docAction is set. The existing docAction effect waits for the
      // off-screen PurchaseDocument to render and then generates the PDF.
      setDocBusyText("Generating PDF…");
      setDocAction({
        mode: "whatsapp",
        detail,
        phone: cleanedPhone,
      });
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to send purchase via WhatsApp.");
    } finally {
      setShareMenu(null);
    }
  };

  const toggleActionMenu = (e, p) => {
    e.stopPropagation();

    if (actionMenu && actionMenu.id === p.id) {
      setActionMenu(null);
      return;
    }

    setShareMenu(null);

    const rect = e.currentTarget.getBoundingClientRect();
    let x = rect.right - ACTION_MENU_WIDTH;
    if (x < 10) x = 10;

    setActionMenu({
      id: p.id,
      x,
      y: rect.bottom + ROW_GAP,
    });
  };

  const toggleShareMenu = (e, p) => {
    e.stopPropagation();

    if (shareMenu && shareMenu.id === p.id) {
      setShareMenu(null);
      return;
    }

    setActionMenu(null);

    const rect = e.currentTarget.getBoundingClientRect();
    let x = rect.right - SHARE_MENU_WIDTH;
    if (x < 10) x = 10;

    setShareMenu({
      id: p.id,
      x,
      y: rect.bottom + ROW_GAP,
    });
  };

  useLayoutEffect(() => {
    if (actionMenu && actionMenuRef.current) {
      const el = actionMenuRef.current;
      const maxTop = window.innerHeight - el.offsetHeight - 8;
      const top = Math.min(Math.max(8, actionMenu.y), maxTop);
      const maxX = window.innerWidth - el.offsetWidth - 8;
      let left = actionMenu.x;
      if (left > maxX) left = Math.max(8, maxX);

      el.style.left = `${left}px`;
      el.style.top = `${top}px`;
    }

    if (shareMenu && shareMenuRef.current) {
      const el = shareMenuRef.current;
      const maxTop = window.innerHeight - el.offsetHeight - 8;
      const top = Math.min(Math.max(8, shareMenu.y), maxTop);
      const maxX = window.innerWidth - el.offsetWidth - 8;
      let left = shareMenu.x;
      if (left > maxX) left = Math.max(8, maxX);

      el.style.left = `${left}px`;
      el.style.top = `${top}px`;
    }
  }, [actionMenu, shareMenu]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      const clickedInsideAction =
        actionMenuRef.current &&
        actionMenuRef.current.contains(event.target);
      const clickedInsideShare =
        shareMenuRef.current &&
        shareMenuRef.current.contains(event.target);

      if (
        !clickedInsideAction &&
        !clickedInsideShare &&
        !(event.target instanceof HTMLElement &&
          event.target.closest("[data-action-trigger]")) &&
        !(event.target instanceof HTMLElement &&
          event.target.closest("[data-share-trigger]"))
      ) {
        closeMenus();
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        closeMenus();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [actionMenu, shareMenu]);

  /* =========================================================
     EXCEL EXPORT
  ========================================================= */

  const exportToExcel = () => {
    if (!filtered.length) {
      alert("No data available to export");
      return;
    }

    const firmName =
      companies.find(
        (c) =>
          String(c.id) ===
          String(companyFilter)
      )?.company_name ||
      "All Firms";

    const rows = filtered.map((p, i) => ({
      "Sl No": i + 1,
      Date: displayDate(p.purchase_date),
      "Invoice No.": p.purchase_no || "-",
      "Party Name":
        p.supplier_name || "-",
      Transaction: txLabel(p.status),
      "Payment Type":
        p.payment_type || "-",
      "Amount (₹)": Number(
        p.total_amount || 0
      ),
      "Paid (₹)": Number(
        p.paid_amount || 0
      ),
      "Balance (₹)": Number(
        p.balance_amount || 0
      ),
    }));

    const ws =
      XLSX.utils.json_to_sheet(rows);

    const wb =
      XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
      wb,
      ws,
      "Purchase Bills"
    );

    XLSX.utils.sheet_add_aoa(
      ws,
      [
        [],
        [
          "Total",
          "",
          "",
          "",
          "",
          Number(total || 0).toFixed(2),
          Number(paid || 0).toFixed(2),
          Number(unpaid || 0).toFixed(2),
        ],
      ],
      {
        origin: -1,
      }
    );

    XLSX.writeFile(
      wb,
      `Purchase_Bills_${firmName}_${fromDate || "all"}_to_${toDate || "all"
      }.xlsx`
    );
  };

  const handlePrint = () => {
    window.print();
  };

  /* =========================================================
     STYLES
  ========================================================= */

  const compactAction = {
    border: "none",
    background: "transparent",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "3px",
    minWidth: "54px",
    padding: "2px 4px",
  };

  const cardShadow = {
    background: "#ffffff",
    borderRadius: "10px",
    border: "1px solid #e1e7ef",
    boxShadow:
      "0 1px 2px rgba(15,23,42,0.04)",
  };

  /* Row currently open in the Actions 3-dot menu */
  const actionMenuRow = actionMenu
    ? purchases.find(
      (pp) => pp.id === actionMenu.id
    ) || null
    : null;

  const shareMenuRow = shareMenu
    ? purchases.find(
      (pp) => pp.id === shareMenu.id
    ) || null
    : null;

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
    <div
      className="purchase-bills-page"
      style={{
        padding: "28px 30px 36px",
        background: "#f8fafc",
        minHeight: "100vh",
        color: "#26364d",
      }}
    >
      {/* SHARE DROPDOWN */}
      {shareMenu && shareMenuRow && (
        <>
          <div
            onClick={() => {
              setShareMenu(null);
              setActionMenu(null);
            }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 55,
            }}
          />
          <div
            ref={shareMenuRef}
            style={{
              position: "fixed",
              left: shareMenu.x,
              top: shareMenu.y,
              zIndex: 60,
              width: SHARE_MENU_WIDTH,
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "10px",
              boxShadow: "0 8px 24px rgba(15,23,42,0.14)",
              padding: "7px 6px 6px",
            }}
          >
            <div
              onClick={() => {
                setShareMenu(null);
                sendPurchaseWhatsApp(shareMenuRow);
              }}
              title="Send purchase via WhatsApp"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "5px",
                padding: "2px 3px 3px",
                borderRadius: "8px",
                cursor: "pointer",
                background: "#ffffff",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "#ffffff")}
            >
              <WhatsAppIcon size={34} />
              <span
                style={{
                  fontSize: "9px",
                  lineHeight: "1",
                  fontWeight: "600",
                  color: "#475569",
                }}
              >
                WhatsApp
              </span>
            </div>
          </div>
        </>
      )}

      {/* ACTIONS DROPDOWN (fixed, so it never gets clipped by the table scroll) */}
      {actionMenu &&
        actionMenuRow && (
          <>
            {/* Click-outside to close */}
            <div
              onClick={() => {
                setActionMenu(null);
                setShareMenu(null);
              }}
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 55,
              }}
            />
            <div
              ref={actionMenuRef}
              style={{
                position: "fixed",
                left: actionMenu.x,
                top: actionMenu.y,
                zIndex: 60,
                width: ACTION_MENU_WIDTH,
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "10px",
                boxShadow:
                  "0 8px 24px rgba(15,23,42,0.14)",
                padding: "6px",
              }}
            >
              {/* VIEW / EDIT */}
              <div
                onClick={() => {
                  setActionMenu(null);

                  navigate(
                    `/purchases/edit/${actionMenuRow.id}`
                  );
                }}
                style={{
                  ...menuItemStyle,
                  color: "#334155",
                }}
                onMouseEnter={(e) =>
                (e.currentTarget.style.background =
                  "#f1f5f9")
                }
                onMouseLeave={(e) =>
                (e.currentTarget.style.background =
                  "transparent")
                }
              >
                <Pencil
                  size={15}
                  style={{ color: "#2563eb" }}
                />
                View / Edit
              </div>

              {/* MAKE PAYMENT (submitted bills only) */}
              <div
                onClick={() => {
                  if (
                    actionMenuRow.status !== "draft" &&
                    Number(
                      actionMenuRow.balance_amount ||
                      0
                    ) > 0
                  ) {
                    setActionMenu(null);

                    openPayModal(actionMenuRow);
                  }
                }}
                title={
                  actionMenuRow.status === "draft"
                    ? "Draft purchases have no pending balance"
                    : "Record a payment against this purchase"
                }
                style={{
                  ...menuItemStyle,
                  color:
                    actionMenuRow.status !== "draft" &&
                      Number(
                        actionMenuRow.balance_amount ||
                        0
                      ) > 0
                      ? "#334155"
                      : "#94a3b8",
                  opacity:
                    actionMenuRow.status !== "draft" &&
                      Number(
                        actionMenuRow.balance_amount ||
                        0
                      ) > 0
                      ? 1
                      : 0.45,
                  cursor:
                    actionMenuRow.status !== "draft" &&
                      Number(
                        actionMenuRow.balance_amount ||
                        0
                      ) > 0
                      ? "pointer"
                      : "not-allowed",
                }}
                onMouseEnter={(e) =>
                (actionMenuRow.status !== "draft" &&
                  Number(
                    actionMenuRow.balance_amount ||
                    0
                  ) > 0
                  ? (e.currentTarget.style.background =
                    "#f1f5f9")
                  : null)
                }
                onMouseLeave={(e) =>
                (e.currentTarget.style.background =
                  "transparent")
                }
              >
                <CreditCard
                  size={15}
                  style={{ color: "#10b981" }}
                />
                Make Payment
              </div>

              {/* CONVERT TO RETURN */}
              <div
                onClick={() => {
                  setActionMenu(null);

                  navigate(
                    `/purchases/debit-note/add?purchase_id=${actionMenuRow.id}`
                  );
                }}
                style={{
                  ...menuItemStyle,
                  color: "#334155",
                }}
                onMouseEnter={(e) =>
                (e.currentTarget.style.background =
                  "#f1f5f9")
                }
                onMouseLeave={(e) =>
                (e.currentTarget.style.background =
                  "transparent")
                }
              >
                <Undo2
                  size={15}
                  style={{ color: "#f59e0b" }}
                />
                Convert To Return
              </div>

              {/* DELETE */}
              <div
                onClick={() => {
                  confirmDelete(actionMenuRow);
                }}
                title="Delete this purchase"
                style={{
                  ...menuItemStyle,
                  color: "#e11d48",
                  opacity: 1,
                  cursor: "pointer",
                }}
                onMouseEnter={(e) =>
                (e.currentTarget.style.background =
                  "#f1f5f9")
                }
                onMouseLeave={(e) =>
                (e.currentTarget.style.background =
                  "transparent")
                }
              >
                <Trash2
                  size={15}
                  style={{ color: "#e11d48" }}
                />
                Delete
              </div>

              {/* DUPLICATE */}
              <div
                onClick={() =>
                  duplicatePurchaseRow(actionMenuRow)
                }
                style={{
                  ...menuItemStyle,
                  color: "#334155",
                }}
                onMouseEnter={(e) =>
                (e.currentTarget.style.background =
                  "#f1f5f9")
                }
                onMouseLeave={(e) =>
                (e.currentTarget.style.background =
                  "transparent")
                }
              >
                <Copy
                  size={15}
                  style={{ color: "#64748b" }}
                />
                Duplicate
              </div>

              {/* OPEN PDF */}
              <div
                onClick={() =>
                  openPurchasePdf(actionMenuRow)
                }
                style={{
                  ...menuItemStyle,
                  color: "#334155",
                }}
                onMouseEnter={(e) =>
                (e.currentTarget.style.background =
                  "#f1f5f9")
                }
                onMouseLeave={(e) =>
                (e.currentTarget.style.background =
                  "transparent")
                }
              >
                <FileText
                  size={15}
                  style={{ color: "#2563eb" }}
                />
                Open PDF
              </div>

              {/* PREVIEW */}
              <div
                onClick={() => openPreview(actionMenuRow)}
                style={{
                  ...menuItemStyle,
                  color: "#334155",
                }}
                onMouseEnter={(e) =>
                (e.currentTarget.style.background =
                  "#f1f5f9")
                }
                onMouseLeave={(e) =>
                (e.currentTarget.style.background =
                  "transparent")
                }
              >
                <Eye
                  size={15}
                  style={{ color: "#0891b2" }}
                />
                Preview
              </div>

              {/* PRINT */}
              <div
                onClick={() =>
                  printPurchase(actionMenuRow)
                }
                style={{
                  ...menuItemStyle,
                  color: "#334155",
                }}
                onMouseEnter={(e) =>
                (e.currentTarget.style.background =
                  "#f1f5f9")
                }
                onMouseLeave={(e) =>
                (e.currentTarget.style.background =
                  "transparent")
                }
              >
                <Printer
                  size={15}
                  style={{ color: "#7c3aed" }}
                />
                Print
              </div>

              {/* VIEW HISTORY */}
              <div
                onClick={() => openHistory(actionMenuRow)}
                style={{
                  ...menuItemStyle,
                  color: "#334155",
                }}
                onMouseEnter={(e) =>
                (e.currentTarget.style.background =
                  "#f1f5f9")
                }
                onMouseLeave={(e) =>
                (e.currentTarget.style.background =
                  "transparent")
                }
              >
                <History
                  size={15}
                  style={{ color: "#0d9488" }}
                />
                View History
              </div>
            </div>
          </>
        )}

      <style>{`
        * {
          box-sizing: border-box;
        }

        .pb-header {
          margin-bottom: 18px;
        }

        .pb-filter-card {
          transition: box-shadow 0.15s ease;
        }

        .pb-filter-card select,
        .pb-filter-card input {
          transition: border-color 0.15s ease,
                      box-shadow 0.15s ease;
        }

        .pb-filter-card select:focus,
        .pb-filter-card input:focus,
        .pb-search:focus {
          border-color: #94a3b8 !important;
          box-shadow: 0 0 0 2px rgba(37,99,235,0.06);
          outline: none;
        }

        .pb-table tbody tr:hover {
          background: #f8fbff !important;
        }

        .pb-icon-action:hover {
          color: #2563eb !important;
        }

        .pb-upload:hover {
          background: #fff7f8 !important;
        }

        .pb-add:hover {
          background: #e9153d !important;
        }

        .pb-summary-card {
          min-height: 88px;
        }

        .pb-date-input::-webkit-calendar-picker-indicator {
          opacity: 0.75;
          cursor: pointer;
        }

        .pb-scroll {
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
        }

        @media (max-width: 1050px) {
          .pb-header-actions {
            width: 100%;
            justify-content: flex-start !important;
          }

          .pb-filter-card {
            align-items: flex-start !important;
          }

          .pb-firm-control {
            margin-left: 0 !important;
          }
        }

        @media (max-width: 768px) {
          .purchase-bills-page {
            padding: 20px 14px 28px !important;
          }

          .pb-header {
            flex-direction: column !important;
          }

          .pb-header-actions {
            flex-wrap: wrap;
          }

          .pb-filter-card {
            flex-direction: column !important;
            align-items: stretch !important;
          }

          .pb-filter-item,
          .pb-firm-control {
            width: 100% !important;
            margin-left: 0 !important;
          }

          .pb-date-row {
            flex-wrap: wrap;
          }

          .pb-summary {
            flex-direction: column !important;
            align-items: stretch !important;
          }

          .pb-summary-card {
            max-width: none !important;
            width: 100%;
          }

          .pb-summary-symbol {
            transform: rotate(90deg);
          }

          .pb-search {
            width: 100% !important;
          }

          .pb-trans-header {
            align-items: stretch !important;
            flex-direction: column !important;
          }
        }

        @media print {
          body * {
            visibility: hidden;
          }

          #purchase-bills-print-area,
          #purchase-bills-print-area * {
            visibility: visible;
          }

          #purchase-bills-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20px;
          }

          .pb-no-print {
            display: none !important;
          }
        }

        @keyframes pb-spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div
        className="pb-header pb-no-print"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          gap: "20px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: "24px",
              lineHeight: "1.25",
              fontWeight: "800",
              color: "#17243a",
              letterSpacing: "-0.4px",
            }}
          >
            Purchase Bills
          </h1>

          <p
            style={{
              margin: "5px 0 0",
              fontSize: "13px",
              color: "#64748b",
            }}
          >
            Manage supplier purchase invoices, drafts & credit
            payments
          </p>
        </div>

        {/* HEADER ACTIONS */}
        <div
          className="pb-header-actions"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
          }}
        >
          {/* Upload */}
          <div
            style={{
              position: "relative",
            }}
          >
            <button
              className="pb-upload"
              onClick={() =>
                setUploadOpen((v) => !v)
              }
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "9px",
                height: "42px",
                padding: "0 14px",
                borderRadius: "9px",
                border:
                  "1px solid #ef233c",
                background: "#ffffff",
                color: "#ef233c",
                fontSize: "13px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              <Upload size={16} />

              <span>
                Upload Purchase Bills
              </span>

              <ChevronDown size={15} />
            </button>

            {uploadOpen && (
              <>
                <div
                  onClick={() =>
                    setUploadOpen(false)
                  }
                  style={{
                    position: "fixed",
                    inset: 0,
                    zIndex: 30,
                  }}
                />

                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    top: "calc(100% + 7px)",
                    zIndex: 40,
                    width: "245px",
                    background: "#fff",
                    border:
                      "1px solid #e2e8f0",
                    borderRadius: "10px",
                    boxShadow:
                      "0 10px 30px rgba(15,23,42,0.14)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    onClick={() => {
                      setUploadOpen(false);
                      navigate(
                        "/purchases/new"
                      );
                    }}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "10px",
                      padding: "13px 14px",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background =
                        "#f8fafc";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background =
                        "#ffffff";
                    }}
                  >
                    <FileText
                      size={17}
                      style={{
                        color: "#ef233c",
                        marginTop: "2px",
                      }}
                    />

                    <div>
                      <div
                        style={{
                          fontSize: "13px",
                          fontWeight: "600",
                          color: "#1e293b",
                        }}
                      >
                        Upload / New Purchase Bill
                      </div>

                      <div
                        style={{
                          marginTop: "3px",
                          fontSize: "11.5px",
                          lineHeight: "1.4",
                          color: "#64748b",
                        }}
                      >
                        Open the Add Purchase screen
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Add Purchase */}
          <button
            className="pb-add"
            onClick={() =>
              navigate("/purchases/new")
            }
            style={{
              height: "42px",
              display: "inline-flex",
              alignItems: "center",
              gap: "7px",
              padding: "0 16px",
              border: "none",
              borderRadius: "9px",
              background: "#ef233c",
              color: "#ffffff",
              fontSize: "13px",
              fontWeight: "700",
              cursor: "pointer",
              boxShadow:
                "0 3px 8px rgba(239,35,60,0.18)",
            }}
          >
            <Plus size={16} />
            Add Purchase
          </button>

          {/* Excel Report - Vyapar compact icon style */}
          <button
            className="pb-icon-action"
            title="Excel Report"
            onClick={exportToExcel}
            disabled={purchases.length === 0}
            style={{
              ...compactAction,
              color:
                purchases.length === 0
                  ? "#a8b2c1"
                  : "#3d6d8f",
              opacity:
                purchases.length === 0
                  ? 0.65
                  : 1,
            }}
          >
            <FileSpreadsheet size={22} />

            <span
              style={{
                fontSize: "10px",
                lineHeight: "1",
                whiteSpace: "nowrap",
              }}
            >
              Excel Report
            </span>
          </button>

          {/* Print - Vyapar compact icon style */}
          <button
            className="pb-icon-action"
            title="Print"
            onClick={handlePrint}
            style={{
              ...compactAction,
              color: "#53657b",
            }}
          >
            <Printer size={21} />

            <span
              style={{
                fontSize: "10px",
                lineHeight: "1",
              }}
            >
              Print
            </span>
          </button>
        </div>
      </div>

      {/* =====================================================
          FILTERS
      ===================================================== */}

      <div
        className="pb-filter-card pb-no-print"
        style={{
          ...cardShadow,
          padding: "13px 16px",
          marginBottom: "18px",
          display: "flex",
          alignItems: "flex-end",
          gap: "13px",
          flexWrap: "wrap",
        }}
      >
        {/* Period */}
        <div
          className="pb-filter-item"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "5px",
          }}
        >
          <label
            style={{
              fontSize: "10.5px",
              fontWeight: "700",
              color: "#64748b",
              textTransform: "uppercase",
            }}
          >
            Period
          </label>

          <select
            value={period}
            onChange={(e) =>
              handlePeriodChange(
                e.target.value
              )
            }
            style={{
              height: "40px",
              minWidth: "118px",
              padding: "0 10px",
              border:
                "1px solid #dce3ec",
              borderRadius: "9px",
              background: "#fff",
              color: "#334155",
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            {PERIODS.map((o) => (
              <option
                key={o.value}
                value={o.value}
              >
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {/* Between */}
        <div
          style={{
            height: "40px",
            display: "flex",
            alignItems: "center",
            color: "#94a3b8",
            fontSize: "13px",
            fontWeight: "600",
          }}
        >
          Between
        </div>

        {/* From */}
        <div
          className="pb-filter-item"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "5px",
          }}
        >
          <label
            style={{
              fontSize: "10.5px",
              fontWeight: "700",
              color: "#64748b",
              textTransform: "uppercase",
            }}
          >
            From Date
          </label>

          <div
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
            }}
          >
            <Calendar
              size={15}
              style={{
                position: "absolute",
                left: "10px",
                color: "#94a3b8",
                pointerEvents: "none",
              }}
            />

            <input
              className="pb-date-input"
              type="date"
              value={fromDate}
              onChange={(e) =>
                handleFromChange(
                  e.target.value
                )
              }
              style={{
                height: "40px",
                width: "166px",
                padding:
                  "0 10px 0 32px",
                border:
                  "1px solid #dce3ec",
                borderRadius: "9px",
                color: "#334155",
                background: "#fff",
                fontSize: "13px",
              }}
            />
          </div>
        </div>

        {/* To */}
        <div
          style={{
            height: "40px",
            display: "flex",
            alignItems: "center",
            color: "#94a3b8",
            fontSize: "13px",
            fontWeight: "600",
          }}
        >
          To
        </div>

        {/* To date */}
        <div
          className="pb-filter-item"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "5px",
          }}
        >
          <label
            style={{
              fontSize: "10.5px",
              fontWeight: "700",
              color: "#64748b",
              textTransform: "uppercase",
            }}
          >
            To Date
          </label>

          <div
            style={{
              position: "relative",
              display: "flex",
              alignItems: "center",
            }}
          >
            <Calendar
              size={15}
              style={{
                position: "absolute",
                left: "10px",
                color: "#94a3b8",
                pointerEvents: "none",
              }}
            />

            <input
              className="pb-date-input"
              type="date"
              value={toDate}
              onChange={(e) =>
                handleToChange(
                  e.target.value
                )
              }
              style={{
                height: "40px",
                width: "166px",
                padding:
                  "0 10px 0 32px",
                border:
                  "1px solid #dce3ec",
                borderRadius: "9px",
                color: "#334155",
                background: "#fff",
                fontSize: "13px",
              }}
            />
          </div>
        </div>

        {/* Firm */}
        <div
          className="pb-firm-control"
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "5px",
            marginLeft: "auto",
          }}
        >
          <label
            style={{
              fontSize: "10.5px",
              fontWeight: "700",
              color: "#64748b",
              textTransform: "uppercase",
            }}
          >
            Firm
          </label>

          <select
            value={companyFilter}
            onChange={(e) =>
              handleCompanyChange(
                e.target.value
              )
            }
            style={{
              height: "40px",
              minWidth: "170px",
              padding: "0 11px",
              border:
                "1px solid #dce3ec",
              borderRadius: "9px",
              background: "#fff",
              color: "#334155",
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            <option value="all">
              ALL FIRMS
            </option>

            {companies.map((c) => (
              <option
                key={c.id}
                value={String(c.id)}
              >
                {c.company_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* =====================================================
          SUMMARY
      ===================================================== */}

      <div
        className="pb-summary"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          marginBottom: "20px",
        }}
      >
        {/* PAID */}
        <div
          className="pb-summary-card"
          style={{
            flex: "1 1 200px",
            maxWidth: "270px",
            padding: "13px 16px",
            borderRadius: "9px",
            background: "#b8eee7",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              color: "#335c60",
              marginBottom: "3px",
            }}
          >
            Paid
          </div>

          <div
            style={{
              fontSize: "19px",
              fontWeight: "800",
              color: "#24515a",
            }}
          >
            {fmtMoney(paid)}
          </div>
        </div>

        <div
          className="pb-summary-symbol"
          style={{
            fontSize: "22px",
            fontWeight: "700",
            color: "#64748b",
            padding: "0 2px",
          }}
        >
          +
        </div>

        {/* UNPAID */}
        <div
          className="pb-summary-card"
          style={{
            flex: "1 1 200px",
            maxWidth: "270px",
            padding: "13px 16px",
            borderRadius: "9px",
            background: "#b9d8f8",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              color: "#365675",
              marginBottom: "3px",
            }}
          >
            Unpaid
          </div>

          <div
            style={{
              fontSize: "19px",
              fontWeight: "800",
              color: "#2c4b69",
            }}
          >
            {fmtMoney(unpaid)}
          </div>
        </div>

        <div
          className="pb-summary-symbol"
          style={{
            fontSize: "22px",
            fontWeight: "700",
            color: "#64748b",
            padding: "0 2px",
          }}
        >
          =
        </div>

        {/* TOTAL */}
        <div
          className="pb-summary-card"
          style={{
            flex: "1 1 200px",
            maxWidth: "270px",
            padding: "13px 16px",
            borderRadius: "9px",
            background: "#f7c67e",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              color: "#725331",
              marginBottom: "3px",
            }}
          >
            Total
          </div>

          <div
            style={{
              fontSize: "19px",
              fontWeight: "800",
              color: "#5f462d",
            }}
          >
            {fmtMoney(total)}
          </div>
        </div>
      </div>

      {/* =====================================================
          TRANSACTIONS
      ===================================================== */}

      <div
        id="purchase-bills-print-area"
        style={{
          ...cardShadow,
          overflow: "hidden",
        }}
      >
        {/* Transaction Header */}
        <div
          className="pb-trans-header"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "15px",
            padding: "14px 16px",
            borderBottom:
              "1px solid #e3e8ef",
          }}
        >
          <div>
            <h4
              style={{
                margin: 0,
                fontSize: "15px",
                fontWeight: "700",
                color: "#26364d",
              }}
            >
              TRANSACTIONS
            </h4>

            <p
              style={{
                margin: "3px 0 0",
                fontSize: "11.5px",
                color: "#94a3b8",
              }}
            >
              {filtered.length} bill
              {filtered.length === 1
                ? ""
                : "s"}
            </p>
          </div>

          {/* Search */}
          <div
            className="pb-no-print"
            style={{
              position: "relative",
            }}
          >
            <Search
              size={15}
              style={{
                position: "absolute",
                left: "11px",
                top: "50%",
                transform:
                  "translateY(-50%)",
                color: "#94a3b8",
              }}
            />

            <input
              className="pb-search"
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) =>
                setSearch(
                  e.target.value
                )
              }
              style={{
                height: "40px",
                width: "240px",
                padding:
                  "0 12px 0 34px",
                border:
                  "1px solid #dce3ec",
                borderRadius: "9px",
                background: "#fff",
                fontSize: "13px",
                color: "#334155",
              }}
            />
          </div>
        </div>

        {/* Table */}
        <div className="pb-scroll">
          <table
            className="pb-table"
            style={{
              width: "100%",
              minWidth: "900px",
              borderCollapse:
                "collapse",
              textAlign: "left",
            }}
          >
            <thead>
              <tr
                style={{
                  background:
                    "#f7f9fc",
                  borderBottom:
                    "1px solid #dfe5ed",
                }}
              >
                {COLUMNS.map((c) => (
                  <th
                    key={c.key}
                    style={{
                      padding:
                        "11px 16px",
                      fontSize:
                        "10.5px",
                      fontWeight: "700",
                      color: "#64748b",
                      whiteSpace:
                        "nowrap",
                      letterSpacing:
                        "0.025em",
                    }}
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {/* LOADING */}
              {loading ? (
                <tr>
                  <td
                    colSpan={
                      COLUMNS.length
                    }
                    style={{
                      padding:
                        "45px 20px",
                      textAlign:
                        "center",
                      color: "#94a3b8",
                      fontSize:
                        "13px",
                    }}
                  >
                    Loading purchase bills...
                  </td>
                </tr>
              ) : error ? (
                /* ERROR */
                <tr>
                  <td
                    colSpan={
                      COLUMNS.length
                    }
                    style={{
                      padding:
                        "45px 20px",
                      textAlign:
                        "center",
                    }}
                  >
                    <div
                      style={{
                        color:
                          "#64748b",
                        marginBottom:
                          "10px",
                        fontSize:
                          "13px",
                      }}
                    >
                      Unable to load purchase
                      bills. Please try again.
                    </div>

                    <button
                      onClick={retry}
                      className="pb-no-print"
                      style={{
                        border: "none",
                        borderRadius:
                          "7px",
                        padding:
                          "8px 16px",
                        background:
                          "#2563eb",
                        color: "#fff",
                        cursor:
                          "pointer",
                        fontSize:
                          "12px",
                        fontWeight:
                          "600",
                      }}
                    >
                      Retry
                    </button>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                /* EMPTY */
                <tr>
                  <td
                    colSpan={
                      COLUMNS.length
                    }
                    style={{
                      padding:
                        "50px 20px",
                      textAlign:
                        "center",
                      color: "#94a3b8",
                      fontSize:
                        "13px",
                    }}
                  >
                    No purchase bills found
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const isDraft =
                    p.status ===
                    "draft";

                  const isPaidFully =
                    Number(
                      p.balance_amount ||
                      0
                    ) <= 0;

                  return (
                    <tr
                      key={p.id}
                      style={{
                        borderBottom:
                          "1px solid #eef2f6",
                        transition:
                          "background 0.15s",
                      }}
                    >
                      {/* DATE */}
                      <td
                        style={{
                          padding:
                            "13px 16px",
                          fontSize:
                            "12.5px",
                          color:
                            "#334155",
                          whiteSpace:
                            "nowrap",
                        }}
                      >
                        {displayDate(
                          p.purchase_date
                        )}
                      </td>

                      {/* INVOICE */}
                      <td
                        style={{
                          padding:
                            "13px 16px",
                          fontSize:
                            "12.5px",
                          fontWeight:
                            "600",
                          color:
                            "#24364d",
                          whiteSpace:
                            "nowrap",
                        }}
                      >
                        {p.purchase_no ||
                          "-"}
                      </td>

                      {/* PARTY */}
                      <td
                        style={{
                          padding:
                            "13px 16px",
                          fontSize:
                            "12.5px",
                          color:
                            "#475569",
                        }}
                      >
                        {p.supplier_name ||
                          "-"}
                      </td>

                      {/* TRANSACTION */}
                      <td
                        style={{
                          padding:
                            "13px 16px",
                          fontSize:
                            "12.5px",
                          whiteSpace:
                            "nowrap",
                        }}
                      >
                        <span
                          style={{
                            display:
                              "inline-flex",
                            alignItems:
                              "center",
                            padding:
                              "4px 10px",
                            borderRadius:
                              "20px",
                            fontSize:
                              "11px",
                            fontWeight:
                              "600",
                            background:
                              isDraft
                                ? "#fff1cc"
                                : "#d8f7e5",
                            color:
                              isDraft
                                ? "#9a6700"
                                : "#087443",
                          }}
                        >
                          {txLabel(
                            p.status
                          )}
                        </span>
                      </td>

                      {/* PAYMENT TYPE */}
                      <td
                        style={{
                          padding:
                            "13px 16px",
                          fontSize:
                            "12.5px",
                          color:
                            "#64748b",
                          whiteSpace:
                            "nowrap",
                        }}
                      >
                        {p.payment_type ||
                          "-"}
                      </td>

                      {/* AMOUNT */}
                      <td
                        style={{
                          padding:
                            "13px 16px",
                          fontSize:
                            "12.5px",
                          fontWeight:
                            "700",
                          color:
                            "#17243a",
                          whiteSpace:
                            "nowrap",
                          textAlign:
                            "right",
                        }}
                      >
                        {fmtMoney(
                          p.total_amount
                        )}
                      </td>

                      {/* BALANCE */}
                      <td
                        style={{
                          padding:
                            "13px 16px",
                          fontSize:
                            "12.5px",
                          fontWeight:
                            "600",
                          color:
                            isPaidFully
                              ? "#047857"
                              : "#e11d48",
                          whiteSpace:
                            "nowrap",
                          textAlign:
                            "right",
                        }}
                      >
                        {fmtMoney(
                          p.balance_amount
                        )}
                      </td>

                      {/* ACTIONS */}
                      <td
                        className="pb-no-print"
                        style={{
                          padding:
                            "10px 16px",
                          whiteSpace:
                            "nowrap",
                        }}
                      >
                        <div
                          style={{
                            display:
                              "flex",
                            alignItems:
                              "center",
                            gap: "5px",
                          }}
                        >
                          <button
                            data-share-trigger
                            data-purchase-id={p.id}
                            title="Share"
                            aria-label="Share purchase"
                            onClick={(e) =>
                              toggleShareMenu(e, p)
                            }
                            style={{
                              width:
                                "31px",
                              height:
                                "31px",
                              display:
                                "inline-flex",
                              alignItems:
                                "center",
                              justifyContent:
                                "center",
                              border:
                                "1px solid #dce3ec",
                              borderRadius:
                                "7px",
                              background:
                                "#fff",
                              color:
                                "#2563eb",
                              cursor:
                                "pointer",
                            }}
                          >
                            <Share2 size={15} />
                          </button>

                          {/* THREE DOT MENU */}
                          <button
                            data-action-trigger
                            data-purchase-id={p.id}
                            title="More actions"
                            onClick={(e) =>
                              toggleActionMenu(
                                e,
                                p
                              )
                            }
                            style={{
                              width:
                                "31px",
                              height:
                                "31px",
                              display:
                                "inline-flex",
                              alignItems:
                                "center",
                              justifyContent:
                                "center",
                              border:
                                "1px solid #dce3ec",
                              borderRadius:
                                "7px",
                              background:
                                "#fff",
                              color:
                                "#3b4a5f",
                              cursor:
                                "pointer",
                            }}
                          >
                            <MoreVertical
                              size={15}
                            />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* =====================================================
          PAYMENT MODAL
      ===================================================== */}

      <AddPaymentOutModal
        isOpen={!!payOutSupplier}
        onClose={() => setPayOutSupplier(null)}
        onSuccess={() => {
          setPayOutSupplier(null);
          retry();
        }}
        initialSupplier={payOutSupplier}
      />

      {/* =====================================================
          DELETE CONFIRM MODAL (styled, replaces window.confirm)
      ===================================================== */}
      {deleteTarget && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 110,
            background:
              "rgba(15,23,42,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
        >
          <div
            className="pb-no-print"
            style={{
              width: "100%",
              maxWidth: "400px",
              background: "#fff",
              borderRadius: "14px",
              overflow: "hidden",
              boxShadow:
                "0 20px 50px rgba(15,23,42,0.25)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent:
                  "space-between",
                padding: "15px 18px",
                borderBottom:
                  "1px solid #e2e8f0",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: "16px",
                  fontWeight: "700",
                  color: "#17243a",
                }}
              >
                Delete Purchase
              </h3>

              <button
                onClick={() =>
                  setDeleteTarget(null)
                }
                disabled={!!deletingId}
                style={{
                  border: "none",
                  background:
                    "transparent",
                  color: "#64748b",
                  cursor: "pointer",
                }}
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
              <strong>
                {deleteTarget.purchase_no ||
                  `#${deleteTarget.id}`}
              </strong>
              ?
              <div
                style={{
                  marginTop: "6px",
                  fontSize: "12.5px",
                  color: "#94a3b8",
                }}
              >
                The draft purchase record and its
                item lines will be permanently
                removed.
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent:
                  "flex-end",
                gap: "9px",
                padding: "0 20px 20px",
              }}
            >
              <button
                onClick={() =>
                  setDeleteTarget(null)
                }
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
                  <Loader2
                    size={14}
                    style={{
                      animation:
                        "pb-spin 1s linear infinite",
                    }}
                  />
                )}
                {deletingId
                  ? "Deleting..."
                  : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          PREVIEW MODAL
      ===================================================== */}
      {(previewLoading ||
        previewDetail ||
        previewError) && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 110,
              background:
                "rgba(15,23,42,0.45)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "16px",
            }}
          >
            <div
              className="pb-no-print"
              style={{
                width: "min(96vw, 860px)",
                maxHeight: "90vh",
                background: "#fff",
                borderRadius: "14px",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                boxShadow:
                  "0 20px 50px rgba(15,23,42,0.25)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent:
                    "space-between",
                  padding: "13px 18px",
                  borderBottom:
                    "1px solid #e2e8f0",
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    fontSize: "15px",
                    fontWeight: "700",
                    color: "#17243a",
                  }}
                >
                  Preview &nbsp;•&nbsp;
                  {previewDetail?.purchase_no || "-"}
                </h3>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  {previewDetail && (
                    <button
                      onClick={() => {
                        const el =
                          document.getElementById(
                            "preview-purchase-document"
                          );

                        if (el) printElement(el);
                      }}
                      title="Print this purchase"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "5px",
                        border:
                          "1px solid #dce3ec",
                        borderRadius: "8px",
                        padding: "6px 11px",
                        background: "#fff",
                        color: "#7c3aed",
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
                    }}
                    disabled={previewLoading}
                    style={{
                      border: "none",
                      background:
                        "transparent",
                      color: "#64748b",
                      cursor: "pointer",
                    }}
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div
                style={{
                  overflow: "auto",
                  padding: "20px",
                  background: "#f1f5f9",
                  flex: 1,
                }}
              >
                {previewLoading ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent:
                        "center",
                      gap: "10px",
                      padding: "60px 0",
                      color: "#64748b",
                      fontSize: "13.5px",
                      fontWeight: "600",
                    }}
                  >
                    <Loader2
                      size={18}
                      style={{
                        animation:
                          "pb-spin 1s linear infinite",
                        color: "#2563eb",
                      }}
                    />
                    Loading purchase…
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
                    id="preview-purchase-document"
                    style={{
                      background: "#fff",
                      borderRadius: "6px",
                      border:
                        "1px solid #e2e8f0",
                      overflow: "hidden",
                    }}
                  >
                    <PurchaseDocument
                      purchase={previewDetail}
                      company={companyFor(
                        previewDetail
                      )}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      {/* =====================================================
          VIEW HISTORY MODAL (real payment records)
      ===================================================== */}
      {historyPurchase && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 110,
            background:
              "rgba(15,23,42,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
        >
          <div
            className="pb-no-print"
            style={{
              width: "min(92vw, 560px)",
              maxHeight: "88vh",
              background: "#fff",
              borderRadius: "14px",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              boxShadow:
                "0 20px 50px rgba(15,23,42,0.25)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent:
                  "space-between",
                padding: "15px 18px",
                borderBottom:
                  "1px solid #e2e8f0",
              }}
            >
              <div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: "16px",
                    fontWeight: "700",
                    color: "#17243a",
                  }}
                >
                  Payment History
                </h3>
                <div
                  style={{
                    marginTop: "2px",
                    fontSize: "12px",
                    color: "#64748b",
                  }}
                >
                  {historyPurchase.purchase_no ||
                    `#${historyPurchase.id}`}{" "}
                  ·{" "}
                  {historyPurchase.supplier_name ||
                    "-"}
                </div>
              </div>

              <button
                onClick={() =>
                  setHistoryPurchase(null)
                }
                style={{
                  border: "none",
                  background:
                    "transparent",
                  color: "#64748b",
                  cursor: "pointer",
                }}
              >
                <X size={18} />
              </button>
            </div>

            <div
              style={{
                overflow: "auto",
                flex: 1,
              }}
            >
              {historyLoading ? (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent:
                      "center",
                    gap: "10px",
                    padding: "50px 0",
                    color: "#64748b",
                    fontSize: "13.5px",
                    fontWeight: "600",
                  }}
                >
                  <Loader2
                    size={18}
                    style={{
                      animation:
                        "pb-spin 1s linear infinite",
                      color: "#0d9488",
                    }}
                  />
                  Loading payments…
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
              ) : historyList.length === 0 ? (
                <div
                  style={{
                    padding: "50px 20px",
                    textAlign: "center",
                    color: "#94a3b8",
                    fontSize: "13px",
                    fontWeight: "600",
                  }}
                >
                  No payments recorded yet
                </div>
              ) : (
                <table
                  style={{
                    width: "100%",
                    borderCollapse:
                      "collapse",
                    fontSize: "13px",
                  }}
                >
                  <thead>
                    <tr>
                      {[
                        "#",
                        "DATE",
                        "METHOD",
                        "AMOUNT",
                        "NOTES",
                      ].map((h, i) => (
                        <th
                          key={h}
                          style={{
                            padding:
                              "10px 16px",
                            textAlign:
                              i === 0
                                ? "center"
                                : "left",
                            background:
                              "#f8fafc",
                            fontSize:
                              "10.5px",
                            fontWeight: "700",
                            color: "#64748b",
                            textTransform:
                              "uppercase",
                            letterSpacing:
                              "0.03em",
                            whiteSpace:
                              "nowrap",
                          }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {historyList.map((pm, i) => (
                      <tr
                        key={pm.id || i}
                        style={{
                          borderBottom:
                            "1px solid #eef2f6",
                        }}
                      >
                        <td
                          style={{
                            padding: "10px 16px",
                            textAlign:
                              "center",
                            color: "#94a3b8",
                          }}
                        >
                          {i + 1}
                        </td>
                        <td
                          style={{
                            padding: "10px 16px",
                            whiteSpace:
                              "nowrap",
                            color: "#334155",
                            fontWeight: "600",
                          }}
                        >
                          {displayDate(
                            (pm.payment_date ||
                              "")
                              .split(" ")[0]
                          )}
                        </td>
                        <td
                          style={{
                            padding: "10px 16px",
                            color: "#475569",
                            textTransform:
                              "capitalize",
                          }}
                        >
                          {pm.payment_method ||
                            "-"}
                        </td>
                        <td
                          style={{
                            padding: "10px 16px",
                            textAlign:
                              "right",
                            fontWeight: "700",
                            color: "#0f766e",
                            whiteSpace:
                              "nowrap",
                          }}
                        >
                          {fmtMoney(pm.amount)}
                        </td>
                        <td
                          style={{
                            padding: "10px 16px",
                            color: "#64748b",
                          }}
                        >
                          {pm.notes || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          OFF-SCREEN PURCHASE used by Open PDF / Print
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
            id="row-action-purchase"
            style={{
              background: "#fff",
              width: "max-content",
              minWidth: 794,
              maxWidth: "none",
              overflow: "visible",
              boxSizing: "border-box",
            }}
          >
            <PurchaseDocument
              purchase={docAction.detail}
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
            boxShadow:
              "0 12px 30px rgba(15,23,42,0.18)",
            fontSize: 12.5,
            fontWeight: 600,
          }}
        >
          <Loader2
            size={17}
            color="#2563eb"
            style={{
              animation:
                "pb-spin 1s linear infinite",
            }}
          />
          <span style={{ color: "#334155" }}>
            {docBusyText}
          </span>
        </div>
      )}
    </div>
  );
}