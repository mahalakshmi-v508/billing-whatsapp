import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../services/api";
import {
  Shield,
  Eye,
  EyeOff,
  CheckCircle2
} from "lucide-react";

export default function EditAdmin() {

  const navigate = useNavigate();
  const { id } = useParams();

  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [showPass, setShowPass] = useState(false);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: ""
  });

  const [toast, setToast] = useState(null);

  const showToast = (msg, ok = true) => {

    setToast({ msg, ok });

    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  const setValue = (key, value) => {

    setForm(prev => ({
      ...prev,
      [key]: value
    }));
  };

  /* ==========================
     GET ADMIN
  ========================== */

  const loadAdmin = async () => {

    try {

      const res = await api.get(
        `/admin/get_admin_by_id?id=${id}`
      );

      if (res.data.status) {

        setForm({
          name: res.data.data.name || "",
          email: res.data.data.email || "",
          password: ""
        });
      }

    } catch (err) {

      showToast(
        "Failed to load admin",
        false
      );

    } finally {

      setPageLoading(false);

    }
  };

  useEffect(() => {
    loadAdmin();
  }, [id]);

  /* ==========================
     UPDATE ADMIN
  ========================== */

  const handleSubmit = async () => {

    if (!form.name.trim()) {
      return showToast(
        "Name is required",
        false
      );
    }

    if (!form.email.trim()) {
      return showToast(
        "Email is required",
        false
      );
    }

    try {

      setLoading(true);

      const res = await api.post(
        "/admin/update_admin",
        {
          id,
          name: form.name,
          email: form.email,
          password: form.password
        }
      );

      if (res.data.status) {

        showToast(
          "Admin updated successfully"
        );

        setSuccess(true);

        setTimeout(() => {
          navigate("/admin");
        }, 1500);

      } else {

        showToast(
          res.data.message,
          false
        );
      }

    } catch (err) {

      showToast(
        "Server error",
        false
      );

    } finally {

      setLoading(false);

    }
  };

  if (pageLoading) {

    return (
      <div
        style={{
          padding: 40,
          textAlign: "center"
        }}
      >
        Loading...
      </div>
    );
  }

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
            borderRadius: 10,
            zIndex: 999
          }}
        >
          {toast.msg}
        </div>
      )}

      <div
        style={{
          width: "100%",
          maxWidth: 450,
          background: "#fff",
          borderRadius: 20,
          overflow: "hidden",
          boxShadow:
            "0 10px 30px rgba(0,0,0,.08)"
        }}
      >

        <div
          style={{
            padding: 25,
            background:
              "linear-gradient(135deg,#1d4ed8,#3b82f6)",
            color: "#fff"
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10
            }}
          >
            <Shield size={28} />
            <div>
              <h2
                style={{
                  margin: 0
                }}
              >
                Edit Admin
              </h2>

              <p
                style={{
                  margin: 0,
                  opacity: .8
                }}
              >
                Update administrator details
              </p>
            </div>
          </div>
        </div>

        {!success ? (

          <div
            style={{
              padding: 25
            }}
          >

            <input
              type="text"
              placeholder="Name"
              value={form.name}
              onChange={(e) =>
                setValue(
                  "name",
                  e.target.value
                )
              }
              style={{
                width: "100%",
                padding: 14,
                borderRadius: 12,
                border: "1px solid #ddd",
                marginBottom: 15
              }}
            />

            <input
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(e) =>
                setValue(
                  "email",
                  e.target.value
                )
              }
              style={{
                width: "100%",
                padding: 14,
                borderRadius: 12,
                border: "1px solid #ddd",
                marginBottom: 15
              }}
            />

            <div
              style={{
                position: "relative"
              }}
            >
              <input
                type={
                  showPass
                    ? "text"
                    : "password"
                }
                placeholder="New Password (optional)"
                value={form.password}
                onChange={(e) =>
                  setValue(
                    "password",
                    e.target.value
                  )
                }
                style={{
                  width: "100%",
                  padding: 14,
                  borderRadius: 12,
                  border: "1px solid #ddd"
                }}
              />

              <button
                type="button"
                onClick={() =>
                  setShowPass(!showPass)
                }
                style={{
                  position: "absolute",
                  right: 15,
                  top: 12,
                  border: "none",
                  background: "none",
                  cursor: "pointer"
                }}
              >
                {
                  showPass
                    ? <EyeOff size={18}/>
                    : <Eye size={18}/>
                }
              </button>
            </div>

            <br />

            <button
              onClick={handleSubmit}
              disabled={loading}
              style={{
                width: "100%",
                padding: 14,
                border: "none",
                borderRadius: 12,
                background:
                  "linear-gradient(135deg,#1d4ed8,#3b82f6)",
                color: "#fff",
                fontWeight: 700,
                cursor: "pointer"
              }}
            >
              {
                loading
                  ? "Updating..."
                  : "Update Admin"
              }
            </button>

          </div>

        ) : (

          <div
            style={{
              padding: 40,
              textAlign: "center"
            }}
          >
            <CheckCircle2
              size={50}
              color="#16a34a"
            />

            <h3>
              Admin Updated Successfully
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