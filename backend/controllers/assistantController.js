const Complaint = require("../models/Complaint");
const { getIsConnected } = require("../config/db");
const { inMemoryComplaints } = require("./complaintController");
const { detectLanguage, translateText } = require("../utils/translationService");

// Municipal Emergency Helplines
const EMERGENCY_HELPLINES = {
  nationalEmergency: "112 (All-in-one Emergency)",
  police: "100 / 112",
  fire: "101",
  ambulance: "108 / 102",
  womenHelpline: "1091",
  childHelpline: "1098",
  municipalControlRoom: "1916",
  swachhBharat: "1969",
  disasterManagement: "1077",
};

// Department SLA and routing taxonomy
const DEPARTMENT_TAXONOMY = {
  "Roads & Infrastructure": {
    department: "Roads Department",
    sla: "48–72 hours",
    keywords: ["road", "pothole", "potholes", "crater", "craters", "asphalt", "divider", "footpath", "sidewalk", "speed breaker", "sadak", "khadda", "खड्डा", "सड़क", "ਖੱਡਾ", "ਸੜਕ", "গর্ত", "குழி", "గుంత"],
  },
  "Water Supply & Drainage": {
    department: "Water Supply Department",
    sla: "24–48 hours",
    keywords: ["water", "leak", "pipeline", "pipe", "tap", "pressure", "drinking water", "dirty water", "tanker", "burst", "drain", "sewer", "nal", "pani", "पानी", "पाइप", "ਪਾਣੀ", "জল", "குடிநீர்", "నీరు"],
  },
  "Sanitation & Waste Management": {
    department: "Sanitation Department",
    sla: "24 hours",
    keywords: ["garbage", "trash", "waste", "dump", "dustbin", "overflowing", "dead animal", "sweeping", "cleaning", "gutter", "kachra", "safai", "कचरा", "सफाई", "ਕੂੜਾ", "আবর্জনা", "குப்பை", "చెత్త"],
  },
  "Electricity & Power": {
    department: "Electricity Department",
    sla: "12–24 hours",
    keywords: ["electric", "electricity", "street light", "streetlight", "pole", "wire", "cable", "spark", "transformer", "blackout", "power outage", "bijli", "बिजली", "ਬਿਜਲੀ", "বিদ্যুৎ", "மின்சாரம்", "కరెంట్"],
  },
  "Public Safety": {
    department: "Public Safety Department",
    sla: "4–12 hours",
    keywords: ["manhole", "open manhole", "cave-in", "collapse", "tree fallen", "hazardous tree", "live wire", "unbarricaded", "danger", "khatra", "खतरा", "ਮੈਨਹੋਲ", "ম্যানহোল", "மேன்ஹோல்"],
  },
};

// Localized Checklist Items for Drafting
const CHECKLIST_ITEMS = {
  en: [
    "Exact street name and nearest prominent landmark",
    "Estimated physical dimensions or extent of damage",
    "Clear daytime photograph of the defect",
  ],
  hi: [
    "सटीक सड़क का नाम और नजदीकी प्रमुख लैंडमार्क",
    "क्षति का अनुमानित आकार या गंभीरता",
    "दोष का दिन के समय लिया गया स्पष्ट फोटो",
  ],
  pa: [
    "ਸਹੀ ਸੜਕ ਦਾ ਨਾਮ ਅਤੇ ਨੇੜਲਾ ਪ੍ਰਮੁੱਖ ਲੈਂਡਮਾਰਕ",
    "ਨੁਕਸ ਦਾ ਅਨੁਮਾਨਿਤ ਆਕਾਰ ਜਾਂ ਗੰਭੀਰਤਾ",
    "ਨੁਕਸ ਦੀ ਦਿਨ ਵੇਲੇ ਲਈ ਗਈ ਸਾਫ਼ ਫ਼ੋਟੋ",
  ],
  bn: [
    "সঠিক রাস্তার নাম এবং নিকটবর্তী প্রধান ল্যান্ডমার্ক",
    "ক্ষতির আনুমানিক আকার বা বিস্তার",
    "ত্রুটির দিনের আলোয় তোলা পরিষ্কার ছবি",
  ],
  ta: [
    "துல்லியமான தெருவின் பெயர் மற்றும் அருகிலுள்ள முக்கிய அடையாளம்",
    "சேதத்தின் மதிப்பிடப்பட்ட அளவு அல்லது தீவிரம்",
    "குறைபாட்டின் தெளிவான பகல்நேர புகைப்படம்",
  ],
  te: [
    "ఖచ్చితమైన వీధి పేరు మరియు సమీపంలోని ప్రముఖ ల్యాండ్‌మార్క్",
    "నష్టం యొక్క అంచనా పరిమాణం లేదా తీవ్రత",
    "లోపం యొక్క స్పష్టమైన పగటి వెలుతురు ఫోటో",
  ],
  mr: [
    "अचूक रस्त्याचे नाव आणि जवळचा प्रमुख पत्ता",
    "नुकसानीचा अंदाजे आकार किंवा व्याप्ती",
    "दोषाचे दिवसा काढलेले स्पष्ट छायाचित्र",
  ],
  gu: [
    "ચોક્કસ રસ્તાનું નામ અને નજીકનું મુખ્ય સ્થળ",
    "નુકસાનનું અંદાજિત કદ અથવા ગંભીરતા",
    "ખામીનો દિવસના અજવાળામાં લીધેલો સ્પષ્ટ ફોટો",
  ],
};

// Localized CivicSaathi Responses
const SAATHI_RESPONSES = {
  en: {
    name: "CivicSaathi",
    tagline: "Your Smart Guide to a Better City",
    greeting: "Namaste! I am CivicSaathi, your digital municipal guide. I can help you draft civic complaints, track active grievances, or explain municipal procedures. How may I assist you today?",
    nonCivicRedirect: "I am CivicSaathi, specifically dedicated to civic and municipal affairs like roads, water supply, sanitation, streetlights, and public safety. How can I help you with a municipal service?",
    authRequiredForTracking: "To protect your privacy, please log in to your citizen account to view and track your private grievances.",
    loginButtonLabel: "Log In to Track Grievance",
    draftHeading: "Here is a structured municipal complaint draft prepared for you:",
    openFormButton: "Open in Grievance Form",
    checklistHeading: "Recommended Checklist Before Submitting:",
    slaHeading: "Expected Departmental SLA:",
  },
  hi: {
    name: "सिविक साथी",
    tagline: "बेहतर शहर के लिए आपका स्मार्ट मार्गदर्शक",
    greeting: "नमस्ते! मैं सिविक साथी हूँ, आपका डिजिटल नागरिक सहायक। मैं शिकायत दर्ज करने, शिकायतों की स्थिति ट्रैक करने या नगर निगम सेवाओं के बारे में जानकारी देने में मदद कर सकता हूँ। आज मैं आपकी क्या मदद करूँ?",
    nonCivicRedirect: "मैं सिविक साथी हूँ, जो केवल सड़क, पानी, कचरा, बिजली और सार्वजनिक सुरक्षा जैसे नागरिक मामलों में सहायता करता हूँ। कृपया बताएं कि नगर निगम से संबंधित किस समस्या में मैं आपकी मदद करूँ?",
    authRequiredForTracking: "आपकी गोपनीयता की सुरक्षा के लिए, कृपया अपनी शिकायतों की स्थिति देखने और ट्रैक करने के लिए अपने नागरिक खाते में लॉग इन करें।",
    loginButtonLabel: "शिकायत ट्रैक करने के लिए लॉग इन करें",
    draftHeading: "मैंने आपके लिए एक संरचित नगर निगम शिकायत का प्रारूप तैयार किया है:",
    openFormButton: "शिकायत फॉर्म में खोलें",
    checklistHeading: "शिकायत जमा करने से पहले अनुशंसित चेकलिस्ट:",
    slaHeading: "अपेक्षित विभागीय समयसीमा (SLA):",
  },
  pa: {
    name: "ਸਿਵਿਕ ਸਾਥੀ",
    tagline: "ਬਿਹਤਰ ਸ਼ਹਿਰ ਲਈ ਤੁਹਾਡਾ ਸਮਾਰਟ ਮਾਰਗਦਰਸ਼ਕ",
    greeting: "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ! ਮੈਂ ਸਿਵਿਕ ਸਾਥੀ ਹਾਂ, ਤੁਹਾਡਾ ਡਿਜੀਟਲ ਮਿਊਂਸਪਲ ਗਾਈਡ। ਮੈਂ ਸ਼ਿਕਾਇਤ ਦਰਜ ਕਰਨ, ਸਟੇਟਸ ਚੈੱਕ ਕਰਨ ਜਾਂ ਨਗਰ ਨਿਗਮ ਨਿਯਮਾਂ ਬਾਰੇ ਦੱਸਣ ਵਿੱਚ ਮਦਦ ਕਰ ਸਕਦਾ ਹਾਂ। ਅੱਜ ਮੈਂ ਤੁਹਾਡੀ ਕੀ ਮਦਦ ਕਰਾਂ?",
    nonCivicRedirect: "ਮੈਂ ਸਿਵਿਕ ਸਾਥੀ ਹਾਂ, ਜੋ ਸਿਰਫ਼ ਸੜਕਾਂ, ਪਾਣੀ, ਸਫਾਈ, ਬਿਜਲੀ ਅਤੇ ਜਨਤਕ ਸੁਰੱਖਿਆ ਵਰਗੇ ਨਾਗਰਿਕ ਮਸਲਿਆਂ ਵਿੱਚ ਮਦਦ ਕਰਦਾ ਹਾਂ। ਨਗਰ ਨਿਗਮ ਬਾਰੇ ਤੁਸੀਂ ਕੀ ਪੁੱਛਣਾ ਚਾਹੁੰਦੇ ਹੋ?",
    authRequiredForTracking: "ਤੁਹਾਡੀ ਗੋਪਨੀਯਤਾ ਦੀ ਸੁਰੱਖਿਆ ਲਈ, ਆਪਣੀਆਂ ਨਿੱਜੀ ਸ਼ਿਕਾਇਤਾਂ ਦੇਖਣ ਲਈ ਕਿਰਪਾ ਕਰਕੇ ਆਪਣੇ ਨਾਗਰਿਕ ਖਾਤੇ ਵਿੱਚ ਲਾਗਇਨ ਕਰੋ।",
    loginButtonLabel: "ਟਰੈਕ ਕਰਨ ਲਈ ਲਾਗਇਨ ਕਰੋ",
    draftHeading: "ਮੈਂ ਤੁਹਾਡੇ ਲਈ ਇੱਕ ਰਸਮੀ ਸ਼ਿਕਾਇਤ ਡਰਾਫਟ ਤਿਆਰ ਕੀਤਾ ਹੈ:",
    openFormButton: "ਫਾਰਮ ਵਿੱਚ ਖੋਲ੍ਹੋ",
    checklistHeading: "ਜਮ੍ਹਾਂ ਕਰਨ ਤੋਂ ਪਹਿਲਾਂ ਚੈੱਕਲਿਸਟ:",
    slaHeading: "ਵਿਭਾਗੀ ਹੱਲ ਸਮਾਂ (SLA):",
  },
  bn: {
    name: "সিভিক সাথী",
    tagline: "উন্নত শহরের জন্য আপনার স্মার্ট গাইড",
    greeting: "নমস্কার! আমি সিভিক সাথী, আপনার ডিজিটাল পৌর সহায়ক। আমি অভিযোগের খসড়া তৈরি, স্ট্যাটাস ট্র্যাক বা পৌর প্রক্রিয়া ব্যাখ্যা করতে পারি। আজ আপনাকে কীভাবে সাহায্য করতে পারি?",
    nonCivicRedirect: "আমি সিভিক সাথী, রাস্তা, জল, বর্জ্য, আলো এবং নিরাপত্তার মতো নাগরিক বিষয়ে নিবেদিত। পৌরসেবা সংক্রান্ত কী জানতে চান?",
    authRequiredForTracking: "আপনার গোপনীয়তা রক্ষার জন্য, আপনার ব্যক্তিগত অভিযোগ ট্র্যাক করতে অনুগ্রহ করে আপনার একাউন্টে লগইন করুন।",
    loginButtonLabel: "ট্র্যাক করতে লগইন করুন",
    draftHeading: "আমি আপনার জন্য একটি পৌর অভিযোগের খসড়া প্রস্তুত করেছি:",
    openFormButton: "অভিযোগ ফর্মে খুলুন",
    checklistHeading: "জমা দেওয়ার আগের চেকলিস্ট:",
    slaHeading: "প্রত্যাশিত সমাধানের সময় (SLA):",
  },
  ta: {
    name: "சிவிக் சாதி",
    tagline: "சிறந்த நகரத்திற்கான உங்கள் ஸ்மார்ட் வழிகாட்டி",
    greeting: "வணக்கம்! நான் சிவிக் சாதி, உங்கள் டிஜிட்டல் மாநகராட்சி வழிகாட்டி. புகார் எழுத, நிலையை கண்காணிக்க நான் உதவ முடியும். இன்று உங்களுக்கு எவ்வாறு உதவ வேண்டும்?",
    nonCivicRedirect: "நான் சிவிக் சாதி, சாலை, குடிநீர், சுகாதாரம், மின்சாரம் போன்ற குடிமை விவகாரங்களுக்கு மட்டுமே உதவ முடியும். மாநகராட்சி சேவை குறித்து என்ன உதவி வேண்டும்?",
    authRequiredForTracking: "உங்கள் தனியுரிமையை பாதுகாக்க, உங்கள் புகார்களை காண தயவுசெய்து உங்கள் கணக்கில் உள்நுழையவும்.",
    loginButtonLabel: "கண்காணிக்க உள்நுழைக",
    draftHeading: "உங்கள் தகவல்களின் அடிப்படையில் நான் ஒரு புகார் வரைவை தயார் செய்துள்ளேன்:",
    openFormButton: "படிவத்தில் திறக்கவும்",
    checklistHeading: "சமர்ப்பிக்கும் முன் சரிபார்க்க வேண்டியவை:",
    slaHeading: "எதிர்பார்க்கப்படும் தீர்வு நேரம் (SLA):",
  },
  te: {
    name: "సివిక్ సాథీ",
    tagline: "మెరుగైన నగరం కోసం మీ స్మార్ట్ గైడ్",
    greeting: "నమస్కారం! నేను సివిక్ సాథీని, మీ డిజిటల్ మునిసిపల్ గైడ్. ఫిర్యాదు డ్రాఫ్ట్ చేయడానికి, స్థితిని ట్రాక్ చేయడానికి నేను సహాయపడతాను. నేడు మీకు ఏ విధంగా సహాయపడగలను?",
    nonCivicRedirect: "నేను సివిక్ సాథీని, రోడ్లు, నీరు, పారిశుద్ధ్యం, విద్యుత్ వంటి పౌర సమస్యలకు మాత్రమే సహాయపడతాను. మునిసిపల్ సేవల గురించి మీరు ఏమి తెలుసుకోవాలనుకుంటున్నారు?",
    authRequiredForTracking: "మీ గోప్యతను కాపాడటానికి, మీ వ్యక్తిగత ఫిర్యాదులను ట్రాక్ చేయడానికి దయచేసి లాగిన్ అవ్వండి.",
    loginButtonLabel: "ట్రాక్ చేయడానికి లాగిన్ అవ్వండి",
    draftHeading: "నేను మీ కోసం మునిసిపల్ ఫిర్యాదు డ్రాఫ్ట్‌ను సిద్ధం చేసాను:",
    openFormButton: "ఫారమ్‌లో తెరవండి",
    checklistHeading: "సమర్పించే ముందు చెక్‌లిస్ట్:",
    slaHeading: "అంచనా పరిష్కార సమయం (SLA):",
  },
  mr: {
    name: "सिव्हिक साथी",
    tagline: "उत्तम शहरासाठी आपला स्मार्ट मार्गदर्शक",
    greeting: "नमस्कार! मी सिव्हिक साथी आहे, आपला डिजिटल नागरी मार्गदर्शक. तक्रार मसुदा तयार करणे, सद्यस्थिती तपासणे यासाठी मी मदत करू शकतो. आज मी आपल्याला कशी मदत करू?",
    nonCivicRedirect: "मी सिव्हिक साथी असून रस्ते, पाणी, कचरा, वीज यांसारख्या नागरी सेवांसंदर्भात मदत करतो. महानगरपालिकेच्या कोणत्या सेवेबद्दल मदत हवी आहे?",
    authRequiredForTracking: "आपल्या गोपनीयतेच्या संरक्षणासाठी, आपल्या तक्रारी तपासण्यासाठी कृपया आपल्या नागरिक खात्यात लॉगिन करा.",
    loginButtonLabel: "तपासण्यासाठी लॉगिन करा",
    draftHeading: "मी आपल्यासाठी औपचारिक तक्रारीचा मसुदा तयार केला आहे:",
    openFormButton: "तक्रार फॉर्ममध्ये उघडा",
    checklistHeading: "दाखल करण्यापूर्वी तपासणी यादी:",
    slaHeading: "अपेक्षित निवारण कालावधी (SLA):",
  },
  gu: {
    name: "સિવિક સાથી",
    tagline: "સારા શહેર માટે તમારો સ્માર્ટ માર્ગદર્શક",
    greeting: "નમસ્તે! હું સિવિક સાથી છું, તમારો ડિજિટલ મ્યુનિસિપલ ગાઇડ. ફરિયાદ ડ્રાફ્ટ કરવા, સ્થિતિ ટ્રેક કરવા માટે હું મદદ કરી શકું છું. આજે હું તમારી શું મદદ કરી શકું?",
    nonCivicRedirect: "હું સિવિક સાથી છું, જે માત્ર રસ્તા, પાણી, કચરો અને વીજળી જેવા નાગરિક પ્રશ્નોમાં મદદ કરું છું. મ્યુનિસિપલ સેવા વિશે શું પૂછવું છે?",
    authRequiredForTracking: "તમારી ગોપનીયતાની સુરક્ષા માટે, તમારી અંગત ફરિયાદો ટ્રેક કરવા માટે કૃપા કરીને લૉગ ઇન કરો.",
    loginButtonLabel: "ટ્રેક કરવા માટે લૉગ ઇન કરો",
    draftHeading: "મેં તમારા માટે એક ઔપચારિક મ્યુનિસિપલ ફરિયાદનો ડ્રાફ્ટ તૈયાર કર્યો છે:",
    openFormButton: "ફરિયાદ ફોર્મમાં ખોલો",
    checklistHeading: "સબમિટ કરતા પહેલાંની ચેકલિસ્ટ:",
    slaHeading: "અપેક્ષિત સમયમર્યાદા (SLA):",
  },
};

/**
 * Classify civic category and department
 */
function classifyIssue(text = "") {
  const lower = text.toLowerCase();
  for (const [catName, meta] of Object.entries(DEPARTMENT_TAXONOMY)) {
    for (const kw of meta.keywords) {
      if (lower.includes(kw.toLowerCase())) {
        let priority = "Medium";
        if (
          lower.includes("dangerous") ||
          lower.includes("urgent") ||
          lower.includes("critical") ||
          lower.includes("sparking") ||
          lower.includes("open manhole") ||
          lower.includes("burst") ||
          lower.includes("खतरनाक") ||
          lower.includes("ਖ਼ਤਰਨਾਕ")
        ) {
          priority = "High";
        }
        return {
          category: catName,
          department: meta.department,
          sla: meta.sla,
          priority,
        };
      }
    }
  }

  return {
    category: "Other Civic Issue",
    department: "Other Civic Issue",
    sla: "48–72 hours",
    priority: "Medium",
  };
}

/**
 * Detect user intent
 */
function detectAssistantIntent(message = "") {
  const text = message.toLowerCase();

  // 1. Emergency intent
  if (
    /\b(emergency|police|ambulance|fire|112|100|101|108|1091)\b/i.test(text) ||
    /(आपातकाल|हेल्पलाइन|ਐਮਰਜੈਂਸੀ|জরুরি|அவசரம்|అత్యవసరం|आपत्कालीन|કટોકટી)/i.test(text)
  ) {
    return "emergency";
  }

  // 2. Tracking intent
  if (
    /\b(track|status|my complaint|my complaints|check status|where is my|complaint id|grv)\b/i.test(text) ||
    /#?grv-?[a-z0-9]+/i.test(text) ||
    /^[0-9a-f]{24}$/i.test(text.trim()) ||
    /(ट्रैक|स्थिति|स्टेटस|ਸਟੇਟਸ|ਟਰੈਕ|ট্র্যাক|நிலை|స్థితి|तपासा|સ્થિતિ)/i.test(text)
  ) {
    return "track";
  }

  // 3. Non-civic check (e.g. movies, politics, weather, cooking, personal queries)
  if (
    /\b(movie|cinema|actor|cricket|ipl|recipe|cook|joke|politics|election candidate|prime minister|who won)\b/i.test(text) ||
    /(सिनेमा|फिल्म|क्रिकेट|राजनीति|खाना बनाना)/i.test(text)
  ) {
    return "non_civic";
  }

  // 4. Drafting / Filing complaint
  if (
    /\b(pothole|road|hole|water|pipe|leak|garbage|waste|light|pole|wire|manhole|danger|broken|complaint|draft|file|report)\b/i.test(text) ||
    /(गड्ढा|सड़क|पानी|कचरा|बिजली|तार|ਖੱਡਾ|ਸੜਕ|ਕੂੜਾ|ਗਲੀ|குடிநீர்|குழி|చెత్త|గుంత|रस्ता|खड्डा|ખાડો|કચરો)/i.test(text)
  ) {
    return "draft";
  }

  return "civic_qa";
}

/**
 * Generate Structured Draft with Civic Checklist
 */
function generateStructuredDraft(userMessage, lang) {
  const classification = classifyIssue(userMessage);
  const localizedSaathi = SAATHI_RESPONSES[lang] || SAATHI_RESPONSES.en;
  const checklist = CHECKLIST_ITEMS[lang] || CHECKLIST_ITEMS.en;

  // Derive professional title
  let title = userMessage.trim();
  title = title.replace(/^(there is a |i want to report |help me draft a complaint about |please report |report )/i, "").trim();
  if (title.length > 60) title = title.substring(0, 57) + "...";
  if (!title || title.length < 5) title = `${classification.category} Issue`;
  title = title.charAt(0).toUpperCase() + title.slice(1);

  if (title.toLowerCase().includes("hole on the road") || title.toLowerCase().includes("pothole")) {
    title = "Pothole and Damaged Road Surface Repair";
  }

  const draft = {
    title,
    category: classification.category,
    department: classification.department,
    priority: classification.priority,
    sla: classification.sla,
    description: userMessage.trim(),
    checklist,
  };

  const responseText = `${localizedSaathi.draftHeading}\n\n` +
    `• **Title:** ${draft.title}\n` +
    `• **Department:** ${draft.department}\n` +
    `• **Priority:** ${draft.priority}\n` +
    `• **Target SLA:** ${draft.sla}\n\n` +
    `📋 **${localizedSaathi.checklistHeading}**\n` +
    checklist.map((item, idx) => `  ${idx + 1}. ${item}`).join("\n");

  return {
    reply: responseText,
    intent: "draft",
    draft,
    checklist,
    action: {
      type: "open_form",
      label: localizedSaathi.openFormButton,
      url: `/citizen/raise?title=${encodeURIComponent(draft.title)}&category=${encodeURIComponent(draft.category)}&department=${encodeURIComponent(draft.department)}&priority=${encodeURIComponent(draft.priority)}&description=${encodeURIComponent(draft.description)}`,
      payload: draft,
    },
  };
}

/**
 * Handle Live Grievance Tracking (Enforces Authentication Boundary)
 */
async function handleTrackingTelemetry(query, user, lang) {
  const localizedSaathi = SAATHI_RESPONSES[lang] || SAATHI_RESPONSES.en;

  // 1. Security Safeguard: Unauthenticated users are prompted to log in
  if (!user || !user._id) {
    return {
      status: 401,
      reply: localizedSaathi.authRequiredForTracking,
      intent: "auth_required",
      authenticated: false,
      action: {
        type: "redirect_login",
        label: localizedSaathi.loginButtonLabel,
        url: `/login?redirect=${encodeURIComponent("/citizen/track")}`,
      },
    };
  }

  // 2. Authenticated user: retrieve real-time complaints
  let userComplaints = [];
  if (getIsConnected()) {
    try {
      userComplaints = await Complaint.find({ citizen: user._id })
        .populate("department", "departmentName")
        .populate("assignedOfficer", "name email")
        .sort({ createdAt: -1 })
        .limit(5);
    } catch {
      userComplaints = [];
    }
  } else {
    userComplaints = inMemoryComplaints.filter(
      (c) => String(c.citizen?._id || c.citizen) === String(user._id)
    ).slice(0, 5);
  }

  if (userComplaints.length === 0) {
    return {
      reply: "You currently have no active grievances registered on the portal. Would you like me to help you draft one?",
      intent: "track_empty",
      authenticated: true,
      complaints: [],
    };
  }

  // Format real-time complaints with telemetry
  let replyText = `Here is the live status telemetry for your registered grievances:\n\n`;
  userComplaints.forEach((c, idx) => {
    const code = c.complaintNumber || `#GRV-${String(c._id).slice(-5).toUpperCase()}`;
    const dept = c.department?.departmentName || c.department || c.category || "Municipal Division";
    const officer = c.assignedOfficer?.name ? `Officer: ${c.assignedOfficer.name}` : "Awaiting Field Assignment";
    replyText += `${idx + 1}. **${code}** — "${c.title}"\n   • Status: **${c.status}** (${c.priority} Priority)\n   • Dept: ${dept} | ${officer}\n\n`;
  });

  return {
    reply: replyText.trim(),
    intent: "track",
    authenticated: true,
    complaints: userComplaints.map((c) => ({
      _id: c._id,
      code: c.complaintNumber || `#GRV-${String(c._id).slice(-5).toUpperCase()}`,
      title: c.title,
      status: c.status,
      priority: c.priority,
      department: c.department?.departmentName || c.department || c.category,
      assignedOfficer: c.assignedOfficer?.name || null,
    })),
    action: {
      type: "view_tracking_page",
      label: "Open Live Tracker",
      url: "/citizen/track",
    },
  };
}

/**
 * Main CivicSaathi Conversational Controller (POST /api/assistant/chat)
 */
const chatWithCivicSaathi = async (req, res) => {
  try {
    const {
      message = "",
      language = "en",
      mode = "",
    } = req.body || {};

    const cleanLang = ["en", "hi", "pa", "bn", "ta", "te", "mr", "gu"].includes(language) ? language : "en";
    const user = req.user || null;
    const localizedSaathi = SAATHI_RESPONSES[cleanLang] || SAATHI_RESPONSES.en;

    // Greeting if empty query
    if (!message.trim() && !mode) {
      return res.status(200).json({
        success: true,
        assistant: localizedSaathi.name,
        tagline: localizedSaathi.tagline,
        reply: localizedSaathi.greeting,
        language: cleanLang,
        intent: "greeting",
        suggestedInquiries: [
          cleanLang === "hi" ? "सड़क के गड्ढे की शिकायत लिखें" : "Draft a pothole complaint",
          cleanLang === "hi" ? "मेरी शिकायत की स्थिति क्या है?" : "What is the status of my complaints?",
          cleanLang === "hi" ? "आपातकालीन हेल्पलाइन नंबर" : "Municipal emergency helplines",
          cleanLang === "hi" ? "सड़क मरम्मत में कितना समय लगता है?" : "Which department handles road damage?",
        ],
      });
    }

    const intent = mode || detectAssistantIntent(message);

    // 1. Non-civic redirect boundary
    if (intent === "non_civic") {
      return res.status(200).json({
        success: true,
        reply: localizedSaathi.nonCivicRedirect,
        intent: "non_civic",
        language: cleanLang,
      });
    }

    // 2. Emergency Intent
    if (intent === "emergency") {
      const emergencyText = `🚨 **Municipal & Emergency Helplines:**\n\n` +
        `• National Emergency: ${EMERGENCY_HELPLINES.nationalEmergency}\n` +
        `• Police: ${EMERGENCY_HELPLINES.police}\n` +
        `• Fire: ${EMERGENCY_HELPLINES.fire}\n` +
        `• Ambulance: ${EMERGENCY_HELPLINES.ambulance}\n` +
        `• Women Helpline: ${EMERGENCY_HELPLINES.womenHelpline}\n` +
        `• Childline: ${EMERGENCY_HELPLINES.childHelpline}\n` +
        `• Municipal Control Room: ${EMERGENCY_HELPLINES.municipalControlRoom}\n` +
        `• Swachhata Helpline: ${EMERGENCY_HELPLINES.swachhBharat}\n\n` +
        `For life-threatening emergencies, please call **112** immediately.`;

      return res.status(200).json({
        success: true,
        reply: cleanLang !== "en" ? await translateText(emergencyText, cleanLang, "en") : emergencyText,
        intent: "emergency",
        helplines: EMERGENCY_HELPLINES,
        language: cleanLang,
      });
    }

    // 3. Tracking Telemetry Intent (Enforces 401 Auth Boundary)
    if (intent === "track") {
      const trackingResult = await handleTrackingTelemetry(message, user, cleanLang);
      const statusCode = trackingResult.status || 200;
      return res.status(statusCode).json({
        success: statusCode === 200,
        language: cleanLang,
        ...trackingResult,
      });
    }

    // 4. Complaint Drafting Intent
    if (intent === "draft") {
      const draftResult = generateStructuredDraft(message, cleanLang);
      return res.status(200).json({
        success: true,
        language: cleanLang,
        ...draftResult,
      });
    }

    // 5. Civic Q&A Intent (SLA, department jurisdictions)
    const classification = classifyIssue(message);
    const qaResponse = `The **${classification.department}** oversees ${classification.category}. ` +
      `Standard municipal resolution commitment (SLA) for this category is **${classification.sla}**. ` +
      `Would you like me to help you draft and submit a formal complaint?`;

    const translatedQa = cleanLang !== "en" ? await translateText(qaResponse, cleanLang, "en") : qaResponse;

    return res.status(200).json({
      success: true,
      reply: translatedQa,
      intent: "civic_qa",
      department: classification.department,
      sla: classification.sla,
      language: cleanLang,
      quickPrompts: [
        cleanLang === "hi" ? "शिकायत फॉर्म में भरें" : "Draft this complaint",
        cleanLang === "hi" ? "शिकायत ट्रैक करें" : "Track status",
      ],
    });
  } catch (error) {
    console.error("CivicSaathi Assistant error:", error);
    return res.status(500).json({
      success: false,
      message: "CivicSaathi is momentarily unavailable. Please try again.",
      error: error.message,
    });
  }
};

module.exports = {
  chatWithCivicSaathi,
  detectAssistantIntent,
  classifyIssue,
  generateStructuredDraft,
  handleTrackingTelemetry,
  SAATHI_RESPONSES,
  CHECKLIST_ITEMS,
  DEPARTMENT_TAXONOMY,
};
