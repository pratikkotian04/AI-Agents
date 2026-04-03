type SupportedProvider = "gemini" | "groq" | "mistral" | "cohere" | "openrouter";

type GenerateTextInput = {
  system: string;
  prompt: string;
  temperature?: number;
};

type TokenUsage = {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  cachedTokens?: number;
};

function getProvider(): SupportedProvider {
  const provider = process.env.LLM_PROVIDER?.toLowerCase();

  if (
    provider === "gemini" ||
    provider === "groq" ||
    provider === "mistral" ||
    provider === "cohere" ||
    provider === "openrouter"
  ) {
    return provider;
  }

  return "gemini";
}

function getModel(provider: SupportedProvider): string {
  if (provider === "groq") {
    return process.env.DEFAULT_GROQ_MODEL || "llama-3.3-70b-versatile";
  }

  if (provider === "mistral") {
    return process.env.DEFAULT_MISTRAL_MODEL || "mistral-large-latest";
  }

  if (provider === "cohere") {
    return process.env.DEFAULT_COHERE_MODEL || "command-a-03-2025";
  }

  if (provider === "openrouter") {
    return process.env.DEFAULT_OPENROUTER_MODEL || "openai/gpt-4o-mini";
  }

  return process.env.DEFAULT_GEMINI_MODEL || "gemini-2.0-flash";
}

function logTokenUsage(provider: SupportedProvider, model: string, usage?: TokenUsage) {
  if (!usage) {
    console.log(`[LLM Usage] provider=${provider} model=${model} usage=unavailable`);
    return;
  }

  const parts = [
    `provider=${provider}`,
    `model=${model}`,
    `input_tokens=${usage.inputTokens ?? "n/a"}`,
    `output_tokens=${usage.outputTokens ?? "n/a"}`,
    `total_tokens=${usage.totalTokens ?? "n/a"}`
  ];

  if (typeof usage.cachedTokens === "number") {
    parts.push(`cached_tokens=${usage.cachedTokens}`);
  }

  console.log(`[LLM Usage] ${parts.join(" ")}`);
}

function extractTextFromParts(content: unknown): string {
  if (typeof content === "string") {
    return content.trim();
  }

  if (!Array.isArray(content)) {
    return "";
  }

  return content
    .map((item) => {
      if (item && typeof item === "object" && "text" in item && typeof item.text === "string") {
        return item.text;
      }

      return "";
    })
    .join("")
    .trim();
}

async function callGemini(input: GenerateTextInput): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing.");
  }

  const model = getModel("gemini");
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: input.system }]
        },
        contents: [
          {
            role: "user",
            parts: [{ text: input.prompt }]
          }
        ],
        generationConfig: {
          temperature: input.temperature ?? 0.4
        }
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini request failed: ${errorText}`);
  }

  const data = (await response.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          text?: string;
        }>;
      };
    }>;
    usageMetadata?: {
      promptTokenCount?: number;
      candidatesTokenCount?: number;
      totalTokenCount?: number;
      cachedContentTokenCount?: number;
    };
  };

  logTokenUsage("gemini", model, {
    inputTokens: data.usageMetadata?.promptTokenCount,
    outputTokens: data.usageMetadata?.candidatesTokenCount,
    totalTokens: data.usageMetadata?.totalTokenCount,
    cachedTokens: data.usageMetadata?.cachedContentTokenCount
  });

  return data.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim() || "";
}

async function callGroq(input: GenerateTextInput): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error("GROQ_API_KEY is missing.");
  }

  const model = getModel("groq");
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      temperature: input.temperature ?? 0.4,
      messages: [
        {
          role: "system",
          content: input.system
        },
        {
          role: "user",
          content: input.prompt
        }
      ]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq request failed: ${errorText}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string;
      };
    }>;
    usage?: {
      prompt_tokens?: number;
      completion_tokens?: number;
      total_tokens?: number;
      prompt_tokens_details?: {
        cached_tokens?: number;
      };
    };
  };

  logTokenUsage("groq", model, {
    inputTokens: data.usage?.prompt_tokens,
    outputTokens: data.usage?.completion_tokens,
    totalTokens: data.usage?.total_tokens,
    cachedTokens: data.usage?.prompt_tokens_details?.cached_tokens
  });

  return data.choices?.[0]?.message?.content?.trim() || "";
}

async function callMistral(input: GenerateTextInput): Promise<string> {
  const apiKey = process.env.MISTRAL_API_KEY;

  if (!apiKey) {
    throw new Error("MISTRAL_API_KEY is missing.");
  }

  const model = getModel("mistral");
  const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      temperature: input.temperature ?? 0.4,
      messages: [
        {
          role: "system",
          content: input.system
        },
        {
          role: "user",
          content: input.prompt
        }
      ]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Mistral request failed: ${errorText}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string | Array<{ type?: string; text?: string }>;
      };
    }>;
    usage?: {
      prompt_tokens?: number;
      completion_tokens?: number;
      total_tokens?: number;
    };
  };

  logTokenUsage("mistral", model, {
    inputTokens: data.usage?.prompt_tokens,
    outputTokens: data.usage?.completion_tokens,
    totalTokens: data.usage?.total_tokens
  });

  return extractTextFromParts(data.choices?.[0]?.message?.content);
}

async function callCohere(input: GenerateTextInput): Promise<string> {
  const apiKey = process.env.COHERE_API_KEY;

  if (!apiKey) {
    throw new Error("COHERE_API_KEY is missing.");
  }

  const model = getModel("cohere");
  const response = await fetch("https://api.cohere.com/v2/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      temperature: input.temperature ?? 0.4,
      messages: [
        {
          role: "system",
          content: input.system
        },
        {
          role: "user",
          content: input.prompt
        }
      ]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Cohere request failed: ${errorText}`);
  }

  const data = (await response.json()) as {
    message?: {
      content?: Array<{ type?: string; text?: string }>;
    };
    meta?: {
      tokens?: {
        input_tokens?: number;
        output_tokens?: number;
      };
      billed_units?: {
        input_tokens?: number;
        output_tokens?: number;
      };
    };
  };

  const inputTokens = data.meta?.tokens?.input_tokens ?? data.meta?.billed_units?.input_tokens;
  const outputTokens = data.meta?.tokens?.output_tokens ?? data.meta?.billed_units?.output_tokens;

  logTokenUsage("cohere", model, {
    inputTokens,
    outputTokens,
    totalTokens:
      typeof inputTokens === "number" && typeof outputTokens === "number"
        ? inputTokens + outputTokens
        : undefined
  });

  return extractTextFromParts(data.message?.content);
}

async function callOpenRouter(input: GenerateTextInput): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is missing.");
  }

  const model = getModel("openrouter");
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      temperature: input.temperature ?? 0.4,
      messages: [
        {
          role: "system",
          content: input.system
        },
        {
          role: "user",
          content: input.prompt
        }
      ]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter request failed: ${errorText}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string;
      };
    }>;
    usage?: {
      prompt_tokens?: number;
      completion_tokens?: number;
      total_tokens?: number;
    };
  };

  logTokenUsage("openrouter", model, {
    inputTokens: data.usage?.prompt_tokens,
    outputTokens: data.usage?.completion_tokens,
    totalTokens: data.usage?.total_tokens
  });

  return data.choices?.[0]?.message?.content?.trim() || "";
}

export async function generateText(input: GenerateTextInput): Promise<string> {
  const provider = getProvider();

  if (provider === "groq") {
    return callGroq(input);
  }

  if (provider === "mistral") {
    return callMistral(input);
  }

  if (provider === "cohere") {
    return callCohere(input);
  }

  if (provider === "openrouter") {
    return callOpenRouter(input);
  }

  return callGemini(input);
}
