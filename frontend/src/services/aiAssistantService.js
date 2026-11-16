import api from "../utils/api";
import { assistantService } from "./assistantService";

export const aiAssistantService = {
  ...assistantService,

  async sendMessage(payload = {}) {
    try {
      const res = await api.post("/assistant/chat", payload);
      return res.data;
    } catch {
      const res = await api.post("/ai/assistant", payload);
      return res.data;
    }
  },
};

export default aiAssistantService;
