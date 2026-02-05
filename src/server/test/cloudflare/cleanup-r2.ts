import { S3Client, ListObjectsV2Command, DeleteObjectCommand } from "@aws-sdk/client-s3";
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
 * Delete all files in the mentra-notes R2 bucket
 */
async function cleanupR2Bucket() {
  loadEnv();

  console.log("\n🗑️  R2 Bucket Cleanup Tool\n");

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

  // Create S3 client
  const s3Client = new S3Client({
    region: "auto",
    endpoint: endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  try {
    console.log(`\n🔍 Listing objects in bucket: ${bucketName}...`);

    // List all objects in the bucket
    const listCommand = new ListObjectsV2Command({
      Bucket: bucketName,
    });

    const listResponse = await s3Client.send(listCommand);
    const objects = listResponse.Contents || [];

    if (objects.length === 0) {
      console.log("✅ Bucket is already empty!");
      return;
    }

    console.log(`\n📦 Found ${objects.length} object(s) to delete:\n`);

    let deletedCount = 0;

    // Delete each object
    for (const obj of objects) {
      if (obj.Key) {
        try {
          console.log(`  Deleting: ${obj.Key}`);
          const deleteCommand = new DeleteObjectCommand({
            Bucket: bucketName,
            Key: obj.Key,
          });

          await s3Client.send(deleteCommand);
          deletedCount++;
          console.log(`    ✅ Deleted`);
        } catch (error) {
          console.error(`    ❌ Failed to delete: ${error instanceof Error ? error.message : error}`);
        }
      }
    }

    console.log(`\n✅ Cleanup complete! Deleted ${deletedCount}/${objects.length} objects`);

    // Verify bucket is empty
    const verifyCommand = new ListObjectsV2Command({
      Bucket: bucketName,
    });

    const verifyResponse = await s3Client.send(verifyCommand);
    const remainingObjects = verifyResponse.Contents || [];

    if (remainingObjects.length === 0) {
      console.log("🎉 Bucket is now completely empty!");
    } else {
      console.warn(`⚠️  Warning: ${remainingObjects.length} object(s) still remain in bucket`);
    }
  } catch (error) {
    console.error("❌ Cleanup failed:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

// Run cleanup
cleanupR2Bucket().catch(console.error);
