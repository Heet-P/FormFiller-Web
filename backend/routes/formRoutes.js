/**
 * Form Routes
 * API endpoints for form processing, chat, and PDF export
 */

import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { processForm, validateFieldValue } from '../services/ocrService.js';
import { generateNextQuestion, isAPIConfigured } from '../services/aiService.js';
import { generateFilledPDF, createSummaryPDF } from '../services/pdfService.js';
import sessionStore from '../utils/sessionStore.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), '..', 'uploads');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error, null);
    }
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB default
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PNG, JPEG, and PDF are allowed.'));
    }
  }
});

/**
 * POST /api/upload-form
 * Upload and process form
 */
router.post('/upload-form', upload.single('form'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log('Processing uploaded file:', req.file.filename);

    // Process the form with OCR
    const formSchema = await processForm(req.file.path, req.file.mimetype);

    // Create session
    const sessionId = uuidv4();
    sessionStore.createSession(sessionId, formSchema);
    sessionStore.setOriginalFilePath(sessionId, req.file.path);

    // Generate first question
    const session = sessionStore.getSession(sessionId);
    const firstQuestion = await generateNextQuestion(session);

    // Store AI message in conversation history
    sessionStore.addMessage(sessionId, 'assistant', JSON.stringify(firstQuestion));

    res.json({
      success: true,
      sessionId: sessionId,
      formSchema: formSchema,
      firstQuestion: firstQuestion
    });
  } catch (error) {
    console.error('Upload Error:', error);
    
    // Clean up uploaded file on error
    if (req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.error('Failed to delete file:', unlinkError);
      }
    }

    res.status(500).json({
      error: 'Failed to process form',
      message: error.message
    });
  }
});

/**
 * POST /api/chat
 * Handle chat interaction
 */
router.post('/chat', async (req, res) => {
  try {
    const { sessionId, message } = req.body;

    if (!sessionId || !message) {
      return res.status(400).json({ error: 'Session ID and message are required' });
    }

    // Check if API is configured
    if (!isAPIConfigured()) {
      return res.status(503).json({
        error: 'AI service not configured',
        message: 'NVIDIA API key is not set. Please configure your .env file.'
      });
    }

    // Get session
    const session = sessionStore.getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Add user message to history
    sessionStore.addMessage(sessionId, 'user', message);

    // Get current field
    const currentField = session.formSchema.fields[session.currentFieldIndex];

    if (currentField) {
      // Validate user input
      const validation = validateFieldValue(currentField.type, message);

      if (!validation.valid) {
        // Invalid input - ask again
        const retryResponse = {
          question: `${validation.message}. Please try again: ${currentField.label}`,
          fieldId: currentField.id,
          fieldLabel: currentField.label,
          fieldType: currentField.type,
          isComplete: false,
          validationError: true
        };

        sessionStore.addMessage(sessionId, 'assistant', JSON.stringify(retryResponse));

        return res.json(retryResponse);
      }

      // Valid input - store it
      sessionStore.updateField(sessionId, currentField.id, message);

      // Move to next field
      const nextIndex = session.currentFieldIndex + 1;
      sessionStore.setCurrentFieldIndex(sessionId, nextIndex);

      // Check if all fields are filled
      if (nextIndex >= session.formSchema.fields.length) {
        sessionStore.markComplete(sessionId);
        
        const completeResponse = {
          question: 'Great! All fields have been filled successfully. You can now export your completed form as a PDF.',
          isComplete: true
        };

        sessionStore.addMessage(sessionId, 'assistant', JSON.stringify(completeResponse));

        return res.json(completeResponse);
      }
    }

    // Generate next question
    const updatedSession = sessionStore.getSession(sessionId);
    const nextQuestion = await generateNextQuestion(updatedSession, message);

    // Store AI response
    sessionStore.addMessage(sessionId, 'assistant', JSON.stringify(nextQuestion));

    res.json(nextQuestion);
  } catch (error) {
    console.error('Chat Error:', error);
    res.status(500).json({
      error: 'Failed to process message',
      message: error.message
    });
  }
});

/**
 * GET /api/form-state/:sessionId
 * Get current form state
 */
router.get('/form-state/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = sessionStore.getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    res.json({
      sessionId: session.sessionId,
      formSchema: session.formSchema,
      filledFields: session.filledFields,
      currentFieldIndex: session.currentFieldIndex,
      isComplete: session.isComplete,
      progress: {
        total: session.formSchema.fields.length,
        filled: Object.keys(session.filledFields).length
      }
    });
  } catch (error) {
    console.error('Form State Error:', error);
    res.status(500).json({
      error: 'Failed to get form state',
      message: error.message
    });
  }
});

/**
 * POST /api/export-pdf
 * Generate and download filled PDF
 */
router.post('/export-pdf', async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    const session = sessionStore.getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    if (!session.isComplete) {
      return res.status(400).json({ error: 'Form is not complete yet' });
    }

    // Generate output path
    const outputDir = path.join(process.cwd(), '..', 'uploads');
    const outputFileName = `filled_form_${sessionId}.pdf`;
    const outputPath = path.join(outputDir, outputFileName);

    // Generate PDF
    let pdfPath;
    if (session.originalFilePath) {
      pdfPath = await generateFilledPDF(
        session.originalFilePath,
        session.formSchema,
        session.filledFields,
        outputPath
      );
    } else {
      // Create summary PDF if original file not available
      pdfPath = await createSummaryPDF(
        session.formSchema,
        session.filledFields,
        outputPath
      );
    }

    // Send file
    res.download(pdfPath, 'filled_form.pdf', async (err) => {
      if (err) {
        console.error('Download Error:', err);
      }

      // Clean up files after download
      try {
        await fs.unlink(pdfPath);
        if (session.originalFilePath) {
          await fs.unlink(session.originalFilePath);
        }
        sessionStore.deleteSession(sessionId);
      } catch (cleanupError) {
        console.error('Cleanup Error:', cleanupError);
      }
    });
  } catch (error) {
    console.error('Export PDF Error:', error);
    res.status(500).json({
      error: 'Failed to export PDF',
      message: error.message
    });
  }
});

/**
 * DELETE /api/session/:sessionId
 * Delete session and clean up files
 */
router.delete('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = sessionStore.getSession(sessionId);
    if (session && session.originalFilePath) {
      try {
        await fs.unlink(session.originalFilePath);
      } catch (error) {
        console.error('Failed to delete file:', error);
      }
    }

    sessionStore.deleteSession(sessionId);

    res.json({ success: true, message: 'Session deleted' });
  } catch (error) {
    console.error('Delete Session Error:', error);
    res.status(500).json({
      error: 'Failed to delete session',
      message: error.message
    });
  }
});

export default router;
