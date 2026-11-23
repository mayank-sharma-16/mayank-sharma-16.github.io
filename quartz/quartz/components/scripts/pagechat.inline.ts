let worker: Worker | null = null;
let isReady = false;

export interface PageSection {
  heading: string;
  content: string;
}

function formatMB(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getStructuredPageSections(): { title: string; sections: PageSection[] } {
  const title =
    document.querySelector("h1.article-title, .article-title, h1")?.textContent?.trim() ||
    document.title;

  const article = (
    document.querySelector(".center article") ||
    document.querySelector("article") ||
    document.querySelector(".page-content")
  ) as HTMLElement | null;

  if (!article) {
    console.warn("PageChat: No <article> element found.");
    return { title, sections: [] };
  }

  const sections: PageSection[] = [];
  let currentHeading = title || "Overview";
  let currentBlocks: string[] = [];

  const blocks = article.querySelectorAll("h1, h2, h3, h4, p, li, blockquote, pre");
  blocks.forEach((el) => {
    if (el.closest("nav, .footnotes")) return;

    const tag = el.tagName.toLowerCase();
    const text = (el as HTMLElement).innerText?.trim();
    if (!text) return;

    // Skip duplicating h1 if it matches the page title already captured
    if (tag === "h1" && text.replace(/#$/, "").trim() === currentHeading) return;

    // Treat explicit headings OR short standalone bolded lines as section headers
    const isExplicitHeading = tag === "h1" || tag === "h2" || tag === "h3" || tag === "h4";
    const isBoldSubheader =
      tag === "p" &&
      el.children.length === 1 &&
      el.firstElementChild?.tagName.toLowerCase() === "strong" &&
      text.length < 80;

    if (isExplicitHeading || isBoldSubheader) {
      if (currentBlocks.length > 0) {
        sections.push({
          heading: currentHeading,
          content: currentBlocks.join("\n"),
        });
        currentBlocks = [];
      }
      currentHeading = text.replace(/#$/, "").replace(/:$/, "").trim();
    } else {
      if (tag === "p" && el.parentElement?.tagName.toLowerCase() === "li") return;
      currentBlocks.push(tag === "li" ? `• ${text}` : text);
    }
  });

  if (currentBlocks.length > 0) {
    sections.push({
      heading: currentHeading,
      content: currentBlocks.join("\n"),
    });
  }

  if (sections.length === 0) {
    const raw = (article.innerText || "").replace(/\n{3,}/g, "\n\n").trim();
    if (raw) sections.push({ heading: title || "Overview", content: raw });
  }

  console.group(`PageChat Sections — "${title}" (${sections.length} sections)`);
  console.log(sections);
  console.groupEnd();

  return { title, sections };
}

document.addEventListener("nav", () => {
  const toggleBtn = document.getElementById("page-chat-toggle");
  const closeBtn = document.getElementById("page-chat-close");
  const panel = document.getElementById("page-chat-panel");
  const form = document.getElementById("page-chat-form") as HTMLFormElement;
  const input = document.getElementById("page-chat-input") as HTMLInputElement;
  const submitBtn = document.getElementById("page-chat-submit") as HTMLButtonElement;
  const statusEl = document.getElementById("page-chat-status");
  const progressWrap = document.getElementById("page-chat-progress-wrap");
  const progressBar = document.getElementById("page-chat-progress") as HTMLProgressElement;
  const progressDetail = document.getElementById("page-chat-progress-detail");
  const answerEl = document.getElementById("page-chat-answer");

  if (!toggleBtn || !panel || !form) return;

  if (isReady) {
    input.disabled = false;
    submitBtn.disabled = false;
    submitBtn.textContent = "Ask";
    if (progressWrap) progressWrap.hidden = true;
    if (statusEl) statusEl.textContent = "Ready — single-question mode.";
  }

  toggleBtn.onclick = () => {
    panel.hidden = !panel.hidden;
  };
  if (closeBtn) {
    closeBtn.onclick = () => {
      panel.hidden = true;
    };
  }

  form.onsubmit = (e) => {
    e.preventDefault();

    if (!worker) {
      worker = new Worker("/static/llm-worker.bundle.js", { type: "module" });
      submitBtn.disabled = true;
      if (progressWrap) progressWrap.hidden = false;
      if (progressBar) progressBar.removeAttribute("value");
      if (statusEl) statusEl.textContent = "Initializing runtime & connecting to Hugging Face...";

      worker.onerror = (err) => {
        console.error("LLM Worker ErrorEvent:", err);
        const details = [err.message, err.filename, err.lineno ? `line ${err.lineno}` : ""]
          .filter(Boolean)
          .join(" — ");
        if (progressWrap) progressWrap.hidden = true;
        if (statusEl) statusEl.textContent = `Worker error: ${details || "See console"}`;
        submitBtn.disabled = false;
        worker = null;
      };

      worker.onmessage = (msg) => {
        const { type, progress, token, message, sources } = msg.data;

        if (type === "progress" && progress) {
          const fileName = progress.file ? progress.file.split("/").pop() : "model";

          if (progress.status === "initiate" || progress.status === "download") {
            if (statusEl) statusEl.textContent = `Fetching ${fileName}...`;
          } else if (progress.status === "progress") {
            if (typeof progress.progress === "number" && progressBar) {
              progressBar.value = progress.progress;
            }
            if (statusEl) {
              const pct = typeof progress.progress === "number" ? ` (${Math.round(progress.progress)}%)` : "";
              statusEl.textContent = `Downloading ${fileName}${pct}`;
            }
            if (progressDetail && typeof progress.loaded === "number") {
              const totalStr = typeof progress.total === "number" ? ` / ${formatMB(progress.total)}` : "";
              progressDetail.textContent = `${formatMB(progress.loaded)}${totalStr}`;
            }
          } else if (progress.status === "done") {
            if (statusEl) statusEl.textContent = `Downloaded ${fileName}. Compiling shaders...`;
            if (progressBar) progressBar.removeAttribute("value");
          }
        } else if (type === "ready") {
          isReady = true;
          if (progressWrap) progressWrap.hidden = true;
          input.disabled = false;
          submitBtn.disabled = false;
          submitBtn.textContent = "Ask";
          if (statusEl) statusEl.textContent = "Ready — single-question mode.";
          input.focus();
        } else if (type === "token" && answerEl) {
          answerEl.textContent = token;
        } else if (type === "done" && statusEl) {
          const sourceLabel = Array.isArray(sources) && sources.length > 0 ? ` (${sources.join(", ")})` : "";
          statusEl.textContent = `Answered from page${sourceLabel}.`;
          submitBtn.disabled = false;
        } else if (type === "error" && statusEl) {
          if (progressWrap) progressWrap.hidden = true;
          statusEl.textContent = `Error: ${message}`;
          submitBtn.disabled = false;
        }
      };

      worker.postMessage({ type: "init" });
      return;
    }

    const question = input.value.trim();
    if (!isReady || !question) return;

    const { title, sections } = getStructuredPageSections();
    if (answerEl) answerEl.textContent = "";
    if (statusEl) statusEl.textContent = "Searching page & thinking...";
    submitBtn.disabled = true;

    worker.postMessage({ type: "ask", pageTitle: title, sections, question });
  };
});
