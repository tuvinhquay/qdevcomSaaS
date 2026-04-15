import fs from "node:fs";
import path from "node:path";

const envPath = path.resolve(process.cwd(), ".env.local");

const requiredFirebaseKeys = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
];

const requiredServerKeys = ["GEMINI_API_KEY"];

function parseEnv(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const raw = fs.readFileSync(filePath, "utf8");
  const entries = raw.split(/\r?\n/);
  const result = {};

  for (const line of entries) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const index = trimmed.indexOf("=");
    if (index <= 0) continue;

    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    result[key] = value;
  }

  return result;
}

const env = parseEnv(envPath);
const missingFirebase = requiredFirebaseKeys.filter((key) => !env[key]);
const missingServer = requiredServerKeys.filter((key) => !env[key]);

if (!fs.existsSync(envPath)) {
  console.error("Missing .env.local. Create it before running the app.");
  process.exit(1);
}

if (missingFirebase.length > 0 || missingServer.length > 0) {
  if (missingFirebase.length > 0) {
    console.error("Missing Firebase keys:");
    for (const key of missingFirebase) console.error(`- ${key}`);
  }

  if (missingServer.length > 0) {
    console.error("Missing server keys:");
    for (const key of missingServer) console.error(`- ${key}`);
  }

  process.exit(1);
}

if (!env.NEXT_PUBLIC_FIREBASE_API_KEY.startsWith("AIza")) {
  console.error(
    "NEXT_PUBLIC_FIREBASE_API_KEY does not look like a Firebase Web API key."
  );
  process.exit(1);
}

console.log("Environment check passed.");
