const bcrypt = require("bcryptjs");
require("dotenv").config({ path: require("node:path").resolve(__dirname, "../.env") });
const connectDB = require("../config/db");
const User = require("../models/User");

async function createAdmin() {
  const { ADMIN_EMAIL, ADMIN_NAME, ADMIN_PASSWORD } = process.env;
  if (!ADMIN_EMAIL || !ADMIN_NAME || !ADMIN_PASSWORD || ADMIN_PASSWORD.length < 12) {
    throw new Error("Set ADMIN_EMAIL, ADMIN_NAME, and a one-time ADMIN_PASSWORD of at least 12 characters.");
  }

  await connectDB();
  const email = ADMIN_EMAIL.trim().toLowerCase();
  const exists = await User.findOne({ email });
  if (exists) {
    throw new Error("A user with ADMIN_EMAIL already exists; no account was changed.");
  }

  const password = await bcrypt.hash(ADMIN_PASSWORD, 12);
  await User.create({ name: ADMIN_NAME.trim(), email, password, role: "admin" });
  console.log(`Initial administrator created for ${email}. Remove ADMIN_PASSWORD from the environment now.`);
  await require("mongoose").disconnect();
}

createAdmin().catch(async (error) => {
  console.error("Administrator provisioning failed:", error.message);
  process.exitCode = 1;
  try {
    await require("mongoose").disconnect();
  } catch {
    console.error("Could not close the MongoDB connection cleanly.");
  }
});
