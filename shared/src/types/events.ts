// Shared TypeScript event types for the AI Workplace Desktop App

// Application lifecycle events
export interface AppEvents {
  'app:ready': void;
  'app:before-close': void;
  'app:close': void;
  'app:activate': void;
  'app:deactivate': void;
}

// Window events
export interface WindowEvents {
  'window:created': WindowInfo;
  'window:closed': WindowInfo;
  'window:focus': WindowInfo;
  'window:blur': WindowInfo;
  'window:resize': WindowSize;
  'window:move': WindowPosition;
  'window:maximize': WindowInfo;
  'window:minimize': WindowInfo;
  'window:restore': WindowInfo;
  'window:fullscreen': WindowFullscreen;
}

export interface WindowInfo {
  label: string;
  title: string;
  url?: string;
}

export interface WindowSize {
  width: number;
  height: number;
}

export interface WindowPosition {
  x: number;
  y: number;
}

export interface WindowFullscreen {
  fullscreen: boolean;
}

// Backend events
export interface BackendEvents {
  'backend:ready': BackendStatusEvent;
  'backend:stopped': BackendStatusEvent;
  'backend:error': BackendErrorEvent;
  'backend:starting': void;
  'backend:output': BackendOutputEvent;
}

export interface BackendStatusEvent {
  running: boolean;
  pid?: number;
  url?: string;
  error?: string;
}

export interface BackendErrorEvent {
  running: boolean;
  pid?: number;
  url?: string;
  error: string;
}

export interface BackendOutputEvent {
  type: 'stdout' | 'stderr';
  data: string;
  timestamp: string;
}

// Chat events
export interface ChatEvents {
  'chat:message-sent': MessageSentEvent;
  'chat:message-received': MessageReceivedEvent;
  'chat:stream-chunk': StreamChunkEvent;
  'chat:stream-end': StreamEndEvent;
  'chat:conversation-created': ConversationEvent;
  'chat:conversation-updated': ConversationEvent;
  'chat:conversation-deleted': ConversationDeletedEvent;
  'chat:error': ChatErrorEvent;
}

export interface MessageSentEvent {
  conversation_id: string;
  message_id: string;
  content: string;
  role: 'user';
  timestamp: string;
}

export interface MessageReceivedEvent {
  conversation_id: string;
  message_id: string;
  content: string;
  role: 'assistant';
  model?: string;
  tokens?: TokenUsage;
  timestamp: string;
}

export interface StreamChunkEvent {
  conversation_id: string;
  message_id: string;
  chunk: string;
  is_final: boolean;
}

export interface StreamEndEvent {
  conversation_id: string;
  message_id: string;
  full_content: string;
  tokens?: TokenUsage;
}

export interface ConversationEvent {
  conversation: ConversationSummary;
}

export interface ConversationDeletedEvent {
  conversation_id: string;
}

export interface ChatErrorEvent {
  conversation_id?: string;
  error: string;
  code?: string;
}

export interface ConversationSummary {
  id: string;
  title: string;
  message_count: number;
  updated_at: string;
}

export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

// File system events
export interface FileEvents {
  'file:created': FileEvent;
  'file:modified': FileEvent;
  'file:deleted': FileEvent;
  'file:renamed': FileRenamedEvent;
  'directory:created': FileEvent;
  'directory:deleted': FileEvent;
  'watch:error': WatchErrorEvent;
}

export interface FileEvent {
  path: string;
  is_dir: boolean;
  timestamp: string;
}

export interface FileRenamedEvent {
  old_path: string;
  new_path: string;
  is_dir: boolean;
  timestamp: string;
}

export interface WatchErrorEvent {
  path: string;
  error: string;
}

// Settings events
export interface SettingsEvents {
  'settings:changed': SettingsChangedEvent;
  'settings:reset': void;
}

export interface SettingsChangedEvent {
  key: string;
  old_value: unknown;
  new_value: unknown;
}

// Update events
export interface UpdateEvents {
  'update:available': UpdateAvailableEvent;
  'update:downloaded': UpdateDownloadedEvent;
  'update:installing': void;
  'update:installed': void;
  'update:error': UpdateErrorEvent;
  'update:progress': UpdateProgressEvent;
}

export interface UpdateAvailableEvent {
  version: string;
  notes: string;
  pub_date: string;
}

export interface UpdateDownloadedEvent {
  version: string;
  path: string;
}

export interface UpdateErrorEvent {
  error: string;
}

export interface UpdateProgressEvent {
  downloaded: number;
  total: number;
  percentage: number;
}

// Notification events
export interface NotificationEvents {
  'notification:show': NotificationEvent;
  'notification:click': NotificationClickEvent;
  'notification:close': NotificationCloseEvent;
  'permission:granted': void;
  'permission:denied': void;
}

export interface NotificationEvent {
  id: string;
  title: string;
  body: string;
  icon?: string;
  actions?: NotificationAction[];
  timeout?: number;
}

export interface NotificationAction {
  id: string;
  label: string;
}

export interface NotificationClickEvent {
  id: string;
  action_id?: string;
}

export interface NotificationCloseEvent {
  id: string;
  dismissed: boolean;
}

// Global shortcut events
export interface ShortcutEvents {
  'shortcut:triggered': ShortcutTriggeredEvent;
}

export interface ShortcutTriggeredEvent {
  id: string;
  key_combination: string;
}

// System tray events
export interface TrayEvents {
  'tray:click': TrayClickEvent;
  'tray:right-click': TrayClickEvent;
  'tray:double-click': TrayClickEvent;
  'tray:menu-item-click': TrayMenuItemClickEvent;
}

export interface TrayClickEvent {
  button: 'left' | 'right' | 'middle';
  position: { x: number; y: number };
}

export interface TrayMenuItemClickEvent {
  id: string;
  label: string;
}

// Clipboard events
export interface ClipboardEvents {
  'clipboard:changed': ClipboardChangedEvent;
}

export interface ClipboardChangedEvent {
  type: 'text' | 'image' | 'files';
  preview: string;
}

// Deep link events
export interface DeepLinkEvents {
  'deep-link:opened': DeepLinkEvent;
}

export interface DeepLinkEvent {
  url: string;
  params: Record<string, string>;
}

// Shell events
export interface ShellEvents {
  'shell:command-started': ShellCommandEvent;
  'shell:command-output': ShellOutputEvent;
  'shell:command-finished': ShellFinishedEvent;
  'shell:command-error': ShellErrorEvent;
}

export interface ShellCommandEvent {
  command: string;
  args: string[];
  pid: number;
}

export interface ShellOutputEvent {
  pid: number;
  type: 'stdout' | 'stderr';
  data: string;
}

export interface ShellFinishedEvent {
  pid: number;
  exit_code: number | null;
  signal: number | null;
}

export interface ShellErrorEvent {
  pid: number;
  error: string;
}

// Union of all event types
export type AllEvents = 
  & AppEvents
  & WindowEvents
  & BackendEvents
  & ChatEvents
  & FileEvents
  & SettingsEvents
  & UpdateEvents
  & NotificationEvents
  & ShortcutEvents
  & TrayEvents
  & ClipboardEvents
  & DeepLinkEvents
  & ShellEvents;

// Event listener type
export type EventListener<T extends keyof AllEvents> = (event: AllEvents[T]) => void;

// Event emitter interface
export interface EventEmitter {
  on<T extends keyof AllEvents>(event: T, listener: EventListener<T>): () => void;
  once<T extends keyof AllEvents>(event: T, listener: EventListener<T>): () => void;
  off<T extends keyof AllEvents>(event: T, listener: EventListener<T>): void;
  emit<T extends keyof AllEvents>(event: T, data: AllEvents[T]): void;
}

// Helper type for event names
export type EventName = keyof AllEvents;

// Event payload type
export type EventPayload<T extends EventName> = AllEvents[T];