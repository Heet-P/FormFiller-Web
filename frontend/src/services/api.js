/**
 * API Service
 * Handles all backend API calls
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

/**
 * Upload form file
 * @param {File} file - Form file (image or PDF)
 * @returns {Promise} API response
 */
export const uploadForm = async (file) => {
  const formData = new FormData();
  formData.append('form', file);

  return api.post('/upload-form', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
};

/**
 * Send chat message
 * @param {string} sessionId - Session ID
 * @param {string} message - User message
 * @returns {Promise} API response
 */
export const sendMessage = async (sessionId, message) => {
  return api.post('/chat', {
    sessionId,
    message
  });
};

/**
 * Get form state
 * @param {string} sessionId - Session ID
 * @returns {Promise} API response
 */
export const getFormState = async (sessionId) => {
  return api.get(`/form-state/${sessionId}`);
};

/**
 * Export filled PDF
 * @param {string} sessionId - Session ID
 * @returns {Promise} Blob response
 */
export const exportPDF = async (sessionId) => {
  return api.post('/export-pdf', 
    { sessionId },
    { responseType: 'blob' }
  );
};

/**
 * Delete session
 * @param {string} sessionId - Session ID
 * @returns {Promise} API response
 */
export const deleteSession = async (sessionId) => {
  return api.delete(`/session/${sessionId}`);
};

export default api;
