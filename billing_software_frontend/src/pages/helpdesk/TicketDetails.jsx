import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Clock,
  User,
  Tag,
  CheckCircle2,
  AlertCircle,
  FileText,
  Paperclip,
  Send,
  Lock,
  MessageSquare,
  History,
  Trash2,
  Edit,
  UserPlus,
  ShieldCheck,
  Download,
  Eye,
  Building,
  Calendar,
} from "lucide-react";
import api from "../../services/api";
import EditTicketModal from "./EditTicketModal";

const getAttachmentUrl = (path) => {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  const baseUrl = isLocalhost ? "http://localhost:8000" : "https://myricekart.in/backend/public";
  return `${baseUrl}${cleanPath}`;
};

export default function TicketDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isSupportOrAdmin = ["admin", "superadmin", "support", "developer"].includes(user?.role?.toLowerCase());
  const isDeveloper = user?.role?.toLowerCase() === "developer";

  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("comments"); // 'comments', 'internal_notes', 'audit_logs'

  // Reply Form State
  const [commentText, setCommentText] = useState("");
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [commentFiles, setCommentFiles] = useState([]);
  const [submittingReply, setSubmittingReply] = useState(false);

  // Edit Modal State
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Staff Users for assignment dropdown
  const [staffUsers, setStaffUsers] = useState([]);

  // Image Preview Modal State
  const [previewImage, setPreviewImage] = useState(null);

  useEffect(() => {
    fetchTicketDetails();
    if (isSupportOrAdmin) {
      fetchStaffUsers();
    }
  }, [id]);

  const fetchTicketDetails = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get(`/tickets/${id}`, {
        headers: {
          "X-User-Role": user.role,
          "X-User-Id": user.id,
        },
      });
      if (res.data.status) {
        setTicket(res.data.data);
      } else {
        setError(res.data.message || "Failed to load ticket");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Server error loading ticket details.");
    } finally {
      setLoading(false);
    }
  };

  const fetchStaffUsers = async () => {
    try {
      const res = await api.get("/helpdesk/staff-users");
      if (res.data.status) {
        setStaffUsers(res.data.data || []);
      }
    } catch (err) {
      console.error("Failed to load staff list", err);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      const res = await api.put(`/tickets/${id}/status`, {
        status: newStatus,
        user_id: user.id,
        user_name: user.name,
        user_role: user.role,
      });
      if (res.data.status) {
        setTicket((prev) => ({ ...prev, status: newStatus }));
        fetchTicketDetails(); // Refresh audit logs & dates
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update status.");
    }
  };

  const handleAssignChange = async (assignedToId) => {
    try {
      const res = await api.put(`/tickets/${id}/assign`, {
        assigned_to: assignedToId || null,
        user_id: user.id,
        user_name: user.name,
        user_role: user.role,
      });
      if (res.data.status) {
        fetchTicketDetails();
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to assign staff.");
    }
  };

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!commentText.trim() && commentFiles.length === 0) return;

    setSubmittingReply(true);
    try {
      const payload = new FormData();
      payload.append("comment", commentText.trim());
      payload.append("user_id", user.id);
      payload.append("user_name", user.name);
      payload.append("user_role", user.role);
      payload.append("is_internal", isInternalNote ? 1 : 0);

      commentFiles.forEach((file) => {
        payload.append("attachments[]", file);
      });

      const res = await api.post(`/tickets/${id}/comments`, payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data.status) {
        setCommentText("");
        setCommentFiles([]);
        setIsInternalNote(false);
        fetchTicketDetails();
      }
    } catch (err) {
      alert(err.response?.data?.message || "Failed to post reply.");
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleDeleteTicket = async () => {
    if (!window.confirm(`Are you sure you want to delete Ticket #${ticket.ticket_no}?`)) return;
    try {
      const res = await api.delete(`/tickets/${id}`);
      if (res.data.status) {
        navigate("/helpdesk");
      }
    } catch (err) {
      alert("Failed to delete ticket.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-bold text-gray-500">Loading Ticket #{id}...</p>
        </div>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="p-8 bg-white rounded-3xl text-center space-y-4 max-w-lg mx-auto mt-12 border border-gray-100 shadow-sm">
        <div className="w-16 h-16 rounded-full bg-red-50 text-red-500 mx-auto flex items-center justify-center">
          <AlertCircle size={32} />
        </div>
        <h3 className="text-xl font-bold text-gray-900">Ticket Not Available</h3>
        <p className="text-sm text-gray-500">{error || "The requested ticket does not exist or you do not have permission."}</p>
        <button
          onClick={() => navigate("/helpdesk")}
          className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-xs hover:bg-indigo-700 transition"
        >
          Back to Tickets List
        </button>
      </div>
    );
  }

  const priorityBadges = {
    low: "bg-slate-100 text-slate-700 border-slate-200",
    medium: "bg-amber-50 text-amber-700 border-amber-200",
    high: "bg-orange-50 text-orange-700 border-orange-200",
    critical: "bg-red-50 text-red-700 border-red-200 animate-pulse",
  };

  const statusBadges = {
    open: "bg-blue-50 text-blue-700 border-blue-200",
    in_progress: "bg-purple-50 text-purple-700 border-purple-200",
    waiting_for_customer: "bg-amber-50 text-amber-700 border-amber-200",
    resolved: "bg-emerald-50 text-emerald-700 border-emerald-200",
    closed: "bg-slate-100 text-slate-700 border-slate-200",
  };

  const commentsList = (ticket.comments || []).filter((c) => (activeTab === "internal_notes" ? c.is_internal : !c.is_internal));

  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto">
      {/* STICKY TOP HEADER */}
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-md p-4 sm:p-5 rounded-3xl shadow-sm border border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/helpdesk")}
            className="p-2.5 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
                #{ticket.ticket_no}
              </span>
              <span className={`text-xs font-bold px-3 py-1 rounded-full border capitalize ${statusBadges[ticket.status]}`}>
                {ticket.status.replace(/_/g, " ")}
              </span>
              <span className={`text-xs font-bold px-3 py-1 rounded-full border capitalize ${priorityBadges[ticket.priority]}`}>
                {ticket.priority} priority
              </span>
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 mt-1">{ticket.subject}</h1>
          </div>
        </div>

        {/* QUICK STATUS UPDATE BUTTONS IN HEADER (DEVELOPER ONLY) */}
        <div className="flex items-center gap-2 flex-wrap">
          {isDeveloper && (
            <div className="hidden lg:flex items-center gap-1 bg-gray-100 p-1 rounded-2xl border border-gray-200">
              {[
                { val: "open", label: "Open", activeBg: "bg-blue-600 text-white" },
                { val: "in_progress", label: "In Progress", activeBg: "bg-purple-600 text-white" },
                { val: "waiting_for_customer", label: "Waiting Customer", activeBg: "bg-amber-600 text-white" },
                { val: "resolved", label: "Resolved", activeBg: "bg-emerald-600 text-white" },
                { val: "closed", label: "Closed", activeBg: "bg-slate-700 text-white" },
              ].map((st) => {
                const active = ticket.status === st.val;
                return (
                  <button
                    key={st.val}
                    type="button"
                    onClick={() => handleStatusChange(st.val)}
                    className={`px-2.5 py-1.5 rounded-xl font-bold text-[11px] transition ${
                      active
                        ? `${st.activeBg} shadow-sm`
                        : "text-gray-600 hover:text-gray-900 hover:bg-white/50"
                    }`}
                  >
                    {st.label}
                  </button>
                );
              })}
            </div>
          )}

          {(isSupportOrAdmin || ticket.status !== "closed") && (
            <button
              onClick={() => setIsEditOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition flex items-center gap-1.5"
            >
              <Edit size={14} />
              Edit Ticket
            </button>
          )}

          {isSupportOrAdmin && (
            <button
              onClick={handleDeleteTicket}
              className="px-3.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-bold text-xs transition flex items-center gap-1.5"
            >
              <Trash2 size={14} />
              Delete
            </button>
          )}
        </div>
      </div>

      {/* DUAL COLUMN MAIN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: Ticket Content, Attachments & Timeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* TICKET DESCRIPTION */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                  {ticket.user?.name?.charAt(0)?.toUpperCase() || "U"}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-900">{ticket.user?.name || "Customer User"}</h4>
                  <span className="text-[11px] text-gray-400">
                    Created {new Date(ticket.created_at).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-sm text-gray-800 leading-relaxed whitespace-pre-line">
              {ticket.description}
            </div>

            {/* ATTACHMENTS GRID */}
            {ticket.attachments && ticket.attachments.length > 0 && (
              <div className="pt-4 border-t border-gray-100 space-y-2">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
                  Ticket Attachments ({ticket.attachments.length})
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {ticket.attachments.map((att) => {
                    const isImg = att.file_type?.includes("image") || ["jpg", "jpeg", "png"].some((ext) => att.original_name.toLowerCase().endsWith(ext));
                    return (
                      <div
                        key={att.id}
                        className="p-3 bg-gray-50 border border-gray-100 rounded-2xl flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <FileText size={18} className="text-indigo-500 shrink-0" />
                          <span className="font-semibold text-gray-800 truncate">{att.original_name}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {isImg && (
                            <button
                              onClick={() => setPreviewImage(getAttachmentUrl(att.file_path))}
                              className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-gray-200 rounded-lg transition"
                              title="Preview image"
                            >
                              <Eye size={14} />
                            </button>
                          )}
                          <a
                            href={getAttachmentUrl(att.file_path)}
                            target="_blank"
                            rel="noreferrer"
                            download
                            className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-gray-200 rounded-lg transition"
                            title="Download"
                          >
                            <Download size={14} />
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* TABBED TIMELINE SECTION */}
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            {/* TABS HEADER */}
            <div className="flex items-center gap-2 p-2 bg-gray-50 border-b border-gray-100">
              <button
                onClick={() => setActiveTab("comments")}
                className={`flex-1 py-2.5 px-4 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                  activeTab === "comments"
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                <MessageSquare size={16} />
                Public Discussion ({(ticket.comments || []).filter((c) => !c.is_internal).length})
              </button>

              {isSupportOrAdmin && (
                <button
                  onClick={() => setActiveTab("internal_notes")}
                  className={`flex-1 py-2.5 px-4 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                    activeTab === "internal_notes"
                      ? "bg-amber-500 text-white shadow-sm"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  <Lock size={16} />
                  Internal Notes ({(ticket.comments || []).filter((c) => c.is_internal).length})
                </button>
              )}

              <button
                onClick={() => setActiveTab("audit_logs")}
                className={`flex-1 py-2.5 px-4 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 ${
                  activeTab === "audit_logs"
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-gray-500 hover:text-gray-900"
                }`}
              >
                <History size={16} />
                Audit History ({(ticket.logs || []).length})
              </button>
            </div>

            {/* TAB CONTENT: COMMENTS & INTERNAL NOTES */}
            {activeTab !== "audit_logs" && (
              <div className="p-6 space-y-6">
                {commentsList.length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-xs">
                    No {activeTab === "internal_notes" ? "internal notes" : "replies"} posted yet.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {commentsList.map((c) => {
                      const isSelf = c.user_id === user.id;
                      return (
                        <div
                          key={c.id}
                          className={`p-4 rounded-2xl border transition ${
                            c.is_internal
                              ? "bg-amber-50/50 border-amber-200"
                              : isSelf
                              ? "bg-indigo-50/30 border-indigo-100"
                              : "bg-gray-50/70 border-gray-100"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-xs font-bold flex items-center justify-center">
                                {c.user?.name?.charAt(0)?.toUpperCase() || "U"}
                              </div>
                              <div>
                                <span className="text-xs font-bold text-gray-900">{c.user?.name || "Support Staff"}</span>
                                {c.is_internal && (
                                  <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded bg-amber-200 text-amber-800">
                                    INTERNAL NOTE
                                  </span>
                                )}
                              </div>
                            </div>
                            <span className="text-[10px] text-gray-400">
                              {new Date(c.created_at).toLocaleString()}
                            </span>
                          </div>

                          <p className="text-xs text-gray-800 leading-relaxed pl-10 whitespace-pre-line">{c.comment}</p>

                          {/* COMMENT ATTACHMENTS */}
                          {c.attachments && c.attachments.length > 0 && (
                            <div className="pl-10 mt-3 flex flex-wrap gap-2">
                              {c.attachments.map((ca) => (
                                <a
                                  key={ca.id}
                                  href={getAttachmentUrl(ca.file_path)}
                                  target="_blank"
                                  rel="noreferrer"
                                  download
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-gray-200 text-xs font-semibold text-gray-700 hover:text-indigo-600 transition shadow-sm"
                                >
                                  <Paperclip size={12} />
                                  {ca.original_name}
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* REPLY BOX */}
                <form onSubmit={handleCommentSubmit} className="pt-4 border-t border-gray-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                      Post a Reply
                    </label>

                    {isSupportOrAdmin && (
                      <label className="flex items-center gap-2 text-xs font-semibold text-amber-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isInternalNote}
                          onChange={(e) => setIsInternalNote(e.target.checked)}
                          className="rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                        />
                        <Lock size={14} />
                        Internal Note (Hidden from customer)
                      </label>
                    )}
                  </div>

                  <textarea
                    rows={3}
                    required
                    placeholder={
                      isInternalNote
                        ? "Add internal note visible only to support staff & admins..."
                        : "Write your reply or update here..."
                    }
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="w-full p-4 rounded-2xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-xs outline-none transition"
                  />

                  {/* FILE ATTACHMENTS FOR REPLY */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <label className="cursor-pointer px-3.5 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold flex items-center gap-1.5 transition">
                        <Paperclip size={14} />
                        Attach Files
                        <input
                          type="file"
                          multiple
                          className="hidden"
                          onChange={(e) => setCommentFiles(Array.from(e.target.files))}
                        />
                      </label>

                      {commentFiles.length > 0 && (
                        <span className="text-xs font-semibold text-indigo-600">
                          {commentFiles.length} file(s) attached
                        </span>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={submittingReply}
                      className={`px-6 py-2.5 rounded-xl font-bold text-xs text-white shadow-md transition flex items-center gap-2 ${
                        isInternalNote ? "bg-amber-600 hover:bg-amber-700" : "bg-indigo-600 hover:bg-indigo-700"
                      }`}
                    >
                      {submittingReply ? (
                        "Sending..."
                      ) : (
                        <>
                          <Send size={14} />
                          {isInternalNote ? "Post Internal Note" : "Send Reply"}
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* TAB CONTENT: AUDIT LOGS */}
            {activeTab === "audit_logs" && (
              <div className="p-6 space-y-4">
                {(ticket.logs || []).length === 0 ? (
                  <div className="text-center py-8 text-gray-400 text-xs">No audit logs recorded yet.</div>
                ) : (
                  <div className="relative pl-6 border-l-2 border-indigo-100 space-y-6">
                    {(ticket.logs || []).map((log) => (
                      <div key={log.id} className="relative group">
                        <div className="absolute -left-[31px] top-0 w-4 h-4 rounded-full bg-indigo-600 border-2 border-white shadow-sm" />
                        <div className="bg-gray-50/80 p-3.5 rounded-2xl border border-gray-100 space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-gray-900">{log.user_name} ({log.user_role})</span>
                            <span className="text-[10px] text-gray-400 font-semibold">
                              {new Date(log.created_at).toLocaleString()}
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-indigo-700">{log.action}</p>
                          {log.old_value && log.new_value && (
                            <p className="text-[11px] text-gray-600">
                              Changed from <span className="font-mono bg-gray-200 px-1 rounded">{log.old_value}</span> to{" "}
                              <span className="font-mono bg-indigo-100 text-indigo-800 px-1 rounded">{log.new_value}</span>
                            </p>
                          )}
                          {log.new_value && !log.old_value && (
                            <p className="text-[11px] text-gray-600">{log.new_value}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Ticket Metadata & Admin Controls */}
        <div className="space-y-6">
          {/* TICKET INFORMATION CARD */}
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-5">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider border-b border-gray-100 pb-3 flex items-center gap-2">
              <ShieldCheck size={18} className="text-indigo-600" />
              Ticket Metadata
            </h3>

            {/* STATUS UPDATE ACTION BUTTONS (DEVELOPER ONLY) */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Ticket Status {isDeveloper ? "(Click to Update)" : "(View Only)"}
              </label>
              {isDeveloper ? (
                <div className="flex flex-col gap-2">
                  {[
                    { val: "open", label: "Open", activeBg: "bg-blue-600 text-white shadow-md" },
                    { val: "in_progress", label: "In Progress", activeBg: "bg-purple-600 text-white shadow-md" },
                    { val: "waiting_for_customer", label: "Waiting for Customer", activeBg: "bg-amber-600 text-white shadow-md" },
                    { val: "resolved", label: "Resolved", activeBg: "bg-emerald-600 text-white shadow-md" },
                    { val: "closed", label: "Closed", activeBg: "bg-slate-700 text-white shadow-md" },
                  ].map((st) => {
                    const active = ticket.status === st.val;
                    return (
                      <button
                        key={st.val}
                        type="button"
                        onClick={() => handleStatusChange(st.val)}
                        className={`w-full px-3.5 py-2.5 rounded-xl font-bold text-xs transition flex items-center justify-between ${
                          active
                            ? st.activeBg
                            : "bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200"
                        }`}
                      >
                        <span>{st.label}</span>
                        {active && <CheckCircle2 size={16} />}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-2xl">
                  <span className={`inline-block px-3.5 py-1.5 rounded-full text-xs font-bold border capitalize ${statusBadges[ticket.status]}`}>
                    {ticket.status.replace(/_/g, " ")}
                  </span>
                  <p className="text-[11px] text-gray-400 mt-2">Only Developer role users can update ticket status.</p>
                </div>
              )}
            </div>

            {/* ASSIGNED STAFF (SUPPORT/ADMIN ONLY) */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                Assigned Staff
              </label>
              {isSupportOrAdmin ? (
                <select
                  value={ticket.assigned_to || ""}
                  onChange={(e) => handleAssignChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold outline-none bg-white"
                >
                  <option value="">Unassigned</option>
                  {staffUsers.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name} ({st.role})
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-xs font-semibold text-gray-700">
                  {ticket.assigned_user?.name || "Unassigned"}
                </span>
              )}
            </div>

            {/* CATEGORY & PRIORITY INFO */}
            <div className="space-y-3 pt-3 border-t border-gray-100 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-gray-500 font-medium">Category</span>
                <span className="font-bold text-gray-900">{ticket.category?.name || "General"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500 font-medium">Priority</span>
                <span className={`font-bold uppercase px-2 py-0.5 rounded text-[10px] ${priorityBadges[ticket.priority]}`}>
                  {ticket.priority}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500 font-medium">Created By</span>
                <span className="font-bold text-gray-900">{ticket.user?.name || "Customer"}</span>
              </div>
              {ticket.company && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 font-medium">Company</span>
                  <span className="font-bold text-gray-900">{ticket.company.company_name}</span>
                </div>
              )}
            </div>

            {/* DATES & TIMESTAMPS */}
            <div className="space-y-2 pt-3 border-t border-gray-100 text-[11px] text-gray-500">
              <div className="flex items-center gap-2">
                <Calendar size={13} className="text-gray-400" />
                Created: {new Date(ticket.created_at).toLocaleString()}
              </div>
              <div className="flex items-center gap-2">
                <Clock size={13} className="text-gray-400" />
                Last Updated: {new Date(ticket.updated_at).toLocaleString()}
              </div>
              {ticket.closed_at && (
                <div className="flex items-center gap-2 text-slate-600 font-semibold">
                  <CheckCircle2 size={13} className="text-emerald-500" />
                  Closed: {new Date(ticket.closed_at).toLocaleString()}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* EDIT MODAL */}
      <EditTicketModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        ticket={ticket}
        onTicketUpdated={(updated) => {
          setTicket((prev) => ({ ...prev, ...updated }));
          fetchTicketDetails();
        }}
      />

      {/* IMAGE PREVIEW LIGHTBOX */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img src={previewImage} alt="Preview" className="max-w-full max-h-[85vh] rounded-2xl shadow-2xl" />
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute -top-4 -right-4 w-9 h-9 rounded-full bg-white text-gray-900 flex items-center justify-center shadow-lg font-bold"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
