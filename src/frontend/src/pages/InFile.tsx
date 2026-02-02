import React from 'react'
import { useParams, useNavigate } from 'react-router';

import {
  ArrowLeft,
  Star,
  MoreVertical,
} from "lucide-react";
import Transcription from '../components/Transcription';

function formatDateFromFileName(fileName: string): string {
  const dateMatch = fileName.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (!dateMatch) {
    return fileName;
  }

  const [, year, month, day] = dateMatch;
  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

  const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
  const monthName = date.toLocaleDateString('en-US', { month: 'short' });
  const dayNum = date.getDate();

  return `${dayName}, ${monthName} ${dayNum}`;
}

function InFile() {
  const { fileName } = useParams<{ fileName: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = React.useState<'transcript' | 'notes' | 'audio' | 'ai'>('transcript');

  const displayName = fileName ? formatDateFromFileName(decodeURIComponent(fileName)) : 'Unknown';

  const tabs = [
    { id: 'transcript', label: 'Transcript' },
    { id: 'notes', label: 'Notes' },
    { id: 'audio', label: 'Audio' },
    { id: 'ai', label: 'AI' },
  ] as const;

  return (
    <div className='flex flex-col '>
      <div className='flex items-center p-[10px]'>
        <div className='w-20 flex justify-start'>
          <button className="p-2" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>
        <div className='flex-1 text-center'>{displayName}</div>
        <div className='w-20 flex justify-end'>
          <button className="p-2">
            <Star className="w-5 h-5" />
          </button>
          <button className="p-2">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className='flex border-b border-b-[0.5px] border-[#d4d4d4] pl-[20px] gap-[20px]'>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-[10px] cursor-pointer ${
              activeTab === tab.id
                ? 'font-bold border-b-2 border-black'
                : 'text-gray-500'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className='flex-1'>
        {activeTab === 'transcript' && <Transcription />}
        {activeTab === 'notes' && <div>Notes content</div>}
        {activeTab === 'audio' && <div>Audio content</div>}
        {activeTab === 'ai' && <div>AI content</div>}
      </div>
    </div>
  )
}

export default InFile