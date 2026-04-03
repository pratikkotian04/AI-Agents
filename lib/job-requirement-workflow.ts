import { generateText } from "@/lib/llm";
import type { AgentTrace, JobPosting, JobRequirementRequest, JobRequirementResponse } from "@/lib/types";

type AgentDefinition = {
  name: string;
  purpose: string;
  system: string;
  prompt: (input: JobRequirementRequest, memory: AgentTrace[]) => string;
};

const agents: AgentDefinition[] = [
  {
    name: "Role Analyst",
    purpose: "Normalizes the intake and turns recruiter inputs into a clear hiring brief.",
    system:
      "You are a technical recruiting strategist. Convert rough hiring notes into a sharp role brief. Keep the response concise and structured with short sections.",
    prompt: (input) => `
Create a hiring brief using the following recruiter inputs.

Company: ${input.companyName}
Role: ${input.role}
Experience: ${input.experience}
Skills: ${input.skills}

Respond with:
1. Role mission
2. Candidate seniority interpretation
3. Top 5 evaluation themes
4. Risks or ambiguities recruiters should clarify
`
  },
  {
    name: "Skills Calibrator",
    purpose: "Distinguishes must-have qualifications from nice-to-have strengths.",
    system:
      "You are an engineering hiring manager. Translate skill lists into realistic must-have and nice-to-have expectations without overloading the role.",
    prompt: (input, memory) => `
Use the original recruiter inputs and the role brief below to calibrate the skill expectations.

Company: ${input.companyName}
Role: ${input.role}
Experience: ${input.experience}
Skills: ${input.skills}

Role brief:
${memory[0]?.output || ""}

Respond with:
1. Must-have skills
2. Nice-to-have skills
3. Interview focus areas
4. Recommended scope guardrails to avoid an unrealistic job description
`
  },
  {
    name: "Job Post Writer",
    purpose: "Drafts a public-facing posting based on the prior agents' recommendations.",
    system:
      "You are a recruiter copywriter. Produce polished, concrete, and realistic technical job content for external candidates.",
    prompt: (input, memory) => `
Create a recruiter-ready job posting from the information below.

Company: ${input.companyName}
Role: ${input.role}
Experience: ${input.experience}
Skills: ${input.skills}

Role brief:
${memory[0]?.output || ""}

Skills calibration:
${memory[1]?.output || ""}

Respond in JSON with this exact shape:
{
  "title": "string",
  "summary": "string",
  "responsibilities": ["string"],
  "mustHaveSkills": ["string"],
  "niceToHaveSkills": ["string"],
  "interviewFocus": ["string"],
  "compensationGuidance": "string",
  "publicDescription": "string"
}
`
  },
  {
    name: "Recruiter Reviewer",
    purpose: "Reviews the generated posting for clarity, realism, and recruiter usability.",
    system:
      "You are a principal talent partner reviewing technical job postings. Identify gaps, improve clarity, and ensure the posting is realistic and well-scoped.",
    prompt: (_input, memory) => `
Review the draft below and provide a concise recruiter QA note.

Draft JSON:
${memory[2]?.output || ""}

Respond with:
1. Overall quality assessment
2. Missing information the recruiter should confirm
3. Suggested edits before publishing
`
  }
];

function extractJsonObject(text: string): string {
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error("The writer agent did not return valid JSON.");
  }

  return text.slice(firstBrace, lastBrace + 1);
}

function normalizePosting(raw: Partial<JobPosting>): JobPosting {
  return {
    title: raw.title || "Untitled role",
    summary: raw.summary || "",
    responsibilities: Array.isArray(raw.responsibilities) ? raw.responsibilities : [],
    mustHaveSkills: Array.isArray(raw.mustHaveSkills) ? raw.mustHaveSkills : [],
    niceToHaveSkills: Array.isArray(raw.niceToHaveSkills) ? raw.niceToHaveSkills : [],
    interviewFocus: Array.isArray(raw.interviewFocus) ? raw.interviewFocus : [],
    compensationGuidance: raw.compensationGuidance || "",
    publicDescription: raw.publicDescription || ""
  };
}

export async function createJobRequirement(
  input: JobRequirementRequest
): Promise<JobRequirementResponse> {
  const traces: AgentTrace[] = [];

  for (const agent of agents) {
    const output = await generateText({
      system: agent.system,
      prompt: agent.prompt(input, traces),
      temperature: 0.35
    });

    if (!output) {
      throw new Error(`${agent.name} returned an empty response.`);
    }

    traces.push({
      agentName: agent.name,
      purpose: agent.purpose,
      output
    });
  }

  const writerOutput = traces[2]?.output;

  if (!writerOutput) {
    throw new Error("No writer output was produced.");
  }

  const jobPosting = normalizePosting(JSON.parse(extractJsonObject(writerOutput)) as Partial<JobPosting>);

  return {
    jobPosting,
    agentOutputs: traces
  };
}
