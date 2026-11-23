import { QuartzComponent, QuartzComponentConstructor } from "./types";
// @ts-ignore
import script from "./scripts/pagechat.inline";

const PageChat: QuartzComponent = () => {
  return (
    <div id="page-chat-root">
      <button id="page-chat-toggle" aria-label="Ask this page">
        Ask Page AI
      </button>

      <div id="page-chat-panel" hidden>
        <div id="page-chat-header">
          <strong>Ask About This Page</strong>
          <button id="page-chat-close" aria-label="Close">✕</button>
        </div>

        <div id="page-chat-status">Click "Load Model" to enable local Q&A (~750 MB one-time cache).</div>
        <div id="page-chat-progress-wrap" hidden>
          <progress id="page-chat-progress" value="0" max="100"></progress>
          <span id="page-chat-progress-detail">0 MB</span>
        </div>

        <div id="page-chat-answer"></div>

        <form id="page-chat-form">
          <input
            id="page-chat-input"
            type="text"
            placeholder="Ask a question about this note..."
            disabled
          />
          <button id="page-chat-submit" type="submit">Load Model</button>
        </form>
      </div>
    </div>
  );
};

PageChat.afterDOMLoaded = script;
PageChat.css = `
  #page-chat-toggle {
    position: fixed; bottom: 1.25rem; right: 1.25rem; z-index: 999;
    padding: 0.6rem 1rem; border-radius: 999px; border: 1px solid var(--lightgray);
    background: var(--secondary); color: var(--light); cursor: pointer; font-weight: 600;
  }
  #page-chat-panel {
    position: fixed; bottom: 4.25rem; right: 1.25rem; width: 420px; max-width: calc(100vw - 2.5rem);
    background: var(--light); border: 1px solid var(--lightgray); border-radius: 12px;
    padding: 1rem; z-index: 999; box-shadow: 0 8px 24px rgba(0,0,0,0.15);
  }
  #page-chat-header { display: flex; justify-content: space-between; margin-bottom: 0.5rem; }
  #page-chat-status { font-size: 0.8rem; color: var(--gray); margin-bottom: 0.4rem; }
  #page-chat-progress-wrap {
    display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.65rem;
  }
  #page-chat-progress-wrap[hidden] { display: none; }
  #page-chat-progress {
    flex: 1; height: 8px; border-radius: 4px; accent-color: var(--secondary);
  }
  #page-chat-progress-detail {
    font-size: 0.75rem; color: var(--darkgray); font-variant-numeric: tabular-nums; white-space: nowrap;
  }
  #page-chat-answer {
    max-height: 380px; overflow-y: auto; font-size: 0.9rem; line-height: 1.5;
    margin-bottom: 0.75rem; white-space: pre-wrap;
  }
  #page-chat-form { display: flex; gap: 0.4rem; }
  #page-chat-input { flex: 1; padding: 0.45rem; border: 1px solid var(--lightgray); border-radius: 6px; }
`;

export default (() => PageChat) satisfies QuartzComponentConstructor;
