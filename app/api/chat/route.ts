/**
 * /api/chat — Mneme's agent endpoint.
 *
 * Flow:
 *   1. Receive user message + conversation history
 *   2. Recall relevant memories from Shelby
 *   3. Send message + memory context to Claude
 *   4. Parse Claude's response for new memories to store
 *   5. Persist new memories via Shelby SDK
 *   6. Return response + memory metadata to client
 */

import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface MemoryContext {
  id: string;
  content: string;
}

const SYSTEM_PROMPT = `You are an AI agent with persistent memory powered by Mneme, a verifiable memory layer built on the Shelby storage protocol.

You have access to memories from previous interactions, provided in the context below. Use them to inform your responses naturally — reference them when relevant, but don't recite them verbatim unless asked.

After your response, on a new line, output a special directive in this exact format if there's anything from the user's message worth remembering:

[MEMORY: <a single concise fact about the user, their projects, or their interests — written in third person, max 15 words>]

Only emit a [MEMORY: ...] directive if you've genuinely learned something new about the user. Don't store generic statements, greetings, or questions. One memory per response, maximum.

Examples of good memories:
- [MEMORY: User is building a DeFi lending protocol called Aave]
- [MEMORY: User is researching flash loan use cases]
- [MEMORY: User prefers TypeScript over Python for backend work]

Examples of things NOT to store:
- Greetings ("hello", "thanks")
- Questions the user asks you
- Generic facts you taught them

Be conversational, helpful, and concise.`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, memoryContext } = body as {
      messages: ChatMessage[];
      memoryContext: MemoryContext[];
    };

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY is not configured' },
        { status: 500 }
      );
    }

    // Build the memory context block
    const memoryBlock =
      memoryContext.length > 0
        ? `\n\nRELEVANT MEMORIES FROM PREVIOUS CONVERSATIONS:\n${memoryContext
            .map((m, i) => `${i + 1}. ${m.content}`)
            .join('\n')}\n`
        : '\n\nNo previous memories about this user yet.\n';

    const systemWithContext = SYSTEM_PROMPT + memoryBlock;

    // Call Claude
    const response = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      system: systemWithContext,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    });

    // Extract the text content
    const rawText =
      response.content[0].type === 'text' ? response.content[0].text : '';

    // Parse out the memory directive
    const memoryMatch = rawText.match(/\[MEMORY:\s*(.+?)\]/);
    const newMemory = memoryMatch ? memoryMatch[1].trim() : null;

    // Strip the directive from the visible response
    const cleanResponse = rawText.replace(/\[MEMORY:\s*.+?\]/g, '').trim();

    return NextResponse.json({
      response: cleanResponse,
      newMemory,
    });
  } catch (error) {
    console.error('Chat API error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to process chat', detail: message },
      { status: 500 }
    );
  }
}