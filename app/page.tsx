"use client";

import { FormEvent, useState } from "react";
import type { JobRequirementRequest, JobRequirementResponse } from "@/lib/types";

const initialForm: JobRequirementRequest = {
  companyName: "",
  role: "",
  experience: "",
  skills: ""
};

export default function HomePage() {
  const [form, setForm] = useState<JobRequirementRequest>(initialForm);
  const [result, setResult] = useState<JobRequirementResponse | null>(null);
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(form)
      });

      const payload = (await response.json()) as JobRequirementResponse | { error: string };

      if (!response.ok || "error" in payload) {
        setResult(null);
        setError("error" in payload ? payload.error : "Unable to generate the job requirement.");
        return;
      }

      setResult(payload);
    } catch {
      setResult(null);
      setError("The request could not be completed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="page-shell">
      <section className="hero-card">
        <div className="hero-copy">
          <p className="eyebrow">Recruiter Copilot</p>
          <h1>Create polished job requirements with a multi-agent workflow.</h1>
          <p className="hero-text">
            Share the hiring basics and the app will coordinate specialist agents to define the role,
            sharpen expectations, and produce a recruiter-ready posting draft.
          </p>
        </div>

        <form className="input-grid" onSubmit={handleSubmit}>
          <label className="field">
            <span>Company Name</span>
            <input
              required
              value={form.companyName}
              onChange={(event) => setForm((current) => ({ ...current, companyName: event.target.value }))}
              placeholder="Acme Labs"
            />
          </label>

          <label className="field">
            <span>Role</span>
            <input
              required
              value={form.role}
              onChange={(event) => setForm((current) => ({ ...current, role: event.target.value }))}
              placeholder="Senior Backend Engineer"
            />
          </label>

          <label className="field">
            <span>Experience</span>
            <input
              required
              value={form.experience}
              onChange={(event) => setForm((current) => ({ ...current, experience: event.target.value }))}
              placeholder="5-8 years"
            />
          </label>

          <label className="field field-full">
            <span>Skills</span>
            <textarea
              required
              rows={4}
              value={form.skills}
              onChange={(event) => setForm((current) => ({ ...current, skills: event.target.value }))}
              placeholder="Node.js, TypeScript, PostgreSQL, distributed systems, AWS"
            />
          </label>

          <button className="primary-button" disabled={isLoading} type="submit">
            {isLoading ? "Generating..." : "Generate Job Requirement"}
          </button>
        </form>

        {error ? <p className="error-banner">{error}</p> : null}
      </section>

      <section className="results-layout">
        <article className="result-card">
          <div className="result-heading">
            <p className="eyebrow">Output</p>
            <h2>Recruiter-ready job posting</h2>
          </div>

          {result ? (
            <div className="markdown-output">
              <section>
                <h3>Title</h3>
                <p>{result.jobPosting.title}</p>
              </section>
              <section>
                <h3>Summary</h3>
                <p>{result.jobPosting.summary}</p>
              </section>
              <section>
                <h3>Responsibilities</h3>
                <ul>
                  {result.jobPosting.responsibilities.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
              <section>
                <h3>Required Skills</h3>
                <ul>
                  {result.jobPosting.mustHaveSkills.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
              <section>
                <h3>Preferred Skills</h3>
                <ul>
                  {result.jobPosting.niceToHaveSkills.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
              <section>
                <h3>Interview Focus</h3>
                <ul>
                  {result.jobPosting.interviewFocus.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
              <section>
                <h3>Compensation Guidance</h3>
                <p>{result.jobPosting.compensationGuidance}</p>
              </section>
              <section>
                <h3>Public Job Description</h3>
                <pre>{result.jobPosting.publicDescription}</pre>
              </section>
            </div>
          ) : (
            <p className="empty-state">
              Submit the role basics to see the generated requirement package here.
            </p>
          )}
        </article>

        <article className="result-card agents-card">
          <div className="result-heading">
            <p className="eyebrow">Agent Trail</p>
            <h2>How the specialists collaborated</h2>
          </div>

          {result ? (
            <div className="agent-list">
              {result.agentOutputs.map((agent) => (
                <section key={agent.agentName} className="agent-item">
                  <div>
                    <h3>{agent.agentName}</h3>
                    <p>{agent.purpose}</p>
                  </div>
                  <pre>{agent.output}</pre>
                </section>
              ))}
            </div>
          ) : (
            <p className="empty-state">
              The app will show each agent&apos;s contribution after generation so recruiters can trace
              the reasoning.
            </p>
          )}
        </article>
      </section>
    </main>
  );
}
