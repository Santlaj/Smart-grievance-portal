const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  detectIntent,
  classifyCivicIssue,
  createDraftResponse,
  handleEmergencyResponse,
  handleCivicQaResponse,
  AI_RESPONSES,
  EMERGENCY_HELPLINES,
} = require("../controllers/aiAssistantController");

test("detects emergency intent across languages and keywords", () => {
  assert.equal(detectIntent("Police helpline"), "emergency");
  assert.equal(detectIntent("Need ambulance right now"), "emergency");
  assert.equal(detectIntent("आपातकालीन नंबर चाहिए"), "emergency");
  assert.equal(detectIntent("112 emergency"), "emergency");
});

test("detects tracking intent from ID format and keywords", () => {
  assert.equal(detectIntent("track complaint #GRV-1234"), "track");
  assert.equal(detectIntent("507f1f77bcf86cd799439011"), "track");
  assert.equal(detectIntent("check status of my grievance"), "track");
  assert.equal(detectIntent("मेरी शिकायत का स्टेटस क्या है?"), "track");
});

test("detects drafting intent and classifies category properly", () => {
  assert.equal(detectIntent("Draft a complaint about pothole in front of my house"), "draft");
  const classification = classifyCivicIssue("Major pothole in front of my house on MG road");
  assert.equal(classification.category, "Roads & Infrastructure");
});

test("drafts complaint with structured output and localized action label", () => {
  const resultHi = createDraftResponse("Water pipeline is broken and leaking near metro station", "hi");
  assert.equal(resultHi.intent, "draft");
  assert.ok(resultHi.draft.title);
  assert.equal(resultHi.draft.category, "Water Supply & Drainage");
  assert.equal(resultHi.action.label, "शिकायत फॉर्म में भरें");
});

test("returns all 8 languages in responses dictionary", () => {
  const languages = ["en", "hi", "pa", "bn", "ta", "te", "mr", "gu"];
  for (const lang of languages) {
    assert.ok(AI_RESPONSES[lang], `Language ${lang} must exist in AI_RESPONSES`);
    assert.ok(AI_RESPONSES[lang].greeting, `Greeting for ${lang} must be defined`);
    assert.ok(AI_RESPONSES[lang].draftSuccess, `Draft success for ${lang} must be defined`);
  }
});

test("provides emergency response with official contact numbers", () => {
  const emergency = handleEmergencyResponse("en");
  assert.equal(emergency.intent, "emergency");
  assert.ok(emergency.reply.includes("112"));
  assert.ok(emergency.reply.includes("101"));
  assert.ok(emergency.reply.includes("108"));
});
