/**
 * API Latency Simulation Middleware
 * 
 * Intercepts incoming requests and introduces an asynchronous non-blocking delay
 * if the `delay` query parameter is provided (e.g. ?delay=2000) or via the
 * `x-simulated-delay` HTTP header.
 * 
 * This enables the frontend Angular application to showcase asynchronous
 * processing, RxJS Observable handling, progress bars, and loading states.
 */

function delayMiddleware(req, res, next) {
  const queryDelay = req.query.delay;
  const headerDelay = req.headers['x-simulated-delay'];

  const rawDelay = queryDelay !== undefined ? queryDelay : headerDelay;
  const delayMs = parseInt(rawDelay, 10);

  if (!isNaN(delayMs) && delayMs > 0) {
    // Cap delay at 15 seconds to prevent runaway requests
    const boundedDelay = Math.min(delayMs, 15000);
    console.log(`[Delay Simulator] Request ${req.method} ${req.path} paused for ${boundedDelay}ms`);

    // Set response header to verify simulated latency
    res.setHeader('X-Simulated-Delay', `${boundedDelay}ms`);

    setTimeout(() => {
      next();
    }, boundedDelay);
  } else {
    next();
  }
}

module.exports = delayMiddleware;
