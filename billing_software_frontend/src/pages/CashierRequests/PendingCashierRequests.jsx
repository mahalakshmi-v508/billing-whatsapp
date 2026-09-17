import { useEffect, useState } from "react";
import api from "../../services/api";
import { Check, X, Users, ShieldCheck } from "lucide-react";
import {
  TableContainer,
  Table,
  Thead,
  Th,
  Tbody,
  Tr,
  Td,
  TablePagination,
  TableLoadingState,
  TableEmptyState,
} from "../../components/table";

export default function PendingCashierRequests() {
  const [data, setData] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [confirmBox, setConfirmBox] = useState({
    open: false,
    type: "",
    id: null,
  });

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await api.get("/CashierRequest/get_cashier_requests");
      if (res.data.status) {
        setData(res.data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const approve = async (id) => {
    setActionLoading(id);
    try {
      const res = await api.post("/CashierRequest/approve_cashier_request", { id });
      alert(res.data.message || "Approved successfully");
      fetchRequests();
    } catch (err) {
      console.error(err);
      alert("Failed to approve request");
    } finally {
      setActionLoading(null);
    }
  };

  const reject = async (id) => {
    setActionLoading(id);
    try {
      const res = await api.post("/CashierRequest/reject_cashier_request", { id });
      alert(res.data.message || "Rejected successfully");
      fetchRequests();
    } catch (err) {
      console.error(err);
      alert("Failed to reject request");
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = data.filter(
    (item) =>
      item.company_name?.toLowerCase().includes(search.toLowerCase()) ||
      item.name?.toLowerCase().includes(search.toLowerCase()) ||
      item.email?.toLowerCase().includes(search.toLowerCase()) ||
      item.admin_name?.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice(
    (safePage - 1) * rowsPerPage,
    safePage * rowsPerPage
  );

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      {/* Confirmation Modal */}
      {confirmBox.open && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 ${
                confirmBox.type === "approve"
                  ? "bg-emerald-50 text-emerald-600"
                  : "bg-rose-50 text-rose-600"
              }`}
            >
              {confirmBox.type === "approve" ? <Check size={24} /> : <X size={24} />}
            </div>

            <h3 className="text-lg font-bold text-slate-900 text-center">
              {confirmBox.type === "approve" ? "Approve Cashier Request?" : "Reject Cashier Request?"}
            </h3>

            <p className="text-xs text-slate-500 text-center mt-2 leading-relaxed">
              {confirmBox.type === "approve"
                ? "This cashier account will be activated immediately and assigned to the company."
                : "This cashier request will be permanently rejected."}
            </p>

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setConfirmBox({ open: false, type: "", id: null })}
                className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  const id = confirmBox.id;
                  const type = confirmBox.type;
                  setConfirmBox({ open: false, type: "", id: null });
                  if (type === "approve") {
                    await approve(id);
                  } else {
                    await reject(id);
                  }
                }}
                className={`flex-1 py-2 rounded-xl text-white font-bold text-xs shadow-sm transition cursor-pointer ${
                  confirmBox.type === "approve"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-rose-600 hover:bg-rose-700"
                }`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <span>👥</span> Cashier Requests
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Review and approve requests for additional cashier licenses
          </p>
        </div>

        <div className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <Users size={20} />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Pending Requests
            </div>
            <div className="text-lg font-extrabold text-slate-800">
              {filtered.length}
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <TableContainer
        title="Cashier Requests"
        badge={filtered.length}
        searchQuery={search}
        onSearchChange={(val) => {
          setSearch(val);
          setCurrentPage(1);
        }}
        searchPlaceholder="Search by company, cashier name, or email..."
      >
        <Table>
          <Thead>
            <Tr>
              <Th className="w-14">#</Th>
              <Th>Company</Th>
              <Th>Requested By (Admin)</Th>
              <Th>Cashier Name</Th>
              <Th>Email Address</Th>
              <Th align="center" className="w-48">Actions</Th>
            </Tr>
          </Thead>

          <Tbody>
            {loading ? (
              <TableLoadingState colSpan={6} message="Loading cashier requests..." />
            ) : filtered.length === 0 ? (
              <TableEmptyState
                colSpan={6}
                title="No Pending Requests"
                description={
                  search
                    ? `No cashier requests match "${search}".`
                    : "There are currently no pending cashier access requests."
                }
              />
            ) : (
              paginated.map((item, index) => (
                <Tr key={item.id}>
                  <Td className="font-semibold text-slate-500">
                    {(safePage - 1) * rowsPerPage + index + 1}
                  </Td>

                  <Td>
                    <span className="font-bold text-slate-800">{item.company_name}</span>
                    <div className="text-[10px] font-mono text-slate-400">Request #{item.id}</div>
                  </Td>

                  <Td>
                    <span className="font-semibold text-slate-700 text-xs">
                      {item.admin_name || "Admin"}
                    </span>
                  </Td>

                  <Td>
                    <span className="font-bold text-slate-900">{item.name}</span>
                  </Td>

                  <Td className="text-slate-600 font-medium">{item.email || "—"}</Td>

                  <Td align="center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        disabled={actionLoading === item.id}
                        onClick={() =>
                          setConfirmBox({
                            open: true,
                            type: "approve",
                            id: item.id,
                          })
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition cursor-pointer disabled:opacity-50"
                        title="Approve Cashier"
                      >
                        <Check size={14} />
                        <span>Accept</span>
                      </button>

                      <button
                        type="button"
                        disabled={actionLoading === item.id}
                        onClick={() =>
                          setConfirmBox({
                            open: true,
                            type: "reject",
                            id: item.id,
                          })
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition cursor-pointer disabled:opacity-50"
                        title="Reject Cashier"
                      >
                        <X size={14} />
                        <span>Reject</span>
                      </button>
                    </div>
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
            itemLabel="requests"
          />
        )}
      </TableContainer>
    </div>
  );
}