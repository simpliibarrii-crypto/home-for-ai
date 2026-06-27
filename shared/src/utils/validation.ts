// Shared validation utility for the AI Workplace Desktop App

import type { ApiError } from '../types';

// Validation result types
export interface ValidationResult<T = unknown> {
  valid: boolean;
  value?: T;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: unknown;
}

export interface Validator<T> {
  validate(value: unknown): ValidationResult<T>;
}

// Base validators
export function required<T>(message = 'This field is required'): Validator<T> {
  return {
    validate: (value: unknown): ValidationResult<T> => {
      const errors: ValidationError[] = [];
      if (value === undefined || value === null || value === '') {
        errors.push({ field: '', message, code: 'REQUIRED', value });
      }
      return { valid: errors.length === 0, value: value as T, errors };
    },
  };
}

export function string(minLength = 0, maxLength = Infinity, message?: string): Validator<string> {
  return {
    validate: (value: unknown): ValidationResult<string> => {
      const errors: ValidationError[] = [];
      
      if (typeof value !== 'string') {
        errors.push({ field: '', message: 'Must be a string', code: 'TYPE', value });
        return { valid: false, errors };
      }
      
      if (value.length < minLength) {
        errors.push({ 
          field: '', 
          message: message || `Must be at least ${minLength} characters`, 
          code: 'MIN_LENGTH', 
          value 
        });
      }
      
      if (value.length > maxLength) {
        errors.push({ 
          field: '', 
          message: message || `Must be at most ${maxLength} characters`, 
          code: 'MAX_LENGTH', 
          value 
        });
      }
      
      return { valid: errors.length === 0, value, errors };
    },
  };
}

export function number(min = -Infinity, max = Infinity, message?: string): Validator<number> {
  return {
    validate: (value: unknown): ValidationResult<number> => {
      const errors: ValidationError[] = [];
      
      if (typeof value !== 'number' || isNaN(value)) {
        errors.push({ field: '', message: 'Must be a number', code: 'TYPE', value });
        return { valid: false, errors };
      }
      
      if (value < min) {
        errors.push({ 
          field: '', 
          message: message || `Must be at least ${min}`, 
          code: 'MIN_VALUE', 
          value 
        });
      }
      
      if (value > max) {
        errors.push({ 
          field: '', 
          message: message || `Must be at most ${max}`, 
          code: 'MAX_VALUE', 
          value 
        });
      }
      
      return { valid: errors.length === 0, value, errors };
    },
  };
}

export function integer(min = -Infinity, max = Infinity): Validator<number> {
  return {
    validate: (value: unknown): ValidationResult<number> => {
      const baseResult = number(min, max).validate(value);
      if (!baseResult.valid) return baseResult;
      
      if (!Number.isInteger(value)) {
        return {
          valid: false,
          value: value as number,
          errors: [{ field: '', message: 'Must be an integer', code: 'NOT_INTEGER', value }],
        };
      }
      
      return baseResult;
    },
  };
}

export function boolean(): Validator<boolean> {
  return {
    validate: (value: unknown): ValidationResult<boolean> => {
      if (typeof value !== 'boolean') {
        return {
          valid: false,
          errors: [{ field: '', message: 'Must be a boolean', code: 'TYPE', value }],
        };
      }
      return { valid: true, value, errors: [] };
    },
  };
}

export function email(message = 'Invalid email address'): Validator<string> {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return {
    validate: (value: unknown): ValidationResult<string> => {
      const strResult = string().validate(value);
      if (!strResult.valid) return strResult;
      
      if (!emailRegex.test(strResult.value!)) {
        return {
          valid: false,
          value: strResult.value,
          errors: [{ field: '', message, code: 'INVALID_EMAIL', value }],
        };
      }
      
      return strResult;
    },
  };
}

export function url(message = 'Invalid URL'): Validator<string> {
  return {
    validate: (value: unknown): ValidationResult<string> => {
      const strResult = string().validate(value);
      if (!strResult.valid) return strResult;
      
      try {
        new URL(strResult.value!);
        return strResult;
      } catch {
        return {
          valid: false,
          value: strResult.value,
          errors: [{ field: '', message, code: 'INVALID_URL', value }],
        };
      }
    },
  };
}

export function uuid(message = 'Invalid UUID'): Validator<string> {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return {
    validate: (value: unknown): ValidationResult<string> => {
      const strResult = string().validate(value);
      if (!strResult.valid) return strResult;
      
      if (!uuidRegex.test(strResult.value!)) {
        return {
          valid: false,
          value: strResult.value,
          errors: [{ field: '', message, code: 'INVALID_UUID', value }],
        };
      }
      
      return strResult;
    },
  };
}

export function enum_<T extends string>(values: T[], message?: string): Validator<T> {
  return {
    validate: (value: unknown): ValidationResult<T> => {
      const strResult = string().validate(value);
      if (!strResult.valid) return strResult;
      
      if (!values.includes(strResult.value as T)) {
        return {
          valid: false,
          value: strResult.value as T,
          errors: [{ 
            field: '', 
            message: message || `Must be one of: ${values.join(', ')}`, 
            code: 'INVALID_ENUM', 
            value 
          }],
        };
      }
      
      return { valid: true, value: strResult.value as T, errors: [] };
    },
  };
}

export function array<T>(itemValidator: Validator<T>, minLength = 0, maxLength = Infinity): Validator<T[]> {
  return {
    validate: (value: unknown): ValidationResult<T[]> => {
      const errors: ValidationError[] = [];
      
      if (!Array.isArray(value)) {
        errors.push({ field: '', message: 'Must be an array', code: 'TYPE', value });
        return { valid: false, errors };
      }
      
      if (value.length < minLength) {
        errors.push({ field: '', message: `Must have at least ${minLength} items`, code: 'MIN_LENGTH', value });
      }
      
      if (value.length > maxLength) {
        errors.push({ field: '', message: `Must have at most ${maxLength} items`, code: 'MAX_LENGTH', value });
      }
      
      const validatedItems: T[] = [];
      for (let i = 0; i < value.length; i++) {
        const itemResult = itemValidator.validate(value[i]);
        if (!itemResult.valid) {
          itemResult.errors.forEach(e => {
            errors.push({ ...e, field: `[${i}]${e.field ? '.' + e.field : ''}` });
          });
        } else if (itemResult.value !== undefined) {
          validatedItems.push(itemResult.value);
        }
      }
      
      return { valid: errors.length === 0, value: validatedItems, errors };
    },
  };
}

export function object<T extends Record<string, unknown>>(shape: Record<string, Validator<unknown>>): Validator<T> {
  return {
    validate: (value: unknown): ValidationResult<T> => {
      const errors: ValidationError[] = [];
      
      if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        errors.push({ field: '', message: 'Must be an object', code: 'TYPE', value });
        return { valid: false, errors };
      }
      
      const obj = value as Record<string, unknown>;
      const result: Record<string, unknown> = {};
      
      // Check required fields
      for (const [key, validator] of Object.entries(shape)) {
        const fieldValue = obj[key];
        const fieldResult = validator.validate(fieldValue);
        
        if (!fieldResult.valid) {
          fieldResult.errors.forEach(e => {
            errors.push({ ...e, field: key + (e.field ? '.' + e.field : '') });
          });
        } else if (fieldResult.value !== undefined) {
          result[key] = fieldResult.value;
        }
      }
      
      // Check for extra fields (optional, can be configured)
      // for (const key of Object.keys(obj)) {
      //   if (!(key in shape)) {
      //     errors.push({ field: key, message: 'Unexpected field', code: 'EXTRA_FIELD', value: obj[key] });
      //   }
      // }
      
      return { valid: errors.length === 0, value: result as T, errors };
    },
  };
}

export function optional<T>(validator: Validator<T>): Validator<T | undefined> {
  return {
    validate: (value: unknown): ValidationResult<T | undefined> => {
      if (value === undefined || value === null) {
        return { valid: true, value: undefined, errors: [] };
      }
      return validator.validate(value) as ValidationResult<T | undefined>;
    },
  };
}

export function nullable<T>(validator: Validator<T>): Validator<T | null> {
  return {
    validate: (value: unknown): ValidationResult<T | null> => {
      if (value === null) {
        return { valid: true, value: null, errors: [] };
      }
      return validator.validate(value) as ValidationResult<T | null>;
    },
  };
}

export function oneOf<T>(validators: Validator<T>[]): Validator<T> {
  return {
    validate: (value: unknown): ValidationResult<T> => {
      const allErrors: ValidationError[] = [];
      
      for (const validator of validators) {
        const result = validator.validate(value);
        if (result.valid) {
          return result;
        }
        allErrors.push(...result.errors);
      }
      
      return {
        valid: false,
        errors: [{ field: '', message: 'No matching validator', code: 'ONE_OF_FAILED', value, 
          // @ts-ignore
          details: allErrors 
        }],
      };
    },
  };
}

export function transform<T, U>(validator: Validator<T>, transformFn: (value: T) => U): Validator<U> {
  return {
    validate: (value: unknown): ValidationResult<U> => {
      const result = validator.validate(value);
      if (!result.valid || result.value === undefined) {
        return { valid: false, errors: result.errors };
      }
      try {
        return { valid: true, value: transformFn(result.value), errors: [] };
      } catch (e) {
        return { 
          valid: false, 
          errors: [{ field: '', message: 'Transform failed', code: 'TRANSFORM_ERROR', value }] 
        };
      }
    },
  };
}

// Pre-built validators for common types
export const validators = {
  required,
  string,
  number,
  integer,
  boolean,
  email,
  url,
  uuid,
  enum: enum_,
  array,
  object,
  optional,
  nullable,
  oneOf,
  transform,
};

// Schema builder for complex validation
export interface ValidationSchema<T> {
  parse(value: unknown): T;
  safeParse(value: unknown): ValidationResult<T>;
}

export function schema<T>(shape: Record<string, Validator<unknown>>): ValidationSchema<T> {
  const validator = object<T>(shape);
  
  return {
    parse: (value: unknown): T => {
      const result = validator.validate(value);
      if (!result.valid) {
        throw new ValidationErrorException(result.errors);
      }
      return result.value as T;
    },
    safeParse: (value: unknown): ValidationResult<T> => validator.validate(value),
  };
}

export class ValidationErrorException extends Error {
  public errors: ValidationError[];
  
  constructor(errors: ValidationError[]) {
    super('Validation failed');
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

// Common validation schemas
export const commonSchemas = {
  // User registration
  register: schema({
    email: email(),
    password: string(8, 128, 'Password must be 8-128 characters'),
    name: string(1, 100, 'Name must be 1-100 characters'),
  }),
  
  // User login
  login: schema({
    email: email(),
    password: required('Password is required'),
    remember_me: optional(boolean()),
    mfa_code: optional(string(6, 6, 'MFA code must be 6 digits')),
  }),
  
  // Conversation creation
  createConversation: schema({
    title: optional(string(1, 200, 'Title must be 1-200 characters')),
    model: optional(string(1, 100)),
    system_prompt: optional(string(0, 10000)),
    temperature: optional(number(0, 2, 'Temperature must be between 0 and 2')),
    max_tokens: optional(integer(1, 32768, 'Max tokens must be 1-32768')),
    tags: optional(array(string(1, 50), 0, 10)),
  }),
  
  // Message sending
  sendMessage: schema({
    conversation_id: optional(uuid()),
    content: string(1, 100000, 'Message must be 1-100000 characters'),
    model: optional(string(1, 100)),
    temperature: optional(number(0, 2)),
    max_tokens: optional(integer(1, 32768)),
    stream: optional(boolean()),
  }),
  
  // Settings
  settings: schema({
    theme: optional(enum_(['system', 'light', 'dark'])),
    language: optional(string(2, 10)),
    auto_start: optional(boolean()),
    minimize_to_tray: optional(boolean()),
    close_to_tray: optional(boolean()),
    global_shortcut: optional(string(1, 50)),
    backend_url: optional(url()),
    backend_auto_start: optional(boolean()),
    notifications_enabled: optional(boolean()),
    sound_enabled: optional(boolean()),
  }),
  
  // File upload
  fileUpload: schema({
    filename: string(1, 255),
    mime_type: string(1, 100),
    size: integer(1, 100 * 1024 * 1024), // 100MB max
    workspace_id: optional(uuid()),
  }),
};

// Validation helpers
export function validateOrThrow<T>(validator: Validator<T>, value: unknown): T {
  const result = validator.validate(value);
  if (!result.valid) {
    throw new ValidationErrorException(result.errors);
  }
  return result.value as T;
}

export function validateField<T>(validator: Validator<T>, value: unknown, fieldName: string): ValidationError[] {
  const result = validator.validate(value);
  return result.errors.map(e => ({ ...e, field: fieldName + (e.field ? '.' + e.field : '') }));
}

// Format validation errors for display
export function formatErrors(errors: ValidationError[]): string {
  return errors.map(e => `${e.field || 'field'}: ${e.message}`).join('; ');
}

// Get first error for a field
export function getFieldError(errors: ValidationError[], field: string): ValidationError | undefined {
  return errors.find(e => e.field === field || e.field.startsWith(field + '.'));
}

// Check if errors contain a specific code
export function hasErrorCode(errors: ValidationError[], code: string): boolean {
  return errors.some(e => e.code === code);
}