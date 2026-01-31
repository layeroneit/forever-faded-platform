import { validationResult } from 'express-validator';

/**
 * If validation failed, send 400 with { error: firstMessage } and return true.
 * Otherwise return false. Use after body/param/query validators.
 */
export function validationError(req, res) {
  const errors = validationResult(req);
  if (errors.isEmpty()) return false;
  const first = errors.array({ onlyFirstError: true })[0];
  const message = first?.msg || first?.message || 'Validation failed';
  res.status(400).json({ error: typeof message === 'string' ? message : 'Validation failed' });
  return true;
}
