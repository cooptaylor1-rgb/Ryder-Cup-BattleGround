import type { CourseProfile } from '@/lib/types/courseProfile';

export interface CourseDuplicateCandidate {
  id: string;
  name: string;
  location?: string;
  reason: string;
}

function normalizeToken(value?: string | null): string {
  return value
    ?.trim()
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() ?? '';
}

function normalizeHostname(value?: string | null): string {
  if (!value) {
    return '';
  }

  try {
    return new URL(value).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

export function buildCanonicalCourseKey({
  name,
  city,
  state,
  country,
  sourceUrl,
}: {
  name?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  sourceUrl?: string | null;
}): string {
  return [
    normalizeToken(name),
    normalizeToken(city),
    normalizeToken(state),
    normalizeToken(country),
    normalizeHostname(sourceUrl),
  ].join('|');
}

export function findDuplicateCourseProfiles({
  name,
  city,
  state,
  country,
  sourceUrl,
  existingProfiles,
}: {
  name?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  sourceUrl?: string | null;
  existingProfiles: CourseProfile[];
}): CourseDuplicateCandidate[] {
  const incomingName = normalizeToken(name);
  const incomingCity = normalizeToken(city);
  const incomingState = normalizeToken(state);
  const incomingCountry = normalizeToken(country);
  const incomingHostname = normalizeHostname(sourceUrl);
  const incomingCanonicalKey = buildCanonicalCourseKey({
    name,
    city,
    state,
    country,
    sourceUrl,
  });

  return existingProfiles.flatMap((profile) => {
    const existingCanonicalKey =
      profile.canonicalKey ||
      buildCanonicalCourseKey({
        name: profile.name,
        city: profile.location,
        state: profile.location,
        country: profile.location,
        sourceUrl: profile.sourceUrl,
      });

    const normalizedExistingName = normalizeToken(profile.name);
    const normalizedExistingLocation = normalizeToken(profile.location);
    const existingHostname = normalizeHostname(profile.sourceUrl);

    if (incomingCanonicalKey === existingCanonicalKey && incomingName) {
      return [
        {
          id: profile.id,
          name: profile.name,
          location: profile.location,
          reason: 'Exact course + location match',
        },
      ];
    }

    if (
      incomingName &&
      normalizedExistingName === incomingName &&
      ((incomingCity && normalizedExistingLocation.includes(incomingCity)) ||
        (incomingState && normalizedExistingLocation.includes(incomingState)) ||
        (incomingCountry && normalizedExistingLocation.includes(incomingCountry)))
    ) {
      return [
        {
          id: profile.id,
          name: profile.name,
          location: profile.location,
          reason: 'Same course name and location',
        },
      ];
    }

    if (incomingName && normalizedExistingName === incomingName && incomingHostname && existingHostname && incomingHostname === existingHostname) {
      return [
        {
          id: profile.id,
          name: profile.name,
          location: profile.location,
          reason: 'Same course name and source site',
        },
      ];
    }

    return [];
  });
}
