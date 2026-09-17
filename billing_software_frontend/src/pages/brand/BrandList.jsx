import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { Plus, Building2 } from "lucide-react";
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

export default function BrandList() {
  const navigate = useNavigate();

  const [brands, setBrands] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(
    localStorage.getItem("selected_company_id") || ""
  );

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user?.id) return;

    api.get(`/company/get_companies_by_admin?admin_id=${user.id}`).then((res) => {
      if (res.data.status) {
        setCompanies(res.data.data);

        // Auto-fetch brands for saved company on mount
        const savedId = localStorage.getItem("selected_company_id");
        if (savedId) {
          fetchBrands(savedId);
        }
      }
    });
  }, []);

  useEffect(() => {
    if (selectedCompany) {
      fetchBrands(selectedCompany);
    } else {
      setBrands([]);
      setLoading(false);
    }
  }, [selectedCompany]);

  const fetchBrands = async (companyId) => {
    setLoading(true);
    try {
      const res = await api.get(`/brand/get_all?company_id=${companyId}`);
      if (res.data.status) {
        setBrands(res.data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCompanyChange = (companyId) => {
    setSelectedCompany(companyId);
    setCurrentPage(1);
    localStorage.setItem("selected_company_id", companyId);
  };

  const toggleStatus = async (brand) => {
    const newStatus = brand.status === "active" ? "inactive" : "active";

    try {
      const res = await api.post("/brand/status_toggle", {
        id: brand.id,
        status: newStatus,
      });

      if (res.data.status) {
        setBrands((prev) =>
          prev.map((s) => (s.id === brand.id ? { ...s, status: newStatus } : s))
        );
      } else {
        alert(res.data.message);
      }
    } catch (err) {
      console.error(err);
      alert("Server error");
    }
  };

  const filtered = brands.filter(
    (s) =>
      (s.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (s.category_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (s.subcategory_name || "").toLowerCase().includes(search.toLowerCase())
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
            <span>🏷️</span> Brands
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage your product brands and their category associations
          </p>
        </div>

        <button
          onClick={() => navigate("/brand/add")}
          className="app-btn-primary inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm shadow-sm transition"
        >
          <Plus size={16} />
          Add Brand
        </button>
      </div>

      {/* Company Selector Pills */}
      {companies.length > 0 && (
        <div className="flex flex-wrap gap-2.5 mb-5">
          {companies.map((c) => {
            const isActive = Number(selectedCompany) === Number(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => handleCompanyChange(String(c.id))}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  isActive
                    ? "bg-blue-600 text-white shadow-sm ring-2 ring-blue-600 ring-offset-1"
                    : "bg-white text-slate-700 border border-slate-200/80 hover:bg-slate-50 hover:border-slate-300"
                }`}
              >
                <Building2 size={14} className={isActive ? "text-white" : "text-slate-400"} />
                <span>{c.company_name}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Table Container */}
      <TableContainer
        title="Brands Directory"
        badge={filtered.length}
        searchQuery={search}
        onSearchChange={(val) => {
          setSearch(val);
          setCurrentPage(1);
        }}
        searchPlaceholder="Search brands, category, subcategory..."
      >
        <Table>
          <Thead>
            <Tr>
              <Th className="w-14">#</Th>
              <Th>Brand Name</Th>
              <Th>Category</Th>
              <Th>Subcategory</Th>
              <Th align="center">Status</Th>
              <Th align="center" className="w-24">Actions</Th>
            </Tr>
          </Thead>

          <Tbody>
            {!selectedCompany ? (
              <TableEmptyState
                colSpan={6}
                title="No Company Selected"
                description="Please select a company above to view its brands."
              />
            ) : loading ? (
              <TableLoadingState colSpan={6} message="Loading brands..." />
            ) : filtered.length === 0 ? (
              <TableEmptyState
                colSpan={6}
                title="No Brands Found"
                description={
                  search
                    ? `No brands match "${search}". Try clearing your search.`
                    : "Get started by adding your first brand."
                }
                actionLabel={!search ? "+ Add Brand" : undefined}
                onAction={!search ? () => navigate("/brand/add") : undefined}
              />
            ) : (
              paginated.map((s, i) => (
                <Tr key={s.id}>
                  <Td className="font-semibold text-slate-500">
                    {(safePage - 1) * rowsPerPage + i + 1}
                  </Td>

                  <Td>
                    <span className="font-bold text-slate-800">{s.name}</span>
                  </Td>

                  <Td>
                    {s.category_name ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        {s.category_name}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </Td>

                  <Td>
                    {s.subcategory_name ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        {s.subcategory_name}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </Td>

                  <Td align="center">
                    <button
                      type="button"
                      onClick={() => toggleStatus(s)}
                      title="Click to toggle status"
                      className="cursor-pointer"
                    >
                      <TableStatusBadge status={s.status || "active"} />
                    </button>
                  </Td>

                  <Td align="center">
                    <TableActionButtons
                      onEdit={() => navigate(`/brand/edit/${s.id}`)}
                      editTitle="Edit Brand"
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
            itemLabel="brands"
          />
        )}
      </TableContainer>
    </div>
  );
}