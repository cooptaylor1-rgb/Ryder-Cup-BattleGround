/**
 * Native Share API Utility
 *
 * Uses the Web Share API when available, falls back to clipboard copy.
 * Provides typed share functions for trips, match results, standings,
 * and scorecards.
 */

// ============================================
// TYPES
// ============================================

export interface ShareResult {
  shared: boolean;
  method: 'native' | 'clipboard' | 'failed';
}

// ============================================
// CORE SHARE FUNCTION
// ============================================

/**
 * Attempt to share content using the native Web Share API.
 * Falls back to copying text to the clipboard if native share
 * is unavailable or the user cancels.
 */
async function shareContent(data: {
  title: string;
  text: string;
  url?: string;
}): Promise<ShareResult> {
  // Try native Web Share API first
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share(data);
      return { shared: true, method: 'native' };
    } catch (error: unknown) {
      // AbortError means the user cancelled the share dialog
      if (error instanceof DOMException && error.name === 'AbortError') {
        return { shared: false, method: 'failed' };
      }
      // For other errors, fall through to clipboard
    }
  }

  // Fallback: copy to clipboard
  const clipboardText = data.url
    ? `${data.text}\n\n${data.url}`
    : data.text;

  try {
    await navigator.clipboard.writeText(clipboardText);
    return { shared: true, method: 'clipboard' };
  } catch {
    return { shared: false, method: 'failed' };
  }
}

// ============================================
// TYPED SHARE FUNCTIONS
// ============================================

/**
 * Share a trip invite with a join URL.
 *
 * @param tripName - Name of the trip
 * @param joinCode - Unique code to join the trip
 */
export async function shareTrip(
  tripName: string,
  joinCode: string
): Promise<ShareResult> {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const joinUrl = `${origin}/join?code=${encodeURIComponent(joinCode)}`;

  return shareContent({
    title: `Join ${tripName}`,
    text: `You're invited to ${tripName}! Use join code: ${joinCode}`,
    url: joinUrl,
  });
}

/**
 * Share a match result summary.
 *
 * @param matchSummary - Formatted text describing the match outcome
 */
export async function shareMatchResult(
  matchSummary: string
): Promise<ShareResult> {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  return shareContent({
    title: 'Match Result',
    text: matchSummary,
    url: origin,
  });
}

/**
 * Share current standings text.
 *
 * @param standingsText - Formatted standings information
 */
export async function shareStandings(
  standingsText: string
): Promise<ShareResult> {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  return shareContent({
    title: 'Current Standings',
    text: standingsText,
    url: origin,
  });
}

/**
 * Share a scorecard summary.
 *
 * @param scorecardText - Formatted scorecard information
 */
export async function shareScorecard(
  scorecardText: string
): Promise<ShareResult> {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  return shareContent({
    title: 'Scorecard',
    text: scorecardText,
    url: origin,
  });
}

/**
 * Share a banter post from the social feed.
 *
 * @param authorName - Name of the post author
 * @param content - The post content
 */
export async function shareBanterPost(
  authorName: string,
  content: string
): Promise<ShareResult> {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  return shareContent({
    title: 'From the Banter Feed',
    text: `${authorName}: "${content}"`,
    url: origin,
  });
}
