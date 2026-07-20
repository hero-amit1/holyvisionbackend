/**
 * @file models/Gallery.js
 * @description Mongoose model for the campus photo gallery.
 */

import mongoose from 'mongoose';
import { mongooseTransform } from '../utils/toClient.js';

const { Schema } = mongoose;

/** Valid gallery categories */
export const GALLERY_CATEGORIES = /** @type {const} */ ([
  'general',
  'events',
  'campus',
  'students',
]);

/**
 * @typedef {'general'|'events'|'campus'|'students'} GalleryCategory
 *
 * @typedef {object} GalleryShape
 * @property {string}          title
 * @property {string}          [description]
 * @property {GalleryCategory} [category]
 * @property {string}          [imageUrl]   - Cloudinary secure_url
 * @property {Date}            createdAt
 * @property {Date}            updatedAt
 */

const gallerySchema = new Schema(
  {
    title: {
      type:      String,
      required:  [true, 'Title is required'],
      trim:      true,
      maxlength: [200, 'Title must be 200 characters or fewer'],
    },
    description: {
      type:      String,
      default:   '',
      trim:      true,
      maxlength: [500, 'Description must be 500 characters or fewer'],
    },
    category: {
      type:    String,
      default: 'general',
      enum:    {
        values:  GALLERY_CATEGORIES,
        message: `Category must be one of: ${GALLERY_CATEGORIES.join(', ')}`,
      },
    },
    imageUrl: {
      type:    String,
      default: '',
      trim:    true,
    },
  },
  {
    timestamps: true,
    toJSON:     { transform: mongooseTransform },
    toObject:   { transform: mongooseTransform },
  },
);

// Support fast filtering by category + recency
gallerySchema.index({ category: 1, createdAt: -1 });

const Gallery = mongoose.model('Gallery', gallerySchema);
export default Gallery;
