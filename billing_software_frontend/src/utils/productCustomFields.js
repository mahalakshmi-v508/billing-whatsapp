import { fetchSettings } from "../pages/settings/settingsApi";

/**
 * Returns the list of defined custom fields for products from settings.
 * Checks localStorage cached settings first, then queries backend if needed.
 */
export function normalizeFields(fields) {
  if (!Array.isArray(fields)) return [];
  return fields.map((f) => ({
    id: f.id || f.name,
    name: f.name || f.key || "",
    key: f.key || f.name || "",
    label: f.label || f.name || "Field",
    type: f.type || "text",
    options: Array.isArray(f.options)
      ? f.options
      : typeof f.options === "string"
      ? f.options.split(",").map((o) => o.trim()).filter(Boolean)
      : [],
    required: Boolean(f.required),
    show_in_table: f.show_in_table !== undefined ? Boolean(f.show_in_table) : true,
  }));
}

/**
 * Returns the list of defined custom fields for products from settings.
 * Checks localStorage cached settings first, then queries backend if needed.
 */
export async function getProductCustomFields() {
  try {
    // 1. Try local item_settings
    const localItem = localStorage.getItem("item_settings");
    if (localItem) {
      try {
        const parsed = JSON.parse(localItem);
        const fields = parsed?.customFields || parsed?.custom_fields;
        if (Array.isArray(fields)) {
          return normalizeFields(fields);
        }
      } catch {}
    }

    // 2. Try company_settings_cache
    const cache = localStorage.getItem("company_settings_cache");
    if (cache) {
      try {
        const parsed = JSON.parse(cache);
        if (parsed && typeof parsed === "object") {
          const fields = parsed?.item?.customFields || parsed?.item?.custom_fields;
          if (Array.isArray(fields)) {
            return normalizeFields(fields);
          }
          // If the cached settings object exists and has keys, then item custom fields are empty
          if (Object.keys(parsed).length > 0) {
            return [];
          }
        }
      } catch {}
    }

    // 3. Fetch from server
    const serverSettings = await fetchSettings();
    const fields =
      serverSettings?.item?.customFields || serverSettings?.item?.custom_fields;
    if (Array.isArray(fields)) {
      return normalizeFields(fields);
    }
  } catch (err) {
    console.error("Failed to load product custom fields:", err);
  }
  return [];
}

/**
 * Synchronous read from local storage / cache for immediate rendering.
 */
export function getProductCustomFieldsSync() {
  try {
    const localItem = localStorage.getItem("item_settings");
    if (localItem) {
      const parsed = JSON.parse(localItem);
      const fields = parsed?.customFields || parsed?.custom_fields;
      if (Array.isArray(fields)) {
        return normalizeFields(fields);
      }
    }

    const cache = localStorage.getItem("company_settings_cache");
    if (cache) {
      const parsed = JSON.parse(cache);
      const fields = parsed?.item?.customFields || parsed?.item?.custom_fields;
      if (Array.isArray(fields)) {
        return normalizeFields(fields);
      }
    }
  } catch {
    /* fallback to empty */
  }
  return [];
}
