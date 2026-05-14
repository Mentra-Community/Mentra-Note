/**
 * ContactsStep - Who do you talk to most
 * Add contacts and project topics
 */

import { useState } from "react";
import type { OnboardingData } from "../OnboardingPage";
import { UserIcon, CalendarGridIcon, CloseIcon } from "../../../components/shared/custom-icons";

interface ContactsStepProps {
  onNext: () => void;
  onBack?: () => void;
  data: OnboardingData;
  onChange: (partial: Partial<OnboardingData>) => void;
}

export function ContactsStep({ onNext, onBack, data, onChange }: ContactsStepProps) {
  const [nameInput, setNameInput] = useState("");
  const [topicInput, setTopicInput] = useState("");

  const addContact = () => {
    const trimmed = nameInput.trim();
    if (trimmed && !data.contacts.includes(trimmed)) {
      onChange({ contacts: [...data.contacts, trimmed] });
      setNameInput("");
    }
  };

  const addTopic = () => {
    const trimmed = topicInput.trim();
    if (trimmed && !data.topics.includes(trimmed)) {
      onChange({ topics: [...data.topics, trimmed] });
      setTopicInput("");
    }
  };

  const removeTopic = (topic: string) => {
    onChange({ topics: data.topics.filter((t) => t !== topic) });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex flex-col pt-3 gap-2 px-6">
        <div className="text-[11px] tracking-widest leading-3.5 uppercase text-[#DC2626] font-['Red_Hat_Display',system-ui,sans-serif] font-bold">
          onboarding
        </div>
        <div className="text-[30px] tracking-[-0.03em] leading-[34px] text-[#1C1917] dark:text-white font-['Red_Hat_Display',system-ui,sans-serif] font-extrabold">
          Who do you talk<br />to most?
        </div>
        <div className="text-[15px] leading-[22px] text-[#78716C] font-['Red_Hat_Display',system-ui,sans-serif]">
          Add names so Mentra Notes can recognize speakers and organize conversations by person.
        </div>
      </div>

      {/* Name Input */}
      <div className="flex flex-col pt-6 gap-3.5 px-6">
        <div className="flex items-center rounded-xl py-3.5 px-4 gap-2.5 bg-[#F5F5F4] dark:bg-zinc-800">
          <UserIcon />
          <input
            type="text"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addContact()}
            placeholder="Add a name..."
            className="text-[15px] leading-5 text-[#1C1917] dark:text-white font-['Red_Hat_Display',system-ui,sans-serif] placeholder:text-[#A8A29E] bg-transparent outline-none w-full"
          />
        </div>
      </div>

      {/* Topics */}
      <div className="flex flex-col pt-7 gap-3.5 px-6">
        <div className="text-[11px] tracking-widest leading-3.5 uppercase text-[#A8A29E] font-['Red_Hat_Display',system-ui,sans-serif] font-bold">
          Topics
        </div>
        <div className="flex items-center rounded-xl py-3.5 px-4 gap-2.5 bg-[#F5F5F4] dark:bg-zinc-800">
          <CalendarGridIcon />
          <input
            type="text"
            value={topicInput}
            onChange={(e) => setTopicInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTopic()}
            placeholder="Add a project..."
            className="text-[15px] leading-5 text-[#1C1917] dark:text-white font-['Red_Hat_Display',system-ui,sans-serif] placeholder:text-[#A8A29E] bg-transparent outline-none w-full"
          />
        </div>

        {/* Topic Tags */}
        {data.topics.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {data.topics.map((topic) => (
              <button
                key={topic}
                onClick={() => removeTopic(topic)}
                className="flex items-center rounded-[20px] py-2 px-3.5 gap-2 bg-[#F5F5F4] dark:bg-zinc-800 active:scale-95 transition-transform"
              >
                <div className="text-[14px] leading-[18px] text-[#1C1917] dark:text-white font-['Red_Hat_Display',system-ui,sans-serif] font-medium">
                  {topic}
                </div>
                <CloseIcon size={14} />
              </button>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
