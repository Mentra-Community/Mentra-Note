/**
 * UserState Database API
 * Handles all database operations for batch cutoff tracking
 * Follows the same pattern as file.api.ts
 */

import { UserState } from "../../../shared/schema/userState.schema";

/**
 * Interface matching UserState schema
 */
interface IUserState {
  userEmail: string;
  endOfDateBatchTranscriptions: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Find UserState document by user email
 * Returns null if not found (graceful handling for new users)
 *
 * @param userEmail - User's email identifier
 * @returns UserState document or null if not found
 */
export async function getUserState(userEmail: string): Promise<IUserState | null> {
  try {
    const userState = await UserState.findOne({ userEmail }).exec();
    return userState;
  } catch (error) {
    console.error(`[userState.api] Error finding UserState for ${userEmail}:`, error);
    throw error;
  }
}

/**
 * Initialize new UserState document for a user
 * Checks if user already exists to prevent duplicates (handles race conditions)
 *
 * @param userEmail - User's email identifier
 * @param initialCutoff - Initial batch cutoff as formatted string (user's local timezone)
 * @returns Created or existing UserState document
 */
export async function initializeUserState(
  userEmail: string,
  initialCutoff: string
): Promise<IUserState> {
  try {
    // Check if user already exists (handles concurrent initialization)
    const existing = await UserState.findOne({ userEmail }).exec();
    if (existing) {
      console.log(`[userState.api] UserState already exists for ${userEmail}, returning existing`);
      return existing;
    }

    // Create new UserState
    const userState = new UserState({
      userEmail,
      endOfDateBatchTranscriptions: initialCutoff,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const saved = await userState.save();
    console.log(
      `[userState.api] Created UserState for ${userEmail}. Cutoff: ${initialCutoff}`
    );

    return saved;
  } catch (error) {
    console.error(`[userState.api] Error initializing UserState for ${userEmail}:`, error);
    throw error;
  }
}

/**
 * Update batch cutoff for existing UserState
 * Called when timezone changes or when cutoff is crossed
 *
 * @param userEmail - User's email identifier
 * @param newCutoff - New batch cutoff as formatted string (user's local timezone)
 * @returns void (updates in place)
 */
export async function updateBatchCutoff(
  userEmail: string,
  newCutoff: string
): Promise<void> {
  try {
    const result = await UserState.updateOne(
      { userEmail },
      {
        $set: {
          endOfDateBatchTranscriptions: newCutoff,
          updatedAt: new Date(),
        },
      }
    ).exec();

    if (result.matchedCount === 0) {
      console.warn(`[userState.api] No UserState found to update for ${userEmail}`);
      return;
    }

    console.log(
      `[userState.api] Updated UserState for ${userEmail}. New cutoff: ${newCutoff}`
    );
  } catch (error) {
    console.error(`[userState.api] Error updating UserState for ${userEmail}:`, error);
    throw error;
  }
}
