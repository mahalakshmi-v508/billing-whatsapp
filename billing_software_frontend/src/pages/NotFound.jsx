import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { AlertCircle, ArrowLeft } from "lucide-react";

export default function NotFound() {
  const navigate = useNavigate();

  const handleGoHome = () => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      const user = JSON.parse(userStr);
      if (user.role === "superadmin") {
        navigate("/admin");
      } else {
        navigate("/dashboard");
      }
    } else {
      navigate("/");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-md bg-white p-8 rounded-3xl shadow-xl flex flex-col items-center gap-6"
      >
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center shadow-lg">
          <AlertCircle size={36} />
        </div>

        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight mb-2">
            Page Not Found
          </h1>
          <p className="text-sm text-slate-500 leading-relaxed">
            The page you are looking for might have been removed, had its name changed, or is temporarily unavailable or restricted for your user role.
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleGoHome}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all"
        >
          <ArrowLeft size={18} />
          Go to Home
        </motion.button>
      </motion.div>
    </div>
  );
}
