
export enum UserRole {
  ADMIN = 'Administrator',
  DEVELOPER = 'Developer',
  REPORTER = 'Reporter'
}

export enum TicketStatus {
  OPEN = 'Open',
  TO_BE_INVESTIGATED = 'To be Investigated',
  OPEN_BUG = 'Open Bug', // Confirmed bug
  IN_PROGRESS = 'In Progress',
  PENDING_USER = 'Pending User Info',
  USER_ACCEPTANCE = 'User Acceptance',
  RESOLVED = 'Resolved',
  PARTIALLY_CLOSED = 'Partially Closed',
  CLOSED = 'Closed',
  REOPENED = 'Reopened'
}

export enum TicketPriority {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
  CRITICAL = 'Critical'
}

export enum RelationType {
  DUPLICATE = 'Duplicate of',
  BLOCKS = 'Blocks',
  BLOCKED_BY = 'Blocked by',
  RELATED_TO = 'Related to'
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
  password?: string; // For mock auth
}

export interface Attachment {
  id: string;
  name: string;
  type: 'image' | 'video' | 'document';
  url: string; // Base64 or Blob URL
  base64?: string; // For AI processing
  mimeType?: string;
}

export interface Comment {
  id: string;
  userId: string;
  text: string;
  timestamp: Date;
  isResolution?: boolean;
  isSystem?: boolean;
  attachments?: Attachment[];
  aiAnalysis?: string;
  isAnalyzing?: boolean; // New flag for UI loading state
  aiAnalysisFeedback?: 'positive' | 'negative';
  uatSteps?: string; // Steps to Test / User Acceptance Testing instructions
}

export interface TicketRelation {
  id: string;
  targetTicketId: string;
  type: RelationType;
}

export interface Ticket {
  id: string;
  number: string;
  title: string;
  description: string;
  module: string; // e.g., "Finance", "Inventory"
  affectedDocument?: string; // e.g., "Invoice #1023"
  status: TicketStatus;
  priority: TicketPriority;
  reporterId: string;
  assigneeId?: string;
  createdAt: Date;
  updatedAt: Date;
  stepsToReproduce: string;
  attachments: Attachment[];
  comments: Comment[];
  relations: TicketRelation[];
  aiAnalysis?: string; // Result from Gemini
  aiAnalysisFeedback?: 'positive' | 'negative'; // Feedback for AI model improvement
  satisfactionRating?: number; // 1-5 Star rating
}

export interface AppConfig {
  googleSheetsUrl?: string;
  lastSync?: Date;
  isDark: boolean;
}