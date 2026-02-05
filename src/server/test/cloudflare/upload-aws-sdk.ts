import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
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

/**
 * Upload test file using AWS SDK v3 (handles signatures correctly)
 */
async function uploadTestFile() {
  loadEnv();

  console.log("\n🚀 R2 Test Upload - Using AWS SDK v3\n");

  const endpoint = process.env.CLOUDFLARE_R2_ENDPOINT;
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || "mentra-notes";

  console.log("📋 Configuration:");
  console.log(`  Endpoint: ${endpoint}`);
  console.log(`  Bucket: ${bucketName}`);
  console.log(`  Access Key: ${accessKeyId?.slice(0, 8)}...`);

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    console.error("❌ Missing credentials!");
    return;
  }

  // Create S3 client configured for Cloudflare R2
  const s3Client = new S3Client({
    region: "auto",
    endpoint: endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  // Create test content
  const testData = {
    test: true,
    timestamp: new Date().toISOString(),
    userEmail: "aryan.mentra.dev.public@gmail.com",
    date: new Date().toISOString().split("T")[0],
    message: "This is a test transcript file for R2 upload",
    transcripts: [
      {
        id: "test-1",
        text: "This is a test transcript",
        timestamp: new Date().toISOString(),
      },
    ],
  };

  const jsonContent = JSON.stringify(testData, null, 2);

  // Upload WITHOUT bucket name in path (S3 client handles bucket separately)
  const date = new Date().toISOString().split("T")[0];
  const userEmail = "aryan.mentra.dev.public@gmail.com";
  const key = `transcripts/${userEmail}/${date}/transcript.json`;

  console.log(`\n📝 Test Data:`);
  console.log(`  User: ${userEmail}`);
  console.log(`  Date: ${date}`);
  console.log(`  Content size: ${Buffer.byteLength(jsonContent)} bytes`);
  console.log(`  R2 Key: ${key}\n`);

  try {
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: jsonContent,
      ContentType: "application/json",
    });

    console.log(`🚀 Sending PutObjectCommand...`);
    const response = await s3Client.send(command);

    console.log(`✅ Upload successful!`);
    console.log(`   ETag: ${response.ETag}`);
    console.log(`   Version ID: ${response.VersionId || "N/A"}`);
    console.log(`\n📍 File location: ${bucketName}/${key}`);
  } catch (error) {
    console.error(`❌ Upload failed:`);
    console.error(error instanceof Error ? error.message : String(error));
  }
}

// Run the upload
uploadTestFile().catch(console.error);
