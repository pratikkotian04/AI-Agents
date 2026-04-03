import { z } from "zod";

export const jobRequirementInputSchema = z.object({
  companyName: z.string().min(2, "Company name is required."),
  role: z.string().min(2, "Role is required."),
  experience: z.string().min(1, "Experience is required."),
  skills: z.string().min(2, "Skills are required.")
});

export type JobRequirementRequest = z.infer<typeof jobRequirementInputSchema>;

export type AgentTrace = {
  agentName: string;
  purpose: string;
  output: string;
};

export type JobPosting = {
  title: string;
  summary: string;
  responsibilities: string[];
  mustHaveSkills: string[];
  niceToHaveSkills: string[];
  interviewFocus: string[];
  compensationGuidance: string;
  publicDescription: string;
};

export type JobRequirementResponse = {
  jobPosting: JobPosting;
  agentOutputs: AgentTrace[];
};
