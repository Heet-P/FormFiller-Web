/**
 * OCR Service
 * Handles text extraction from images and PDFs using Tesseract.js
 * Detects form fields and generates JSON schema
 */

import Tesseract from 'tesseract.js';
import pdfParse from 'pdf-parse';
import fs from 'fs/promises';
import path from 'path';

/**
 * Extract text from image using Tesseract OCR
 * @param {string} imagePath - Path to image file
 * @returns {Promise<string>} Extracted text
 */
async function extractTextFromImage(imagePath) {
  try {
    const result = await Tesseract.recognize(imagePath, 'eng', {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
        }
      }
    });
    return result.data.text;
  } catch (error) {
    console.error('OCR Error:', error);
    throw new Error('Failed to extract text from image');
  }
}

/**
 * Extract text from PDF
 * @param {string} pdfPath - Path to PDF file
 * @returns {Promise<string>} Extracted text
 */
async function extractTextFromPDF(pdfPath) {
  try {
    const dataBuffer = await fs.readFile(pdfPath);
    const data = await pdfParse(dataBuffer);
    return data.text;
  } catch (error) {
    console.error('PDF Parse Error:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

/**
 * Detect form fields from extracted text
 * Uses pattern matching to identify common form field patterns
 * @param {string} text - Extracted text
 * @returns {Array} Array of detected form fields
 */
function detectFormFields(text) {
  const fields = [];
  const lines = text.split('\n').filter(line => line.trim().length > 0);

  // Common form field patterns
  const patterns = {
    name: /\b(name|full\s*name|first\s*name|last\s*name|applicant\s*name)\b/i,
    email: /\b(email|e-mail|email\s*address)\b/i,
    phone: /\b(phone|telephone|mobile|contact\s*number|phone\s*number)\b/i,
    address: /\b(address|street|city|state|zip|postal\s*code|country)\b/i,
    date: /\b(date|dob|birth\s*date|date\s*of\s*birth)\b/i,
    ssn: /\b(ssn|social\s*security|tax\s*id)\b/i,
    signature: /\b(signature|sign\s*here|applicant\s*signature)\b/i,
    checkbox: /\b(check|select|choose|mark)\b/i,
    text: /\b(describe|explain|provide|enter|write)\b/i
  };

  // Track found field names to avoid duplicates
  const foundFields = new Set();

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();
    
    // Skip very short lines or lines that look like instructions
    if (trimmedLine.length < 3 || trimmedLine.length > 100) return;

    // Check if line contains field indicators (colon, underscore, brackets)
    const hasFieldIndicator = /[:_\[\]()]/.test(trimmedLine);
    
    if (hasFieldIndicator) {
      // Extract field label (text before colon or special characters)
      let label = trimmedLine.split(/[:_\[\]()]/)[0].trim();
      
      // Skip if label is too short or already found
      if (label.length < 2 || foundFields.has(label.toLowerCase())) return;

      // Determine field type based on patterns
      let fieldType = 'text';
      let required = true;

      for (const [type, pattern] of Object.entries(patterns)) {
        if (pattern.test(label)) {
          fieldType = type;
          break;
        }
      }

      // Check if field is marked as optional
      if (/optional/i.test(trimmedLine)) {
        required = false;
      }

      fields.push({
        id: `field_${fields.length + 1}`,
        label: label,
        type: fieldType,
        required: required,
        value: null,
        position: index
      });

      foundFields.add(label.toLowerCase());
    }
  });

  // If no fields detected, create generic fields based on common form elements
  if (fields.length === 0) {
    const genericFields = [
      { id: 'field_1', label: 'Full Name', type: 'name', required: true, value: null },
      { id: 'field_2', label: 'Email Address', type: 'email', required: true, value: null },
      { id: 'field_3', label: 'Phone Number', type: 'phone', required: true, value: null },
      { id: 'field_4', label: 'Address', type: 'address', required: false, value: null },
      { id: 'field_5', label: 'Date', type: 'date', required: true, value: null }
    ];
    return genericFields;
  }

  return fields;
}

/**
 * Process uploaded form file
 * @param {string} filePath - Path to uploaded file
 * @param {string} mimeType - File MIME type
 * @returns {Promise<object>} Form schema with extracted fields
 */
export async function processForm(filePath, mimeType) {
  try {
    let extractedText = '';

    // Extract text based on file type
    if (mimeType.includes('pdf')) {
      extractedText = await extractTextFromPDF(filePath);
    } else if (mimeType.includes('image')) {
      extractedText = await extractTextFromImage(filePath);
    } else {
      throw new Error('Unsupported file type. Please upload an image or PDF.');
    }

    console.log('Extracted Text Length:', extractedText.length);

    // Detect form fields
    const fields = detectFormFields(extractedText);

    console.log(`Detected ${fields.length} form fields`);

    return {
      extractedText: extractedText.substring(0, 500), // Store first 500 chars for reference
      fields: fields,
      totalFields: fields.length
    };
  } catch (error) {
    console.error('Form Processing Error:', error);
    throw error;
  }
}

/**
 * Validate field value based on type
 * @param {string} type - Field type
 * @param {string} value - Value to validate
 * @returns {object} Validation result
 */
export function validateFieldValue(type, value) {
  const validations = {
    email: {
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      message: 'Please provide a valid email address'
    },
    phone: {
      pattern: /^[\d\s\-\+\(\)]{10,}$/,
      message: 'Please provide a valid phone number (at least 10 digits)'
    },
    date: {
      pattern: /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/,
      message: 'Please provide a date in format MM/DD/YYYY or DD-MM-YYYY'
    },
    ssn: {
      pattern: /^\d{3}-?\d{2}-?\d{4}$/,
      message: 'Please provide a valid SSN (XXX-XX-XXXX)'
    }
  };

  // Check if value is empty
  if (!value || value.trim().length === 0) {
    return {
      valid: false,
      message: 'This field cannot be empty'
    };
  }

  // Type-specific validation
  if (validations[type]) {
    const { pattern, message } = validations[type];
    if (!pattern.test(value)) {
      return {
        valid: false,
        message: message
      };
    }
  }

  return {
    valid: true,
    message: 'Valid'
  };
}
