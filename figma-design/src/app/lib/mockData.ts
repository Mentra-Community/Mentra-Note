import { addDays, subDays, startOfWeek, endOfWeek, eachDayOfInterval, startOfMonth, subMonths, setHours, setMinutes, format, addMinutes } from 'date-fns';

export interface TranscriptionSegment {
  id: string;
  startTime: string; // "HH:mm"
  timestamp: Date; // Actual date object for sorting/grouping
  text: string;
  speakers: string[];
}

export interface NoteItem {
  text: string;
  done: boolean;
}

export interface Note {
  id: string;
  title: string;
  createdAt: string;
  summary: string; // Short summary for list view
  content?: string; // Full rich text/markdown content for editor
  decisions: string[]; // Keep for backward compatibility or structured data usage if needed
  actionItems: NoteItem[]; // Keep for backward compatibility
  isPinned?: boolean;
  source: 'AI' | 'Manual';
  timeRange?: string; // e.g. "10:00 AM - 11:00 AM"
  updatedAt?: string;
}

export interface AudioRecording {
  id: string;
  title: string;
  duration: string;
  source: 'Mic' | 'Upload';
  createdAt: string;
  isPlaying: boolean;
  transcription: string;
}

export interface DailyFolder {
  id: string;
  date: Date;
  isToday: boolean;
  isStarred: boolean;
  isTranscribing: boolean;
  isArchived?: boolean;
  isTrashed?: boolean;
  transcriptions: TranscriptionSegment[];
  notes: Note[];
  audio: AudioRecording[];
}

const today = new Date();

// Helper to generate timestamps
const getTimestamp = (baseDate: Date, hour: number, minute: number) => {
    return setMinutes(setHours(baseDate, hour), minute);
};

// --- DATA GENERATORS ---

const MEETING_TYPES = [
    { title: 'Design Sync', duration: '45m', topic: 'UI/UX Review' },
    { title: 'Weekly Standup', duration: '15m', topic: 'Status Updates' },
    { title: 'Client Check-in', duration: '30m', topic: 'Feedback' },
    { title: 'Product Roadmap', duration: '60m', topic: 'Q3 Planning' },
    { title: 'Tech Huddle', duration: '45m', topic: 'Architecture' },
    { title: 'Marketing Sync', duration: '30m', topic: 'Campaign Launch' },
    { title: '1:1', duration: '30m', topic: 'Career Growth' },
    { title: 'Brainstorming', duration: '60m', topic: 'New Features' },
    { title: 'Code Review', duration: '20m', topic: 'PR #1024' },
    { title: 'Quick Sync', duration: '10m', topic: 'Blockers' },
    { title: 'User Interview', duration: '45m', topic: 'Discovery' },
    { title: 'Stakeholder Update', duration: '30m', topic: 'Progress Report' },
    { title: 'Sprint Retrospective', duration: '60m', topic: 'Process Improvement' },
    { title: 'Legal Review', duration: '30m', topic: 'Contract Terms' },
    { title: 'Sales Handover', duration: '20m', topic: 'Lead Handoff' },
];

const SPEAKERS = ['Sarah', 'Mike', 'Jessica', 'David', 'Alex', 'Sam', 'Tom', 'Emily', 'Ryan', 'Chloe'];

const SAMPLE_TRANSCRIPTS = [
    "Okay, let's get started. We have a lot to cover today regarding the new feature rollout.",
    "I think we should prioritize the mobile responsiveness. Our analytics show 60% mobile traffic.",
    "That makes sense. I can pick up the CSS changes tomorrow.",
    "Did we get the final assets from the design team yet?",
    "Yes, they are in the shared folder. I'll send the link after this call.",
    "Great work on the release yesterday, everyone. The stability metrics look solid.",
    "We need to discuss the database schema changes before we proceed with the migration.",
    "Can we circle back to this offline? I think we're going into too much detail.",
    "I'll schedule a follow-up meeting for next Tuesday.",
    "Has anyone seen the updated requirements doc?",
    "I'll slack it to the channel right now.",
    "The user feedback from the beta testing has been overwhelmingly positive.",
    "We found a critical bug in the login flow that needs immediate attention.",
    "What's the status on the API integration with the third-party vendor?",
    "I'm blocked on the backend endpoint, can someone take a look?",
    "Let's make sure we update the documentation before the end of the sprint.",
    "The performance on the dashboard page is a bit sluggish, we should optimize the queries.",
    "I'll setup a pairing session to walk through the new codebase.",
    "We need to finalize the budget for the marketing campaign by Friday.",
    "Who is the point of contact for the security audit?",
    "Let's brainstorm some ideas for the upcoming hackathon.",
    "The automated tests are failing on the CI pipeline, looking into it now.",
    "Can we get a quick demo of the new prototype?",
    "I'm going to be out of office next week, so please plan accordingly.",
    "We need to scale our infrastructure to handle the expected traffic spike."
];

const getRandomElement = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const getRandomSubset = <T>(arr: T[], count: number): T[] => {
    const shuffled = [...arr].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
};

// type: 'mixed' (Notes + Audio) | 'notes_only' (Manual Notes Only) | 'recording_only_no_notes' (Audio, NO Notes)
const generateRandomContent = (date: Date, index: number, type: 'mixed' | 'notes_only' | 'recording_only_no_notes' = 'mixed'): { notes: Note[], audio: AudioRecording[], transcriptions: TranscriptionSegment[] } => {
    const notes: Note[] = [];
    const audio: AudioRecording[] = [];
    const transcriptions: TranscriptionSegment[] = [];

    // Decide how many "events" happened this day (5 to 30 for audio/transcripts if applicable)
    // If notes_only, we might still have a few events represented as notes, but no audio
    let numEvents = 0;
    if (type === 'notes_only') {
        numEvents = Math.floor(Math.random() * 5) + 2; // 2 to 6 notes
    } else {
        // High volume of recordings - increased max to 30
        numEvents = Math.floor(Math.random() * 26) + 5; // 5 to 30 events
    }

    let currentHour = 7; // Start day earlier at 7 AM
    let currentMinute = 0;

    for (let i = 0; i < numEvents; i++) {
        // Advance time randomly but keep it tighter to fit more events
        currentMinute += Math.floor(Math.random() * 30) + 10;
        if (currentMinute >= 60) {
            currentHour += Math.floor(currentMinute / 60);
            currentMinute = currentMinute % 60;
        }
        if (currentHour >= 22) break; // End of day

        const meeting = getRandomElement(MEETING_TYPES);
        const meetingStart = getTimestamp(date, currentHour, currentMinute);
        
        // Random duration between 10m and 90m for variety
        const durationMins = Math.floor(Math.random() * 80) + 10;
        const meetingEnd = addMinutes(meetingStart, durationMins);
        
        const timeRange = `${format(meetingStart, 'h:mm a')} - ${format(meetingEnd, 'h:mm a')}`;
        
        // 1. Audio Recording & Transcriptions (Skip if 'notes_only')
        if (type !== 'notes_only') {
            const audioId = `a_${index}_${i}`;
            // Construct a longer initial transcription text
            const transcriptionText = `${getRandomElement(SAMPLE_TRANSCRIPTS)} ${getRandomElement(SAMPLE_TRANSCRIPTS)}`;
            
            audio.push({
                id: audioId,
                title: `${meeting.title} ${i+1}`,
                duration: `${Math.floor(durationMins)}m`,
                source: 'Mic',
                createdAt: format(meetingStart, 'h:mm a'),
                isPlaying: false,
                transcription: transcriptionText 
            });

            // Transcriptions
            // Generate significantly more segments for some recordings
            const numSegments = Math.floor(Math.random() * 20) + 5; // 5 to 25 segments per recording
            
            // Add initial segment
            transcriptions.push({
                id: `t_${index}_${i}_main`,
                startTime: format(meetingStart, 'HH:mm'),
                timestamp: meetingStart,
                text: transcriptionText,
                speakers: ['You']
            });

            for (let j = 0; j < numSegments; j++) {
                // Spaced out over the duration
                const segTime = addMinutes(meetingStart, Math.floor((j / numSegments) * durationMins));
                transcriptions.push({
                    id: `t_${index}_${i}_${j}`,
                    startTime: format(segTime, 'HH:mm'),
                    timestamp: segTime,
                    text: getRandomElement(SAMPLE_TRANSCRIPTS),
                    speakers: getRandomSubset(SPEAKERS, 1)
                });
            }

            // AI Note (Only if we have audio to generate it from AND type allows it)
            // 'recording_only_no_notes' explicitly skips AI note generation
            // Generate fewer notes than recordings to be realistic (maybe 1 note for every 3-4 recordings)
            if (type !== 'recording_only_no_notes' && Math.random() > 0.7) {
                 notes.push({
                    id: `n_${index}_${i}_ai`,
                    title: `${meeting.title} Summary`,
                    createdAt: format(addMinutes(meetingEnd, 5), 'h:mm a'),
                    updatedAt: 'Auto-saved',
                    summary: `Automated summary of the ${meeting.topic} discussion. Key points covered include timeline and resource allocation.`,
                    content: `<b>Summary</b><br/>Discussed ${meeting.topic}. Team is aligned on next steps.<br/><br/><b>Action Items</b><ul><li>Review PRs by EOD</li><li>Update Jira tickets</li></ul>`,
                    decisions: ['Approved timeline'],
                    actionItems: [{ text: 'Check Jira', done: false }],
                    isPinned: Math.random() > 0.9,
                    source: 'AI',
                    timeRange: timeRange
                });
            }
        }

        // 2. Manual Note
        // 'mixed': Random chance independent of recording
        // 'notes_only': High chance
        // 'recording_only_no_notes': Never

        if (type === 'notes_only' || (type === 'mixed' && Math.random() > 0.8)) {
             notes.push({
                id: `n_${index}_${i}_man`,
                title: 'Quick Idea',
                createdAt: format(addMinutes(meetingStart, 10), 'h:mm a'),
                updatedAt: format(addMinutes(meetingStart, 15), 'h:mm a'),
                summary: 'Self reminder to check the logs.',
                content: 'Need to verify if the error rate spiked during the deployment.',
                decisions: [],
                actionItems: [],
                isPinned: false,
                source: 'Manual',
            });
        }
    }

    // Sort transcriptions by time
    transcriptions.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    return { notes, audio, transcriptions };
};

// Generate some specific data for the current view
const manualFolders: DailyFolder[] = [
  {
    id: '1',
    date: today,
    isToday: true,
    isStarred: false,
    isTranscribing: true, // Live status
    isArchived: false,
    isTrashed: false,
    transcriptions: [
      {
        id: 't1',
        startTime: '09:00',
        timestamp: getTimestamp(today, 9, 0),
        text: "Okay, let's get started. Today we need to discuss the Q3 roadmap and the mobile redesign timeline.",
        speakers: ['You'],
      },
      {
        id: 't2',
        startTime: '09:02',
        timestamp: getTimestamp(today, 9, 2),
        text: "The main goal is to improve the user experience on smaller screens.",
        speakers: ['Sarah'],
      },
      {
        id: 't3',
        startTime: '09:05',
        timestamp: getTimestamp(today, 9, 5),
        text: "We have some initial mockups ready for review.",
        speakers: ['Mike'],
      }
    ],
    notes: [
        {
          id: 'n1',
          title: 'Morning Standup Summary',
          createdAt: '09:30 AM',
          updatedAt: 'Just now',
          summary: 'Team aligned on prioritizing mobile views for Q3. API migration pushed to Q4. Frontend polish is the main focus.',
          content: `<b>Overview</b>
The team met to discuss the Q3 roadmap. The primary focus was on the mobile redesign timeline vs API migration.`,
          decisions: ['Prioritize mobile views', 'Push API migration to Q4'],
          actionItems: [],
          isPinned: false,
          source: 'AI',
          timeRange: '09:00 AM - 09:30 AM'
        }
    ], 
    audio: [
      {
        id: 'a1',
        title: 'Standup Recording',
        duration: '15:20',
        source: 'Mic',
        createdAt: '09:00 AM',
        isPlaying: false,
        transcription: "Okay, let's get started. Today we need to discuss the Q3 roadmap and the mobile redesign timeline."
      }
    ]
  }
];

// Helper to generate a folder
const createFolder = (date: Date, id: string): DailyFolder => {
    const r = Math.random();
    let type: 'mixed' | 'notes_only' | 'recording_only_no_notes' = 'mixed';
    
    // Adjusted Probabilities:
    if (r < 0.33) type = 'notes_only';
    else if (r < 0.66) type = 'recording_only_no_notes';
    else type = 'mixed';
    
    const { notes, audio, transcriptions } = generateRandomContent(date, parseInt(id.split('_')[1] || '0'), type);
    
    return {
      id,
      date,
      isToday: false,
      isStarred: Math.random() > 0.8,
      isTranscribing: false,
      isArchived: false,
      isTrashed: false,
      transcriptions,
      notes,
      audio
    };
};

// Fill in some random history for the calendar
const generateHistory = () => {
  const history: DailyFolder[] = [];
  const start = subMonths(today, 2); // Go back 2 months
  const allDays = eachDayOfInterval({ start, end: subDays(today, 1) });
  
  allDays.reverse().forEach((day, index) => {
    // 80% chance of having a folder on any given past day
    if (Math.random() > 0.2) {
        history.push(createFolder(day, `hist_${index}`));
    }
  });
  
  return history;
};

// We want to make sure we have specific examples of the requested types in recent history
const history = generateHistory();

// Ensure T-1 is Recording Only
if (history.length > 0) {
    history[0] = createFolder(subDays(today, 1), 'hist_yesterday_rec_only');
    // Force it to be recording only
    const content = generateRandomContent(subDays(today, 1), 999, 'recording_only_no_notes');
    history[0].audio = content.audio;
    history[0].transcriptions = content.transcriptions;
    history[0].notes = [];
}

// Ensure T-2 is Notes Only
if (history.length > 1) {
    history[1] = createFolder(subDays(today, 2), 'hist_2days_notes_only');
     // Force it to be notes only
    const content = generateRandomContent(subDays(today, 2), 998, 'notes_only');
    history[1].audio = [];
    history[1].transcriptions = [];
    history[1].notes = content.notes;
}

export const mockFolders: DailyFolder[] = [...manualFolders, ...history];
