import { uploadBatchToR2 } from "../services/r2Upload.service";
import fs from "fs";
import path from "path";

/**
 * Load environment variables from .env file
 */
function loadEnv() {
  const envPath = path.join(process.cwd(), ".env");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    envContent.split("\n").forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const [key, ...valueParts] = trimmed.split("=");
        const value = valueParts.join("=");
        if (key && value) {
          process.env[key] = value;
        }
      }
    });
  }
}

async function testBatchUpload() {
  loadEnv();

  console.log("\n📦 Testing R2 Batch Upload Service\n");

  const date = new Date().toISOString().split("T")[0];
  const testTranscriptions = [
    {
      id: "test-1",
      text: "This is the first test transcript",
      timestamp: new Date().toISOString(),
      speaker: "Test User",
    },
    {
      id: "test-2",
      text: "This is the second test transcript",
      timestamp: new Date().toISOString(),
      speaker: "Test User",
    },
    {
      id: "test-3",
      text: "This is the third test transcript",
      timestamp: new Date().toISOString(),
      speaker: "Test User",
    },
  ];

  const result = await uploadBatchToR2({
    userEmail: "aryan.mentra.dev.public@gmail.com",
    date: date,
    transcriptions: testTranscriptions,
    timezone: "America/New_York",
  });

  if (result.success) {
    console.log("\n✅ Batch upload test PASSED!");
    console.log(`📍 File URL: ${result.url}`);
  } else {
    console.error("\n❌ Batch upload test FAILED!");
    console.error(`Error: ${result.error?.message}`);
    process.exit(1);
  }
}

testBatchUpload().catch(console.error);
