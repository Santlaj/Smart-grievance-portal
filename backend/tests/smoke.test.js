const test = require("node:test");
const assert = require("node:assert/strict");
const jwt = require("jsonwebtoken");
const { getCorsHeaders } = require("../lib/cors");
const { validateCivicComplaint, DEPARTMENT_TAXONOMY } = require("../utils/aiComplaintValidator");
const generateToken = require("../utils/generateToken");

test("CORS origin headers resolver", () => {
  const origin = "https://example.gov.in";
  const headers = getCorsHeaders(origin);
  assert.ok(headers["Access-Control-Allow-Methods"]);
  assert.equal(headers["Access-Control-Allow-Credentials"], "true");
});

test("Department taxonomy has essential civic departments", () => {
  assert.ok(DEPARTMENT_TAXONOMY["Roads Department"]);
  assert.ok(DEPARTMENT_TAXONOMY["Water Supply"]);
  assert.ok(DEPARTMENT_TAXONOMY["Sanitation"]);
  assert.ok(DEPARTMENT_TAXONOMY["Electricity"]);
  assert.ok(DEPARTMENT_TAXONOMY["Public Safety"]);
});

test("AI Complaint Validator classifies pothole to Roads Department", async () => {
  const result = await validateCivicComplaint({
    title: "Deep dangerous pothole on main avenue",
    description: "The road has broken tar and asphalt with a crater causing major traffic bottlenecks.",
    category: "Roads & Infrastructure",
    location: "Main Street, Ward 4",
  });

  assert.equal(result.isValidCivic, true);
  assert.equal(result.recommendedDepartment, "Roads Department");
  assert.ok(result.classificationConfidence >= 75);
});

test("AI Complaint Validator flags non-civic political slogans", async () => {
  const result = await validateCivicComplaint({
    title: "Election rally campaign vote for party",
    description: "Political party rally slogans shouting in the street vote for election.",
    category: "Other Civic Issue",
    location: "City Square",
  });

  assert.equal(result.isValidCivic, false);
  assert.equal(result.status, "Under Manual Review");
  assert.ok(result.warnings.some((w) => w.toLowerCase().includes("political") || w.toLowerCase().includes("non-civic")));
});

test("JWT token generator produces verifiable token", () => {
  const userId = "660000000000000000000001";
  const token = generateToken(userId);
  assert.ok(typeof token === "string" && token.length > 20);

  const secret = process.env.JWT_SECRET || "smart_grievance_production_jwt_secret_key_2026_super_secure_random_seed_9876543210";
  const decoded = jwt.verify(token, secret);
  assert.equal(decoded.id, userId);
});

