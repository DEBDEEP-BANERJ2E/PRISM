import { Request, Response, NextFunction } from 'express';
import { vi } from 'vitest';
import {
  validateRequest,
  validateUUIDParam,
  validatePagination,
  sanitizeInput
} from '../../api/middleware/validation';
import { DataValidationError } from '../../api/errors/DataScienceErrors';

// Mock Express objects
const mockRequest = (overrides = {}) => ({
  method: 'GET',
  body: {},
  params: {},
  query: {},
  is: vi.fn(),
  ...overrides
}) as unknown as Request;

const mockResponse = () => ({
  status: vi.fn().mockReturnThis(),
  json: vi.fn().mockReturnThis()
}) as unknown as Response;

const mockNext = vi.fn() as NextFunction;

describe('Validation Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateRequest', () => {
    it('should pass validation for GET requests', () => {
      const req = mockRequest({ method: 'GET' });
      const res = mockResponse();

      validateRequest(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockNext).not.toHaveBeenCalledWith(expect.any(Error));
    });

    it('should pass validation for POST requests with body', () => {
      const req = mockRequest({
        method: 'POST',
        body: { name: 'test' },
        is: vi.fn().mockReturnValue(true)
      });
      const res = mockResponse();

      validateRequest(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockNext).not.toHaveBeenCalledWith(expect.any(Error));
    });

    it('should reject POST requests without body', () => {
      const req = mockRequest({
        method: 'POST',
        body: {},
        is: vi.fn().mockReturnValue(true)
      });
      const res = mockResponse();

      validateRequest(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(DataValidationError));
      const error = mockNext.mock.calls[0][0] as DataValidationError;
      expect(error.validationErrors[0].code).toBe('MISSING_BODY');
    });

    it('should reject POST requests with invalid content type', () => {
      const req = mockRequest({
        method: 'POST',
        body: { name: 'test' },
        is: vi.fn().mockReturnValue(false)
      });
      const res = mockResponse();

      validateRequest(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(DataValidationError));
      const error = mockNext.mock.calls[0][0] as DataValidationError;
      expect(error.validationErrors[0].code).toBe('INVALID_CONTENT_TYPE');
    });

    it('should allow multipart/form-data content type', () => {
      const req = mockRequest({
        method: 'POST',
        body: { name: 'test' },
        is: vi.fn((type: string) => type === 'multipart/form-data')
      });
      const res = mockResponse();

      validateRequest(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockNext).not.toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('validateUUIDParam', () => {
    it('should validate correct UUID', () => {
      const middleware = validateUUIDParam('id');
      const req = mockRequest({
        params: { id: '123e4567-e89b-12d3-a456-426614174000' }
      });
      const res = mockResponse();

      middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockNext).not.toHaveBeenCalledWith(expect.any(Error));
    });

    it('should reject invalid UUID format', () => {
      const middleware = validateUUIDParam('id');
      const req = mockRequest({
        params: { id: 'invalid-uuid' }
      });
      const res = mockResponse();

      middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(DataValidationError));
      const error = mockNext.mock.calls[0][0] as DataValidationError;
      expect(error.validationErrors[0].code).toBe('INVALID_UUID');
    });

    it('should reject missing UUID parameter', () => {
      const middleware = validateUUIDParam('id');
      const req = mockRequest({ params: {} });
      const res = mockResponse();

      middleware(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(DataValidationError));
      const error = mockNext.mock.calls[0][0] as DataValidationError;
      expect(error.validationErrors[0].code).toBe('INVALID_UUID');
    });
  });

  describe('validatePagination', () => {
    it('should validate correct pagination parameters', () => {
      const req = mockRequest({
        query: { page: '1', limit: '10' }
      });
      const res = mockResponse();

      validatePagination(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockNext).not.toHaveBeenCalledWith(expect.any(Error));
    });

    it('should pass when pagination parameters are not provided', () => {
      const req = mockRequest({ query: {} });
      const res = mockResponse();

      validatePagination(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockNext).not.toHaveBeenCalledWith(expect.any(Error));
    });

    it('should reject invalid page parameter', () => {
      const req = mockRequest({
        query: { page: '0' }
      });
      const res = mockResponse();

      validatePagination(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(DataValidationError));
      const error = mockNext.mock.calls[0][0] as DataValidationError;
      expect(error.validationErrors[0].code).toBe('INVALID_PAGE');
    });

    it('should reject non-numeric page parameter', () => {
      const req = mockRequest({
        query: { page: 'invalid' }
      });
      const res = mockResponse();

      validatePagination(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(DataValidationError));
      const error = mockNext.mock.calls[0][0] as DataValidationError;
      expect(error.validationErrors[0].code).toBe('INVALID_PAGE');
    });

    it('should reject limit parameter exceeding maximum', () => {
      const req = mockRequest({
        query: { limit: '150' }
      });
      const res = mockResponse();

      validatePagination(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(DataValidationError));
      const error = mockNext.mock.calls[0][0] as DataValidationError;
      expect(error.validationErrors[0].code).toBe('INVALID_LIMIT');
    });
  });

  describe('sanitizeInput', () => {
    it('should remove script tags from strings', () => {
      const req = mockRequest({
        body: {
          name: 'John<script>alert("xss")</script>Doe',
          description: 'Safe text'
        }
      });
      const res = mockResponse();

      sanitizeInput(req, res, mockNext);

      expect(req.body.name).toBe('JohnDoe');
      expect(req.body.description).toBe('Safe text');
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should remove javascript: protocols', () => {
      const req = mockRequest({
        body: {
          url: 'javascript:alert("xss")',
          link: 'https://example.com'
        }
      });
      const res = mockResponse();

      sanitizeInput(req, res, mockNext);

      expect(req.body.url).toBe('alert("xss")');
      expect(req.body.link).toBe('https://example.com');
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should sanitize nested objects', () => {
      const req = mockRequest({
        body: {
          user: {
            name: 'John<script>alert("xss")</script>',
            profile: {
              bio: 'Safe<script>unsafe</script>bio'
            }
          }
        }
      });
      const res = mockResponse();

      sanitizeInput(req, res, mockNext);

      expect(req.body.user.name).toBe('John');
      expect(req.body.user.profile.bio).toBe('Safebio');
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should sanitize arrays', () => {
      const req = mockRequest({
        body: {
          items: [
            'Safe item',
            'Unsafe<script>alert("xss")</script>item',
            { name: 'Nested<script>bad</script>name' }
          ]
        }
      });
      const res = mockResponse();

      sanitizeInput(req, res, mockNext);

      expect(req.body.items[0]).toBe('Safe item');
      expect(req.body.items[1]).toBe('Unsafeitem');
      expect(req.body.items[2].name).toBe('Nestedname');
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should sanitize query parameters', () => {
      const req = mockRequest({
        query: {
          search: 'term<script>alert("xss")</script>',
          filter: 'safe'
        }
      });
      const res = mockResponse();

      sanitizeInput(req, res, mockNext);

      expect(req.query.search).toBe('term');
      expect(req.query.filter).toBe('safe');
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should handle null and undefined values', () => {
      const req = mockRequest({
        body: {
          nullValue: null,
          undefinedValue: undefined,
          emptyString: '',
          number: 42
        }
      });
      const res = mockResponse();

      sanitizeInput(req, res, mockNext);

      expect(req.body.nullValue).toBeNull();
      expect(req.body.undefinedValue).toBeUndefined();
      expect(req.body.emptyString).toBe('');
      expect(req.body.number).toBe(42);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should trim whitespace from strings', () => {
      const req = mockRequest({
        body: {
          name: '  John Doe  ',
          description: '\t\nSome text\n\t'
        }
      });
      const res = mockResponse();

      sanitizeInput(req, res, mockNext);

      expect(req.body.name).toBe('John Doe');
      expect(req.body.description).toBe('Some text');
      expect(mockNext).toHaveBeenCalledWith();
    });
  });
});