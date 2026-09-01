import { useNavigate } from "react-router-dom";
import { X, Play, Bell, BellRing, Clock, Users, TrendingUp } from "lucide-react";
import { useSettings } from "./SettingsContext";

export default function ServiceReminders() {
  const { setSettingsTab } = useSettings();
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden min-h-full flex flex-col">
      {/* Header */}
      <div className="relative px-8 pt-8">
        <button
          type="button"
          onClick={() => setSettingsTab && setSettingsTab("general")}
          title="Close"
          className="absolute top-5 right-5 w-9 h-9 rounded-full bg-gray-300 hover:bg-gray-400 text-white flex items-center justify-center transition-colors z-10"
        >
          <X size={18} strokeWidth={2.5} />
        </button>
        <h2 className="text-[25px] font-bold text-gray-900">Service Reminders</h2>
      </div>
      <div className="h-px bg-gray-200 my-4" />

      <div className="px-8 pb-8 flex-1 flex flex-col">
        {/* Blue video banner */}
        <div className="w-full bg-gradient-to-br from-[#1f8cff] to-[#4338ca] rounded-2xl px-7 py-6 flex items-center gap-6 text-white">
          <div className="flex-1 min-w-0">
            <p className="text-[21px] font-bold leading-snug">
              How does Service Reminders feature work in Vyapar?
            </p>
            <p className="mt-2 text-[16px] text-blue-100 leading-relaxed">
              Watch the video and see how you can grow your business using Service Reminders.
            </p>
          </div>

          <div className="flex items-center gap-4 flex-shrink-0">
            {/* Video thumbnail */}
            <div className="w-44 h-[88px] rounded-xl bg-white/20 relative flex-shrink-0 overflow-hidden flex items-center justify-center">
              <div className="absolute right-3 bottom-2 px-1.5 py-0.5 bg-black/40 text-white text-[12px] font-semibold rounded">
                2:24
              </div>
              <div className="w-12 h-12 rounded-full bg-white shadow-lg flex items-center justify-center text-blue-600">
                <Play size={22} fill="currentColor" strokeWidth={0} className="ml-0.5" />
              </div>
            </div>

            {/* Play video button */}
            <button
              type="button"
              className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white font-semibold text-[16px] rounded-full px-5 h-[42px] transition-colors flex-shrink-0 shadow-md"
            >
              <Play size={18} fill="currentColor" strokeWidth={0} />
              Play Video
            </button>
          </div>
        </div>

        {/* Main empty/intro content */}
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          {/* Illustration */}
          <div className="w-36 h-36 rounded-full bg-blue-50 flex items-center justify-center">
            <BellRing size={88} strokeWidth={1.6} className="text-blue-500" />
          </div>

          {/* Title + New badge */}
          <div className="flex items-center gap-3 mt-7">
            <h3 className="text-[23px] font-bold text-gray-900">Service Reminders</h3>
            <span className="px-2.5 py-0.5 bg-red-500 text-white text-[12px] font-bold rounded-full">
              New
            </span>
          </div>

          {/* Feature descriptions */}
          <div className="flex items-center mt-6">
            <div className="flex items-center gap-2.5 text-gray-500 text-[15px]">
              <Clock size={18} strokeWidth={2} />
              <span>Remind your parties</span>
            </div>
            <div className="w-px h-5 bg-gray-300 mx-6" />
            <div className="flex items-center gap-2.5 text-gray-500 text-[15px]">
              <Users size={18} strokeWidth={2} />
              <span>Don&apos;t lose customers</span>
            </div>
            <div className="w-px h-5 bg-gray-300 mx-6" />
            <div className="flex items-center gap-2.5 text-gray-500 text-[15px]">
              <TrendingUp size={18} strokeWidth={2} />
              <span>Grow your Business</span>
            </div>
          </div>

          {/* Enable button */}
          <button
            type="button"
            onClick={() => navigate("/settings/service-reminders/select-items")}
            className="mt-9 flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white font-bold text-[16px] rounded-full px-8 h-[48px] transition-colors shadow-md"
          >
            <Bell size={20} />
            Enable Service Reminders
          </button>
        </div>
      </div>
    </div>
  );
}