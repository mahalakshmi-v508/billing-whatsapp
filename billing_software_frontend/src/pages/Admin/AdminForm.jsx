import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api";
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Shield,
  CheckCircle2
} from "lucide-react";

const STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&display=swap');

  .af-input{
    width:100%;
    background:#f1f5fb;
    border:1.5px solid transparent;
    border-radius:14px;
    padding:13px 14px 13px 46px;
    font-size:14px;
    color:#1e3a8a;
    outline:none;
    box-sizing:border-box;
  }

  
  .af-input:focus{
    background:#fff;
    border-color:#3b82f6;
    box-shadow:0 0 0 3px rgba(59,130,246,.15);
  }

  .af-btn{
    width:100%;
    border:none;
    cursor:pointer;
    padding:14px;
    border-radius:14px;
    color:#fff;
    font-weight:700;
    background:linear-gradient(135deg,#1d4ed8,#3b82f6);
  }
`;

export default function AdminForm() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: ""
  });

  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = STYLE;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  const showToast = (msg, ok = true) => {
    setToast({ msg, ok });

    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  const setValue = (key, value) => {
    setForm((prev) => ({
      ...prev,
      [key]: value
    }));
  };


  const user = JSON.parse(localStorage.getItem("user"));

console.log("USER =>", user);
console.log("COMPANY ID =>", user?.company_id);
  const handleSubmit = async () => {

    if (!form.name.trim()) {
      return showToast("Name is required", false);
    }

    if (!form.email.trim()) {
      return showToast("Email is required", false);
    }

    if (!/\S+@\S+\.\S+/.test(form.email)) {
      return showToast("Enter valid email", false);
    }

    if (!form.password.trim()) {
      return showToast("Password is required", false);
    }

    if (form.password.length < 6) {
      return showToast("Minimum 6 characters required", false);
    }

    try {

      setLoading(true);

      const user = JSON.parse(
        localStorage.getItem("user")
      );

      const res = await api.post(
        "/admin/create_admin",
        {
          name: form.name,
          email: form.email,
          password: form.password,
          role: "admin",
          company_id: user.company_id,
          requested_by: user.id
        }
      );

      if (res.data.status) {

        showToast(
          "Admin created successfully"
        );

        setSuccess(true);

        setForm({
          name: "",
          email: "",
          password: ""
        });

        setTimeout(() => {
          navigate("/admin");
        }, 1500);

      } else {

        showToast(
          res.data.message ||
          "Something went wrong",
          false
        );
      }

    } catch (err) {

      showToast(
        "Server error. Try again.",
        false
      );

    } finally {

      setLoading(false);

    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#eef3fb",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: 20
      }}
    >
      {toast && (
        <div
          style={{
            position: "fixed",
            top: 20,
            right: 20,
            background: toast.ok
              ? "#16a34a"
              : "#dc2626",
            color: "#fff",
            padding: "12px 18px",
            borderRadius: 10
          }}
        >
          {toast.msg}
        </div>
      )}

      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "#fff",
          borderRadius: 24,
          overflow: "hidden",
          boxShadow:
            "0 8px 30px rgba(0,0,0,.08)"
        }}
      >
        <div
          style={{
            padding: 30,
            background:
              "linear-gradient(135deg,#1e3a8a,#2563eb)"
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 12,
              alignItems: "center"
            }}
          >
            <Shield
              size={30}
              color="#fff"
            />

            <div>
              <h2
                style={{
                  color: "#fff",
                  margin: 0
                }}
              >
                Add Admin
              </h2>

              <p
                style={{
                  color: "#dbeafe",
                  margin: 0
                }}
              >
                Create new admin account
              </p>
            </div>
          </div>
        </div>

        {!success ? (
          <div style={{ padding: 25 }}>

            <input
              className="af-input"
              placeholder="Full Name"
              value={form.name}
              onChange={(e) =>
                setValue(
                  "name",
                  e.target.value
                )
              }
            />

            <br />
            <br />

            <input
              className="af-input"
              placeholder="Email"
              type="email"
              value={form.email}
              onChange={(e) =>
                setValue(
                  "email",
                  e.target.value
                )
              }
            />

            <br />
            <br />

            <div
              style={{
                position: "relative"
              }}
            >
              <input
                className="af-input"
                placeholder="Password"
                type={
                  showPass
                    ? "text"
                    : "password"
                }
                value={form.password}
                onChange={(e) =>
                  setValue(
                    "password",
                    e.target.value
                  )
                }
              />

              <button
                type="button"
                onClick={() =>
                  setShowPass(
                    !showPass
                  )
                }
                style={{
                  position: "absolute",
                  right: 15,
                  top: 13,
                  border: "none",
                  background: "none",
                  cursor: "pointer"
                }}
              >
                {showPass
                  ? <EyeOff size={18}/>
                  : <Eye size={18}/>
                }
              </button>
            </div>

            <br />

            <button
              className="af-btn"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading
                ? "Creating..."
                : "Create Admin"}
            </button>

          </div>
        ) : (
          <div
            style={{
              padding: 30,
              textAlign: "center"
            }}
          >
            <CheckCircle2
              size={50}
              color="#16a34a"
            />

            <h3>
              Admin Created Successfully
            </h3>

            <p>
              Redirecting...
            </p>
          </div>
        )}
      </div>
    </div>
  );
}