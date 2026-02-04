import https from "https";
import crypto from "crypto";
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
 * Upload test file using VIRTUAL-HOSTED-STYLE URLs
 * Format: https://BUCKET.ACCOUNT_ID.r2.cloudflarestorage.com/KEY
 * This way the bucket is in the hostname, not in the path
 */
async function uploadTestFile() {
  loadEnv();

  console.log("\n🚀 R2 Test Upload - Virtual-Hosted-Style\n");

  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || "mentra-notes";

  console.log("📋 Configuration:");
  console.log(`  Account ID: ${accountId}`);
  console.log(`  Bucket: ${bucketName}`);
  console.log(`  Access Key: ${accessKeyId?.slice(0, 8)}...`);

  if (!accountId || !accessKeyId || !secretAccessKey) {
    console.error("❌ Missing credentials!");
    return;
  }

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

  // Virtual-hosted style: bucket is in hostname
  const date = new Date().toISOString().split("T")[0];
  const userEmail = "aryan.mentra.dev.public@gmail.com";
  const key = `transcripts/${userEmail}/${date}/transcript.json`;

  console.log(`\n📝 Test Data:`);
  console.log(`  User: ${userEmail}`);
  console.log(`  Date: ${date}`);
  console.log(`  Content size: ${Buffer.byteLength(jsonContent)} bytes`);
  console.log(`  R2 Key: ${key}\n`);

  try {
    // Virtual-hosted style URL: https://BUCKET.ACCOUNT.r2.cloudflarestorage.com/KEY
    const endpoint = `https://${bucketName}.${accountId}.r2.cloudflarestorage.com`;
    await uploadToR2(endpoint, key, jsonContent, accessKeyId, secretAccessKey, bucketName);
    console.log("\n✅ Test upload completed successfully!");
  } catch (error) {
    console.error("\n❌ Test upload failed:", error instanceof Error ? error.message : error);
  }
}

function signRequest(
  method: string,
  path: string,
  headers: Record<string, string>,
  payload: string,
  accessKeyId: string,
  secretAccessKey: string,
  host: string
): Record<string, string> {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const region = "auto";
  const service = "s3";
  const algorithm = "AWS4-HMAC-SHA256";
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;

  // Create canonical request
  const payloadHash = crypto.createHash("sha256").update(payload).digest("hex");
  const canonicalHeaders = `content-type:${headers["Content-Type"]}\nhost:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = `${method}\n${path}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;

  // Create string to sign
  const canonicalRequestHash = crypto.createHash("sha256").update(canonicalRequest).digest("hex");
  const stringToSign = `${algorithm}\n${amzDate}\n${credentialScope}\n${canonicalRequestHash}`;

  // Calculate signature
  const kDate = crypto.createHmac("sha256", `AWS4${secretAccessKey}`).update(dateStamp).digest();
  const kRegion = crypto.createHmac("sha256", kDate).update(region).digest();
  const kService = crypto.createHmac("sha256", kRegion).update(service).digest();
  const kSigning = crypto.createHmac("sha256", kService).update("aws4_request").digest();
  const signature = crypto.createHmac("sha256", kSigning).update(stringToSign).digest("hex");

  // Add authorization header
  const authorizationHeader = `${algorithm} Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return {
    ...headers,
    "x-amz-date": amzDate,
    "x-amz-content-sha256": payloadHash,
    Authorization: authorizationHeader,
  };
}

function uploadToR2(
  endpoint: string,
  key: string,
  content: string,
  accessKeyId: string,
  secretAccessKey: string,
  bucketName: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const url = new URL(`${endpoint}/${key}`);
    const hostname = url.hostname;
    const requestPath = url.pathname;

    console.log(`🔗 Full URL: ${url.toString()}`);
    console.log(`🏠 Hostname: ${hostname}`);
    console.log(`📂 Path: ${requestPath}`);

    const initialHeaders = {
      "Content-Type": "application/json",
    };

    const signedHeaders = signRequest(
      "PUT",
      requestPath,
      initialHeaders,
      content,
      accessKeyId,
      secretAccessKey,
      hostname
    );

    console.log(`\n📋 Signed headers:`, {
      "Content-Type": signedHeaders["Content-Type"],
      "Content-Length": content.length,
      "x-amz-date": signedHeaders["x-amz-date"]?.slice(0, 8) + "...",
      Authorization: signedHeaders.Authorization?.slice(0, 30) + "...",
    });

    const requestOptions = {
      hostname: hostname,
      port: url.port || 443,
      path: requestPath,
      method: "PUT",
      headers: {
        ...signedHeaders,
        "Content-Length": Buffer.byteLength(content),
      },
      timeout: 30000,
    };

    console.log(`\n🚀 Making signed HTTP PUT request...\n`);

    const req = https.request(requestOptions, (res) => {
      let body = "";

      res.on("data", (chunk) => {
        body += chunk;
      });

      res.on("end", () => {
        console.log(`📥 Response status: ${res.statusCode}`);

        if (res.statusCode === 200 || res.statusCode === 204) {
          console.log("✅ Upload successful!");
          resolve();
        } else {
          console.error(`❌ HTTP ${res.statusCode}`);
          if (body) console.error(`Response body: ${body}`);
          reject(new Error(`HTTP ${res.statusCode}: ${body || "Upload failed"}`));
        }
      });
    });

    req.on("error", (error) => {
      console.error("❌ Request error:", error instanceof Error ? error.message : error);
      reject(error);
    });

    req.on("timeout", () => {
      console.error("❌ Request timeout");
      req.destroy();
      reject(new Error("Request timeout"));
    });

    console.log(`📝 Writing ${content.length} bytes to request...`);
    req.write(content);
    req.end();
  });
}

// Run the upload
uploadTestFile().catch(console.error);
