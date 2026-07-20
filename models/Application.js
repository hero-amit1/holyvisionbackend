/**
 * @file models/Application.js
 * @description Mongoose model for student admission applications.
 */

import mongoose from 'mongoose';
import { mongooseTransform } from '../utils/toClient.js';

const { Schema } = mongoose;

/**
 * @typedef {object} ApplicationShape
 * @property {string}  [name]
 * @property {string}  [gender]
 * @property {string}  [dob]              - ISO date string, e.g. "2005-04-12"
 * @property {string}  [fatherName]
 * @property {string}  [motherName]
 * @property {string}  [municipality]
 * @property {string}  [ward]
 * @property {string}  [district]
 * @property {string}  [province]
 * @property {string}  [schoolName]
 * @property {string}  [graduationYear]
 * @property {string}  [percentage]
 * @property {string}  [gpa]
 * @property {string}  [program]          - Applied program/course
 * @property {string}  [applicantContact]
 * @property {string}  [guardianContact]
 * @property {Date}    createdAt
 * @property {Date}    updatedAt
 */

/** Fields permitted in an application submission (whitelist for input sanitisation) */
export const APPLICATION_FIELDS = /** @type {const} */ ([
  'name', 'gender', 'dob', 'fatherName', 'motherName',
  'municipality', 'ward', 'district', 'province',
  'schoolName', 'graduationYear', 'percentage', 'gpa',
  'program', 'applicantContact', 'guardianContact',
]);

const str = (maxlength, msg) => ({
  type: String, default: '', trim: true, maxlength: [maxlength, msg],
});

const applicationSchema = new Schema(
  {
    name:             str(150, 'Name must be 150 characters or fewer'),
    gender:           { type: String, default: '', trim: true },
    dob:              { type: String, default: '', trim: true },
    fatherName:       str(150, 'Father name must be 150 characters or fewer'),
    motherName:       str(150, 'Mother name must be 150 characters or fewer'),
    municipality:     str(150, 'Municipality must be 150 characters or fewer'),
    ward:             { type: String, default: '', trim: true },
    district:         str(100, 'District must be 100 characters or fewer'),
    province:         { type: String, default: '', trim: true },
    schoolName:       str(200, 'School name must be 200 characters or fewer'),
    graduationYear:   { type: String, default: '', trim: true },
    percentage:       { type: String, default: '', trim: true },
    gpa:              { type: String, default: '', trim: true },
    program:          str(200, 'Program must be 200 characters or fewer'),
    applicantContact: str(20,  'Applicant contact must be 20 characters or fewer'),
    guardianContact:  str(20,  'Guardian contact must be 20 characters or fewer'),
  },
  {
    timestamps: true,
    toJSON:     { transform: mongooseTransform },
    toObject:   { transform: mongooseTransform },
  },
);

// Admin table: newest first; filter by program
applicationSchema.index({ createdAt: -1 });
applicationSchema.index({ program: 1 });

const Application = mongoose.model('Application', applicationSchema);
export default Application;
