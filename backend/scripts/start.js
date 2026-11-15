const { spawn } = require("node:child_process");

const nextCli = require.resolve("next/dist/bin/next");
const port = process.env.PORT || "5000";
const child = spawn(process.execPath, [nextCli, "start", "-p", port], {
  stdio: "inherit",
  env: process.env,
});

child.on("error", (error) => {
  console.error("Could not start the Next.js production server:", error.message);
  process.exitCode = 1;
});
child.on("exit", (code, signal) => {
  if (signal) {
    process.exitCode = 1;
  } else {
    process.exitCode = code === null ? 1 : code;
  }
});
