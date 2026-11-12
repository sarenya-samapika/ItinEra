// ==============================================================================
// ItinEra Backend Server
// Tech Stack: Node.js, Express.js, Groq SDK (Llama 3.3 70B Versatile)
// Description: Handles static asset serving and the AI itinerary generation API.
// ==============================================================================

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const Groq = require('groq-sdk');
const path = require('path');

// Load environment variables from .env file
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ==============================================================================
// Middleware Configuration
// ==============================================================================
app.use(cors()); // Enable Cross-Origin Resource Sharing
app.use(express.json()); // Enable JSON body parsing for incoming requests
app.use(express.static(path.join(__dirname, 'public'))); // Serve static frontend files

// ==============================================================================
// API Routes
// ==============================================================================

/**
 * Health check endpoint
 * Useful for verifying that the server is up and running.
 */
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'ItinEra server is healthy and running.',
    timestamp: new Date().toISOString()
  });
});

/**
 * Main AI Itinerary Generation Endpoint
 * Method: POST
 * Route: /api/generate-itinerary
 * Request Body: { destination, days, budget, interests, additionalNotes }
 */
app.post('/api/generate-itinerary', async (req, res) => {
  try {
    const { destination, days, budget, interests, additionalNotes } = req.body;

    // 1. Input Validation
    if (!destination || typeof destination !== 'string' || destination.trim() === '') {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid destination.'
      });
    }

    const durationDays = parseInt(days, 10);
    if (isNaN(durationDays) || durationDays < 1 || durationDays > 14) {
      return res.status(400).json({
        success: false,
        error: 'Duration must be between 1 and 14 days.'
      });
    }

    const validBudgets = ['Budget', 'Mid-range', 'Luxury'];
    const selectedBudget = validBudgets.includes(budget) ? budget : 'Mid-range';

    const userInterests = Array.isArray(interests) && interests.length > 0
      ? interests.join(', ')
      : 'General sightseeing, culture, local food';

    // 2. Validate Groq API Key (re-read .env dynamically so server doesn't need restarting)
    dotenv.config();
    const apiKey = (process.env.GROQ_API_KEY || '').trim();

    if (!apiKey || apiKey === 'your_groq_api_key_here') {
      return res.status(500).json({
        success: false,
        error: 'GROQ_API_KEY is not configured yet. Open the .env file in your project, paste your Groq API key, save it, and try again.'
      });
    }

    const groq = new Groq({ apiKey });

    // 3. Construct the Prompt for Llama 3.3 70B
    const systemPrompt = `You are ItinEra, an expert world-class AI travel planner and local concierge.
You design realistic, immersive, and logistically sensible day-by-day travel itineraries.
You MUST output strictly valid JSON with no markdown backticks, no code fence, and no extra explanatory text outside the JSON object.
Your JSON response must adhere strictly to this schema:
{
  "tripTitle": "Short, catchy trip title (e.g., '5 Days in Scenic Kyoto & Osaka')",
  "destination": "Destination name and country",
  "durationDays": number,
  "budgetTier": "Budget | Mid-range | Luxury",
  "summary": "A vivid 2-3 sentence overview of the trip experience and vibe",
  "bestTimeToVisit": "Best season or months to visit",
  "estimatedCost": {
    "currency": "INR (₹)",
    "accommodation": "Estimated accommodation total in Indian Rupees (e.g., '₹12,000 - ₹20,000')",
    "foodAndDining": "Estimated food total in Indian Rupees (e.g., '₹6,000 - ₹10,000')",
    "activitiesAndTransport": "Estimated activities & transit total in Indian Rupees (e.g., '₹4,000 - ₹7,000')",
    "totalEstimated": "Estimated total cost per traveler in Indian Rupees (e.g., '₹22,000 - ₹37,000')"
  },
  "packingChecklist": [
    {
      "category": "Clothing & Footwear",
      "items": ["Item 1", "Item 2", "Item 3", "Item 4"]
    },
    {
      "category": "Documents & Essentials",
      "items": ["Item 1", "Item 2", "Item 3"]
    },
    {
      "category": "Destination Specifics & Gear",
      "items": ["Item 1", "Item 2", "Item 3"]
    }
  ],
  "localTravelTips": [
    "Practical tip 1 regarding local transport or passes",
    "Practical tip 2 regarding cultural etiquette or tipping",
    "Practical tip 3 regarding payment methods or connectivity (SIM/eSIM)"
  ],
  "itinerary": [
    {
      "day": 1,
      "theme": "Catchy theme of the day (e.g., 'Arrival, Ancient Temples & Sunset Skyline')",
      "morning": {
        "time": "09:00 AM - 12:30 PM",
        "title": "Specific attraction or activity name",
        "description": "Engaging description of what to do, see, and experience",
        "location": "Neighborhood or landmark location",
        "tips": "Pro tip or food suggestion nearby"
      },
      "afternoon": {
        "time": "01:30 PM - 05:30 PM",
        "title": "Specific attraction or activity name",
        "description": "Engaging description of what to do, see, and experience",
        "location": "Neighborhood or landmark location",
        "tips": "Pro tip or transport advice"
      },
      "evening": {
        "time": "06:30 PM - 10:00 PM",
        "title": "Specific evening activity or dinner experience",
        "description": "Engaging description of evening atmosphere, dining, or night walk",
        "location": "Neighborhood or landmark location",
        "tips": "Must-try dish or reservation recommendation"
      }
    }
  ]
}`;

    const userPrompt = `Create a detailed, realistic travel itinerary with the following parameters:
- Destination: ${destination.trim()}
- Number of Days: ${durationDays}
- Budget Tier: ${selectedBudget}
- Traveler Interests: ${userInterests}
${additionalNotes ? `- Special Preferences or Notes: ${additionalNotes.trim()}` : ''}

Make sure the daily plan has exactly ${durationDays} days in the "itinerary" array. 
Ensure morning, afternoon, and evening locations are geographically clustered to avoid unrealistic cross-city rushing.
Keep estimated costs accurate to the '${selectedBudget}' tier and provide all price estimates strictly in Indian Rupees (₹ / INR).`;

    // 4. Call Groq API (Primary: llama-3.3-70b-versatile, with auto-fallback if account lacks access)
    const primaryModel = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
    console.log(`[ItinEra] Generating itinerary for "${destination}" (${durationDays} days, ${selectedBudget}) with ${primaryModel}...`);

    let completion;
    try {
      completion = await groq.chat.completions.create({
        model: primaryModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.6,
        max_tokens: 5000
      });
    } catch (modelError) {
      // If the account does not have access to llama-3.3-70b-versatile, fallback to available high-power model
      if (modelError.status === 404 || (modelError.error && modelError.error.code === 'model_not_found')) {
        console.warn(`[ItinEra Warning] ${primaryModel} not available on this API key. Falling back to openai/gpt-oss-120b...`);
        completion = await groq.chat.completions.create({
          model: 'openai/gpt-oss-120b',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          response_format: { type: 'json_object' },
          temperature: 0.6,
          max_tokens: 5000
        });
      } else {
        throw modelError;
      }
    }

    const rawResponse = completion.choices[0]?.message?.content;
    if (!rawResponse) {
      throw new Error('Received empty response from Groq API.');
    }

    // 5. Parse and Return JSON
    const parsedData = JSON.parse(rawResponse);

    // Attach unique ID and timestamp for frontend saving
    const itineraryResult = {
      id: 'trip_' + Date.now(),
      createdAt: new Date().toISOString(),
      ...parsedData
    };

    console.log(`[ItinEra] Successfully generated trip: "${itineraryResult.tripTitle}"`);

    return res.status(200).json({
      success: true,
      data: itineraryResult
    });

  } catch (error) {
    console.error('[ItinEra Error]:', error.message || error);

    // Provide friendly error response
    let errorMessage = 'Failed to generate itinerary. Please try again.';
    if (error.status === 401) {
      errorMessage = 'Invalid Groq API Key. Please verify your GROQ_API_KEY in .env.';
    } else if (error.status === 429) {
      errorMessage = 'Groq rate limit exceeded. Please wait a few moments and try again.';
    } else if (error instanceof SyntaxError) {
      errorMessage = 'Model output could not be parsed as valid JSON. Please retry.';
    }

    return res.status(500).json({
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Fallback to serve index.html for unknown frontend routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ==============================================================================
// Start Server
// ==============================================================================
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🌍 ItinEra Server is live at: http://localhost:${PORT}`);
  console.log(`⚡ Powered by Groq (llama-3.3-70b-versatile)`);
  console.log(`=======================================================`);
});

