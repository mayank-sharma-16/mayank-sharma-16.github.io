import { QuartzComponent, QuartzComponentConstructor } from "./types";
// @ts-ignore
import script from "./scripts/coachstudio.inline";

const CoachStudio: QuartzComponent = () => {
  return <div id="coach-studio-mount"></div>;
};

CoachStudio.afterDOMLoaded = script;
CoachStudio.css = `
  .cs-container { display: flex; flex-direction: column; gap: 1.25rem; margin-top: 1rem; }
  .cs-card {
    background: var(--light); border: 1px solid var(--lightgray);
    border-radius: 10px; padding: 1.15rem;
  }
  .cs-status-bar { display: flex; justify-content: space-between; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem; font-size: 0.85rem; }
  #cs-progress-wrap { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem; }
  #cs-progress-wrap[hidden] { display: none; }
  #cs-progress { flex: 1; height: 8px; accent-color: var(--secondary); }
  .cs-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.85rem; margin-bottom: 0.85rem; }
  @media (max-width: 650px) { .cs-grid, .cs-split { grid-template-columns: 1fr; } }
  .cs-field { display: flex; flex-direction: column; gap: 0.35rem; margin-bottom: 0.85rem; }
  .cs-select, .cs-input, .cs-textarea {
    width: 100%; padding: 0.55rem; border: 1px solid var(--lightgray);
    border-radius: 6px; background: var(--light); color: var(--dark); font-family: inherit;
  }
  .cs-hint { font-size: 0.78rem; color: var(--gray); }
  .cs-btn-primary {
    background: var(--secondary); color: var(--light); border: none;
    padding: 0.65rem 1.25rem; border-radius: 6px; font-weight: 600; cursor: pointer;
  }
  .cs-btn-secondary, .cs-btn-small {
    background: var(--lightgray); color: var(--dark); border: none;
    padding: 0.4rem 0.75rem; border-radius: 6px; cursor: pointer; font-size: 0.82rem;
  }
  .cs-btn-primary:disabled, .cs-btn-small:disabled { opacity: 0.5; cursor: not-allowed; }
  .cs-split { display: grid; grid-template-columns: 1.5fr 1fr; gap: 1rem; align-items: start; }
  .cs-viewer-header { display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem; border-bottom: 1px solid var(--lightgray); padding-bottom: 0.5rem; }
  .cs-actions { display: flex; gap: 0.4rem; }
  .cs-viewer-body { min-height: 260px; max-height: 520px; overflow-y: auto; line-height: 1.6; font-size: 0.92rem; }
  .cs-saved-list { display: flex; flex-direction: column; gap: 0.6rem; margin-top: 0.75rem; max-height: 480px; overflow-y: auto; }
  .cs-saved-item { display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; padding: 0.55rem; border: 1px solid var(--lightgray); border-radius: 6px; }
  .cs-saved-meta { display: flex; flex-direction: column; font-size: 0.82rem; }
  .cs-saved-meta span { font-size: 0.74rem; color: var(--gray); }
  .cs-saved-btns { display: flex; gap: 0.3rem; }
`;

export default (() => CoachStudio) satisfies QuartzComponentConstructor;