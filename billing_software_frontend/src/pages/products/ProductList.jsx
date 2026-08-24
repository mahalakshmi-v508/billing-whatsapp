import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import Barcode from "react-barcode";
import { Pencil } from "lucide-react";

export default function ProductList() {

  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
const [companies, setCompanies] = useState([]);
const [selectedCompany, setSelectedCompany] = useState(
  localStorage.getItem("selected_company_id") || ""
);


  const ITEMS_PER_PAGE = 10;
const getCompanyId = () => {

  return Number(
    localStorage.getItem("selected_company_id")
  );

};


const loadCompanies = async () => {

  const user = JSON.parse(
    localStorage.getItem("user")
  );

  const res = await api.get(
    `/company/get_companies_by_admin?admin_id=${user.id}`
  );

  if (res.data.status) {

    setCompanies(res.data.data);

    // Auto-fetch products for saved company on mount
    const savedId = localStorage.getItem("selected_company_id");
    if (savedId) {
      fetchProducts(savedId);
    }

  }

};
const fetchProducts = async(company_id) => {

  setLoading(true);

  try {

    const res = await api.get(
      `/product/get?company_id=${company_id}`
    );

    if(res.data.status){

      setProducts(res.data.data);

    }

  } catch(err){

    console.log(err);

  } finally {

    setLoading(false);

  }

};

  useEffect(() => {

  loadCompanies();

}, []);

const handleCompanyChange = async(e) => {

  const companyId = e.target.value;

  setSelectedCompany(companyId);

  localStorage.setItem(
    "selected_company_id",
    companyId
  );

  if(!companyId){

    setProducts([]);
    return;

  }

  fetchProducts(companyId);

};

  /* TOGGLE STATUS */

  const toggleStatus = async (product) => {

    const newStatus =
      product.status === "active"
        ? "inactive"
        : "active";

    try {

      const res = await api.post(
        "/product/toggle_status_product",
        {
          id: product.id,
          status: newStatus,
        }
      );

      if (res.data.status) {

        setProducts((prev) =>
          prev.map((p) =>
            p.id === product.id
              ? { ...p, status: newStatus }
              : p
          )
        );

      } else {

        alert(res.data.message);

      }

    } catch (err) {

      console.error(err);
      alert("Server Error");

    }
  };

  /* SEARCH */

  const filtered = products.filter((p) =>
    p.product_name
      ?.toLowerCase()
      .includes(search.toLowerCase())
  );

  const totalPages = Math.max(
    1,
    Math.ceil(filtered.length / ITEMS_PER_PAGE)
  );

  const safePage = Math.min(currentPage, totalPages);

  const paginated = filtered.slice(
    (safePage - 1) * ITEMS_PER_PAGE,
    safePage * ITEMS_PER_PAGE
  );

  const stockBadge = (stock) => {

    if (stock <= 0) {
      return {
        cls: "pl-badge-out",
        label: "Out",
      };
    }

    if (stock <= 10) {
      return {
        cls: "pl-badge-low",
        label: "Low",
      };
    }

    return {
      cls: "pl-badge-ok",
      label: "OK",
    };
  };

  return (
    <>
      <style>{`

      @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

      .pl-page{
        font-family:'Plus Jakarta Sans',sans-serif;
        min-height:100vh;
        background:#f0f4ff;
        padding:2rem;
      }

      .pl-header{
        display:flex;
        justify-content:space-between;
        align-items:center;
        margin-bottom:1.5rem;
        flex-wrap:wrap;
        gap:12px;
      }

      .pl-header-left h1{
        font-size:22px;
        font-weight:800;
        margin:0;
        color:#0f172a;
      }

      .pl-header-left p{
        font-size:13px;
        color:#94a3b8;
        margin-top:4px;
      }

      .pl-add-btn{
        padding:11px 20px;
        border:none;
        border-radius:12px;
        background:linear-gradient(135deg,#1e40af,#3b82f6);
        color:#fff;
        font-weight:700;
        cursor:pointer;
        box-shadow:0 4px 14px rgba(37,99,235,0.35);
      }

      .pl-toolbar{
        display:flex;
        gap:12px;
        margin-bottom:1.25rem;
        flex-wrap:wrap;
      }

      .pl-search{
        flex:1;
        min-width:220px;
        padding:12px 14px;
        border-radius:12px;
        border:1.5px solid #e2e8f0;
        background:#fff;
        font-size:14px;
      }

      .pl-card{
        background:#fff;
        border-radius:20px;
        overflow:hidden;
        border:1px solid #e2e8f0;
        box-shadow:0 4px 24px rgba(37,99,235,0.08);
      }

      .pl-table{
        width:100%;
        border-collapse:collapse;
      }

      .pl-table thead{
        background:linear-gradient(135deg,#1e40af,#2563eb);
      }

      .pl-table th{
        padding:14px;
        font-size:11px;
        text-transform:uppercase;
        color:#fff;
        text-align:left;
      }

      .pl-table th.center{
        text-align:center;
      }

      .pl-table td{
        padding:14px;
        border-bottom:1px solid #f1f5f9;
        font-size:14px;
      }

      .pl-table td.center{
        text-align:center;
      }

      .pl-index{
        width:26px;
        height:26px;
        display:inline-flex;
        align-items:center;
        justify-content:center;
        border-radius:8px;
        background:#eff6ff;
        color:#2563eb;
        font-size:12px;
        font-weight:700;
      }

      .pl-prod-name{
        font-weight:700;
        color:#0f172a;
      }

      .pl-prod-cat{
        font-size:12px;
        color:#94a3b8;
        margin-top:4px;
      }

      .pl-price{
        font-weight:700;
      }

      .pl-gst{
        display:inline-flex;
        align-items:center;
        justify-content:center;
        padding:4px 10px;
        border-radius:999px;
        font-size:11px;
        font-weight:700;
      }

      .pl-status-active{
        background:#dcfce7;
        color:#15803d;
        border:1px solid #bbf7d0;
      }

      .pl-status-inactive{
        background:#f1f5f9;
        color:#64748b;
        border:1px solid #e2e8f0;
      }

      .pl-stock-wrap{
        display:flex;
        align-items:center;
        justify-content:center;
        gap:6px;
      }

      .pl-badge-ok{
        padding:3px 9px;
        border-radius:999px;
        background:#dcfce7;
        color:#15803d;
        font-size:11px;
        font-weight:700;
      }

      .pl-badge-low{
        padding:3px 9px;
        border-radius:999px;
        background:#fef9c3;
        color:#854d0e;
        font-size:11px;
        font-weight:700;
      }

      .pl-badge-out{
        padding:3px 9px;
        border-radius:999px;
        background:#ffe4e6;
        color:#be123c;
        font-size:11px;
        font-weight:700;
      }

      .pl-actions{
        display:flex;
        align-items:center;
        justify-content:center;
        gap:10px;
      }

      .pl-btn-edit{
        width:34px;
        height:34px;
        border:none;
        border-radius:10px;
        background:#eff6ff;
        color:#2563eb;
        cursor:pointer;
      }

      .pl-switch{
        position:relative;
        display:inline-block;
        width:46px;
        height:24px;
      }

      .pl-switch input{
        opacity:0;
        width:0;
        height:0;
      }

      .pl-slider{
        position:absolute;
        cursor:pointer;
        inset:0;
        background:#d1d5db;
        transition:.4s;
        border-radius:999px;
      }

      .pl-slider:before{
        position:absolute;
        content:"";
        height:18px;
        width:18px;
        left:3px;
        top:3px;
        background:white;
        transition:.4s;
        border-radius:50%;
        box-shadow:0 2px 6px rgba(0,0,0,0.25);
      }

      .pl-switch input:checked + .pl-slider{
        background:linear-gradient(135deg,#1d4ed8,#3b82f6);
      }

      .pl-switch input:checked + .pl-slider:before{
        transform:translateX(22px);
      }

      .pl-barcode-cell{
        display:flex;
        flex-direction:column;
        align-items:center;
      }

      .pl-barcode-num{
        font-size:10px;
        color:#94a3b8;
        margin-top:4px;
      }

      `}</style>

      <div className="pl-page">

        {/* HEADER */}

        <div className="pl-header">

          <div className="pl-header-left">
            <h1>📦 Products</h1>
            <p>Manage your product inventory</p>
          </div>

          <button
            className="pl-add-btn"
            onClick={() => navigate("/products/add")}
          >
            + Add Product
          </button>

        </div>


        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "10px",
            marginBottom: "15px",
          }}
        >
          {companies.map((c) => {
            const isActive = Number(selectedCompany) === Number(c.id);
            return (
              <button
                key={c.id}
                onClick={() => handleCompanyChange({ target: { value: String(c.id) } })}
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
                  gap: "6px",
                }}
              >
                <span>🏢</span> {c.company_name}
              </button>
            );
          })}
        </div>

        {/* SEARCH */}

        <div className="pl-toolbar">

          <input
            className="pl-search"
            placeholder="Search products..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
          />

        </div>

        {/* TABLE */}

        <div className="pl-card">

          <table className="pl-table">

            <thead>
              <tr>
                <th>#</th>
                <th>Product</th>
                <th className="center">Supplier</th>
                <th className="center">HSN Code</th>
                <th className="center">Selling Price</th>
                <th className="center">Stock</th>
                <th className="center">GST</th>
                <th className="center">Barcode</th>
                <th className="center">Actions</th>
                <th className="center">Status</th>
              </tr>
            </thead>

            <tbody>

              {loading ? (

                <tr>
                  <td colSpan="10">
                    Please Select Your company & show your products
                  </td>
                </tr>

              ) : paginated.length === 0 ? (

                <tr>
                  <td colSpan="10">
                    No Products Found
                  </td>
                </tr>

              ) : (

                paginated.map((p, i) => {

                  const sb = stockBadge(p.stock);

                  return (

                    <tr key={p.id}>

                      <td>
                        <span className="pl-index">
                          {(safePage - 1) *
                            ITEMS_PER_PAGE +
                            i +
                            1}
                        </span>
                      </td>

                      <td>

                        <div className="pl-prod-name">
                          {p.product_name}
                        </div>

                        <div className="pl-prod-cat">
                          {p.category_name ||
                            "No Category"}
                        </div>

                      </td>

                      <td className="center">
                      {p.supplier_name || "-"}
                       </td>

                      <td className="center">

                        <span className="pl-gst pl-status-active">
                          {p.product_code || "-"}
                        </span>

                      </td>

                      <td className="center">
                        <span className="pl-price" style={{ color: "#16a34a" }}>
                          ₹{Number(p.price || 0).toFixed(2)}{p.unit ? ` / ${p.unit}` : ""}
                        </span>
                      </td>

                      <td className="center">

                        <div className="pl-stock-wrap">

                          <span>
                            {p.stock}
                          </span>

                          <span className={sb.cls}>
                            {sb.label}
                          </span>

                        </div>

                      </td>

                      <td className="center">

                        <span className="pl-gst pl-status-active">
                          {p.gst_percentage}%
                        </span>

                      </td>

                      <td className="center">

                        <div className="pl-barcode-cell">

                          <Barcode
                            value={p.barcode || "NA"}
                            width={1}
                            height={36}
                            fontSize={0}
                            margin={0}
                          />

                          <span className="pl-barcode-num">
                            {p.barcode || "-"}
                          </span>

                        </div>

                      </td>

                      {/* ACTION */}

                      <td className="center">

                        <div className="pl-actions">

                          <button
                            className="pl-btn-edit"
                            onClick={() =>
                              navigate(
                                `/products/edit/${p.id}`
                              )
                            }
                          >
                            <Pencil size={15} />
                          </button>

                          <label className="pl-switch">

                            <input
                              type="checkbox"
                              checked={
                                p.status === "active"
                              }
                              onChange={() =>
                                toggleStatus(p)
                              }
                            />

                            <span className="pl-slider"></span>

                          </label>

                        </div>

                      </td>

                      {/* STATUS */}

                      <td className="center">

                        <span
                          className={`pl-gst ${
                            p.status === "active"
                              ? "pl-status-active"
                              : "pl-status-inactive"
                          }`}
                        >
                          {p.status}
                        </span>

                      </td>

                    </tr>

                  );

                })

              )}

            </tbody>

          </table>

          {!loading && filtered.length > ITEMS_PER_PAGE && (
  <div style={{
    display:"flex", alignItems:"center", justifyContent:"space-between",
    padding:"14px 20px", borderTop:"1px solid #f1f5f9", background:"#f8fbff",
  }}>
    <span style={{ fontSize:13, color:"#64748b" }}>
      Showing <b>{(safePage-1)*ITEMS_PER_PAGE+1}–{Math.min(safePage*ITEMS_PER_PAGE, filtered.length)}</b> of <b>{filtered.length}</b>
    </span>
    <div style={{ display:"flex", gap:6 }}>
      <button onClick={() => setCurrentPage(p => Math.max(1, p-1))}
        disabled={safePage===1}
        style={{ width:34, height:34, borderRadius:10, border:"1px solid #e2e8f0",
          background:"#fff", cursor:safePage===1?"not-allowed":"pointer",
          opacity:safePage===1?0.5:1, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>
        ‹
      </button>
      {Array.from({ length: totalPages }, (_, i) => i+1).map(p => (
        <button key={p} onClick={() => setCurrentPage(p)} style={{
          width:34, height:34, borderRadius:10, border:"1px solid #e2e8f0",
          background:safePage===p?"#2563eb":"#fff",
          color:safePage===p?"#fff":"#374151",
          fontWeight:700, fontSize:13, cursor:"pointer",
        }}>{p}</button>
      ))}
      <button onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))}
        disabled={safePage===totalPages}
        style={{ width:34, height:34, borderRadius:10, border:"1px solid #e2e8f0",
          background:"#fff", cursor:safePage===totalPages?"not-allowed":"pointer",
          opacity:safePage===totalPages?0.5:1, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>
        ›
      </button>
    </div>
  </div>
)}

        </div>

      </div>
    </>
  );
}