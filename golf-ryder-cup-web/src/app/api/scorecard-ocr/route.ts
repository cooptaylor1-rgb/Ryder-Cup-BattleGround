import { NextRequest, NextResponse } from 'next/server';
import { applyRateLimitAsync, addRateLimitHeaders, requireJson, validateBodySize } from '@/lib/utils/apiMiddleware';
import { RATE_LIMIT_EXPENSIVE } from '@/lib/constants/rateLimits';
import { ocrLogger } from '@/lib/utils/logger';
import { ocrRequestSchema, formatZodError, type OcrRequest, type OcrImageData } from '@/lib/validations/api';

/**
 * SCORECARD OCR API
 *
 * Accepts an image (base64 encoded) of a golf scorecard and uses
 * AI vision to extract hole data (par, handicap, yardage).
 *
 * Supports multiple AI providers:
 * 1. Anthropic Claude (preferred - best accuracy for tables)
 * 2. OpenAI GPT-4o (fallback)
 *
 * Also supports PDF files via Claude's document type.
 */


// Max body size: 10MB for image uploads
const MAX_BODY_SIZE = 10 * 1024 * 1024;

interface HoleData {
  par: number;
  handicap: number;
  yardage: number | null;
}

interface TeeSetData {
  name: string;
  color?: string;
  rating?: number;
  slope?: number;
  yardages: (number | null)[];
}

interface ScorecardData {
  courseName?: string;
  teeName?: string;
  rating?: number;
  slope?: number;
  holes: HoleData[];
  teeSets?: TeeSetData[];
}

// Use types from validation schema
type ImageData = OcrImageData;
type RequestBody = OcrRequest;

const EXTRACTION_PROMPT = `You are an expert golf scorecard data extractor. Your job is to read every number on this scorecard with extreme precision, cell by cell.

STEP 1 — IDENTIFY THE LAYOUT
Scorecards are tables. First, identify the structure:
- The TOP half typically contains Holes 1-9 (Front Nine), ending with an "OUT" totals column.
- The BOTTOM half typically contains Holes 10-18 (Back Nine), ending with "IN" and "TOTAL" columns.
- Some scorecards place all 18 holes in a single long row.

STEP 2 — IDENTIFY EVERY ROW
Read the ROW LABELS on the left side of the table. Common rows include:
- HOLE: The hole numbers (1-9, 10-18)
- TEE YARDAGE ROWS: Multiple rows, one per tee color (Black, Blue, White, Gold, Red, Green, etc.)
  - The topmost yardage row is usually the longest tees
  - The bottommost yardage row is usually the shortest tees
  - Labels may say: Black, Championship, Blue, White, Gold, Senior, Red, Forward, Ladies, etc.
- PAR: Values of 3, 4, or 5 for each hole
- HANDICAP / HDCP / HCP: Difficulty ranking 1-18 (1 = hardest hole)
  - There may be separate M HANDICAP (Men) and W HANDICAP (Women) rows — use the Men's row
- YARDAGE TOTALS: "OUT", "IN", and "TOTAL" columns at the edges

STEP 3 — EXTRACT CELL BY CELL
For each identified row, read EVERY cell left to right. Do NOT guess or interpolate — read the actual printed number. If a cell is unclear, use your best reading of the digits visible.

STEP 4 — CROSS-CHECK YOUR WORK
- Front 9 pars should sum to 34-37 (typically 36). Back 9 pars should sum to 34-37 (typically 36).
- Total par for 18 holes is usually 70-72.
- Handicap values 1-18 should each appear exactly once across all 18 holes.
- Yardages should decrease from the longest tee to the shortest tee for each hole.
- The "OUT" column should equal the sum of holes 1-9 for each row. Same for "IN" and holes 10-18.

RETURN THIS EXACT JSON FORMAT:
{
  "courseName": "Course name if visible anywhere on the scorecard",
  "holes": [
    {"par": 4, "handicap": 3, "yardage": 430},
    {"par": 3, "handicap": 15, "yardage": 210},
    ... ALL 18 holes in order (hole 1 through hole 18)
  ],
  "teeSets": [
    {
      "name": "Black",
      "color": "#000000",
      "rating": 74.2,
      "slope": 138,
      "yardages": [430, 210, 601, ...]
    },
    {
      "name": "Blue",
      "color": "#1E40AF",
      "rating": 72.1,
      "slope": 131,
      "yardages": [410, 195, 575, ...]
    }
  ]
}

RULES:
- "holes" array MUST have exactly 18 entries, one per hole in order.
- "holes[].yardage" should use the FIRST (longest) tee set's yardage.
- "teeSets" should include EVERY tee row visible on the scorecard.
- Each tee's "yardages" array MUST have exactly 18 numbers.
- Include "rating" and "slope" for each tee set IF they appear on the scorecard (often printed near the tee name or on the back of the card).
- Use standard hex color codes: Black=#000000, Blue=#1E40AF, White=#F1F5F9, Gold=#CA8A04, Red=#DC2626, Green=#16A34A, Silver=#9E9E9E, Orange=#EA580C, Tangerine=#FF9966, Maroon=#800000, Purple=#7B2D8B, Teal=#008080, Champagne=#F7E7CE, Copper=#B87333, Bronze=#CD7F32, Combo/Mixed=#888888.
- If a tee name does not match any standard color above, pick the closest hex color that visually represents the name (e.g., "Tangerine/Silver" → "#C8A870").
- Always use the EXACT tee name as printed on the scorecard (e.g., "TANGERINE / SILVER", not just "Tangerine").
- Return ONLY the JSON object — no explanation, no markdown fences.`;

const MULTI_IMAGE_PROMPT = `You are an expert golf scorecard data extractor. You have multiple images of a golf scorecard. Read every number cell by cell with extreme precision.

STEP 1 — ANALYZE EACH IMAGE
- Image 1 (typically the FRONT of the scorecard): Contains the hole-by-hole table with yardages, pars, and handicaps.
- Image 2 (typically the BACK of the scorecard): Contains course name, tee ratings, slopes, and additional info.
- Some images may show different sections of the same table.

STEP 2 — EXTRACT FROM THE TABLE IMAGE(S)
Read each row left to right, cell by cell:
- HOLE ROW: Numbers 1-9 (Front) and 10-18 (Back)
- TEE YARDAGE ROWS: One row per tee color. Read the label on the left (Black, Blue, White, Gold, Red, etc.)
- PAR ROW: Values 3, 4, or 5 for each hole
- HANDICAP ROW: Values 1-18 (use Men's handicap row if there are separate M/W rows)

STEP 3 — EXTRACT FROM THE INFO IMAGE(S)
- Course name and club name
- Tee set ratings and slopes (e.g., "Blue Tees: Rating 72.1 / Slope 131")

STEP 4 — MERGE AND CROSS-CHECK
- Match yardage rows to tee names/ratings by color or order
- Front 9 pars should sum to ~36. Back 9 pars should sum to ~36. Total ~72.
- Handicap values 1-18 should each appear exactly once
- Yardages should decrease from longest tee to shortest for each hole
- Check that "OUT"/"IN"/"TOTAL" columns match the sums of the individual holes

Return this JSON:
{
  "courseName": "Full course name",
  "holes": [
    {"par": 4, "handicap": 7, "yardage": 385},
    ... ALL 18 holes in order, using the longest tee for yardage
  ],
  "teeSets": [
    {
      "name": "Black",
      "color": "#000000",
      "rating": 74.2,
      "slope": 138,
      "yardages": [385, 165, 520, 410, 195, 545, 340, 180, 430, 395, 155, 510, 425, 185, 560, 365, 170, 445]
    },
    ... INCLUDE EVERY TEE SET visible
  ]
}

RULES:
- "holes" must have exactly 18 entries.
- Each tee's "yardages" must have exactly 18 numbers.
- Use standard hex color codes: Black=#000000, Blue=#1E40AF, White=#F1F5F9, Gold=#CA8A04, Red=#DC2626, Green=#16A34A, Silver=#9E9E9E, Orange=#EA580C, Tangerine=#FF9966, Maroon=#800000, Combo/Mixed=#888888. For non-standard names, pick the closest hex color visually.
- Always use the EXACT tee name as printed on the scorecard.
- Return ONLY the JSON object — no explanation, no markdown fences.`;

export async function POST(request: NextRequest) {
  // Apply rate limiting (more restrictive due to AI API costs)
  const rateLimitError = await applyRateLimitAsync(request, RATE_LIMIT_EXPENSIVE);
  if (rateLimitError) {
    return rateLimitError;
  }

  // Validate body size (10MB max for images)
  const contentLength = parseInt(request.headers.get('content-length') || '0', 10);
  const bodySizeError = validateBodySize(contentLength, MAX_BODY_SIZE);
  if (bodySizeError) {
    return bodySizeError;
  }

  // Require JSON content type
  const jsonError = requireJson(request);
  if (jsonError) {
    return jsonError;
  }

  // Debug logging enabled in development (used in catch blocks below)
  const _isDev = process.env.NODE_ENV === 'development';

  try {
    const rawBody = await request.json();

    // Validate request body with Zod
    const parseResult = ocrRequestSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: formatZodError(parseResult.error),
        },
        { status: 400 }
      );
    }

    const body: RequestBody = parseResult.data;

    // Support both single image and multiple images
    const images: ImageData[] = [];

    if (body.images && body.images.length > 0) {
      // Multiple images provided
      images.push(...body.images);
    } else if (body.image && body.mimeType) {
      // Single image (backward compatible)
      images.push({ image: body.image, mimeType: body.mimeType });
    }

    // Determine which AI provider to use
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;
    const preferredProvider = body.provider || 'auto';

    let result: ScorecardData | null = null;
    let usedProvider = '';

    // Try Claude first (better at structured data extraction)
    if ((preferredProvider === 'claude' || preferredProvider === 'auto') && anthropicKey) {
      if (images.length > 1) {
        result = await extractWithClaudeMultiple(images, anthropicKey);
      } else {
        result = await extractWithClaude(images[0].image, images[0].mimeType, anthropicKey);
      }
      usedProvider = 'claude';
    }

    // Fall back to OpenAI if Claude fails or not available
    if (!result && openaiKey) {
      if (images.length > 1) {
        result = await extractWithOpenAIMultiple(images, openaiKey);
      } else {
        result = await extractWithOpenAI(images[0].image, images[0].mimeType, openaiKey);
      }
      usedProvider = 'openai';
    }

    // No API keys configured - return demo data
    if (!result && !anthropicKey && !openaiKey) {
      return NextResponse.json({
        success: true,
        data: getMockScorecardData(),
        message: 'Demo mode: Configure ANTHROPIC_API_KEY or OPENAI_API_KEY for real OCR',
        provider: 'demo',
      });
    }

    if (!result) {
      ocrLogger.error('All extraction attempts failed');
      return NextResponse.json({ error: 'Failed to extract scorecard data' }, { status: 500 });
    }

    // Validate and clean the data
    const cleanedData = validateAndCleanData(result);

    let res = NextResponse.json({
      success: true,
      data: cleanedData,
      provider: usedProvider,
      extractionStats: {
        holesExtracted: cleanedData.holes?.length || 0,
        teeSetsExtracted: cleanedData.teeSets?.length || 0,
        hasRatings: cleanedData.teeSets?.some(t => t.rating) || false,
        hasSlopes: cleanedData.teeSets?.some(t => t.slope) || false,
      },
    });
    res = addRateLimitHeaders(res, request, RATE_LIMIT_EXPENSIVE);
    return res;
  } catch (error) {
    ocrLogger.error('Scorecard OCR error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
}

function buildClaudeContentBlock(base64Data: string, mimeType: string) {
  if (mimeType === 'application/pdf') {
    return {
      type: 'document' as const,
      source: {
        type: 'base64' as const,
        media_type: 'application/pdf' as const,
        data: base64Data,
      },
    };
  }
  return {
    type: 'image' as const,
    source: {
      type: 'base64' as const,
      media_type: mimeType,
      data: base64Data,
    },
  };
}

// Extract using Anthropic Claude (better for tables/structured data)
async function extractWithClaude(
  imageBase64: string,
  mimeType: string,
  apiKey: string
): Promise<ScorecardData | null> {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        temperature: 0,
        messages: [
          {
            role: 'user',
            content: [
              buildClaudeContentBlock(imageBase64, mimeType),
              {
                type: 'text',
                text: EXTRACTION_PROMPT,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      ocrLogger.error('Claude API error:', errorText);
      return null;
    }

    const data = await response.json();
    const content = data.content?.[0]?.text;

    if (!content) {
      ocrLogger.error('Claude returned no content');
      return null;
    }

    ocrLogger.log('Claude raw response length:', content.length);

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      ocrLogger.error('Could not extract JSON from Claude response:', content.slice(0, 500));
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return parsed;
  } catch (error) {
    ocrLogger.error('Claude extraction error:', error);
    return null;
  }
}

// Extract using OpenAI GPT-4o Vision
async function extractWithOpenAI(
  imageBase64: string,
  mimeType: string,
  apiKey: string
): Promise<ScorecardData | null> {
  try {
    const imageUrl = `data:${mimeType}; base64, ${imageBase64} `;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey} `,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: EXTRACTION_PROMPT,
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze this golf scorecard image. Extract ALL 18 holes, ALL tee sets, par, handicap, and yardages. Return complete JSON.',
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl,
                  detail: 'high',
                },
              },
            ],
          },
        ],
        max_tokens: 4000,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      ocrLogger.error('OpenAI API error:', await response.text());
      return null;
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content;

    if (!content) return null;

    // Parse JSON from response (handle markdown code blocks)
    const jsonMatch = content.match(/```(?: json) ?\s * ([\s\S] *?)```/) || content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const jsonStr = Array.isArray(jsonMatch) && jsonMatch[1] ? jsonMatch[1].trim() : jsonMatch[0];
    return JSON.parse(jsonStr);
  } catch (error) {
    ocrLogger.error('OpenAI extraction error:', error);
    return null;
  }
}

// Extract from MULTIPLE images using Claude (front/back of scorecard)
async function extractWithClaudeMultiple(
  images: ImageData[],
  apiKey: string
): Promise<ScorecardData | null> {
  try {
    // Build content array with all images/documents
    const content: Array<Record<string, unknown>> = [];

    images.forEach((img, index) => {
      content.push(buildClaudeContentBlock(img.image, img.mimeType));
      // Add label if provided
      if (img.label) {
        content.push({
          type: 'text',
          text: `[Image ${index + 1}: ${img.label}]`,
        });
      }
    });

    // Add the extraction prompt
    content.push({
      type: 'text',
      text: MULTI_IMAGE_PROMPT,
    });

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8192,
        temperature: 0,
        messages: [
          {
            role: 'user',
            content,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      ocrLogger.error('Claude multi-image API error:', errorText);
      return null;
    }

    const data = await response.json();
    const responseContent = data.content?.[0]?.text;

    if (!responseContent) {
      ocrLogger.error('Claude multi-image returned no content');
      return null;
    }

    ocrLogger.log('Claude multi-image response length:', responseContent.length);

    // Parse JSON from response
    const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      ocrLogger.error('Could not extract JSON from multi-image response:', responseContent.slice(0, 500));
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return parsed;
  } catch (error) {
    ocrLogger.error('Claude multi-image extraction error:', error);
    return null;
  }
}

// Extract from MULTIPLE images using OpenAI (front/back of scorecard)
async function extractWithOpenAIMultiple(
  images: ImageData[],
  apiKey: string
): Promise<ScorecardData | null> {
  try {
    // Build content array with all images
    const userContent: Array<{ type: string; text?: string; image_url?: { url: string; detail: string } }> = [
      {
        type: 'text',
        text: 'Analyze these golf scorecard images (front and back, or multiple sections). Combine ALL data from ALL images. Extract ALL 18 holes, ALL tee sets with ratings and slopes. Return complete JSON.',
      },
    ];

    images.forEach((img, index) => {
      const imageUrl = `data:${img.mimeType}; base64, ${img.image} `;
      userContent.push({
        type: 'image_url',
        image_url: {
          url: imageUrl,
          detail: 'high',
        },
      });
      if (img.label) {
        userContent.push({
          type: 'text',
          text: `[Image ${index + 1}: ${img.label}]`,
        });
      }
    });

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey} `,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: MULTI_IMAGE_PROMPT,
          },
          {
            role: 'user',
            content: userContent,
          },
        ],
        max_tokens: 4000,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      ocrLogger.error('OpenAI multi-image API error:', await response.text());
      return null;
    }

    const result = await response.json();
    const responseContent = result.choices?.[0]?.message?.content;

    if (!responseContent) return null;

    // Parse JSON from response (handle markdown code blocks)
    const jsonMatch = responseContent.match(/```(?: json) ?\s * ([\s\S] *?)```/) || responseContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const jsonStr = Array.isArray(jsonMatch) && jsonMatch[1] ? jsonMatch[1].trim() : jsonMatch[0];
    return JSON.parse(jsonStr);
  } catch (error) {
    ocrLogger.error('OpenAI multi-image extraction error:', error);
    return null;
  }
}

function validateAndCleanData(data: ScorecardData): ScorecardData {
  // Ensure we have 18 holes
  const holes: HoleData[] = [];
  const usedHandicaps = new Set<number>();

  for (let i = 0; i < 18; i++) {
    const hole = data.holes?.[i];

    // Validate par (3-5)
    let par = hole?.par ?? 4;
    if (par < 3) par = 3;
    if (par > 5) par = 5;

    // Validate handicap (1-18, unique)
    let handicap = hole?.handicap ?? i + 1;
    if (handicap < 1 || handicap > 18 || usedHandicaps.has(handicap)) {
      // Find next available handicap
      for (let h = 1; h <= 18; h++) {
        if (!usedHandicaps.has(h)) {
          handicap = h;
          break;
        }
      }
    }
    usedHandicaps.add(handicap);

    // Get yardage from first tee set if available, otherwise from hole data
    let yardage = hole?.yardage ?? null;
    if (yardage === null && data.teeSets?.[0]?.yardages?.[i]) {
      yardage = data.teeSets[0].yardages[i];
    }
    if (yardage !== null && (yardage < 50 || yardage > 700)) {
      yardage = null;
    }

    holes.push({ par, handicap, yardage });
  }

  // Clean up tee sets
  const teeSets: TeeSetData[] = [];
  if (data.teeSets && data.teeSets.length > 0) {
    for (const teeSet of data.teeSets) {
      if (!teeSet.name) continue;

      // Ensure 18 yardages
      const yardages: (number | null)[] = [];
      for (let i = 0; i < 18; i++) {
        let yardage = teeSet.yardages?.[i] ?? null;
        if (yardage !== null && (yardage < 50 || yardage > 700)) {
          yardage = null;
        }
        yardages.push(yardage);
      }

      teeSets.push({
        name: teeSet.name,
        color: teeSet.color || undefined,
        rating: teeSet.rating && teeSet.rating > 60 && teeSet.rating < 80 ? teeSet.rating : undefined,
        slope: teeSet.slope && teeSet.slope > 55 && teeSet.slope < 155 ? teeSet.slope : undefined,
        yardages,
      });
    }
  }

  // Get primary tee info from first tee set if not directly provided
  const primaryTee = teeSets[0];

  return {
    courseName: data.courseName || undefined,
    teeName: data.teeName || primaryTee?.name || undefined,
    rating: data.rating || primaryTee?.rating || undefined,
    slope: data.slope || primaryTee?.slope || undefined,
    holes,
    teeSets: teeSets.length > 0 ? teeSets : undefined,
  };
}

function getMockScorecardData(): ScorecardData {
  return {
    courseName: 'Sample Golf Course',
    teeName: 'Blue',
    rating: 72.4,
    slope: 128,
    holes: [
      { par: 4, handicap: 7, yardage: 385 },
      { par: 4, handicap: 15, yardage: 362 },
      { par: 3, handicap: 11, yardage: 175 },
      { par: 5, handicap: 1, yardage: 548 },
      { par: 4, handicap: 9, yardage: 412 },
      { par: 4, handicap: 3, yardage: 445 },
      { par: 3, handicap: 17, yardage: 162 },
      { par: 4, handicap: 13, yardage: 378 },
      { par: 5, handicap: 5, yardage: 525 },
      { par: 4, handicap: 8, yardage: 402 },
      { par: 4, handicap: 16, yardage: 355 },
      { par: 3, handicap: 12, yardage: 185 },
      { par: 5, handicap: 2, yardage: 555 },
      { par: 4, handicap: 10, yardage: 395 },
      { par: 4, handicap: 4, yardage: 432 },
      { par: 3, handicap: 18, yardage: 148 },
      { par: 4, handicap: 14, yardage: 368 },
      { par: 5, handicap: 6, yardage: 518 },
    ],
    teeSets: [
      {
        name: 'Black',
        color: '#000000',
        rating: 74.2,
        slope: 138,
        yardages: [425, 402, 195, 588, 452, 485, 182, 418, 565, 442, 395, 205, 595, 435, 472, 168, 408, 558],
      },
      {
        name: 'Blue',
        color: '#1E40AF',
        rating: 72.4,
        slope: 128,
        yardages: [385, 362, 175, 548, 412, 445, 162, 378, 525, 402, 355, 185, 555, 395, 432, 148, 368, 518],
      },
      {
        name: 'White',
        color: '#FFFFFF',
        rating: 70.1,
        slope: 118,
        yardages: [355, 332, 155, 518, 382, 415, 142, 348, 495, 372, 325, 165, 525, 365, 402, 128, 338, 488],
      },
      {
        name: 'Gold',
        color: '#CA8A04',
        rating: 68.5,
        slope: 112,
        yardages: [325, 302, 135, 488, 352, 385, 122, 318, 465, 342, 295, 145, 495, 335, 372, 108, 308, 458],
      },
    ],
  };
}
