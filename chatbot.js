import Groq from "groq-sdk";
import { tavily } from "@tavily/core";
import NodeCache from "node-cache";

const tvly = tavily({ apiKey: process.env.TAVILY_API_KEY });
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const cache = new NodeCache({ stdTTL: 60 * 60 * 24 });

export async function generate(message, id) {
  const baseMessages = [
    {
      role: "system",
      content: `You are a smart personal AI assistant.

Your behavior:
- If you know the answer, respond clearly and directly in plain English.
- If the question requires real-time, location-based, or up-to-date information, OR if you are unsure of the answer, use the available tools.
- Always decide intelligently whether to answer directly or call a tool.

Tool available:
- webSearch(query: string): Use this tool to search the internet for current, real-time, or unknown information.

Rules:
- Do NOT guess real-time or uncertain information.
- Do NOT mention the tool unless it is necessary for the response.
- Keep answers concise and helpful.
- Prefer direct answers when confidence is high.
- Use tools only when needed.

Examples:

Q: What is the capital of France?
A: The capital of France is Paris.

Q: What is the weather in Mumbai right now?
A: (Use webSearch tool with query: "current weather in Mumbai")

Q: Who is the Prime Minister of India?
A: The Prime Minister of India is Narendra Modi.

Q: Tell me the latest IT news.
A: (Use webSearch tool with query: "latest IT news")

Context:
Current date and time: ${new Date().toUTCString()}`,
    },
  ];

  const messages = cache.get(id) ?? baseMessages;

  console.log("messages:", messages);

  messages.push({
    role: "user",
    content: message,
  });

  const Max_Retry = 10;
  let count = 0;

  while (true) {
    if (count > Max_Retry) {
      return "Unable to process your request. Please try again later! ";
    }
    count++;
    const completions = await groq.chat.completions.create({
      temperature: 0,
      model: "llama-3.3-70b-versatile",
      messages: messages,
      tools: [
        {
          type: "function",
          function: {
            name: "webSearch",
            description:
              "Search the latest information and realtime data on the internet.",
            parameters: {
              type: "object",
              properties: {
                query: {
                  type: "string",
                  description: "The search query to perform search on.",
                },
              },
              required: ["query"],
            },
          },
        },
      ],
      tool_choice: "auto",
    });

    messages.push(completions.choices[0].message);
    const toolCalls = completions.choices[0].message.tool_calls;

    if (!toolCalls) {
      cache.set(id, messages);
      console.log(cache);
      return completions.choices[0].message.content;
    }

    for (const tool of toolCalls) {
      const functionName = tool.function.name;
      const functionParams = tool.function.arguments;

      if (functionName === "webSearch") {
        const toolResult = await webSearch(JSON.parse(functionParams));

        messages.push({
          tool_call_id: tool.id,
          role: "tool",
          name: functionName,
          content: toolResult,
        });
      }
    }
  }
}

async function webSearch({ query }) {
  const response = await tvly.search(query);

  const finalResult = response.results
    .map((result) => result.content)
    .join("\n\n");

  return finalResult;
}
