const { ApiError } = require('../utils/errorHandler');

// Usage: router.post('/', validate(myZodSchema), handler)
function validate(schema, target = 'body') {
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

module.exports = { validate };