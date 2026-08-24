import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { User, Mail, Lock, UserPlus, ArrowLeft } from "lucide-react";
import api from "../../services/api";

export default function Register() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ username: "", email: "", password: "" });
  const [isLoading, setIsLoading] = useState(false);

  // const handleRegister = async () => {
  //   setIsLoading(true);
  //   try {
  //     const res = await api.post("/auth/register", formData);
  //     if (res.data.status === "success") navigate("/");
  //     else alert(res.data.message);
  //   } catch (err) { alert("Server error"); } finally { setIsLoading(false); }
  // };


  const handleRegister = async () => {
  setIsLoading(true);
  try {
    const payload = {
      name: formData.username, // 🔥 map correct field
      email: formData.email,
      password: formData.password,
      role: "cashier", // 🔥 default role (you can change)
      company_id: 1    // 🔥 required for cashier/admin
    };

    const res = await api.post("/auth/register", payload);

    if (res.data.status === true) {
      alert("Registered Successfully ✅");
      navigate("/");
    } else {
      alert(res.data.message);
    }

  } catch (err) {
    console.error(err);
    alert("Server error");
  } finally {
    setIsLoading(false);
  }
};
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#f0f4f9] p-4 overflow-y-auto font-sans">
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm bg-white/90 backdrop-blur-md p-6 rounded-[2rem] shadow-xl border border-white my-auto"
      >
        <div className="flex flex-col items-center mb-5">
          <div className="w-12 h-12 bg-gradient-to-tr from-[#1f8cff] to-[#4338ca] rounded-xl flex items-center justify-center shadow-md mb-2">
            <UserPlus size={24} color="white" />
          </div>
          <h2 className="text-2xl font-black text-gray-800">Register</h2>
          <p className="text-[11px] text-gray-400 font-medium">Create your account</p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase ml-2 mb-1 block">Name</label>
            <div className="relative group">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500" size={18} />
              <input
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-transparent focus:border-blue-500 rounded-xl outline-none text-sm transition-all"
                placeholder="Full Name"
                onChange={(e) => setFormData({...formData, username: e.target.value})}
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase ml-2 mb-1 block">Email</label>
            <div className="relative group">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500" size={18} />
              <input
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-transparent focus:border-blue-500 rounded-xl outline-none text-sm transition-all"
                placeholder="Email Address"
                onChange={(e) => setFormData({...formData, email: e.target.value})}
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-gray-400 uppercase ml-2 mb-1 block">Password</label>
            <div className="relative group">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500" size={18} />
              <input
                type="password"
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-transparent focus:border-blue-500 rounded-xl outline-none text-sm transition-all"
                placeholder="Password"
                onChange={(e) => setFormData({...formData, password: e.target.value})}
              />
            </div>
          </div>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleRegister}
            className="w-full bg-gradient-to-r from-[#1f8cff] to-[#4338ca] text-white font-bold py-3 rounded-xl shadow-lg mt-2 transition-all"
          >
            {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "Create Account"}
          </motion.button>

          <button onClick={() => navigate("/")} className="w-full flex items-center justify-center gap-2 text-xs font-bold text-gray-400 hover:text-blue-600 transition-colors pt-2">
            <ArrowLeft size={14} /> Back to Login
          </button>

          
          
        </div>
      </motion.div>
    </div>
  );
}