import { NextRequest, NextResponse } from 'next/server';
import { applyRateLimit, addRateLimitHeaders, requireJson, validateBodySize } from '@/lib/utils/apiMiddleware';

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
 * Note: PDF files are not directly supported.
 * For PDFs, users should convert to image or use image capture.
 */

// Rate limiting: 10 requests per minute per IP (more restrictive due to AI API costs)
const RATE_LIMIT_CONFIG = {
  windowMs: 60 * 1000,
  maxRequests: 10,
};

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

interface ImageData {
  image: string; // Base64 encoded image data
  mimeType: string; // image/jpeg, image/png, etc.
  label?: string; // Optional label: 'front', 'back', 'ratings', etc.
}

interface RequestBody {
  image?: string; // Single image (backward compatible)
  mimeType?: string; // Single image mime type
  images?: ImageData[]; // Multiple images for front/back of scorecard
  provider?: 'claude' | 'openai' | 'auto'; // AI provider preference
}

const EXTRACTION_PROMPT = `You are an expert golf scorecard data extractor. Your job is to extract EVERY piece of data visible on this scorecard image.

SCORECARD LAYOUT - Carefully examine ALL rows and columns:

1. HOLE NUMBERS: Usually two separate tables or sections:
   - Front 9: Holes 1-9 with "OUT" total
   - Back 9: Holes 10-18 with "IN" total
   - These are often STACKED VERTICALLY (front on top, back below) or side by side

2. TEE BOXES: Look for MULTIPLE ROWS of yardages - each row is a different tee:
   - Common tee names: Black, Blue, White, Gold, Red, Green, Championship, Men's, Ladies, Forward, Senior, Tangerine, Silver
   - Count ALL yardage rows - there are typically 4-6 different tees
   - The longest yardages are championship/back tees (top row usually)
   - The shortest yardages are forward tees (bottom row usually)

3. PAR: Row labeled "Par" or "PAR" showing 3, 4, or 5 for each hole

4. HANDICAP: Look for rows labeled:
   - "Handicap", "HCP", "HDCP", "M Handicap" (Men's), "W Handicap" (Women's)
   - Values 1-18, ranking hole difficulty (1=hardest, 18=easiest)
   - Use Men's handicap (M HANDICAP) if both are shown

5. TOTALS: "OUT" (holes 1-9), "IN" (holes 10-18), "TOTAL" (all 18)

CRITICAL RULES:
1. Return EXACTLY 18 holes - check BOTH front 9 AND back 9 sections
2. Return ALL tee sets visible - count the yardage rows carefully (usually 4-6 tees)
3. Each tee MUST have 18 yardages - combine front 9 + back 9 yardages
4. Par values: only 3, 4, or 5
5. Handicap: 1-18, each number used exactly once
6. Typical yardages: Par 3 = 100-250, Par 4 = 280-470, Par 5 = 450-650

Return this JSON (and ONLY this JSON, no other text):
{
  "courseName": "Name of course if visible",
  "holes": [
    {"par": 4, "handicap": 3, "yardage": 430},
    {"par": 3, "handicap": 15, "yardage": 210},
    ... ALL 18 holes in order (1-18)
  ],
  "teeSets": [
    {
      "name": "Black",
      "color": "black",
      "rating": 74.2,
      "slope": 138,
      "yardages": [430, 210, 601, 420, 460, 330, 418, 231, 585, 371, 616, 537, 478, 165, 437, 510, 206, 538]
    },
    {
      "name": "Green",
      "color": "green",
      "yardages": [420, 190, 542, 387, 440, 308, 388, 206, 540, 332, 568, 467, 429, 149, 383, 494, 178, 510]
    },
    ... include ALL visible tee sets (4-6 typically)
  ]
}`;

const MULTI_IMAGE_PROMPT = `You are an expert golf scorecard data extractor. You have multiple images of a golf scorecard.

IMAGE 1 (FRONT - Holes & Yardages):
This image shows ALL 18 holes in a table format with:
- Hole numbers 1-9 (Front/OUT) and 10-18 (Back/IN)
- 4-6 ROWS of yardages (one row per tee: Black, Blue, White, Gold, Red, etc.)
- PAR row (values: 3, 4, or 5 for each hole)
- HANDICAP row (values 1-18, ranking difficulty)

IMAGE 2 (BACK - Ratings & Information):
This image typically shows:
- Course name and logo
- TEE SET information with RATINGS and SLOPES
- Format often like: "Black Tees - Rating: 74.2 / Slope: 138"
- May have separate Men's and Women's ratings

YOUR TASK - Combine BOTH images:
1. From Image 1: Extract ALL 18 holes (par, handicap) and ALL yardages for EACH tee set (4-6 tees)
2. From Image 2: Get the course name, AND rating/slope for EACH tee set
3. MERGE: Match the yardages from Image 1 with the ratings/slopes from Image 2 by tee name/color

CRITICAL - TEE SET EXTRACTION:
- Count the rows of yardages in Image 1 - there should be 4-6 different tee rows
- Each row is a different tee (Black, Blue, White, Gold, Red, etc.)
- The first/top row is usually the longest (Championship/Black)
- The last/bottom row is usually the shortest (Forward/Red)
- INCLUDE ALL ROWS - don't skip any!

Return this JSON:
{
  "courseName": "Full course name from Image 2",
  "holes": [
    {"par": 4, "handicap": 7, "yardage": 385},
    ... (ALL 18 holes with par, handicap, and yardage from primary tee)
  ],
  "teeSets": [
    {
      "name": "Black",
      "color": "black",
      "rating": 74.2,
      "slope": 138,
      "yardages": [385, 165, 520, 410, 195, 545, 340, 180, 430, 395, 155, 510, 425, 185, 560, 365, 170, 445]
    },
    {
      "name": "Blue",
      "color": "blue",
      "rating": 72.1,
      "slope": 131,
      "yardages": [365, 150, 495, 385, 175, 520, 320, 165, 410, 375, 140, 485, 400, 170, 535, 345, 155, 420]
    },
    ... (INCLUDE ALL 4-6 TEE SETS)
  ]
}

VALIDATION:
- holes array must have exactly 18 items
- teeSets array should have 4-6 items (one per tee row visible)
- Each tee's yardages array must have exactly 18 numbers

Return ONLY the JSON object.`;

export async function POST(request: NextRequest) {
  // Apply rate limiting (more restrictive due to AI API costs)
  const rateLimitError = applyRateLimit(request, RATE_LIMIT_CONFIG);
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

  // Debug logging only in development
  const isDev = process.env.NODE_ENV === 'development';

  try {
    const body: RequestBody = await request.json();

    // Support both single image and multiple images
    const images: ImageData[] = [];

    if (body.images && body.images.length > 0) {
      // Multiple images provided
      images.push(...body.images);
    } else if (body.image) {
      // Single image (backward compatible)
      images.push({ image: body.image, mimeType: body.mimeType || 'image/jpeg' });
    }

    if (images.length === 0) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // Check for PDFs
    if (images.some(img => img.mimeType === 'application/pdf')) {
      return NextResponse.json(
        {
          error: 'PDF files are not supported. Please take a photo or convert to image.',
          suggestion: 'Try using your phone camera to capture the scorecard.',
        },
        { status: 400 }
      );
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
      console.error('[OCR] All extraction attempts failed');
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
    res = addRateLimitHeaders(res, request, RATE_LIMIT_CONFIG);
    return res;
  } catch (error) {
    console.error('Scorecard OCR error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
  }
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
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mimeType,
                  data: imageBase64,
                },
              },
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
      console.error('[OCR] Claude API error:', errorText);
      return null;
    }

    const data = await response.json();
    const content = data.content?.[0]?.text;

    if (!content) {
      console.error('[OCR] Claude returned no content');
      return null;
    }

    console.log('[OCR] Claude raw response length:', content.length);

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[OCR] Could not extract JSON from Claude response:', content.slice(0, 500));
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return parsed;
  } catch (error) {
    console.error('[OCR] Claude extraction error:', error);
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
      console.error('OpenAI API error:', await response.text());
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
    console.error('OpenAI extraction error:', error);
    return null;
  }
}

// Extract from MULTIPLE images using Claude (front/back of scorecard)
async function extractWithClaudeMultiple(
  images: ImageData[],
  apiKey: string
): Promise<ScorecardData | null> {
  try {
    // Build content array with all images
    const content: Array<{ type: string; source?: { type: string; media_type: string; data: string }; text?: string }> = [];

    images.forEach((img, index) => {
      content.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: img.mimeType,
          data: img.image,
        },
      });
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
        max_tokens: 8192, // Increased for larger response with all tee sets
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
      console.error('[OCR] Claude multi-image API error:', errorText);
      return null;
    }

    const data = await response.json();
    const responseContent = data.content?.[0]?.text;

    if (!responseContent) {
      console.error('[OCR] Claude multi-image returned no content');
      return null;
    }

    console.log('[OCR] Claude multi-image response length:', responseContent.length);

    // Parse JSON from response
    const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[OCR] Could not extract JSON from multi-image response:', responseContent.slice(0, 500));
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return parsed;
  } catch (error) {
    console.error('[OCR] Claude multi-image extraction error:', error);
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
      console.error('OpenAI API error:', await response.text());
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
    console.error('OpenAI multi-image extraction error:', error);
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
