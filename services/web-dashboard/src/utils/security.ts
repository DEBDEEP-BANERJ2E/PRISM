import DOMPurify from 'dompurify';

// File upload validation
export interface FileValidationOptions {
  maxSize?: number; // in bytes
  allowedTypes?: string[];
  allowedExtensions?: string[];
  maxFiles?: number;
}

export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export const DEFAULT_FILE_OPTIONS: FileValidationOptions = {
  maxSize: 50 * 1024 * 1024, // 50MB
  allowedTypes: [
    'text/csv',
    'application/json',
    'text/plain',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ],
  allowedExtensions: ['.csv', '.json', '.txt', '.xls', '.xlsx'],
  maxFiles: 10
};

export const validateFile = (
  file: File,
  options: FileValidationOptions = DEFAULT_FILE_OPTIONS
): FileValidationResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check file size
  if (options.maxSize && file.size > options.maxSize) {
    errors.push(`File size (${formatFileSize(file.size)}) exceeds maximum allowed size (${formatFileSize(options.maxSize)})`);
  }

  // Check file type
  if (options.allowedTypes && !options.allowedTypes.includes(file.type)) {
    errors.push(`File type "${file.type}" is not allowed. Allowed types: ${options.allowedTypes.join(', ')}`);
  }

  // Check file extension
  if (options.allowedExtensions) {
    const fileExtension = getFileExtension(file.name);
    if (!options.allowedExtensions.includes(fileExtension)) {
      errors.push(`File extension "${fileExtension}" is not allowed. Allowed extensions: ${options.allowedExtensions.join(', ')}`);
    }
  }

  // Check for suspicious file names
  if (containsSuspiciousPatterns(file.name)) {
    errors.push('File name contains suspicious patterns');
  }

  // Warnings for large files
  if (file.size > 10 * 1024 * 1024) { // 10MB
    warnings.push('Large file detected. Processing may take longer.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

export const validateFiles = (
  files: FileList | File[],
  options: FileValidationOptions = DEFAULT_FILE_OPTIONS
): FileValidationResult => {
  const fileArray = Array.from(files);
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check number of files
  if (options.maxFiles && fileArray.length > options.maxFiles) {
    errors.push(`Too many files selected. Maximum allowed: ${options.maxFiles}`);
  }

  // Validate each file
  fileArray.forEach((file, index) => {
    const result = validateFile(file, options);
    
    result.errors.forEach(error => {
      errors.push(`File ${index + 1} (${file.name}): ${error}`);
    });
    
    result.warnings.forEach(warning => {
      warnings.push(`File ${index + 1} (${file.name}): ${warning}`);
    });
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

// Input sanitization
export const sanitizeInput = (input: string): string => {
  if (typeof input !== 'string') {
    return '';
  }

  // Remove null bytes and control characters
  let sanitized = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  // Limit length to prevent DoS
  if (sanitized.length > 10000) {
    sanitized = sanitized.substring(0, 10000);
  }

  return sanitized;
};

export const sanitizeHtml = (html: string): string => {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: []
  });
};

export const sanitizeFileName = (fileName: string): string => {
  // Remove path traversal attempts
  let sanitized = fileName.replace(/[\/\\:*?"<>|]/g, '_');
  
  // Remove leading dots and spaces
  sanitized = sanitized.replace(/^[.\s]+/, '');
  
  // Limit length
  if (sanitized.length > 255) {
    const extension = getFileExtension(sanitized);
    const nameWithoutExt = sanitized.substring(0, sanitized.lastIndexOf('.'));
    sanitized = nameWithoutExt.substring(0, 255 - extension.length) + extension;
  }

  return sanitized || 'unnamed_file';
};

// SQL injection prevention for dynamic queries
export const escapeSqlIdentifier = (identifier: string): string => {
  // Remove or escape dangerous characters
  return identifier.replace(/[^a-zA-Z0-9_]/g, '');
};

export const validateSqlValue = (value: any): boolean => {
  if (typeof value === 'string') {
    // Check for SQL injection patterns
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION)\b)/i,
      /[';-]/,
      /\/\*.*\*\//,
      /\bOR\b.*\b=\b/i,
      /\bAND\b.*\b=\b/i
    ];

    return !sqlPatterns.some(pattern => pattern.test(value));
  }

  return true;
};

// XSS prevention
export const escapeHtml = (text: string): string => {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
};

export const validateUrl = (url: string): boolean => {
  try {
    const urlObj = new URL(url);
    // Only allow http and https protocols
    return ['http:', 'https:'].includes(urlObj.protocol);
  } catch {
    return false;
  }
};

// Rate limiting helpers
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();

  constructor(
    private maxRequests: number = 100,
    private windowMs: number = 60000 // 1 minute
  ) {}

  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Get existing requests for this identifier
    const requests = this.requests.get(identifier) || [];
    
    // Filter out old requests
    const recentRequests = requests.filter(time => time > windowStart);
    
    // Check if under limit
    if (recentRequests.length >= this.maxRequests) {
      return false;
    }

    // Add current request
    recentRequests.push(now);
    this.requests.set(identifier, recentRequests);

    return true;
  }

  getRemainingRequests(identifier: string): number {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    const requests = this.requests.get(identifier) || [];
    const recentRequests = requests.filter(time => time > windowStart);
    
    return Math.max(0, this.maxRequests - recentRequests.length);
  }

  getResetTime(identifier: string): number {
    const requests = this.requests.get(identifier) || [];
    if (requests.length === 0) return 0;
    
    const oldestRequest = Math.min(...requests);
    return oldestRequest + this.windowMs;
  }
}

// Audit logging
export interface AuditLogEntry {
  timestamp: Date;
  userId?: string;
  action: string;
  resource: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  error?: string;
}

export class AuditLogger {
  private logs: AuditLogEntry[] = [];
  private maxLogs: number = 1000;

  log(entry: Omit<AuditLogEntry, 'timestamp'>): void {
    const logEntry: AuditLogEntry = {
      ...entry,
      timestamp: new Date(),
      ipAddress: this.getClientIP(),
      userAgent: navigator.userAgent
    };

    this.logs.push(logEntry);

    // Keep only recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // In production, send to logging service
    console.log('Audit Log:', logEntry);
  }

  getLogs(filter?: Partial<AuditLogEntry>): AuditLogEntry[] {
    if (!filter) return [...this.logs];

    return this.logs.filter(log => {
      return Object.entries(filter).every(([key, value]) => {
        return log[key as keyof AuditLogEntry] === value;
      });
    });
  }

  private getClientIP(): string {
    // In production, this would be handled by the server
    return 'client-ip';
  }
}

// Utility functions
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const getFileExtension = (fileName: string): string => {
  const lastDot = fileName.lastIndexOf('.');
  return lastDot === -1 ? '' : fileName.substring(lastDot).toLowerCase();
};

export const containsSuspiciousPatterns = (fileName: string): boolean => {
  const suspiciousPatterns = [
    /\.\./,  // Path traversal
    /[<>:"|?*]/,  // Invalid filename characters
    /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i,  // Windows reserved names
    /\.(exe|bat|cmd|scr|pif|com|dll)$/i  // Executable extensions
  ];

  return suspiciousPatterns.some(pattern => pattern.test(fileName));
};

// Create global instances
export const globalRateLimiter = new RateLimiter();
export const globalAuditLogger = new AuditLogger();