import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { Building2, Plus, AlertCircle, Phone, MapPin } from "lucide-react";
import {
  TableContainer,
  Table,
  Thead,
  Th,
  Tbody,
  Tr,
  Td,
  TablePagination,
  TableStatusBadge,
  TableActionButtons,
  TableLoadingState,
  TableEmptyState,
} from "../../components/table";

const MAX_COMPANIES = 3;

export default function CompanyList() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [loading, setLoading] = useState(true);

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      if (!user?.id) return;

      const res = await api.get(`/company/get_companies_by_admin?admin_id=${user.id}`);
      if (res.data.status) {
        setCompanies(res.data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const toggleStatus = async (company) => {
    const newStatus = company.status === "active" ? "inactive" : "active";
    try {
      const res = await api.post("/company/toggle_company_status", {
        id: company.id,
        status: newStatus,
      });

      if (res.data.status) {
        setCompanies((prev) =>
          prev.map((c) => (c.id === company.id ? { ...c, status: newStatus } : c))
        );
      } else {
        alert(res.data.message);
      }
    } catch (err) {
      console.error(err);
      alert("Server error");
    }
  };

  const isLimitReached = companies.length >= MAX_COMPANIES;

  const filtered = companies.filter(
    (c) =>
      c.company_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.company_code?.toLowerCase().includes(search.toLowerCase()) ||
      c.gstin?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice(
    (safePage - 1) * rowsPerPage,
    safePage * rowsPerPage
  );

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <span>🏢</span> Companies
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage registered companies, GST details, and billing entities
          </p>
        </div>

        <button
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm shadow-sm transition cursor-pointer ${
            isLimitReached
              ? "bg-slate-200 text-slate-400 cursor-not-allowed"
              : "app-btn-primary"
          }`}
          disabled={isLimitReached}
          onClick={() => {
            if (!isLimitReached) navigate("/company/add");
          }}
        >
          <Plus size={16} />
          Add Company
        </button>
      </div>

      {/* Company Limit Warning Alert */}
      {isLimitReached && (
        <div className="mb-5 bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-2 font-medium">
            <AlertCircle size={18} className="text-amber-600 shrink-0" />
            <span>
              Maximum <strong>3 companies</strong> allowed on your current tier. To add more company branches, please submit a request.
            </span>
          </div>

          <button
            onClick={() => navigate("/company/add")}
            className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition self-start sm:self-auto cursor-pointer"
          >
            Request Company
          </button>
        </div>
      )}

      {/* Main Table Container */}
      <TableContainer
        title="Companies Directory"
        badge={filtered.length}
        searchQuery={search}
        onSearchChange={(val) => {
          setSearch(val);
          setCurrentPage(1);
        }}
        searchPlaceholder="Search company by name, code, GSTIN, phone..."
      >
        <Table>
          <Thead>
            <Tr>
              <Th className="w-14">#</Th>
              <Th>Company Name</Th>
              <Th>Company Code</Th>
              <Th>GSTIN</Th>
              <Th>Phone</Th>
              <Th>Address</Th>
              <Th align="center">Status</Th>
              <Th align="center" className="w-24">Actions</Th>
            </Tr>
          </Thead>

          <Tbody>
            {loading ? (
              <TableLoadingState colSpan={8} message="Loading companies..." />
            ) : filtered.length === 0 ? (
              <TableEmptyState
                colSpan={8}
                title="No Companies Found"
                description={
                  search
                    ? `No companies match "${search}".`
                    : "No companies registered yet."
                }
                actionLabel={!search && !isLimitReached ? "+ Add Company" : undefined}
                onAction={!search && !isLimitReached ? () => navigate("/company/add") : undefined}
              />
            ) : (
              paginated.map((c, idx) => (
                <Tr key={c.id}>
                  <Td className="font-semibold text-slate-500">
                    {(safePage - 1) * rowsPerPage + idx + 1}
                  </Td>

                  <Td>
                    <div className="font-bold text-slate-800">{c.company_name}</div>
                    {c.email && (
                      <div className="text-xs text-slate-400 font-medium">{c.email}</div>
                    )}
                  </Td>

                  <Td>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                      {c.company_code || "—"}
                    </span>
                  </Td>

                  <Td>
                    <span className="font-mono text-xs text-slate-700 font-medium">
                      {c.gstin || "—"}
                    </span>
                  </Td>

                  <Td>
                    <div className="inline-flex items-center gap-1.5 text-xs text-slate-700">
                      <Phone size={13} className="text-slate-400 shrink-0" />
                      <span>{c.phone || "—"}</span>
                    </div>
                  </Td>

                  <Td>
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 max-w-xs truncate">
                      <MapPin size={13} className="text-slate-400 shrink-0" />
                      <span className="truncate">{c.company_address || "—"}</span>
                    </div>
                  </Td>

                  <Td align="center">
                    <button
                      type="button"
                      onClick={() => toggleStatus(c)}
                      title="Click to toggle status"
                      className="cursor-pointer"
                    >
                      <TableStatusBadge status={c.status || "active"} />
                    </button>
                  </Td>

                  <Td align="center">
                    <TableActionButtons
                      onEdit={() => navigate(`/company/edit/${c.id}`)}
                      editTitle="Edit Company"
                    />
                  </Td>
                </Tr>
              ))
            )}
          </Tbody>
        </Table>

        {filtered.length > 0 && (
          <TablePagination
            currentPage={safePage}
            totalPages={totalPages}
            totalItems={filtered.length}
            rowsPerPage={rowsPerPage}
            onPageChange={setCurrentPage}
            onRowsPerPageChange={(n) => {
              setRowsPerPage(n);
              setCurrentPage(1);
            }}
            itemLabel="companies"
          />
        )}
      </TableContainer>
    </div>
  );
}