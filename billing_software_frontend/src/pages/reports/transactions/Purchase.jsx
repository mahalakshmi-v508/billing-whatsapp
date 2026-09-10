import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../../services/api";
import * as XLSX from "xlsx";
import {
  Calendar,
  ChevronDown,
  CreditCard,
  Eye,
  FileSpreadsheet,
  FileText,
  MoreVertical,
  Pencil,
  Plus,
  Printer,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";

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
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    color="#25D366"
    aria-hidden="true"
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
  </svg>
);

export default function PurchaseList() {
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

  const [payPurchase, setPayPurchase] = useState(null);
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("cash");
  const [payDate, setPayDate] = useState(toInputDate(today()));
  const [payNotes, setPayNotes] = useState("");
  const [submittingPayment, setSubmittingPayment] = useState(false);

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
    setPayPurchase(p);
    setPayAmount("");
    setPayMethod("cash");
    setPayDate(toInputDate(today()));
    setPayNotes("");
  };

  const submitPayment = async (e) => {
    e.preventDefault();

    const amount = Number(payAmount);

    if (!amount || amount <= 0) {
      alert("Please enter a valid amount!");
      return;
    }

    if (
      amount >
      Number(payPurchase.balance_amount)
    ) {
      alert(
        `Payment amount cannot exceed the pending balance of ${fmtMoney(
          payPurchase.balance_amount
        )}`
      );

      return;
    }

    setSubmittingPayment(true);

    try {
      const res = await api.post(
        "/purchase/pay_purchase",
        {
          purchase_id: payPurchase.id,
          amount,
          payment_method: payMethod,
          payment_date: payDate,
          notes: payNotes,
        }
      );

      if (res.data.status) {
        alert("Payment recorded successfully");

        setPayPurchase(null);

        retry();
      } else {
        alert(
          res.data.message ||
            "Unable to record payment"
        );
      }
    } catch (err) {
      console.error(err);

      alert("Error recording payment");
    } finally {
      setSubmittingPayment(false);
    }
  };

  /* =========================================================
     DELETE
  ========================================================= */

  const handleDelete = async (p) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this draft purchase?"
      )
    ) {
      return;
    }

    try {
      const res = await api.post(
        "/purchase/delete_purchase",
        {
          id: p.id,
        }
      );

      if (res.data.status) {
        alert(
          res.data.message ||
            "Purchase draft deleted successfully"
        );

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
    }
  };

  /* =========================================================
     WHATSAPP SHARE + ACTION MENU
  ========================================================= */

  const sharePurchaseWhatsApp = (p) => {
    const message = [
      `Purchase Invoice: ${p.purchase_no || "-"}`,
      `Party: ${p.supplier_name || "-"}`,
      `Amount: ${fmtMoney(p.total_amount)}`,
      `Balance: ${fmtMoney(p.balance_amount)}`,
    ].join("\n");

    window.open(
      `https://wa.me/?text=${encodeURIComponent(message)}`,
      "_blank"
    );
  };

  const toggleActionMenu = (e, p) => {
    if (actionMenu && actionMenu.id === p.id) {
      setActionMenu(null);

      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();

    setActionMenu({
      id: p.id,
      x: rect.right,
      y: rect.bottom,
    });
  };

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
      `Purchase_Bills_${firmName}_${fromDate || "all"}_to_${
        toDate || "all"
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
      {/* ACTIONS DROPDOWN (fixed, so it never gets clipped by the table scroll) */}
      {actionMenu &&
        actionMenuRow && (
          <>
            {/* Click-outside to close */}
            <div
              onClick={() => setActionMenu(null)}
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 55,
              }}
            />
            <div
              style={{
                position: "fixed",
                left: actionMenu.x,
                top: actionMenu.y + 6,
                transform: "translateX(-100%)",
                zIndex: 60,
                minWidth: "150px",
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "10px",
                boxShadow:
                  "0 8px 24px rgba(15,23,42,0.14)",
                padding: "6px",
              }}
            >
              {/* VIEW */}
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
                <Eye
                  size={15}
                  style={{ color: "#475569" }}
                />
                View
              </div>

              {/* EDIT */}
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
                Edit
              </div>

              {/* DELETE (drafts only) */}
              {actionMenuRow.status === "draft" && (
                <div
                  onClick={() => {
                    setActionMenu(null);

                    handleDelete(actionMenuRow);
                  }}
                  style={{
                    ...menuItemStyle,
                    color: "#e11d48",
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
              )}

              {/* PAY (unpaid submitted bills only) */}
              {actionMenuRow.status !== "draft" &&
                Number(
                  actionMenuRow.balance_amount || 0
                ) > 0 && (
                  <div
                    onClick={() => {
                      setActionMenu(null);

                      openPayModal(actionMenuRow);
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
                    <CreditCard
                      size={15}
                      style={{ color: "#10b981" }}
                    />
                    Record Payment
                  </div>
                )}
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
                          {/* WHATSAPP SHARE */}
                          <button
                            title="Share on WhatsApp"
                            onClick={() =>
                              sharePurchaseWhatsApp(
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
                                "#25D366",
                              cursor:
                                "pointer",
                            }}
                          >
                            <WhatsAppIcon
                              size={15}
                            />
                          </button>

                          {/* THREE DOT MENU */}
                          <button
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

      {payPurchase && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
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
              maxWidth: "420px",
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
                padding:
                  "15px 18px",
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
                Record Payment
              </h3>

              <button
                onClick={() =>
                  setPayPurchase(null)
                }
                style={{
                  border: "none",
                  background:
                    "transparent",
                  color: "#64748b",
                  cursor:
                    "pointer",
                }}
              >
                <X size={18} />
              </button>
            </div>

            <form
              onSubmit={submitPayment}
              style={{
                padding: "20px",
                display: "flex",
                flexDirection:
                  "column",
                gap: "14px",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "13px",
                    color: "#334155",
                  }}
                >
                  {payPurchase.purchase_no}{" "}
                  ·{" "}
                  {payPurchase.supplier_name ||
                    "Party"}
                </div>

                <div
                  style={{
                    fontSize: "12.5px",
                    color: "#94a3b8",
                    marginTop:
                      "3px",
                  }}
                >
                  Balance outstanding:{" "}
                  <strong>
                    {fmtMoney(
                      payPurchase.balance_amount
                    )}
                  </strong>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection:
                    "column",
                  gap: "6px",
                }}
              >
                <label
                  style={{
                    fontSize: "12px",
                    fontWeight: "700",
                    color: "#475569",
                  }}
                >
                  Amount (₹)
                </label>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder={Number(
                    payPurchase.balance_amount
                  ).toFixed(2)}
                  value={payAmount}
                  onChange={(e) =>
                    setPayAmount(
                      e.target.value
                    )
                  }
                  style={{
                    padding:
                      "10px 12px",
                    border:
                      "1px solid #dce3ec",
                    borderRadius:
                      "8px",
                    fontSize:
                      "14px",
                    outline:
                      "none",
                  }}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection:
                    "column",
                  gap: "6px",
                }}
              >
                <label
                  style={{
                    fontSize: "12px",
                    fontWeight: "700",
                    color: "#475569",
                  }}
                >
                  Payment Method
                </label>

                <select
                  value={payMethod}
                  onChange={(e) =>
                    setPayMethod(
                      e.target.value
                    )
                  }
                  style={{
                    padding:
                      "10px 12px",
                    border:
                      "1px solid #dce3ec",
                    borderRadius:
                      "8px",
                    fontSize:
                      "14px",
                    background:
                      "#fff",
                    outline:
                      "none",
                  }}
                >
                  <option value="cash">
                    Cash
                  </option>
                  <option value="bank">
                    Bank Transfer
                  </option>
                  <option value="upi">
                    UPI
                  </option>
                  <option value="card">
                    Card
                  </option>
                  <option value="cheque">
                    Cheque
                  </option>
                </select>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection:
                    "column",
                  gap: "6px",
                }}
              >
                <label
                  style={{
                    fontSize: "12px",
                    fontWeight: "700",
                    color: "#475569",
                  }}
                >
                  Payment Date
                </label>

                <div
                  style={{
                    position:
                      "relative",
                    display:
                      "flex",
                    alignItems:
                      "center",
                  }}
                >
                  <Calendar
                    size={15}
                    style={{
                      position:
                        "absolute",
                      left: "10px",
                      color:
                        "#94a3b8",
                    }}
                  />

                  <input
                    type="date"
                    value={payDate}
                    onChange={(e) =>
                      setPayDate(
                        e.target.value
                      )
                    }
                    style={{
                      width: "100%",
                      padding:
                        "10px 10px 10px 32px",
                      border:
                        "1px solid #dce3ec",
                      borderRadius:
                        "8px",
                      fontSize:
                        "14px",
                      outline:
                        "none",
                    }}
                  />
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection:
                    "column",
                  gap: "6px",
                }}
              >
                <label
                  style={{
                    fontSize: "12px",
                    fontWeight: "700",
                    color: "#475569",
                  }}
                >
                  Notes (optional)
                </label>

                <input
                  value={payNotes}
                  onChange={(e) =>
                    setPayNotes(
                      e.target.value
                    )
                  }
                  placeholder="Reference / remark"
                  style={{
                    padding:
                      "10px 12px",
                    border:
                      "1px solid #dce3ec",
                    borderRadius:
                      "8px",
                    fontSize:
                      "14px",
                    outline:
                      "none",
                  }}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "flex-end",
                  gap: "9px",
                  marginTop:
                    "4px",
                }}
              >
                <button
                  type="button"
                  onClick={() =>
                    setPayPurchase(null)
                  }
                  style={{
                    border: "none",
                    borderRadius:
                      "8px",
                    padding:
                      "9px 16px",
                    background:
                      "#f1f5f9",
                    color:
                      "#475569",
                    fontSize:
                      "13px",
                    fontWeight:
                      "600",
                    cursor:
                      "pointer",
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    submittingPayment
                  }
                  style={{
                    border: "none",
                    borderRadius:
                      "8px",
                    padding:
                      "9px 16px",
                    background:
                      "#10b981",
                    color:
                      "#fff",
                    fontSize:
                      "13px",
                    fontWeight:
                      "600",
                    cursor:
                      "pointer",
                    opacity:
                      submittingPayment
                        ? 0.6
                        : 1,
                  }}
                >
                  {submittingPayment
                    ? "Saving..."
                    : "Save Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}