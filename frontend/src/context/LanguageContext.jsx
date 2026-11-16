import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { LANGUAGES, translations, PHRASE_TO_KEY } from "../translations/translations";
import assistantService from "../services/assistantService";

const LanguageContext = createContext(null);
const STORAGE_KEY = "app_language";
const LEGACY_STORAGE_KEY = "smart_grievance_portal_lang";

// Precomputed lowercase English value to dictionary key map
const EN_VALUE_TO_KEY = {};
if (translations && translations.en) {
  for (const [key, val] of Object.entries(translations.en)) {
    if (typeof val === "string" && val.trim()) {
      EN_VALUE_TO_KEY[val.trim().toLowerCase()] = key;
    }
  }
}
if (PHRASE_TO_KEY) {
  for (const [phrase, key] of Object.entries(PHRASE_TO_KEY)) {
    if (typeof phrase === "string" && phrase.trim()) {
      EN_VALUE_TO_KEY[phrase.trim().toLowerCase()] = key;
    }
  }
}

// In-memory DOM translation cache per language
const domTranslationCache = {};

// WeakMaps for zero-memory-leak original text & attribute preservation
const nodeOriginalTextMap = new WeakMap();
const elementOriginalAttrMap = new WeakMap();

// Batch translation queue
let pendingQueue = new Set();
let pendingNodes = new Map(); // englishText => Set<TextNode | { el, attr }>
let batchTimeout = null;

// Patch History API once for instant SPA route change notifications
if (typeof window !== "undefined" && !window.__history_trans_patched) {
  window.__history_trans_patched = true;
  const origPush = window.history.pushState;
  window.history.pushState = function (...args) {
    const res = origPush.apply(this, args);
    window.dispatchEvent(new Event("app-route-change"));
    return res;
  };
  const origReplace = window.history.replaceState;
  window.history.replaceState = function (...args) {
    const res = origReplace.apply(this, args);
    window.dispatchEvent(new Event("app-route-change"));
    return res;
  };
}

function getCache(lang) {
  if (!domTranslationCache[lang]) {
    domTranslationCache[lang] = {};
    try {
      const saved = localStorage.getItem(`app_dom_trans_${lang}`);
      if (saved) {
        Object.assign(domTranslationCache[lang], JSON.parse(saved));
      }
    } catch {
      // ignore
    }
  }
  return domTranslationCache[lang];
}

function saveCache(lang) {
  try {
    if (domTranslationCache[lang]) {
      localStorage.setItem(`app_dom_trans_${lang}`, JSON.stringify(domTranslationCache[lang]));
    }
  } catch {
    // ignore
  }
}

/**
 * Format a raw code identifier (e.g., 'btn_report_issue' or 'CITIZEN_WELCOME')
 * into graceful title case so users never see raw snake_case or screaming keys.
 */
function toHumanReadable(str) {
  if (!str || typeof str !== "string") return "";
  return str
    .replace(/^(btn|nav|title|stat|how|desc|tab|auth|portal)_/i, "")
    .replace(/[._-]+/g, " ")
    .replace(/\b[a-z]/g, (c) => c.toUpperCase())
    .trim();
}

/**
 * Direct lookup helper checking keys, mapped phrase values, and localStorage cache
 */
function lookupDirect(trimmed, lang) {
  if (!trimmed || typeof trimmed !== "string") return null;
  const lower = trimmed.toLowerCase();
  const under = lower.replace(/[\s\.\-]+/g, "_");

  const currentDict = translations[lang] || translations.en || {};

  // 1. Direct key match
  if (currentDict[trimmed]) return currentDict[trimmed];
  if (currentDict[lower]) return currentDict[lower];
  if (currentDict[under]) return currentDict[under];

  // 2. Lookup by English phrase value
  const mappedKey = EN_VALUE_TO_KEY[lower] || EN_VALUE_TO_KEY[under];
  if (mappedKey && currentDict[mappedKey]) {
    return currentDict[mappedKey];
  }

  // 3. Cache lookup
  const cache = getCache(lang);
  if (cache[trimmed]) return cache[trimmed];
  if (cache[lower]) return cache[lower];

  return null;
}

/**
 * Universal lookup helper for a string with smart punctuation and boundary handling
 */
function lookupTranslation(rawText, lang) {
  if (!rawText || typeof rawText !== "string") return null;
  const trimmed = rawText.trim();
  if (!trimmed || trimmed.length <= 1) return null;

  // If pure numbers, dates, punctuation, symbols, return null
  if (/^[\d\s\p{P}\p{S}]+$/u.test(trimmed)) return null;

  // 1. ENGLISH LOOKUP
  if (lang === "en") {
    const enDict = translations.en || {};
    const lower = trimmed.toLowerCase();
    const under = lower.replace(/[\s\.\-]+/g, "_");
    if (enDict[trimmed]) return enDict[trimmed];
    if (enDict[lower]) return enDict[lower];
    if (enDict[under]) return enDict[under];

    // If it looks like a key (has underscore or screaming caps with no spaces)
    if (trimmed.includes("_") || (/^[A-Z0-9_]+$/.test(trimmed) && trimmed.length > 2)) {
      return toHumanReadable(trimmed);
    }
    return rawText;
  }

  // 2. INDIC LANGUAGE LOOKUP
  // If text has NO Latin characters, it is already translated or in native script
  if (!/[a-zA-Z]/.test(trimmed)) return trimmed;

  // A. Exact direct lookup
  const direct = lookupDirect(trimmed, lang);
  if (direct) return direct;

  // B. Punctuation & Boundary-Agnostic Matching
  // Strips leading and trailing punctuation, arrows, bullets, plus signs, colons, numbering, quotes
  // e.g., "+ Report New Grievance" -> "+ " + trans("Report New Grievance")
  // e.g., "Report New Grievance →" -> trans("Report New Grievance") + " →"
  // e.g., "Welcome back, " -> trans("Welcome back") + ", "
  // e.g., "Citizen ID: #" -> trans("Citizen ID") + ": #"
  // e.g., "1. Problem Details" -> "1. " + trans("Problem Details")
  const m = trimmed.match(/^([\s\p{P}\p{S}\d\.\-\+•→#:]*)(.*?)([\s\p{P}\p{S}\d\.\-\+•→#:]*)$/u);
  if (m && m[2] && m[2].trim() && m[2].trim() !== trimmed) {
    const core = m[2].trim();
    if (/[a-zA-Z]/.test(core)) {
      const coreTrans = lookupDirect(core, lang);
      if (coreTrans && coreTrans !== core) {
        return m[1] + coreTrans + m[3];
      }
    }
  }

  // C. Word-by-word composition for short multi-word labels (<= 4 words)
  const words = trimmed.split(/\s+/);
  if (words.length >= 2 && words.length <= 4) {
    let replacedAny = false;
    let allClean = true;
    const translatedWords = words.map((w) => {
      const wClean = w.replace(/^[\p{P}\p{S}]+|[\p{P}\p{S}]+$/gu, "");
      if (!wClean) return w;
      const trans = lookupDirect(wClean, lang);
      if (trans && trans !== wClean) {
        replacedAny = true;
        return w.replace(wClean, trans);
      }
      if (/^(and|or|of|to|in|by|for|the|a|an)$/i.test(wClean)) {
        return w;
      }
      allClean = false;
      return w;
    });
    if (replacedAny && allClean) {
      return translatedWords.join(" ");
    }
  }

  return null;
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
      if (saved && LANGUAGES.some((l) => l.code === saved)) {
        return saved;
      }
    } catch {
      // ignore
    }
    return "en";
  });

  const [, setForceRender] = useState(0);

  const setLanguage = useCallback((newLang) => {
    if (LANGUAGES.some((l) => l.code === newLang)) {
      setLanguageState(newLang);
      try {
        localStorage.setItem(STORAGE_KEY, newLang);
        localStorage.setItem(LEGACY_STORAGE_KEY, newLang);
        document.documentElement.lang = newLang;
      } catch {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    try {
      document.documentElement.lang = language;
    } catch {
      // ignore
    }
  }, [language]);

  // Queue a string and its associated DOM node for batch translation
  const enqueueForTranslation = useCallback((text, nodeOrAttr, lang) => {
    if (!text || lang === "en" || !/[a-zA-Z]/.test(text)) return;
    const trimmed = text.trim();
    if (!trimmed || trimmed.length <= 1) return;

    if (!pendingNodes.has(trimmed)) {
      pendingNodes.set(trimmed, new Set());
    }
    if (nodeOrAttr) {
      pendingNodes.get(trimmed).add(nodeOrAttr);
    }
    pendingQueue.add(trimmed);

    if (batchTimeout) clearTimeout(batchTimeout);
    batchTimeout = setTimeout(() => {
      flushBatchQueue(lang);
    }, 50);
  }, []);

  // Flush queued phrases to /api/translate
  const flushBatchQueue = useCallback(async (lang) => {
    if (pendingQueue.size === 0 || lang === "en") return;

    const list = Array.from(pendingQueue).slice(0, 100);
    list.forEach((s) => pendingQueue.delete(s));

    try {
      const res = await assistantService.translateBatch(list, lang);
      if (res.success && res.translations) {
        const cache = getCache(lang);
        let hasNew = false;

        for (const [orig, trans] of Object.entries(res.translations)) {
          if (trans && trans !== orig) {
            cache[orig] = trans;
            cache[orig.toLowerCase()] = trans;
            hasNew = true;

            const targets = pendingNodes.get(orig);
            if (targets) {
              for (const target of targets) {
                if (target && target.nodeType === Node.TEXT_NODE) {
                  const originalFull = nodeOriginalTextMap.get(target) || orig;
                  const lead = originalFull.match(/^\s*/)?.[0] || "";
                  const trail = originalFull.match(/\s*$/)?.[0] || "";
                  target.nodeValue = lead + trans + trail;
                } else if (target && target.el && target.attr) {
                  target.el.setAttribute(target.attr, trans);
                }
              }
              pendingNodes.delete(orig);
            }
          }
        }

        if (hasNew) {
          saveCache(lang);
          // Immediately scan document tree to apply freshly cached translations across all elements
          if (typeof document !== "undefined" && document.body) {
            scanTree(document.body, lang);
          }
          setForceRender((n) => n + 1);
        }
      }
    } catch (err) {
      console.warn("Auto-translation batch error:", err);
    }

    // If more items remain in queue, schedule immediate next batch
    if (pendingQueue.size > 0) {
      setTimeout(() => {
        flushBatchQueue(lang);
      }, 40);
    }
  }, []);

  // Universal Translation function for React JSX
  const t = useCallback(
    (keyOrText, fallback = null) => {
      if (!keyOrText || typeof keyOrText !== "string") {
        return keyOrText || "";
      }
      const trimmed = keyOrText.trim();
      if (!trimmed) return keyOrText;

      const lower = trimmed.toLowerCase();
      const under = lower.replace(/[\s\.\-]+/g, "_");

      // 1. Language is English
      if (language === "en") {
        const enDict = translations.en || {};
        if (enDict[trimmed]) return enDict[trimmed];
        if (enDict[lower]) return enDict[lower];
        if (enDict[under]) return enDict[under];

        if (fallback !== null && fallback !== undefined) return fallback;

        // If it looks like a key/placeholder that was missed, convert to clean words
        if (trimmed.includes("_") || (/^[A-Z0-9_]+$/.test(trimmed) && trimmed.length > 2)) {
          return toHumanReadable(trimmed);
        }
        return keyOrText;
      }

      // 2. Language is an Indic language (hi, pa, bn, ta, te, mr, gu)
      const currentDict = translations[language] || translations.en || {};

      // Check key directly
      if (currentDict[trimmed]) return currentDict[trimmed];
      if (currentDict[lower]) return currentDict[lower];
      if (currentDict[under]) return currentDict[under];

      // Check mapped key
      const mappedKey = EN_VALUE_TO_KEY[lower] || EN_VALUE_TO_KEY[under];
      if (mappedKey && currentDict[mappedKey]) {
        return currentDict[mappedKey];
      }

      // Check fallback string in dictionary or EN_VALUE_TO_KEY
      if (fallback && typeof fallback === "string") {
        const fbTrimmed = fallback.trim();
        const fbLower = fbTrimmed.toLowerCase();
        const fbUnder = fbLower.replace(/[\s\.\-]+/g, "_");
        if (currentDict[fbTrimmed]) return currentDict[fbTrimmed];
        if (currentDict[fbLower]) return currentDict[fbLower];
        if (currentDict[fbUnder]) return currentDict[fbUnder];
        const fbMappedKey = EN_VALUE_TO_KEY[fbLower] || EN_VALUE_TO_KEY[fbUnder];
        if (fbMappedKey && currentDict[fbMappedKey]) {
          return currentDict[fbMappedKey];
        }
      }

      // Check DOM cache
      const cache = getCache(language);
      if (cache[trimmed]) return cache[trimmed];
      if (cache[lower]) return cache[lower];
      if (fallback && typeof fallback === "string") {
        const fbTrimmed = fallback.trim();
        const fbLower = fbTrimmed.toLowerCase();
        if (cache[fbTrimmed]) return cache[fbTrimmed];
        if (cache[fbLower]) return cache[fbLower];
      }

      // Boundary-agnostic lookup for phrase
      const transBoundary = lookupTranslation(trimmed, language);
      if (transBoundary && transBoundary !== trimmed) {
        return transBoundary;
      }

      if (fallback && typeof fallback === "string") {
        const fbTrans = lookupTranslation(fallback.trim(), language);
        if (fbTrans && fbTrans !== fallback.trim()) {
          return fbTrans;
        }
      }

      // If key exists in English, retrieve its English phrase and translate that
      const enDict = translations.en || {};
      const enKey = enDict[trimmed] ? trimmed : enDict[lower] ? lower : enDict[under] ? under : null;
      if (enKey) {
        const enVal = enDict[enKey];
        if (enVal) {
          if (cache[enVal]) return cache[enVal];
          enqueueForTranslation(enVal, null, language);
          return fallback !== null && fallback !== undefined ? fallback : enVal;
        }
      }

      // Queue for dynamic background translation using readable phrase instead of programmatic keys
      const phraseToQueue =
        fallback && typeof fallback === "string" && (trimmed.includes("_") || !trimmed.includes(" "))
          ? fallback.trim()
          : trimmed;
      enqueueForTranslation(phraseToQueue, null, language);
      return fallback !== null && fallback !== undefined ? fallback : keyOrText;
    },
    [language, enqueueForTranslation]
  );

  // Dynamic phrase translator
  const translateDynamic = useCallback(
    (text) => {
      if (!text || typeof text !== "string") return text;
      return t(text);
    },
    [t]
  );

  // DOM Text Node Processing
  const processTextNode = useCallback(
    (node, lang) => {
      if (!node || node.nodeType !== Node.TEXT_NODE) return;
      const parent = node.parentElement;
      if (!parent) return;

      const tag = parent.tagName.toUpperCase();
      if (
        tag === "SCRIPT" ||
        tag === "STYLE" ||
        tag === "CODE" ||
        tag === "PRE" ||
        tag === "NOSCRIPT" ||
        tag === "TEXTAREA"
      ) {
        return;
      }

      if (
        parent.classList?.contains("notranslate") ||
        parent.classList?.contains("no-translate") ||
        parent.classList?.contains("lucide") ||
        parent.getAttribute?.("translate") === "no"
      ) {
        return;
      }

      const currentVal = node.nodeValue;
      if (!currentVal || !currentVal.trim()) return;

      // Capture original English text on first encounter with real text
      let orig = nodeOriginalTextMap.get(node);
      if (!orig || !orig.trim()) {
        orig = currentVal;
        nodeOriginalTextMap.set(node, orig);
      }

      if (lang === "en") {
        if (node.nodeValue !== orig) {
          node.nodeValue = orig;
        }
        return;
      }

      const trimmed = orig.trim();
      if (!trimmed || !/[a-zA-Z]/.test(trimmed)) return;

      const trans = lookupTranslation(trimmed, lang);
      if (trans && trans !== trimmed) {
        const lead = orig.match(/^\s*/)?.[0] || "";
        const trail = orig.match(/\s*$/)?.[0] || "";
        const target = lead + trans + trail;
        if (node.nodeValue !== target) {
          node.nodeValue = target;
        }
      } else {
        enqueueForTranslation(trimmed, node, lang);
      }
    },
    [enqueueForTranslation]
  );

  // DOM Element Attributes Processing (Placeholders, Titles, Aria-labels)
  const processElement = useCallback(
    (el, lang) => {
      if (!el || el.nodeType !== Node.ELEMENT_NODE) return;

      // Helper to process an attribute
      const processAttr = (attrName) => {
        if (!el.hasAttribute || !el.hasAttribute(attrName)) return;
        if (!elementOriginalAttrMap.has(el)) elementOriginalAttrMap.set(el, {});
        const attrs = elementOriginalAttrMap.get(el);
        if (attrs[attrName] === undefined) {
          attrs[attrName] = el.getAttribute(attrName) || "";
        }
        const orig = attrs[attrName];

        if (lang === "en") {
          if (el.getAttribute(attrName) !== orig) {
            el.setAttribute(attrName, orig);
          }
        } else if (orig && orig.trim() && /[a-zA-Z]/.test(orig.trim())) {
          const trans = lookupTranslation(orig.trim(), lang);
          if (trans && trans !== orig.trim()) {
            if (el.getAttribute(attrName) !== trans) {
              el.setAttribute(attrName, trans);
            }
          } else {
            enqueueForTranslation(orig.trim(), { el, attr: attrName }, lang);
          }
        }
      };

      processAttr("placeholder");
      processAttr("title");
      processAttr("aria-label");
    },
    [enqueueForTranslation]
  );

  // Walk and translate an element tree
  const scanTree = useCallback(
    (root, lang) => {
      if (!root) return;
      const walker = document.createTreeWalker(
        root,
        NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
        {
          acceptNode(node) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const tag = node.tagName.toUpperCase();
              if (tag === "SCRIPT" || tag === "STYLE" || tag === "CODE" || tag === "PRE" || tag === "NOSCRIPT") {
                return NodeFilter.FILTER_REJECT;
              }
            }
            return NodeFilter.FILTER_ACCEPT;
          },
        }
      );

      let current;
      while ((current = walker.nextNode())) {
        if (current.nodeType === Node.TEXT_NODE) {
          processTextNode(current, lang);
        } else if (current.nodeType === Node.ELEMENT_NODE) {
          processElement(current, lang);
        }
      }
    },
    [processTextNode, processElement]
  );

  // Global DOM Mutation Observer & Route Change Listener:
  // automatically detects and translates all newly rendered pages and async content!
  useEffect(() => {
    // Immediate initial scan
    scanTree(document.body, language);

    // Staggered initial scans for any async data loading on mount
    const timer1 = setTimeout(() => scanTree(document.body, language), 120);
    const timer2 = setTimeout(() => scanTree(document.body, language), 450);
    const timer3 = setTimeout(() => scanTree(document.body, language), 1000);

    // Handle SPA client-side route navigation
    const handleNavigation = () => {
      if (language !== "en") {
        scanTree(document.body, language);
        setTimeout(() => scanTree(document.body, language), 100);
        setTimeout(() => scanTree(document.body, language), 350);
        setTimeout(() => scanTree(document.body, language), 850);
        setTimeout(() => scanTree(document.body, language), 1600);
      }
    };

    window.addEventListener("app-route-change", handleNavigation);
    window.addEventListener("popstate", handleNavigation);
    window.addEventListener("hashchange", handleNavigation);

    // Mutation observer with frame-rate debouncing
    let rafId = null;
    const observer = new MutationObserver((mutations) => {
      if (language === "en") return;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        for (const mutation of mutations) {
          if (mutation.type === "childList") {
            for (const added of mutation.addedNodes) {
              if (added.nodeType === Node.TEXT_NODE) {
                processTextNode(added, language);
              } else if (added.nodeType === Node.ELEMENT_NODE) {
                scanTree(added, language);
              }
            }
          } else if (mutation.type === "characterData") {
            processTextNode(mutation.target, language);
          }
        }
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener("app-route-change", handleNavigation);
      window.removeEventListener("popstate", handleNavigation);
      window.removeEventListener("hashchange", handleNavigation);
      observer.disconnect();
    };
  }, [language, scanTree, processTextNode]);

  const currentLangObj = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0];

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        languages: LANGUAGES,
        currentLanguage: currentLangObj,
        t,
        translateDynamic,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}

export default LanguageContext;
