import { useEffect, useState } from "react";
import api from "../../services/api";

export default function CreditSettings() {

  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(false);

  const user = JSON.parse(localStorage.getItem("user"));

  /* ── Fetch settings ── */
  useEffect(() => {
    if (!user?.company_id) return;

    api.get("/credit/get", {
      params: { company_id: user.company_id }
    }).then(res => {
      if (res.data.status) {
        setDays(res.data.data.default_credit_days);
      }
    });
  }, []);

  /* ── Save ── */
  const handleSave = async () => {

    if (days <= 0) {
      alert("Enter valid days");
      return;
    }

    setLoading(true);

    const res = await api.post("/credit/save", {
      company_id: user.company_id,
      default_credit_days: days
    });

    if (res.data.status) {
      alert("Saved successfully!");
    } else {
      alert("Error saving");
    }

    setLoading(false);
  };

  return (
    <div style={{
      padding: 30,
      maxWidth: 500,
      margin: "auto",
      background: "#fff",
      borderRadius: 16,
      boxShadow: "0 10px 30px rgba(0,0,0,0.08)"
    }}>

      <h2 style={{ marginBottom: 20 }}>
        Credit Settings
      </h2>

      <label style={{ fontWeight: 600 }}>
        Default Credit Days
      </label>

    <input
  type="number"
  className="bill-input"
  value={days}
  onChange={(e) => setDays(e.target.value)}

  onWheel={(e) => e.target.blur()}   // ✅ stop scroll change

  onKeyDown={(e) => {
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();           // ✅ stop arrow change
    }
  }}

  style={{
    width: "100%",
    padding: 10,
    marginTop: 8,
    marginBottom: 20,
    borderRadius: 10,
    border: "1px solid #ddd"
  }}
/>

      <button
        onClick={handleSave}
        disabled={loading}
        style={{
          width: "100%",
          padding: 12,
          border: "none",
          borderRadius: 10,
          background: "#4f46e5",
          color: "#fff",
          fontWeight: 700,
          cursor: "pointer"
        }}
      >
        {loading ? "Saving..." : "Save Settings"}
      </button>

    </div>
  );
}