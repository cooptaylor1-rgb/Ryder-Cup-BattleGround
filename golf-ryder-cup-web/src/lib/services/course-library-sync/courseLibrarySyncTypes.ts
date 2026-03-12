export interface CourseLibraryRecord {
  id: string;
  name: string;
  location: string | null;
  city: string | null;
  state: string | null;
  country: string;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  website: string | null;
  notes: string | null;
  source: string;
  api_course_id: string | null;
  is_verified: boolean;
  usage_count: number;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface CourseLibraryTeeSetRecord {
  id: string;
  course_library_id: string;
  name: string;
  color: string | null;
  color_hex: string | null;
  gender: string;
  rating: number | null;
  slope: number | null;
  par: number;
  total_yardage: number | null;
  hole_pars: number[];
  hole_handicaps: number[] | null;
  hole_yardages: number[] | null;
  created_at: string;
  updated_at: string;
}

export interface CourseSyncResult {
  success: boolean;
  courseId: string;
  cloudId?: string;
  error?: string;
  queued?: boolean;
}

export interface BulkSyncResult {
  success: boolean;
  synced: number;
  failed: number;
  queued: number;
  errors: string[];
}

export type SyncStatus = 'synced' | 'pending' | 'syncing' | 'failed' | 'offline';

export type CourseSyncSource = 'user' | 'ocr' | 'api' | 'import';

export interface CourseLibrarySyncQueueStats {
  pending: number;
  syncing: number;
  failed: number;
  completed: number;
}

export interface CloudCourseWithTeeSets extends CourseLibraryRecord {
  course_library_tee_sets?: CourseLibraryTeeSetRecord[];
}

export interface CloudCourseDetails {
  course: CourseLibraryRecord;
  teeSets: CourseLibraryTeeSetRecord[];
}
