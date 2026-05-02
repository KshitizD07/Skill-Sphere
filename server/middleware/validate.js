import { ApiError } from '../utils/errorHandler.js';

/**
 * Zod schema validation middleware.
 * Usage: router.post('/', validate(myZodSchema), handler)
 *
 * @param {import('zod').ZodTypeAny} schema - Zod schema to validate against
 * @param {'body'|'query'|'params'} target  - Which request property to validate
 */
export function validate(schema, target = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      const details = result.error.errors.map((e) => ({
        field:   e.path.join('.'),
        message: e.message,
      }));
      return next(ApiError.validation(details));
    }
    req[target] = result.data; // replace with parsed/coerced data
    next();
  };
}