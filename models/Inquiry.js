/**
 * @file models/Inquiry.js
 * @description Mongoose model for public contact/inquiry form submissions.
 */

import mongoose from 'mongoose';
import { mongooseTransform } from '../utils/toClient.js';

const { Schema } = mongoose;

/**
 * @typedef {object} InquiryShape
 * @property {string}  [name]
 * @property {string}  [email]
 * @property {string}  [phone]
 * @property {string}  [message]
 * @property {Date}    createdAt
 * @property {Date}    updatedAt
 */

const inquirySchema = new Schema(
  {
    name: {
      type:      String,
      default:   '',
      trim:      true,
      maxlength: [100, 'Name must be 100 characters or fewer'],
    },
    email: {
      type:      String,
      default:   '',
      trim:      true,
      lowercase: true,
      maxlength: [200, 'Email must be 200 characters or fewer'],
    },
    phone: {
      type:      String,
      default:   '',
      trim:      true,
      maxlength: [20, 'Phone must be 20 characters or fewer'],
    },
    message: {
      type:      String,
      default:   '',
      trim:      true,
      maxlength: [3000, 'Message must be 3 000 characters or fewer'],
    },
  },
  {
    timestamps: true,
    toJSON:     { transform: mongooseTransform },
    toObject:   { transform: mongooseTransform },
  },
);

// Admin inbox: newest first; occasional email look-ups
inquirySchema.index({ createdAt: -1 });
inquirySchema.index({ email: 1 });

const Inquiry = mongoose.model('Inquiry', inquirySchema);
export default Inquiry;
