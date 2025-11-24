/**
 * =============================================================================
 * MentraOS Camera App - Beginner-Friendly Template
 * =============================================================================
 *
 * This app allows users to take photos using their MentraOS glasses.
 *
 * QUICK START:
 * 1. Make sure your .env file has PACKAGE_NAME and MENTRAOS_API_KEY set
 * 2. Run: bun run dev
 * 3. Visit the MentraOS Developer Console: https://console.mentra.glass/
 *
 * HOW IT WORKS:
 * - When a user presses the button on their glasses, it takes a photo
 * - When they hold the button, it toggles video streaming mode
 * - Photos are stored temporarily and can be viewed in a web interface
 *
 * =============================================================================
 */

import { AppServer, AppSession } from "@mentra/sdk";
import { setupButtonHandler } from "./event/button";
import { takePhoto } from "./modules/photo";
import { setupWebviewRoutes } from "./routes/routes";
import { playAudio, speak } from "./modules/audio";
import { setupTranscription } from "./modules/transcription";
import * as path from "path";

// CONFIGURATION - Load settings from .env file

const PACKAGE_NAME =
  process.env.PACKAGE_NAME ??
  (() => {
    throw new Error("PACKAGE_NAME is not set in .env file");
  })();

const MENTRAOS_API_KEY =
  process.env.MENTRAOS_API_KEY ??
  (() => {
    throw new Error("MENTRAOS_API_KEY is not set in .env file");
  })();

const PORT = parseInt(process.env.PORT || "3000");

// MAIN APP CLASS

class ExampleMentraOSApp extends AppServer {
  private readonly audioURL = "https://general.dev.tpa.ngrok.app/assets/audio/one_more_time.mp3";

  constructor() {
    super({
      packageName: PACKAGE_NAME,
      apiKey: MENTRAOS_API_KEY,
      port: PORT,
    });

    // Serve static files (audio, images, etc.) from the public directory
    const publicPath = path.join(process.cwd(), "src", "public");
    this.getExpressApp().use("/assets", require("express").static(publicPath + "/assets"));

    // Set up all web routes (pass the photos map from the parent class)
    setupWebviewRoutes(this.getExpressApp(), (this as any).photos);
  }

  // Session Lifecycle - Called when a user opens/closes the app

  /**
   * Called when a user launches the app on their glasses
   */
  protected async onSession(
    session: AppSession,
    sessionId: string,
    userId: string
  ): Promise<void> {
    this.logger.info(`Session started for user ${userId}`);

    // const result = await session.audio.playAudio({
    //   audioUrl: this.audioURL
    // })
    // // await session.audio.speak('Hello from your app!');

    // Set up transcription to log all speech-to-text
    setupTranscription(
      session,
      (finalText) => {
        // Called when transcription is finalized
        this.logger.info(`[FINAL] Transcription: ${finalText}`);
        console.log(`✅ Final transcription: ${finalText}`);
      },
      (partialText) => {
        // Called for interim/partial results (optional)
        console.log(`⏳ Partial transcription: ${partialText}`);
      }
    );

    // Register handler for all touch events
    session.events.onTouchEvent((event) => {
      console.log(`wTouch event: ${event.gesture_name}`);
    });

    // Listen for button presses on the glasses
    setupButtonHandler(session, userId, this.logger, (s, u) =>
      takePhoto(s, u, this.logger)
    );
  }

  /**
   * Called when a user closes the app or disconnects
   */
  protected async onStop(
    sessionId: string,
    userId: string,
    reason: string
  ): Promise<void> {
    this.logger.info(`Session stopped for user ${userId}, reason: ${reason}`);
  }
}

// START THE SERVER

const app = new ExampleMentraOSApp();

app.start().catch(console.error);
