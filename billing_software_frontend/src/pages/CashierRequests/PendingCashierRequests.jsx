import { useEffect, useState } from "react";
import api from "../../services/api";
import {
  Check,
  X,
  Search,
  ShieldCheck,
  Users,
   ChevronLeft,
  ChevronRight
} from "lucide-react";

const ITEMS_PER_PAGE = 5;

export default function PendingCashierRequests() {

  const [data, setData] = useState([]);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [confirmBox, setConfirmBox] = useState({
  open: false,
  type: "",
  id: null
});

  const fetchRequests = async () => {

    const res = await api.get(
      "/CashierRequest/get_cashier_requests"
    );

    if (res.data.status) {
      setData(res.data.data);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);


  const showToast = (msg, ok = true) => {

  setToast({
    msg,
    ok
  });

  setTimeout(() => {
    setToast(null);
  }, 3000);
};
 const approve = async (id) => {

  const res = await api.post(
    "/CashierRequest/approve_cashier_request",
    { id }
  );

  showToast(
    res.data.message,
    res.data.status
  );

  fetchRequests();
};

 const reject = async (id) => {

  const res = await api.post(
    "/CashierRequest/reject_cashier_request",
    { id }
  );

  showToast(
    res.data.message,
    res.data.status
  );

  fetchRequests();
};

  const filtered = data.filter((item) =>

    item.company_name
      ?.toLowerCase()
      .includes(search.toLowerCase())

    ||

    item.name
      ?.toLowerCase()
      .includes(search.toLowerCase())

    ||

    item.email
      ?.toLowerCase()
      .includes(search.toLowerCase())
  );

  const totalPages = Math.max(
  1,
  Math.ceil(filtered.length / ITEMS_PER_PAGE)
);

const safePage = Math.min(
  currentPage,
  totalPages
);

const paginated = filtered.slice(
  (safePage - 1) * ITEMS_PER_PAGE,
  safePage * ITEMS_PER_PAGE
);

  const getInitial = (name) =>
    name
      ? name.charAt(0).toUpperCase()
      : "?";

  return (
<>
<style>
{`
@keyframes dialogIn {
  from {
    opacity: 0;
    transform: scale(.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
`}
</style>
    
    <div
      style={{
        minHeight: "100vh",
        background: "#eef2f7",
        padding: 30,
        fontFamily: "Inter, sans-serif"
      }}
    >

        {/* CONFIRM DIALOG */}

{confirmBox.open && (

  <div
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(15,23,42,.45)",
      zIndex: 9998,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backdropFilter: "blur(4px)"
    }}
  >

    <div
      style={{
        width: 380,
        background: "#fff",
        borderRadius: 28,
        padding: 28,
        boxShadow:
          "0 20px 50px rgba(0,0,0,.18)",
        animation: "dialogIn .25s ease"
      }}
    >

      <div
        style={{
          width: 70,
          height: 70,
          margin: "0 auto 18px",
          borderRadius: 22,
          background:
            confirmBox.type === "approve"
              ? "#dcfce7"
              : "#fee2e2",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
      >

        {confirmBox.type === "approve" ? (

          <Check
            size={34}
            color="#16a34a"
          />

        ) : (

          <X
            size={34}
            color="#dc2626"
          />

        )}

      </div>

      <h3
        style={{
          margin: 0,
          textAlign: "center",
          fontSize: 24,
          color: "#0f172a",
          fontWeight: 700
        }}
      >
        {confirmBox.type === "approve"
          ? "Approve Request?"
          : "Reject Request?"}
      </h3>

      <p
        style={{
          marginTop: 10,
          textAlign: "center",
          color: "#64748b",
          fontSize: 14,
          lineHeight: 1.6
        }}
      >
        {confirmBox.type === "approve"
          ? "This cashier will be activated immediately."
          : "This cashier request will be rejected permanently."}
      </p>

      <div
        style={{
          display: "flex",
          gap: 12,
          marginTop: 26
        }}
      >

        <button
          onClick={() =>
            setConfirmBox({
              open: false,
              type: "",
              id: null
            })
          }
          style={{
            flex: 1,
            height: 48,
            borderRadius: 14,
            border: "1px solid #e2e8f0",
            background: "#fff",
            color: "#475569",
            fontWeight: 600,
            cursor: "pointer",
            fontSize: 14
          }}
        >
          No
        </button>

        <button
          onClick={async () => {

            if (
              confirmBox.type === "approve"
            ) {

              await approve(
                confirmBox.id
              );

            } else {

              await reject(
                confirmBox.id
              );
            }

            setConfirmBox({
              open: false,
              type: "",
              id: null
            });

          }}
          style={{
            flex: 1,
            height: 48,
            border: "none",
            borderRadius: 14,
            background:
              confirmBox.type === "approve"
                ? "linear-gradient(135deg,#16a34a,#22c55e)"
                : "linear-gradient(135deg,#dc2626,#ef4444)",
            color: "#fff",
            fontWeight: 700,
            cursor: "pointer",
            fontSize: 14,
            boxShadow:
              confirmBox.type === "approve"
                ? "0 8px 20px rgba(34,197,94,.25)"
                : "0 8px 20px rgba(239,68,68,.25)"
          }}
        >
          Yes
        </button>

      </div>

    </div>

  </div>

)}

        {/* TOAST */}

{toast && (

  <div
    style={{
      position: "fixed",
      top: 20,
      right: 20,
      zIndex: 9999,
      padding: "14px 18px",
      borderRadius: 14,
      color: "#fff",
      fontWeight: 600,
      fontSize: 14,
      background: toast.ok
        ? "linear-gradient(135deg,#16a34a,#22c55e)"
        : "linear-gradient(135deg,#dc2626,#ef4444)",
      boxShadow:
        "0 10px 25px rgba(0,0,0,.15)",
      display: "flex",
      alignItems: "center",
      gap: 10,
      animation: "toastIn .25s ease"
    }}
  >

    <div
      style={{
        width: 24,
        height: 24,
        borderRadius: 8,
        background: "rgba(255,255,255,.2)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 12,
        fontWeight: 700
      }}
    >
      {toast.ok ? "✓" : "✕"}
    </div>

    {toast.msg}

  </div>

)}

      {/* HEADER */}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 22
        }}
      >

        <div>

          <h2
            style={{
              margin: 0,
              color: "#0f172a",
              fontSize: 32,
              fontWeight: 700
            }}
          >
            Pending Cashier Requests
          </h2>

          <p
            style={{
              marginTop: 6,
              color: "#64748b",
              fontSize: 14
            }}
          >
            Manage cashier approval requests
          </p>

        </div>

        {/* TOTAL CARD */}

        <div
          style={{
            background: "#fff",
            padding: "14px 18px",
            borderRadius: 18,
            boxShadow:
              "0 4px 14px rgba(0,0,0,.05)",
            display: "flex",
            alignItems: "center",
            gap: 12
          }}
        >

          <div
            style={{
              width: 50,
              height: 50,
              borderRadius: 14,
              background: "#dbeafe",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <Users
              size={24}
              color="#2563eb"
            />
          </div>

          <div>

            <div
              style={{
                fontSize: 13,
                color: "#64748b"
              }}
            >
              Total Requests
            </div>

            <div
              style={{
                fontSize: 24,
                fontWeight: 700,
                color: "#1e3a8a"
              }}
            >
              {filtered.length}
            </div>

          </div>

        </div>

      </div>

      {/* SEARCH */}

      <div
        style={{
          position: "relative",
          marginBottom: 22
        }}
      >

        <Search
          size={18}
          style={{
            position: "absolute",
            left: 16,
            top: "50%",
            transform: "translateY(-50%)",
            color: "#94a3b8"
          }}
        />

        <input
          type="text"
          placeholder="Search company, cashier or email..."
          value={search}
          onChange={(e) => {
  setSearch(e.target.value);
  setCurrentPage(1);
}}
          style={{
            width: "100%",
            padding: "15px 18px 15px 48px",
            borderRadius: 16,
            border: "1px solid #dbe2ea",
            outline: "none",
            fontSize: 14,
            background: "#fff",
            boxSizing: "border-box"
          }}
        />

      </div>

      {/* TABLE CARD */}

      <div
        style={{
          background: "#fff",
          borderRadius: 24,
          overflow: "hidden",
          boxShadow:
            "0 10px 30px rgba(0,0,0,0.05)"
        }}
      >

        {/* HEADER */}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "2fr 1.5fr 1.5fr 2fr 1.3fr",
            padding: "18px 24px",
            background:
              "linear-gradient(135deg,#2563eb,#3b82f6)",
            color: "#fff",
            fontWeight: 600,
            fontSize: 13
          }}
        >

          <span>Company</span>

          <span>Requested By</span>

          <span>Cashier</span>

          <span>Email</span>

          <span
            style={{
              textAlign: "center"
            }}
          >
            Actions
          </span>

        </div>

        {/* BODY */}

        {filtered.length === 0 ? (

          <div
            style={{
              padding: 60,
              textAlign: "center"
            }}
          >

            <div
              style={{
                width: 80,
                height: 80,
                margin: "0 auto 18px",
                borderRadius: 24,
                background: "#dbeafe",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              <ShieldCheck
                size={36}
                color="#2563eb"
              />
            </div>

            <h3
              style={{
                margin: 0,
                color: "#334155"
              }}
            >
              No Pending Requests
            </h3>

            <p
              style={{
                marginTop: 8,
                color: "#94a3b8"
              }}
            >
              Everything looks good 🎉
            </p>

          </div>

        ) : (

          // filtered.map((item, index) => (
            paginated.map((item, index) => (

            <div
              key={item.id}
              style={{
                display: "grid",
                gridTemplateColumns:
                  "2fr 1.5fr 1.5fr 2fr 1.3fr",
                padding: "18px 24px",
                alignItems: "center",
               borderBottom:
  index !== paginated.length - 1
    ? "1px solid #f1f5f9"
    : "none"
              }}
            >

              {/* COMPANY */}

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12
                }}
              >

                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 14,
                    background: "#dbeafe",
                    color: "#2563eb",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 700
                  }}
                >
                  {getInitial(
                    item.company_name
                  )}
                </div>

                <div>

                  <div
                    style={{
                      fontWeight: 600,
                      color: "#0f172a"
                    }}
                  >
                    {item.company_name}
                  </div>

                  <div
                    style={{
                      fontSize: 12,
                      color: "#94a3b8"
                    }}
                  >
                    Request ID #{item.id}
                  </div>

                </div>

              </div>

              {/* REQUESTED BY */}

              <div
                style={{
                  color: "#334155",
                  fontWeight: 500
                }}
              >
                {item.requested_user}
              </div>

              {/* CASHIER */}

              <div
                style={{
                  color: "#0f172a",
                  fontWeight: 600
                }}
              >
                {item.name}
              </div>

              {/* EMAIL */}

              <div
                style={{
                  color: "#64748b",
                  fontSize: 14
                }}
              >
                {item.email}
              </div>

              {/* ACTIONS */}

              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: 10
                }}
              >

              <button
  onClick={() =>
    setConfirmBox({
      open: true,
      type: "approve",
      id: item.id
    })
  }
  style={{
    border: "none",
    background:
      "linear-gradient(135deg,#16a34a,#22c55e)",
    color: "#fff",
    padding: "10px 18px",
    borderRadius: 12,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: 13,
    boxShadow:
      "0 4px 12px rgba(34,197,94,.25)"
  }}
>
  Accept
</button>

<button
  onClick={() =>
    setConfirmBox({
      open: true,
      type: "reject",
      id: item.id
    })
  }
  style={{
    border: "none",
    background:
      "linear-gradient(135deg,#dc2626,#ef4444)",
    color: "#fff",
    padding: "10px 18px",
    borderRadius: 12,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: 13,
    boxShadow:
      "0 4px 12px rgba(239,68,68,.25)"
  }}
>
  Reject
</button>

              </div>

            </div>

          ))
        )}

      
      {filtered.length > ITEMS_PER_PAGE && (
  <div
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "16px 22px",
      borderTop: "1px solid #e2e8f0",
      background: "#fafbff",
      flexWrap: "wrap",
      gap: 10
    }}
  >
    <div
      style={{
        fontSize: 13,
        color: "#64748b"
      }}
    >
      Showing{" "}
      <strong>
        {(safePage - 1) * ITEMS_PER_PAGE + 1}-
        {Math.min(
          safePage * ITEMS_PER_PAGE,
          filtered.length
        )}
      </strong>{" "}
      of <strong>{filtered.length}</strong> requests
    </div>

    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6
      }}
    >
      <button
        disabled={safePage === 1}
        onClick={() =>
          setCurrentPage((p) => p - 1)
        }
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          border: "1px solid #dbe2ea",
          background: "#fff",
          cursor:
            safePage === 1
              ? "not-allowed"
              : "pointer",
          opacity: safePage === 1 ? .5 : 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        <ChevronLeft size={16} />
      </button>

      {Array.from(
        { length: totalPages },
        (_, i) => i + 1
      )
        .filter(
          (p) =>
            p === 1 ||
            p === totalPages ||
            Math.abs(p - safePage) <= 1
        )
        .reduce((acc, p, i, arr) => {
          if (i > 0 && arr[i - 1] !== p - 1)
            acc.push("...");
          acc.push(p);
          return acc;
        }, [])
        .map((item, i) =>
          item === "..." ? (
            <span
              key={i}
              style={{
                padding: "0 5px",
                color: "#94a3b8"
              }}
            >
              …
            </span>
          ) : (
            <button
              key={item}
              onClick={() =>
                setCurrentPage(item)
              }
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                border:
                  safePage === item
                    ? "none"
                    : "1px solid #dbe2ea",
                background:
                  safePage === item
                    ? "linear-gradient(135deg,#2563eb,#3b82f6)"
                    : "#fff",
                color:
                  safePage === item
                    ? "#fff"
                    : "#475569",
                fontWeight: 700,
                cursor: "pointer"
              }}
            >
              {item}
            </button>
          )
        )}

      <button
        disabled={safePage === totalPages}
        onClick={() =>
          setCurrentPage((p) => p + 1)
        }
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          border: "1px solid #dbe2ea",
          background: "#fff",
          cursor:
            safePage === totalPages
              ? "not-allowed"
              : "pointer",
          opacity:
            safePage === totalPages ? .5 : 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}
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