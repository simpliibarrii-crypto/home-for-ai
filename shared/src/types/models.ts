// Shared TypeScript models for the AI Workplace Desktop App

export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
  preferences?: UserPreferences;
}

export interface UserPreferences {
  theme: 'system' | 'light' | 'dark';
  language: string;
  notifications: boolean;
  auto_save: boolean;
  [key: string]: unknown;
}

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  model?: string;
  system_prompt?: string;
  temperature?: number;
  max_tokens?: number;
  created_at: string;
  updated_at: string;
  message_count: number;
  last_message_at?: string;
  metadata?: ConversationMetadata;
}

export interface ConversationMetadata {
  tags?: string[];
  category?: string;
  is_pinned?: boolean;
  is_archived?: boolean;
  [key: string]: unknown;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  model?: string;
  tokens?: TokenUsage;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  created_at: string;
  metadata?: MessageMetadata;
}

export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface MessageMetadata {
  finish_reason?: string;
  response_time_ms?: number;
  [key: string]: unknown;
}

export interface FileItem {
  id?: string;
  name: string;
  path: string;
  is_dir: boolean;
  size?: number;
  mime_type?: string;
  modified_at?: string;
  created_at?: string;
  permissions?: string;
  owner?: string;
  group?: string;
}

export interface FileUpload {
  file: File;
  path: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  error?: string;
}

export interface SearchResult {
  query: string;
  conversations: Conversation[];
  messages: Message[];
  files: FileItem[];
  total: number;
  took_ms: number;
}

export interface ModelInfo {
  id: string;
  name: string;
  description?: string;
  context_length: number;
  pricing?: ModelPricing;
  capabilities: ModelCapability[];
  is_available: boolean;
}

export interface ModelPricing {
  input_per_million: number;
  output_per_million: number;
  currency: string;
}

export type ModelCapability = 
  | 'chat'
  | 'completion'
  | 'embedding'
  | 'vision'
  | 'function_calling'
  | 'code_generation'
  | 'reasoning';

export interface ApiKey {
  id: string;
  name: string;
  key_preview: string;
  created_at: string;
  last_used_at?: string;
  expires_at?: string;
  is_active: boolean;
  permissions: string[];
}

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  owner_id: string;
  members: WorkspaceMember[];
  settings: WorkspaceSettings;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMember {
  user_id: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  joined_at: string;
}

export interface WorkspaceSettings {
  default_model?: string;
  allowed_models?: string[];
  max_tokens_per_request?: number;
  retention_days?: number;
  allow_file_uploads?: boolean;
  max_file_size_mb?: number;
}

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  action_url?: string;
  action_label?: string;
}

export interface Shortcut {
  id: string;
  name: string;
  key_combination: string;
  action: string;
  description?: string;
  enabled: boolean;
  created_at: string;
}

export interface Theme {
  id: string;
  name: string;
  colors: ThemeColors;
  is_dark: boolean;
  is_custom: boolean;
}

export interface ThemeColors {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  text: string;
  text_secondary: string;
  border: string;
  error: string;
  success: string;
  warning: string;
  info: string;
}

export interface SystemMetrics {
  cpu_usage: number;
  memory_usage: number;
  memory_total: number;
  disk_usage: number;
  disk_total: number;
  network_rx: number;
  network_tx: number;
  uptime: number;
}