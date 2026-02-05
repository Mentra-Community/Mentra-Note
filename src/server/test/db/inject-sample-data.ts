/**
 * Test Script - Inject Sample Transcriptions
 *
 * This script injects sample transcriptions with today and yesterday dates
 * to test the batching and merging functionality.
 *
 * Usage: npx ts-node test/inject-sample-data.ts
 */

import mongoose from "mongoose";

// Import the Transcript model
import { Transcript } from "../../../shared/schema/transcript.schema";

async function injectSampleData() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGOURL || process.env.MONGODB_URI || "mongodb://localhost:27017/mentra-notes";
    await mongoose.connect(mongoUri);
    console.log("✅ Connected to MongoDB");

    // Get today and yesterday dates (using local date, not UTC)
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const todayStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
    const yesterdayStr = yesterday.getFullYear() + '-' + String(yesterday.getMonth() + 1).padStart(2, '0') + '-' + String(yesterday.getDate()).padStart(2, '0');

    const userEmail = "aryan.mentra.dev.public@gmail.com";

    // Sample transcriptions
    const sampleTranscriptions = [
      // Yesterday's transcriptions
      {
        userEmail,
        directionizationId: "1",
        content: "Yesterday morning.",
        date: `${yesterdayStr}:09:30:00`,
        createdAt: new Date(yesterday.getTime() + 9.5 * 60 * 60 * 1000),
      },
      {
        userEmail,
        directionizationId: "2",
        content: "Good afternoon yesterday.",
        date: `${yesterdayStr}:14:45:00`,
        createdAt: new Date(yesterday.getTime() + 14.75 * 60 * 60 * 1000),
      },
      {
        userEmail,
        directionizationId: "1",
        content: "Evening check in yesterday.",
        date: `${yesterdayStr}:18:15:00`,
        createdAt: new Date(yesterday.getTime() + 18.25 * 60 * 60 * 1000),
      },
      {
        userEmail,
        directionizationId: "2",
        content: "Late night notes yesterday.",
        date: `${yesterdayStr}:22:30:45`,
        createdAt: new Date(yesterday.getTime() + 22.5 * 60 * 60 * 1000),
      },
      // Today's transcriptions
      {
        userEmail,
        directionizationId: "1",
        content: "Today morning.",
        date: `${todayStr}:08:00:00`,
        createdAt: new Date(today.getTime() + 8 * 60 * 60 * 1000),
      },
      {
        userEmail,
        directionizationId: "1",
        content: "Midday thoughts today.",
        date: `${todayStr}:12:30:15`,
        createdAt: new Date(today.getTime() + 12.5 * 60 * 60 * 1000),
      },
      {
        userEmail,
        directionizationId: "2",
        content: "Afternoon update today.",
        date: `${todayStr}:16:45:00`,
        createdAt: new Date(today.getTime() + 16.75 * 60 * 60 * 1000),
      },
      {
        userEmail,
        directionizationId: "1",
        content: "Evening reflection today.",
        date: `${todayStr}:19:20:30`,
        createdAt: new Date(today.getTime() + 19.34 * 60 * 60 * 1000),
      },
    ];

    // Delete existing sample data first
    const deleteResult = await Transcript.deleteMany({
      userEmail,
      date: { $gte: `${yesterdayStr}:00:00:00` },
    }).exec();

    console.log(`🗑️  Deleted ${deleteResult.deletedCount} existing transcriptions`);

    // Insert new sample data
    const insertedDocs = await Transcript.insertMany(sampleTranscriptions);

    console.log(`✅ Inserted ${insertedDocs.length} sample transcriptions`);
    console.log(`\n📅 Date Range:`);
    console.log(`   Yesterday: ${yesterdayStr}`);
    console.log(`   Today:     ${todayStr}`);
    console.log(`\n📊 Transcriptions by date:`);

    // Count by date
    const yesterday_count = await Transcript.countDocuments({
      userEmail,
      date: { $gte: `${yesterdayStr}:00:00:00`, $lt: `${yesterdayStr}:23:59:59` },
    });

    const today_count = await Transcript.countDocuments({
      userEmail,
      date: { $gte: `${todayStr}:00:00:00`, $lt: `${todayStr}:23:59:59` },
    });

    console.log(`   Yesterday: ${yesterday_count} transcriptions`);
    console.log(`   Today:     ${today_count} transcriptions`);

    // Add Feb 6 future date transcriptions for additional testing
    const feb06 = new Date(today);
    feb06.setDate(feb06.getDate() + 2);
    const feb06Str = feb06.getFullYear() + '-' + String(feb06.getMonth() + 1).padStart(2, '0') + '-' + String(feb06.getDate()).padStart(2, '0');

    const feb06Transcriptions = [
      {
        userEmail,
        directionizationId: "2",
        content: "Morning notes.",
        date: `${feb06Str}:08:15:00`,
        createdAt: new Date(feb06.getTime() + 8.25 * 60 * 60 * 1000),
      },
      {
        userEmail,
        directionizationId: "1",
        content: "Midday review.",
        date: `${feb06Str}:12:45:00`,
        createdAt: new Date(feb06.getTime() + 12.75 * 60 * 60 * 1000),
      },
      {
        userEmail,
        directionizationId: "2",
        content: "Afternoon session.",
        date: `${feb06Str}:15:30:00`,
        createdAt: new Date(feb06.getTime() + 15.5 * 60 * 60 * 1000),
      },
      {
        userEmail,
        directionizationId: "1",
        content: "Evening reflection.",
        date: `${feb06Str}:19:00:00`,
        createdAt: new Date(feb06.getTime() + 19 * 60 * 60 * 1000),
      },
    ];

    const insertedFeb06 = await Transcript.insertMany(feb06Transcriptions);
    console.log(`✅ Inserted ${insertedFeb06.length} Feb 6 transcriptions`);

    const feb06_count = await Transcript.countDocuments({
      userEmail,
      date: { $gte: `${feb06Str}:00:00:00`, $lt: `${feb06Str}:23:59:59` },
    });

    console.log(`\n✨ Sample data injected successfully!`);
    console.log(`\n📊 Final Transcription Count:`);
    console.log(`   Yesterday (${yesterdayStr}): ${yesterday_count}`);
    console.log(`   Today (${todayStr}): ${today_count}`);
    console.log(`   Feb 6 (${feb06Str}): ${feb06_count}`);
    console.log(`   Total: ${yesterday_count + today_count + feb06_count}`);
    console.log(`\n🧪 Test Scenarios:`);
    console.log(`   1. Batch up to yesterday (${yesterdayStr})`);
    console.log(`      - Should capture: ${yesterday_count} transcriptions`);
    console.log(`   2. Batch up to today (${todayStr})`);
    console.log(`      - Should capture: ${yesterday_count + today_count} transcriptions`);
    console.log(`   3. Batch up to Feb 6 (${feb06Str})`);
    console.log(`      - Should capture: ${yesterday_count + today_count + feb06_count} transcriptions`);
    console.log(`   4. Multiple batches with deduplication`);
    console.log(`      - First batch: capture transcriptions up to cutoff`);
    console.log(`      - Second batch (same cutoff): 0 new transcriptions`);
    console.log(`      - Total in R2: no duplicates added`);

  } catch (error) {
    console.error("❌ Error injecting sample data:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("\n✅ Disconnected from MongoDB");
  }
}

injectSampleData();
