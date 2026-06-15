function notFoundHandler(req, res) {
  res.status(404).json({
    message: `Route not found: ${req.originalUrl}`,
  });
}

function errorHandler(err, req, res, next) {
  const statusCode = err.status || 500;

  res.status(statusCode).json({
    message: err.message || 'Internal server error',
  });
}

module.exports = {
  notFoundHandler,
  errorHandler,
};
