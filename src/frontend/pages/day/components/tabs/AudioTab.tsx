/**
 * AudioTab - Placeholder for audio recording features
 *
 * Future features:
 * - List of audio recordings for the day
 * - Audio player with waveform visualization
 * - Audio segment bookmarks
 */

import { Headphones } from "lucide-react";

export function AudioTab() {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center py-12 px-4">
        <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-[#313338] flex items-center justify-center mx-auto mb-4">
          <Headphones size={28} className="text-zinc-400 dark:text-zinc-500" />
        </div>
        <h3 className="font-medium text-zinc-600 dark:text-zinc-400 mb-1">
          Audio Recordings
        </h3>
        <p className="text-sm text-zinc-400 dark:text-zinc-500 max-w-xs">
          Audio playback and recording features coming soon
        </p>
      </div>
    </div>
  );
}
