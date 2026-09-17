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

const ITEMS_PER_PAGE = 8;

export default function CategoryList() {
  const navigate = useNavigate();

  // Common State
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(
    localStorage.getItem("selected_company_id") || ""
  );
  const [loading, setLoading] = useState(true);

  // Category States
  const [categories, setCategories] = useState([]);
  const [categorySearch, setCategorySearch] = useState("");
  const [categoryPage, setCategoryPage] = useState(1);

  // Subcategory States
  const [subcategories, setSubcategories] = useState([]);
  const [subcategorySearch, setSubcategorySearch] = useState("");
  const [subcategoryPage, setSubcategoryPage] = useState(1);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) return;

    api
      .get(`/company/get_companies_by_admin?admin_id=${user.id}`)
      .then((res) => {
        if (res.data.status) {
          setCompanies(res.data.data || []);
          const savedId = localStorage.getItem("selected_company_id");
          if (savedId) {
            fetchData(savedId);
          } else {
            setLoading(false);
          }
        } else {
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
  }, []);

  const fetchData = async (companyId) => {
    setLoading(true);
    try {
      // Fetch Categories
      const catRes = await api.get(`/category/get_all?company_id=${companyId}`);
      if (catRes.data.status) {
        setCategories(catRes.data.data || []);
      }

      // Fetch Subcategories
      const subRes = await api.get(`/subcategory/get_all?company_id=${companyId}`);
      if (subRes.data.status) {
        setSubcategories(subRes.data.data || []);
      }
    } catch (err) {
      console.error("Error loading categories or subcategories", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCompanyChange = (companyId) => {
    setSelectedCompany(companyId);
    localStorage.setItem("selected_company_id", companyId);
    setCategoryPage(1);
    setSubcategoryPage(1);
    fetchData(companyId);
  };

  // Category Toggle Status
  const toggleCategoryStatus = async (category) => {
    const newStatus = category.status === "active" ? "inactive" : "active";
    try {
      const res = await api.post("/category/toggle_category_status", {
        id: category.id,
        status: newStatus,
      });
      if (res.data.status) {
        setCategories((prev) =>
          prev.map((c) => (c.id === category.id ? { ...c, status: newStatus } : c))
        );
      } else {
        alert(res.data.message);
      }
    } catch (err) {
      console.error(err);
      alert("Server error");
    }
  };

  // Subcategory Toggle Status
  const toggleSubcategoryStatus = async (subcategory) => {
    const newStatus = subcategory.status === "active" ? "inactive" : "active";
    try {
      const res = await api.post("/subcategory/statustoggle", {
        id: subcategory.id,
        status: newStatus,
      });
      if (res.data.status) {
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

  // Filtering Categories
  const filteredCategories = categories.filter((c) =>
    (c.name || "").toLowerCase().includes(categorySearch.toLowerCase())
  );

  // Filtering Subcategories
  const filteredSubcategories = subcategories.filter(
    (s) =>
      (s.name || "").toLowerCase().includes(subcategorySearch.toLowerCase()) ||
      (s.category_name &&
        s.category_name.toLowerCase().includes(subcategorySearch.toLowerCase()))
  );

  // Pagination calculations for Categories
  const totalCategoryPages = Math.max(1, Math.ceil(filteredCategories.length / ITEMS_PER_PAGE));
  const safeCategoryPage = Math.min(categoryPage, totalCategoryPages);
  const paginatedCategories = filteredCategories.slice(
    (safeCategoryPage - 1) * ITEMS_PER_PAGE,
    safeCategoryPage * ITEMS_PER_PAGE
  );

  // Pagination calculations for Subcategories
  const totalSubcategoryPages = Math.max(
    1,
    Math.ceil(filteredSubcategories.length / ITEMS_PER_PAGE)
  );
  const safeSubcategoryPage = Math.min(subcategoryPage, totalSubcategoryPages);
  const paginatedSubcategories = filteredSubcategories.slice(
    (safeSubcategoryPage - 1) * ITEMS_PER_PAGE,
    safeSubcategoryPage * ITEMS_PER_PAGE
  );

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <span>📑</span> Category & Subcategory
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage product categories and subcategories in a single screen
          </p>
        </div>
      </div>

      {/* Company Selector Buttons */}
      <div className="flex flex-wrap gap-2.5 mb-6">
        {companies
          .filter((c) => c.status === "active")
          .map((c) => {
            const isActive = Number(selectedCompany) === Number(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => handleCompanyChange(c.id)}
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

      {/* Two Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* 🏷️ CATEGORY COLUMN */}
        <TableContainer
          title="Categories"
          badge={filteredCategories.length}
          searchQuery={categorySearch}
          onSearchChange={(val) => {
            setCategorySearch(val);
            setCategoryPage(1);
          }}
          searchPlaceholder="Search categories..."
          actions={
            <button
              onClick={() => navigate("/category/add")}
              disabled={!selectedCompany}
              className="app-btn-primary inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus size={14} /> Add Category
            </button>
          }
        >
          <Table>
            <Thead>
              <Tr>
                <Th className="w-12">#</Th>
                <Th>Category Name</Th>
                <Th align="center">Status</Th>
                <Th align="center" className="w-20">Actions</Th>
              </Tr>
            </Thead>

            <Tbody>
              {loading ? (
                <TableLoadingState colSpan={4} message="Loading categories..." />
              ) : !selectedCompany ? (
                <TableEmptyState
                  colSpan={4}
                  title="No Company Selected"
                  description="Select a company to view categories."
                />
              ) : filteredCategories.length === 0 ? (
                <TableEmptyState
                  colSpan={4}
                  title="No Categories Found"
                  description={
                    categorySearch
                      ? `No categories match "${categorySearch}".`
                      : "No categories added yet."
                  }
                  actionLabel={!categorySearch && selectedCompany ? "+ Add Category" : undefined}
                  onAction={
                    !categorySearch && selectedCompany
                      ? () => navigate("/category/add")
                      : undefined
                  }
                />
              ) : (
                paginatedCategories.map((c, i) => (
                  <Tr key={c.id}>
                    <Td className="font-semibold text-slate-500">
                      {(safeCategoryPage - 1) * ITEMS_PER_PAGE + i + 1}
                    </Td>
                    <Td>
                      <span className="font-bold text-slate-800">{c.name}</span>
                    </Td>
                    <Td align="center">
                      <button
                        type="button"
                        onClick={() => toggleCategoryStatus(c)}
                        title="Click to toggle status"
                        className="cursor-pointer"
                      >
                        <TableStatusBadge status={c.status || "active"} />
                      </button>
                    </Td>
                    <Td align="center">
                      <TableActionButtons
                        onEdit={() => navigate(`/category/edit/${c.id}`)}
                        editTitle="Edit Category"
                      />
                    </Td>
                  </Tr>
                ))
              )}
            </Tbody>
          </Table>

          {filteredCategories.length > 0 && (
            <TablePagination
              currentPage={safeCategoryPage}
              totalPages={totalCategoryPages}
              totalItems={filteredCategories.length}
              rowsPerPage={ITEMS_PER_PAGE}
              onPageChange={setCategoryPage}
              itemLabel="categories"
            />
          )}
        </TableContainer>

        {/* 📦 SUBCATEGORY COLUMN */}
        <TableContainer
          title="Subcategories"
          badge={filteredSubcategories.length}
          searchQuery={subcategorySearch}
          onSearchChange={(val) => {
            setSubcategorySearch(val);
            setSubcategoryPage(1);
          }}
          searchPlaceholder="Search subcategories..."
          actions={
            <button
              onClick={() => navigate("/subcategory/add")}
              disabled={!selectedCompany}
              className="app-btn-primary inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus size={14} /> Add Subcategory
            </button>
          }
        >
          <Table>
            <Thead>
              <Tr>
                <Th className="w-12">#</Th>
                <Th>Subcategory</Th>
                <Th>Category</Th>
                <Th align="center">Status</Th>
                <Th align="center" className="w-20">Actions</Th>
              </Tr>
            </Thead>

            <Tbody>
              {loading ? (
                <TableLoadingState colSpan={5} message="Loading subcategories..." />
              ) : !selectedCompany ? (
                <TableEmptyState
                  colSpan={5}
                  title="No Company Selected"
                  description="Select a company to view subcategories."
                />
              ) : filteredSubcategories.length === 0 ? (
                <TableEmptyState
                  colSpan={5}
                  title="No Subcategories Found"
                  description={
                    subcategorySearch
                      ? `No subcategories match "${subcategorySearch}".`
                      : "No subcategories added yet."
                  }
                  actionLabel={
                    !subcategorySearch && selectedCompany ? "+ Add Subcategory" : undefined
                  }
                  onAction={
                    !subcategorySearch && selectedCompany
                      ? () => navigate("/subcategory/add")
                      : undefined
                  }
                />
              ) : (
                paginatedSubcategories.map((s, i) => (
                  <Tr key={s.id}>
                    <Td className="font-semibold text-slate-500">
                      {(safeSubcategoryPage - 1) * ITEMS_PER_PAGE + i + 1}
                    </Td>
                    <Td>
                      <span className="font-bold text-slate-800">{s.name}</span>
                    </Td>
                    <Td>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        {s.category_name || "—"}
                      </span>
                    </Td>
                    <Td align="center">
                      <button
                        type="button"
                        onClick={() => toggleSubcategoryStatus(s)}
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

          {filteredSubcategories.length > 0 && (
            <TablePagination
              currentPage={safeSubcategoryPage}
              totalPages={totalSubcategoryPages}
              totalItems={filteredSubcategories.length}
              rowsPerPage={ITEMS_PER_PAGE}
              onPageChange={setSubcategoryPage}
              itemLabel="subcategories"
            />
          )}
        </TableContainer>
      </div>
    </div>
  );
}