/**
 * Mneme's Shelby SDK integration layer.
 *
 * This is a mock implementation that mirrors the public API surface of the
 * Shelby protocol's TypeScript SDK. It will be swapped for the real SDK
 * (@shelby-protocol/sdk) once early access is granted.
 *
 * The mock simulates:
 *   - Object storage with content-addressed identifiers
 *   - Cryptographic read receipts anchored to Aptos
 *   - Realistic network latency (40-90ms)
 *   - Persistent state via localStorage for demo continuity
 */

export interface ShelbyMemory {
  id: string;           // Content-addressed object ID
  content: string;      // The actual memory data
  timestamp: number;    // When it was stored
  receiptHash: string;  // Aptos-anchored receipt
  size: number;         // Bytes stored
}

export interface ShelbyReceipt {
  hash: string;
  network: 'shelby-testnet';
  anchorChain: 'aptos-testnet';
  retrievalMs: number;
}

const STORAGE_KEY = 'mneme:shelby:memories';

/**
 * Generates a realistic-looking content hash.
 * In the real Shelby SDK, this is a BLAKE3 hash of the object content.
 */
function generateHash(): string {
  const chars = '0123456789abcdef';
  let hash = '0x';
  for (let i = 0; i < 8; i++) hash += chars[Math.floor(Math.random() * 16)];
  hash += '...';
  for (let i = 0; i < 4; i++) hash += chars[Math.floor(Math.random() * 16)];
  return hash;
}

/**
 * Simulates network latency that matches real Shelby retrieval times.
 */
function simulateLatency(): Promise<number> {
  const ms = 40 + Math.random() * 50; // 40-90ms
  return new Promise((resolve) => setTimeout(() => resolve(ms), ms));
}

/**
 * Stores a memory object on Shelby and returns a receipt.
 * Mirrors the real SDK signature: shelby.put(content) -> { id, receipt }
 */
export async function put(content: string): Promise<{ memory: ShelbyMemory; receipt: ShelbyReceipt }> {
  const retrievalMs = await simulateLatency();

  const memory: ShelbyMemory = {
    id: generateHash(),
    content,
    timestamp: Date.now(),
    receiptHash: generateHash(),
    size: new Blob([content]).size,
  };

  const receipt: ShelbyReceipt = {
    hash: memory.receiptHash,
    network: 'shelby-testnet',
    anchorChain: 'aptos-testnet',
    retrievalMs,
  };

  // Persist for demo continuity across page refreshes
  if (typeof window !== 'undefined') {
    const existing = await list();
    const updated = [memory, ...existing];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  return { memory, receipt };
}

/**
 * Retrieves all stored memories.
 * In real Shelby SDK: shelby.list({ namespace })
 */
export async function list(): Promise<ShelbyMemory[]> {
  if (typeof window === 'undefined') return [];

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    return JSON.parse(raw) as ShelbyMemory[];
  } catch {
    return [];
  }
}

/**
 * Retrieves memories relevant to a query.
 *
 * In real Shelby SDK with embeddings, this performs vector similarity search.
 * Mock version uses keyword matching with a fallback to recency when no
 * keyword matches exist — mirroring how production agent memory systems
 * blend semantic + recency signals.
 */
export async function recall(query: string, limit = 5): Promise<ShelbyMemory[]> {
  await simulateLatency();

  const all = await list();
  if (all.length === 0) return [];

  // Score by keyword overlap
  const queryWords = query.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  const scored = all.map((memory) => {
    const contentLower = memory.content.toLowerCase();
    const score = queryWords.reduce((acc, word) => (contentLower.includes(word) ? acc + 1 : acc), 0);
    return { memory, score };
  });

  const matches = scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.memory);

  // Fallback: when no keyword matches, surface the most recent memories
  // so the agent always has *some* context about the user.
  if (matches.length === 0) {
    return all.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
  }

  return matches;
}

/**
 * Clears all stored memories. Useful for demo reset.
 */
export async function clear(): Promise<void> {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
  }
}

/**
 * Aggregate stats about the memory store.
 */
export async function stats(): Promise<{ count: number; totalBytes: number }> {
  const all = await list();
  return {
    count: all.length,
    totalBytes: all.reduce((sum, m) => sum + m.size, 0),
  };
}