function buildPagination(page = 1, pageSize = 20) {
  return {
    page: Number(page) || 1,
    pageSize: Number(pageSize) || 20
  };
}

module.exports = { buildPagination };
