const test = require("node:test");
const assert = require("node:assert/strict");
const { forgotPassword, resetPassword, loginUser } = require("../controllers/authController");

function mockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
  };
  return res;
}

test("Forgot Password Flow: Request OTP, Validate, and Reset Password", async (t) => {
  await t.test("rejects invalid or missing email", async () => {
    const req = { body: { email: "not-an-email" } };
    const res = mockRes();
    await forgotPassword(req, res);
    assert.equal(res.statusCode, 400);
  });

  await t.test("returns 404 for nonexistent email", async () => {
    const req = { body: { email: "nonexistent_citizen_user_999@example.com" } };
    const res = mockRes();
    await forgotPassword(req, res);
    assert.equal(res.statusCode, 404);
  });

  let generatedOtp = null;
  const targetEmail = "citizen@example.com";

  await t.test("generates 6-digit OTP for existing user", async () => {
    const req = { body: { email: targetEmail } };
    const res = mockRes();
    await forgotPassword(req, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
    assert.match(res.body.otp, /^\d{6}$/);
    generatedOtp = res.body.otp;
  });

  await t.test("rejects password reset with invalid OTP", async () => {
    const req = {
      body: {
        email: targetEmail,
        otp: "000000",
        newPassword: "brandNewPassword123",
      },
    };
    const res = mockRes();
    await resetPassword(req, res);
    assert.equal(res.statusCode, 400);
  });

  await t.test("successfully resets password with valid OTP", async () => {
    const req = {
      body: {
        email: targetEmail,
        otp: generatedOtp,
        newPassword: "brandNewPassword123",
      },
    };
    const res = mockRes();
    await resetPassword(req, res);
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.success, true);
  });

  await t.test("allows login with new password and rejects old password", async () => {
    // Old password should fail
    const oldLoginReq = {
      body: {
        email: targetEmail,
        password: "password123",
      },
    };
    const oldRes = mockRes();
    await loginUser(oldLoginReq, oldRes);
    assert.equal(oldRes.statusCode, 401);

    // New password should succeed
    const newLoginReq = {
      body: {
        email: targetEmail,
        password: "brandNewPassword123",
      },
    };
    const newRes = mockRes();
    await loginUser(newLoginReq, newRes);
    assert.equal(newRes.statusCode, 200);
    assert.equal(newRes.body.email, targetEmail);
  });

  await t.test("rejects reusing the same OTP a second time", async () => {
    const req = {
      body: {
        email: targetEmail,
        otp: generatedOtp,
        newPassword: "anotherPassword456",
      },
    };
    const res = mockRes();
    await resetPassword(req, res);
    assert.equal(res.statusCode, 400);
  });
});
