import { useEffect, useMemo, useState } from "react";
import api from "../../services/api";
import { Check, X, Building2, Users } from "lucide-react";
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

export default function CompanyRequest() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState("");

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await api.get("/CompanyRequest/get_company_requests");
      if (res.data.status) {
        setRequests(res.data.data || []);
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

  const handleApprove = async (requestId) => {
    try {
      setActionLoading(requestId);
      const res = await api.post("/CompanyRequest/approve_company_request", {
        request_id: requestId,
      });

      if (res.data.status) {
        alert("Company request approved successfully");
        fetchRequests();
      } else {
        alert(res.data.message);
      }
    } catch (err) {
      console.error(err);
      alert("Approval failed");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (requestId) => {
    if (!window.confirm("Are you sure you want to reject this request?")) {
      return;
    }

    try {
      setActionLoading(requestId);
      const res = await api.post("/CompanyRequest/reject_company_request", {
        request_id: requestId,
      });

      if (res.data.status) {
        alert("Company request rejected");
        fetchRequests();
      } else {
        alert(res.data.message);
      }
    } catch (err) {
      console.error(err);
      alert("Reject failed");
    } finally {
      setActionLoading(null);
    }
  };

  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      const txt = search.toLowerCase();
      return (
        (r.company_name || "").toLowerCase().includes(txt) ||
        (r.owner_name || "").toLowerCase().includes(txt) ||
        (r.admin_name || "").toLowerCase().includes(txt) ||
        (r.owner_email || "").toLowerCase().includes(txt)
      );
    });
  }, [requests, search]);

  const totalPages = Math.max(1, Math.ceil(filteredRequests.length / rowsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedRequests = filteredRequests.slice(
    (safePage - 1) * rowsPerPage,
    safePage * rowsPerPage
  );

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <span>🏢</span> Pending Company Requests
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Review and approve requests to register new company workspaces
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
              {filteredRequests.length}
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <TableContainer
        title="Company Requests"
        badge={filteredRequests.length}
        searchQuery={search}
        onSearchChange={(val) => {
          setSearch(val);
          setCurrentPage(1);
        }}
        searchPlaceholder="Search by company name, admin, or email..."
      >
        <Table>
          <Thead>
            <Tr>
              <Th className="w-14">#</Th>
              <Th>Company Details</Th>
              <Th>Requested By (Admin)</Th>
              <Th align="center" className="w-48">Actions</Th>
            </Tr>
          </Thead>

          <Tbody>
            {loading ? (
              <TableLoadingState colSpan={4} message="Loading company requests..." />
            ) : filteredRequests.length === 0 ? (
              <TableEmptyState
                colSpan={4}
                title="No Pending Requests"
                description={
                  search
                    ? `No company requests match "${search}".`
                    : "There are currently no pending company registration requests."
                }
              />
            ) : (
              paginatedRequests.map((item, index) => (
                <Tr key={item.id}>
                  <Td className="font-semibold text-slate-500">
                    {(safePage - 1) * rowsPerPage + index + 1}
                  </Td>

                  <Td>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 font-extrabold text-base flex items-center justify-center shrink-0 shadow-2xs">
                        {item.company_name?.charAt(0)?.toUpperCase() || "C"}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-sm">
                          {item.company_name}
                        </div>
                        <div className="text-xs text-slate-400 font-medium mt-0.5">
                          Request ID #{item.id}
                        </div>
                      </div>
                    </div>
                  </Td>

                  <Td>
                    <div className="font-semibold text-slate-800 text-xs">
                      {item.admin_name || item.owner_name || "Admin"}
                    </div>
                    {item.owner_email && (
                      <div className="text-xs text-slate-400 font-medium">
                        {item.owner_email}
                      </div>
                    )}
                  </Td>

                  <Td align="center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        disabled={actionLoading === item.id}
                        onClick={() => handleApprove(item.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition cursor-pointer disabled:opacity-50"
                        title="Accept Request"
                      >
                        <Check size={14} />
                        <span>Accept</span>
                      </button>

                      <button
                        type="button"
                        disabled={actionLoading === item.id}
                        onClick={() => handleReject(item.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition cursor-pointer disabled:opacity-50"
                        title="Reject Request"
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

        {filteredRequests.length > 0 && (
          <TablePagination
            currentPage={safePage}
            totalPages={totalPages}
            totalItems={filteredRequests.length}
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