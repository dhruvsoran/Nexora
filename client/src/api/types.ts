export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  title?: string;
  bio?: string;
}

export interface WorkspaceSummary {
  id: string;
  name: string;
  description: string;
  key: string;
  logo: string;
  role: 'owner' | 'admin' | 'member';
  plan: string;
  boardCount: number;
  createdAt: string;
}

export interface MemberProfile {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  title?: string;
}

export interface WorkspaceMember {
  user: string;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
  profile: MemberProfile | null;
}

export interface BoardSummary {
  id: string;
  name: string;
  description: string;
  key: string;
  color: string;
  createdAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  description: string;
  key: string;
  logo: string;
  owner: string;
  invitedEmails: string[];
  createdAt: string;
  boards: BoardSummary[];
  members: WorkspaceMember[];
  myRole: string;
  subscription: {
    plan: string;
    status: string;
    startsAt?: string;
    endsAt?: string | null;
  };
}

export interface Column {
  id: string;
  name: string;
  color: string;
  order: number;
  limit: number;
}

export interface TaskAssignee {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface TaskDependency {
  id: string;
  title: string;
  status: string;
}

export interface TaskSubtask {
  _id: string;
  title: string;
  completed: boolean;
}

export interface VoiceNote {
  _id?: string;
  id?: string;
  publicId: string;
  url: string;
  name?: string;
  durationMs: number;
  mime?: string;
  by: { _id?: string; id?: string; name: string } | null;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  columnId: string;
  order: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  labels: string[];
  storyPoints: number;
  dueDate: string | null;
  completedAt: string | null;
  milestone: {
    _id: string;
    name: string;
    color: string;
    description: string;
  } | null;
  dependencies: TaskDependency[];
  subtasks: TaskSubtask[];
  timeEstimate: number;
  timeSpent: number;
  attachmentsCount: number;
  attachments: Attachment[];
  voiceNotes?: VoiceNote[];
  assignees: TaskAssignee[];
  createdBy: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

export interface Milestone {
  _id: string;
  name: string;
  description: string;
  color: string;
  dueDate: string | null;
  board: string;
  createdAt: string;
  progress: number;
  tasks: Task[];
}

export interface Board {
  id: string;
  name: string;
  description: string;
  key: string;
  color: string;
  workspace: string;
  workspaceName: string;
  createdAt: string;
  columns: Column[];
  tasks: Task[];
  milestones: Milestone[];
}

export interface TaskDetail {
  task: Task & { attachments: Attachment[] };
  comments: CommentItem[];
  activities: ActivityItem[];
}

export interface Attachment {
  publicId: string;
  url: string;
  name: string;
  size: number;
}

export interface CommentItem {
  _id: string;
  body: string;
  attachments: Attachment[];
  author: { _id: string; name: string; email: string; avatar?: string };
  createdAt: string;
}

export interface ActivityItem {
  _id: string;
  type: string;
  message: string;
  author: { _id: string; name: string; avatar?: string };
  createdAt: string;
}

export interface Channel {
  _id: string;
  name: string;
  description: string;
  type: 'channel' | 'direct';
  members: MemberProfile[];
  lastMessageAt: string | null;
  createdAt: string;
}

export interface MessageItem {
  _id: string;
  channel?: string;
  body: string;
  attachments: Attachment[];
  sender: { _id: string; name: string; email: string; avatar?: string };
  createdAt: string;
}

export interface BoardStats {
  total: number;
  completed: number;
  completedRate: number;
  overdue: number;
  dueSoon: number;
  byColumn: Record<string, number>;
  byPriority: Record<string, number>;
  byLabel: Record<string, number>;
  workload: Array<{ id: string; name: string; count: number; points: number }>;
}

export interface BurndownPoint {
  date: string;
  created: number;
  completed: number;
}

export interface NotificationItem {
  _id: string;
  type: string;
  title: string;
  body: string;
  link: string;
  read: boolean;
  actor: { _id: string; name: string; avatar?: string } | null;
  createdAt: string;
}