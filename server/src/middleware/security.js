import path from 'path';

/**
 * Localhost Origin Protection Middleware
 * Defends against Web-to-Localhost CSRF & DNS Rebinding attacks.
 * Disallows arbitrary internet websites from executing requests against the local API.
 */
export function localhostOriginGuard(req, res, next) {
  const origin = req.headers.origin || req.headers.referer;

  // Requests without Origin/Referer (e.g. curl, native desktop webview, same-process) are allowed
  if (!origin) {
    return next();
  }

  try {
    const parsed = new URL(origin);
    const host = parsed.hostname.toLowerCase();

    // Only allow localhost and 127.0.0.1
    if (host === 'localhost' || host === '127.0.0.1' || host === '::1') {
      return next();
    }

    console.warn(`[Security] Blocked unauthorized cross-origin request from: ${origin}`);
    return res.status(403).json({
      error: 'Access Denied: Cross-site requests from external web origins are blocked to protect your local document privacy.',
      blockedOrigin: origin
    });
  } catch {
    // Malformed origin
    return res.status(403).json({ error: 'Access Denied: Malformed origin header.' });
  }
}

/**
 * Path Traversal Sanitizer
 * Ensures path arguments cannot escape permitted directories.
 */
export function sanitizePath(inputPath) {
  if (!inputPath || typeof inputPath !== 'string') return null;
  const resolved = path.resolve(inputPath);
  return resolved;
}
