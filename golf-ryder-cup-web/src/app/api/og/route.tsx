/**
 * Dynamic OG Image API Route
 *
 * Generates shareable Open Graph images for match results.
 * Uses Next.js ImageResponse for edge-runtime image generation.
 */
import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Extract match data from query params
    const type = searchParams.get('type') || 'default';
    const team1 = searchParams.get('team1') || 'Team USA';
    const team2 = searchParams.get('team2') || 'Team Europe';
    const score1 = searchParams.get('score1') || '0';
    const score2 = searchParams.get('score2') || '0';
    const status = searchParams.get('status') || 'Live';
    const tripName = searchParams.get('trip') || 'Golf Trip';

    // Generate different image types
    if (type === 'match') {
      return generateMatchImage({ team1, team2, score1, score2, status, tripName });
    }

    if (type === 'standings') {
      return generateStandingsImage({ team1, team2, score1, score2, tripName });
    }

    // Default app branding image
    return generateDefaultImage();
  } catch (e) {
    console.error('OG Image generation error:', e);
    return new Response('Failed to generate image', { status: 500 });
  }
}

function generateDefaultImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0a5c36 0%, #064420 100%)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 24,
          }}
        >
          <span style={{ fontSize: 80 }}>⛳</span>
        </div>
        <h1
          style={{
            fontSize: 64,
            fontWeight: 800,
            color: '#ffffff',
            margin: 0,
            textAlign: 'center',
          }}
        >
          Golf Ryder Cup
        </h1>
        <p
          style={{
            fontSize: 28,
            color: '#9ae6b4',
            margin: '16px 0 0 0',
          }}
        >
          The Ultimate Golf Trip Companion
        </p>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}

function generateMatchImage({
  team1,
  team2,
  score1,
  score2,
  status,
  tripName,
}: {
  team1: string;
  team2: string;
  score1: string;
  score2: string;
  status: string;
  tripName: string;
}) {
  const isTeam1Leading = parseFloat(score1) > parseFloat(score2);
  const isTeam2Leading = parseFloat(score2) > parseFloat(score1);
  const isTied = score1 === score2;

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          fontFamily: 'system-ui, sans-serif',
          padding: 48,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 32,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 32 }}>⛳</span>
            <span style={{ fontSize: 24, color: '#9ae6b4', fontWeight: 600 }}>
              {tripName}
            </span>
          </div>
          <div
            style={{
              background: status === 'Final' ? '#22c55e' : '#f59e0b',
              color: '#000',
              padding: '8px 20px',
              borderRadius: 20,
              fontSize: 18,
              fontWeight: 700,
            }}
          >
            {status}
          </div>
        </div>

        {/* Score Display */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 48,
          }}
        >
          {/* Team 1 */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 16,
            }}
          >
            <div
              style={{
                width: 120,
                height: 120,
                borderRadius: 60,
                background: '#1a4a8f',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 48,
                border: isTeam1Leading ? '4px solid #22c55e' : '4px solid transparent',
              }}
            >
              🇺🇸
            </div>
            <span
              style={{
                fontSize: 32,
                color: '#ffffff',
                fontWeight: 700,
              }}
            >
              {team1}
            </span>
            <span
              style={{
                fontSize: 80,
                color: isTeam1Leading ? '#22c55e' : '#ffffff',
                fontWeight: 800,
              }}
            >
              {score1}
            </span>
          </div>

          {/* VS Divider */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span
              style={{
                fontSize: 36,
                color: '#6b7280',
                fontWeight: 600,
              }}
            >
              {isTied ? 'TIED' : 'VS'}
            </span>
          </div>

          {/* Team 2 */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 16,
            }}
          >
            <div
              style={{
                width: 120,
                height: 120,
                borderRadius: 60,
                background: '#1a3a6e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 48,
                border: isTeam2Leading ? '4px solid #22c55e' : '4px solid transparent',
              }}
            >
              🇪🇺
            </div>
            <span
              style={{
                fontSize: 32,
                color: '#ffffff',
                fontWeight: 700,
              }}
            >
              {team2}
            </span>
            <span
              style={{
                fontSize: 80,
                color: isTeam2Leading ? '#22c55e' : '#ffffff',
                fontWeight: 800,
              }}
            >
              {score2}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            paddingTop: 24,
            borderTop: '1px solid #374151',
          }}
        >
          <span style={{ fontSize: 18, color: '#6b7280' }}>
            Golf Ryder Cup App • Track your golf trip competition
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}

function generateStandingsImage({
  team1,
  team2,
  score1,
  score2,
  tripName,
}: {
  team1: string;
  team2: string;
  score1: string;
  score2: string;
  tripName: string;
}) {
  const total1 = parseFloat(score1);
  const total2 = parseFloat(score2);
  const total = total1 + total2 || 1;
  const percent1 = (total1 / total) * 100;

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(135deg, #0a5c36 0%, #064420 100%)',
          fontFamily: 'system-ui, sans-serif',
          padding: 48,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            marginBottom: 32,
          }}
        >
          <span style={{ fontSize: 48 }}>🏆</span>
          <h1
            style={{
              fontSize: 48,
              color: '#ffffff',
              fontWeight: 800,
              marginLeft: 16,
            }}
          >
            {tripName} Standings
          </h1>
        </div>

        {/* Score Bar */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            gap: 24,
          }}
        >
          {/* Team Labels */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span style={{ fontSize: 48 }}>🇺🇸</span>
              <span
                style={{
                  fontSize: 36,
                  color: '#ffffff',
                  fontWeight: 700,
                }}
              >
                {team1}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <span
                style={{
                  fontSize: 36,
                  color: '#ffffff',
                  fontWeight: 700,
                }}
              >
                {team2}
              </span>
              <span style={{ fontSize: 48 }}>🇪🇺</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div
            style={{
              display: 'flex',
              height: 80,
              borderRadius: 40,
              overflow: 'hidden',
              background: '#1a3a6e',
            }}
          >
            <div
              style={{
                width: `${percent1}%`,
                background: 'linear-gradient(90deg, #dc2626, #ef4444)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span
                style={{
                  fontSize: 36,
                  color: '#ffffff',
                  fontWeight: 800,
                }}
              >
                {score1}
              </span>
            </div>
            <div
              style={{
                width: `${100 - percent1}%`,
                background: 'linear-gradient(90deg, #1d4ed8, #3b82f6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span
                style={{
                  fontSize: 36,
                  color: '#ffffff',
                  fontWeight: 800,
                }}
              >
                {score2}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            paddingTop: 24,
          }}
        >
          <span style={{ fontSize: 18, color: '#9ae6b4' }}>
            Golf Ryder Cup App
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
