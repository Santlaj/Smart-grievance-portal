const Complaint = require("../models/Complaint");
const Department = require("../models/Department");
const { getIsConnected } = require("../config/db");
const { inMemoryComplaints } = require("./complaintController");

// Municipal Emergency Helplines
const EMERGENCY_HELPLINES = {
  nationalEmergency: "112 (All-in-one Emergency)",
  police: "100 / 112",
  fire: "101",
  ambulance: "108 / 102",
  womenHelpline: "1091",
  childHelpline: "1098",
  municipalControlRoom: "1916",
  swachhBharat: "1969 (Swachhata Helpline)",
  disasterManagement: "1077",
};

// Department taxonomy matching municipal divisions
const CIVIC_DEPARTMENTS = [
  {
    name: "Roads & Infrastructure",
    keywords: ["road", "pothole", "footpath", "divider", "asphalt", "crater", "manhole", "bridge", "sidewalk", "speed breaker", "repair street"],
    slaDays: 3,
  },
  {
    name: "Sanitation & Waste Management",
    keywords: ["garbage", "trash", "waste", "dump", "dustbin", "litter", "drainage", "gutter", "sewer", "stagnant", "dead animal", "sweeping", "cleaning"],
    slaDays: 2,
  },
  {
    name: "Water Supply & Drainage",
    keywords: ["water", "leak", "pipeline", "pipe", "tap", "pressure", "drinking water", "dirty water", "tanker", "burst", "no water", "contamination"],
    slaDays: 2,
  },
  {
    name: "Electricity & Power",
    keywords: ["electric", "electricity", "street light", "light", "pole", "wire", "cable", "spark", "transformer", "blackout", "power outage", "meter"],
    slaDays: 1,
  },
  {
    name: "Public Health & Safety",
    keywords: ["danger", "hazard", "open manhole", "deep crater", "collapse", "tree", "landslide", "chemical", "mosquito", "dengue", "dog bite", "stray animal"],
    slaDays: 1,
  },
];

// Multilingual translations for AI Assistant canned responses and templates
const AI_RESPONSES = {
  en: {
    greeting: "Hello! I am your Smart Grievance AI Assistant. I can help you file complaints, track your existing grievances, or answer civic questions. How can I help you today?",
    emergencyTitle: "🚨 Urgent Municipal & Emergency Helplines:",
    emergencyFootnote: "For life-threatening emergencies, please call 112 immediately.",
    draftSuccess: "I have prepared a draft complaint for you based on the details provided. Review it below and click 'Apply to Complaint Form' to submit it instantly:",
    draftTitleLabel: "Complaint Title:",
    draftCategoryLabel: "Category:",
    draftDeptLabel: "Department:",
    draftPriorityLabel: "Priority:",
    draftDescLabel: "Description:",
    trackingFound: "Here are the details for your grievance:",
    trackingNotFound: "I could not find an active grievance matching that reference. Please check your complaint ID or check your active grievances below.",
    trackingListIntro: "Here are your recent grievances registered on the portal:",
    noComplaints: "You do not have any registered grievances yet. Would you like me to help you draft and file one?",
    statusPending: "Pending Verification",
    statusReview: "Under Review by AI & Control Center",
    statusAssigned: "Assigned to Field Officer",
    statusInProgress: "Work In Progress on Ground",
    statusResolved: "Resolved - Awaiting Your Confirmation",
    statusClosed: "Closed & Archived",
    statusRejected: "Rejected (Non-Civic or Duplicate)",
    defaultCivicHelp: "You can ask me about municipal procedures like reporting potholes, waste collection timings, water pipeline leaks, street lighting repairs, RTI inquiries, or emergency contacts.",
  },
  hi: {
    greeting: "नमस्ते! मैं आपका स्मार्ट शिकायत निवारण एआई सहायक हूँ। मैं आपको शिकायत दर्ज करने, अपनी शिकायतों की स्थिति ट्रैक करने या नागरिक सेवाओं के प्रश्नों का उत्तर देने में मदद कर सकता हूँ। आज मैं आपकी क्या मदद करूँ?",
    emergencyTitle: "🚨 महत्वपूर्ण नागरिक व आपातकालीन हेल्पलाइन नंबर:",
    emergencyFootnote: "आपातकालीन स्थिति में तुरंत 112 पर कॉल करें।",
    draftSuccess: "मैंने आपके विवरण के आधार पर एक औपचारिक शिकायत का प्रारूप तैयार किया है। नीचे विवरण देखें और तुरंत जमा करने के लिए 'शिकायत फॉर्म में भरें' पर क्लिक करें:",
    draftTitleLabel: "शिकायत का शीर्षक:",
    draftCategoryLabel: "श्रेणी:",
    draftDeptLabel: "विभाग:",
    draftPriorityLabel: "प्राथमिकता:",
    draftDescLabel: "विवरण:",
    trackingFound: "आपकी शिकायत का वर्तमान विवरण यहाँ है:",
    trackingNotFound: "मुझे इस संदर्भ संख्या से संबंधित कोई शिकायत नहीं मिली। कृपया शिकायत आईडी की जाँच करें या नीचे अपनी सक्रिय शिकायतें देखें।",
    trackingListIntro: "पोर्टल पर दर्ज आपकी हालिया शिकायतें यहाँ हैं:",
    noComplaints: "आपके खाते में अभी कोई शिकायत दर्ज नहीं है। क्या आप एक नई शिकायत का प्रारूप तैयार करना चाहते हैं?",
    statusPending: "सत्यापन लंबित",
    statusReview: "एआई और नियंत्रण कक्ष द्वारा समीक्षाधीन",
    statusAssigned: "फील्ड अधिकारी को सौंपा गया",
    statusInProgress: "मौके पर कार्य प्रगति पर है",
    statusResolved: "हल हो चुकी है - आपकी पुष्टि की प्रतीक्षा है",
    statusClosed: "बंद और संग्रहीत",
    statusRejected: "अस्वीकृत (गैर-नागरिक या डुप्लिकेट)",
    defaultCivicHelp: "आप मुझसे गड्ढों की शिकायत, कचरा प्रबंधन, पानी की पाइपलाइन लीकेज, स्ट्रीट लाइट मरम्मत, आरटीआई प्रक्रिया या आपातकालीन संपर्कों के बारे में पूछ सकते हैं।",
  },
  pa: {
    greeting: "ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ! ਮੈਂ ਤੁਹਾਡਾ ਸਮਾਰਟ ਸ਼ਿਕਾਇਤ ਨਿਵਾਰਨ ਏਆਈ ਸਹਾਇਕ ਹਾਂ। ਮੈਂ ਤੁਹਾਨੂੰ ਸ਼ਿਕਾਇਤ ਦਰਜ ਕਰਨ, ਸ਼ਿਕਾਇਤ ਦਾ ਸਟੇਟਸ ਟਰੈਕ ਕਰਨ ਜਾਂ ਨਾਗਰਿਕ ਸੇਵਾਵਾਂ ਬਾਰੇ ਜਾਣਕਾਰੀ ਦੇਣ ਵਿੱਚ ਮਦਦ ਕਰ ਸਕਦਾ ਹਾਂ। ਅੱਜ ਮੈਂ ਤੁਹਾਡੀ ਕੀ ਮਦਦ ਕਰਾਂ?",
    emergencyTitle: "🚨 ਜ਼ਰੂਰੀ ਨਗਰ ਨਿਗਮ ਅਤੇ ਐਮਰਜੈਂਸੀ ਹੈਲਪਲਾਈਨ ਨੰਬਰ:",
    emergencyFootnote: "ਜਾਨਲੇਵਾ ਐਮਰਜੈਂਸੀ ਦੀ ਸਥਿਤੀ ਵਿੱਚ ਤੁਰੰਤ 112 'ਤੇ ਕਾਲ ਕਰੋ।",
    draftSuccess: "ਮੈਂ ਤੁਹਾਡੇ ਦਿੱਤੇ ਵੇਰਵਿਆਂ ਦੇ ਆਧਾਰ 'ਤੇ ਇੱਕ ਰਸਮੀ ਸ਼ਿਕਾਇਤ ਡਰਾਫਟ ਤਿਆਰ ਕੀਤੀ ਹੈ। ਹੇਠਾਂ ਵੇਰਵੇ ਦੇਖੋ ਅਤੇ ਜਮ੍ਹਾ ਕਰਨ ਲਈ 'ਫਾਰਮ ਵਿੱਚ ਭਰੋ' 'ਤੇ ਕਲਿੱਕ ਕਰੋ:",
    draftTitleLabel: "ਸ਼ਿਕਾਇਤ ਦਾ ਸਿਰਲੇਖ:",
    draftCategoryLabel: "ਸ਼੍ਰੇਣੀ:",
    draftDeptLabel: "ਵਿਭਾਗ:",
    draftPriorityLabel: "ਪਹਿਲ:",
    draftDescLabel: "ਵੇਰਵਾ:",
    trackingFound: "ਤੁਹਾਡੀ ਸ਼ਿਕਾਇਤ ਦਾ ਮੌਜੂਦਾ ਸਟੇਟਸ:",
    trackingNotFound: "ਮੈਨੂੰ ਇਸ ਆਈਡੀ ਨਾਲ ਸਬੰਧਤ ਕੋਈ ਸ਼ਿਕਾਇਤ ਨਹੀਂ ਮਿਲੀ। ਕਿਰਪਾ ਕਰਕੇ ਸ਼ਿਕਾਇਤ ਨੰਬਰ ਦੀ ਜਾਂਚ ਕਰੋ।",
    trackingListIntro: "ਪੋਰਟਲ 'ਤੇ ਦਰਜ ਤੁਹਾਡੀਆਂ ਤਾਜ਼ਾ ਸ਼ਿਕਾਇਤਾਂ:",
    noComplaints: "ਤੁਹਾਡੇ ਖਾਤੇ ਵਿੱਚ ਅਜੇ ਕੋਈ ਸ਼ਿਕਾਇਤ ਦਰਜ ਨਹੀਂ ਹੈ। ਕੀ ਤੁਸੀਂ ਇੱਕ ਨਵੀਂ ਸ਼ਿਕਾਇਤ ਡਰਾਫਟ ਕਰਨਾ ਚਾਹੁੰਦੇ ਹੋ?",
    statusPending: "ਪੁਸ਼ਟੀ ਲੰਬਿਤ",
    statusReview: "ਸਮੀਖਿਆ ਅਧੀਨ",
    statusAssigned: "ਅਧਿਕਾਰੀ ਨੂੰ ਸੌਂਪੀ ਗਈ",
    statusInProgress: "ਮੌਕੇ 'ਤੇ ਕੰਮ ਚੱਲ ਰਿਹਾ ਹੈ",
    statusResolved: "ਹੱਲ ਹੋ ਚੁੱਕੀ ਹੈ - ਤੁਹਾਡੀ ਪੁਸ਼ਟੀ ਦੀ ਉਡੀਕ",
    statusClosed: "ਬੰਦ ਅਤੇ ਆਰਕਾਈਵ",
    statusRejected: "ਰੱਦ ਕੀਤੀ ਗਈ",
    defaultCivicHelp: "ਤੁਸੀਂ ਸੜਕਾਂ ਦੇ ਖੱਡੇ, ਕੂੜੇ ਦਾ ਪ੍ਰਬੰਧਨ, ਪਾਣੀ ਦੀ ਲੀਕੇਜ, ਸਟ੍ਰੀਟ ਲਾਈਟ ਮੁਰੰਮਤ ਜਾਂ ਐਮਰਜੈਂਸੀ ਨੰਬਰਾਂ ਬਾਰੇ ਪੁੱਛ ਸਕਦੇ ਹੋ।",
  },
  bn: {
    greeting: "নমস্কার! আমি আপনার স্মার্ট অভিযোগ প্রতিকার এআই সহকারী। আমি আপনাকে অভিযোগ দায়ের করতে, অভিযোগ ট্র্যাক করতে বা নাগরিক পরিষেবা সংক্রান্ত প্রশ্নের উত্তর দিতে সাহায্য করতে পারি। আজ আমি আপনাকে কীভাবে সাহায্য করতে পারি?",
    emergencyTitle: "🚨 জরুরি পৌর ও হেল্পলাইন নম্বরসমূহ:",
    emergencyFootnote: "জরুরি প্রয়োজনে অবিলম্বে ১১২ নম্বরে কল করুন।",
    draftSuccess: "আপনার প্রদত্ত বিবরণের ভিত্তিতে আমি একটি অভিযোগের খসড়া তৈরি করেছি। নিচে পর্যালোচনা করুন এবং অবিলম্বে জমা দিতে 'অভিযোগ ফর্মে প্রয়োগ করুন' এ ক্লিক করুন:",
    draftTitleLabel: "অভিযোগের শিরোনাম:",
    draftCategoryLabel: "বিভাগ:",
    draftDeptLabel: "দপ্তর:",
    draftPriorityLabel: "অগ্রাধিকার:",
    draftDescLabel: "বিবরণ:",
    trackingFound: "আপনার অভিযোগের বর্তমান বিবরণ এখানে রয়েছে:",
    trackingNotFound: "আমি এই রেফারেন্সের কোনো অভিযোগ খুঁজে পাইনি। অনুগ্রহ করে অভিযোগ আইডি যাচাই করুন।",
    trackingListIntro: "পোর্টালে নিবন্ধিত আপনার সাম্প্রতিক অভিযোগসমূহ:",
    noComplaints: "আপনার এখনো কোনো নিবন্ধিত অভিযোগ নেই। আপনি কি একটি নতুন অভিযোগ প্রস্তুত করতে চান?",
    statusPending: "যাচাই অপেক্ষমাণ",
    statusReview: "পর্যালোচনাধীন",
    statusAssigned: "মাঠ কর্মকর্তার নিকট অর্পিত",
    statusInProgress: "কাজ চলমান রয়েছে",
    statusResolved: "সমাধান হয়েছে - আপনার নিশ্চিতকরণের অপেক্ষায়",
    statusClosed: "বন্ধ ও সংরক্ষিত",
    statusRejected: "প্রত্যাখ্যাত",
    defaultCivicHelp: "আপনি রাস্তার গর্ত, আবর্জনা অপসারণ, জলের পাইপলাইন ফুটো, রাস্তার বাতি বা জরুরি হেল্পলাইন সম্পর্কে জিজ্ঞাসা করতে পারেন।",
  },
  ta: {
    greeting: "வணக்கம்! நான் உங்கள் ஸ்மார்ட் குறைதீர்ப்பு AI உதவியாளர். புகார் பதிவு செய்யவும், புகாரின் நிலையை கண்காணிக்கவும், குடிமை வினாக்களுக்கு விடையளிக்கவும் நான் உதவ முடியும். இன்று நான் உங்களுக்கு எவ்வாறு உதவ வேண்டும்?",
    emergencyTitle: "🚨 அவசர உதவி எண்கள் & மாநகராட்சி எண்கள்:",
    emergencyFootnote: "உடனடி அவசர நிலைக்கு 112 என்ற எண்ணை அழைக்கவும்.",
    draftSuccess: "உங்கள் தகவல்களின் அடிப்படையில் நான் ஒரு புகார் வரைவை தயார் செய்துள்ளேன். கீழே சரிபார்த்துவிட்டு 'புகார் படிவத்தில் சேர்க்க' என்பதை கிளிக் செய்யவும்:",
    draftTitleLabel: "புகார் தலைப்பு:",
    draftCategoryLabel: "வகை:",
    draftDeptLabel: "துறை:",
    draftPriorityLabel: "முன்னுரிமை:",
    draftDescLabel: "விளக்கம்:",
    trackingFound: "உங்கள் புகாரின் தற்போதைய நிலை:",
    trackingNotFound: "இந்த எண்ணில் புகார் எதுவும் கிடைக்கவில்லை. தயவுசெய்து புகார் எண்ணை சரிபார்க்கவும்.",
    trackingListIntro: "போர்ட்டலில் பதிவு செய்யப்பட்ட உங்கள் சமீபத்திய புகார்கள்:",
    noComplaints: "உங்களிடம் தற்போது புகார்கள் எதுவும் இல்லை. புதிய புகார் ஒன்றை எழுத உதவட்டுமா?",
    statusPending: "சரிபார்ப்பு நிலுவையில்",
    statusReview: "ஆய்வில் உள்ளது",
    statusAssigned: "அதிகாரிக்கு ஒதுக்கப்பட்டுள்ளது",
    statusInProgress: "பணி நடைபெற்று வருகிறது",
    statusResolved: "தீர்வு காணப்பட்டது - உங்கள் உறுதிப்படுத்தல் தேவை",
    statusClosed: "முடிக்கப்பட்டு காப்பகப்படுத்தப்பட்டது",
    statusRejected: "நிராகரிக்கப்பட்டது",
    defaultCivicHelp: "சாலைக் குழிகள், குப்பை சேகரிப்பு, குடிநீர் கசிவு, தெரு விளக்கு பழுது அல்லது அவசர எண்கள் குறித்து நீங்கள் என்னிடம் கேட்கலாம்.",
  },
  te: {
    greeting: "నమస్కారం! నేను మీ స్మార్ట్ ఫిర్యాదు పరిష్కార AI సహాయకుడిని. ఫిర్యాదు నమోదు చేయడానికి, స్థితిని ట్రాక్ చేయడానికి లేదా పౌర సేవల ప్రశ్నలకు సమాధానమివ్వడానికి నేను సహాయపడతాను. నేడు మీకు ఏ విధంగా సహాయపడగలను?",
    emergencyTitle: "🚨 మునిసిపల్ & అత్యవసర హెల్ప్‌లైన్ నంబర్లు:",
    emergencyFootnote: "అత్యవసర పరిస్థితుల్లో వెంటనే 112 కు కాల్ చేయండి.",
    draftSuccess: "మీరు అందించిన వివరాల ఆధారంగా నేను ఫిర్యాదు డ్రాఫ్ట్‌ను సిద్ధం చేసాను. వివరాలను తనిఖీ చేసి 'ఫిర్యాదు ఫారమ్‌లో పూరించండి' పై క్లిక్ చేయండి:",
    draftTitleLabel: "ఫిర్యాదు శీర్షిక:",
    draftCategoryLabel: "వర్గం:",
    draftDeptLabel: "విభాగం:",
    draftPriorityLabel: "ప్రాధాన్యత:",
    draftDescLabel: "వివరణ:",
    trackingFound: "మీ ఫిర్యాదు యొక్క ప్రస్తుత వివరాలు ఇక్కడ ఉన్నాయి:",
    trackingNotFound: "ఈ ఐడీతో ఫిర్యాదు కనుగొనబడలేదు. దయచేసి ఫిర్యాదు ఐడీని సరిచూసుకోండి.",
    trackingListIntro: "పోర్టల్‌లో నమోదైన మీ తాజా ఫిర్యాదులు:",
    noComplaints: "మీ ఖాతాలో ప్రస్తుతం ఎటువంటి ఫిర్యాదులు లేవు. మీరు కొత్త ఫిర్యాదు రాయాలనుకుంటున్నారా?",
    statusPending: "ధృవీకరణ పెండింగ్‌లో ఉంది",
    statusReview: "సమీక్షలో ఉంది",
    statusAssigned: "అధికారికి కేటాయించబడింది",
    statusInProgress: "పని పురోగతిలో ఉంది",
    statusResolved: "పరిష్కరించబడింది - మీ నిర్ధారణ కోసం వేచి ఉంది",
    statusClosed: "ముగిసింది మరియు భద్రపరచబడింది",
    statusRejected: "తిరస్కరించబడింది",
    defaultCivicHelp: "మీరు రోడ్డు గుంతలు, చెత్త సేకరణ, నీటి లీకేజీ, వీధి దీపాల మరమ్మతులు లేదా అత్యవసర నంబర్ల గురించి నన్ను అడగవచ్చు.",
  },
  mr: {
    greeting: "नमस्कार! मी तुमचा स्मार्ट तक्रार निवारण एआय सहाय्यक आहे. तक्रार नोंदवणे, तक्रारीची सद्यस्थिती तपासणे किंवा नागरी प्रश्नांची उत्तरे मिळवण्यासाठी मी मदत करू शकतो. आज मी तुम्हाला कशी मदत करू?",
    emergencyTitle: "🚨 अत्यावश्यक महानगरपालिका व आपत्कालीन हेल्पलाइन:",
    emergencyFootnote: "तातडीच्या प्रसंगी त्वरित 112 वर संपर्क साधा.",
    draftSuccess: "आपण दिलेल्या माहितीनुसार मी तक्रारीचा औपचारिक मसुदा तयार केला आहे. खाली तपासा आणि तक्रार दाखल करण्यासाठी 'तक्रार फॉर्ममध्ये भरा' वर क्लिक करा:",
    draftTitleLabel: "तक्रारीचे शीर्षक:",
    draftCategoryLabel: "श्रेणी:",
    draftDeptLabel: "विभाग:",
    draftPriorityLabel: "प्राधान्य:",
    draftDescLabel: "तपशील:",
    trackingFound: "आपल्या तक्रारीची सद्यस्थिती खालीलप्रमाणे आहे:",
    trackingNotFound: "या क्रमांकाची कोणतीही तक्रार आढळली नाही. कृपया तक्रार आयडी तपासा.",
    trackingListIntro: "पोर्टलवर नोंदवलेल्या आपल्या अलीकडील तक्रारी:",
    noComplaints: "आपल्या खात्यावर अद्याप कोणतीही तक्रार नोंदवलेली नाही. नवीन तक्रार मसुदा तयार करायचा आहे का?",
    statusPending: "पडताळणी प्रलंबित",
    statusReview: "पुनरावलोकन सुरू आहे",
    statusAssigned: "अधिकाऱ्याकडे सोपवले",
    statusInProgress: "घटनास्थळी काम प्रगतीपथावर आहे",
    statusResolved: "निवारण झाले - आपल्या पुष्टीकरणाची प्रतीक्षा आहे",
    statusClosed: "बंद व संग्रहित",
    statusRejected: "नाकारले",
    defaultCivicHelp: "आपण खड्डे, कचरा व्यवस्थापन, पाणी गळती, पथदिवे दुरुस्ती किंवा आरटीआय नियमांबद्दल मला विचारू शकता.",
  },
  gu: {
    greeting: "નમસ્તે! હું તમારો સ્માર્ટ ફરિયાદ નિવારણ AI સહાયક છું. ફરિયાદ નોંધવામાં, સ્થિતિ ટ્રેક કરવામાં અથવા નાગરિક સેવાઓના પ્રશ્નોના ઉત્તર મેળવવામાં હું મદદ કરી શકું છું. આજે હું તમારી શું મદદ કરી શકું?",
    emergencyTitle: "🚨 મહત્વપૂર્ણ મ્યુનિસિપલ અને ઇમરજન્સી હેલ્પલાઇન:",
    emergencyFootnote: "કટોકટીના સંજોગોમાં તાત્કાલિક 112 પર કૉલ કરો.",
    draftSuccess: "તમારી વિગતોના આધારે મેં ફરિયાદનો એક ઔપચારિક ડ્રાફ્ટ તૈયાર કર્યો છે. વિગતો ચકાસો અને સબમિટ કરવા માટે 'ફરિયાદ ફોર્મમાં ભરો' પર ક્લિક કરો:",
    draftTitleLabel: "ફરિયાદ શીર્ષક:",
    draftCategoryLabel: "શ્રેણી:",
    draftDeptLabel: "વિભાગ:",
    draftPriorityLabel: "પ્રાથમિકતા:",
    draftDescLabel: "વર્ણન:",
    trackingFound: "તમારી ફરિયાદની વર્તમાન સ્થિતિ:",
    trackingNotFound: "આ સંદર્ભથી કોઈ ફરિયાદ મળી નથી. કૃપા કરીને ફરિયાદ આઈડી તપાસો.",
    trackingListIntro: "પોર્ટલ પર નોંધાયેલી તમારી તાજેતરની ફરિયાદો:",
    noComplaints: "તમારા ખાતામાં હાલમાં કોઈ ફરિયાદ નોંધાયેલ નથી. શું તમે નવી ફરિયાદ ડ્રાફ્ટ કરવા માંગો છો?",
    statusPending: "ચકાસણી બાકી",
    statusReview: "સમીક્ષા હેઠળ છે",
    statusAssigned: "અધિકારીને સોંપેલ છે",
    statusInProgress: "કામ પ્રગતિમાં છે",
    statusResolved: "ઉકેલાઈ ગયેલ છે - તમારી પુષ્ટિની રાહ જોવાઈ રહી છે",
    statusClosed: "બંધ અને આર્કાઇવ કરેલ",
    statusRejected: "નકારી કાઢેલ",
    defaultCivicHelp: "તમે ખાડા, કચરો, પાણીની પાઇપલાઇન લીકેજ, સ્ટ્રીટ લાઇટ અથવા ઇમરજન્સી હેલ્પલાઇન વિશે મને પૂછી શકો છો.",
  },
};

// Fallback helper for localization strings
function getLangString(lang, key) {
  const selectedLang = AI_RESPONSES[lang] || AI_RESPONSES.en;
  return selectedLang[key] || AI_RESPONSES.en[key] || "";
}

// Map status to localized readable label
function getLocalizedStatus(lang, status) {
  const s = (status || "").toLowerCase();
  const dict = AI_RESPONSES[lang] || AI_RESPONSES.en;
  if (s.includes("pending")) return dict.statusPending;
  if (s.includes("review")) return dict.statusReview;
  if (s.includes("assign")) return dict.statusAssigned;
  if (s.includes("progress")) return dict.statusInProgress;
  if (s.includes("resolve")) return dict.statusResolved;
  if (s.includes("close")) return dict.statusClosed;
  if (s.includes("reject")) return dict.statusRejected;
  return status || dict.statusPending;
}

// Detect Intent from input message
function detectIntent(message = "", explicitMode = "") {
  if (explicitMode && ["draft", "track", "faq", "emergency"].includes(explicitMode)) {
    return explicitMode;
  }

  const text = message.toLowerCase();

  // 1. Emergency intent
  if (
    /\b(emergency|police|ambulance|fire|helpline|hospital|112|100|101|108|1091)\b/i.test(text) ||
    /(आपातकाल|हेल्पलाइन|ਐਮਰਜੈਂਸੀ|জরুরি|அவசரம்|అత్యవసరం|आपत्कालीन|કટોકટી)/i.test(text)
  ) {
    return "emergency";
  }

  // 2. Tracking intent (check tracking BEFORE draft so queries like "track my complaint" aren't caught by "complaint")
  if (
    /\b(track|status|check complaint|where is my|complaint status|complaint number)\b/i.test(text) ||
    /#?grv-?[a-z0-9]+/i.test(text) ||
    /^[0-9a-f]{24}$/i.test(text.trim()) ||
    /(ट्रैक|स्थिति|ਸਟੇਟਸ|ਟਰੈਕ|ট্র্যাক|நிலை|స్థితి|तपासा|સ્થિતિ|स्टेटस)/i.test(text)
  ) {
    return "track";
  }

  // 3. Drafting / Writing complaint intent
  if (
    /\b(draft|write|create|file|register|lodge|report|complaint about|help me write)\b/i.test(text) ||
    /(शिकायत दर्ज|शिकायत लिखें|ਰਿਪੋਰਟ|ਸ਼ਿਕਾਇਤ ਦਰਜ|অভিযোগ দায়ের|புகார் பதிவு|ఫిర్యాదు నమోదు|तक्रार नोंदवा|ફરિયાદ નોંધો)/i.test(text) ||
    /\b(pothole|leakage|garbage|streetlight|power cut|dirty water|drainage|sewage)\b/i.test(text) ||
    /(गड्ढा|कचरा|बिजली|ਖੱਡਾ|કચરો|குப்பை)/i.test(text)
  ) {
    return "draft";
  }

  // 4. Civic guidance / FAQ
  return "civic_qa";
}

// Categorize issue based on keywords
function classifyCivicIssue(text = "") {
  const lower = text.toLowerCase();
  for (const dept of CIVIC_DEPARTMENTS) {
    for (const kw of dept.keywords) {
      if (lower.includes(kw)) {
        let priority = "Medium";
        if (
          lower.includes("urgent") ||
          lower.includes("danger") ||
          lower.includes("open manhole") ||
          lower.includes("sparking") ||
          lower.includes("burst") ||
          lower.includes("critical")
        ) {
          priority = "Critical";
        } else if (lower.includes("broken") || lower.includes("overflow") || lower.includes("heavy")) {
          priority = "High";
        }

        return {
          category: dept.name,
          department: dept.name,
          priority,
          slaDays: dept.slaDays,
        };
      }
    }
  }

  return {
    category: "Other Civic Issue",
    department: "Other Civic Issue",
    priority: "Medium",
    slaDays: 3,
  };
}

// Format structured complaint draft
function createDraftResponse(userMessage, lang) {
  const classification = classifyCivicIssue(userMessage);

  // Extract clean title
  let cleanTitle = userMessage.trim();
  if (cleanTitle.length > 70) {
    cleanTitle = cleanTitle.substring(0, 67) + "...";
  }
  // If starts with "draft", "report", clean it up
  cleanTitle = cleanTitle.replace(/^(please |can you )?(help me )?(draft|write|file|report|create|lodge) (a )?(complaint )?(about )?/i, "").trim();
  if (!cleanTitle) cleanTitle = `Issue regarding ${classification.category}`;
  cleanTitle = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);

  const fullDescription = userMessage.trim();
  const dict = AI_RESPONSES[lang] || AI_RESPONSES.en;

  const draft = {
    title: cleanTitle,
    category: classification.category,
    department: classification.department,
    priority: classification.priority,
    description: fullDescription,
    suggestedSlaDays: classification.slaDays,
  };

  const replyText = `${dict.draftSuccess}\n\n` +
    `• ${dict.draftTitleLabel} ${draft.title}\n` +
    `• ${dict.draftCategoryLabel} ${draft.category}\n` +
    `• ${dict.draftPriorityLabel} ${draft.priority}\n` +
    `• ${dict.draftDescLabel} ${draft.description}`;

  return {
    reply: replyText,
    intent: "draft",
    draft,
    action: {
      type: "prefill_complaint",
      label: lang === "hi" ? "शिकायत फॉर्म में भरें" :
             lang === "pa" ? "ਫਾਰਮ ਵਿੱਚ ਭਰੋ" :
             lang === "bn" ? "অভিযোগ ফর্মে প্রয়োগ করুন" :
             lang === "ta" ? "புகார் படிவத்தில் சேர்க்க" :
             lang === "te" ? "ఫిర్యాదు ఫారమ్‌లో పూరించండి" :
             lang === "mr" ? "तक्रार फॉर्ममध्ये भरा" :
             lang === "gu" ? "ફરિયાદ ફોર્મમાં ભરો" : "Apply to Complaint Form",
      payload: draft,
    },
  };
}

// Handle tracking intent
async function handleTrackingResponse(userMessage, user, lang) {
  const dict = AI_RESPONSES[lang] || AI_RESPONSES.en;

  // Extract potential complaint ID or hex
  const hexMatch = userMessage.match(/\b([0-9a-f]{24})\b/i);
  const codeMatch = userMessage.match(/#?GRV-([A-Z0-9]+)/i);

  let targetId = hexMatch ? hexMatch[1] : null;
  let targetCode = codeMatch ? codeMatch[0].toUpperCase() : null;

  let matchedComplaint = null;
  let userComplaintsList = [];

  if (getIsConnected()) {
    try {
      if (targetId) {
        matchedComplaint = await Complaint.findById(targetId)
          .populate("department", "departmentName")
          .populate("assignedOfficer", "name email");
      }
      if (!matchedComplaint && targetCode) {
        matchedComplaint = await Complaint.findOne({
          $or: [
            { complaintNumber: new RegExp(targetCode.replace("#", ""), "i") },
            { _id: targetId },
          ],
        })
          .populate("department", "departmentName")
          .populate("assignedOfficer", "name email");
      }

      if (user && user._id) {
        userComplaintsList = await Complaint.find({ citizen: user._id })
          .populate("department", "departmentName")
          .sort({ createdAt: -1 })
          .limit(5);
      }
    } catch {
      // ignore
    }
  } else {
    // In-memory fallback
    if (targetId) {
      matchedComplaint = inMemoryComplaints.find((c) => String(c._id) === targetId);
    }
    if (!matchedComplaint && targetCode) {
      matchedComplaint = inMemoryComplaints.find((c) =>
        (c.complaintNumber && c.complaintNumber.toUpperCase().includes(targetCode.replace("#", ""))) ||
        String(c._id).toUpperCase().includes(targetCode.replace("#", ""))
      );
    }
    if (user && user._id) {
      userComplaintsList = inMemoryComplaints.filter(
        (c) => String(c.citizen?._id || c.citizen) === String(user._id)
      ).slice(0, 5);
    }
  }

  // If a specific complaint was found
  if (matchedComplaint) {
    const statusText = getLocalizedStatus(lang, matchedComplaint.status);
    const code = matchedComplaint.complaintNumber || `#GRV-${String(matchedComplaint._id).slice(-5).toUpperCase()}`;
    const dept = matchedComplaint.department?.departmentName || matchedComplaint.department || matchedComplaint.category || "General";

    const reply = `${dict.trackingFound}\n\n` +
      `📌 ${code} - "${matchedComplaint.title}"\n` +
      `🚦 Status: ${statusText} (${matchedComplaint.status})\n` +
      `🏢 Department: ${dept}\n` +
      `⚡ Priority: ${matchedComplaint.priority || "Medium"}\n` +
      `📅 Filed On: ${new Date(matchedComplaint.createdAt || Date.now()).toLocaleDateString()}`;

    return {
      reply,
      intent: "track",
      complaint: {
        _id: matchedComplaint._id,
        code,
        title: matchedComplaint.title,
        status: matchedComplaint.status,
        localizedStatus: statusText,
        department: dept,
        priority: matchedComplaint.priority,
      },
      action: {
        type: "view_tracking",
        label: lang === "hi" ? "पूर्ण ट्रैकिंग देखें" : "View Full Tracking",
        url: `/citizen/track?id=${matchedComplaint._id}`,
      },
    };
  }

  // If user has complaints registered, show their list
  if (userComplaintsList.length > 0) {
    let listText = `${dict.trackingListIntro}\n\n`;
    userComplaintsList.forEach((c, idx) => {
      const code = c.complaintNumber || `#GRV-${String(c._id).slice(-5).toUpperCase()}`;
      const statusText = getLocalizedStatus(lang, c.status);
      listText += `${idx + 1}. ${code} - ${c.title} [${statusText}]\n`;
    });
    listText += `\nClick any complaint to track its full step-by-step progress.`;

    return {
      reply: listText,
      intent: "track_list",
      complaints: userComplaintsList.map((c) => ({
        _id: c._id,
        code: c.complaintNumber || `#GRV-${String(c._id).slice(-5).toUpperCase()}`,
        title: c.title,
        status: c.status,
        localizedStatus: getLocalizedStatus(lang, c.status),
      })),
      action: {
        type: "open_track_page",
        label: lang === "hi" ? "शिकायत ट्रैकर खोलें" : "Open Track Status",
        url: `/citizen/track`,
      },
    };
  }

  // Not found
  return {
    reply: dict.trackingNotFound,
    intent: "track_not_found",
    action: {
      type: "open_track_page",
      label: lang === "hi" ? "ट्रैकिंग पेज पर जाएँ" : "Go to Tracking Page",
      url: `/citizen/track`,
    },
  };
}

// Emergency contact information response
function handleEmergencyResponse(lang) {
  const dict = AI_RESPONSES[lang] || AI_RESPONSES.en;

  const helplinesText = `${dict.emergencyTitle}\n\n` +
    `🚨 National Emergency: ${EMERGENCY_HELPLINES.nationalEmergency}\n` +
    `👮 Police: ${EMERGENCY_HELPLINES.police}\n` +
    `🚒 Fire Department: ${EMERGENCY_HELPLINES.fire}\n` +
    `🚑 Ambulance: ${EMERGENCY_HELPLINES.ambulance}\n` +
    `👩 Women Helpline: ${EMERGENCY_HELPLINES.womenHelpline}\n` +
    `👶 Childline: ${EMERGENCY_HELPLINES.childHelpline}\n` +
    `🏢 Municipal Control Room: ${EMERGENCY_HELPLINES.municipalControlRoom}\n` +
    `🧹 Swachhata Helpline: ${EMERGENCY_HELPLINES.swachhBharat}\n` +
    `⚠️ Disaster Management: ${EMERGENCY_HELPLINES.disasterManagement}\n\n` +
    `${dict.emergencyFootnote}`;

  return {
    reply: helplinesText,
    intent: "emergency",
    helplines: EMERGENCY_HELPLINES,
  };
}

// Civic Q&A Knowledge Base
function handleCivicQaResponse(message, lang) {
  const dict = AI_RESPONSES[lang] || AI_RESPONSES.en;
  const lower = message.toLowerCase();

  // Pothole / Road query
  if (lower.includes("pothole") || lower.includes("road") || lower.includes("गड्ढा") || lower.includes("सड़क") || lower.includes("ਖੱਡਾ")) {
    const answers = {
      en: "Road and pothole issues are resolved by the Roads & Infrastructure Department within a target SLA of 3 working days. To file a fast-track complaint, provide a clear photo of the damaged road with a nearby landmark. Would you like me to draft this complaint for you?",
      hi: "सड़क और गड्ढों की समस्या का समाधान सड़क व अवसंरचना विभाग द्वारा 3 कार्य दिवसों के भीतर किया जाता है। त्वरित समाधान हेतु सड़क की स्पष्ट फोटो और नजदीकी लैंडमार्क दर्ज करें। क्या आप चाहते हैं कि मैं आपकी शिकायत ड्राफ्ट करूँ?",
      pa: "ਸੜਕਾਂ ਅਤੇ ਖੱਡਿਆਂ ਦੀ ਸਮੱਸਿਆ ਸੜਕ ਨਿਰਮਾਣ ਵਿਭਾਗ ਵੱਲੋਂ 3 ਦਿਨਾਂ ਦੇ ਅੰਦਰ ਹੱਲ ਕੀਤੀ ਜਾਂਦੀ ਹੈ। ਸ਼ਿਕਾਇਤ ਲਈ ਸਾਫ਼ ਫੋਟੋ ਅਤੇ ਨੇੜਲਾ ਲੈਂਡਮਾਰਕ ਦਿਓ। ਕੀ ਮੈਂ ਤੁਹਾਡੀ ਸ਼ਿਕਾਇਤ ਡਰਾਫਟ ਕਰਾਂ?",
      bn: "রাস্তা ও গর্তের সমস্যা ৩ কার্যদিবসের মধ্যে সমাধান করা হয়। দ্রুত প্রতিকারের জন্য পরিষ্কার ছবি এবং স্থানীয় ল্যান্ডমার্ক সংযুক্ত করুন। আমি কি আপনার জন্য অভিযোগের খসড়া তৈরি করব?",
      ta: "சாலை மற்றும் குழிகள் தொடர்பான புகார்கள் 3 வேலை நாட்களுக்குள் தீர்க்கப்படும். விரைவான தீர்வுக்கு தெளிவான புகைப்படத்தை இணைக்கவும். புகார் வரைவை தயார் செய்யட்டுமா?",
      te: "రోడ్లు మరియు గుంతల సమస్యలు 3 పని దినాలలో పరిష్కరించబడతాయి. వేగవంతమైన పరిష్కారం కోసం స్పష్టమైన ఫోటోను జతచేయండి. మీ కోసం ఫిర్యాదును డ్రాఫ్ట్ చేయమంటారా?",
      mr: "रस्त्यांवरील खड्ड्यांची समस्या रस्ते विभागाकडून ३ कामाच्या दिवसांत सोडवली जाते. तक्रारीसोबत स्पष्ट छायाचित्र व जवळचा पत्ता जोडा. मी तक्रार मसुदा तयार करू का?",
      gu: "ખાડા અને રસ્તાની સમસ્યા 3 કાર્યકારી દિવસોમાં ઉકેલાય છે. ઝડપી નિકાલ માટે સ્પષ્ટ ફોટો અને નજીકનું સ્થળ આપો. શું હું તમારા માટે ફરિયાદ ડ્રાફ્ટ કરું?",
    };
    return {
      reply: answers[lang] || answers.en,
      intent: "civic_qa",
      quickPrompts: ["Draft a pothole complaint", "Check road repair SLA", "Emergency contacts"],
    };
  }

  // Garbage / Waste query
  if (lower.includes("garbage") || lower.includes("trash") || lower.includes("waste") || lower.includes("कचरा") || lower.includes("ਸਫਾਈ") || lower.includes("আবর্জনা") || lower.includes("குப்பை")) {
    const answers = {
      en: "The Sanitation & Waste Management Department collects municipal solid waste daily. For overflowing community bins or uncollected garbage, complaints are resolved within 24-48 hours. Would you like to file a sanitation complaint?",
      hi: "स्वच्छता और अपशिष्ट प्रबंधन विभाग प्रतिदिन कचरा एकत्र करता है। ओवरफ्लो कचरा पात्र या सड़क पर कचरे के ढेर की शिकायतों का समाधान 24 से 48 घंटे में किया जाता है। क्या आप शिकायत दर्ज करना चाहते हैं?",
      pa: "ਸਫਾਈ ਵਿਭਾਗ ਰੋਜ਼ਾਨਾ ਕੂੜਾ ਇਕੱਠਾ ਕਰਦਾ ਹੈ। ਜੇਕਰ ਕੂੜੇ ਦਾ ਢੇਰ ਲੱਗਿਆ ਹੋਵੇ ਤਾਂ 24-48 ਘੰਟਿਆਂ ਵਿੱਚ ਹੱਲ ਕੀਤਾ ਜਾਂਦਾ ਹੈ। ਕੀ ਤੁਸੀਂ ਸ਼ਿਕਾਇਤ ਦਰਜ ਕਰਨਾ ਚਾਹੁੰਦੇ ਹੋ?",
      bn: "পৌর পরিচ্ছন্নতা দপ্তর প্রতিদিন বর্জ্য সংগ্রহ করে। আবর্জনার স্তূপ বা ওভারফ্লো ডাস্টবিনের অভিযোগ ২৪-৪৮ ঘণ্টার মধ্যে সমাধান করা হয়। আপনি কি অভিযোগ দায়ের করতে চান?",
      ta: "சுகாதாரத் துறை தினமும் குப்பைகளை சேகரிக்கிறது. நிரம்பி வழியும் குப்பைக் தொட்டிகள் பற்றிய புகார்கள் 24-48 மணி நேரத்திற்குள் தீர்க்கப்படும். நீங்கள் புகார் அளிக்க விரும்புகிறீர்களா?",
      te: "పారిశుద్ధ్య విభాగం రోజూ చెత్తను సేకరిస్తుంది. చెత్త కుప్పల సమస్యలను 24-48 గంటల్లో పరిష్కరిస్తారు. మీరు ఫిర్యాదు నమోదు చేయాలనుకుంటున్నారా?",
      mr: "घनकचरा व्यवस्थापन विभाग दररोज कचरा गोळा करतो. रस्त्यावरील कचरा किंवा कचराकुंडी भरल्याची तक्रार २४-४८ तासांत सोडवली जाते. तक्रार दाखल करायची आहे का?",
      gu: "સ્વચ્છતા વિભાગ દરરોજ કચરો એકત્ર કરે છે. કચરાના ઢગલાની ફરિયાદ 24-48 કલાકમાં ઉકેલવામાં આવે છે. શું તમે ફરિયાદ નોંધાવવા માંગો છો?",
    };
    return {
      reply: answers[lang] || answers.en,
      intent: "civic_qa",
      quickPrompts: ["Draft a garbage complaint", "Sanitation timings", "Report dead animal"],
    };
  }

  // Water pipeline / leakage
  if (lower.includes("water") || lower.includes("leak") || lower.includes("पानी") || lower.includes("ਜਲ") || lower.includes("জল") || lower.includes("தண்ணீர்") || lower.includes("నీరు")) {
    const answers = {
      en: "Water supply disruptions, pipeline bursts, or dirty drinking water are prioritized by the Water Supply & Drainage Board. Pipeline repairs typically begin within 12-24 hours. Would you like me to draft an urgent water complaint?",
      hi: "जल आपूर्ति में रुकावट, पाइपलाइन लीकेज या गंदे पानी की समस्याओं को जल बोर्ड द्वारा प्राथमिकता दी जाती है। 12-24 घंटों में मरम्मत कार्य शुरू होता है। क्या मैं तुरंत शिकायत का ड्राफ्ट बनाऊँ?",
      pa: "ਪਾਣੀ ਦੀ ਸਪਲਾਈ ਜਾਂ ਪਾਈਪਲਾਈਨ ਲੀਕੇਜ ਦੀ ਸਮੱਸਿਆ ਜਲ ਬੋਰਡ ਵੱਲੋਂ 12-24 ਘੰਟਿਆਂ ਵਿੱਚ ਸ਼ੁਰੂ ਕੀਤੀ ਜਾਂਦੀ ਹੈ। ਕੀ ਮੈਂ ਤੁਰੰਤ ਸ਼ਿਕਾਇਤ ਡਰਾਫਟ ਕਰਾਂ?",
      bn: "জল সরবরাহ ব্যাহত বা পাইপলাইন লিকেজের সমস্যা জল সরবরাহ পর্ষদ ১২-২৪ ঘণ্টার মধ্যে অগ্রাধিকার ভিত্তিতে মেরামত করে। আমি কি অভিযোগ ড্রাফট করব?",
      ta: "குடிநீர் விநியோக தடை அல்லது குழாய் கசிவு புகார்கள் 12-24 மணி நேரத்திற்குள் சரிசெய்யப்படும். அவசர நீர் புகார் ஒன்றை தயார் செய்யட்டுமா?",
      te: "నీటి సరఫరా లేదా పైప్‌లైన్ లీకేజీ సమస్యలను వాటర్ బోర్డు 12-24 గంటల్లో ప్రారంభిస్తుంది. మీరు ఫిర్యాదు రాయాలనుకుంటున్నారా?",
      mr: "पाणीपुरवठा खंडित होणे किंवा पाईपलाईन गळतीची तक्रार जल विभागाकडून १२-२४ तासांत हाती घेतली जाते. मी तक्रार मसुदा तयार करू का?",
      gu: "પાણી પુરવઠો અથવા પાઇપલાઇન લીકેજની સમસ્યા જળ બોર્ડ દ્વારા 12-24 કલાકમાં હાથ ધરવામાં આવે છે. શું હું ફરિયાદ ડ્રાફ્ટ કરું?",
    };
    return {
      reply: answers[lang] || answers.en,
      intent: "civic_qa",
      quickPrompts: ["Draft water leakage complaint", "Contaminated water report", "Tanker request helpline"],
    };
  }

  // Street light / Electricity
  if (lower.includes("light") || lower.includes("electric") || lower.includes("pole") || lower.includes("बिजली") || lower.includes("ਲਾਈਟ") || lower.includes("বিদ্যুৎ") || lower.includes("விளக்கு") || lower.includes("కరెంట్")) {
    const answers = {
      en: "Faulty street lights and sparking wires are handled by the Electricity & Power Department. Standard street light replacements take 24-48 hours. Live wire or sparking hazards receive immediate emergency intervention. Call 112 or file a Critical report.",
      hi: "खराब स्ट्रीट लाइट और बिजली के तारों की समस्या बिजली विभाग संभालता है। स्ट्रीट लाइट की मरम्मत 24-48 घंटों में होती है। यदि तार से चिंगारी निकल रही हो, तो यह आपातकालीन स्थिति है। तुरंत 112 पर सूचित करें या शिकायत दर्ज करें।",
      pa: "ਖਰਾਬ ਸਟ੍ਰੀਟ ਲਾਈਟਾਂ ਬਿਜਲੀ ਵਿਭਾਗ ਵੱਲੋਂ 24-48 ਘੰਟਿਆਂ ਵਿੱਚ ਠੀਕ ਕੀਤੀਆਂ ਜਾਂਦੀਆਂ ਹਨ। ਜੇਕਰ ਤਾਰਾਂ ਤੋਂ ਚੰਗਿਆੜੀਆਂ ਨਿਕਲ ਰਹੀਆਂ ਹੋਣ ਤਾਂ ਤੁਰੰਤ 112 'ਤੇ ਕਾਲ ਕਰੋ।",
      bn: "রাস্তার বাতি বা তারের সমস্যা বিদ্যুৎ দপ্তর ২৪-৪৮ ঘণ্টার মধ্যে সমাধান করে। স্ফুলিঙ্গ বা বিপজ্জনক তারের ক্ষেত্রে অবিলম্বে ১১২ নম্বরে যোগাযোগ করুন।",
      ta: "பழுதடைந்த தெருவிளக்குகள் 24-48 மணி நேரத்தில் சரிசெய்யப்படும். தீப்பொறி அல்லது நேரடி மின்கம்பி ஆபத்து இருந்தால் உடனடியாக 112 ஐ அழைக்கவும்.",
      te: "వీధి దీపాల సమస్యలను విద్యుత్ విభాగం 24-48 గంటల్లో పరిష్కరిస్తుంది. విద్యుత్ తీగలు తెగిపడితే వెంటనే 112 కు కాల్ చేయండి.",
      mr: "बंद पथदिवे वीज विभागामार्फत २४-४८ तासांत दुरुस्त केले जातात. उघड्या तारा किंवा स्पार्किंग असल्यास तत्काळ ११२ वर संपर्क साधा.",
      gu: "બંધ સ્ટ્રીટ લાઇટો વીજળી વિભાગ દ્વારા 24-48 કલાકમાં રિપેર થાય છે. તણખા અથવા જોખમી વાયરના કિસ્સામાં તરત 112 પર સંપર્ક કરો.",
    };
    return {
      reply: answers[lang] || answers.en,
      intent: "civic_qa",
      quickPrompts: ["Draft streetlight repair complaint", "Report sparking wire", "Electricity board contact"],
    };
  }

  // General fallback response
  return {
    reply: dict.defaultCivicHelp,
    intent: "civic_qa",
    quickPrompts: [
      lang === "hi" ? "शिकायत कैसे दर्ज करें?" : "How to file a complaint?",
      lang === "hi" ? "मेरी शिकायत ट्रैक करें" : "Track my complaint",
      lang === "hi" ? "आपातकालीन नंबर" : "Emergency Helplines",
    ],
  };
}

// ====================== Main AI Assistant Controller ======================
const handleAIAssistant = async (req, res) => {
  try {
    const {
      message = "",
      language = "en",
      mode = "", // "draft" | "track" | "faq" | "emergency" | ""
      complaintId = "",
    } = req.body || {};

    const cleanLang = ["en", "hi", "pa", "bn", "ta", "te", "mr", "gu"].includes(language) ? language : "en";
    const user = req.user || null;

    if (!message.trim() && !complaintId && !mode) {
      const dict = AI_RESPONSES[cleanLang] || AI_RESPONSES.en;
      return res.status(200).json({
        reply: dict.greeting,
        intent: "greeting",
        language: cleanLang,
        quickPrompts: [
          cleanLang === "hi" ? "सड़क के गड्ढे की शिकायत लिखें" : "Draft a pothole complaint",
          cleanLang === "hi" ? "मेरी सक्रिय शिकायतें ट्रैक करें" : "Track my active complaints",
          cleanLang === "hi" ? "पानी की लीकेज की शिकायत करें" : "Report water pipeline leak",
          cleanLang === "hi" ? "आपातकालीन नंबर दिखाएँ" : "Show emergency helplines",
        ],
      });
    }

    // Determine intent
    const query = message.trim() || complaintId;
    const intent = detectIntent(query, mode);

    let result = null;

    switch (intent) {
      case "emergency":
        result = handleEmergencyResponse(cleanLang);
        break;

      case "track":
        result = await handleTrackingResponse(query, user, cleanLang);
        break;

      case "draft":
        result = createDraftResponse(query, cleanLang);
        break;

      case "civic_qa":
      default:
        result = handleCivicQaResponse(query, cleanLang);
        break;
    }

    return res.status(200).json({
      success: true,
      language: cleanLang,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (error) {
    console.error("AI Assistant Controller error:", error);
    return res.status(500).json({
      success: false,
      message: "AI Assistant is momentarily unavailable. Please try again.",
      error: error.message,
    });
  }
};

module.exports = {
  handleAIAssistant,
  detectIntent,
  classifyCivicIssue,
  createDraftResponse,
  handleEmergencyResponse,
  handleCivicQaResponse,
  AI_RESPONSES,
  EMERGENCY_HELPLINES,
};
