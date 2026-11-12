# ItinEra

A web application that generates personalized travel itineraries, daily schedules, estimated budgets, and packing checklists using Node.js and Groq's Llama 3.3 model.

Built as an engineering course project to demonstrate full-stack fundamentals, structured LLM prompting, and client-side state handling without heavy frontend frameworks.

---

## Overview

Planning a trip usually involves manually cross-referencing blog posts, maps, and budget calculators. **ItinEra** automates this by taking a few key constraints from the user and generating a structured, day-by-day plan:

- **Destination & Length**: Plans trips from 1 to 14 days.
- **Budget Tiers**: Adjusts accommodation, transit, and dining recommendations based on Budget, Mid-range, or Luxury tiers.
- **Interest Filtering**: Tailors daily activities around chosen categories (e.g., food, history, nature, nightlife).
- **Time Slots**: Splits each day into realistic Morning, Afternoon, and Evening activities with location suggestions and practical tips.
- **Packing & Costs**: Provides categorized item checklists and rough cost estimates in local or USD currency.
- **History**: Saves previously generated plans locally in the browser (`localStorage`) so they can be reloaded without re-calling the API.

---

## Tech Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | HTML5, CSS3, Vanilla JavaScript (ES6) | Lightweight UI, zero build step, DOM manipulation, responsive layout |
| **Backend** | Node.js, Express.js | API routing, input validation, environment variable management |
| **AI / LLM** | Groq SDK (`llama-3.3-70b-versatile`) | Fast text generation with forced JSON output schema |
| **Storage** | Browser `localStorage` | Client-side trip caching and history management |

---

## Project Structure

```text
aiml project/
├── server.js              # Express server and Groq API route
├── package.json           # Dependencies and scripts
├── .env.example           # Environment variable template
├── .gitignore             # Excludes node_modules and .env
├── README.md              # Project documentation
└── public/                # Static frontend files
    ├── index.html         # Main page and form controls
    ├── style.css          # Stylesheet (custom CSS variables, flexbox/grid)
    └── app.js             # Form handling, fetch requests, UI rendering, local storage
```

---

## Setup & Running Locally

### 1. Prerequisites
- **Node.js** (v18 or higher recommended)
- A free **Groq API Key** from [console.groq.com/keys](https://console.groq.com/keys)

### 2. Install Dependencies
Clone or extract the project directory and run:
```bash
npm install
```

### 3. Configure the Environment
Create a `.env` file in the project root:
```bash
# On Linux/macOS
cp .env.example .env

# On Windows PowerShell
Copy-Item .env.example .env
```

Open `.env` in any text editor and paste your API key:
```env
PORT=3000
GROQ_API_KEY=your_groq_api_key_here
```

### 4. Start the Application
```bash
npm start
```
For auto-reload during development:
```bash
npm run dev
```

Open your browser and navigate to:
```text
http://localhost:3000
```

---

## How It Works

1. **User Input**: The user fills out the form on the frontend (destination, days, budget, interests, optional notes).
2. **Express API**: The frontend sends a `POST` request with JSON data to `/api/generate-itinerary`.
3. **Validation & Prompt Construction**: `server.js` validates that inputs are within acceptable bounds, then constructs a system prompt instructing the model to respond *strictly in valid JSON* matching an explicit schema.
4. **Groq Inference**: The backend sends the prompt to Groq using `groq-sdk` with `model: "llama-3.3-70b-versatile"` and `response_format: { type: "json_object" }`. This prevents the model from wrapping the output in conversational filler or markdown backticks.
5. **Rendering**: The backend parses the JSON and sends it back to the client. `app.js` dynamically builds the timeline cards, packing checkboxes, cost cards, and updates `localStorage`.

---

## API Reference

### Health Check
```http
GET /api/health
```
Returns a `200 OK` status confirming the server is running.

---

### Generate Itinerary
```http
POST /api/generate-itinerary
Content-Type: application/json
```

**Request Body:**
```json
{
  "destination": "Kyoto, Japan",
  "days": 3,
  "budget": "Mid-range",
  "interests": ["History & Heritage", "Food & Culinary"],
  "additionalNotes": "Prefer walkable routes, love green tea"
}
```

**Response (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "id": "trip_1731424080123",
    "tripTitle": "3 Days of Historic Temples & Local Food in Kyoto",
    "destination": "Kyoto, Japan",
    "durationDays": 3,
    "budgetTier": "Mid-range",
    "summary": "A 3-day exploration focusing on central and eastern Kyoto...",
    "bestTimeToVisit": "March to May & October to November",
    "estimatedCost": {
      "currency": "INR (₹)",
      "accommodation": "₹20,000 - ₹30,000",
      "foodAndDining": "₹12,000 - ₹18,000",
      "activitiesAndTransport": "₹6,000 - ₹10,000",
      "totalEstimated": "₹38,000 - ₹58,000"
    },
    "packingChecklist": [
      {
        "category": "Clothing & Footwear",
        "items": ["Comfortable walking shoes", "Slip-on shoes for temple visits"]
      }
    ],
    "localTravelTips": [
      "Get an IC card (ICOCA) for buses and subways",
      "Most shrines open early (around 6-7 AM); visit before tour buses arrive"
    ],
    "itinerary": [
      {
        "day": 1,
        "theme": "Higashiyama Heritage & Gion Evening",
        "morning": {
          "time": "09:00 AM - 12:00 PM",
          "title": "Kiyomizu-dera Temple",
          "description": "Walk up through Ninenzaka and Sannenzaka to visit the wooden stage.",
          "location": "Higashiyama Ward",
          "tips": "Try local matcha soft serve near the entrance."
        },
        "afternoon": { "..." },
        "evening": { "..." }
      }
    ]
  }
}
```

---

## Key Design Decisions

- **Why Vanilla JS instead of React or Next.js?**  
  For an academic project, keeping the frontend in vanilla JavaScript avoids the complexity of bundlers (Vite, Webpack), build steps, and hydration issues. It makes the code easy to step through, debug, and explain in an evaluation or presentation.
- **Why Groq?**  
  Groq provides an accessible free tier with exceptionally low latency. Running `llama-3.3-70b-versatile` takes roughly 1.5–3 seconds per generation compared to 10–20+ seconds on typical hosted endpoints.
- **Why `response_format: { type: "json_object" }`?**  
  Language models often return polite introductory text or markdown formatting (e.g. ` ```json ... ``` `) that breaks standard `JSON.parse()`. Enforcing Groq's JSON mode guarantees machine-readable outputs without fragile regex post-processing.
- **API Key Security**:  
  Calls to Groq are routed through the Express backend so the API key stays inside `.env` on the server and is never exposed in client browser code or network inspection tabs.

---

## Future Improvements

- Add Leaflet.js / OpenStreetMap to plot daily morning, afternoon, and evening locations on an interactive map.
- Integrate an OpenWeatherMap API call to check seasonal weather before generating packing lists.
- Allow downloading the generated itinerary as a clean `.txt` or `.json` file in addition to browser printing.
- Support multiple currencies (EUR, INR, GBP, JPY) in the budget estimator.

---

## License

This project was developed for educational purposes and is open source under the [MIT License](https://opensource.org/licenses/MIT).
