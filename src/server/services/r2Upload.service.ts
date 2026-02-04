import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: Error;
}

/**
 * Upload batch of transcriptions to Cloudflare R2 storage
 * Implements retry logic with exponential backoff
 */
export async function uploadBatchToR2(params: {
  userEmail: string;
  date: string; // YYYY-MM-DD
  transcriptions: any[];
  timezone: string;
}): Promise<UploadResult> {
  const { userEmail, date, transcriptions, timezone } = params;

  console.log(`\n[R2] 📦 Starting batch upload for ${userEmail} (${date})`);
  console.log(`[R2] 📊 Transcriptions count: ${transcriptions.length}`);
  console.log(`[R2] 🕐 Timezone: ${timezone}`);

  // Format batch data with metadata
  const batchData = {
    userEmail,
    date,
    timezone,
    batchedAt: new Date().toISOString(),
    transcriptionCount: transcriptions.length,
    transcriptions,
  };

  const jsonContent = JSON.stringify(batchData, null, 2);
  const contentSize = Buffer.byteLength(jsonContent);
  const key = `transcripts/${userEmail}/${date}/transcript.json`;
  const endpoint = process.env.CLOUDFLARE_R2_ENDPOINT;
  const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || "mentra-notes";

  console.log(`[R2] 💾 JSON content size: ${(contentSize / 1024).toFixed(2)} KB`);
  console.log(`[R2] 🔑 R2 key: ${key}`);

  if (!endpoint) {
    console.error(`[R2] ❌ ERROR: CLOUDFLARE_R2_ENDPOINT not configured`);
    return {
      success: false,
      error: new Error("CLOUDFLARE_R2_ENDPOINT not configured"),
    };
  }

  console.log(`[R2] 🌐 Endpoint: ${endpoint}`);

  // Check credentials
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;

  if (!accessKeyId || !secretAccessKey) {
    console.error(`[R2] ❌ ERROR: R2 credentials not configured`);
    console.error(`[R2]    - ACCESS_KEY_ID: ${accessKeyId ? "✓ Set" : "✗ Missing"}`);
    console.error(`[R2]    - SECRET_ACCESS_KEY: ${secretAccessKey ? "✓ Set" : "✗ Missing"}`);
    return {
      success: false,
      error: new Error("R2 credentials not configured"),
    };
  }

  console.log(`[R2] ✓ Credentials configured (keys present)`);

  // Retry logic: 3 attempts with exponential backoff
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      console.log(`\n[R2] 🔄 Upload attempt ${attempt}/3...`);
      const result = await uploadToR2(
        endpoint,
        bucketName,
        key,
        jsonContent,
        accessKeyId,
        secretAccessKey,
        attempt
      );

      if (result.success) {
        const url = `${endpoint}/${bucketName}/${key}`;
        console.log(`[R2] ✅ UPLOAD SUCCESSFUL on attempt ${attempt}`);
        console.log(`[R2] 📍 URL: ${url}`);
        return { success: true, url };
      }
    } catch (error) {
      console.error(`[R2] ❌ Upload attempt ${attempt} failed:`, error instanceof Error ? error.message : error);

      if (attempt < 3) {
        const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
        console.log(`[R2] ⏳ Waiting ${delay}ms before retry...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        console.error(`[R2] 💥 All 3 upload attempts failed`);
        return { success: false, error: error as Error };
      }
    }
  }

  console.error(`[R2] 💥 Upload failed after 3 attempts`);
  return {
    success: false,
    error: new Error("Upload failed after 3 attempts"),
  };
}

/**
 * Upload file to R2 using AWS SDK (handles signatures correctly)
 */
async function uploadToR2(
  endpoint: string,
  bucketName: string,
  key: string,
  content: string,
  accessKeyId: string,
  secretAccessKey: string,
  attempt: number
): Promise<{ success: boolean }> {
  // Create S3 client for Cloudflare R2
  const s3Client = new S3Client({
    region: "auto",
    endpoint: endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  try {
    console.log(`[R2] 🔗 Uploading to: ${endpoint}/${bucketName}/${key}`);
    console.log(`[R2] 📝 Content: ${content.length} bytes`);

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: content,
      ContentType: "application/json",
    });

    const response = await s3Client.send(command);

    console.log(`[R2] 📥 Response status: 200 (Success)`);
    console.log(`[R2] 📋 ETag: ${response.ETag}`);
    if (response.VersionId) {
      console.log(`[R2] 📌 Version ID: ${response.VersionId}`);
    }
    console.log(`[R2] ✅ Attempt ${attempt}: Upload successful`);

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[R2] ❌ Request error:`, errorMessage);
    throw error;
  }
}
