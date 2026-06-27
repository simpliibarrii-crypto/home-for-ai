// Shared TypeScript API types for the AI Workplace Desktop App

// Base API types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ResponseMeta;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  status_code: number;
}

export interface ResponseMeta {
  timestamp: string;
  request_id: string;
  version: string;
  pagination?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface PaginationParams {
  page?: number;
  page_size?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface ListParams extends PaginationParams {
  search?: string;
  filters?: Record<string, unknown>;
}

// Authentication types
export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: 'Bearer';
  expires_in: number;
  scope?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  remember_me?: boolean;
  mfa_code?: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  invitation_code?: string;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
}

export interface VerifyEmailRequest {
  token: string;
}

export interface MfaSetupResponse {
  secret: string;
  qr_code_url: string;
  backup_codes: string[];
}

export interface MfaVerifyRequest {
  code: string;
  backup_code?: string;
}

// User types
export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  is_active: boolean;
  is_verified: boolean;
  mfa_enabled: boolean;
  roles: string[];
  permissions: string[];
  created_at: string;
  updated_at: string;
  last_login_at?: string;
}

export interface UserProfile {
  user: User;
  preferences: UserPreferences;
  workspaces: WorkspaceSummary[];
}

export interface UserPreferences {
  theme: 'system' | 'light' | 'dark';
  language: string;
  timezone: string;
  notifications: NotificationPreferences;
  editor: EditorPreferences;
  ai: AiPreferences;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  desktop: boolean;
  mentions: boolean;
  replies: boolean;
  system: boolean;
}

export interface EditorPreferences {
  font_size: number;
  font_family: string;
  tab_size: number;
  word_wrap: boolean;
  minimap: boolean;
  line_numbers: boolean;
}

export interface AiPreferences {
  default_model: string;
  temperature: number;
  max_tokens: number;
  auto_complete: boolean;
  inline_suggestions: boolean;
}

export interface WorkspaceSummary {
  id: string;
  name: string;
  role: string;
  member_count: number;
}

// Chat/Conversation API types
export interface Conversation {
  id: string;
  workspace_id: string;
  user_id: string;
  title: string;
  model: string;
  system_prompt?: string;
  temperature: number;
  max_tokens: number;
  message_count: number;
  token_count: number;
  is_archived: boolean;
  is_pinned: boolean;
  tags: string[];
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  last_message_at?: string;
}

export interface ConversationCreate {
  title?: string;
  model?: string;
  system_prompt?: string;
  temperature?: number;
  max_tokens?: number;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface ConversationUpdate {
  title?: string;
  model?: string;
  system_prompt?: string;
  temperature?: number;
  max_tokens?: number;
  is_archived?: boolean;
  is_pinned?: boolean;
  tags?: string[];
  metadata?: Record<string, unknown>;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  tokens: TokenCount;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

export interface TokenCount {
  prompt: number;
  completion: number;
  total: number;
}

export interface SendMessageRequest {
  conversation_id?: string;
  content: string;
  model?: string;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  tools?: Tool[];
  tool_choice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
  metadata?: Record<string, unknown>;
}

export interface Tool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface SendMessageResponse {
  conversation_id: string;
  message_id: string;
  content: string;
  role: 'assistant';
  tokens: TokenCount;
  model: string;
  finish_reason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | null;
}

export interface StreamChunk {
  id: string;
  conversation_id: string;
  message_id: string;
  delta: string;
  is_final: boolean;
  tokens?: TokenCount;
  finish_reason?: string;
}

// Model types
export interface Model {
  id: string;
  name: string;
  description?: string;
  provider: string;
  context_length: number;
  max_output_tokens: number;
  pricing: ModelPricing;
  capabilities: ModelCapability[];
  is_deprecated: boolean;
  is_available: boolean;
  created_at: string;
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
  | 'reasoning'
  | 'audio_transcription'
  | 'audio_generation';

// File types
export interface FileItem {
  id: string;
  workspace_id: string;
  user_id: string;
  name: string;
  path: string;
  mime_type: string;
  size: number;
  hash: string;
  is_public: boolean;
  metadata: FileMetadata;
  created_at: string;
  updated_at: string;
}

export interface FileMetadata {
  width?: number;
  height?: number;
  duration?: number;
  pages?: number;
  encoding?: string;
  language?: string;
  [key: string]: unknown;
}

export interface FileUploadInitRequest {
  filename: string;
  mime_type: string;
  size: number;
  workspace_id?: string;
}

export interface FileUploadInitResponse {
  upload_id: string;
  upload_url: string;
  fields: Record<string, string>;
  expires_at: string;
}

export interface FileUploadCompleteRequest {
  upload_id: string;
  parts: UploadPart[];
}

export interface UploadPart {
  part_number: number;
  etag: string;
}

// Search types
export interface SearchRequest {
  query: string;
  types?: ('conversations' | 'messages' | 'files')[];
  workspace_id?: string;
  conversation_id?: string;
  filters?: SearchFilters;
  page?: number;
  page_size?: number;
}

export interface SearchFilters {
  date_from?: string;
  date_to?: string;
  models?: string[];
  users?: string[];
  tags?: string[];
  mime_types?: string[];
}

export interface SearchResponse {
  results: SearchResult[];
  total: number;
  took_ms: number;
  page: number;
  page_size: number;
}

export interface SearchResult {
  type: 'conversation' | 'message' | 'file';
  id: string;
  title: string;
  snippet: string;
  score: number;
  highlights: Record<string, string[]>;
  metadata: Record<string, unknown>;
  created_at: string;
}

// Workspace types
export interface Workspace {
  id: string;
  name: string;
  description?: string;
  owner_id: string;
  plan: 'free' | 'pro' | 'team' | 'enterprise';
  settings: WorkspaceSettings;
  member_count: number;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceSettings {
  default_model: string;
  allowed_models: string[];
  max_tokens_per_request: number;
  retention_days: number;
  allow_file_uploads: boolean;
  max_file_size_mb: number;
  allowed_domains: string[];
  require_mfa: boolean;
  sso_enabled: boolean;
}

export interface WorkspaceMember {
  user_id: string;
  user: User;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  joined_at: string;
}

export interface WorkspaceInvite {
  id: string;
  workspace_id: string;
  email: string;
  role: 'admin' | 'member' | 'viewer';
  invited_by: string;
  token: string;
  expires_at: string;
  accepted_at?: string;
}

// API Key types
export interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  key_hash: string;
  user_id: string;
  workspace_id: string;
  permissions: string[];
  last_used_at?: string;
  expires_at?: string;
  is_active: boolean;
  created_at: string;
}

export interface ApiKeyCreate {
  name: string;
  permissions: string[];
  expires_in_days?: number;
}

export interface ApiKeyResponse extends ApiKey {
  key: string; // Only returned on creation
}

// Usage/Billing types
export interface UsageStats {
  period_start: string;
  period_end: string;
  tokens_used: number;
  tokens_limit: number;
  requests_count: number;
  cost_estimate: number;
  by_model: ModelUsage[];
  by_user: UserUsage[];
}

export interface ModelUsage {
  model: string;
  tokens: number;
  requests: number;
  cost: number;
}

export interface UserUsage {
  user_id: string;
  user_name: string;
  tokens: number;
  requests: number;
}

export interface BillingInfo {
  plan: 'free' | 'pro' | 'team' | 'enterprise';
  status: 'active' | 'past_due' | 'canceled' | 'trialing';
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  payment_method?: PaymentMethod;
  invoices: Invoice[];
}

export interface PaymentMethod {
  type: 'card' | 'bank_account';
  brand?: string;
  last4?: string;
  exp_month?: number;
  exp_year?: number;
}

export interface Invoice {
  id: string;
  amount: number;
  currency: string;
  status: 'paid' | 'open' | 'void' | 'uncollectible';
  invoice_url: string;
  pdf_url: string;
  created_at: string;
  period_start: string;
  period_end: string;
}

// Health check types
export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  uptime_seconds: number;
  checks: HealthCheck[];
  timestamp: string;
}

export interface HealthCheck {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  message?: string;
  duration_ms: number;
}

// WebSocket types
export interface WsMessage<T = unknown> {
  type: string;
  payload: T;
  request_id?: string;
  timestamp: string;
}

export interface WsAuthMessage {
  type: 'auth';
  payload: { token: string };
}

export interface WsSubscribeMessage {
  type: 'subscribe';
  payload: { channels: string[] };
}

export interface WsUnsubscribeMessage {
  type: 'unsubscribe';
  payload: { channels: string[] };
}

export interface WsPingMessage {
  type: 'ping';
  payload: { timestamp: string };
}

export interface WsPongMessage {
  type: 'pong';
  payload: { timestamp: string };
}

// Error codes
export enum ApiErrorCode {
  // Auth errors
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  MFA_REQUIRED = 'MFA_REQUIRED',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',
  
  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  
  // Resource errors
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  CONFLICT = 'CONFLICT',
  
  // Rate limiting
  RATE_LIMITED = 'RATE_LIMITED',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  
  // Server errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  TIMEOUT = 'TIMEOUT',
  UPSTREAM_ERROR = 'UPSTREAM_ERROR',
  
  // Model errors
  MODEL_NOT_FOUND = 'MODEL_NOT_FOUND',
  MODEL_UNAVAILABLE = 'MODEL_UNAVAILABLE',
  CONTEXT_LENGTH_EXCEEDED = 'CONTEXT_LENGTH_EXCEEDED',
  CONTENT_FILTERED = 'CONTENT_FILTERED',
  
  // File errors
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE = 'INVALID_FILE_TYPE',
  UPLOAD_FAILED = 'UPLOAD_FAILED',
  
  // Workspace errors
  WORKSPACE_NOT_FOUND = 'WORKSPACE_NOT_FOUND',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  PLAN_LIMIT_EXCEEDED = 'PLAN_LIMIT_EXCEEDED',
}

// HTTP status codes
export enum HttpStatus {
  OK = 200,
  CREATED = 201,
  ACCEPTED = 202,
  NO_CONTENT = 204,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  UNPROCESSABLE_ENTITY = 422,
  TOO_MANY_REQUESTS = 429,
  INTERNAL_SERVER_ERROR = 500,
  BAD_GATEWAY = 502,
  SERVICE_UNAVAILABLE = 503,
  GATEWAY_TIMEOUT = 504,
}