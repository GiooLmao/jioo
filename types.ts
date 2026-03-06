
export type ReportStatus = 'reported' | 'reviewed' | 'in_progress' | 'resolved';

export type UserRole = 'user' | 'government' | 'developer';

export interface AppUser {
  id: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
}

export interface ReportCategoryData {
  id: string;
  label: string;
  subCategories: { id: string; label: string }[];
}

export type HazardLevel = 'low' | 'medium' | 'high';

export interface Comment {
  id: string;
  text: string;
  author: string;
  timestamp: number;
}

export interface AppNotification {
  id: string;
  userId: string; // Target user
  title: string;
  message: string;
  type: 'status_change' | 'flagged' | 'new_report';
  timestamp: number;
  read: boolean;
  relatedReportId?: string;
}

export interface FlaggedReport {
  id: string;
  reportId: string;
  reason: string;
  flaggedBy: string;
  timestamp: number;
}

export interface Report {
  id: string;
  lat: number;
  lng: number;
  address?: string;
  mainCategory: string;
  subCategory: string;
  categoryLabel: string;
  description: string;
  photoUrl: string | null;
  afterPhotoUrl?: string | null;
  timestamp: number;
  hazardLevel: HazardLevel;
  status: ReportStatus;
  upvotes: number;
  isVerifiedByCurrentUser?: boolean;
  impactMetric?: string;
  comments?: Comment[];
  reporterId?: string; // Track who made the report for notifications
}

export interface NewReportForm {
  lat: number;
  lng: number;
}
