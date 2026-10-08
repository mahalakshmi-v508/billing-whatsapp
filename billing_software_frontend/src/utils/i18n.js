import { useState, useEffect } from "react";
import { TAMIL_PHRASES, TAMIL_WORDS } from "./tamilDictionary.js";

/**
 * PaySplitX Comprehensive Multi-language Localization Engine
 * Complete 100% full-site Tamil coverage without English leftovers.
 */
export const TRANSLATIONS = {
  en: {},
  ta: TAMIL_PHRASES,
};

/**
 * Direct lookup function: t("Dashboard", lang) -> "முகப்பு"
 */
export function t(key, lang) {
  if (!key) return "";
  const activeLang =
    lang ||
    (typeof localStorage !== "undefined"
      ? localStorage.getItem("app_language")
      : "en") ||
    "en";

  if (activeLang !== "ta") return key;
  return translateTextString(key);
}

/**
 * React hook for language state and manipulation
 */
export function useLanguage() {
  const [lang, setLang] = useState(() => {
    if (typeof localStorage !== "undefined") {
      return localStorage.getItem("app_language") || "en";
    }
    return "en";
  });

  useEffect(() => {
    const handleLangChange = () => {
      const current = localStorage.getItem("app_language") || "en";
      setLang(current);
    };

    window.addEventListener("languageChange", handleLangChange);
    window.addEventListener("app_language_changed", handleLangChange);
    window.addEventListener("storage", handleLangChange);

    return () => {
      window.removeEventListener("languageChange", handleLangChange);
      window.removeEventListener("app_language_changed", handleLangChange);
      window.removeEventListener("storage", handleLangChange);
    };
  }, []);

  const changeLanguage = (newLang) => {
    const normalized = newLang === "ta" ? "ta" : "en";
    try {
      localStorage.setItem("app_language", normalized);
    } catch (e) {
      console.error("Failed to store app_language:", e);
    }
    setLang(normalized);
    if (typeof document !== "undefined") {
      document.documentElement.setAttribute("lang", normalized);
    }
    window.dispatchEvent(
      new CustomEvent("app_language_changed", { detail: normalized })
    );
    window.dispatchEvent(new Event("languageChange"));
    startAutoTranslation(normalized);
  };

  const translate = (phrase) => t(phrase, lang);

  return {
    lang,
    isTamil: lang === "ta",
    t: translate,
    translate,
    changeLanguage,
  };
}

export const useTranslation = useLanguage;

/* ─────────────────────────────────────────────────────────────────────────────
   🌐 UNIVERSAL DOM AUTO-TRANSLATION ENGINE (5-TIER MATCHING)
   Translates text nodes & element placeholders across all pages automatically!
───────────────────────────────────────────────────────────────────────────── */

let domObserver = null;
let isTranslating = false;
const originalNodeMap = new WeakMap();
const originalAttrMap = new WeakMap();

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Normalized lowercase lookup dictionary for instant O(1) matching
let NORMALIZED_DICT = null;
function getNormalizedDict() {
  if (!NORMALIZED_DICT) {
    NORMALIZED_DICT = {};
    for (const [k, v] of Object.entries(TAMIL_PHRASES)) {
      NORMALIZED_DICT[k.trim().toLowerCase()] = v;
    }
  }
  return NORMALIZED_DICT;
}

// Word-level token dictionary for Tier 5 fallback
let WORD_DICT = null;
function getWordDict() {
  if (!WORD_DICT) {
    WORD_DICT = {};
    for (const [k, v] of Object.entries(TAMIL_WORDS)) {
      WORD_DICT[k.trim().toLowerCase()] = v;
    }
  }
  return WORD_DICT;
}

// Pre-sorted phrases cache for multi-word substring replacements (Tier 4)
let SORTED_PHRASES = null;
function getSortedPhrases() {
  if (!SORTED_PHRASES) {
    SORTED_PHRASES = Object.keys(TAMIL_PHRASES)
      .filter((k) => k.length >= 4 && !k.startsWith("+") && !k.startsWith("•"))
      .sort((a, b) => b.length - a.length)
      .map((k) => ({
        raw: k,
        translation: TAMIL_PHRASES[k],
        re: new RegExp(
          `(?<=^|[^a-zA-Z0-9])${escapeRegExp(k.trim())}(?=[^a-zA-Z0-9]|$)`,
          "gi"
        ),
      }));
  }
  return SORTED_PHRASES;
}

// Regex patterns for dynamic numeric strings (Tier 3)
const DYNAMIC_PATTERNS = [
  // Accounts / Parties / SKUs / Entities / Items / Invoices counts
  { re: /^(\d+)\s+Accounts$/i, replace: (_, n) => `${n} கணக்குகள்` },
  { re: /^(\d+)\s+Parties$/i, replace: (_, n) => `${n} நபர்கள்` },
  { re: /^(\d+)\s+SKUs$/i, replace: (_, n) => `${n} பொருட்கள்` },
  { re: /^(\d+)\s+SKU$/i, replace: (_, n) => `${n} பொருள்` },
  { re: /^(\d+)\s+Bills$/i, replace: (_, n) => `${n} பில்கள்` },
  { re: /^(\d+)\s+Bill$/i, replace: (_, n) => `${n} பில்` },
  { re: /^(\d+)\s+Invoices$/i, replace: (_, n) => `${n} விற்பனை பில்கள்` },
  { re: /^(\d+)\s+Invoice$/i, replace: (_, n) => `${n} விற்பனை பில்` },
  { re: /^(\d+)\s+Total Invoices$/i, replace: (_, n) => `${n} மொத்த பில்கள்` },
  {
    re: /^(\d+)\s+Total Credit Notes$/i,
    replace: (_, n) => `${n} மொத்த வரவு குறிப்புகள்`,
  },
  { re: /^(\d+)\s+Total Items$/i, replace: (_, n) => `${n} மொத்த பொருட்கள்` },
  { re: /^(\d+)\s+Total Bills$/i, replace: (_, n) => `${n} மொத்த பில்கள்` },
  { re: /^(\d+)\s+Customers$/i, replace: (_, n) => `${n} வாடிக்கையாளர்கள்` },
  { re: /^(\d+)\s+Customer$/i, replace: (_, n) => `${n} வாடிக்கையாளர்` },
  { re: /^(\d+)\s+Suppliers$/i, replace: (_, n) => `${n} சப்ளையர்கள்` },
  { re: /^(\d+)\s+Supplier$/i, replace: (_, n) => `${n} சப்ளையர்` },
  { re: /^(\d+)\s+Items$/i, replace: (_, n) => `${n} பொருட்கள்` },
  { re: /^(\d+)\s+Item$/i, replace: (_, n) => `${n} பொருள்` },
  { re: /^(\d+)\s+Products$/i, replace: (_, n) => `${n} பொருட்கள்` },
  { re: /^(\d+)\s+Product$/i, replace: (_, n) => `${n} பொருள்` },
  { re: /^(\d+)\s+Users$/i, replace: (_, n) => `${n} பயனர்கள்` },
  { re: /^(\d+)\s+Admins$/i, replace: (_, n) => `${n} நிர்வாகிகள்` },
  { re: /^(\d+)\s+Cashiers$/i, replace: (_, n) => `${n} காசாளர்கள்` },
  { re: /^(\d+)\s+Companies$/i, replace: (_, n) => `${n} நிறுவனங்கள்` },
  { re: /^(\d+)\s+Entity$/i, replace: (_, n) => `${n} நிறுவனம்` },
  { re: /^(\d+)\s+Entities$/i, replace: (_, n) => `${n} நிறுவனங்கள்` },
  { re: /^(\d+)\s+Branches$/i, replace: (_, n) => `${n} கிளைகள்` },
  { re: /^(\d+)\s+Entries$/i, replace: (_, n) => `${n} பதிவுகள்` },
  { re: /^(\d+)\s+Records$/i, replace: (_, n) => `${n} பதிவுகள்` },
  { re: /^(\d+)\s+Categories$/i, replace: (_, n) => `${n} பிரிவுகள்` },
  { re: /^(\d+)\s+Brands$/i, replace: (_, n) => `${n} பிராண்டுகள்` },

  // Percentages & Rates
  { re: /^(\d+)%\s+Cleared$/i, replace: (_, n) => `${n}% தீர்க்கப்பட்டது` },
  { re: /^(\d+)%\s+settled$/i, replace: (_, n) => `${n}% தீர்க்கப்பட்டது` },
  { re: /^(\d+)%\s+rate$/i, replace: (_, n) => `${n}% விகிதம்` },
  {
    re: /^(\d+)%\s+growth\s+this\s+quarter$/i,
    replace: (_, n) => `${n}% இந்த காலாண்டு வளர்ச்சி`,
  },
  {
    re: /^\+(\d+(\.\d+)?)%\s+growth\s+this\s+quarter$/i,
    replace: (_, n) => `+${n}% இந்த காலாண்டு வளர்ச்சி`,
  },

  // Compound counts
  {
    re: /^(\d+)\s+Active Periods$/i,
    replace: (_, n) => `${n} செயலில் உள்ள காலங்கள்`,
  },
  {
    re: /^(\d+)\s+Active Period$/i,
    replace: (_, n) => `${n} செயலில் உள்ள காலம்`,
  },
  { re: /^(\d+)\s+Critical$/i, replace: (_, n) => `${n} அவசர நிலுவைகள்` },
  {
    re: /^Export\s*\((\d+)\)$/i,
    replace: (_, n) => `ஏற்றுமதி (${n})`,
  },
  {
    re: /^Filter\s+(\d+)\s+items\.\.\.$/i,
    replace: (_, n) => `${n} பொருட்களை வடிகட்டவும்...`,
  },
  { re: /^ID\s*#(\d+)$/i, replace: (_, n) => `எண் #${n}` },

  // Pagination & Search
  {
    re: /^Showing\s+(\d+)\s+to\s+(\d+)\s+of\s+(\d+)\s+entries$/i,
    replace: (_, a, b, c) => `${a} முதல் ${b} வரை (மொத்தம் ${c} பதிவுகள்)`,
  },
  {
    re: /^Showing\s+(\d+)\s+to\s+(\d+)\s+of\s+(\d+)$/i,
    replace: (_, a, b, c) => `${a} முதல் ${b} வரை (மொத்தம் ${c})`,
  },
  {
    re: /^Showing\s+(\d+)\s+of\s+(\d+)\s+entries$/i,
    replace: (_, a, b) => `${a} / ${b} பதிவுகள்`,
  },
  {
    re: /^Page\s+(\d+)\s+of\s+(\d+)$/i,
    replace: (_, a, b) => `பக்கம் ${a} / ${b}`,
  },

  // Avg ticket
  {
    re: /^Avg ticket\s+₹([\d,.]+)$/i,
    replace: (_, amt) => `சராசரி பில் ₹${amt}`,
  },
  {
    re: /^Average ticket\s+₹([\d,.]+)$/i,
    replace: (_, amt) => `சராசரி பில் ₹${amt}`,
  },
  {
    re: /^₹([\d,.]+)\s+Total Sales$/i,
    replace: (_, amt) => `₹${amt} மொத்த விற்பனை`,
  },
  { re: /^₹([\d,.]+)\s+Balance$/i, replace: (_, amt) => `₹${amt} மீதி` },
  { re: /^(\d+)\s+units?$/i, replace: (_, n) => `${n} அலகுகள்` },
  { re: /^(\d+)\s+pcs$/i, replace: (_, n) => `${n} எண்ணிக்கை` },
  { re: /^(\d+)\s+pts$/i, replace: (_, n) => `${n} புள்ளிகள்` },
  { re: /^(\d+)\s+Total quotes$/i, replace: (_, n) => `${n} மொத்த மதிப்பீடுகள்` },
  { re: /^(\d+)\s+quotes$/i, replace: (_, n) => `${n} மதிப்பீடுகள்` },
  { re: /^Total quotes$/i, replace: () => `மொத்த மதிப்பீடுகள்` },
];

/**
 * Translates any arbitrary string using the 5-tier localization engine
 */
export function translateTextString(text) {
  if (!text) return text;
  const trimmed = text.trim();
  if (!trimmed) return text;

  // If text contains NO English letters at all, it's already pure Tamil/symbols, skip!
  if (!/[a-zA-Z]/.test(text)) {
    return text;
  }

  // Do not translate if it's strictly numbers, currency, dates, symbols
  if (/^[₹$€£\d\s.,:;/%+*#\-–—\(\)]+$/.test(trimmed)) {
    return text;
  }

  // Do not translate keyboard shortcuts (e.g. Ctrl+↵, Ctrl+F, Ctrl+Enter, Alt+B)
  if (/^(Ctrl|Alt|Shift|Cmd|Meta)(\+[a-zA-Z0-9↵]+)+$/i.test(trimmed)) {
    return text;
  }

  const dict = getNormalizedDict();
  const lower = trimmed.toLowerCase();

  // ── Tier 1: Exact or case-insensitive match ──
  if (dict[lower]) {
    return text.replace(trimmed, dict[lower]);
  }

  // ── Tier 2: Stripped punctuation & leading/trailing wrappers ──
  const wrapMatch = trimmed.match(
    /^([\s+•\-–—*#→←✓✕?!=:;()[\]"'{}\/\\~^|🏷️🏢⚡✏️🗂️★\u2022]+)?(.*?)([\s+•\-–—*#→←✓✕?!=:;()[\]"'{}\/\\~^|🏷️🏢⚡✏️🗂️★\u2022]+)?$/u
  );
  if (wrapMatch) {
    const prefix = wrapMatch[1] || "";
    const core = wrapMatch[2] ? wrapMatch[2].trim() : "";
    const suffix = wrapMatch[3] || "";

    if (core && core !== trimmed) {
      const coreLower = core.toLowerCase();
      if (dict[coreLower]) {
        return text.replace(trimmed, `${prefix}${dict[coreLower]}${suffix}`);
      }
      for (const p of DYNAMIC_PATTERNS) {
        if (p.re.test(core)) {
          const replacedCore = core.replace(p.re, p.replace);
          return text.replace(trimmed, `${prefix}${replacedCore}${suffix}`);
        }
      }
    }
  }

  // ── Tier 3: Dynamic numeric patterns ──
  for (const p of DYNAMIC_PATTERNS) {
    if (p.re.test(trimmed)) {
      const replaced = trimmed.replace(p.re, p.replace);
      return text.replace(trimmed, replaced);
    }
  }

  // ── Tier 4: Substring / Compound Multi-word Replacement ──
  let candidate = text;
  let modified = false;
  const phrases = getSortedPhrases();
  for (let i = 0; i < phrases.length; i++) {
    const item = phrases[i];
    if (item.re.test(candidate)) {
      candidate = candidate.replace(item.re, item.translation);
      modified = true;
    }
  }
  if (modified && !/[a-zA-Z]/.test(candidate)) {
    return candidate;
  }

  // ── Tier 5: Word-by-word token fallback for any remaining English words ──
  if (/[a-zA-Z]/.test(candidate)) {
    const wordDict = getWordDict();
    const replacedWords = candidate.replace(
      /\b([a-zA-Z]{2,})\b/g,
      (match, word) => {
        const wLower = word.toLowerCase();
        if (wordDict[wLower]) {
          modified = true;
          return wordDict[wLower];
        }
        return match;
      }
    );
    if (modified) {
      return replacedWords;
    }
  }

  return text;
}

function shouldSkipElement(elem) {
  if (!elem || !elem.tagName) return false;
  const tag = elem.tagName.toLowerCase();
  return (
    tag === "script" ||
    tag === "style" ||
    tag === "code" ||
    tag === "pre" ||
    tag === "svg" ||
    tag === "path" ||
    tag === "kbd" ||
    elem.isContentEditable ||
    elem.classList?.contains("no-translate") ||
    elem.hasAttribute?.("data-no-translate")
  );
}

function translateNode(node) {
  if (!node) return;

  if (node.nodeType === Node.TEXT_NODE) {
    const raw = node.nodeValue;
    if (!raw || !raw.trim()) return;

    // Skip if it doesn't contain English letters
    if (!/[a-zA-Z]/.test(raw)) return;

    // Do not translate if it's strictly numbers, currency, dates, symbols
    if (/^[₹$€£\d\s.,:;/%+*#\-–—\(\)]+$/.test(raw.trim())) return;

    const translated = translateTextString(raw);
    if (translated !== raw) {
      if (!originalNodeMap.has(node)) {
        originalNodeMap.set(node, raw);
      }
      node.nodeValue = translated;
    }
    return;
  }

  if (node.nodeType === Node.ELEMENT_NODE) {
    if (shouldSkipElement(node)) return;

    // Translate placeholder attribute
    if (node.placeholder && /[a-zA-Z]/.test(node.placeholder)) {
      const ph = node.placeholder.trim();
      const translatedPh = translateTextString(ph);
      if (translatedPh !== ph) {
        if (!originalAttrMap.has(node)) {
          originalAttrMap.set(node, { placeholder: node.placeholder });
        }
        node.placeholder = translatedPh;
      }
    }

    // Translate title attribute
    if (node.title && /[a-zA-Z]/.test(node.title)) {
      const tVal = node.title.trim();
      const translatedT = translateTextString(tVal);
      if (translatedT !== tVal) {
        if (!originalAttrMap.has(node)) {
          originalAttrMap.set(node, { title: node.title });
        }
        node.title = translatedT;
      }
    }

    // Translate aria-label attribute
    if (node.hasAttribute && node.hasAttribute("aria-label")) {
      const aVal = node.getAttribute("aria-label")?.trim();
      if (aVal && /[a-zA-Z]/.test(aVal)) {
        const translatedA = translateTextString(aVal);
        if (translatedA !== aVal) {
          if (!originalAttrMap.has(node)) {
            originalAttrMap.set(node, { ariaLabel: aVal });
          }
          node.setAttribute("aria-label", translatedA);
        }
      }
    }

    // Translate button / submit input values
    if (
      node.tagName &&
      node.tagName.toLowerCase() === "input" &&
      (node.type === "button" || node.type === "submit") &&
      node.value &&
      /[a-zA-Z]/.test(node.value)
    ) {
      const vVal = node.value.trim();
      const translatedV = translateTextString(vVal);
      if (translatedV !== vVal) {
        if (!originalAttrMap.has(node)) {
          originalAttrMap.set(node, { value: node.value });
        }
        node.value = translatedV;
      }
    }

    // Traverse children
    for (let child = node.firstChild; child; child = child.nextSibling) {
      translateNode(child);
    }
  }
}

function restoreNode(node) {
  if (!node) return;

  if (node.nodeType === Node.TEXT_NODE) {
    if (originalNodeMap.has(node)) {
      node.nodeValue = originalNodeMap.get(node);
    }
    return;
  }

  if (node.nodeType === Node.ELEMENT_NODE) {
    if (originalAttrMap.has(node)) {
      const saved = originalAttrMap.get(node);
      if (saved.placeholder !== undefined) node.placeholder = saved.placeholder;
      if (saved.title !== undefined) node.title = saved.title;
      if (saved.ariaLabel !== undefined)
        node.setAttribute("aria-label", saved.ariaLabel);
      if (saved.value !== undefined) node.value = saved.value;
    }

    for (let child = node.firstChild; child; child = child.nextSibling) {
      restoreNode(child);
    }
  }
}

/**
 * Activates or deactivates continuous auto-translation on document.body
 */
export function startAutoTranslation(lang) {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const activeLang = lang || localStorage.getItem("app_language") || "en";

  if (activeLang !== "ta") {
    if (domObserver) {
      domObserver.disconnect();
      domObserver = null;
    }
    if (document.body) {
      restoreNode(document.body);
    }
    return;
  }

  // lang === "ta"
  if (!document.body) {
    if (typeof window !== "undefined") {
      window.addEventListener(
        "DOMContentLoaded",
        () => startAutoTranslation(activeLang),
        { once: true }
      );
    }
    return;
  }

  // Initial pass on document.body
  if (!isTranslating) {
    isTranslating = true;
    try {
      translateNode(document.body);
    } finally {
      isTranslating = false;
    }
  }

  if (!domObserver && document.body) {
    domObserver = new MutationObserver((mutations) => {
      if (isTranslating) return;
      isTranslating = true;
      try {
        for (const mut of mutations) {
          if (mut.type === "childList") {
            for (const n of mut.addedNodes) {
              translateNode(n);
            }
          } else if (mut.type === "characterData") {
            translateNode(mut.target);
          } else if (mut.type === "attributes") {
            translateNode(mut.target);
          }
        }
      } finally {
        isTranslating = false;
      }
    });

    domObserver.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["placeholder", "title", "aria-label", "value"],
    });
  }
}

/**
 * Sweep helper to force translate newly mounted async pages or modals
 */
export function sweepTranslation() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const activeLang = localStorage.getItem("app_language") || "en";
  if (activeLang === "ta" && document.body) {
    if (isTranslating) return;
    isTranslating = true;
    try {
      translateNode(document.body);
    } finally {
      isTranslating = false;
    }
  }
}
