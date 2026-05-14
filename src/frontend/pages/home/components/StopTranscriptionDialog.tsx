/**
 * StopTranscriptionDrawer - Bottom drawer confirmation when stopping transcription
 */

import { BottomDrawer } from "../../../components/shared/BottomDrawer";
import { MicrophoneOffIcon } from "../../../components/shared/custom-icons";

interface StopTranscriptionDialogProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function StopTranscriptionDialog({ open, onCancel, onConfirm }: StopTranscriptionDialogProps) {
  return (
    <BottomDrawer isOpen={open} onClose={onCancel}>
      <div className="flex flex-col items-center gap-5">
        {/* Mic-off icon */}
        <div className="flex items-center justify-center rounded-2xl bg-[#FEE2E2] size-14">
          <MicrophoneOffIcon size={24} stroke="#DC2626" />
        </div>

        {/* Text */}
        <div className="flex flex-col items-center gap-2">
          <div className="text-[22px] leading-[28px] text-[#1C1917] dark:text-white font-['Red_Hat_Display',system-ui,sans-serif] font-extrabold">
            Stop recording?
          </div>
          <div className="text-[15px] leading-[22px] text-[#78716C] font-['Red_Hat_Display',system-ui,sans-serif] text-center">
            No transcriptions will be recorded and no conversations will be created until you turn it back on.
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-3 w-full pt-1">
          <button
            onClick={onCancel}
            className="flex items-center justify-center w-full h-[52px] rounded-[28px] bg-[#1C1917] dark:bg-white active:scale-[0.98] transition-transform"
          >
            <div className="text-[15px] text-[#FAFAF9] dark:text-black font-['Red_Hat_Display',system-ui,sans-serif] font-bold leading-[18px]">
              Keep Recording
            </div>
          </button>
          <button
            onClick={onConfirm}
            className="flex items-center justify-center w-full h-[52px] rounded-[28px] border border-[#D6D3D1] dark:border-zinc-700 active:scale-[0.98] transition-transform"
          >
            <div className="text-[15px] text-[#DC2626] font-['Red_Hat_Display',system-ui,sans-serif] font-semibold leading-[18px]">
              Stop Recording
            </div>
          </button>
        </div>
      </div>
    </BottomDrawer>
  );
}
