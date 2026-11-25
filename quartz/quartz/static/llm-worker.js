import { pipeline, TextStreamer, env } from "@huggingface/transformers";

env.allowLocalModels = false;
env.backends.onnx.wasm.wasmPaths = "/static/transformers/";
env.backends.onnx.wasm.numThreads = 1;

let generator = null;
const wasmBlobUrls = {};
const originalFetch = self.fetch.bind(self);

async function getReassembledWasmUrl(type) {
  if (wasmBlobUrls[type]) return wasmBlobUrls[type];

  const [p1, p2] = await Promise.all([
    originalFetch(`/static/transformers/${type}.part1.bin`).then((r) => {
      if (!r.ok) throw new Error(`Failed to fetch ${type}.part1.bin (${r.status})`);
      return r.arrayBuffer();
    }),
    originalFetch(`/static/transformers/${type}.part2.bin`).then((r) => {
      if (!r.ok) throw new Error(`Failed to fetch ${type}.part2.bin (${r.status})`);
      return r.arrayBuffer();
    }),
  ]);

  const blob = new Blob([p1, p2], { type: "application/wasm" });
  wasmBlobUrls[type] = URL.createObjectURL(blob);
  return wasmBlobUrls[type];
}

self.fetch = async (input, init) => {
  const url = typeof input === "string" ? input : input instanceof Request ? input.url : String(input);

  if (url.endsWith("ort-wasm-simd-threaded.jsep.wasm")) {
    const blobUrl = await getReassembledWasmUrl("jsep");
    return originalFetch(blobUrl);
  }
  if (url.endsWith("ort-wasm-simd-threaded.asyncify.wasm")) {
    const blobUrl = await getReassembledWasmUrl("asyncify");
    return originalFetch(blobUrl);
  }

  return originalFetch(input, init);
};

const originalXhrOpen = XMLHttpRequest.prototype.open;
XMLHttpRequest.prototype.open = function (method, url, ...rest) {
  const urlStr = String(url);

  if (urlStr.endsWith("ort-wasm-simd-threaded.jsep.wasm") && wasmBlobUrls.jsep) {
    return originalXhrOpen.call(this, method, wasmBlobUrls.jsep, ...rest);
  }
  if (urlStr.endsWith("ort-wasm-simd-threaded.asyncify.wasm") && wasmBlobUrls.asyncify) {
    return originalXhrOpen.call(this, method, wasmBlobUrls.asyncify, ...rest);
  }

  return originalXhrOpen.call(this, method, url, ...rest);
};

const STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "has", "he",
  "in", "is", "it", "its", "of", "on", "that", "the", "to", "was", "were",
  "will", "with", "what", "when", "where", "who", "why", "how", "can", "could",
  "should", "would", "do", "does", "did", "this", "these", "those", "or", "but"
]);

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 1 && !STOPWORDS.has(word));
}

function splitLongBlockBySentences(text, maxChars, overlapChars) {
  const sentences = text.match(/[^.!?]+[.!?]+(?:\s|$)|[^.!?]+$/g) || [text];
  const parts = [];
  let current = "";

  for (const rawSentence of sentences) {
    const sentence = rawSentence.trim();
    if (!sentence) continue;

    if ((current + " " + sentence).length > maxChars && current.length > 0) {
      parts.push(current.trim());
      const tail = current.slice(-overlapChars);
      current = tail + " " + sentence;
    } else {
      current = current ? current + " " + sentence : sentence;
    }
  }

  if (current.trim()) {
    parts.push(current.trim());
  }

  return parts;
}

function chunkSections(sections, maxChars = 850, overlapChars = 140) {
  const chunks = [];

  for (const section of sections) {
    const heading = section.heading || "Section";
    const content = (section.content || "").trim();
    if (!content) continue;

    if (content.length <= maxChars) {
      chunks.push({ heading, text: content });
      continue;
    }

    const rawParagraphs = content.split(/\n+/);
    const units = [];
    for (const para of rawParagraphs) {
      const cleanPara = para.trim();
      if (!cleanPara) continue;
      if (cleanPara.length > maxChars) {
        units.push(...splitLongBlockBySentences(cleanPara, maxChars, overlapChars));
      } else {
        units.push(cleanPara);
      }
    }

    let current = "";
    let partIdx = 1;

    for (const unit of units) {
      if ((current + "\n" + unit).length > maxChars && current.length > 0) {
        chunks.push({
          heading: `${heading} (Part ${partIdx})`,
          text: current.trim(),
        });
        partIdx++;
        const tail = current.slice(-overlapChars);
        current = tail + "\n" + unit;
      } else {
        current = current ? current + "\n" + unit : unit;
      }
    }

    if (current.trim()) {
      chunks.push({
        heading: partIdx > 1 ? `${heading} (Part ${partIdx})` : heading,
        text: current.trim(),
      });
    }
  }

  console.group(`BM25 Chunker: Created ${chunks.length} granular chunks`);
  chunks.forEach((c, i) => console.log(`[Chunk ${i + 1}] (${c.text.length} chars) — ${c.heading}:`, c.text));
  console.groupEnd();

  return chunks;
}

function rankChunksBM25(chunks, query, topK = 4, k1 = 1.5, b = 0.75) {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0 || chunks.length === 0) {
    return chunks.slice(0, topK);
  }

  const docs = chunks.map((c) => tokenize(`${c.heading} ${c.heading} ${c.text}`));
  const N = docs.length;
  const avgdl = docs.reduce((sum, d) => sum + d.length, 0) / N || 1;

  const uniqueQueryTerms = [...new Set(queryTokens)];
  const df = {};
  for (const term of uniqueQueryTerms) {
    df[term] = docs.filter((doc) => doc.includes(term)).length;
  }

  const scored = chunks.map((chunk, idx) => {
    const doc = docs[idx];
    const dl = doc.length;
    const tfMap = {};
    for (const token of doc) {
      tfMap[token] = (tfMap[token] || 0) + 1;
    }

    let score = 0;
    for (const term of queryTokens) {
      const tf = tfMap[term] || 0;
      if (tf === 0) continue;

      const docFreq = df[term] || 0;
      const idf = Math.log(1 + (N - docFreq + 0.5) / (docFreq + 0.5));
      const numerator = tf * (k1 + 1);
      const denominator = tf + k1 * (1 - b + b * (dl / avgdl));
      score += idf * (numerator / denominator);
    }

    return { chunk, score, index: idx };
  });

  scored.sort((a, b) => (b.score !== a.score ? b.score - a.score : a.index - b.index));

  if (scored.score === 0) {
    return chunks.slice(0, topK);
  }

  return scored.slice(0, topK).map((item) => item.chunk);
}

self.onmessage = async (e) => {
  const { type, pageTitle, sections, pageText, question } = e.data;

  if (type === "init") {
    try {
      await Promise.all([
        getReassembledWasmUrl("jsep"),
        getReassembledWasmUrl("asyncify"),
      ]);

      if (!generator) {
        let device = "wasm";
        if (navigator.gpu) {
          const adapter = await navigator.gpu.requestAdapter();
          if (adapter) {
            device = "webgpu";
          }
        }

        // Use LFM2-2.6B on WebGPU; fall back to LFM2.5-1.2B on CPU/WASM so it never OOMs
        const modelId =
          device === "webgpu"
            ? "onnx-community/LFM2-2.6B-ONNX"
            : "LiquidAI/LFM2.5-1.2B-Instruct-ONNX";

        console.log(`LLM Worker initializing ${modelId} on ${device.toUpperCase()}`);
        self.postMessage({
          type: "status",
          message: `Initializing ${device === "webgpu" ? "LFM2-2.6B (WebGPU)" : "LFM2.5-1.2B (CPU)"}...`,
        });

        generator = await pipeline("text-generation", modelId, {
          dtype: "q4",
          device,
          progress_callback: (progress) => {
            self.postMessage({ type: "progress", progress });
          },
        });
      }
      self.postMessage({ type: "ready" });
    } catch (err) {
      self.postMessage({ type: "error", message: String(err) });
    }
  }

  if (type === "ask") {
    try {
      const inputSections =
        Array.isArray(sections) && sections.length > 0
          ? sections
          : [{ heading: "Page Content", content: pageText || "" }];

      const chunks = chunkSections(inputSections, 850, 140);
      const topChunks = rankChunksBM25(chunks, question, 4);

      const retrievedContext = topChunks
        .map((c) => `### ${c.heading}\n${c.text}`)
        .join("\n\n")
        .slice(0, 4500);

      const sources = [...new Set(topChunks.map((c) => c.heading))];

      const messages = [
        {
          role: "system",
          content:
            "You are a thorough recovery coach co-pilot for MankNotes.com, authored by Mank. Answer the user's question in depth using the retrieved page excerpts. Break down definitions, mechanisms, and practical applications clearly across well-structured paragraphs. If the excerpts do not cover the question AT ALL, state that directly.",
        },
        {
          role: "user",
          content: `Page Title: ${pageTitle}\n\nRetrieved Excerpts:\n${retrievedContext}\n\nQuestion: ${question}`,
        },
      ];

      let fullResponse = "";
      const streamer = new TextStreamer(generator.tokenizer, {
        skip_prompt: true,
        skip_special_tokens: true,
        callback_function: (token) => {
          fullResponse += token;
          self.postMessage({ type: "token", token: fullResponse.trimStart() });
        },
      });

      console.log("BM25 retrieved sources:", sources);

      await generator(messages, {
        max_new_tokens: 750,
        temperature: 0.2,
        top_k: 50,
        top_p: 0.9,
        repetition_penalty: 1.08,
        do_sample: true,
        streamer,
      });

      const finalAnswer = fullResponse.trim();
      self.postMessage({ type: "done", answer: finalAnswer, sources });
    } catch (err) {
      self.postMessage({ type: "error", message: String(err) });
    }
  }
};
