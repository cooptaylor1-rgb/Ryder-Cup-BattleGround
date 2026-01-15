import { NextRequest, NextResponse } from 'next/server';

/**
 * SCORECARD OCR API
 *
 * Accepts an image (base64 encoded) of a golf scorecard and uses
 * AI vision to extract hole data (par, handicap, yardage).
 *
 * Uses OpenAI's GPT-4 Vision API to analyze the scorecard.
 *
 * Note: PDF files are not directly supported by OpenAI Vision.
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

interface RequestBody {
  image: string; // Base64 encoded image data
  mimeType: string; // image/jpeg, image/png, etc.
}

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json();

    if (!body.image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // Check if PDF - OpenAI Vision doesn't support PDFs directly
    if (body.mimeType === 'application/pdf') {
      return NextResponse.json(
        {
          error: 'PDF files are not supported directly. Please take a photo of your scorecard or convert the PDF to an image first.',
          suggestion: 'Try using your phone camera to capture the scorecard, or screenshot the PDF.'
        },
        { status: 400 }
      );
    }

    // Check for OpenAI API key
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      // Return mock data for demo/development
      console.log('No OpenAI API key configured, returning sample data');
      return NextResponse.json({
        success: true,
        data: getMockScorecardData(),
        message: 'Demo mode: Configure OPENAI_API_KEY for real OCR',
      });
    }

    // Prepare the image URL for OpenAI
    const imageUrl = `data:${body.mimeType};base64,${body.image}`;

    // Call OpenAI Vision API with improved prompt
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: `You are an expert golf scorecard data extractor. Your job is to carefully analyze scorecard images and extract ALL available data.

IMPORTANT: Golf scorecards typically show:
- FRONT 9 (holes 1-9) and BACK 9 (holes 10-18) - you MUST extract ALL 18 holes
- Multiple tee sets (rows) with different colors/names (e.g., Black, Blue, White, Gold, Red)
- Each tee set has its own yardage for each hole
- Par values for each hole (usually in a dedicated "Par" row)
- Handicap/HCP values for each hole (usually in a "Handicap" or "HCP" row, numbered 1-18)
- Course rating and slope for each tee set

Look carefully at the ENTIRE scorecard. Many scorecards split into Front 9 and Back 9 sections.

Respond with valid JSON in this exact format:
{
  "courseName": "string or null - the golf course name",
  "holes": [
    { "par": number, "handicap": number, "yardage": number or null },
    ... (MUST have exactly 18 holes, holes 1-18 in order)
  ],
  "teeSets": [
    {
      "name": "string - tee name (e.g., 'Blue', 'Championship', 'Men's')",
      "color": "string or null - color if mentioned",
      "rating": number or null,
      "slope": number or null,
      "yardages": [number or null, ... ] (18 yardages, one per hole)
    },
    ... (include ALL tee sets visible on the scorecard)
  ]
}

CRITICAL RULES:
1. ALWAYS return exactly 18 holes - look for both Front 9 AND Back 9 sections
2. Par values must be 3, 4, or 5
3. Handicap values should be 1-18, each used once (handicap indicates hole difficulty)
4. Extract ALL tee sets shown (there are usually 3-6 different tees)
5. If you can only see 9 holes, the scorecard likely continues - look for "Out" (front 9 total) and "In" (back 9 total) sections
6. Yardages vary by tee set - longer tees (Black/Blue) have higher yardages than shorter tees (Red/Gold)
7. If a value is unclear, make a reasonable estimate rather than omitting it`,
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Carefully analyze this golf scorecard image. Extract:
1. Course name
2. ALL 18 holes with par and handicap for each hole
3. ALL tee sets visible (look for rows with different colors/names like Black, Blue, White, Gold, Red, etc.)
4. Yardages for each hole from each tee set
5. Rating and slope for each tee set if shown

Remember: Most scorecards show Front 9 (holes 1-9) and Back 9 (holes 10-18) - make sure to get ALL 18 holes.
Return complete JSON data.`,
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
      const error = await response.text();
      console.error('OpenAI API error:', error);
      return NextResponse.json(
        { error: 'Failed to analyze scorecard', details: error },
        { status: 500 }
      );
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        { error: 'No response from AI' },
        { status: 500 }
      );
    }

    // Parse the JSON from the response
    let parsedData: ScorecardData;
    try {
      // Extract JSON from potential markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      const jsonStr = jsonMatch[1].trim();
      parsedData = JSON.parse(jsonStr);
    } catch {
      console.error('Failed to parse AI response:', content);
      return NextResponse.json(
        { error: 'Failed to parse scorecard data', rawResponse: content },
        { status: 500 }
      );
    }

    // Validate and clean the data
    const cleanedData = validateAndCleanData(parsedData);

    return NextResponse.json({
      success: true,
      data: cleanedData,
      teeSets: cleanedData.teeSets, // Include all tee sets in response
    });
  } catch (error) {
    console.error('Scorecard OCR error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: String(error) },
      { status: 500 }
    );
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
    let handicap = hole?.handicap ?? (i + 1);
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
