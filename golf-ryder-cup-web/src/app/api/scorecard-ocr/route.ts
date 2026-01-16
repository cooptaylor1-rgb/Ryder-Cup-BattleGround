import { NextRequest, NextResponse } from 'next/server';

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

const EXTRACTION_PROMPT = `You are an expert golf scorecard data extractor. Carefully analyze this scorecard image and extract ALL data visible.

CRITICAL: Golf scorecards show:
- FRONT 9 (holes 1-9) and BACK 9 (holes 10-18) - extract ALL 18 holes
- Multiple tee boxes shown as rows (e.g., Black, Blue/Green, White, Gold/Yellow, Red)
- Each tee has different yardages per hole
- PAR row shows par for each hole (3, 4, or 5)
- HANDICAP/HCP row shows hole difficulty ranking (1-18, 1 is hardest)
- Some cards show Men's Handicap (M HCP) and Women's Handicap (W HCP) separately

Look at the ENTIRE image. Scorecards often split into two sections:
- "OUT" = Front 9 totals (holes 1-9)
- "IN" = Back 9 totals (holes 10-18)
- "TOTAL" = Full 18

Return this EXACT JSON format:
{
  "courseName": "string or null",
  "holes": [
    {"par": 4, "handicap": 7, "yardage": 430},
    ... (EXACTLY 18 holes in order 1-18)
  ],
  "teeSets": [
    {
      "name": "Black",
      "color": "black",
      "rating": 74.2,
      "slope": 138,
      "yardages": [430, 210, 601, ...] (18 yardages for this tee)
    },
    ... (ALL tee sets visible - usually 4-6 different tees)
  ]
}

RULES:
1. Return EXACTLY 18 holes - both front and back 9
2. Par must be 3, 4, or 5
3. Handicap is 1-18 (each number used once, 1=hardest hole)
4. Extract ALL tee sets (rows of yardages with different colors/names)
5. Yardages range from ~100 (short par 3) to ~600+ (long par 5)
6. If rating/slope shown, include them (rating ~67-77, slope ~100-155)

Return ONLY valid JSON, no explanation.`;

const MULTI_IMAGE_PROMPT = `You are an expert golf scorecard data extractor. You are being given MULTIPLE images of the same scorecard (front and back, or different sections).

Combine ALL information from ALL images to build a complete picture:
- One image may show hole-by-hole data (par, yardages, handicaps)
- Another image may show course rating, slope, and tee information
- Look for: Course name, all tee sets, ratings, slopes, yardages per hole

CRITICAL: Golf scorecards show:
- FRONT 9 (holes 1-9) and BACK 9 (holes 10-18) - extract ALL 18 holes
- Multiple tee boxes shown as rows (e.g., Black, Blue/Green, White, Gold/Yellow, Red)
- Each tee has different yardages per hole
- PAR row shows par for each hole (3, 4, or 5)
- HANDICAP/HCP row shows hole difficulty ranking (1-18, 1 is hardest)
- Rating/Slope info is often on the back or in a separate section

Return this EXACT JSON format:
{
  "courseName": "string or null",
  "holes": [
    {"par": 4, "handicap": 7, "yardage": 430},
    ... (EXACTLY 18 holes in order 1-18)
  ],
  "teeSets": [
    {
      "name": "Black",
      "color": "black",
      "rating": 74.2,
      "slope": 138,
      "yardages": [430, 210, 601, ...] (18 yardages for this tee)
    },
    ... (ALL tee sets visible - usually 4-6 different tees)
  ]
}

RULES:
1. Return EXACTLY 18 holes - combine front and back 9 from all images
2. Par must be 3, 4, or 5
3. Handicap is 1-18 (each number used once, 1=hardest hole)
4. Extract ALL tee sets with their ratings and slopes
5. Yardages range from ~100 (short par 3) to ~600+ (long par 5)
6. Rating is typically 67-77, Slope is typically 100-155
7. Merge data from all images - don't miss any tee sets or ratings

Return ONLY valid JSON, no explanation.`;

export async function POST(request: NextRequest) {
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
      console.log('No AI API keys configured, returning sample data');
      return NextResponse.json({
        success: true,
        data: getMockScorecardData(),
        message: 'Demo mode: Configure ANTHROPIC_API_KEY or OPENAI_API_KEY for real OCR',
        provider: 'demo',
      });
    }

    if (!result) {
      return NextResponse.json({ error: 'Failed to extract scorecard data' }, { status: 500 });
    }

    // Validate and clean the data
    const cleanedData = validateAndCleanData(result);

    return NextResponse.json({
      success: true,
      data: cleanedData,
      provider: usedProvider,
    });
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
      console.error('Claude API error:', await response.text());
      return null;
    }

    const data = await response.json();
    const content = data.content?.[0]?.text;

    if (!content) return null;

    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Claude extraction error:', error);
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
    const imageUrl = `data:${mimeType};base64,${imageBase64}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
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
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || content.match(/\{[\s\S]*\}/);
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
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content,
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error('Claude API error:', await response.text());
      return null;
    }

    const data = await response.json();
    const responseContent = data.content?.[0]?.text;

    if (!responseContent) return null;

    // Parse JSON from response
    const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    console.error('Claude multi-image extraction error:', error);
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
      const imageUrl = `data:${img.mimeType};base64,${img.image}`;
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
        Authorization: `Bearer ${apiKey}`,
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
    const jsonMatch = responseContent.match(/```(?:json)?\s*([\s\S]*?)```/) || responseContent.match(/\{[\s\S]*\}/);
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
