export function notFoundMiddleware(_req, res) {
  res.status(404).json({ success: false, message: "The requested endpoint was not found." });
}

export function errorMiddleware(error, _req, res, _next) {
  if (res.headersSent) return;

  let status = Number(error.status || error.statusCode) || 500;
  if (error.name === "ValidationError" || error.name === "CastError") status = 400;
  if (error.code === 11000) status = 409;

  const message = status >= 500
    ? "Something went wrong. Please try again."
    : error.publicMessage || error.message || "The request could not be completed.";

  res.status(status).json({ success: false, message });
}