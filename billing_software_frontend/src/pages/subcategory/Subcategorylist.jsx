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

export default function SubcategoryList() {
  const navigate = useNavigate();

  const [subcategories, setSubcategories] = useState([]);
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

        // Auto-fetch subcategories for saved company on mount
        const savedId = localStorage.getItem("selected_company_id");
        if (savedId) {
          fetchSubcategories(savedId);
        }
      }
    });
  }, []);

  useEffect(() => {
    if (selectedCompany) {
      fetchSubcategories(selectedCompany);
    } else {
      setSubcategories([]);
      setLoading(false);
    }
  }, [selectedCompany]);

  const fetchSubcategories = async (companyId) => {
    setLoading(true);
    try {
      const res = await api.get(`/subcategory/get_all?company_id=${companyId}`);
      if (res.data.status) {
        setSubcategories(res.data.data || []);
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

  const toggleStatus = async (subcategory) => {
    const newStatus = subcategory.status === "active" ? "inactive" : "active";

    try {
      const res = await api.post("/subcategory/statustoggle", {
        id: subcategory.id,
        status: newStatus,
      });

      if (res.data.success || res.data.status) {
        setSubcategories((prev) =>
          prev.map((s) => (s.id === subcategory.id ? { ...s, status: newStatus } : s))
        );
      } else {
        alert(res.data.message);
      }
    } catch (err) {
      console.error(err);
      alert("Server error");
    }
  };

  const filtered = subcategories.filter(
    (s) =>
      (s.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (s.category_name || "").toLowerCase().includes(search.toLowerCase())
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
            <span>🏷️</span> Subcategories
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage product subcategories and group them under primary categories
          </p>
        </div>

        <button
          onClick={() => navigate("/subcategory/add")}
          className="app-btn-primary inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm shadow-sm transition"
        >
          <Plus size={16} />
          Add Subcategory
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
                    ? "app-pill-active ring-2 ring-brand-500 ring-offset-1"
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

      {/* Main Table Container */}
      <TableContainer
        title="Subcategories Directory"
        badge={filtered.length}
        searchQuery={search}
        onSearchChange={(val) => {
          setSearch(val);
          setCurrentPage(1);
        }}
        searchPlaceholder="Search subcategories or categories..."
      >
        <Table>
          <Thead>
            <Tr>
              <Th className="w-14">#</Th>
              <Th>Subcategory Name</Th>
              <Th>Parent Category</Th>
              <Th align="center">Status</Th>
              <Th align="center" className="w-24">Actions</Th>
            </Tr>
          </Thead>

          <Tbody>
            {!selectedCompany ? (
              <TableEmptyState
                colSpan={5}
                title="No Company Selected"
                description="Please select a company above to view its subcategories."
              />
            ) : loading ? (
              <TableLoadingState colSpan={5} message="Loading subcategories..." />
            ) : filtered.length === 0 ? (
              <TableEmptyState
                colSpan={5}
                title="No Subcategories Found"
                description={
                  search
                    ? `No subcategories match "${search}". Try clearing your search.`
                    : "Get started by adding your first subcategory."
                }
                actionLabel={!search ? "+ Add Subcategory" : undefined}
                onAction={!search ? () => navigate("/subcategory/add") : undefined}
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
                      onEdit={() => navigate(`/subcategory/edit/${s.id}`)}
                      editTitle="Edit Subcategory"
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
            itemLabel="subcategories"
          />
        )}
      </TableContainer>
    </div>
  );
}