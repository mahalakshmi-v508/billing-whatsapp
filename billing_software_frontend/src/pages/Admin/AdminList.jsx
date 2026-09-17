import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { Plus } from "lucide-react";
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

export default function AdminList() {
  const navigate = useNavigate();
  const [admins, setAdmins] = useState([]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [loading, setLoading] = useState(true);

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const res = await api.get("/admin/get_admins");
      if (res.data.status) setAdmins(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdmins();
  }, []);

  const toggleStatus = async (admin) => {
    const newStatus = admin.status === "active" ? "inactive" : "active";
    try {
      const res = await api.post("/admin/toggle_status_admin", {
        id: admin.id,
        status: newStatus,
      });
      if (res.data.success || res.data.status) {
        setAdmins((prev) =>
          prev.map((a) => (a.id === admin.id ? { ...a, status: newStatus } : a))
        );
      } else {
        alert(res.data.message);
      }
    } catch (err) {
      console.error(err);
      alert("Server error");
    }
  };

  const filtered = admins.filter(
    (a) =>
      a.name?.toLowerCase().includes(search.toLowerCase()) ||
      a.email?.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice(
    (safePage - 1) * rowsPerPage,
    safePage * rowsPerPage
  );

  const getInitials = (name) =>
    name
      ? name
          .split(" ")
          .slice(0, 2)
          .map((w) => w[0])
          .join("")
          .toUpperCase()
      : "?";

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <span>🛡️</span> Admins
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage system administrators and company superuser accounts
          </p>
        </div>

        <button
          onClick={() => navigate("/admin/add")}
          className="app-btn-primary inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm shadow-sm transition"
        >
          <Plus size={16} />
          Add Admin
        </button>
      </div>

      {/* Main Table Container */}
      <TableContainer
        title="Administrators Directory"
        badge={filtered.length}
        searchQuery={search}
        onSearchChange={(val) => {
          setSearch(val);
          setCurrentPage(1);
        }}
        searchPlaceholder="Search admins by name or email..."
      >
        <Table>
          <Thead>
            <Tr>
              <Th className="w-14">#</Th>
              <Th>Admin Name</Th>
              <Th>Email Address</Th>
              <Th align="center">Status</Th>
              <Th align="center" className="w-24">Actions</Th>
            </Tr>
          </Thead>

          <Tbody>
            {loading ? (
              <TableLoadingState colSpan={5} message="Loading administrators..." />
            ) : filtered.length === 0 ? (
              <TableEmptyState
                colSpan={5}
                title="No Admins Found"
                description={
                  search
                    ? `No admin accounts match "${search}".`
                    : "No admin accounts found."
                }
                actionLabel={!search ? "+ Add Admin" : undefined}
                onAction={!search ? () => navigate("/admin/add") : undefined}
              />
            ) : (
              paginated.map((a, idx) => (
                <Tr key={a.id}>
                  <Td className="font-semibold text-slate-500">
                    {(safePage - 1) * rowsPerPage + idx + 1}
                  </Td>

                  <Td>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 font-extrabold text-xs flex items-center justify-center shrink-0 shadow-2xs">
                        {getInitials(a.name)}
                      </div>
                      <div>
                        <div className="font-bold text-slate-800">{a.name}</div>
                        <span className="text-[10px] font-mono text-slate-400">
                          ID #{a.id}
                        </span>
                      </div>
                    </div>
                  </Td>

                  <Td className="text-slate-600 font-medium">{a.email || "—"}</Td>

                  <Td align="center">
                    <button
                      type="button"
                      onClick={() => toggleStatus(a)}
                      title="Click to toggle status"
                      className="cursor-pointer"
                    >
                      <TableStatusBadge status={a.status || "active"} />
                    </button>
                  </Td>

                  <Td align="center">
                    <TableActionButtons
                      onEdit={() => navigate(`/admin/edit/${a.id}`)}
                      editTitle="Edit Admin"
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
            itemLabel="admins"
          />
        )}
      </TableContainer>
    </div>
  );
}