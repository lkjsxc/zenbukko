import { el } from '../utils/html.js';

export const ARCHIVE_OPTION_LABELS = [
  'Download media',
  'Transcribe media',
  'Download materials',
  'Download confirmation tests',
  'Run PDF OCR (includes materials)',
  'Delete media after transcript',
];
export const DEFAULT_MEDIA = true;
export const DEFAULT_CONFIRMATION_TESTS = true;

export type ArchiveOptionState = {
  media: boolean;
  transcribe: boolean;
  materials: boolean;
  confirmationTests: boolean;
  ocrMaterials: boolean;
  cleanup: boolean;
};

type ArchiveOptionControls = {
  root: HTMLElement;
  media: HTMLInputElement;
  transcribe: HTMLInputElement;
  materials: HTMLInputElement;
  confirmationTests: HTMLInputElement;
  ocrMaterials: HTMLInputElement;
  cleanup: HTMLInputElement;
};

export const normalizeArchiveOptionState = (state: ArchiveOptionState): ArchiveOptionState => ({
  ...state,
  media: state.media || state.transcribe,
  materials: state.materials || state.ocrMaterials,
  cleanup: state.cleanup && state.transcribe,
});

export const createArchiveOptionControls = (): ArchiveOptionControls => {
  const controls = {
    media: checkbox(DEFAULT_MEDIA),
    transcribe: checkbox(false),
    materials: checkbox(false),
    confirmationTests: checkbox(DEFAULT_CONFIRMATION_TESTS),
    ocrMaterials: checkbox(false),
    cleanup: checkbox(true),
  };
  const syncMedia = (): void => {
    if (controls.transcribe.checked) controls.media.checked = true;
    controls.media.disabled = controls.transcribe.checked;
    controls.cleanup.disabled = !controls.transcribe.checked;
  };
  const syncMaterials = (): void => {
    if (controls.ocrMaterials.checked) controls.materials.checked = true;
    controls.materials.disabled = controls.ocrMaterials.checked;
  };
  controls.transcribe.addEventListener('change', syncMedia);
  controls.ocrMaterials.addEventListener('change', syncMaterials);
  syncMedia();
  syncMaterials();
  const root = el('fieldset', { className: 'option-group' });
  root.append(el('legend', { className: 'field-label', text: 'Processing options' }));
  Object.values(controls).forEach((input, index) => {
    root.append(el('label', { className: 'check' }, input, el('span', { text: ARCHIVE_OPTION_LABELS[index] })));
  });
  return { root, ...controls };
};

export const archiveOptionRequest = (controls: ArchiveOptionControls): Record<string, boolean> => {
  const state = normalizeArchiveOptionState({
    media: controls.media.checked,
    transcribe: controls.transcribe.checked,
    materials: controls.materials.checked,
    confirmationTests: controls.confirmationTests.checked,
    ocrMaterials: controls.ocrMaterials.checked,
    cleanup: controls.cleanup.checked,
  });
  return {
    media: state.media,
    transcribe: state.transcribe,
    materials: state.materials,
    confirmationTests: state.confirmationTests,
    ocrMaterials: state.ocrMaterials,
    deleteMediaAfterTranscribe: state.cleanup,
  };
};

const checkbox = (checked: boolean): HTMLInputElement => {
  const input = el('input', { type: 'checkbox' }) as HTMLInputElement;
  input.checked = checked;
  return input;
};
