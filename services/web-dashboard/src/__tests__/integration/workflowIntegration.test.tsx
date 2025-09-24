import { describe, it, expect } from 'vitest';
import { validateFile, sanitizeInput, sanitizeHtml } from '../../utils/security';
import { memoryManager, performanceMonitor } from '../../utils/performance';

describe('Workflow Integration', () => {

  describe('Security Features', () => {
    it('should sanitize user input correctly', () => {
      // Test basic input sanitization
      expect(sanitizeInput('  normal text  ')).toBe('normal text');
      expect(sanitizeInput('text with\x00null bytes')).toBe('text withnull bytes');
      
      // Test length limiting
      const longInput = 'a'.repeat(20000);
      const sanitized = sanitizeInput(longInput);
      expect(sanitized.length).toBeLessThanOrEqual(10000);
    });

    it('should sanitize HTML content', () => {
      // Test HTML sanitization
      expect(sanitizeHtml('<script>alert("xss")</script><p>Safe content</p>'))
        .toBe('<p>Safe content</p>');
      
      expect(sanitizeHtml('<b>Bold</b> and <i>italic</i> text'))
        .toBe('<b>Bold</b> and <i>italic</i> text');
      
      expect(sanitizeHtml('<img src="x" onerror="alert(1)">'))
        .toBe('');
    });

    it('should validate file uploads', () => {
      // Test valid CSV file
      const validFile = new File(['col1,col2\n1,2'], 'test.csv', { type: 'text/csv' });
      const validResult = validateFile(validFile);
      
      expect(validResult.isValid).toBe(true);
      expect(validResult.errors).toHaveLength(0);
      
      // Test invalid file type
      const invalidFile = new File(['malicious content'], 'malware.exe', { type: 'application/exe' });
      const invalidResult = validateFile(invalidFile);
      
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors.length).toBeGreaterThan(0);
      
      // Test oversized file
      const largeFile = new File([new ArrayBuffer(100 * 1024 * 1024)], 'large.csv', { type: 'text/csv' });
      const largeResult = validateFile(largeFile);
      
      expect(largeResult.isValid).toBe(false);
      expect(largeResult.errors.some(error => error.includes('size'))).toBe(true);
    });
  });

  describe('Performance Optimization', () => {
    it('should manage memory cache correctly', () => {
      const testData = { key: 'value', array: [1, 2, 3] };
      
      // Set cache
      memoryManager.set('test-key', testData);
      
      // Get cache
      const cached = memoryManager.get('test-key');
      expect(cached).toEqual(testData);
      
      // Clear cache
      memoryManager.delete('test-key');
      expect(memoryManager.get('test-key')).toBeNull();
    });

    it('should track performance metrics', () => {
      const endTiming = performanceMonitor.startTiming('test-operation');
      
      // Simulate some work
      const start = Date.now();
      while (Date.now() - start < 10) {
        // Wait 10ms
      }
      
      endTiming();
      
      const metrics = performanceMonitor.getMetrics('test-operation');
      expect(metrics).toBeDefined();
      expect(metrics?.count).toBe(1);
      expect(metrics?.avg).toBeGreaterThan(0);
    });

    it('should handle cache expiration', () => {
      const testData = { timestamp: Date.now() };
      
      // Set cache with short TTL
      memoryManager.set('expiring-key', testData, 1); // 1ms TTL
      
      // Wait for expiration
      setTimeout(() => {
        expect(memoryManager.get('expiring-key')).toBeNull();
      }, 10);
    });
  });


});