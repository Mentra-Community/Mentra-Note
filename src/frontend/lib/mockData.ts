import { addDays, subDays, subHours, format } from 'date-fns';

export interface Note {
  id: string;
  title: string;
  createdAt: string;
  summary: string;
  decisions: string[];
  actionItems: ActionItem[];
  isPinned?: boolean;
}

export interface ActionItem {
  id?: string;
  text: string;
  done: boolean;
  owner?: string;
  dueDate?: Date;
  sourceMeetingId?: string;
  status?: 'todo' | 'in-progress' | 'done' | 'snoozed';
  priority?: 'high' | 'medium' | 'low';
}

export interface TranscriptionSegment {
  id: string;
  time: string;
  text: string;
  speaker: string;
  isImportant?: boolean;
}

export interface AudioRecording {
  id: string;
  startTime: string;
  duration: string;
  name: string;
}

export interface DailyFolder {
  id: string;
  date: Date;
  isToday: boolean;
  isTranscribing: boolean;
  isStarred: boolean;
  transcriptions: TranscriptionSegment[];
  notes: Note[];
  audio: AudioRecording[];
}

// --- New Types for Executive Assistant Spec ---

export interface Meeting {
  id: string;
  title: string;
  date: Date;
  type: 'Product Review' | 'Design Review' | 'Planning' | 'Standup' | 'Incident' | 'External Call' | 'Personal';
  status: 'upcoming' | 'live' | 'completed';
  attendees: string[];
  captureStatus: 'not-started' | 'capturing' | 'processing' | 'completed';
  outputStatus: 'sent' | 'pending' | 'draft';
  actionCount: number;
  decisionCount: number;
  hasResearch: boolean;
  autonomyMode: 'capture' | 'suggest' | 'act';
  transcript?: TranscriptionSegment[];
  notes?: Note;
  outputs?: ActionItem[];
}

export interface ResearchPack {
  id: string;
  title: string;
  type: 'competitor' | 'tech' | 'vendor';
  lastUpdated: Date;
  confidence: number;
  sources: number;
  changeSummary?: string;
  isMonitored?: boolean;
}

export interface AgentRule {
  id: string;
  name: string;
  condition: string;
  action: string;
  active: boolean;
}

// --- Mock Data Generators ---

const generateMockMeetings = (): Meeting[] => [
  {
    id: 'm1',
    title: 'Mobile App Redesign Review',
    date: new Date(),
    type: 'Product Review',
    status: 'upcoming',
    attendees: ['Alice', 'Bob', 'Charlie'],
    captureStatus: 'not-started',
    outputStatus: 'pending',
    actionCount: 0,
    decisionCount: 0,
    hasResearch: true,
    autonomyMode: 'suggest',
    transcript: [],
    notes: undefined,
    outputs: []
  },
  {
    id: 'm2',
    title: 'Weekly Sync with Engineering',
    date: subHours(new Date(), 2),
    type: 'Planning',
    status: 'completed',
    attendees: ['Team'],
    captureStatus: 'completed',
    outputStatus: 'sent',
    actionCount: 5,
    decisionCount: 2,
    hasResearch: false,
    autonomyMode: 'capture',
    transcript: [
        { id: 't1', time: '00:15', text: "Alright everyone, let's get started. First item is the mobile refresh.", speaker: "Manager" },
        { id: 't2', time: '00:45', text: "We have the Figma mocks ready. I can share my screen.", speaker: "Designer" },
        { id: 't3', time: '01:20', text: "Looks good. Are these components utilizing the new design system?", speaker: "Dev Lead" },
        { id: 't4', time: '01:35', text: "Yes, mostly. There are a few custom controls we might need to build.", speaker: "Designer" },
        { id: 't5', time: '02:10', text: "Let's stick to standard components for V1 to speed up development.", speaker: "Manager", isImportant: true },
        { id: 't6', time: '02:15', text: "Agreed. I'll update the mocks to reflect that.", speaker: "Designer" }
    ],
    notes: {
        id: 'n-m2',
        title: 'Weekly Sync Notes',
        createdAt: format(subHours(new Date(), 2), 'h:mm a'),
        summary: 'Review of mobile redesign mocks. Decision made to stick to standard components for V1.',
        decisions: ['Use standard components for V1', 'Target Q3 for beta release'],
        actionItems: [
            { id: 'ai-m2-1', text: "Update Figma mocks to remove custom controls", done: false, owner: "Designer", status: 'in-progress', priority: 'high', dueDate: addDays(new Date(), 2) },
            { id: 'ai-m2-2', text: "Audit current design system coverage", done: true, owner: "Dev Lead", status: 'done', priority: 'medium', dueDate: new Date() }
        ]
    },
    outputs: [
        { id: 'out-m2-1', text: "Send summary email to stakeholders", done: true, status: 'done', priority: 'medium' },
        { id: 'out-m2-2', text: "Create Jira epics for Mobile V1", done: false, status: 'todo', priority: 'high' }
    ]
  },
  {
    id: 'm3',
    title: 'Incident Post-Mortem: Auth Service',
    date: subDays(new Date(), 1),
    type: 'Incident',
    status: 'completed',
    attendees: ['SRE Team', 'DevOps'],
    captureStatus: 'completed',
    outputStatus: 'draft',
    actionCount: 8,
    decisionCount: 3,
    hasResearch: false,
    autonomyMode: 'act',
    transcript: [
        { id: 't1', time: '00:00', text: "Starting the post-mortem for the auth outage yesterday.", speaker: "SRE Lead" },
        { id: 't2', time: '00:30', text: "Timeline: Alerts fired at 2am. Mitigation applied at 2:45am.", speaker: "On-call" },
        { id: 't3', time: '01:00', text: "Root cause seems to be the redis cluster failover configuration.", speaker: "SRE Lead", isImportant: true }
    ],
    notes: {
        id: 'n-m3',
        title: 'Auth Service Incident Notes',
        createdAt: format(subDays(new Date(), 1), 'h:mm a'),
        summary: 'Post-mortem for auth service outage. Identified Redis misconfiguration.',
        decisions: ['Update Redis config', 'Add more granular alerting for latency'],
        actionItems: [
            { id: 'ai-m3-1', text: "Patch Redis cluster config", done: true, owner: "DevOps", status: 'done', priority: 'high' },
            { id: 'ai-m3-2', text: "Write RCA document", done: false, owner: "SRE Lead", status: 'todo', priority: 'medium' }
        ]
    },
    outputs: [
        { id: 'out-m3-1', text: "Publish RCA to engineering blog", done: false, status: 'draft', priority: 'medium' }
    ]
  }
];

const generateResearchPacks = (): ResearchPack[] => [
  {
    id: 'r1',
    title: 'Stripe API Changes',
    type: 'tech',
    lastUpdated: subHours(new Date(), 4),
    confidence: 0.92,
    sources: 12,
    changeSummary: 'New endpoints for subscription scheduling added.',
    isMonitored: true
  },
  {
    id: 'r2',
    title: 'Competitor X Pricing Update',
    type: 'competitor',
    lastUpdated: subDays(new Date(), 2),
    confidence: 0.88,
    sources: 5,
    changeSummary: 'Enterprise tier pricing hidden from public view.',
    isMonitored: true
  }
];

// --- Existing Mock Data (Preserved) ---

export const mockFolders: DailyFolder[] = Array.from({ length: 14 }).map((_, i) => {
  const date = subDays(new Date(), i);
  const isToday = i === 0;

  return {
    id: `folder-${i}`,
    date,
    isToday,
    isTranscribing: isToday && i === 0,
    isStarred: i === 2 || i === 5,
    transcriptions: Array.from({ length: isToday ? 2 : 15 }).map((_, j) => ({
      id: `t-${i}-${j}`,
      time: `${9 + Math.floor(j/4)}:${(j%4)*15}`.padStart(5, '0'),
      text: j % 2 === 0
        ? "We need to focus on the user experience for the new feature rollout."
        : "Agreed. Let's schedule a design review for next Tuesday to go over the mocks.",
      speaker: j % 2 === 0 ? "Alex" : "Sarah",
      isImportant: j === 3
    })),
    notes: i === 0 ? [] : (i === 1 ? [
      {
        id: `n-${i}-1`,
        title: "Product Sync",
        createdAt: "10:30 AM",
        summary: "Discussed Q3 roadmap and prioritized mobile notifications.",
        decisions: ["Launch dark mode in Q3", "Delay tablet support"],
        actionItems: [
           { id: `ai-${i}-1-1`, text: "Update Jira tickets", done: true, status: 'done', priority: 'low' },
           { id: `ai-${i}-1-2`, text: "Schedule team demo", done: false, status: 'in-progress', priority: 'medium' }
        ],
        isPinned: true
      },
      {
        id: `n-${i}-2`,
        title: "Design Review",
        createdAt: "02:15 PM",
        summary: "Reviewing the new typography scale and color palette adjustments.",
        decisions: ["Adopt Inter font family", "Increase base font size to 16px"],
        actionItems: [
           { id: `ai-${i}-2-1`, text: "Update design tokens", done: false, status: 'todo', priority: 'high' },
           { id: `ai-${i}-2-2`, text: "Check accessibility contrast", done: true, status: 'done', priority: 'medium' }
        ],
        isPinned: false
      }
    ] : [
      {
        id: `n-${i}-1`,
        title: "Product Sync",
        createdAt: "10:30 AM",
        summary: "Discussed Q3 roadmap and prioritized mobile notifications.",
        decisions: ["Launch dark mode in Q3", "Delay tablet support"],
        actionItems: [
           { id: `ai-${i}-1`, text: "Update Jira tickets", done: true, status: 'done', priority: 'low' },
           { id: `ai-${i}-2`, text: "Schedule team demo", done: false, status: 'todo', priority: 'medium' }
        ],
        isPinned: i === 1
      }
    ]),
    audio: [
      {
        id: `a-${i}-1`,
        startTime: "09:00 AM",
        duration: "45:20",
        name: "Morning Standup"
      }
    ]
  };
});

export const mockMeetings = generateMockMeetings();
export const mockResearch = generateResearchPacks();
