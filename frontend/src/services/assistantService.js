import api from "../utils/api";

export const assistantService = {
  /**
   * Conversational endpoint with CivicSaathi
   * @param {Object} payload - { message, language, mode }
   */
  async chat(message, language = "en", mode = "") {
    const payload = typeof message === "object" ? message : { message, language, mode };
    const res = await api.post("/assistant/chat", payload);
    return res.data;
  },

  /**
   * Helper alias for sendMessage
   */
  async sendMessage(payload = {}) {
    const res = await api.post("/assistant/chat", payload);
    return res.data;
  },

  /**
   * Request structured complaint draft
   */
  async draftComplaint(issueDescription, language = "en") {
    const res = await api.post("/assistant/chat", {
      message: issueDescription,
      mode: "draft",
      language,
    });
    return res.data;
  },

  /**
   * Query tracking telemetry
   */
  async trackGrievance(complaintIdOrQuery = "track complaints", language = "en") {
    const res = await api.post("/assistant/chat", {
      message: complaintIdOrQuery,
      mode: "track",
      language,
    });
    return res.data;
  },

  /**
   * Get emergency municipal helplines
   */
  async getEmergencyHelplines(language = "en") {
    const res = await api.post("/assistant/chat", {
      mode: "emergency",
      language,
    });
    return res.data;
  },

  /**
   * On-demand general text translation
   */
  async translate(text, targetLanguage = "en", sourceLanguage = "") {
    const res = await api.post("/translate", {
      text,
      targetLanguage,
      sourceLanguage,
    });
    return res.data;
  },

  /**
   * Batch on-demand text translation
   */
  async translateBatch(texts = [], targetLanguage = "en", sourceLanguage = "") {
    if (!Array.isArray(texts) || texts.length === 0) {
      return { success: true, translations: {} };
    }
    const res = await api.post("/translate", {
      texts,
      targetLanguage,
      sourceLanguage,
    });
    return res.data;
  },

  /**
   * On-demand complaint record translation or retry
   */
  async translateComplaint(complaintId, targetLanguage = "en") {
    const res = await api.post(`/complaints/${complaintId}/translate`, {
      targetLanguage,
    });
    return res.data;
  },
};

export default assistantService;
