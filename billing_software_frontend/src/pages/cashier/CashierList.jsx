import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { UserPlus, AlertCircle } from "lucide-react";
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

const MAX_CASHIERS = 3;

export default function CashierList() {
  const navigate = useNavigate();

  const [cashiers, setCashiers] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [loading, setLoading] = useState(true);

  const fetchCashiers = async () => {
    setLoading(true);
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      if (!user?.id) return;

      const res = await api.post("/cashier/get_cashiers", {
        admin_id: user.id,
      });

      if (res.data.status) {
        setCashiers(res.data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCashiers();
  }, []);

  const toggleStatus = async (cashier) => {
    const newStatus = cashier.status === "active" ? "inactive" : "active";

    try {
      const res = await api.post("/cashier/toggle_status_cashier", {
        id: cashier.id,
        status: newStatus,
      });

      if (res.data.success || res.data.status) {
        setCashiers((prev) =>
          prev.map((c) => (c.id === cashier.id ? { ...c, status: newStatus } : c))
        );
      } else {
        alert(res.data.message);
      }
    } catch (err) {
      console.error(err);
      alert("Server Error");
    }
  };

  const isLimitReached = cashiers.length >= MAX_CASHIERS;

  const filtered = cashiers.filter(
    (c) =>
      c.name?.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const safePage = Math.min(page, totalPages);
  const paginated = filtered.slice(
    (safePage - 1) * rowsPerPage,
    safePage * rowsPerPage
  );

  const getInitials = (name) =>
    name
      ?.split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "??";

  const avatarColors = [
    ["#dbeafe", "#1d4ed8"],
    ["#ede9fe", "#6d28d9"],
    ["#dcfce7", "#15803d"],
    ["#fef3c7", "#b45309"],
    ["#fce7f3", "#be185d"],
    ["#e0f2fe", "#0369a1"],
  ];

  const getColor = (name) =>
    avatarColors[(name?.charCodeAt(0) || 0) % avatarColors.length];

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <span>👥</span> Cashiers
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage your cashier user accounts and POS access permissions
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
            if (!isLimitReached) navigate("/cashier/add");
          }}
        >
          <UserPlus size={16} />
          Add Cashier
        </button>
      </div>

      {/* Cashier Limit Warning Alert */}
      {isLimitReached && (
        <div className="mb-5 bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm">
          <div className="flex items-center gap-2 font-medium">
            <AlertCircle size={18} className="text-amber-600 shrink-0" />
            <span>
              Maximum <strong>3 cashiers</strong> allowed on your current tier. Need more cashier accounts?
            </span>
          </div>

          <button
            onClick={() => navigate("/cashier/add")}
            className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-xs transition self-start sm:self-auto cursor-pointer"
          >
            Request More Cashiers
          </button>
        </div>
      )}

      {/* Main Table Container */}
      <TableContainer
        title="Cashiers Directory"
        badge={filtered.length}
        searchQuery={search}
        onSearchChange={(val) => {
          setSearch(val);
          setPage(1);
        }}
        searchPlaceholder="Search cashiers by name or email..."
      >
        <Table>
          <Thead>
            <Tr>
              <Th className="w-14">#</Th>
              <Th>Cashier</Th>
              <Th>Email Address</Th>
              <Th align="center">Status</Th>
              <Th align="center" className="w-24">Actions</Th>
            </Tr>
          </Thead>

          <Tbody>
            {loading ? (
              <TableLoadingState colSpan={5} message="Loading cashiers..." />
            ) : filtered.length === 0 ? (
              <TableEmptyState
                colSpan={5}
                title="No Cashiers Found"
                description={
                  search
                    ? `No cashier accounts match "${search}".`
                    : "No cashier accounts added yet."
                }
                actionLabel={!search && !isLimitReached ? "+ Add Cashier" : undefined}
                onAction={!search && !isLimitReached ? () => navigate("/cashier/add") : undefined}
              />
            ) : (
              paginated.map((c, idx) => {
                const [bg, fg] = getColor(c.name);
                return (
                  <Tr key={c.id}>
                    <Td className="font-semibold text-slate-500">
                      {(safePage - 1) * rowsPerPage + idx + 1}
                    </Td>

                    <Td>
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center font-extrabold text-xs shrink-0 shadow-2xs"
                          style={{ backgroundColor: bg, color: fg }}
                        >
                          {getInitials(c.name)}
                        </div>

                        <div>
                          <div className="font-bold text-slate-800">{c.name}</div>
                          <span className="inline-block text-[10px] font-mono font-medium text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                            ID #{c.id}
                          </span>
                        </div>
                      </div>
                    </Td>

                    <Td className="text-slate-600 font-medium">{c.email || "—"}</Td>

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
                        onEdit={() => navigate(`/cashier/edit/${c.id}`)}
                        editTitle="Edit Cashier"
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
            onPageChange={setPage}
            onRowsPerPageChange={(n) => {
              setRowsPerPage(n);
              setPage(1);
            }}
            itemLabel="cashiers"
          />
        )}
      </TableContainer>
    </div>
  );
}