/**
 * Universal Multilingual Translation Service for Smart Grievance Redressal Portal
 * Supports 8 Indian languages (en, hi, pa, bn, ta, te, mr, gu)
 * Script-level Unicode detection & Gemini LLM / Deterministic hybrid translation
 */

const SUPPORTED_LANGUAGES = ["en", "hi", "pa", "bn", "ta", "te", "mr", "gu"];

// Unicode Ranges for automatic script detection
const SCRIPT_RANGES = [
  { lang: "pa", regex: /[\u0A00-\u0A7F]/ }, // Gurmukhi (Punjabi)
  { lang: "bn", regex: /[\u0980-\u09FF]/ }, // Bengali
  { lang: "ta", regex: /[\u0B80-\u0BFF]/ }, // Tamil
  { lang: "te", regex: /[\u0C00-\u0C7F]/ }, // Telugu
  { lang: "gu", regex: /[\u0A80-\u0AFF]/ }, // Gujarati
  {
    lang: "mr",
    regex: /[\u0900-\u097F]/,
    keywords: ["आहे", "नाही", "रस्ता", "खड्डा", "तक्रार", "पाणी", "कचरा", "महापालिका", "झाले", "करावे", "कामाची"],
  }, // Marathi (Devanagari with Marathi keywords)
  { lang: "hi", regex: /[\u0900-\u097F]/ }, // Hindi (Devanagari)
];

/**
 * Detect language of given text via Unicode inspection
 * @param {string} text
 * @returns {string} Language code ('en', 'hi', 'pa', 'bn', 'ta', 'te', 'mr', 'gu')
 */
function detectLanguage(text = "") {
  if (!text || typeof text !== "string") return "en";
  const trimmed = text.trim();
  if (!trimmed) return "en";

  // Check specific non-Devanagari scripts first
  for (const item of SCRIPT_RANGES) {
    if (item.lang === "mr" || item.lang === "hi") continue;
    if (item.regex.test(trimmed)) {
      return item.lang;
    }
  }

  // Devanagari detection: check if Marathi keywords exist, else Hindi
  if (/[\u0900-\u097F]/.test(trimmed)) {
    const mrKeywords = ["आहे", "नाही", "रस्ता", "खड्डा", "तक्रार", "पाणी", "कचरा", "महापालिका", "झाले", "करावे", "कामाची", "दुरुस्ती"];
    const lower = trimmed.toLowerCase();
    for (const kw of mrKeywords) {
      if (lower.includes(kw)) {
        return "mr";
      }
    }
    return "hi";
  }

  // Default to English
  return "en";
}

const { EXPANDED_PHRASES, COMMON_WORDS } = require("./civicDictionary");

// Comprehensive civic dictionary for bidirectional translation
const CIVIC_PHRASES = {
  ...EXPANDED_PHRASES,
  // Pothole / Road damage
  "pothole on the road": {
    hi: "सड़क पर गड्ढा",
    pa: "ਸੜਕ 'ਤੇ ਖੱਡਾ",
    bn: "রাস্তায় গর্ত",
    ta: "சாலையில் குழி",
    te: "రహదారిపై గుంత",
    mr: "रस्त्यावरील खड्डा",
    gu: "રસ્તા પર ખાડો",
  },
  "large pothole near sector 14 signal": {
    hi: "सेक्टर 14 सिग्नल के पास बड़ा गड्ढा",
    pa: "ਸੈਕਟਰ 14 ਸਿਗਨਲ ਨੇੜੇ ਵੱਡਾ ਖੱਡਾ",
    bn: "সেক্টর ১৪ সিগন্যালের কাছে বড় গর্ত",
    ta: "செக்டார் 14 சிக்னல் அருகே பெரிய குழி",
    te: "సెక్టార్ 14 సిగ్నల్ దగ్గర పెద్ద గుంత",
    mr: "सेक्टर १४ सिग्नल जवळ मोठा खड्डा",
    gu: "સેક્ટર 14 સિગ્નલ નજીક મોટો ખાડો",
  },
  "there is a big hole on the road outside my house and it is dangerous.": {
    hi: "मेरे घर के बाहर सड़क पर एक बड़ा गड्ढा है और यह खतरनाक है।",
    pa: "ਮੇਰੇ ਘਰ ਦੇ ਬਾਹਰ ਸੜਕ 'ਤੇ ਇੱਕ ਵੱਡਾ ਖੱਡਾ ਹੈ ਅਤੇ ਇਹ ਖ਼ਤਰਨਾਕ ਹੈ।",
    bn: "আমার বাড়ির বাইরে রাস্তায় একটি বড় গর্ত রয়েছে এবং এটি বিপজ্জনক।",
    ta: "என் வீட்டின் வெளியே சாலையில் ஒரு பெரிய குழி உள்ளது, அது ஆபத்தானது.",
    te: "నా ఇంటి బయట రోడ్డుపై పెద్ద గుంత ఉంది మరియు ఇది ప్రమాదకరం.",
    mr: "माझ्या घराबाहेरील रस्त्यावर एक मोठा खड्डा आहे आणि तो धोकादायक आहे.",
    gu: "મારા ઘરની બહાર રસ્તા પર એક મોટો ખાડો છે અને તે જોખમી છે.",
  },
  "pothole and damaged road surface repair": {
    hi: "सड़क के गड्ढे और क्षतिग्रस्त सतह की मरम्मत",
    pa: "ਸੜਕ ਦੇ ਖੱਡੇ ਅਤੇ ਖਰਾਬ ਸਤਹ ਦੀ ਮੁਰੰਮਤ",
    bn: "রাস্তার গর্ত ও ক্ষতিগ্রস্ত পৃষ্ঠ মেরামত",
    ta: "சாலைக் குழி மற்றும் சேதமடைந்த தரைப்பரப்பு பழுதுபார்ப்பு",
    te: "రహదారి గుంతలు మరియు దెబ్బతిన్న రోడ్డు మరమ్మత్తు",
    mr: "रस्त्यावरील खड्डे आणि खराब झालेल्या रस्त्याची दुरुस्ती",
    gu: "રસ્તાના ખાડા અને ક્ષતિગ્રસ્ત સપાટીનું સમારકામ",
  },

  // Water supply & pipeline leakage
  "water pipeline is broken and leaking": {
    hi: "पानी की पाइपलाइन टूट गई है और पानी बह रहा है",
    pa: "ਪਾਣੀ ਦੀ ਪਾਈਪਲਾਈਨ ਟੁੱਟੀ ਹੋਈ ਹੈ ਅਤੇ ਲੀਕ ਹੋ ਰਹੀ ਹੈ",
    bn: "জলের পাইপলাইন ভেঙে গেছে এবং জল চুইয়ে পড়ছে",
    ta: "குடிநீர் குழாய் உடைந்து கசிகிறது",
    te: "నీటి పైప్‌లైన్ పగిలి లీక్ అవుతోంది",
    mr: "पाण्याची पाईपलाईन फुटली असून गळती होत आहे",
    gu: "પાણીની પાઇપલાઇન તૂટી ગઈ છે અને લીકેજ થઈ રહ્યું છે",
  },
  "dirty drinking water supply in area": {
    hi: "इलाके में गंदे पीने के पानी की आपूर्ति",
    pa: "ਇਲਾਕੇ ਵਿੱਚ ਗੰਦੇ ਪੀਣ ਵਾਲੇ ਪਾਣੀ ਦੀ ਸਪਲਾਈ",
    bn: "এলাকায় নোংরা পানীয় জলের সরবরাহ",
    ta: "பகுதியில் அசுத்தமான குடிநீர் விநியோகம்",
    te: "ప్రాంతంలో కలుషిత తాగునీటి సరఫరా",
    mr: "परिसरात अस्वच्छ पिण्याच्या पाण्याचा पुरवठा",
    gu: "વિસ્તારમાં ગંદા પીવાના પાણીનો પુરવઠો",
  },

  // Sanitation & garbage
  "garbage pile accumulated on main road": {
    hi: "मुख्य सड़क पर कचरे का ढेर लगा हुआ है",
    pa: "ਮੁੱਖ ਸੜਕ 'ਤੇ ਕੂੜੇ ਦਾ ਢੇਰ ਲੱਗਿਆ ਹੋਇਆ ਹੈ",
    bn: "প্রধান সড়কে আবর্জনার স্তূপ জমে আছে",
    ta: "முக்கிய சாலையில் குப்பை குவிந்துள்ளது",
    te: "ప్రధాన రహదారిపై చెత్త కుప్పలు పేరుకుపోయాయి",
    mr: "मुख्य रस्त्यावर कचऱ्याचे ढीग साचले आहेत",
    gu: "મુખ્ય રસ્તા પર કચરાના ઢગલા થયા છે",
  },
  "overflowing dustbin near market": {
    hi: "बाजार के पास ओवरफ्लो डस्टबिन",
    pa: "ਮਾਰਕੀਟ ਨੇੜੇ ਭਰਿਆ ਹੋਇਆ ਕੂੜਾਦਾਨ",
    bn: "বাজারের কাছে উপচে পড়া ডাস্টবিন",
    ta: "சந்தை அருகே நிரம்பி வழியும் குப்பைத் தொட்டி",
    te: "మార్కెట్ సమీపంలో నిండిపోయిన చెత్తకుండీ",
    mr: "बाजाराजवळ कचराकुंडी भरून वाहत आहे",
    gu: "બજાર નજીક ઓવરફ્લો થતી કચરાપેટી",
  },

  // Street light & electricity
  "street light not working for a week": {
    hi: "स्ट्रीट लाइट एक हफ्ते से काम नहीं कर रही है",
    pa: "ਸਟ੍ਰੀਟ ਲਾਈਟ ਇੱਕ ਹਫ਼ਤੇ ਤੋਂ ਬੰਦ ਹੈ",
    bn: "রাস্তার বাতি এক সপ্তাহ ধরে জ্বলছে না",
    ta: "தெருவிளக்கு ஒரு வாரமாக எரியவில்லை",
    te: "వీధి దీపం ఒక వారం నుండి పనిచేయడం లేదు",
    mr: "पथदिवा एका आठवड्यापासून बंद आहे",
    gu: "સ્ટ્રીટ લાઇટ એક અઠવાડિયાથી બંધ છે",
  },
  "sparking wire on electric pole": {
    hi: "बिजली के खंभे पर चिंगारी निकलती तार",
    pa: "ਬਿਜਲੀ ਦੇ ਖੰਭੇ 'ਤੇ ਚੰਗਿਆੜੀਆਂ ਮਾਰਦੀ ਤਾਰ",
    bn: "বৈদ্যুতিক খুঁটিতে স্ফুলিঙ্গময় তার",
    ta: "மின்கம்பத்தில் தீப்பொறி பறக்கும் கம்பி",
    te: "కరెంట్ స్తంభంపై స్పార్క్ అవుతున్న వైరు",
    mr: "विजेच्या खांबावर स्पार्किंग होणारी तार",
    gu: "વીજળીના થાંભલા પર તણખા ઝરતો વાયર",
  },

  // Public safety / Open manhole
  "open manhole without barricade": {
    hi: "बिना बैरिकेड के खुला मैनहोल",
    pa: "ਬਿਨਾਂ ਬੈਰੀਕੇਡ ਦੇ ਖੁੱਲ੍ਹਾ ਮੈਨਹੋਲ",
    bn: "ব্যারিকেডবিহীন খোলা ম্যানহোল",
    ta: "தடுப்பு இல்லாத திறந்த மேன்ஹோல்",
    te: "బారికేడ్ లేని తెరిచిన మ్యాన్‌హోల్",
    mr: "बॅरिकेड नसलेले उघडे मॅनहोल",
    gu: "બેરિકેડ વગરનો ખુલ્લો મેનહોલ",
  },

  // Officer resolution remarks templates
  "Issue inspected on ground and repair work completed successfully.": {
    hi: "मौके पर निरीक्षण किया गया और मरम्मत कार्य सफलतापूर्वक पूर्ण कर लिया गया है।",
    pa: "ਮੌਕੇ 'ਤੇ ਜਾਂਚ ਕੀਤੀ ਗਈ ਅਤੇ ਮੁਰੰਮਤ ਦਾ ਕੰਮ ਸਫਲਤਾਪੂਰਵਕ ਮੁਕੰਮਲ ਹੋ ਗਿਆ ਹੈ।",
    bn: "ঘটনাস্থল পরিদর্শন করা হয়েছে এবং মেরামতের কাজ সফলভাবে সম্পন্ন হয়েছে।",
    ta: "களப்பணி ஆய்வு செய்யப்பட்டு பழுதுபார்க்கும் பணி வெற்றிகரமாக முடிக்கப்பட்டது.",
    te: "క్షేత్రస్థాయిలో పరిశీలించి మరమ్మత్తు పనులను విజయవంతంగా పూర్తి చేయడం జరిగింది.",
    mr: "घटनास्थळी पाहणी करून दुरुस्तीचे काम यशस्वीरीत्या पूर्ण करण्यात आले आहे.",
    gu: "સ્થળ પર નિરીક્ષણ કરવામાં આવ્યું અને સમારકામ સફળતાપૂર્વક પૂર્ણ થયું છે.",
  },
  "Field team deployed. Work is currently in progress.": {
    hi: "फील्ड टीम तैनात कर दी गई है। कार्य वर्तमान में प्रगति पर है।",
    pa: "ਫੀਲਡ ਟੀਮ ਭੇਜੀ ਗਈ ਹੈ। ਕੰਮ ਇਸ ਸਮੇਂ ਪ੍ਰਗਤੀ ਅਧੀਨ ਹੈ।",
    bn: "ফিল্ড টিম পাঠানো হয়েছে। কাজ বর্তমানে চলমান রয়েছে।",
    ta: "களப்பணியாளர்கள் அனுப்பப்பட்டுள்ளனர். பணி தற்போது நடைபெற்று வருகிறது.",
    te: "ఫీల్డ్ బృందం రంగంలోకి దిగింది. పని ప్రస్తుతం పురోగతిలో ఉంది.",
    mr: "घटनास्थळी पथक पाठवले आहे. काम सध्या प्रगतीपथावर आहे.",
    gu: "ફિલ્ડ ટીમ તૈનાત કરવામાં આવી છે. કામ હાલમાં પ્રગતિમાં છે.",
  },
};

/**
 * Reverse mapping for non-English phrases back to English
 */
const REVERSE_TO_ENGLISH = {};
for (const [enPhrase, translations] of Object.entries(CIVIC_PHRASES)) {
  for (const [lang, trans] of Object.entries(translations)) {
    REVERSE_TO_ENGLISH[trans.trim().toLowerCase()] = enPhrase;
  }
}

/**
 * Call Gemini 2.5 Flash API for high-fidelity translation when API key is available
 */
async function translateWithGemini(text, targetLang, sourceLang = "auto") {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const langNames = {
      en: "English",
      hi: "Hindi",
      pa: "Punjabi",
      bn: "Bengali",
      ta: "Tamil",
      te: "Telugu",
      mr: "Marathi",
      gu: "Gujarati",
    };

    const targetLangName = langNames[targetLang] || targetLang;
    const prompt = `Translate the following text accurately into ${targetLangName}. Keep municipal terminology natural and precise. Return ONLY the translated text without explanations, quotes, or formatting:\n\n${text}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 1000,
        },
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const translated = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (translated) return translated;
    }
  } catch (err) {
    console.warn("Gemini translation API request failed, falling back to local engine:", err.message);
  }

  return null;
}

/**
 * Deterministic translation engine
 */
function translateDeterministically(text, targetLang, sourceLang) {
  if (!text) return "";
  const clean = text.trim();
  const lower = clean.toLowerCase();

  // 1. Direct match in dictionary
  if (targetLang === "en") {
    // Translating to English
    if (REVERSE_TO_ENGLISH[lower]) {
      const en = REVERSE_TO_ENGLISH[lower];
      return en.charAt(0).toUpperCase() + en.slice(1);
    }
    for (const [transKey, enPhrase] of Object.entries(REVERSE_TO_ENGLISH)) {
      if (lower.includes(transKey)) {
        return enPhrase.charAt(0).toUpperCase() + enPhrase.slice(1);
      }
    }
  } else {
    // Translating from English to Indian language
    // 1. Exact phrase match in CIVIC_PHRASES
    if (CIVIC_PHRASES[lower] && CIVIC_PHRASES[lower][targetLang]) {
      return CIVIC_PHRASES[lower][targetLang];
    }

    // 2. Exact match without trailing punctuation/arrows (e.g. "Report New Grievance →")
    const cleanNoPunct = lower.replace(/[→\->!?:.]+$/g, "").trim();
    if (CIVIC_PHRASES[cleanNoPunct] && CIVIC_PHRASES[cleanNoPunct][targetLang]) {
      const suffix = clean.match(/[→\->!?:.]+$/)?.[0] || "";
      return CIVIC_PHRASES[cleanNoPunct][targetLang] + (suffix ? " " + suffix : "");
    }

    // 3. Exact single-word or 2-word label match in COMMON_WORDS
    if (COMMON_WORDS[lower] && COMMON_WORDS[lower][targetLang]) {
      return COMMON_WORDS[lower][targetLang];
    }
    if (COMMON_WORDS[cleanNoPunct] && COMMON_WORDS[cleanNoPunct][targetLang]) {
      const suffix = clean.match(/[→\->!?:.]+$/)?.[0] || "";
      return COMMON_WORDS[cleanNoPunct][targetLang] + (suffix ? " " + suffix : "");
    }

    // 4. Multi-word phrase matching: ONLY if input is a short label (<= 4 words)
    // NEVER do isolated single-word regex replacement inside long sentences,
    // which causes mixed "Hinglish" output (e.g., "Live शिकायत Tracker").
    const words = lower.split(/\s+/).filter(Boolean);
    if (words.length <= 4) {
      const phrasesSorted = Object.entries(CIVIC_PHRASES).sort((a, b) => b[0].length - a[0].length);
      for (const [phrase, map] of phrasesSorted) {
        if (phrase.includes(" ") && lower.includes(phrase) && map[targetLang]) {
          return map[targetLang];
        }
      }
    }

    return clean;
  }

  // 2. Keyword replacement for civic context
  let result = clean;
  if (targetLang === "en") {
    // Replace common Indic civic terms with English
    const indicToEn = [
      { r: /(सड़क|ਸੜਕ|রাস্তা|சாலை|రహదారి|रस्ता|રસ્તો)/gi, en: "road" },
      { r: /(गड्ढा|गड्ढे|ਖੱਡਾ|ਖੱਡੇ|গর্ত|குழி|గుంత|గుంతలు|खड्डा|खड्डे|ખાડો|ખાડા)/gi, en: "pothole" },
      { r: /(पानी|ਪਾਣੀ|জল|குடிநீர்|నీరు|પાણી)/gi, en: "water" },
      { r: /(कचरा|ਕੂੜਾ|আবর্জনা|குப்பை|చెత్త|કચરો)/gi, en: "garbage" },
      { r: /(बिजली|ਬਿਜਲੀ|বিদ্যুৎ|மின்சாரம்|విద్యుత్|વીજળી)/gi, en: "electricity" },
      { r: /(पाइप|ਪਾਈਪ|పైప్|પાઈપ)/gi, en: "pipe" },
      { r: /(लीक|ਲੀਕੇਜ|கசிவு|లీకేజీ|गळती|લીકેજ)/gi, en: "leakage" },
      { r: /(खराब|ਖਰਾਬ|பழுது|పాడైంది|बंद)/gi, en: "broken / damaged" },
      { r: /(खतरनाक|ਖ਼ਤਰਨਾਕ|বিপজ্জনক|ஆபத்தானது|ప్రమాదకరం|धोकादायक|જોખમી)/gi, en: "dangerous" },
    ];
    for (const item of indicToEn) {
      if (item.r.test(result)) {
        result = result.replace(item.r, item.en);
      }
    }
  }

  return result;
}

/**
 * Universal text translation function (Gemini primary -> Deterministic fallback)
 * @param {string} text - Text to translate
 * @param {string} targetLang - Target language code
 * @param {string} sourceLang - Source language code (optional, auto-detected)
 * @returns {Promise<string>} Translated text
 */
async function translateText(text = "", targetLang = "en", sourceLang = null) {
  if (!text || typeof text !== "string") return text;
  const clean = text.trim();
  if (!clean) return "";

  const detected = sourceLang || detectLanguage(clean);
  if (detected === targetLang) {
    return clean;
  }

  // 1. Try Gemini LLM if key is present
  const geminiResult = await translateWithGemini(clean, targetLang, detected);
  if (geminiResult) {
    return geminiResult;
  }

  // 2. Deterministic civic translation fallback
  return translateDeterministically(clean, targetLang, detected);
}

/**
 * Translate an entire complaint record into target language
 * @param {Object} complaint
 * @param {string} targetLang
 * @returns {Promise<{ translatedTitle: string, translatedDescription: string, language: string }>}
 */
async function translateComplaint(complaint, targetLang = "en") {
  if (!complaint) return { translatedTitle: "", translatedDescription: "", language: targetLang };

  const sourceLang = complaint.originalLanguage || detectLanguage(complaint.title);
  if (sourceLang === targetLang) {
    return {
      translatedTitle: complaint.title,
      translatedDescription: complaint.description,
      language: targetLang,
      status: "original",
    };
  }

  // Check if translation already cached in record
  if (targetLang === "en" && complaint.translatedTitle && complaint.translatedDescription) {
    return {
      translatedTitle: complaint.translatedTitle,
      translatedDescription: complaint.translatedDescription,
      language: "en",
      status: "cached",
    };
  }

  const [tTitle, tDesc] = await Promise.all([
    translateText(complaint.title, targetLang, sourceLang),
    translateText(complaint.description, targetLang, sourceLang),
  ]);

  return {
    translatedTitle: tTitle || complaint.title,
    translatedDescription: tDesc || complaint.description,
    language: targetLang,
    status: "translated",
  };
}

module.exports = {
  SUPPORTED_LANGUAGES,
  detectLanguage,
  translateText,
  translateComplaint,
  translateWithGemini,
  CIVIC_PHRASES,
};
