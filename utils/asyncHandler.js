/**
 * @file utils/asyncHandler.js
 * @description Wraps an async Express route handler so that any rejected
 * promise is automatically forwarded to `next(err)` — removing the need
 * for repetitive try/catch blocks in every route.
 *
 * @example
 * import { asyncHandler } from '../utils/asyncHandler.js';
 *
 * router.get('/', asyncHandler(async (req, res) => {
 *   const docs = await Model.find().lean();
 *   res.json(docs);
 * }));
 */

/**
 * @param {(req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => Promise<void>} fn
 * @returns {import('express').RequestHandler}
 */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
