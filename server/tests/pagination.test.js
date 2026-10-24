import { describe, it, expect } from '@jest/globals';
import { parsePagination, paginatedResponse } from '../utils/pagination.js';

describe('Pagination Utility', () => {
  describe('parsePagination', () => {
    it('returns default page and limit when empty query is provided', () => {
      const result = parsePagination({});
      expect(result).toEqual({
        skip: 0,
        take: 20,
        page: 1,
        limit: 20,
      });
    });

    it('calculates skip correctly for subsequent pages', () => {
      const result = parsePagination({ page: '3', limit: '15' });
      expect(result).toEqual({
        skip: 30, // (3 - 1) * 15
        take: 15,
        page: 3,
        limit: 15,
      });
    });

    it('caps limit at maxLimit', () => {
      const result = parsePagination({ page: '1', limit: '250' });
      expect(result.take).toBe(100);
      expect(result.limit).toBe(100);
    });

    it('handles negative or invalid values gracefully', () => {
      const result = parsePagination({ page: '-5', limit: 'invalid' });
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(result.skip).toBe(0);
    });
  });

  describe('paginatedResponse', () => {
    it('structures response with correct pagination metadata', () => {
      const items = [{ id: 1 }, { id: 2 }];
      const total = 50;
      const page = 2;
      const limit = 10;

      const response = paginatedResponse(items, total, page, limit);

      expect(response.data).toEqual(items);
      expect(response.pagination).toEqual({
        total: 50,
        page: 2,
        limit: 10,
        pages: 5,
        hasNext: true,
        hasPrev: true,
      });
    });

    it('correctly sets hasNext and hasPrev boundaries', () => {
      const firstPage = paginatedResponse([1], 10, 1, 10);
      expect(firstPage.pagination.hasPrev).toBe(false);
      expect(firstPage.pagination.hasNext).toBe(false);
      expect(firstPage.pagination.pages).toBe(1);

      const lastPage = paginatedResponse([1, 2], 12, 2, 10);
      expect(lastPage.pagination.hasPrev).toBe(true);
      expect(lastPage.pagination.hasNext).toBe(false);
      expect(lastPage.pagination.pages).toBe(2);
    });
  });
});
