import { jest } from '@jest/globals';
import { ApiError, errorMiddleware, asyncHandler } from '../utils/errorHandler.js';

describe('errorHandler utility and ApiError class', () => {
  test('ApiError static factory methods create correct instances', () => {
    const badReq = ApiError.badRequest('Invalid payload', { field: 'email' });
    expect(badReq.status).toBe(400);
    expect(badReq.code).toBe('BAD_REQUEST');
    expect(badReq.message).toBe('Invalid payload');
    expect(badReq.details).toEqual({ field: 'email' });

    const unauth = ApiError.unauthorized();
    expect(unauth.status).toBe(401);
    expect(unauth.code).toBe('UNAUTHORIZED');

    const notFound = ApiError.notFound('Squad');
    expect(notFound.status).toBe(404);
    expect(notFound.code).toBe('NOT_FOUND');
    expect(notFound.message).toBe('Squad not found');
  });

  test('asyncHandler catches rejected promises and passes to next', async () => {
    const error = new Error('Async failure');
    const failingFn = async () => {
      throw error;
    };

    const handler = asyncHandler(failingFn);
    const nextMock = jest.fn();

    await handler({}, {}, nextMock);
    expect(nextMock).toHaveBeenCalledWith(error);
  });

  test('errorMiddleware formats ApiError responses cleanly', () => {
    const apiErr = ApiError.conflict('Email already exists');
    const req = { method: 'POST', path: '/api/auth/register' };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const next = jest.fn();

    errorMiddleware(apiErr, req, res, next);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      error: 'CONFLICT',
      message: 'Email already exists',
    });
  });
});
