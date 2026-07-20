/**
 * @file models/Notice.js
 * @description Mongoose model for campus notices/announcements.
 */

import mongoose from 'mongoose';
import { mongooseTransform } from '../utils/toClient.js';

const { Schema } = mongoose;

/** @typedef {import('mongoose').Document & NoticeShape} NoticeDoc */

/**
 * @typedef {object} NoticeShape
 * @property {string}  title
 * @property {string}  [description]
 * @property {string}  [imageUrl]
 * @property {string}  [link]
 * @property {Date}    createdAt
 * @property {Date}    updatedAt
 */

const noticeSchema = new Schema(
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
    imageUrl: {
      type:    String,
      default: '',
      trim:    true,
    },
    link: {
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

// Most queries fetch the latest notices first
noticeSchema.index({ createdAt: -1 });

const Notice = mongoose.model('Notice', noticeSchema);
export default Notice;
