import { apiLogger } from '@/lib/utils/logger';

import {
  asNumber,
  asRecord,
  asString,
  buildCourseDetailsResponse,
  coerceHoles,
  coerceTeeSets,
  decodeHtml,
  fetchWithTimeout,
  getSchemaType,
  inferTeeColor,
  stripTags,
  toAbsoluteHttpUrl,
  withProvenance,
} from './golfCourseDetailsShared';
import { extractProfileFromPdfAsset } from './golfCourseDetailsPdf';
import type {
  CourseDetailsResponse,
  ExtractedCourseProfile,
  LinkedCourseAsset,
  TeeSetData,
} from './golfCourseDetailsTypes';

export async function extractFromWebProfile({
  courseId,
  website,
  titleHint,
  descriptionHint,
}: {
  courseId: string;
  website: string;
  titleHint?: string;
  descriptionHint?: string;
}): Promise<CourseDetailsResponse | null> {
  try {
    const response = await fetchWithTimeout(website, {
      headers: {
        'User-Agent': 'GolfRyderCupApp/1.0',
        Accept: 'text/html,application/xhtml+xml',
      },
    });

    if (!response.ok) return null;

    const html = await response.text();
    const structuredRecords = extractJsonLdRecords(html);
    const meta = extractMetaTags(html);
    const pageText = extractPageText(html);
    const linkedAssetProfile = await extractLinkedCourseAssetProfile(html, website);

    const structuredProfile = buildProfileFromStructuredData(structuredRecords);
    const heuristicProfile = buildProfileFromPageSignals(pageText, html);

    const holes = coerceHoles(
      linkedAssetProfile.holes.length > 0
        ? linkedAssetProfile.holes
        : structuredProfile.holes.length > 0
          ? structuredProfile.holes
          : heuristicProfile.holes
    );
    const teeSets = coerceTeeSets(
      linkedAssetProfile.teeSets.length > 0
        ? linkedAssetProfile.teeSets
        : structuredProfile.teeSets.length > 0
          ? structuredProfile.teeSets
          : heuristicProfile.teeSets
    );

    const sourcePageUrl =
      linkedAssetProfile.sourcePageUrl || structuredProfile.sourcePageUrl || website;
    const provenance = linkedAssetProfile.provenance?.length
      ? linkedAssetProfile.provenance
      : structuredProfile.provenance?.length
        ? structuredProfile.provenance
        : withProvenance(undefined, {
            kind: 'web-profile',
            label: 'Public course profile',
            url: website,
            confidence: 'medium',
          });

    return buildCourseDetailsResponse({
      id: courseId,
      name:
        linkedAssetProfile.name ||
        structuredProfile.name ||
        heuristicProfile.name ||
        meta.ogTitle ||
        meta.title ||
        titleHint ||
        'Unknown Course',
      address: linkedAssetProfile.address || structuredProfile.address || heuristicProfile.address,
      city: linkedAssetProfile.city || structuredProfile.city || heuristicProfile.city,
      state: linkedAssetProfile.state || structuredProfile.state || heuristicProfile.state,
      country: linkedAssetProfile.country || structuredProfile.country || heuristicProfile.country,
      phone: linkedAssetProfile.phone || structuredProfile.phone || heuristicProfile.phone,
      website: structuredProfile.website || meta.canonical || website,
      description:
        linkedAssetProfile.description ||
        structuredProfile.description ||
        heuristicProfile.description ||
        meta.description ||
        descriptionHint,
      sourcePageUrl,
      holes,
      teeSets,
      source:
        teeSets.length > 0 || holes.some((hole) => hole.yardage !== null)
          ? 'web-extracted'
          : 'web-profile',
      provenance,
      sourceAssets: linkedAssetProfile.sourceAssets,
    });
  } catch (error) {
    apiLogger.error('Web profile extraction error:', { website, error });
    return null;
  }
}

async function extractLinkedCourseAssetProfile(
  html: string,
  baseUrl: string
): Promise<ExtractedCourseProfile> {
  const assets = extractLinkedCourseAssets(html, baseUrl);

  for (const asset of assets) {
    if (asset.kind === 'scorecard') {
      const pdfProfile = await extractProfileFromPdfAsset(asset.url);
      if (pdfProfile.teeSets.length > 0 || pdfProfile.holes.length > 0) {
        return {
          ...pdfProfile,
          sourceAssets: assets,
          provenance: withProvenance(pdfProfile.provenance, {
            kind: 'scorecard-pdf',
            label: asset.label || 'Linked scorecard PDF',
            url: asset.url,
            confidence: 'high',
          }),
        };
      }
      continue;
    }

    const nestedProfile = await extractProfileFromLinkedPage(asset.url);
    if (nestedProfile.teeSets.length > 0 || nestedProfile.holes.length > 0) {
      return {
        ...nestedProfile,
        sourceAssets: assets,
        provenance: nestedProfile.provenance?.length
          ? nestedProfile.provenance
          : [
              {
                kind: 'linked-page',
                label: asset.label || 'Linked course page',
                url: asset.url,
                confidence: 'medium',
              },
            ],
      };
    }
  }

  return {
    holes: [],
    teeSets: [],
    sourceAssets: assets,
  };
}

function extractLinkedCourseAssets(html: string, baseUrl: string): LinkedCourseAsset[] {
  const matches = html.matchAll(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi);
  const seen = new Set<string>();
  const assets: Array<LinkedCourseAsset & { score: number }> = [];

  for (const match of matches) {
    const href = decodeHtml(match[1] || '').trim();
    const label = decodeHtml(stripTags(match[2] || '').replace(/\s+/g, ' ').trim());
    const url = toAbsoluteHttpUrl(href, baseUrl);
    if (!url || seen.has(url)) continue;
    seen.add(url);

    const haystack = `${label} ${href}`.toLowerCase();
    const scorecardLike = /scorecard|score card|yardage|yardages|ratings?|slope|course guide/i.test(
      haystack
    );
    const pdfLike = url.toLowerCase().includes('.pdf');
    const pageLike = /course|golf|links|roost|karoo|squeeze|wedge/i.test(haystack);

    if (!scorecardLike && !pdfLike && !pageLike) continue;

    assets.push({
      url,
      label,
      kind: scorecardLike || pdfLike ? 'scorecard' : 'page',
      score: (scorecardLike ? 100 : 0) + (pdfLike ? 50 : 0) + (pageLike ? 10 : 0),
    });
  }

  return assets.sort((a, b) => b.score - a.score).map(({ score: _score, ...asset }) => asset);
}

async function extractProfileFromLinkedPage(pageUrl: string): Promise<ExtractedCourseProfile> {
  try {
    const response = await fetchWithTimeout(pageUrl, {
      headers: {
        'User-Agent': 'GolfRyderCupApp/1.0',
        Accept: 'text/html,application/xhtml+xml',
      },
    });

    if (!response.ok) {
      return { holes: [], teeSets: [] };
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('pdf') || pageUrl.toLowerCase().endsWith('.pdf')) {
      return extractProfileFromPdfAsset(pageUrl);
    }

    const html = await response.text();
    const pageText = extractPageText(html);
    const structuredProfile = buildProfileFromStructuredData(extractJsonLdRecords(html));
    const heuristicProfile = buildProfileFromPageSignals(pageText, html);
    const nestedAssetProfile = await extractLinkedCourseAssetProfile(html, pageUrl);

    return {
      name: structuredProfile.name || heuristicProfile.name,
      address: structuredProfile.address || heuristicProfile.address,
      city: structuredProfile.city || heuristicProfile.city,
      state: structuredProfile.state || heuristicProfile.state,
      country: structuredProfile.country || heuristicProfile.country,
      phone: structuredProfile.phone || heuristicProfile.phone,
      website: structuredProfile.website || pageUrl,
      description: structuredProfile.description || heuristicProfile.description,
      sourcePageUrl: nestedAssetProfile.sourcePageUrl || pageUrl,
      holes:
        nestedAssetProfile.holes.length > 0
          ? nestedAssetProfile.holes
          : structuredProfile.holes.length > 0
            ? structuredProfile.holes
            : heuristicProfile.holes,
      teeSets:
        nestedAssetProfile.teeSets.length > 0
          ? nestedAssetProfile.teeSets
          : structuredProfile.teeSets.length > 0
            ? structuredProfile.teeSets
            : heuristicProfile.teeSets,
      provenance:
        nestedAssetProfile.provenance?.length
          ? nestedAssetProfile.provenance
          : structuredProfile.provenance?.length
            ? structuredProfile.provenance
            : [
                {
                  kind: 'linked-page',
                  label: 'Linked course page',
                  url: pageUrl,
                  confidence: 'medium',
                },
              ],
      sourceAssets: nestedAssetProfile.sourceAssets,
    };
  } catch (error) {
    apiLogger.error('Linked profile extraction error:', { pageUrl, error });
    return { holes: [], teeSets: [] };
  }
}

function extractJsonLdRecords(html: string): Record<string, unknown>[] {
  const records: Record<string, unknown>[] = [];
  const matches = html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  );

  for (const match of matches) {
    const raw = match[1]?.trim();
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw);
      const items = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.['@graph'])
          ? parsed['@graph']
          : [parsed];

      for (const item of items) {
        if (item && typeof item === 'object') {
          records.push(item as Record<string, unknown>);
        }
      }
    } catch {
      // ignore malformed fragments
    }
  }

  return records;
}

function extractMetaTags(html: string): {
  title?: string;
  ogTitle?: string;
  description?: string;
  canonical?: string;
} {
  const readMeta = (pattern: RegExp) => {
    const match = pattern.exec(html);
    return match?.[1] ? decodeHtml(stripTags(match[1]).trim()) : undefined;
  };

  return {
    title: readMeta(/<title[^>]*>([\s\S]*?)<\/title>/i),
    ogTitle: readMeta(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i),
    description:
      readMeta(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
      readMeta(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i),
    canonical:
      readMeta(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i) ||
      readMeta(/<meta[^>]+property=["']og:url["'][^>]+content=["']([^"']+)["']/i),
  };
}

function buildProfileFromStructuredData(records: Record<string, unknown>[]): ExtractedCourseProfile {
  const profile: ExtractedCourseProfile = {
    holes: [],
    teeSets: [],
  };

  for (const record of records) {
    const type = getSchemaType(record);
    if (
      !type.some((entry) =>
        /GolfCourse|SportsActivityLocation|LocalBusiness|Place|Organization/i.test(entry)
      )
    ) {
      continue;
    }

    const address = asRecord(record.address);
    const geo = asRecord(record.geo);
    const teeSets = extractTeeSetsFromStructuredRecord(record);

    if (!profile.name) profile.name = asString(record.name);
    if (!profile.description) profile.description = asString(record.description);
    if (!profile.phone) profile.phone = asString(record.telephone);
    if (!profile.website) profile.website = asString(record.url);
    if (!profile.address) {
      profile.address =
        [
          asString(address.streetAddress),
          asString(address.addressLocality),
          asString(address.addressRegion),
        ]
          .filter(Boolean)
          .join(', ') || undefined;
    }
    if (!profile.city) profile.city = asString(address.addressLocality);
    if (!profile.state) profile.state = asString(address.addressRegion);
    if (!profile.country) profile.country = asString(address.addressCountry);

    if (teeSets.length > 0 && profile.teeSets.length === 0) {
      profile.teeSets = teeSets;
    }

    if (profile.holes.length === 0) {
      const holes = extractHolesFromStructuredRecord(record);
      if (holes.length > 0) profile.holes = holes;
    }

    if (!profile.address && geo && (asNumber(geo.latitude) || asNumber(geo.longitude))) {
      profile.address = undefined;
    }
  }

  if (profile.name || profile.description || profile.teeSets.length > 0 || profile.holes.length > 0) {
    profile.provenance = [
      {
        kind: 'structured-data',
        label: 'Structured course metadata',
        confidence: 'high',
      },
    ];
  }

  return profile;
}

function buildProfileFromPageSignals(pageText: string, html: string): ExtractedCourseProfile {
  const teeSets = extractTeeSetsFromText(pageText, html);
  const holes = extractHoleDataFromText(pageText);
  const phone = pageText.match(
    /(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]\d{4}/
  )?.[0];
  const addressMatch = pageText.match(
    /\b\d{1,5}\s+[A-Za-z0-9.'#\-\s]+,\s*[A-Za-z.\-\s]+,\s*[A-Z]{2}\s+\d{5}(?:-\d{4})?/i
  );
  const description = summarizePageText(pageText);
  const location = extractLocationFromText(pageText);

  return {
    address: addressMatch?.[0],
    city: location.city,
    state: location.state,
    country: location.country,
    phone,
    description,
    holes,
    teeSets,
  };
}

function extractPageText(html: string): string {
  return decodeHtml(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

function extractLocationFromText(pageText: string): {
  city?: string;
  state?: string;
  country?: string;
} {
  const usLocation = pageText.match(/\b([A-Z][a-zA-Z.\-\s]+),\s*([A-Z]{2})\b/);
  if (usLocation) {
    return {
      city: usLocation[1].trim(),
      state: usLocation[2].trim(),
    };
  }

  const internationalLocation = pageText.match(
    /\b([A-Z][a-zA-Z.\-\s]+),\s*([A-Z][a-zA-Z.\-\s]+),\s*(Scotland|England|Ireland|Wales|Canada|Australia|New Zealand|United States)\b/
  );
  if (internationalLocation) {
    return {
      city: internationalLocation[1].trim(),
      state: internationalLocation[2].trim(),
      country: internationalLocation[3].trim(),
    };
  }

  return {};
}

function summarizePageText(pageText: string): string | undefined {
  const sentences = pageText
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(
      (sentence) =>
        sentence.length >= 60 &&
        sentence.length <= 220 &&
        /course|golf|links|club|resort/i.test(sentence)
    );

  return sentences[0];
}

function extractTeeSetsFromStructuredRecord(record: Record<string, unknown>): TeeSetData[] {
  const teeCandidates = [
    ...(Array.isArray(record.teeSets) ? record.teeSets : []),
    ...(Array.isArray(record.amenityFeature) ? record.amenityFeature : []),
  ];

  return teeCandidates
    .map((entry) => asRecord(entry))
    .map((entry): TeeSetData | null => {
      const name = asString(entry.name);
      if (!name) return null;

      const rating = asNumber(entry.courseRating) ?? asNumber(entry.ratingValue);
      const slope = asNumber(entry.slopeRating) ?? asNumber(entry.slope);
      const totalYardage = asNumber(entry.totalYardage) ?? asNumber(entry.yardage);

      return {
        name,
        color: inferTeeColor(name),
        rating: rating ?? undefined,
        slope: slope ?? undefined,
        totalYardage: totalYardage ?? undefined,
        yardages: Array(18).fill(null),
      };
    })
    .filter((tee): tee is TeeSetData => tee !== null);
}

function extractHolesFromStructuredRecord(record: Record<string, unknown>) {
  const candidates = Array.isArray(record.holes) ? record.holes : [];
  const holes = candidates
    .map((entry) => asRecord(entry))
    .map((entry) => ({
      par: asNumber(entry.par) ?? 4,
      handicap: asNumber(entry.handicap) ?? asNumber(entry.index) ?? 0,
      yardage: asNumber(entry.yardage),
    }))
    .filter((hole) => hole.handicap > 0);

  return holes.length === 18 ? holes : [];
}

function extractTeeSetsFromText(pageText: string, html: string): TeeSetData[] {
  const tees: TeeSetData[] = [];
  const patterns = [
    /\b(Black|Blue|White|Gold|Red|Green|Silver|Orange|Championship|Forward|Members?|Ladies?)\s+(?:tees?|markers?)?\s*(?:[-:])?\s*(?:rating\s*)?(\d{2}\.\d)\s*[\/-]\s*(\d{2,3})/gi,
    /\b(Black|Blue|White|Gold|Red|Green|Silver|Orange|Championship|Forward|Members?|Ladies?)\s+(?:tees?|markers?)?.{0,80}?(\d{2}\.\d)\s*[\/-]\s*(\d{2,3})/gi,
  ];

  for (const pattern of patterns) {
    const matches = pageText.matchAll(pattern);
    for (const match of matches) {
      const name = match[1]?.trim();
      const rating = Number.parseFloat(match[2]);
      const slope = Number.parseInt(match[3], 10);
      if (!name || Number.isNaN(rating) || Number.isNaN(slope)) continue;
      if (tees.some((tee) => tee.name.toLowerCase() === name.toLowerCase())) continue;

      tees.push({
        name,
        color: inferTeeColor(name),
        rating,
        slope,
        yardages: Array(18).fill(null),
      });
    }
  }

  const yardageMatches = Array.from(
    html.matchAll(/\b(\d{3,4})\s*(?:yards?|yds?)\b/gi),
    (match) => Number.parseInt(match[1], 10)
  ).filter((value) => value >= 3000 && value <= 8000);

  if (yardageMatches.length > 0 && tees.length > 0) {
    tees[0].totalYardage = yardageMatches[0];
  }

  return tees;
}

function extractHoleDataFromText(pageText: string) {
  const pars = Array.from(pageText.matchAll(/\bPar\s*([345])\b/gi), (match) =>
    Number.parseInt(match[1], 10)
  );
  const handicaps = Array.from(
    pageText.matchAll(/\b(?:HCP|Handicap)\s*(\d{1,2})\b/gi),
    (match) => Number.parseInt(match[1], 10)
  );

  if (pars.length >= 18) {
    return Array.from({ length: 18 }, (_, index) => ({
      par: pars[index] ?? 4,
      handicap: handicaps[index] ?? index + 1,
      yardage: null,
    }));
  }

  return [];
}
