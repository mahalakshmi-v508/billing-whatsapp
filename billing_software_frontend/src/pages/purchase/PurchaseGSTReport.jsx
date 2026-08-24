import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { ArrowLeft, Download, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import * as XLSX from "xlsx";

export default function PurchaseGSTReport() {
  const navigate = useNavigate();
  const [purchases, setPurchases] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(
    localStorage.getItem("selected_company_id") || ""
  );
  const [loading, setLoading] = useState(true);

  // Defaults: start of current month to today
  const getFirstDayOfMonth = () => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split("T")[0];
  };
  const getToday = () => new Date().toISOString().split("T")[0];

  const [startDate, setStartDate] = useState(getFirstDayOfMonth());
  const [endDate, setEndDate] = useState(getToday());
  const [showGstOnly, setShowGstOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [showGstOnly, purchases]);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) return;

    api.get(`/company/get_companies_by_admin?admin_id=${user.id}`)
      .then(res => {
        if (res.data.status) {
          setCompanies(res.data.data);
          const savedId = localStorage.getItem("selected_company_id");
          if (savedId) {
            fetchReport(savedId, startDate, endDate);
          } else {
            setLoading(false);
          }
        } else {
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
  }, []);

  const fetchReport = async (companyId, start, end) => {
    setLoading(true);
    try {
      const res = await api.get(
        `/purchase/get_purchases?company_id=${companyId}&start_date=${start}&end_date=${end}&status=submitted`
      );
      if (res.data.status) {
        setPurchases(res.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCompanyChange = (companyId) => {
    setSelectedCompany(companyId);
    localStorage.setItem("selected_company_id", companyId);
    fetchReport(companyId, startDate, endDate);
  };

  const handleSearch = () => {
    if (selectedCompany) {
      fetchReport(selectedCompany, startDate, endDate);
    }
  };

  // Filter purchases if showGstOnly is active
  const filteredPurchases = showGstOnly
    ? purchases.filter(p => p.supplier_gstin && p.supplier_gstin.trim() !== "" && p.supplier_gstin.toLowerCase() !== "n/a")
    : purchases;

  // Export to Excel
  const exportToExcel = () => {
    if (filteredPurchases.length === 0) {
      alert("No data available to export");
      return;
    }

    const companyName = companies.find(c => Number(c.id) === Number(selectedCompany))?.company_name || "Company";

    const data = filteredPurchases.map((p, index) => {
      const taxable = Number(p.sub_total);
      const gst = Number(p.gst_total);
      // Assume CGST & SGST are 50% each of total GST
      const cgst = gst / 2;
      const sgst = gst / 2;

      return {
        "Sl No": index + 1,
        "Purchase Date": p.purchase_date,
        "Supplier Invoice No": p.purchase_no || "N/A",
        "Supplier Name": p.supplier_name || "Unknown",
        "Supplier GSTIN": p.supplier_gstin || "N/A",
        "Taxable Value (₹)": taxable,
        "CGST (₹)": cgst,
        "SGST (₹)": sgst,
        "Total GST (₹)": gst,
        "Total Bill Amount (₹)": Number(p.total_amount)
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "GST Purchase Report");

    // Add totals row
    const totalTaxable = filteredPurchases.reduce((sum, p) => sum + Number(p.sub_total), 0);
    const totalGst = filteredPurchases.reduce((sum, p) => sum + Number(p.gst_total), 0);
    const totalAmount = filteredPurchases.reduce((sum, p) => sum + Number(p.total_amount), 0);

    XLSX.utils.sheet_add_aoa(worksheet, [
      [],
      ["Total", "", "", "", "", totalTaxable, totalGst / 2, totalGst / 2, totalGst, totalAmount]
    ], { origin: -1 });

    XLSX.writeFile(workbook, `Purchase_GST_Report_${companyName}_${startDate}_to_${endDate}.xlsx`);
  };

  // Calculations
  const totalTaxable = filteredPurchases.reduce((sum, p) => sum + Number(p.sub_total), 0);
  const totalGst = filteredPurchases.reduce((sum, p) => sum + Number(p.gst_total), 0);
  const totalBillAmount = filteredPurchases.reduce((sum, p) => sum + Number(p.total_amount), 0);

  // Pagination Calculations
  const ITEMS_PER_PAGE = 15;
  const totalPages = Math.ceil(filteredPurchases.length / ITEMS_PER_PAGE);
  const safePage = Math.min(currentPage, totalPages || 1);
  const indexOfLast = safePage * ITEMS_PER_PAGE;
  const indexOfFirst = indexOfLast - ITEMS_PER_PAGE;
  const paginatedPurchases = filteredPurchases.slice(indexOfFirst, indexOfLast);

  return (
    <div style={{ padding: "30px", background: "#f8fafc", minHeight: "100vh" }}>
      <style>{`
        .sl-page-btn {
          width: 34px;
          height: 34px;
          border-radius: 9px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1.5px solid #e2e8f0;
          background: #fff;
          color: #64748b;
          cursor: pointer;
          font-weight: 600;
          transition: .2s;
        }

        .sl-page-btn:hover:not(:disabled) {
          background: #eff6ff;
          color: #2563eb;
          border-color: #3b82f6;
        }

        .sl-page-btn:disabled {
          opacity: .4;
          cursor: not-allowed;
        }

        .sl-page-btn.active {
          background: linear-gradient(135deg,#1d4ed8,#3b82f6);
          color: #fff;
          border: none;
        }
      `}</style>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "25px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
          <button
            onClick={() => navigate("/purchases")}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "40px",
              height: "40px",
              borderRadius: "12px",
              background: "#ffffff",
              border: "1.5px solid #e2e8f0",
              cursor: "pointer",
              color: "#475569"
            }}
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 style={{ fontSize: "28px", fontWeight: "800", color: "#0f172a", margin: 0 }}>GST Purchase Report</h1>
            <p style={{ fontSize: "14px", color: "#64748b", marginTop: "4px" }}>Generate GSTR-2 details for outward inputs and GST filing</p>
          </div>
        </div>
        <button
          onClick={exportToExcel}
          disabled={purchases.length === 0}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 18px",
            borderRadius: "12px",
            background: purchases.length === 0 ? "#cbd5e1" : "#10b981",
            color: "#ffffff",
            border: "none",
            fontSize: "14px",
            fontWeight: "600",
            cursor: purchases.length === 0 ? "not-allowed" : "pointer",
            boxShadow: purchases.length === 0 ? "none" : "0 4px 12px rgba(16,185,129,0.2)"
          }}
        >
          <Download size={16} /> Export Excel
        </button>
      </div>

      {/* Company Selector Buttons */}
      <div style={{ marginBottom: "24px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
          {companies.map((c) => {
            const isActive = Number(selectedCompany) === Number(c.id);
            return (
              <button
                key={c.id}
                onClick={() => handleCompanyChange(c.id)}
                style={{
                  padding: "10px 20px",
                  borderRadius: "12px",
                  fontSize: "13.5px",
                  fontWeight: "600",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  border: isActive ? "2px solid #2563eb" : "1.5px solid #e2e8f0",
                  backgroundColor: isActive ? "#2563eb" : "#ffffff",
                  color: isActive ? "#ffffff" : "#475569",
                  boxShadow: isActive ? "0 4px 12px rgba(37,99,235,0.25)" : "0 1px 4px rgba(0,0,0,0.06)",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px"
                }}
              >
                <span>🏢</span> {c.company_name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Date Filters bar */}
      <div style={{ background: "#ffffff", padding: "20px", borderRadius: "16px", border: "1px solid #e2e8f0", marginBottom: "25px", display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: "20px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label style={{ fontSize: "12px", fontWeight: "700", color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em" }}>Start Date</label>
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <Calendar size={16} style={{ position: "absolute", left: "12px", color: "#64748b" }} />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{
                padding: "10px 12px 10px 36px",
                border: "1.5px solid #e2e8f0",
                borderRadius: "10px",
                fontSize: "14px",
                outline: "none",
                color: "#334155"
              }}
            />
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <label style={{ fontSize: "12px", fontWeight: "700", color: "#475569", textTransform: "uppercase", letterSpacing: "0.05em" }}>End Date</label>
          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
            <Calendar size={16} style={{ position: "absolute", left: "12px", color: "#64748b" }} />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{
                padding: "10px 12px 10px 36px",
                border: "1.5px solid #e2e8f0",
                borderRadius: "10px",
                fontSize: "14px",
                outline: "none",
                color: "#334155"
              }}
            />
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px", height: "42px", paddingBottom: "2px" }}>
          <input
            type="checkbox"
            id="gstToggle"
            checked={showGstOnly}
            onChange={(e) => setShowGstOnly(e.target.checked)}
            style={{
              width: "18px",
              height: "18px",
              cursor: "pointer",
              accentColor: "#2563eb"
            }}
          />
          <label
            htmlFor="gstToggle"
            style={{
              fontSize: "14px",
              fontWeight: "600",
              color: "#475569",
              cursor: "pointer",
              userSelect: "none"
            }}
          >
            GSTIN Only
          </label>
        </div>

        <button
          onClick={handleSearch}
          style={{
            padding: "11px 24px",
            borderRadius: "10px",
            background: "#2563eb",
            color: "#ffffff",
            border: "none",
            fontSize: "14px",
            fontWeight: "600",
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(37,99,235,0.15)"
          }}
        >
          Generate Report
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "20px", marginBottom: "25px" }}>
        <div style={{ background: "#ffffff", padding: "20px", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
          <p style={{ fontSize: "13px", fontWeight: "600", color: "#64748b", margin: 0, textTransform: "uppercase" }}>Total Taxable Value</p>
          <h3 style={{ fontSize: "24px", fontWeight: "800", color: "#0f172a", margin: "8px 0 0" }}>₹{totalTaxable.toFixed(2)}</h3>
        </div>
        <div style={{ background: "#ffffff", padding: "20px", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
          <p style={{ fontSize: "13px", fontWeight: "600", color: "#64748b", margin: 0, textTransform: "uppercase" }}>CGST Total (50%)</p>
          <h3 style={{ fontSize: "24px", fontWeight: "800", color: "#3b82f6", margin: "8px 0 0" }}>₹{(totalGst / 2).toFixed(2)}</h3>
        </div>
        <div style={{ background: "#ffffff", padding: "20px", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
          <p style={{ fontSize: "13px", fontWeight: "600", color: "#64748b", margin: 0, textTransform: "uppercase" }}>SGST Total (50%)</p>
          <h3 style={{ fontSize: "24px", fontWeight: "800", color: "#6366f1", margin: "8px 0 0" }}>₹{(totalGst / 2).toFixed(2)}</h3>
        </div>
        <div style={{ background: "#ffffff", padding: "20px", borderRadius: "16px", border: "1px solid #e2e8f0", boxShadow: "0 2px 4px rgba(0,0,0,0.02)" }}>
          <p style={{ fontSize: "13px", fontWeight: "600", color: "#64748b", margin: 0, textTransform: "uppercase" }}>Total Bill Amount</p>
          <h3 style={{ fontSize: "24px", fontWeight: "800", color: "#10b981", margin: "8px 0 0" }}>₹{totalBillAmount.toFixed(2)}</h3>
        </div>
      </div>

      {/* Report Table */}
      <div style={{ background: "#ffffff", borderRadius: "20px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
              <th style={{ padding: "16px 20px", fontSize: "13px", fontWeight: "700", color: "#64748b" }}>Date</th>
              <th style={{ padding: "16px 20px", fontSize: "13px", fontWeight: "700", color: "#64748b" }}>Invoice No</th>
              <th style={{ padding: "16px 20px", fontSize: "13px", fontWeight: "700", color: "#64748b" }}>Supplier</th>
              <th style={{ padding: "16px 20px", fontSize: "13px", fontWeight: "700", color: "#64748b" }}>GSTIN</th>
              <th style={{ padding: "16px 20px", fontSize: "13px", fontWeight: "700", color: "#64748b" }}>Taxable (₹)</th>
              <th style={{ padding: "16px 20px", fontSize: "13px", fontWeight: "700", color: "#64748b" }}>CGST (₹)</th>
              <th style={{ padding: "16px 20px", fontSize: "13px", fontWeight: "700", color: "#64748b" }}>SGST (₹)</th>
              <th style={{ padding: "16px 20px", fontSize: "13px", fontWeight: "700", color: "#64748b" }}>Total GST (₹)</th>
              <th style={{ padding: "16px 20px", fontSize: "13px", fontWeight: "700", color: "#64748b" }}>Bill Total (₹)</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="9" style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>Generating report details...</td>
              </tr>
            ) : !selectedCompany ? (
              <tr>
                <td colSpan="9" style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>Select a company to load GST reports</td>
              </tr>
            ) : filteredPurchases.length === 0 ? (
              <tr>
                <td colSpan="9" style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>No submitted purchases found for the selected date range.</td>
              </tr>
            ) : (
              paginatedPurchases.map((p) => {
                const taxable = Number(p.sub_total);
                const gst = Number(p.gst_total);

                return (
                  <tr key={p.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={{ padding: "16px 20px", fontSize: "14px", color: "#334155" }}>{p.purchase_date}</td>
                    <td style={{ padding: "16px 20px", fontSize: "14px", fontWeight: "600", color: "#1e293b" }}>{p.purchase_no || "N/A"}</td>
                    <td style={{ padding: "16px 20px", fontSize: "14px", color: "#475569" }}>{p.supplier_name || "Unknown"}</td>
                    <td style={{ padding: "16px 20px", fontSize: "14px", color: "#64748b", fontFamily: "monospace" }}>{p.supplier_gstin || "N/A"}</td>
                    <td style={{ padding: "16px 20px", fontSize: "14px", color: "#334155" }}>{taxable.toFixed(2)}</td>
                    <td style={{ padding: "16px 20px", fontSize: "14px", color: "#3b82f6" }}>{(gst / 2).toFixed(2)}</td>
                    <td style={{ padding: "16px 20px", fontSize: "14px", color: "#6366f1" }}>{(gst / 2).toFixed(2)}</td>
                    <td style={{ padding: "16px 20px", fontSize: "14px", color: "#e11d48" }}>{gst.toFixed(2)}</td>
                    <td style={{ padding: "16px 20px", fontSize: "14px", fontWeight: "700", color: "#0f172a" }}>{Number(p.total_amount).toFixed(2)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Pagination Footer */}
        {!loading && selectedCompany && filteredPurchases.length > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              background: "#ffffff",
              padding: "16px 20px",
              borderTop: "1px solid #e2e8f0",
              boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
            }}
          >
            <div style={{ fontSize: "13.5px", color: "#64748b" }}>
              Showing{" "}
              <strong>
                {(safePage - 1) * ITEMS_PER_PAGE + 1}–
                {Math.min(safePage * ITEMS_PER_PAGE, filteredPurchases.length)}
              </strong>{" "}
              of <strong>{filteredPurchases.length}</strong> transactions
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <button
                disabled={safePage === 1}
                onClick={() => setCurrentPage((p) => p - 1)}
                className="sl-page-btn"
              >
                <ChevronLeft size={16} />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(
                  (p) =>
                    p === 1 ||
                    p === totalPages ||
                    Math.abs(p - safePage) <= 1
                )
                .reduce((acc, p, i, arr) => {
                  if (i > 0 && arr[i - 1] !== p - 1) acc.push("...");
                  acc.push(p);
                  return acc;
                }, [])
                .map((item, i) =>
                  item === "..." ? (
                    <span key={i} style={{ padding: "0 5px", color: "#94a3b8" }}>
                      …
                    </span>
                  ) : (
                    <button
                      key={item}
                      onClick={() => setCurrentPage(item)}
                      className={`sl-page-btn ${safePage === item ? "active" : ""}`}
                    >
                      {item}
                    </button>
                  )
                )}

              <button
                disabled={safePage === totalPages}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="sl-page-btn"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
