/**
 * Phone and Country Code Helpers
 * PaySplitX ERP - Smart Country Code Auto-Detection & Interactive Selector
 */

export const COUNTRY_LIST = [
  { code: "+91", name: "India", flag: "🇮🇳", length: 10, placeholder: "10-digit mobile number" },
  { code: "+971", name: "UAE (Dubai)", flag: "🇦🇪", length: 9, placeholder: "9-digit mobile (e.g. 501234567)" },
  { code: "+966", name: "Saudi Arabia", flag: "🇸🇦", length: 9, placeholder: "9-digit mobile (e.g. 501234567)" },
  { code: "+1", name: "USA / Canada", flag: "🇺🇸", length: 10, placeholder: "10-digit mobile number" },
  { code: "+65", name: "Singapore", flag: "🇸🇬", length: 8, placeholder: "8-digit mobile number" },
  { code: "+60", name: "Malaysia", flag: "🇲🇾", length: 10, placeholder: "9-10 digit mobile number" },
  { code: "+44", name: "United Kingdom", flag: "🇬🇧", length: 10, placeholder: "10-digit mobile number" },
  { code: "+94", name: "Sri Lanka", flag: "🇱🇰", length: 9, placeholder: "9-digit mobile number" },
  { code: "+968", name: "Oman", flag: "🇴🇲", length: 8, placeholder: "8-digit mobile number" },
  { code: "+974", name: "Qatar", flag: "🇶🇦", length: 8, placeholder: "8-digit mobile number" },
  { code: "+965", name: "Kuwait", flag: "🇰🇼", length: 8, placeholder: "8-digit mobile number" },
  { code: "+973", name: "Bahrain", flag: "🇧🇭", length: 8, placeholder: "8-digit mobile number" },
];

export function getCountryByCode(code = "+91") {
  const norm = code.startsWith("+") ? code : `+${code}`;
  return (
    COUNTRY_LIST.find((c) => c.code === norm) || {
      code: norm,
      name: "International",
      flag: "🌐",
      length: 10,
      placeholder: "Mobile number",
    }
  );
}

/**
 * Intelligent country detector from input string.
 * Detects:
 * 1. Explicit country codes: +971, 00971, 9715..., +966, 9665..., +65, +1, +91...
 * 2. Local mobile number prefixes:
 *    - UAE (50, 52, 54, 55, 56, 58) or 050, 052... -> +971
 *    - Saudi (51, 53, 57, 58, 59...) -> +966
 *    - India (6, 7, 8, 9 with 10 digits) -> +91
 *    - Singapore (8, 9 with 8 digits) -> +65
 *
 * @param {string} rawInput - what user typed or pasted
 * @param {string} fallbackCode - currently active country code (e.g. +91)
 * @returns {{ countryCode: string, cleanDigits: string, country: object, autoDetected: boolean }}
 */
export function detectCountryFromPhone(rawInput = "", fallbackCode = "+91") {
  const text = String(rawInput || "").trim();
  const digitsOnly = text.replace(/\D/g, "");

  if (!digitsOnly) {
    return {
      countryCode: fallbackCode,
      cleanDigits: "",
      country: getCountryByCode(fallbackCode),
      autoDetected: false,
    };
  }

  // 1. Direct '+' prefix (e.g. +971501234567, +966501234567, +14155552671)
  if (text.startsWith("+") || text.startsWith("00")) {
    const stripped = text.startsWith("+") ? text.slice(1).replace(/\D/g, "") : text.slice(2).replace(/\D/g, "");
    
    // Sort country codes by descending length so +971 is checked before +97, etc.
    const sorted = [...COUNTRY_LIST].sort((a, b) => b.code.length - a.code.length);
    for (const c of sorted) {
      const codeDigits = c.code.replace(/\D/g, "");
      if (stripped.startsWith(codeDigits)) {
        const local = stripped.slice(codeDigits.length).slice(0, c.length);
        return {
          countryCode: c.code,
          cleanDigits: local,
          country: c,
          autoDetected: true,
        };
      }
    }
  }

  // 2. Starts with international prefix without '+' (e.g. 971501234567, 966501234567, 919876543210)
  // Check if total length matches country code + local digits
  const candidateCountries = [...COUNTRY_LIST].sort((a, b) => b.code.length - a.code.length);
  for (const c of candidateCountries) {
    const codeDigits = c.code.replace(/\D/g, "");
    if (codeDigits !== "1" && digitsOnly.startsWith(codeDigits) && digitsOnly.length > codeDigits.length + 5) {
      const local = digitsOnly.slice(codeDigits.length).slice(0, c.length);
      return {
        countryCode: c.code,
        cleanDigits: local,
        country: c,
        autoDetected: true,
      };
    }
  }

  // 3. Local UAE mobile prefix: 50, 52, 54, 55, 56, 58 (e.g. 501234567 or 0501234567)
  // In India, mobile numbers NEVER start with 5! UAE mobile numbers ALWAYS start with 50/52/54/55/56/58.
  let localNum = digitsOnly;
  if (localNum.startsWith("0") && localNum.length > 8) {
    localNum = localNum.slice(1);
  }

  if (/^(50|52|54|55|56|58)/.test(localNum)) {
    const uae = getCountryByCode("+971");
    return {
      countryCode: "+971",
      cleanDigits: localNum.slice(0, uae.length),
      country: uae,
      autoDetected: true,
    };
  }

  // 4. Local Saudi Arabia mobile prefix: 51, 53, 57, 59
  if (/^(51|53|57|59)/.test(localNum)) {
    const ksa = getCountryByCode("+966");
    return {
      countryCode: "+966",
      cleanDigits: localNum.slice(0, ksa.length),
      country: ksa,
      autoDetected: true,
    };
  }

  // 5. Local India mobile prefix: starts with 6, 7, 8, 9 with up to 10 digits
  // If current code is already set to something else (e.g. user manually picked Singapore), respect that unless input is clearly Indian 10-digit
  if (fallbackCode === "+91" || (digitsOnly.length === 10 && /^[6-9]/.test(digitsOnly))) {
    const ind = getCountryByCode("+91");
    // Strip leading 0 or 91 if present
    let indDigits = digitsOnly;
    if (indDigits.length === 11 && indDigits.startsWith("0")) {
      indDigits = indDigits.slice(1);
    } else if (indDigits.length === 12 && indDigits.startsWith("91")) {
      indDigits = indDigits.slice(2);
    }
    return {
      countryCode: "+91",
      cleanDigits: indDigits.slice(0, ind.length),
      country: ind,
      autoDetected: fallbackCode !== "+91",
    };
  }

  // Fallback to currently selected country code
  const current = getCountryByCode(fallbackCode);
  return {
    countryCode: fallbackCode,
    cleanDigits: digitsOnly.slice(0, current.length || 15),
    country: current,
    autoDetected: false,
  };
}
