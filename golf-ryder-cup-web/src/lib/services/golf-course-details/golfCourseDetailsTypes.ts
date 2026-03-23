export interface HoleData {
  par: number;
  handicap: number;
  yardage: number | null;
}

export interface TeeSetData {
  name: string;
  color?: string;
  gender?: 'mens' | 'womens' | 'unisex';
  rating?: number;
  slope?: number;
  yardages: (number | null)[];
  totalYardage?: number;
}

export type CourseProfileCompleteness = 'playable' | 'basic' | 'placeholder';

export interface CourseProfileProvenance {
  kind:
    | 'provider'
    | 'web-profile'
    | 'structured-data'
    | 'linked-page'
    | 'scorecard-pdf'
    | 'placeholder';
  label: string;
  url?: string;
  confidence: 'low' | 'medium' | 'high';
}

export interface CourseDetailsResponse {
  id: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  phone?: string;
  website?: string;
  description?: string;
  sourcePageUrl?: string;
  holes: HoleData[];
  teeSets: TeeSetData[];
  source: string;
  dataCompleteness: CourseProfileCompleteness;
  hasPlayableTeeData: boolean;
  provenance: CourseProfileProvenance[];
  sourceAssets?: LinkedCourseAsset[];
  missingFields?: string[];
  duplicateCandidates?: Array<{
    id: string;
    name: string;
    location?: string;
    reason: string;
  }>;
}

export interface ExtractedCourseProfile {
  name?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  phone?: string;
  website?: string;
  description?: string;
  sourcePageUrl?: string;
  holes: HoleData[];
  teeSets: TeeSetData[];
  provenance?: CourseProfileProvenance[];
  sourceAssets?: LinkedCourseAsset[];
}

export interface LinkedCourseAsset {
  url: string;
  label: string;
  kind: 'scorecard' | 'page';
}

export interface CourseDetailsFetchOptions {
  courseId: string;
  website?: string;
  titleHint?: string;
  descriptionHint?: string;
}

export interface PdfTextItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PdfRow {
  y: number;
  items: PdfTextItem[];
}
