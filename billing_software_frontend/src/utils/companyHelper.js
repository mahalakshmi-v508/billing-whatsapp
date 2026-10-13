/**
 * Shared helper for resolving and persisting the active/default company
 * across the entire billing software (Settings, Sales, Purchases, Reports, POS).
 */

export const getStoredCompanyId = () => {
  try {
    const saved = localStorage.getItem("selected_company_id");
    if (saved && saved !== "all") return String(saved);
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (user?.company_id) return String(user.company_id);
  } catch (e) {
    // ignore
  }
  return "";
};

export const setStoredCompany = (companyOrId, companyName = "") => {
  try {
    const id =
      typeof companyOrId === "object" && companyOrId !== null
        ? String(companyOrId.id)
        : String(companyOrId || "");
    const name =
      typeof companyOrId === "object" && companyOrId !== null
        ? companyOrId.company_name || ""
        : companyName;

    if (id) {
      localStorage.setItem("selected_company_id", id);
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      if (user && typeof user === "object") {
        user.company_id = Number(id) || id;
        if (name) user.company_name = name;
        localStorage.setItem("user", JSON.stringify(user));
      }
    }
    window.dispatchEvent(new Event("storage"));
    window.dispatchEvent(new CustomEvent("company_changed", { detail: id }));
  } catch (e) {
    console.error("Failed to set stored company", e);
  }
};

export const resolveDefaultFirm = (companies = [], currentSelected = "all") => {
  const savedId = getStoredCompanyId();
  if (savedId && Array.isArray(companies) && companies.length > 0) {
    if (companies.some((c) => String(c.id) === String(savedId))) {
      return String(savedId);
    }
  }
  if (currentSelected && currentSelected !== "all") {
    return String(currentSelected);
  }
  if (savedId) return String(savedId);
  return "all";
};
