/** Parses ?page=1&limit=20 and returns Prisma skip/take values plus page metadata. */
export function parsePagination(query, defaults = { page: 1, limit: 20, maxLimit: 100 }) {
  const page  = Math.max(1, parseInt(query.page)  || defaults.page);
  const limit = Math.min(
    defaults.maxLimit,
    Math.max(1, parseInt(query.limit) || defaults.limit)
  );
  return { skip: (page - 1) * limit, take: limit, page, limit };
}

/** Wraps a data array with standard pagination metadata for API responses. */
export function paginatedResponse(data, total, page, limit) {
  return {
    data,
    pagination: {
      total,
      page,
      limit,
      pages:   Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  };
}