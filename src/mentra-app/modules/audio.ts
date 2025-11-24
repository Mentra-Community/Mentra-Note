import { AppSession, logger } from "@mentra/sdk";

export async function playAudio(
  url: string,
  session: AppSession,
  userId: string,
  logger: any
): Promise<void> {
  try {
    await session.audio.playAudio({
      audioUrl: url,
    });
  } catch (error) {
    logger.error(`Error playing audio: ${error}`);
  }
}

export async function speak(
  text: string,
  session: AppSession,
  userId: string,
  logger: any
): Promise<void> {
  try {
    await session.audio.speak(text);
  } catch (error) {
    logger.error(`Error playing audio: ${error}`);
  }
}
