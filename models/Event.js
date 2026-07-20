/**
 * @file models/Event.js
 * @description Mongoose model for campus events.
 */

import mongoose from 'mongoose';
import { mongooseTransform } from '../utils/toClient.js';

const { Schema } = mongoose;

/**
 * @typedef {object} EventShape
 * @property {string}  title
 * @property {string}  [description]
 * @property {string}  [date]        - Human-readable event date (e.g. "2025-09-15")
 * @property {string}  [time]        - Human-readable event time (e.g. "10:00 AM")
 * @property {string}  [banner]      - Cloudinary secure_url for the banner image
 * @property {Date}    createdAt
 * @property {Date}    updatedAt
 */

const eventSchema = new Schema(
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
      maxlength: [2000, 'Description must be 2 000 characters or fewer'],
    },
    date: {
      type:    String,
      default: '',
      trim:    true,
    },
    time: {
      type:    String,
      default: '',
      trim:    true,
    },
    banner: {
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

// Dashboard lists events newest-first
eventSchema.index({ createdAt: -1 });

const Event = mongoose.model('Event', eventSchema);
export default Event;
