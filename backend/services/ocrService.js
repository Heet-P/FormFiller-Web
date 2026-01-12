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
 * Extract text and coordinates from image using Tesseract OCR
 * @param {string} imagePath - Path to image file
 * @returns {Promise<object>} Extracted text and word data with coordinates
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
    
    return {
      text: result.data.text,
      words: result.data.words, // Contains bounding box coordinates
      lines: result.data.lines,
      imageWidth: result.data.imageWidth,
      imageHeight: result.data.imageHeight
    };
  } catch (error) {
    console.error('OCR Error:', error);
    throw new Error('Failed to extract text from image');
  }
}

/**
 * Extract text from PDF
 * @param {string} pdfPath - Path to PDF file
 * @returns {Promise<object>} Extracted text and metadata
 */
async function extractTextFromPDF(pdfPath) {
  try {
    const dataBuffer = await fs.readFile(pdfPath);
    const data = await pdfParse(dataBuffer);
    
    console.log(`PDF text extraction: ${data.text.length} characters`);
    
    return {
      text: data.text,
      words: [],
      isScanned: data.text.length < 100 // Likely scanned if very little text
    };
  } catch (error) {
    console.error('PDF Parse Error:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

/**
 * Extract form fields from interactive PDF
 * @param {string} pdfPath - Path to PDF file
 * @returns {Promise<Array|null>} Array of form fields or null if no form fields
 */
async function extractPDFFormFields(pdfPath) {
  try {
    console.log('Attempting to extract PDF form fields...');
    
    // Import pdf-lib dynamically
    const { PDFDocument } = await import('pdf-lib');
    
    const dataBuffer = await fs.readFile(pdfPath);
    const pdfDoc = await PDFDocument.load(dataBuffer);
    
    const form = pdfDoc.getForm();
    const formFields = form.getFields();
    
    console.log(`PDF has ${formFields.length} form fields`);
    
    if (formFields.length === 0) {
      console.log('No interactive form fields found in PDF');
      return null;
    }
    
    console.log(`Found ${formFields.length} interactive PDF form fields`);
    
    const fields = formFields.map((field, index) => {
      const fieldName = field.getName();
      const fieldType = field.constructor.name;
      
      console.log(`  Field ${index + 1}: ${fieldName} (${fieldType})`);
      
      // Determine our field type from PDF field type
      let type = 'text';
      if (fieldType === 'PDFCheckBox') {
        type = 'checkbox';
      } else if (fieldType === 'PDFRadioGroup') {
        type = 'checkbox';
      } else if (fieldType === 'PDFDropdown') {
        type = 'text';
      } else if (fieldType === 'PDFTextField') {
        // Try to infer type from field name
        const nameLower = fieldName.toLowerCase();
        if (/email|e-mail/.test(nameLower)) type = 'email';
        else if (/phone|tel|mobile/.test(nameLower)) type = 'phone';
        else if (/date|dob|birth/.test(nameLower)) type = 'date';
        else if (/name/.test(nameLower)) type = 'name';
        else if (/address|street|city|state|zip/.test(nameLower)) type = 'address';
      }
      
      // Clean up field name for display
      let label = fieldName
        .replace(/([A-Z])/g, ' $1') // Add space before capital letters
        .replace(/_/g, ' ') // Replace underscores with spaces
        .replace(/\s+/g, ' ') // Normalize spaces
        .trim();
      
      // Capitalize first letter
      label = label.charAt(0).toUpperCase() + label.slice(1);
      
      return {
        id: `field_${index + 1}`,
        label: label,
        type: type,
        required: true,
        value: null,
        position: index,
        coordinates: null,
        pdfFieldName: fieldName // Store original PDF field name for filling
      };
    });
    
    return fields;
  } catch (error) {
    console.error('PDF Form Field Extraction Error:', error.message);
    console.error('Stack:', error.stack);
    return null;
  }
}

/**
 * Detect form fields from extracted text with coordinates
 * Enhanced detection for complex forms
 * @param {string} text - Extracted text
 * @param {Array} words - Word data with bounding boxes (optional)
 * @returns {Array} Array of detected form fields with coordinates
 */
function detectFormFields(text, words = []) {
  const fields = [];
  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

  // Expanded form field patterns with more keywords
  const fieldPatterns = {
    name: /\b(name|full\s*name|first\s*name|last\s*name|middle\s*name|applicant\s*name|student\s*name|parent\s*name|guardian\s*name|surname|given\s*name)\b/i,
    email: /\b(email|e-mail|email\s*address|electronic\s*mail)\b/i,
    phone: /\b(phone|telephone|mobile|cell|contact\s*number|phone\s*number|tel|contact\s*no)\b/i,
    address: /\b(address|street|residence|location|city|state|province|zip|postal\s*code|country|pin\s*code)\b/i,
    date: /\b(date|dob|birth\s*date|date\s*of\s*birth|admission\s*date|enrollment\s*date|year|month|day)\b/i,
    ssn: /\b(ssn|social\s*security|tax\s*id|national\s*id|id\s*number|identification)\b/i,
    gender: /\b(gender|sex|male|female)\b/i,
    age: /\b(age|years\s*old)\b/i,
    grade: /\b(grade|class|standard|level|year)\b/i,
    school: /\b(school|institution|college|university|previous\s*school)\b/i,
    parent: /\b(parent|father|mother|guardian|emergency\s*contact)\b/i,
    occupation: /\b(occupation|profession|job|employment|work)\b/i,
    income: /\b(income|salary|annual\s*income)\b/i,
    religion: /\b(religion|caste|category)\b/i,
    nationality: /\b(nationality|citizenship|country\s*of\s*origin)\b/i,
    signature: /\b(signature|sign\s*here|applicant\s*signature|parent\s*signature)\b/i,
    checkbox: /\b(check|select|tick|mark|yes|no|agree|consent)\b/i,
    text: /\b(describe|explain|provide|enter|write|details|information|remarks|comments)\b/i
  };

  // Track found field names to avoid duplicates
  const foundFields = new Set();

  // Strategy 1: Detect fields with explicit indicators
  lines.forEach((line, index) => {
    // Skip very short or very long lines
    if (line.length < 2 || line.length > 150) return;

    // Check for field indicators: colon, underscore, brackets, dots followed by space
    const hasFieldIndicator = /[:_\[\]()\.\s{2,}]/.test(line);
    
    // Also check if line ends with common field endings
    const hasFieldEnding = /[:\-_\.]{1,}$/.test(line) || /_{3,}/.test(line) || /\.{3,}/.test(line);
    
    if (hasFieldIndicator || hasFieldEnding) {
      // Extract field label (text before indicators)
      let label = line.split(/[:_\[\]()\.\s{2,}]/)[0].trim();
      
      // Clean up label
      label = label.replace(/^[\d\.\-\)]+\s*/, ''); // Remove numbering
      label = label.replace(/\*+$/, ''); // Remove asterisks
      
      // Skip if label is too short, too long, or already found
      if (label.length < 2 || label.length > 80 || foundFields.has(label.toLowerCase())) return;

      // Skip common non-field text
      const skipWords = /^(section|part|page|form|instructions|note|please|kindly|total|subtotal|amount|the|and|or|for|to|in|of|is|are|was|were)$/i;
      if (skipWords.test(label)) return;

      // Determine field type
      let fieldType = 'text';
      let required = true;

      for (const [type, pattern] of Object.entries(fieldPatterns)) {
        if (pattern.test(label) || pattern.test(line)) {
          fieldType = type;
          break;
        }
      }

      // Check if optional
      if (/optional|if\s*applicable/i.test(line)) {
        required = false;
      }

      // Find coordinates
      let coordinates = findCoordinatesForLabel(label, words);

      fields.push({
        id: `field_${fields.length + 1}`,
        label: label,
        type: fieldType,
        required: required,
        value: null,
        position: index,
        coordinates: coordinates
      });

      foundFields.add(label.toLowerCase());
    }
  });

  // Strategy 2: Detect fields from pattern keywords even without indicators
  if (fields.length < 5) {
    lines.forEach((line, index) => {
      if (line.length < 3 || line.length > 100) return;

      // Check if line matches any field pattern
      for (const [type, pattern] of Object.entries(fieldPatterns)) {
        if (pattern.test(line)) {
          // Extract the matching part as label
          const match = line.match(pattern);
          if (match) {
            let label = match[0].trim();
            
            // Try to get more context
            const words = line.split(/\s+/);
            const matchIndex = words.findIndex(w => pattern.test(w));
            if (matchIndex >= 0 && matchIndex < words.length - 1) {
              // Include next word if it makes sense
              label = words.slice(matchIndex, Math.min(matchIndex + 3, words.length)).join(' ');
            }

            // Clean label
            label = label.replace(/[:\-_\.\*]+$/, '').trim();
            
            if (label.length >= 2 && !foundFields.has(label.toLowerCase())) {
              const coordinates = findCoordinatesForLabel(label, words);

              fields.push({
                id: `field_${fields.length + 1}`,
                label: label,
                type: type,
                required: type !== 'text',
                value: null,
                position: index,
                coordinates: coordinates
              });

              foundFields.add(label.toLowerCase());
              break; // Only add once per line
            }
          }
        }
      }
    });
  }

  // If still no fields detected, create generic fields
  if (fields.length === 0) {
    const genericFields = [
      { id: 'field_1', label: 'Full Name', type: 'name', required: true, value: null, coordinates: null },
      { id: 'field_2', label: 'Email Address', type: 'email', required: true, value: null, coordinates: null },
      { id: 'field_3', label: 'Phone Number', type: 'phone', required: true, value: null, coordinates: null },
      { id: 'field_4', label: 'Address', type: 'address', required: false, value: null, coordinates: null },
      { id: 'field_5', label: 'Date', type: 'date', required: true, value: null, coordinates: null }
    ];
    return genericFields;
  }

  console.log(`Detected ${fields.length} fields:`, fields.map(f => f.label));
  return fields;
}

/**
 * Find coordinates for a field label in word data
 * @param {string} label - Field label to search for
 * @param {Array} words - Word data with bounding boxes
 * @returns {object|null} Coordinates object or null
 */
function findCoordinatesForLabel(label, words) {
  if (!words || words.length === 0) return null;

  const labelWords = label.toLowerCase().split(/\s+/);
  
  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    if (labelWords.some(lw => word.text.toLowerCase().includes(lw))) {
      return {
        x: word.bbox.x0,
        y: word.bbox.y0,
        width: word.bbox.x1 - word.bbox.x0,
        height: word.bbox.y1 - word.bbox.y0,
        // Estimate input field position (to the right of label)
        inputX: word.bbox.x1 + 10,
        inputY: word.bbox.y0
      };
    }
  }
  
  return null;
}

/**
 * Process uploaded form file
 * @param {string} filePath - Path to uploaded file
 * @param {string} mimeType - File MIME type
 * @returns {Promise<object>} Form schema with extracted fields and coordinates
 */
export async function processForm(filePath, mimeType) {
  try {
    let extractedText = '';
    let ocrData = null;
    let fields = [];

    // For PDFs, try to extract interactive form fields first
    if (mimeType.includes('pdf')) {
      const pdfFormFields = await extractPDFFormFields(filePath);
      
      if (pdfFormFields && pdfFormFields.length > 0) {
        // Found interactive PDF form fields - use them directly
        console.log(`Using ${pdfFormFields.length} interactive PDF form fields`);
        return {
          extractedText: 'Interactive PDF Form',
          fields: pdfFormFields,
          totalFields: pdfFormFields.length,
          isPDFForm: true
        };
      }
      
      // No interactive fields, fall back to text extraction
      console.log('No interactive PDF fields, using OCR-based detection');
      const pdfData = await extractTextFromPDF(filePath);
      extractedText = pdfData.text;
      
      // If it was a scanned PDF, we have OCR data
      if (pdfData.isScanned) {
        ocrData = {
          words: pdfData.words,
          lines: pdfData.lines,
          imageWidth: pdfData.imageWidth,
          imageHeight: pdfData.imageHeight
        };
      }
    } else if (mimeType.includes('image')) {
      ocrData = await extractTextFromImage(filePath);
      extractedText = ocrData.text;
    } else {
      throw new Error('Unsupported file type. Please upload an image or PDF.');
    }

    console.log('Extracted Text Length:', extractedText.length);

    // Detect form fields with coordinates if available
    fields = detectFormFields(extractedText, ocrData?.words);

    console.log(`Detected ${fields.length} form fields`);

    return {
      extractedText: extractedText.substring(0, 500), // Store first 500 chars for reference
      fields: fields,
      totalFields: fields.length,
      imageWidth: ocrData?.imageWidth,
      imageHeight: ocrData?.imageHeight,
      isPDFForm: false
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
