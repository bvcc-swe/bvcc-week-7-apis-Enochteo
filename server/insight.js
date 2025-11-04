import "dotenv/config";
import express from "express";
import cors from "cors";
import { generateObject } from "ai";
import { z } from "zod";
import { openai } from "@ai-sdk/openai";

const app = express();
app.use(cors());
app.use(express.json());

const schema = z.object({
  summary: z.string(),
  anomalies: z.array(z.string()),
});

// Simple schema for the /messages endpoint which returns a single text reply
const messageSchema = z.object({
  text: z.string(),
});

app.post("/insight", async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt || typeof prompt !== "string") {
      return res
        .status(400)
        .json({ error: "Missing or invalid prompt in request body" });
    }
    const { object } = await generateObject({
      model: openai("gpt-4o-mini"),
      schema,
      prompt,
    });
    res.json({ summary: object.summary, anomalies: object.anomalies });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "AI call failed" });
  }
});

app.post("/messages", async (req, res) => {
  try {
    // Accept either { message: '...' } or { text: '...' } from clients
    const { message, text } = req.body;
    const prompt =
      typeof message === "string" && message.trim()
        ? message
        : typeof text === "string"
        ? text
        : null;
    if (!prompt) {
      return res
        .status(400)
        .json({ error: "Missing message/text in request body" });
    }

    // generateObject requires a schema for object output — provide a simple one
    const { object } = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: messageSchema,
      prompt,
    });
    // object is validated against messageSchema and contains { text }
    res.json({ text: object.text });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "AI call for messages failed" });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`AI insight server listening on port ${PORT}`);
});
