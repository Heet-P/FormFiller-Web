/**
 * PDF Service - Enhanced Version
 * Handles PDF generation and form filling for both interactive and scanned forms
 * Supports accurate field positioning and checkbox/radio button filling
 */

import { PDFDocument, rgb, StandardFonts, PDFCheckBox, PDFTextField } from 'pdf-lib';
import fs from 'fs/promises';
import path from 'path';

/**
 * Fill interactive PDF form fields
 * @param {PDFDocument} pdfDoc - PDF document
 * @param {object} formSchema - Form schema with fields
 * @param {object} filledFields - Filled field values
 * @returns {boolean} True if form fields were found and filled
 */
async function fillInteractivePDFForm(pdfDoc, formSchema, filledFields) {
  try {
    const form = pdfDoc.getForm();
    const formFields = form.getFields();

    if (formFields.length === 0) {
      console.log('No interactive form fields found in PDF');
      return false;
    }

    console.log(`Found ${formFields.length} interactive form fields`);

    // Map our fields to PDF form fields
    formSchema.fields.forEach(field => {
      const value = filledFields[field.id];
      if (!value) return;

      // Try to find matching PDF form field by label
      const pdfField = formFields.find(f => {
        const fieldName = f.getName().toLowerCase();
        const label = field.label.toLowerCase();
        return fieldName.includes(label) || label.includes(fieldName);
      });

      if (pdfField) {
        try {
          const fieldType = pdfField.constructor.name;

          if (fieldType === 'PDFTextField') {
            pdfField.setText(String(value));
            console.log(`Filled text field: ${pdfField.getName()} = ${value}`);
          } else if (fieldType === 'PDFCheckBox') {
            // Check if value indicates checked state
            const shouldCheck = ['yes', 'true', '1', 'checked', 'x'].includes(String(value).toLowerCase());
            if (shouldCheck) {
              pdfField.check();
              console.log(`Checked checkbox: ${pdfField.getName()}`);
            }
          } else if (fieldType === 'PDFRadioGroup') {
            // Select the radio button option
            const options = pdfField.getOptions();
            const matchingOption = options.find(opt => 
              opt.toLowerCase() === String(value).toLowerCase()
            );
            if (matchingOption) {
              pdfField.select(matchingOption);
              console.log(`Selected radio: ${pdfField.getName()} = ${matchingOption}`);
            }
          } else if (fieldType === 'PDFDropdown') {
            pdfField.select(String(value));
            console.log(`Selected dropdown: ${pdfField.getName()} = ${value}`);
          }
        } catch (error) {
          console.error(`Error filling field ${pdfField.getName()}:`, error.message);
        }
      }
    });

    // Flatten the form to make fields non-editable
    form.flatten();
    return true;
  } catch (error) {
    console.error('Interactive form filling error:', error);
    return false;
  }
}

/**
 * Fill scanned form using coordinates
 * @param {PDFDocument} pdfDoc - PDF document
 * @param {object} formSchema - Form schema with fields and coordinates
 * @param {object} filledFields - Filled field values
 */
async function fillScannedForm(pdfDoc, formSchema, filledFields) {
  const pages = pdfDoc.getPages();
  const firstPage = pages[0];
  const { width, height } = firstPage.getSize();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const italicFont = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
  const fontSize = 10;

  formSchema.fields.forEach((field, index) => {
    const value = filledFields[field.id];
    if (!value) return;

    let xPos, yPos;

    if (field.coordinates) {
      // Use detected coordinates from OCR
      // Convert from image coordinates to PDF coordinates
      const imageHeight = formSchema.imageHeight || height;
      const imageWidth = formSchema.imageWidth || width;
      
      // Scale coordinates to PDF size
      const scaleX = width / imageWidth;
      const scaleY = height / imageHeight;
      
      xPos = field.coordinates.inputX * scaleX;
      // PDF coordinates start from bottom, image from top
      yPos = height - (field.coordinates.inputY * scaleY);
    } else {
      // Fallback to estimated positions
      const startY = height - 150;
      const lineHeight = 25;
      xPos = 150;
      yPos = startY - (index * lineHeight);
    }

    // Handle different field types
    if (field.type === 'checkbox') {
      // Draw checkbox
      const shouldCheck = ['yes', 'true', '1', 'checked', 'x'].includes(String(value).toLowerCase());
      if (shouldCheck) {
        // Draw a checkmark
        const checkSize = 12;
        firstPage.drawText('✓', {
          x: xPos,
          y: yPos,
          size: checkSize,
          font: font,
          color: rgb(0, 0, 0)
        });
      }
    } else if (field.type === 'signature') {
      // Draw signature in italic
      firstPage.drawText(String(value), {
        x: xPos,
        y: yPos,
        size: fontSize + 2,
        font: italicFont,
        color: rgb(0, 0, 0.5)
      });
    } else {
      // Draw regular text
      const textValue = String(value);
      const maxWidth = width - xPos - 50;
      
      // Truncate text if too long
      let displayText = textValue;
      if (font.widthOfTextAtSize(textValue, fontSize) > maxWidth) {
        while (font.widthOfTextAtSize(displayText + '...', fontSize) > maxWidth && displayText.length > 0) {
          displayText = displayText.slice(0, -1);
        }
        displayText += '...';
      }

      firstPage.drawText(displayText, {
        x: xPos,
        y: yPos,
        size: fontSize,
        font: font,
        color: rgb(0, 0, 0)
      });
    }
  });
}

/**
 * Generate filled PDF from original form (Hybrid approach)
 * @param {string} originalFilePath - Path to original form file
 * @param {object} formSchema - Form schema with fields
 * @param {object} filledFields - Filled field values
 * @param {string} outputPath - Path to save filled PDF
 * @returns {Promise<string>} Path to generated PDF
 */
export async function generateFilledPDF(originalFilePath, formSchema, filledFields, outputPath) {
  try {
    // Read the original file
    const fileBuffer = await fs.readFile(originalFilePath);
    const mimeType = getMimeType(originalFilePath);

    let pdfDoc;
    let isImage = false;

    if (mimeType.includes('pdf')) {
      // Load existing PDF
      pdfDoc = await PDFDocument.load(fileBuffer);
      
      // Try to fill interactive form fields first
      const filledInteractive = await fillInteractivePDFForm(pdfDoc, formSchema, filledFields);
      
      if (filledInteractive) {
        console.log('Successfully filled interactive PDF form');
      } else {
        // No interactive fields, treat as scanned PDF
        console.log('No interactive fields, filling as scanned form');
        await fillScannedForm(pdfDoc, formSchema, filledFields);
      }
    } else {
      // Create new PDF for image
      isImage = true;
      pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([612, 792]); // Letter size
      
      // Embed the image
      let image;
      if (mimeType.includes('png')) {
        image = await pdfDoc.embedPng(fileBuffer);
      } else if (mimeType.includes('jpeg') || mimeType.includes('jpg')) {
        image = await pdfDoc.embedJpg(fileBuffer);
      }

      if (image) {
        const { width, height } = page.getSize();
        const imageAspect = image.width / image.height;
        const pageAspect = width / height;
        
        let imgWidth, imgHeight, imgX, imgY;
        
        // Fit image to page while maintaining aspect ratio
        if (imageAspect > pageAspect) {
          imgWidth = width - 100;
          imgHeight = imgWidth / imageAspect;
          imgX = 50;
          imgY = (height - imgHeight) / 2;
        } else {
          imgHeight = height - 100;
          imgWidth = imgHeight * imageAspect;
          imgX = (width - imgWidth) / 2;
          imgY = 50;
        }

        page.drawImage(image, {
          x: imgX,
          y: imgY,
          width: imgWidth,
          height: imgHeight
        });
      }

      // Fill as scanned form
      await fillScannedForm(pdfDoc, formSchema, filledFields);
    }

    // Add metadata
    pdfDoc.setTitle('Filled Form');
    pdfDoc.setAuthor('Intelligent Form Filler');
    pdfDoc.setCreationDate(new Date());

    // Save the PDF
    const pdfBytes = await pdfDoc.save();
    await fs.writeFile(outputPath, pdfBytes);

    console.log(`PDF generated successfully: ${outputPath}`);
    return outputPath;
  } catch (error) {
    console.error('PDF Generation Error:', error);
    throw new Error('Failed to generate filled PDF');
  }
}

/**
 * Create a summary PDF with all filled fields
 * @param {object} formSchema - Form schema
 * @param {object} filledFields - Filled field values
 * @param {string} outputPath - Output path
 * @returns {Promise<string>} Path to generated PDF
 */
export async function createSummaryPDF(formSchema, filledFields, outputPath) {
  try {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]); // Letter size
    const { width, height } = page.getSize();

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Title
    page.drawText('Filled Form Summary', {
      x: 50,
      y: height - 50,
      size: 18,
      font: boldFont,
      color: rgb(0, 0, 0)
    });

    // Date
    const date = new Date().toLocaleDateString();
    page.drawText(`Generated: ${date}`, {
      x: 50,
      y: height - 75,
      size: 10,
      font: font,
      color: rgb(0.5, 0.5, 0.5)
    });

    // Draw fields
    let yPosition = height - 120;
    const lineHeight = 25;
    const fields = formSchema.fields;

    fields.forEach((field, index) => {
      const value = filledFields[field.id] || 'N/A';
      
      // Check if we need a new page
      if (yPosition < 50) {
        const newPage = pdfDoc.addPage([612, 792]);
        yPosition = height - 50;
      }

      // Field label
      page.drawText(`${index + 1}. ${field.label}`, {
        x: 50,
        y: yPosition,
        size: 11,
        font: boldFont,
        color: rgb(0, 0, 0)
      });

      // Field value
      page.drawText(String(value), {
        x: 70,
        y: yPosition - 15,
        size: 10,
        font: font,
        color: rgb(0, 0, 0.8)
      });

      yPosition -= lineHeight + 15;
    });

    // Save PDF
    const pdfBytes = await pdfDoc.save();
    await fs.writeFile(outputPath, pdfBytes);

    console.log(`Summary PDF created: ${outputPath}`);
    return outputPath;
  } catch (error) {
    console.error('Summary PDF Error:', error);
    throw new Error('Failed to create summary PDF');
  }
}

/**
 * Get MIME type from file extension
 * @param {string} filePath
 * @returns {string} MIME type
 */
function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.pdf': 'application/pdf',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg'
  };
  return mimeTypes[ext] || 'application/octet-stream';
}
