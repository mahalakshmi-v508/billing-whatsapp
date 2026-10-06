import React, { useState, useEffect } from "react";
import { ChevronDown, X } from "lucide-react";
import api from "../../services/api";

/**
 * Reusable page-wise Terms & Conditions select dropdown.
 *
 * @param {number|string} companyId - Active company ID
 * @param {"sale"|"estimate"|"credit_note"} page - The current page type
 * @param {string} value - Current terms & conditions text
 * @param {function} onChange - Callback (newTermsText) => void
 * @param {string} placeholder - Placeholder text
 * @param {string} className - Optional container styling
 */
export default function TermsDropdown({
  companyId,
  page = "sale",
  value = "",
  onChange,
  placeholder = "Select Terms & Conditions...",
  className = "",
}) {
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const cid = Number(companyId) || 1;

    setLoading(true);
    api
      .get(`/settings/terms?company_id=${cid}&page=${page}`)
      .then((res) => {
        if (!isMounted) return;
        if (res.data?.status && Array.isArray(res.data.data)) {
          // Double filter on client side as well to guarantee page-wise scoping and is_enabled check
          const filtered = res.data.data.filter((item) => {
            if (item.is_enabled === false) return false;
            if (page === "sale") return item.applies_to_sale !== false;
            if (page === "estimate") return item.applies_to_estimate !== false;
            if (page === "credit_note") return item.applies_to_credit_note !== false;
            return true;
          });
          setOptions(filtered);
        } else {
          setOptions([]);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch page terms:", err);
        if (isMounted) setOptions([]);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [companyId, page]);

  const handleChange = (e) => {
    if (onChange) {
      onChange(e.target.value);
    }
  };

  const handleClear = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onChange) {
      onChange("");
    }
  };

  const hasValue = Boolean(value && String(value).trim());
  const isCustomOrExisting =
    hasValue && !options.some((o) => o.text === value);

  return (
    <div className={`relative w-full ${className}`}>
      <select
        value={value || ""}
        onChange={handleChange}
        disabled={loading}
        className={`w-full px-3 py-2.5 bg-slate-50/50 focus:bg-white border border-slate-200 focus:border-blue-500 rounded-xl text-xs font-medium text-slate-800 outline-none transition cursor-pointer appearance-none ${
          hasValue ? "pr-14" : "pr-9"
        }`}
      >
        <option value="">
          {loading
            ? "Loading terms & conditions..."
            : options.length === 0
            ? "No terms configured (Manage in Settings)"
            : placeholder}
        </option>

        {options.map((item) => (
          <option key={item.id || item.text} value={item.text}>
            {item.text}
          </option>
        ))}

        {isCustomOrExisting && (
          <option value={value}>{value}</option>
        )}
      </select>

      {/* Clear Button */}
      {hasValue && (
        <button
          type="button"
          onClick={handleClear}
          title="Clear selected terms"
          className="absolute right-7 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500 p-1 rounded-md transition cursor-pointer"
        >
          <X size={13} strokeWidth={2.5} />
        </button>
      )}

      {/* Chevron Icon */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
        <ChevronDown size={15} />
      </div>
    </div>
  );
}
