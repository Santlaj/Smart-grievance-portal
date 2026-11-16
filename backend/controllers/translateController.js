const Complaint = require("../models/Complaint");
const { getIsConnected } = require("../config/db");
const { inMemoryComplaints } = require("./complaintController");
const {
  translateText,
  translateComplaint,
  detectLanguage,
  SUPPORTED_LANGUAGES,
} = require("../utils/translationService");

/**
 * General on-demand text translation endpoint
 * POST /api/translate
 * Body: { text: string, targetLanguage?: string, sourceLanguage?: string }
 */
const handleTranslateText = async (req, res) => {
  try {
    const { text, texts, targetLanguage = "en", targetLang, sourceLanguage, sourceLang } = req.body || {};
    const target = targetLanguage || targetLang || "en";
    const source = sourceLanguage || sourceLang || undefined;

    // Batch translation support
    if (Array.isArray(texts)) {
      const results = await Promise.all(
        texts.map(async (str) => {
          if (!str || typeof str !== "string") return { original: str, translated: str };
          const trimmed = str.trim();
          if (!trimmed) return { original: str, translated: str };
          const detected = source || detectLanguage(trimmed);
          const translated = await translateText(trimmed, target, detected);
          return { original: trimmed, translated: translated || trimmed };
        })
      );

      const translationsMap = {};
      results.forEach((r) => {
        translationsMap[r.original] = r.translated;
      });

      return res.status(200).json({
        success: true,
        targetLanguage: target,
        translations: translationsMap,
        count: results.length,
      });
    }

    if (!text || typeof text !== "string") {
      return res.status(400).json({
        success: false,
        message: "Text field or texts array is required for translation.",
      });
    }

    const detected = source || detectLanguage(text);
    const translatedText = await translateText(text, target, detected);

    return res.status(200).json({
      success: true,
      originalText: text,
      translatedText,
      sourceLanguage: detected,
      targetLanguage: target,
    });
  } catch (error) {
    console.error("Translate text error:", error);
    return res.status(500).json({
      success: false,
      message: "Translation service encountered an error.",
      error: error.message,
    });
  }
};

/**
 * On-demand translation / retry for a specific complaint record
 * POST /api/complaints/:id/translate
 * Body: { targetLanguage?: string }
 */
const handleTranslateComplaint = async (req, res) => {
  try {
    const { id } = req.params;
    const { targetLanguage = "en", targetLang } = req.body || {};
    const target = targetLanguage || targetLang || "en";

    let complaint = null;
    if (getIsConnected()) {
      complaint = await Complaint.findById(id);
    } else {
      complaint = inMemoryComplaints.find((c) => String(c._id) === String(id));
    }

    if (!complaint) {
      return res.status(404).json({ success: false, message: "Complaint not found" });
    }

    // Citizen owner check or officer/admin role
    if (
      req.user &&
      req.user.role === "client" &&
      String(complaint.citizen?._id || complaint.citizen) !== String(req.user._id)
    ) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const result = await translateComplaint(complaint, target);

    if (getIsConnected()) {
      complaint.translatedTitle = result.translatedTitle;
      complaint.translatedDescription = result.translatedDescription;
      complaint.translationStatus = "translated";

      if (!complaint.translations) {
        complaint.translations = new Map();
      }
      complaint.translations.set(target, {
        title: result.translatedTitle,
        description: result.translatedDescription,
      });

      await complaint.save();
    } else {
      complaint.translatedTitle = result.translatedTitle;
      complaint.translatedDescription = result.translatedDescription;
      complaint.translationStatus = "translated";
      complaint.translations = complaint.translations || {};
      complaint.translations[target] = {
        title: result.translatedTitle,
        description: result.translatedDescription,
      };
    }

    return res.status(200).json({
      success: true,
      complaint,
      translatedTitle: result.translatedTitle,
      translatedDescription: result.translatedDescription,
      language: target,
      status: "translated",
    });
  } catch (error) {
    console.error("Complaint translation error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to translate complaint record.",
      error: error.message,
    });
  }
};

module.exports = {
  handleTranslateText,
  handleTranslateComplaint,
};
