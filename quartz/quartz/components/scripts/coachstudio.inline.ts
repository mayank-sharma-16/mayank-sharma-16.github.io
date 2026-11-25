interface TemplateFormat {
  id: string;
  label: string;
  placeholder: string;
  instructions: string;
}

interface TemplateCategory {
  id: string;
  label: string;
  formats: TemplateFormat[];
}

interface SavedAsset {
  id: string;
  title: string;
  category: string;
  format: string;
  createdAt: string;
  content: string;
}

const TEMPLATES: TemplateCategory[] = [
  {
    id: "progress_notes",
    label: "Progress Notes",
    formats: [
      {
        id: "BIRP",
        label: "BIRP (Behavior, Intervention, Response, Plan)",
        placeholder: "e.g., Client reported cravings after work conflict. Practiced urge surfing and reviewed HALT triggers. Agreed to attend evening meeting...",
        instructions: "Use Markdown headings: ### Behavior, ### Intervention, ### Response, ### Plan.",
      },
      {
        id: "PIRP",
        label: "PIRP (Problem, Intervention, Response, Plan)",
        placeholder: "e.g., Struggling with evening isolation and sleep in week 3. Built wind-down routine and listed two sober contacts...",
        instructions: "Use Markdown headings: ### Problem, ### Intervention, ### Response, ### Plan.",
      },
      {
        id: "GIRP",
        label: "GIRP (Goal, Intervention, Response, Plan)",
        placeholder: "e.g., Goal: rebuild morning routine. Reviewed habit stacking and time-blocking. Committed to 15-min walk...",
        instructions: "Use Markdown headings: ### Goal, ### Intervention, ### Response, ### Plan.",
      },
      {
        id: "SOAP",
        label: "SOAP (Subjective, Objective, Assessment, Plan)",
        placeholder: "e.g., Client reports 7/10 mood and zero cravings. Completed trigger log. Showing strong self-efficacy...",
        instructions: "Use Markdown headings: ### Subjective, ### Objective, ### Assessment, ### Plan.",
      },
    ],
  },
  {
    id: "cbt_worksheets",
    label: "CBT & Coping Worksheets",
    formats: [
      {
        id: "thought_record",
        label: "CBT Thought Record",
        placeholder: "e.g., Trigger: passed old hangout after shift. Thought: 'I ruined everything anyway.' Emotion: shame, anxiety (80%)...",
        instructions: "Create a fillable Markdown worksheet with sections: ### 1. Triggering Situation, ### 2. Automatic Thoughts, ### 3. Emotions & Intensity (0-100%), ### 4. Cognitive Distortions, ### 5. Evidence For & Against, ### 6. Balanced Alternative Thought, ### 7. Next Coping Action.",
      },
      {
        id: "urge_surfing",
        label: "Trigger & Urge Action Plan",
        placeholder: "e.g., High-risk times: Friday nights, payday. Helpful tools: calling sponsor, cold water, gym, guitar...",
        instructions: "Create a structured recovery worksheet with: ### High-Risk Triggers & Early Warning Signs, ### Physical & Mental Urge Cues, ### 5-Minute Urge Surfing Steps, ### Replacement Menu, ### Support Call List.",
      },
      {
        id: "decisional_balance",
        label: "Decisional Balance Matrix",
        placeholder: "e.g., Ambivalent about cutting ties with old friend group. Misses belonging, tired of hangovers and financial drain...",
        instructions: "Create a Motivational Interviewing worksheet with sections: ### Benefits of Change, ### Costs of Change, ### Perceived Benefits of Staying Same, ### Costs of Staying Same, ### Core Values Reflection Prompts.",
      },
    ],
  },
  {
    id: "career_planning",
    label: "Career & Vocational Planning",
    formats: [
      {
        id: "smart_career",
        label: "30/60/90-Day Recovery-Safe Career Plan",
        placeholder: "e.g., Warehouse & customer service background. Needs daytime hours to protect evening meetings. Wants forklift cert...",
        instructions: "Create an actionable roadmap with: ### Target Role & Recovery-Safe Boundaries, ### Transferable Strengths, ### Barriers & Mitigations, ### Days 1-30 (Foundation), ### Days 31-60 (Applications), ### Days 61-90 (Onboarding).",
      },
      {
        id: "skills_inventory",
        label: "Strengths & Transferable Skills Inventory",
        placeholder: "e.g., 4 years line cook, calm under pressure, great with inventory, transitioning out of late-night hospitality...",
        instructions: "Create a structured worksheet with: ### Core Hard & Soft Skills, ### Recovery Resilience Strengths, ### Resume Bullet Examples, ### Low-Trigger Industry Directions.",
      },
    ],
  },
];

const STORAGE_KEY = "manknotes_coach_assets_v1";
let studioWorker: Worker | null = null;
let studioReady = false;

function loadSavedAssets(): SavedAsset[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveAssetsList(assets: SavedAsset[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(assets));
}

function renderMarkdownPreview(md: string): string {
  return md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/^### (.*$)/gim, "<h3>$1</h3>")
    .replace(/^## (.*$)/gim, "<h2>$1</h2>")
    .replace(/^# (.*$)/gim, "<h1>$1</h1>")
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/^- (.*$)/gim, "<li>$1</li>")
    .replace(/\n{2,}/g, "<br><br>")
    .replace(/\n/g, "<br>");
}

document.addEventListener("nav", () => {
  const mount = document.getElementById("coach-studio-mount");
  if (!mount) return;

  mount.innerHTML = `
    <div class="cs-container">
      <div class="cs-card">
        <div class="cs-status-bar">
          <span id="cs-model-status">Model not loaded yet (uses cached browser model).</span>
          <button id="cs-load-btn" type="button" class="cs-btn-secondary">Initialize Model</button>
        </div>
        <div id="cs-progress-wrap" hidden>
          <progress id="cs-progress" value="0" max="100"></progress>
          <span id="cs-progress-text">0%</span>
        </div>
        <div class="cs-grid">
          <div>
            <label for="cs-category"><strong>1. Asset Type</strong></label>
            <select id="cs-category" class="cs-select"></select>
          </div>
          <div>
            <label for="cs-format"><strong>2. Template Format</strong></label>
            <select id="cs-format" class="cs-select"></select>
          </div>
        </div>
        <div class="cs-field">
          <label for="cs-title"><strong>3. Asset Title</strong></label>
          <input id="cs-title" type="text" class="cs-input" placeholder="e.g., Client J.D. — Evening Trigger Thought Record" />
        </div>
        <div class="cs-field">
          <label for="cs-notes"><strong>4. Unstructured Session Notes / Client Context</strong></label>
          <textarea id="cs-notes" rows="6" class="cs-textarea"></textarea>
          <small class="cs-hint">Use initials or pseudonyms. All AI processing runs 100% locally in your browser.</small>
        </div>
        <button id="cs-generate-btn" type="button" class="cs-btn-primary">Generate Asset</button>
      </div>
      <div class="cs-split">
        <div class="cs-card">
          <div class="cs-viewer-header">
            <strong id="cs-viewer-title">Live Output / Asset Viewer</strong>
            <div class="cs-actions">
              <button id="cs-copy-btn" type="button" class="cs-btn-small" disabled>Copy MD</button>
              <button id="cs-download-btn" type="button" class="cs-btn-small" disabled>Download .md</button>
            </div>
          </div>
          <div id="cs-viewer-body" class="cs-viewer-body">Select a template, enter notes, and click Generate—or pick a saved asset from your library.</div>
        </div>
        <div class="cs-card">
          <strong>Saved Browser Library (<span id="cs-saved-count">0</span>)</strong>
          <div id="cs-saved-list" class="cs-saved-list"></div>
        </div>
      </div>
    </div>
  `;

  const catSelect = document.getElementById("cs-category") as HTMLSelectElement;
  const fmtSelect = document.getElementById("cs-format") as HTMLSelectElement;
  const titleInput = document.getElementById("cs-title") as HTMLInputElement;
  const notesInput = document.getElementById("cs-notes") as HTMLTextAreaElement;
  const loadBtn = document.getElementById("cs-load-btn") as HTMLButtonElement;
  const genBtn = document.getElementById("cs-generate-btn") as HTMLButtonElement;
  const statusEl = document.getElementById("cs-model-status")!;
  const progressWrap = document.getElementById("cs-progress-wrap")!;
  const progressBar = document.getElementById("cs-progress") as HTMLProgressElement;
  const progressText = document.getElementById("cs-progress-text")!;
  const viewerTitle = document.getElementById("cs-viewer-title")!;
  const viewerBody = document.getElementById("cs-viewer-body")!;
  const copyBtn = document.getElementById("cs-copy-btn") as HTMLButtonElement;
  const downloadBtn = document.getElementById("cs-download-btn") as HTMLButtonElement;
  const savedListEl = document.getElementById("cs-saved-list")!;
  const savedCountEl = document.getElementById("cs-saved-count")!;

  let activeMarkdown = "";
  let activeFilename = "recovery-asset.md";

  function setViewerContent(title: string, md: string) {
    activeMarkdown = md;
    activeFilename = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "asset"}.md`;
    viewerTitle.textContent = title;
    viewerBody.innerHTML = renderMarkdownPreview(md);
    copyBtn.disabled = !md;
    downloadBtn.disabled = !md;
  }

  function refreshSavedList() {
    const items = loadSavedAssets();
    savedCountEl.textContent = String(items.length);
    if (items.length === 0) {
      savedListEl.innerHTML = `<p class="cs-hint">No saved assets yet. Generated worksheets are stored locally in this browser.</p>`;
      return;
    }

    savedListEl.innerHTML = items
      .map(
        (item) => `
        <div class="cs-saved-item" data-id="${item.id}">
          <div class="cs-saved-meta">
            <strong>${item.title}</strong>
            <span>${item.category} • ${item.format} • ${item.createdAt}</span>
          </div>
          <div class="cs-saved-btns">
            <button type="button" class="cs-btn-small cs-view-btn" data-id="${item.id}">View</button>
            <button type="button" class="cs-btn-small cs-del-btn" data-id="${item.id}">✕</button>
          </div>
        </div>`
      )
      .join("");

    savedListEl.querySelectorAll(".cs-view-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = (btn as HTMLElement).dataset.id;
        const found = loadSavedAssets().find((a) => a.id === id);
        if (found) setViewerContent(found.title, found.content);
      });
    });

    savedListEl.querySelectorAll(".cs-del-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = (btn as HTMLElement).dataset.id;
        saveAssetsList(loadSavedAssets().filter((a) => a.id !== id));
        refreshSavedList();
      });
    });
  }

  function populateFormats(categoryId: string) {
    const cat = TEMPLATES.find((c) => c.id === categoryId) ?? TEMPLATES[0];
    fmtSelect.innerHTML = cat.formats
      .map((f) => `<option value="${f.id}">${f.label}</option>`)
      .join("");
    notesInput.placeholder = cat.formats[0]?.placeholder ?? "";
  }

  catSelect.innerHTML = TEMPLATES.map((c) => `<option value="${c.id}">${c.label}</option>`).join("");
  populateFormats(TEMPLATES[0].id);
  refreshSavedList();

  catSelect.onchange = () => populateFormats(catSelect.value);
  fmtSelect.onchange = () => {

    const cat = TEMPLATES.find((c) => c.id === catSelect.value);
    const fmt = cat?.formats.find((f) => f.id === fmtSelect.value);
    if (fmt) notesInput.placeholder = fmt.placeholder;
  };

  function initWorker(onReadyCallback?: () => void) {
    if (studioReady && studioWorker) {
      onReadyCallback?.();
      return;
    }
    if (!studioWorker) {
      studioWorker = new Worker("/static/llm-worker.bundle.js", { type: "module" });
    }
    loadBtn.disabled = true;
    genBtn.disabled = true;
    progressWrap.hidden = false;
    progressBar.removeAttribute("value");
    statusEl.textContent = "Loading local model...";

    studioWorker.onmessage = (msg) => {
      const { type, progress, token, answer, message } = msg.data;
      if (type === "status") {
        statusEl.textContent = message;
      } else if (type === "progress" && progress?.status === "progress") {
        if (typeof progress.progress === "number") {
          progressBar.value = progress.progress;
          progressText.textContent = `${Math.round(progress.progress)}%`;
        }
      } else if (type === "ready") {
        studioReady = true;
        progressWrap.hidden = true;
        loadBtn.textContent = "Model Ready";
        genBtn.disabled = false;
        statusEl.textContent = "Ready — 100% local generation active.";
        onReadyCallback?.();
      } else if (type === "token") {
        viewerBody.innerHTML = renderMarkdownPreview(token);
      } else if (type === "done") {
        genBtn.disabled = false;
        statusEl.textContent = "Generated & saved to browser library.";
        const cat = TEMPLATES.find((c) => c.id === catSelect.value)!;
        const fmt = cat.formats.find((f) => f.id === fmtSelect.value)!;
        const assetTitle = titleInput.value.trim() || `${fmt.id} — ${new Date().toLocaleDateString()}`;

        const newAsset: SavedAsset = {
          id: crypto.randomUUID(),
          title: assetTitle,
          category: cat.label,
          format: fmt.id,
          createdAt: new Date().toLocaleString([], { dateStyle: "short", timeStyle: "short" }),
          content: answer,
        };
        saveAssetsList([newAsset, ...loadSavedAssets()]);
        setViewerContent(assetTitle, answer);
        refreshSavedList();
      } else if (type === "error") {
        progressWrap.hidden = true;
        loadBtn.disabled = false;
        genBtn.disabled = false;
        statusEl.textContent = `Error: ${message}`;
      }
    };

    studioWorker.postMessage({ type: "init" });
  }

  if (studioReady) {
    loadBtn.textContent = "Model Ready";
    loadBtn.disabled = true;
    statusEl.textContent = "Ready — 100% local generation active.";
  }

  loadBtn.onclick = () => initWorker();

  genBtn.onclick = () => {
    const rawNotes = notesInput.value.trim();
    if (!rawNotes) {
      statusEl.textContent = "Please enter some unstructured notes or context first.";
      return;
    }

    const runGeneration = () => {
      const cat = TEMPLATES.find((c) => c.id === catSelect.value)!;
      const fmt = cat.formats.find((f) => f.id === fmtSelect.value)!;
      genBtn.disabled = true;
      viewerTitle.textContent = "Generating Asset...";
      viewerBody.textContent = "Drafting structured template...";
      statusEl.textContent = `Generating ${fmt.id}...`;

      studioWorker!.postMessage({
        type: "generate_asset",
        categoryLabel: cat.label,
        formatLabel: fmt.label,
        formatInstructions: fmt.instructions,
        rawNotes,
      });
    };

    if (!studioReady) {
      initWorker(runGeneration);
    } else {
      runGeneration();
    }
  };

  copyBtn.onclick = async () => {
    await navigator.clipboard.writeText(activeMarkdown);
    copyBtn.textContent = "Copied!";
    setTimeout(() => (copyBtn.textContent = "Copy MD"), 1500);
  };

  downloadBtn.onclick = () => {
    const blob = new Blob([activeMarkdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = activeFilename;
    a.click();
    URL.revokeObjectURL(url);
  };
});
