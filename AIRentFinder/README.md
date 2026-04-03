# AI Rent Finder

AI Rent Finder is a Vercel-deployable Next.js app that runs a multi-agent rental discovery workflow for Indian cities. A user selects:

- City
- Locality
- Budget
- Type of Housing (`Flat`, `PG`, or `Hostel`)

The app then runs one source agent each for:

- NoBroker
- 99acres
- Housing.com
- MagicBricks

Those agents use SerpApi-backed Google results to discover indexed listing pages, and a final ranker combines the best leads. If an LLM is configured, the ranker can use `openrouter`, `groq`, `mistral`, or `gemini`. If no LLM is configured, the app falls back to a deterministic scoring strategy.

## Why SerpApi is included

The code uses SerpApi to query Google results reliably from a server-side Vercel deployment. This is a more stable way to aggregate searchable results from multiple real-estate domains than scraping search pages directly.

Required environment variables:

```bash
SERP_API_KEY=your_key
```

Optional LLM environment variables:

```bash
LLM_PROVIDER=openrouter
LLM_API_KEY=your_provider_key
LLM_MODEL=your_model_name
LLM_BASE_URL=
```

Examples:

- OpenRouter: `LLM_PROVIDER=openrouter`
- Groq: `LLM_PROVIDER=groq`
- Mistral: `LLM_PROVIDER=mistral`
- Gemini: `LLM_PROVIDER=gemini`

## Local development

```bash
npm install
npm run dev
```

## Deploying to Vercel

1. Import this project into Vercel.
2. Add the environment variables from `.env.example`.
3. Deploy.

The app uses the App Router and a Node.js route handler, so it is ready for standard Vercel deployment.

## Important note

This implementation searches indexed public pages using SerpApi's Google engine, then ranks results. Real-estate platforms can change HTML structures or anti-bot rules at any time, so search coverage depends on what search engines index and what each site exposes publicly.
