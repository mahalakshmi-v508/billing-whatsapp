import { useEffect, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import api from "../../services/api";
import Barcode from "react-barcode";
import { ArrowLeft, Plus } from "lucide-react";
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

export default function SupplierProductList() {
  const navigate = useNavigate();
  const { supplierId } = useParams();
  const location = useLocation();
  const supplierName = location.state?.supplierName || "";

  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [loading, setLoading] = useState(true);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await api.get(
        `/product/get_by_supplier?supplier_id=${supplierId}`
      );
      if (res.data.status) setProducts(res.data.data || []);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (supplierId) fetchProducts();
  }, [supplierId]);

  const filtered = products.filter((p) =>
    p.product_name?.toLowerCase().includes(search.toLowerCase()) ||
    p.product_code?.toLowerCase().includes(search.toLowerCase()) ||
    p.category_name?.toLowerCase().includes(search.toLowerCase())
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
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/suppliers")}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-slate-200/80 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition shadow-2xs cursor-pointer"
            title="Back to Suppliers"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <span>📦</span> {supplierName ? `${supplierName}'s Products` : "Supplier Products"}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Products catalog and inventory supplied by this vendor
            </p>
          </div>
        </div>

        <button
          onClick={() =>
            navigate(`/supplier/${supplierId}/add-product`, {
              state: { supplierName },
            })
          }
          className="app-btn-primary inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm shadow-sm transition"
        >
          <Plus size={16} /> Add Product
        </button>
      </div>

      {/* Main Table Container */}
      <TableContainer
        title="Products Catalog"
        badge={filtered.length}
        searchQuery={search}
        onSearchChange={(val) => {
          setSearch(val);
          setCurrentPage(1);
        }}
        searchPlaceholder="Search products by name, code, category..."
      >
        <Table>
          <Thead>
            <Tr>
              <Th className="w-14">#</Th>
              <Th>Product</Th>
              <Th>Company</Th>
              <Th align="center">HSN Code</Th>
              <Th align="right">Price</Th>
              <Th align="center">Stock</Th>
              <Th align="center">GST</Th>
              <Th align="center">Barcode</Th>
              <Th align="center" className="w-20">Actions</Th>
            </Tr>
          </Thead>

          <Tbody>
            {loading ? (
              <TableLoadingState colSpan={9} message="Loading supplier products..." />
            ) : filtered.length === 0 ? (
              <TableEmptyState
                colSpan={9}
                title="No Products Found"
                description={
                  search
                    ? `No products match "${search}". Try a different query.`
                    : "No products added for this supplier yet."
                }
                actionLabel={!search ? "+ Add Product" : undefined}
                onAction={
                  !search
                    ? () =>
                        navigate(`/supplier/${supplierId}/add-product`, {
                          state: { supplierName },
                        })
                    : undefined
                }
              />
            ) : (
              paginated.map((p, i) => {
                const stockVal = Number(p.stock) || 0;
                let stockStatus = "Active";
                if (stockVal <= 0) stockStatus = "Inactive";
                else if (stockVal <= 10) stockStatus = "Pending";

                return (
                  <Tr key={p.id}>
                    <Td className="font-semibold text-slate-500">
                      {(safePage - 1) * rowsPerPage + i + 1}
                    </Td>

                    <Td>
                      <div className="font-bold text-slate-800">{p.product_name}</div>
                      <div className="text-xs text-slate-400 font-medium">
                        {p.category_name || "No Category"}
                      </div>
                    </Td>

                    <Td className="text-slate-600 font-medium">{p.company_name || "—"}</Td>

                    <Td align="center">
                      <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {p.product_code || "—"}
                      </span>
                    </Td>

                    <Td align="right" className="font-bold text-slate-800">
                      ₹{Number(p.price || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </Td>

                    <Td align="center">
                      <div className="inline-flex items-center gap-1.5">
                        <span className="font-bold text-slate-700">{stockVal}</span>
                        <TableStatusBadge
                          status={stockVal <= 0 ? "Out of Stock" : stockVal <= 10 ? "Low Stock" : "In Stock"}
                          customColor={
                            stockVal <= 0
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : stockVal <= 10
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          }
                        />
                      </div>
                    </Td>

                    <Td align="center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                        {p.gst_percentage || 0}%
                      </span>
                    </Td>

                    <Td align="center">
                      <div className="flex flex-col items-center justify-center py-1">
                        <Barcode
                          value={p.barcode || "NA"}
                          width={1}
                          height={30}
                          fontSize={0}
                          margin={0}
                        />
                        <span className="text-[10px] font-mono text-slate-400 mt-1">
                          {p.barcode || "—"}
                        </span>
                      </div>
                    </Td>

                    <Td align="center">
                      <TableActionButtons
                        onEdit={() =>
                          navigate(`/supplier/${supplierId}/products/edit/${p.id}`, {
                            state: { supplierName },
                          })
                        }
                        editTitle="Edit Product"
                      />
                    </Td>
                  </Tr>
                );
              })
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
            itemLabel="products"
          />
        )}
      </TableContainer>
    </div>
  );
}