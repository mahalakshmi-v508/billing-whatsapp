import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { ArrowLeft, Download, Calendar, FileText, User, DollarSign, Percent } from "lucide-react";
import * as XLSX from "xlsx";
import HeaderSettingsButton from "../../components/HeaderSettingsButton";
import CommonTableColumnSettings from "../../components/CommonTableColumnSettings";
import useTableColumns from "../../hooks/useTableColumns";
import {
  TableContainer,
  Table,
  Thead,
  Th,
  Tbody,
  Tr,
  Td,
  TablePagination,
  TableEmptyState,
  TableLoadingState,
} from "../../components/table";

const DEFAULT_COLUMNS = [
  { key: "date", label: "Date", icon: Calendar, color: "text-blue-600", bg: "bg-blue-50", desc: "Purchase / Invoice date" },
  { key: "invoice_no", label: "Invoice No", icon: FileText, color: "text-indigo-600", bg: "bg-indigo-50", desc: "Supplier invoice / bill number" },
  { key: "supplier", label: "Supplier", icon: User, color: "text-violet-600", bg: "bg-violet-50", desc: "Supplier name" },
  { key: "gstin", label: "GSTIN", icon: FileText, color: "text-purple-600", bg: "bg-purple-50", desc: "Supplier GST identification number" },
  { key: "taxable", label: "Taxable Amount", icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50", desc: "Taxable purchase value" },
  { key: "cgst", label: "CGST", icon: Percent, color: "text-blue-600", bg: "bg-blue-50", desc: "Central GST (50% of tax)" },
  { key: "sgst", label: "SGST", icon: Percent, color: "text-indigo-600", bg: "bg-indigo-50", desc: "State GST (50% of tax)" },
  { key: "total_gst", label: "Total GST", icon: DollarSign, color: "text-rose-600", bg: "bg-rose-50", desc: "Combined GST tax amount" },
  { key: "bill_total", label: "Bill Total", icon: DollarSign, color: "text-slate-900", bg: "bg-slate-100", desc: "Total purchase bill amount" },
];

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
  const [rowsPerPage, setRowsPerPage] = useState(15);

  const {
    visibleColumns,
    toggleColumn,
    selectAllColumns,
    resetDefaultColumns,
    showColumnDrawer,
    setShowColumnDrawer,
    visibleColumnCount,
  } = useTableColumns("purchase_gst_columns", DEFAULT_COLUMNS);

  useEffect(() => {
    setCurrentPage(1);
  }, [showGstOnly, purchases]);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) return;

    api
      .get(`/company/get_companies_by_admin?admin_id=${user.id}`)
      .then((res) => {
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
    ? purchases.filter(
        (p) =>
          p.supplier_gstin &&
          p.supplier_gstin.trim() !== "" &&
          p.supplier_gstin.toLowerCase() !== "n/a"
      )
    : purchases;

  // Export to Excel
  const exportToExcel = () => {
    if (filteredPurchases.length === 0) {
      alert("No data available to export");
      return;
    }

    const companyName =
      companies.find((c) => Number(c.id) === Number(selectedCompany))
        ?.company_name || "Company";

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
        "Total Bill Amount (₹)": Number(p.total_amount),
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "GST Purchase Report");

    // Add totals row
    const totalTaxable = filteredPurchases.reduce(
      (sum, p) => sum + Number(p.sub_total),
      0
    );
    const totalGst = filteredPurchases.reduce(
      (sum, p) => sum + Number(p.gst_total),
      0
    );
    const totalAmount = filteredPurchases.reduce(
      (sum, p) => sum + Number(p.total_amount),
      0
    );

    XLSX.utils.sheet_add_aoa(
      worksheet,
      [
        [],
        [
          "Total",
          "",
          "",
          "",
          "",
          totalTaxable,
          totalGst / 2,
          totalGst / 2,
          totalGst,
          totalAmount,
        ],
      ],
      { origin: -1 }
    );

    XLSX.writeFile(
      workbook,
      `Purchase_GST_Report_${companyName}_${startDate}_to_${endDate}.xlsx`
    );
  };

  // Calculations
  const totalTaxable = filteredPurchases.reduce(
    (sum, p) => sum + Number(p.sub_total || 0),
    0
  );
  const totalGst = filteredPurchases.reduce(
    (sum, p) => sum + Number(p.gst_total || 0),
    0
  );
  const totalBillAmount = filteredPurchases.reduce(
    (sum, p) => sum + Number(p.total_amount || 0),
    0
  );

  // Pagination Calculations
  const totalPages = Math.ceil(filteredPurchases.length / rowsPerPage) || 1;
  const safePage = Math.min(currentPage, totalPages || 1);
  const indexOfLast = safePage * rowsPerPage;
  const indexOfFirst = indexOfLast - rowsPerPage;
  const paginatedPurchases = filteredPurchases.slice(indexOfFirst, indexOfLast);

  const fmt = (n) =>
    Number(n || 0).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  return (
    <div className="space-y-5 pb-16 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3.5">
          <button
            onClick={() => navigate("/purchases")}
            className="w-9 h-9 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 flex items-center justify-center transition cursor-pointer"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900">GST Purchase Report</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Generate GSTR-2 details for outward inputs and GST filing
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={exportToExcel}
            disabled={purchases.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition disabled:opacity-50 cursor-pointer"
          >
            <Download size={15} />
            <span>Export Excel</span>
          </button>
          <HeaderSettingsButton
            onClick={() => setShowColumnDrawer(true)}
            tooltip="Customise GST table columns"
            variant="list"
            isActive={showColumnDrawer}
          />
        </div>
      </div>

      {/* Company Selector Buttons */}
      {companies.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {companies.map((c) => {
            const isActive = Number(selectedCompany) === Number(c.id);
            return (
              <button
                key={c.id}
                onClick={() => handleCompanyChange(c.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 border ${
                  isActive
                    ? "app-pill-active"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                }`}
              >
                <span>🏢</span>
                <span>{c.company_name}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Date Filters bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-end gap-3.5">
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Start Date
          </label>
          <div className="relative flex items-center">
            <Calendar size={14} className="absolute left-3 text-slate-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none text-slate-700 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            End Date
          </label>
          <div className="relative flex items-center">
            <Calendar size={14} className="absolute left-3 text-slate-400" />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="pl-8 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none text-slate-700 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 h-9 px-2">
          <input
            type="checkbox"
            id="gstToggle"
            checked={showGstOnly}
            onChange={(e) => setShowGstOnly(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-blue-600 accent-blue-600 cursor-pointer"
          />
          <label
            htmlFor="gstToggle"
            className="text-xs font-semibold text-slate-700 cursor-pointer select-none"
          >
            GSTIN Only
          </label>
        </div>

        <button
          onClick={handleSearch}
          className="app-btn-primary px-4 py-2 text-xs font-semibold rounded-lg"
        >
          Generate Report
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Total Taxable Value
          </p>
          <h3 className="text-xl font-bold text-slate-900 mt-1">₹{fmt(totalTaxable)}</h3>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            CGST Total (50%)
          </p>
          <h3 className="text-xl font-bold text-blue-600 mt-1">₹{fmt(totalGst / 2)}</h3>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            SGST Total (50%)
          </p>
          <h3 className="text-xl font-bold text-indigo-600 mt-1">₹{fmt(totalGst / 2)}</h3>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Total Bill Amount
          </p>
          <h3 className="text-xl font-bold text-emerald-600 mt-1">₹{fmt(totalBillAmount)}</h3>
        </div>
      </div>

      {/* Report Table */}
      <TableContainer>
        {loading ? (
          <TableLoadingState colSpan={visibleColumnCount || 1} message="Generating GST report details..." />
        ) : !selectedCompany ? (
          <TableEmptyState
            colSpan={visibleColumnCount || 1}
            title="No Company Selected"
            description="Select a company from above to load GST purchase reports."
          />
        ) : filteredPurchases.length === 0 ? (
          <TableEmptyState
            colSpan={visibleColumnCount || 1}
            title="No Purchases Found"
            description="No submitted purchases found for the selected date range and filter criteria."
          />
        ) : (
          <>
            <Table>
              <Thead>
                <tr>
                  {visibleColumns.date && <Th>Date</Th>}
                  {visibleColumns.invoice_no && <Th>Invoice No</Th>}
                  {visibleColumns.supplier && <Th>Supplier</Th>}
                  {visibleColumns.gstin && <Th>GSTIN</Th>}
                  {visibleColumns.taxable && <Th align="right">Taxable (₹)</Th>}
                  {visibleColumns.cgst && <Th align="right">CGST (₹)</Th>}
                  {visibleColumns.sgst && <Th align="right">SGST (₹)</Th>}
                  {visibleColumns.total_gst && <Th align="right">Total GST (₹)</Th>}
                  {visibleColumns.bill_total && <Th align="right">Bill Total (₹)</Th>}
                </tr>
              </Thead>
              <Tbody>
                {paginatedPurchases.map((p) => {
                  const taxable = Number(p.sub_total || 0);
                  const gst = Number(p.gst_total || 0);

                  return (
                    <Tr key={p.id}>
                      {visibleColumns.date && (
                        <Td className="whitespace-nowrap text-slate-600">{p.purchase_date}</Td>
                      )}
                      {visibleColumns.invoice_no && (
                        <Td className="whitespace-nowrap font-bold text-slate-900 font-mono">
                          {p.purchase_no || "N/A"}
                        </Td>
                      )}
                      {visibleColumns.supplier && (
                        <Td className="font-medium text-slate-800">{p.supplier_name || "Unknown"}</Td>
                      )}
                      {visibleColumns.gstin && (
                        <Td className="font-mono text-slate-600">{p.supplier_gstin || "N/A"}</Td>
                      )}
                      {visibleColumns.taxable && (
                        <Td align="right" className="font-semibold text-slate-700">
                          {fmt(taxable)}
                        </Td>
                      )}
                      {visibleColumns.cgst && (
                        <Td align="right" className="text-blue-600 font-semibold">
                          {fmt(gst / 2)}
                        </Td>
                      )}
                      {visibleColumns.sgst && (
                        <Td align="right" className="text-indigo-600 font-semibold">
                          {fmt(gst / 2)}
                        </Td>
                      )}
                      {visibleColumns.total_gst && (
                        <Td align="right" className="text-rose-600 font-semibold">
                          {fmt(gst)}
                        </Td>
                      )}
                      {visibleColumns.bill_total && (
                        <Td align="right" className="font-bold text-slate-900">
                          ₹{fmt(p.total_amount)}
                        </Td>
                      )}
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>

            <TablePagination
              currentPage={safePage}
              totalPages={totalPages}
              totalItems={filteredPurchases.length}
              rowsPerPage={rowsPerPage}
              onPageChange={(page) => setCurrentPage(page)}
              onRowsPerPageChange={(size) => {
                setRowsPerPage(size);
                setCurrentPage(1);
              }}
              itemLabel="records"
            />
          </>
        )}
      </TableContainer>

      {/* Column Customization Drawer */}
      <CommonTableColumnSettings
        isOpen={showColumnDrawer}
        onClose={() => setShowColumnDrawer(false)}
        columns={DEFAULT_COLUMNS}
        visibleColumns={visibleColumns}
        onToggleColumn={toggleColumn}
        onSelectAll={selectAllColumns}
        onReset={resetDefaultColumns}
        title="Customise Columns"
        subtitle="Show or hide table columns in GST Purchase report"
      />
    </div>
  );
}
