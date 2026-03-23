// Parses ?page=1&limit=20 and returns Prisma skip/take + meta
function parsePagination(query, defaults = { page: 1, limit: 20, maxLimit: 100 }) {
  const page  = Math.max(1, parseInt(query.page)  || defaults.page);
  const limit = Math.min(
    defaults.maxLimit,
    Math.max(1, parseInt(query.limit) || defaults.limit)
  );

  return {
    skip: (page - 1) * limit,
    take: limit,
    page,
    limit,
  };
}

function paginatedResponse(data, total, page, limit) {
  return {
    data,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    },
  };
}

module.exports = { parsePagination, paginatedResponse };