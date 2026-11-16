import React, { useState } from "react";
import { Languages, RotateCcw, Check, Sparkles, MessageSquare, AlertCircle, FileText } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import assistantService from "../services/assistantService";
import { toast } from "sonner";

const LANGUAGE_LABELS = {
  en: { name: "English", native: "English" },
  hi: { name: "Hindi", native: "हिन्दी" },
  pa: { name: "Punjabi", native: "ਪੰਜਾਬੀ" },
  bn: { name: "Bengali", native: "বাংলা" },
  ta: { name: "Tamil", native: "தமிழ்" },
  te: { name: "Telugu", native: "తెలుగు" },
  mr: { name: "Marathi", native: "मराठी" },
  gu: { name: "Gujarati", native: "ગુજરાતી" },
};

export function ComplaintTranslationCard({ complaint, onUpdate, isOfficer = false }) {
  const { language, t } = useLanguage();
  const [viewMode, setViewMode] = useState("translated"); // "translated" | "original"
  const [isRetrying, setIsRetrying] = useState(false);
  const [activeComplaint, setActiveComplaint] = useState(complaint);

  if (!complaint) return null;

  const current = activeComplaint || complaint;
  const originalLang = current.originalLanguage || "en";
  const citizenLang = current.citizenPreferredLanguage || originalLang || "en";
  const isNonEnglish = originalLang !== "en";

  const originalInfo = LANGUAGE_LABELS[originalLang] || { name: originalLang.toUpperCase(), native: originalLang };
  const citizenLangInfo = LANGUAGE_LABELS[citizenLang] || { name: citizenLang.toUpperCase(), native: citizenLang };

  const hasTranslation = Boolean(current.translatedTitle && current.translatedDescription);
  const isFailed = current.translationStatus === "failed";

  // Active displayed title and description
  const displayTitle =
    viewMode === "original" || !hasTranslation
      ? current.title
      : current.translatedTitle || current.title;

  const displayDescription =
    viewMode === "original" || !hasTranslation
      ? current.description
      : current.translatedDescription || current.description;

  // Retrieve officer remark translations
  let translatedRemarks = null;
  if (current.remarksTranslations) {
    if (typeof current.remarksTranslations.get === "function") {
      translatedRemarks = current.remarksTranslations.get(citizenLang);
    } else if (typeof current.remarksTranslations === "object") {
      translatedRemarks = current.remarksTranslations[citizenLang];
    }
  }

  const handleRetryTranslation = async () => {
    setIsRetrying(true);
    try {
      const res = await assistantService.translateComplaint(current._id || current.id, "en");
      if (res.success && res.complaint) {
        setActiveComplaint(res.complaint);
        toast.success(t("msg_translation_success", "Complaint translated successfully"));
        if (onUpdate) onUpdate(res.complaint);
      } else {
        toast.error(t("msg_translation_retry_fail", "Could not complete translation"));
      }
    } catch (err) {
      console.error("Retry translation error:", err);
      toast.error(t("msg_translation_retry_fail", "Could not complete translation"));
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
      {/* Header with Dual-View Toggle and Language Badge */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
            <Languages className="h-4 w-4" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-slate-900">
                {t("title_multilingual_record", "Multilingual Complaint Record")}
              </h4>
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700 border border-slate-200">
                {t("label_original", "Original")}: {originalInfo.native} ({originalInfo.name})
              </span>
            </div>
            <p className="text-[11px] text-slate-600">
              {isNonEnglish
                ? t("subtitle_dual_view_available", "Dual-view enabled: Switch between English translation and citizen's verbatim text")
                : t("subtitle_original_english", "Submitted originally in English")}
            </p>
          </div>
        </div>

        {/* Dual View Toggle Switch */}
        {isNonEnglish && (
          <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode("translated")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                viewMode === "translated"
                  ? "bg-[#0E1B38] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {t("btn_view_english", "English Translation")}
            </button>
            <button
              type="button"
              onClick={() => setViewMode("original")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                viewMode === "original"
                  ? "bg-[#0E1B38] text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {t("btn_view_original", `Original (${originalInfo.native})`)}
            </button>
          </div>
        )}
      </div>

      {/* Translation Failure Notice / Retry Banner */}
      {isFailed && !hasTranslation && (
        <div className="mt-3 flex items-center justify-between rounded-xl bg-amber-50 p-3 text-amber-800 border border-amber-200">
          <div className="flex items-center gap-2 text-xs">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
            <span>{t("msg_translation_failed_hint", "Automated translation was delayed or failed. You are viewing verbatim text.")}</span>
          </div>
          <button
            type="button"
            onClick={handleRetryTranslation}
            disabled={isRetrying}
            className="flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1 text-xs font-bold text-white hover:bg-amber-700 disabled:opacity-50 transition-colors"
          >
            <RotateCcw className={`h-3.5 w-3.5 ${isRetrying ? "animate-spin" : ""}`} />
            {isRetrying ? t("btn_retrying", "Retrying...") : t("btn_retry_translation", "Retry Translation")}
          </button>
        </div>
      )}

      {/* Grievance Content Display */}
      <div className="mt-4 space-y-3">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
            {viewMode === "translated" && isNonEnglish ? t("label_translated_title", "Translated Title (EN)") : t("label_title", "Title")}
          </span>
          <h3 className="mt-0.5 text-base font-bold text-slate-900">{displayTitle}</h3>
        </div>

        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
            {viewMode === "translated" && isNonEnglish ? t("label_translated_description", "Translated Description (EN)") : t("label_description", "Description")}
          </span>
          <div className="mt-1 rounded-xl bg-slate-50 p-3.5 text-xs leading-relaxed text-slate-800 border border-slate-200 whitespace-pre-wrap select-text">
            {displayDescription}
          </div>
        </div>
      </div>

      {/* Officer Remarks & Automated Translation */}
      {current.remarks && (
        <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50/40 p-4">
          <div className="flex items-center justify-between border-b border-blue-100 pb-2">
            <span className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
              <MessageSquare className="h-4 w-4 text-[#2563EB]" />
              {t("label_officer_remarks", "Officer Resolution Remarks")}
            </span>
            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[10px] font-bold text-blue-800">
              {t("badge_official_note", "Official Dispatch")}
            </span>
          </div>

          {/* Primary remarks (English / administrative) */}
          <div className="mt-2.5 text-xs leading-relaxed text-slate-800">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">
              {t("label_original_officer_remark", "Original Remarks (English):")}
            </span>
            <p className="mt-0.5 font-medium">{current.remarks}</p>
          </div>

          {/* Citizen language translation of remarks if citizen prefers Indic language */}
          {citizenLang !== "en" && (
            <div className="mt-3 rounded-lg bg-white p-3 border border-blue-100">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#2563EB]">
                {t("label_citizen_translation", `Citizen Translation (${citizenLangInfo.native}):`)}
              </span>
              <p className="mt-0.5 text-xs text-slate-900 font-medium">
                {translatedRemarks || current.remarks}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ComplaintTranslationCard;
