import { useState } from "react";
import { Lock, Eye, EyeOff } from "lucide-react";
import api from "../../services/api";
import { useNavigate } from "react-router-dom";

export default function ChangePassword() {

  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("user"));

  const [form,setForm] = useState({
    old_password:"",
    new_password:"",
    confirm_password:""
  });

  const [showOld,setShowOld] = useState(false);
  const [showNew,setShowNew] = useState(false);
  const [showConfirm,setShowConfirm] = useState(false);

  const [loading,setLoading] = useState(false);

  const handleChange=(e)=>{

    setForm({
      ...form,
      [e.target.name]:e.target.value
    });

  };

  const handleSubmit=async()=>{

    if(!form.old_password){
      return alert("Enter old password");
    }

    if(!form.new_password){
      return alert("Enter new password");
    }

    if(form.new_password.length<6){
      return alert("Password minimum 6 characters");
    }

    if(form.new_password!==form.confirm_password){
      return alert("Passwords do not match");
    }

    try{

      setLoading(true);

      const res=await api.post(
        "/admin/change_password",
        {
          admin_id:user.id,
          old_password:form.old_password,
          new_password:form.new_password
        }
      );

      if(res.data.status){

        alert("Password Updated");

        navigate("/dashboard");

      }else{

        alert(res.data.message);

      }

    }catch{

      alert("Server Error");

    }finally{

      setLoading(false);

    }

  };

  const inputStyle={
    width:"100%",
    padding:"14px",
    marginBottom:15,
    borderRadius:10,
    border:"1px solid #ddd"
  };

  return(

    <div
    style={{
      minHeight:"100vh",
      display:"flex",
      justifyContent:"center",
      alignItems:"center",
      background:"#eef3fb"
    }}
    >

      <div
      style={{
        width:420,
        background:"#fff",
        borderRadius:20,
        padding:30,
        boxShadow:"0 8px 30px rgba(0,0,0,.1)"
      }}
      >

        <h2>Change Password</h2>

       <div style={{ position: "relative", marginBottom: 15 }}>

  <input
    type={showOld ? "text" : "password"}
    placeholder="Old Password"
    name="old_password"
    value={form.old_password}
    onChange={handleChange}
    style={{
      ...inputStyle,
      marginBottom: 0,
      paddingRight: 45
    }}
  />

  <button
    type="button"
    onClick={() => setShowOld(!showOld)}
    style={{
      position: "absolute",
      top: "50%",
      right: 12,
      transform: "translateY(-50%)",
      border: "none",
      background: "transparent",
      cursor: "pointer",
      color: "#6b7280"
    }}
  >
    {showOld ? <EyeOff size={18} /> : <Eye size={18} />}
  </button>

</div>

        <div style={{ position: "relative", marginBottom: 15 }}>

  <input
    type={showNew ? "text" : "password"}
    placeholder="New Password"
    name="new_password"
    value={form.new_password}
    onChange={handleChange}
    style={{
      ...inputStyle,
      marginBottom: 0,
      paddingRight: 45
    }}
  />

  <button
    type="button"
    onClick={() => setShowNew(!showNew)}
    style={{
      position: "absolute",
      top: "50%",
      right: 12,
      transform: "translateY(-50%)",
      border: "none",
      background: "transparent",
      cursor: "pointer",
      color: "#6b7280"
    }}
  >
    {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
  </button>

</div>

        <div style={{ position: "relative", marginBottom: 20 }}>

  <input
    type={showConfirm ? "text" : "password"}
    placeholder="Confirm Password"
    name="confirm_password"
    value={form.confirm_password}
    onChange={handleChange}
    style={{
      ...inputStyle,
      marginBottom: 0,
      paddingRight: 45
    }}
  />

  <button
    type="button"
    onClick={() => setShowConfirm(!showConfirm)}
    style={{
      position: "absolute",
      top: "50%",
      right: 12,
      transform: "translateY(-50%)",
      border: "none",
      background: "transparent",
      cursor: "pointer",
      color: "#6b7280"
    }}
  >
    {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
  </button>

</div>

        <button
        onClick={handleSubmit}
        style={{
          width:"100%",
          padding:14,
          border:"none",
          borderRadius:10,
          background:"#2563eb",
          color:"#fff",
          fontWeight:700,
          cursor:"pointer"
        }}
        >

          {loading?"Updating...":"Update Password"}

        </button>

      </div>

    </div>

  );

}