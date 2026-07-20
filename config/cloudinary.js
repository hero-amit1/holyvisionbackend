/**
 * @file config/cloudinary.js
 * @description Configure and export the Cloudinary v2 SDK instance.
 *
 * Import this module wherever you need to call cloudinary.uploader.*
 * The configuration is applied once on first import (singleton pattern).
 */

import { v2 as cloudinary } from 'cloudinary';
import {
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
} from './env.js';

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key:    CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET,
  secure:     true,
});

export default cloudinary;
