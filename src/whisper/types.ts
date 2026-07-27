export type WhisperRuntimeBackend = 'cpu' | 'cuda' | 'vulkan';
export type WhisperBackendRequest = WhisperRuntimeBackend | 'auto';
export type WhisperSetupBackend = WhisperBackendRequest | 'both' | 'all';

export type WhisperExecutable = {
  backend: WhisperRuntimeBackend;
  path: string | null;
  buildRoot: string;
  available: boolean;
};

export type RenderNode = {
  path: string;
  gid: number;
  accessible: boolean;
};

export type BackendCapability = {
  backend: WhisperRuntimeBackend;
  available: boolean;
  detail: string;
  deviceName?: string;
  renderNodes?: RenderNode[];
  loaderAvailable?: boolean;
  icdPaths?: string[];
};

export type WhisperBackendInspection = {
  executable: WhisperExecutable;
  capability: BackendCapability;
};

export type WhisperRuntimeInspection = {
  requested: WhisperBackendRequest;
  backends: WhisperBackendInspection[];
};

export type ResolvedWhisperRuntime = {
  requested: WhisperBackendRequest;
  backend: WhisperRuntimeBackend;
  executable: string;
  buildRoot: string;
  capability: BackendCapability;
  warning?: string;
};
