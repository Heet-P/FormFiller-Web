/**
 * PDF Service
 * Handles PDF generation and form filling
 * Overlays filled data onto original form
 */

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs/promises';
import path from 'path';

/**
 * Generate filled PDF from original form
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

    if (mimeType.includes('pdf')) {
      // Load existing PDF
      pdfDoc = await PDFDocument.load(fileBuffer);
    } else {
      // Create new PDF for image
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
        const imageDims = image.scale(0.5);
        page.drawImage(image, {
          x: 50,
          y: page.getHeight() - imageDims.height - 50,
          width: imageDims.width,
          height: imageDims.height
        });
      }
    }

    // Get the first page
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];
    const { width, height } = firstPage.getSize();

    // Embed font
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontSize = 10;

    // Calculate positions for fields
    const fields = formSchema.fields;
    const startY = height - 100;
    const lineHeight = 20;

    // Overlay filled fields
    fields.forEach((field, index) => {
      const value = filledFields[field.id];
      if (value) {
        const yPosition = startY - (index * lineHeight);
        
        // Draw field label
        firstPage.drawText(`${field.label}:`, {
          x: 50,
          y: yPosition,
          size: fontSize,
          font: font,
          color: rgb(0, 0, 0)
        });

        // Draw field value
        firstPage.drawText(String(value), {
          x: 200,
          y: yPosition,
          size: fontSize,
          font: font,
          color: rgb(0, 0, 0.8)
        });
      }
    });

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
