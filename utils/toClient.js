/**
 * @file utils/toClient.js
 * @description Converts a Mongoose document or lean plain object into a
 * clean, client-safe payload:
 *   - `_id`  → `id`  (string)
 *   - `__v`  removed
 *   - `createdAt` normalised to an ISO-8601 string
 *   - `updatedAt` normalised to an ISO-8601 string (when present)
 *
 * Models that configure a `toJSON` transform call this automatically via
 * `res.json()`. For lean() results you can still call it explicitly.
 *
 * @param {object} doc - Mongoose document or lean plain object
 * @returns {object}
 */
export function toClient(doc) {
  const obj = doc.toObject ? doc.toObject({ versionKey: false }) : { ...doc };

  obj.id = String(obj._id);
  delete obj._id;
  delete obj.__v;

  if (obj.createdAt != null) {
    obj.createdAt =
      obj.createdAt instanceof Date
        ? obj.createdAt.toISOString()
        : String(obj.createdAt);
  }

  if (obj.updatedAt != null) {
    obj.updatedAt =
      obj.updatedAt instanceof Date
        ? obj.updatedAt.toISOString()
        : String(obj.updatedAt);
  }

  return obj;
}

/**
 * Mongoose `toJSON` / `toObject` transform — attach to schemas directly so
 * `res.json(doc)` automatically produces the clean shape.
 *
 * @param {object} _doc  - original Mongoose document (unused)
 * @param {object} ret   - plain object being serialised
 * @returns {object}
 */
export function mongooseTransform(_doc, ret) {
  ret.id = String(ret._id);
  delete ret._id;
  delete ret.__v;

  if (ret.createdAt instanceof Date) ret.createdAt = ret.createdAt.toISOString();
  if (ret.updatedAt instanceof Date) ret.updatedAt = ret.updatedAt.toISOString();

  return ret;
}
