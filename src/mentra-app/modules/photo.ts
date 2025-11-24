/**
 * =============================================================================
 * Photo Handling Module
 * =============================================================================
 *
 * This module contains all photo-related functionality including taking photos
 * and storing them.
 *
 * =============================================================================
 */

import { AppSession } from '@mentra/sdk';


/**
 * Take a photo and store it temporarily
 */
export async function takePhoto(
  session: AppSession,
  userId: string,
  logger: any
): Promise<void> {
  try {
    const photo = await session.camera.requestPhoto();
    logger.info(`Photo taken for user ${userId}, timestamp: ${photo.timestamp}`);

    // Photo is automatically stored by the SDK

  } catch (error) {
    logger.error(`Error taking photo: ${error}`);
  }
}
