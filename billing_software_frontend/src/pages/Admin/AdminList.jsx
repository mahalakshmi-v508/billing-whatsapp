import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import { Pencil, ShieldCheck, ChevronLeft, ChevronRight, Search } from "lucide-react";

const ITEMS_PER_PAGE = 5;

export default function AdminList() {
    const navigate = useNavigate();
    const [admins, setAdmins] = useState([]);
    const [search, setSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);

    // const user = JSON.parse(
    //     localStorage.getItem("user")
    // );

    // const company_id = user?.company_id || 0;

    const fetchAdmins = async () => {
        try {
            const res = await api.get("/admin/get_admins");
            if (res.data.status) setAdmins(res.data.data);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        fetchAdmins();
    }, []);

    const toggleStatus = async (admin) => {
        const newStatus = admin.status === "active" ? "inactive" : "active";
        try {
            const res = await api.post("/admin/toggle_status_admin", {
                id: admin.id,
                status: newStatus,
            });
            if (res.data.success) {
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

    const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
    const safePage = Math.min(currentPage, totalPages);
    const paginated = filtered.slice(
        (safePage - 1) * ITEMS_PER_PAGE,
        safePage * ITEMS_PER_PAGE
    );

    const handleSearch = (val) => {
        setSearch(val);
        setCurrentPage(1);
    };

    const getInitials = (name) =>
        name
            ? name.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase()
            : "?";

    return (
        <>
            <style>{`
            @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

            .al-wrap {
            font-family: 'Plus Jakarta Sans', sans-serif;
            min-height: 100vh;
            background: #f0f4ff;
            padding: 2rem;
            }

            /* ── Header ── */
            .al-topbar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1.75rem;
            flex-wrap: wrap;
            gap: 12px;
            }
            .al-title-group { display: flex; align-items: center; gap: 12px; }
            .al-icon-wrap {
            width: 44px; height: 44px; border-radius: 12px;
            background: linear-gradient(135deg, #1e40af, #3b82f6);
            display: flex; align-items: center; justify-content: center;
            flex-shrink: 0;
            }
            .al-title { font-size: 22px; font-weight: 800; color: #1e293b; margin: 0; }
            .al-subtitle { font-size: 13px; color: #64748b; margin: 2px 0 0; }

            .al-add-btn {
            display: inline-flex; align-items: center; gap: 7px;
            padding: 10px 20px; border-radius: 12px; border: none;
            background: linear-gradient(135deg, #1d4ed8, #3b82f6);
            color: #fff; font-family: 'Plus Jakarta Sans', sans-serif;
            font-size: 14px; font-weight: 700; cursor: pointer;
            box-shadow: 0 4px 14px rgba(37,99,235,0.35);
            transition: all 0.2s;
            }
            .al-add-btn:hover { transform: translateY(-1px); box-shadow: 0 8px 20px rgba(37,99,235,0.45); }

            /* ── Search ── */
            .al-search-wrap { position: relative; margin-bottom: 1.25rem; }
            .al-search-icon {
            position: absolute; left: 14px; top: 50%;
            transform: translateY(-50%); color: #94a3b8; pointer-events: none;
            }
            .al-search {
            width: 100%; padding: 11px 14px 11px 42px;
            border-radius: 12px; border: 1.5px solid #e2e8f0;
            background: #fff; font-family: 'Plus Jakarta Sans', sans-serif;
            font-size: 14px; color: #1e293b; outline: none;
            box-sizing: border-box; transition: all 0.2s;
            }
            .al-search::placeholder { color: #c4cdd6; }
            .al-search:focus { border-color: #3b82f6; box-shadow: 0 0 0 4px rgba(59,130,246,0.1); }

            /* ── Card ── */
            .al-card {
            background: #fff; border-radius: 20px;
            border: 1px solid #e2e8f0;
            box-shadow: 0 4px 24px rgba(37,99,235,0.08);
            overflow: hidden;
            }

            .al-table { width: 100%; border-collapse: collapse; }

            .al-th {
            padding: 14px 16px;
            font-size: 11px; font-weight: 700;
            text-transform: uppercase; letter-spacing: 0.08em;
            color: rgba(255,255,255,0.85);
            text-align: left; white-space: nowrap;
            background: linear-gradient(135deg, #1e40af, #2563eb);
            }
            .al-th.center { text-align: center; }

            /* ── Rows ── */
            .al-tr { border-bottom: 1px solid #f1f5f9; transition: background 0.15s; }
            .al-tr:last-child { border-bottom: none; }
            .al-tr:hover { background: #f8faff; }
            .al-td { padding: 14px 16px; vertical-align: middle; }

            /* avatar */
            .al-avatar {
            width: 40px; height: 40px; border-radius: 10px;
            background: linear-gradient(135deg, #dbeafe, #eff6ff);
            border: 1.5px solid #bfdbfe;
            display: flex; align-items: center; justify-content: center;
            font-size: 13px; font-weight: 700; color: #1d4ed8;
            flex-shrink: 0;
            }

            .al-admin-cell { display: flex; align-items: center; gap: 10px; }
            .al-admin-name { font-size: 14px; font-weight: 700; color: #1e293b; }
            .al-admin-sub  { font-size: 12px; color: #64748b; margin-top: 2px; }

            .al-badge {
            display: inline-block; padding: 3px 10px;
            border-radius: 100px; font-size: 11.5px; font-weight: 700;
            }
            .al-badge-blue { background: #eff6ff; color: #1d4ed8; border: 1px solid #bfdbfe; }
            .al-badge-gray { background: #f8fafc; color: #64748b; border: 1px solid #e2e8f0; }

            .al-text-muted { font-size: 13.5px; color: #475569; }

            /* action buttons */
            .al-actions { display: flex; align-items: center; justify-content: center; gap: 8px; }
            .al-btn-edit {
            width: 34px; height: 34px; border-radius: 9px;
            display: flex; align-items: center; justify-content: center;
            border: none; cursor: pointer; transition: all 0.18s;
            background: #eff6ff; color: #2563eb;
            }
            .al-btn-edit:hover { background: #dbeafe; transform: scale(1.08); }

            /* toggle switch */
            .al-switch {
            position: relative; display: inline-block;
            width: 45px; height: 20px;
            }
            .al-switch input { opacity: 0; width: 0; height: 0; }
            .al-slider {
            position: absolute; cursor: pointer; inset: 0;
            background: #d1d5db; transition: 0.4s; border-radius: 999px;
            }
            .al-slider:before {
            position: absolute; content: "";
            height: 14px; width: 15px; left: 3px; top: 3px;
            background: white; transition: 0.4s; border-radius: 50%;
            box-shadow: 0 2px 6px rgba(0,0,0,0.25);
            }
            .al-switch input:checked + .al-slider { background: linear-gradient(135deg, #1d4ed8, #3b82f6); }
            .al-switch input:checked + .al-slider:before { transform: translateX(24px); }

            /* ── Empty state ── */
            .al-empty { text-align: center; padding: 3rem 1rem; color: #94a3b8; }
            .al-empty-icon {
            width: 56px; height: 56px; border-radius: 16px;
            background: #f1f5f9; margin: 0 auto 12px;
            display: flex; align-items: center; justify-content: center;
            }
            .al-empty p { font-size: 14px; font-weight: 600; color: #64748b; margin: 0 0 4px; }
            .al-empty span { font-size: 13px; }

            /* ── Pagination ── */
            .al-pagination {
            display: flex; align-items: center; justify-content: space-between;
            padding: 14px 20px; border-top: 1px solid #f1f5f9;
            background: #fafbff; flex-wrap: wrap; gap: 10px;
            }
            .al-page-info { font-size: 13px; color: #64748b; }
            .al-page-info strong { color: #1e293b; font-weight: 700; }
            .al-page-btns { display: flex; align-items: center; gap: 5px; }
            .al-page-btn {
            width: 34px; height: 34px; border-radius: 9px;
            display: flex; align-items: center; justify-content: center;
            border: 1.5px solid #e2e8f0; background: #fff;
            font-family: 'Plus Jakarta Sans', sans-serif;
            font-size: 13px; font-weight: 600; color: #64748b;
            cursor: pointer; transition: all 0.18s;
            }
            .al-page-btn:hover:not(:disabled) { border-color: #3b82f6; color: #2563eb; background: #eff6ff; }
            .al-page-btn:disabled { opacity: 0.38; cursor: not-allowed; }
            .al-page-btn.active {
            background: linear-gradient(135deg, #1d4ed8, #3b82f6);
            border-color: transparent; color: #fff;
            box-shadow: 0 3px 10px rgba(37,99,235,0.35);
            }
        `}</style>

            <div className="al-wrap">

                {/* Top bar */}
                <div className="al-topbar">
                    <div className="al-title-group">
                        <div className="al-icon-wrap">
                            <ShieldCheck size={22} color="#fff" />
                        </div>
                        <div>
                            <h1 className="al-title">Admins</h1>
                            <p className="al-subtitle">Manage company administrators</p>
                        </div>
                    </div>
                    <button className="al-add-btn" onClick={() => navigate("/admin/add")}>
                        + Add Admin
                    </button>
                </div>

                {/* Search */}
                <div className="al-search-wrap">
                    <Search size={16} className="al-search-icon" />
                    <input
                        className="al-search"
                        placeholder="Search by name or email…"
                        value={search}
                        onChange={(e) => handleSearch(e.target.value)}
                    />
                </div>

                {/* Table card */}
                <div className="al-card">
                    <table className="al-table">
                        <thead>
                            <tr>
                                <th className="al-th">#</th>
                                <th className="al-th">Admin</th>
                                <th className="al-th">Email</th>
                                <th className="al-th center">Actions</th>
                                <th className="al-th">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginated.length === 0 ? (
                                <tr>
                                    <td colSpan={5}>
                                        <div className="al-empty">
                                            <div className="al-empty-icon">
                                                <ShieldCheck size={26} color="#94a3b8" />
                                            </div>
                                            <p>{search ? "No admins match your search." : "No admins found."}</p>
                                            <span>
                                                {search
                                                    ? "Try a different keyword."
                                                    : "Click '+ Add Admin' to get started."}
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                paginated.map((a, idx) => (
                                    <tr key={a.id} className="al-tr">

                                        {/* Serial */}
                                        <td className="al-td">
                                            <span className="al-badge al-badge-gray">
                                                {(safePage - 1) * ITEMS_PER_PAGE + idx + 1}
                                            </span>
                                        </td>

                                        {/* Admin name + initials */}
                                        <td className="al-td">
                                            <div className="al-admin-cell">
                                                <div className="al-avatar">{getInitials(a.name)}</div>
                                                <div>
                                                    <div className="al-admin-name">{a.name}</div>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Email */}
                                        <td className="al-td">
                                            <span className="al-text-muted">{a.email || "—"}</span>
                                        </td>

                                        {/* Actions */}
                                        <td className="al-td">
                                            <div className="al-actions">
                                                <button
                                                    className="al-btn-edit"
                                                    title="Edit"
                                                    onClick={() => navigate(`/admin/edit/${a.id}`)}
                                                >
                                                    <Pencil size={16} />
                                                </button>
                                                <label className="al-switch">
                                                    <input
                                                        type="checkbox"
                                                        checked={a.status === "active"}
                                                        onChange={() => toggleStatus(a)}
                                                    />
                                                    <span className="al-slider"></span>
                                                </label>
                                            </div>
                                        </td>

                                        {/* Status badge */}
                                        <td className="al-td">
                                            <span
                                                className={`al-badge ${a.status === "active" ? "al-badge-blue" : "al-badge-gray"
                                                    }`}
                                            >
                                                {a.status}
                                            </span>
                                        </td>

                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>

                    {/* Pagination */}
                    {filtered.length > ITEMS_PER_PAGE && (
                        <div className="al-pagination">
                            <p className="al-page-info">
                                Showing{" "}
                                <strong>
                                    {(safePage - 1) * ITEMS_PER_PAGE + 1}–
                                    {Math.min(safePage * ITEMS_PER_PAGE, filtered.length)}
                                </strong>{" "}
                                of <strong>{filtered.length}</strong> admins
                            </p>
                            <div className="al-page-btns">
                                <button
                                    className="al-page-btn"
                                    disabled={safePage === 1}
                                    onClick={() => setCurrentPage((p) => p - 1)}
                                >
                                    <ChevronLeft size={16} />
                                </button>

                                {Array.from({ length: totalPages }, (_, i) => i + 1)
                                    .filter(
                                        (p) =>
                                            p === 1 ||
                                            p === totalPages ||
                                            Math.abs(p - safePage) <= 1
                                    )
                                    .reduce((acc, p, i, arr) => {
                                        if (i > 0 && arr[i - 1] !== p - 1) acc.push("...");
                                        acc.push(p);
                                        return acc;
                                    }, [])
                                    .map((item, i) =>
                                        item === "..." ? (
                                            <span
                                                key={`dots-${i}`}
                                                style={{ padding: "0 4px", color: "#94a3b8", fontSize: 13 }}
                                            >
                                                …
                                            </span>
                                        ) : (
                                            <button
                                                key={item}
                                                className={`al-page-btn ${safePage === item ? "active" : ""}`}
                                                onClick={() => setCurrentPage(item)}
                                            >
                                                {item}
                                            </button>
                                        )
                                    )}

                                <button
                                    className="al-page-btn"
                                    disabled={safePage === totalPages}
                                    onClick={() => setCurrentPage((p) => p + 1)}
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </>
    );
}