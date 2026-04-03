# Job Requirement Agent

A Vercel-ready multi-agent app for technical recruiters to generate polished job requirement drafts from four simple inputs:

- Company Name
- Role
- Experience
- Skills

## How it works

The app coordinates four specialist agents:

1. `Role Analyst` turns recruiter notes into a hiring brief.
2. `Skills Calibrator` separates must-haves from nice-to-haves.
3. `Job Post Writer` creates the final job posting payload.
4. `Recruiter Reviewer` provides a final QA pass.

Recruiters can review both the generated posting and the individual agent outputs in the UI.

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Create your local environment file:

```bash
cp .env.example .env.local
```

3. Set one provider:

- For Gemini: set `LLM_PROVIDER=gemini` and `GEMINI_API_KEY`
- For Groq: set `LLM_PROVIDER=groq` and `GROQ_API_KEY`
- For Mistral: set `LLM_PROVIDER=mistral` and `MISTRAL_API_KEY`
- For Cohere: set `LLM_PROVIDER=cohere` and `COHERE_API_KEY`
- For OpenRouter: set `LLM_PROVIDER=openrouter` and `OPENROUTER_API_KEY`

4. Start the app:

```bash
npm run dev
```

## Deploy on Vercel

1. Push the repository to GitHub.
2. Import the project into Vercel.
3. Add the same environment variables from `.env.example`.
4. Deploy.

## Notes

- The workflow uses standard Next.js App Router route handlers, so it works cleanly on Vercel serverless functions.
- Each LLM call logs token consumption in the server console with provider, model, input tokens, output tokens, and total tokens.
- Model defaults can be changed with the corresponding `DEFAULT_*_MODEL` environment variable for each provider.
- The final agent currently reviews the draft and exposes its notes in the UI. If you want, it can also be extended to automatically revise the final posting before returning it.
