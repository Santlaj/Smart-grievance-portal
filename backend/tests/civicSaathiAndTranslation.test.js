const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  detectAssistantIntent,
  classifyIssue,
  generateStructuredDraft,
  handleTrackingTelemetry,
  SAATHI_RESPONSES,
  CHECKLIST_ITEMS,
  DEPARTMENT_TAXONOMY,
} = require("../controllers/assistantController");
const {
  SUPPORTED_LANGUAGES,
  detectLanguage,
  translateText,
  translateComplaint,
} = require("../utils/translationService");

test("Intent & Category Classification for Municipal Services", () => {
  const road = classifyIssue("There is a severe pothole crater on MG Road");
  assert.equal(road.category, "Roads & Infrastructure");
  assert.equal(road.department, "Roads Department");

  const water = classifyIssue("Water pipeline burst causing dirty water flooding");
  assert.equal(water.category, "Water Supply & Drainage");
  assert.equal(water.department, "Water Supply Department");

  const waste = classifyIssue("Overflowing garbage dump and dead animal near market");
  assert.equal(waste.category, "Sanitation & Waste Management");
  assert.equal(waste.department, "Sanitation Department");

  const electric = classifyIssue("Street light pole sparking and dangling live wire");
  assert.equal(electric.category, "Electricity & Power");
  assert.equal(electric.department, "Electricity Department");

  const safety = classifyIssue("Dangerous open manhole unbarricaded near primary school");
  assert.equal(safety.category, "Public Safety");
  assert.equal(safety.department, "Public Safety Department");
});

test("Script Detection across all 8 supported Indian languages", () => {
  assert.equal(detectLanguage("Pothole on main road"), "en");
  assert.equal(detectLanguage("सड़क पर बड़ा गड्ढा है"), "hi");
  assert.equal(detectLanguage("ਸੜਕ ਤੇ ਵੱਡਾ ਟੋਆ ਹੈ"), "pa");
  assert.equal(detectLanguage("রাস্তায় বড় গর্ত আছে"), "bn");
  assert.equal(detectLanguage("சாலையில் பெரிய குழி உள்ளது"), "ta");
  assert.equal(detectLanguage("రోడ్డుపై పెద్ద గుంత ఉంది"), "te");
  assert.equal(detectLanguage("रस्त्यावर मोठा खड्डा आहे"), "mr");
  assert.equal(detectLanguage("રસ્તા પર મોટો ખાડો છે"), "gu");
});

test("Smart Complaint Drafting generates structured draft with 3-item checklist and action prefill", () => {
  const draftRes = generateStructuredDraft("There is a big hole on the road outside my house and it is dangerous", "en");
  assert.equal(draftRes.intent, "draft");
  assert.equal(draftRes.draft.title, "Pothole and Damaged Road Surface Repair");
  assert.equal(draftRes.draft.department, "Roads Department");
  assert.equal(draftRes.draft.priority, "High");
  assert.equal(draftRes.draft.checklist.length, 3);
  assert.ok(draftRes.action);
  assert.equal(draftRes.action.type, "open_form");
  assert.ok(draftRes.action.url.startsWith("/citizen/raise"));
});

test("Live grievance tracking security boundary prompts guest to login (401)", async () => {
  const result = await handleTrackingTelemetry("track status of my complaint", null, "en");
  assert.equal(result.status, 401);
  assert.equal(result.authenticated, false);
  assert.equal(result.intent, "auth_required");
  assert.ok(result.reply);
  assert.ok(result.action.url.includes("/login"));
});

test("Non-destructive translation preserves original content", async () => {
  const original = {
    title: "सड़क पर बड़ा गड्ढा है",
    description: "गाड़ियों को निकलने में बहुत परेशानी हो रही है",
    originalLanguage: "hi",
  };

  const result = await translateComplaint(original, "en");
  assert.ok(result.translatedTitle);
  assert.ok(result.translatedDescription);
  // Verify original object is unmodified
  assert.equal(original.title, "सड़क पर बड़ा गड्ढा है");
  assert.equal(original.description, "गाड़ियों को निकलने में बहुत परेशानी हो रही है");
});

test("All 8 languages have localized Saathi responses and 3-item checklists", () => {
  const langs = ["en", "hi", "pa", "bn", "ta", "te", "mr", "gu"];
  for (const lang of langs) {
    assert.ok(SAATHI_RESPONSES[lang], `Saathi responses must exist for ${lang}`);
    assert.ok(SAATHI_RESPONSES[lang].greeting, `Greeting must exist for ${lang}`);
    assert.ok(SAATHI_RESPONSES[lang].draftHeading, `Draft heading must exist for ${lang}`);
    assert.ok(CHECKLIST_ITEMS[lang], `Checklist items must exist for ${lang}`);
    assert.equal(CHECKLIST_ITEMS[lang].length, 3, `Checklist for ${lang} must have 3 items`);
  }
});
