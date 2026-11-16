import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  MessageSquare,
  X,
  Send,
  Compass,
  FileText,
  AlertTriangle,
  RotateCcw,
  Copy,
  Check,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  ArrowRight,
  Maximize2,
  Minimize2,
  LogIn,
  Clock,
  Building,
} from "lucide-react";
import { toast } from "sonner";
import { useLanguage } from "../context/LanguageContext";
import { useAuth } from "../context/AuthContext";
import assistantService from "../services/assistantService";
import LanguageSelector from "./LanguageSelector";
import CivicSaathiMascot from "./ai/CivicSaathiMascot";

const QUICK_PROMPTS_BY_LANG = {
  en: ["Report Pothole", "Water Leakage", "Streetlight Broken", "Track Grievance", "Emergency Numbers"],
  hi: ["सड़क का गड्ढा", "पानी की लीकेज", "स्ट्रीट लाइट खराब", "शिकायत ट्रैक करें", "आपातकालीन नंबर"],
  pa: ["ਸੜਕ ਦਾ ਟੋਆ", "ਪਾਣੀ ਦੀ ਲੀਕੇਜ", "ਸਟਰੀਟ ਲਾਈਟ ਖਰਾਬ", "ਸ਼ਿਕਾਇਤ ਟ੍ਰੈਕ ਕਰੋ", "ਐਮਰਜੈਂਸੀ ਨੰਬਰ"],
  bn: ["রাস্তার গর্ত", "জলের পাইপ ফুটো", "রাস্তার আলো নষ্ট", "অভিযোগ ট্র্যাক করুন", "জরুরি নম্বর"],
  ta: ["சாலை குழி", "குடிநீர் கசிவு", "தெரு விளக்கு பழுது", "புகாரை கண்காணிக்கவும்", "அவசர எண்கள்"],
  te: ["రోడ్డు గుంత", "నీటి లీకేజీ", "స్ట్రీట్ లైట్ సమస్య", "ఫిర్యాదు ట్రాక్ చేయండి", "అత్యవసర నంబర్లు"],
  mr: ["रस्त्यावरील खड्डा", "पाण्याची गळती", "पथदिवा बंद", "तक्रार ट्रॅक करा", "आपत्कालीन क्रमांक"],
  gu: ["રસ્તાનો ખાડો", "પાણીની પાઇપલાઇન લીક", "સ્ટ્રીટલાઇટ બંધ", "ફરિયાદ ટ્રેક કરો", "ઇમરજન્સી નંબરો"],
};

export function CivicSaathi() {
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const { user } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState("chat"); // "chat" | "draft" | "track" | "emergency"
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [speakingIndex, setSpeakingIndex] = useState(null);
  const [isListening, setIsListening] = useState(false);

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  // Initialize welcome message when language changes or first opens
  useEffect(() => {
    async function loadWelcome() {
      try {
        const welcomeData = await assistantService.chat({
          message: "",
          language,
        });

        const quicks = QUICK_PROMPTS_BY_LANG[language] || QUICK_PROMPTS_BY_LANG.en;

        setMessages([
          {
            sender: "ai",
            text: welcomeData.reply || "Namaste! I am CivicSaathi, your digital municipal guide.",
            quickPrompts: quicks,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      } catch {
        setMessages([
          {
            sender: "ai",
            text: "Namaste! I am CivicSaathi, your digital municipal guide. How may I assist you today?",
            quickPrompts: QUICK_PROMPTS_BY_LANG[language] || QUICK_PROMPTS_BY_LANG.en,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      }
    }

    if (messages.length === 0 || messages.length === 1) {
      loadWelcome();
    }
  }, [language]);

  // Scroll to bottom
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, isLoading]);

  // Speech Recognition (Web Speech API)
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;

      const localeMap = {
        en: "en-IN",
        hi: "hi-IN",
        pa: "pa-Guru-IN",
        bn: "bn-IN",
        ta: "ta-IN",
        te: "te-IN",
        mr: "mr-IN",
        gu: "gu-IN",
      };
      recognition.lang = localeMap[language] || "en-IN";

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInputValue((prev) => (prev ? `${prev} ${transcript}` : transcript));
        setIsListening(false);
      };

      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);

      recognitionRef.current = recognition;
    }
  }, [language]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      toast.error("Speech recognition is not supported in this browser.");
      return;
    }
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        toast.info("Listening... Speak your civic query.");
      } catch {
        setIsListening(false);
      }
    }
  };

  // Text to Speech
  const handleSpeak = (text, index) => {
    if (!("speechSynthesis" in window)) {
      toast.error("Speech synthesis is not supported on this device.");
      return;
    }

    if (speakingIndex === index) {
      window.speechSynthesis.cancel();
      setSpeakingIndex(null);
      return;
    }

    window.speechSynthesis.cancel();
    const cleanText = text.replace(/[*#_`]/g, "");
    const utterance = new SpeechSynthesisUtterance(cleanText);

    const voiceLangMap = {
      en: "en-IN",
      hi: "hi-IN",
      bn: "bn-IN",
      ta: "ta-IN",
      te: "te-IN",
      mr: "mr-IN",
      gu: "gu-IN",
      pa: "pa-IN",
    };
    utterance.lang = voiceLangMap[language] || "en-IN";

    utterance.onend = () => setSpeakingIndex(null);
    utterance.onerror = () => setSpeakingIndex(null);

    setSpeakingIndex(index);
    window.speechSynthesis.speak(utterance);
  };

  const handleCopy = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    toast.success(t("msg_copied", "Copied to clipboard!"));
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleSend = async (overrideText = null, mode = "") => {
    const textToSend = overrideText || inputValue;
    if (!textToSend.trim() && !mode) return;

    if (!overrideText) setInputValue("");

    const newMsg = {
      sender: "user",
      text: textToSend || (mode === "draft" ? "Draft complaint" : mode === "track" ? "Track status" : "Emergency Helplines"),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, newMsg]);
    setIsLoading(true);

    try {
      const response = await assistantService.chat({
        message: textToSend,
        language,
        mode,
      });

      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: response.reply,
          draft: response.draft,
          checklist: response.checklist || response.draft?.checklist,
          action: response.action,
          complaints: response.complaints,
          intent: response.intent,
          requiresAuth: response.requiresAuth,
          quickPrompts: response.quickPrompts,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } catch (err) {
      const status = err?.response?.status;
      const data = err?.response?.data;

      if (status === 401 || data?.requiresAuth) {
        setMessages((prev) => [
          ...prev,
          {
            sender: "ai",
            text: data?.reply || "To protect your privacy, please log in to your citizen account to view and track your private grievances.",
            requiresAuth: true,
            action: data?.action || {
              type: "redirect_login",
              label: "Log In to Track Grievance",
              url: "/login?redirect=/citizen/track",
            },
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            sender: "ai",
            text: "CivicSaathi is currently processing other inquiries. Please try asking again shortly.",
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenFormWithDraft = (draft, action) => {
    if (action?.url) {
      navigate(action.url);
      setIsOpen(false);
      return;
    }
    // Fallback: build prefill URL
    const params = new URLSearchParams({
      title: draft.title || "",
      category: draft.category || "",
      department: draft.department || "",
      priority: draft.priority || "Medium",
      description: draft.description || "",
    });
    navigate(`/citizen/raise?${params.toString()}`);
    setIsOpen(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating Launcher: Compact & Sleek AI Assistant with 3D Robot Mascot */}
      {!isOpen && (
        <aside aria-label="CivicSaathi AI Assistant" className="fixed bottom-6 right-6 z-[9999] flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="group relative flex items-center gap-2.5 rounded-full bg-[#0E1B38] pl-2 pr-4 py-1.5 text-white shadow-xl shadow-slate-900/30 transition-all duration-300 hover:scale-105 hover:bg-[#162544] hover:shadow-2xl focus:outline-hidden focus:ring-4 focus:ring-[#2563EB]/40 border border-white/10 cursor-pointer"
            aria-label="Open CivicSaathi AI Assistant"
          >
            {/* 3D Robot Mascot with Electric-Blue Status Beacon */}
            <CivicSaathiMascot size="md" state="idle" showBeacon={true} />

            <div className="flex flex-col text-left leading-none">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold tracking-tight text-white">
                  CivicSaathi
                </span>
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#38BDF8] shadow-[0_0_6px_#38BDF8]"></span>
              </div>
              <span className="text-[10px] text-slate-300 font-medium mt-0.5">
                AI Assistant
              </span>
            </div>
          </button>
        </aside>
      )}

      {/* Main CivicSaathi Dialog Window */}
      {isOpen && (
        <>
          {/* Backdrop when maximized to focus the user and prevent sidebar/header interference */}
          {isExpanded && (
            <div
              className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-xs transition-opacity duration-300"
              onClick={() => setIsExpanded(false)}
              aria-hidden="true"
            />
          )}
          <section
            aria-label="CivicSaathi AI Civic Assistant"
            className={`fixed z-[9999] flex flex-col rounded-3xl border border-slate-200 bg-white shadow-2xl backdrop-blur-xl transition-all duration-300 ${
              isExpanded
                ? "inset-2 sm:inset-6 md:inset-10 lg:inset-12"
                : "bottom-4 right-4 h-[630px] w-[95vw] max-w-[440px] sm:bottom-6 sm:right-6"
            }`}
          >
          {/* Brand Header: Deep Midnight Navy (#0E1B38) with Subtle Accents (border-white/10) */}
          <header className="flex items-center justify-between border-b border-white/10 bg-[#0E1B38] px-5 py-3.5 text-white rounded-t-3xl">
            <div className="flex items-center gap-3">
              <CivicSaathiMascot
                size="md"
                state={isLoading ? "thinking" : speakingIndex !== null ? "active" : "idle"}
                showBeacon={false}
              />
              <div>
                <h3 className="text-sm font-bold tracking-tight text-white flex items-center gap-2">
                  CivicSaathi
                  <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-[10px] font-semibold text-blue-200 border border-blue-400/30">
                    Municipal AI
                  </span>
                </h3>
                <p className="text-[11px] text-slate-300">
                  Your Smart Guide to a Better City
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {/* Language Switcher inside CivicSaathi */}
              <LanguageSelector variant="dark" isCompact={true} />

              <button
                type="button"
                onClick={() => setIsExpanded((prev) => !prev)}
                className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
                title={isExpanded ? "Minimize" : "Maximize"}
              >
                {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
                title="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </header>

          {/* Quick Category Navigation Pills */}
          <nav aria-label="Civic Modes" className="flex border-b border-slate-200 bg-slate-50/90 p-2 gap-1.5 overflow-x-auto">
            <button
              type="button"
              onClick={() => setActiveTab("chat")}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap ${
                activeTab === "chat"
                  ? "bg-white text-[#2563EB] shadow-xs ring-1 ring-slate-200"
                  : "text-slate-600 hover:bg-white/60"
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              {t("nav_chat", "Chat & Guide")}
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("draft");
                handleSend(null, "draft");
              }}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap ${
                activeTab === "draft"
                  ? "bg-white text-[#2563EB] shadow-xs ring-1 ring-slate-200"
                  : "text-slate-600 hover:bg-white/60"
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              {t("nav_draft", "Draft Grievance")}
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("track");
                handleSend("What is the status of my complaints?", "track");
              }}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap ${
                activeTab === "track"
                  ? "bg-white text-[#2563EB] shadow-xs ring-1 ring-slate-200"
                  : "text-slate-600 hover:bg-white/60"
              }`}
            >
              <Compass className="h-3.5 w-3.5" />
              {t("nav_track", "Track Grievances")}
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab("emergency");
                handleSend(null, "emergency");
              }}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all whitespace-nowrap ${
                activeTab === "emergency"
                  ? "bg-rose-50 text-rose-600 shadow-xs ring-1 ring-rose-200"
                  : "text-slate-600 hover:bg-white/60"
              }`}
            >
              <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
              112 {t("priority_emergency", "Emergency")}
            </button>
          </nav>

          {/* Messages Scroll Area: Crisp Pure White (#FFFFFF) & Slate-50 (#F8FAFC) */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#F8FAFC] text-xs">
            {messages.map((msg, index) => {
              const isAi = msg.sender === "ai";
              return (
                <div
                  key={index}
                  className={`flex flex-col ${isAi ? "items-start" : "items-end"} gap-1`}
                >
                  <div className="flex items-end gap-2 max-w-[90%]">
                    {isAi && (
                      <CivicSaathiMascot
                        size="sm"
                        state={speakingIndex === index ? "active" : "idle"}
                        className="mb-0.5"
                      />
                    )}

                    <div
                      className={`rounded-2xl px-4 py-3 leading-relaxed shadow-2xs ${
                        isAi
                          ? "bg-white border border-slate-200 text-slate-800"
                          : "bg-[#0E1B38] text-white font-medium"
                      }`}
                    >
                      <p className="whitespace-pre-line select-text">{msg.text}</p>

                      {/* Interactive Draft Card: Soft Blue background (bg-blue-50/60), Royal Blue badge, Midnight Navy button */}
                      {msg.draft && (
                        <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50/60 p-3.5 text-slate-800 shadow-xs">
                          <div className="flex items-center justify-between border-b border-blue-200/60 pb-2 mb-2.5">
                            <span className="text-[11px] font-bold text-[#2563EB] flex items-center gap-1.5">
                              <FileText className="h-3.5 w-3.5" />
                              Structured Municipal Draft
                            </span>
                            <span className="rounded-full bg-[#2563EB] px-2.5 py-0.5 text-[10px] font-bold text-white">
                              {msg.draft.priority} Priority
                            </span>
                          </div>

                          <div className="space-y-1.5 text-[11px]">
                            <p><strong>Title:</strong> {msg.draft.title}</p>
                            <p><strong>Department:</strong> {msg.draft.department}</p>
                            <p><strong>Target SLA:</strong> {msg.draft.sla}</p>
                          </div>

                          {/* 3 Checklist Items */}
                          {msg.checklist && msg.checklist.length > 0 && (
                            <div className="mt-3 rounded-lg bg-white/80 p-2.5 border border-blue-100">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                                Recommended Verification Checklist:
                              </p>
                              <ul className="space-y-1">
                                {msg.checklist.map((item, cIdx) => (
                                  <li key={cIdx} className="flex items-start gap-1.5 text-[10px] text-slate-700">
                                    <Check className="h-3 w-3 text-[#2563EB] mt-0.5 shrink-0" />
                                    <span>{item}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Form Action: "Open in Grievance Form" navigating to /citizen/raise with pre-filled state */}
                          <div className="mt-3 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleOpenFormWithDraft(msg.draft, msg.action)}
                              className="flex items-center gap-1.5 rounded-lg bg-[#0E1B38] px-3.5 py-2 text-[11px] font-bold text-white shadow-xs hover:bg-[#162544] transition-colors"
                            >
                              <ArrowRight className="h-3 w-3 text-blue-300" />
                              Open in Grievance Form
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCopy(msg.text, index)}
                              className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                            >
                              {copiedIndex === index ? <Check className="h-3 w-3 text-[#2563EB]" /> : <Copy className="h-3 w-3" />}
                              Copy
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Unauthenticated Security Safeguard: 401 Login Prompt */}
                      {msg.requiresAuth && (
                        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-amber-900">
                          <p className="text-[11px] font-semibold flex items-center gap-1.5">
                            <ShieldCheck className="h-4 w-4 text-amber-600 shrink-0" />
                            Privacy Verification Required
                          </p>
                          <p className="text-[10px] text-amber-800 mt-1">
                            Your grievance history is protected. Please log in to view active tracking.
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              navigate("/login?redirect=/citizen/track");
                              setIsOpen(false);
                            }}
                            className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-[#0E1B38] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#162544] transition-colors"
                          >
                            <LogIn className="h-3.5 w-3.5 text-blue-300" />
                            {msg.action?.label || "Log In to Track Grievance"}
                          </button>
                        </div>
                      )}

                      {/* Authenticated Real-Time Complaint Tracking Telemetry Cards */}
                      {msg.complaints && msg.complaints.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {msg.complaints.map((c, cIdx) => (
                            <div key={cIdx} className="rounded-xl border border-blue-100 bg-white p-3 text-slate-800 shadow-2xs">
                              <div className="flex items-center justify-between border-b border-slate-100 pb-1.5 mb-1.5">
                                <span className="font-mono text-[11px] font-bold text-[#2563EB]">
                                  {c.code}
                                </span>
                                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">
                                  {c.status}
                                </span>
                              </div>
                              <p className="font-semibold text-slate-900">{c.title}</p>
                              <div className="mt-1 flex items-center justify-between text-[10px] text-slate-600">
                                <span>🏢 {c.department}</span>
                                <span>{c.assignedOfficer ? `Officer: ${c.assignedOfficer}` : "Unassigned"}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  navigate(`/citizen/track?id=${c.code}`);
                                  setIsOpen(false);
                                }}
                                className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-[#2563EB] hover:text-blue-800 transition-colors"
                              >
                                View Tracking Details <ChevronRight className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Quick Prompt Suggestions */}
                      {msg.quickPrompts && msg.quickPrompts.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap gap-1.5">
                          {msg.quickPrompts.map((prompt, pIdx) => (
                            <button
                              key={pIdx}
                              type="button"
                              onClick={() => handleSend(prompt)}
                              className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-medium text-slate-700 hover:bg-blue-50 hover:border-blue-300 hover:text-[#2563EB] transition-all text-left"
                            >
                              {prompt}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Message Action Toolbar (Timestamp, Voice Speak, Copy) */}
                  {isAi && (
                    <div className="flex items-center gap-2 pl-8 text-[10px] text-slate-600">
                      <span>{msg.timestamp}</span>
                      <button
                        type="button"
                        onClick={() => handleSpeak(msg.text, index)}
                        className="hover:text-slate-800 transition-colors inline-flex items-center gap-1"
                        title={speakingIndex === index ? "Stop voice" : "Listen in your language"}
                      >
                        {speakingIndex === index ? (
                          <VolumeX className="h-3 w-3 text-rose-500 animate-pulse" />
                        ) : (
                          <Volume2 className="h-3 w-3" />
                        )}
                        <span>{speakingIndex === index ? "Stop" : "Listen"}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopy(msg.text, index)}
                        className="hover:text-slate-800 transition-colors inline-flex items-center gap-1"
                        title="Copy text"
                      >
                        {copiedIndex === index ? (
                          <Check className="h-3 w-3 text-[#2563EB]" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                        <span>{copiedIndex === index ? "Copied" : "Copy"}</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-center gap-2.5 text-slate-600 text-xs pl-1">
                <CivicSaathiMascot size="sm" state="thinking" />
                <div className="flex items-center gap-1.5 rounded-2xl bg-white border border-slate-200 px-3.5 py-2 shadow-2xs">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#2563EB] animate-bounce"></span>
                  <span className="h-1.5 w-1.5 rounded-full bg-[#2563EB] animate-bounce [animation-delay:0.2s]"></span>
                  <span className="h-1.5 w-1.5 rounded-full bg-[#2563EB] animate-bounce [animation-delay:0.4s]"></span>
                  <span className="text-[11px] font-medium text-slate-700 ml-1">
                    CivicSaathi is consulting municipal guidelines...
                  </span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Footer Input Controls */}
          <footer className="border-t border-slate-200 bg-white p-3 rounded-b-3xl">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleListening}
                className={`rounded-xl p-2.5 transition-colors ${
                  isListening
                    ? "bg-rose-100 text-rose-600 animate-pulse"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-800"
                }`}
                title={isListening ? "Stop listening" : "Speak your query"}
              >
                {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>

              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  language === "hi"
                    ? "नागरिक समस्या यहाँ लिखें या बोलें..."
                    : "Ask CivicSaathi or describe your civic issue..."
                }
                className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-600 focus:border-[#2563EB] focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-[#2563EB]/20 transition-all"
              />

              <button
                type="button"
                onClick={() => handleSend()}
                disabled={isLoading || !inputValue.trim()}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#0E1B38] text-white shadow-md shadow-slate-900/25 hover:bg-[#162544] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                title="Send"
              >
                <Send className="h-4 w-4 text-blue-300" />
              </button>
            </div>
          </footer>
        </section>
        </>
      )}
    </>
  );
}

export default CivicSaathi;
