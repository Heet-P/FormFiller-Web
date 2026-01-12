/**
 * AI Service
 * Handles interaction with NVIDIA NIMs API
 * Manages conversation flow and question generation
 */

import dotenv from 'dotenv';
dotenv.config();

const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;
const NVIDIA_API_URL = process.env.NVIDIA_API_URL || 'https://integrate.api.nvidia.com/v1/chat/completions';
const AI_MODEL = process.env.AI_MODEL || 'mistralai/mistral-large-3-675b-instruct-2512';

/**
 * System prompt for the AI assistant
 */
const SYSTEM_PROMPT = `You are an AI form-filling assistant.

Rules:
1. Ask only ONE question at a time.
2. Only ask about extracted form fields.
3. Never guess values.
4. Validate user input.
5. If invalid, re-ask politely.
6. Explain each field simply.
7. Output STRICT JSON only.
8. Do not move to next field until valid.
9. Never hallucinate.

When asking a question, respond with JSON in this exact format:
{
  "question": "Your question here",
  "fieldId": "field_X",
  "fieldLabel": "Field Label",
  "fieldType": "type",
  "isComplete": false
}

When all fields are filled, respond with:
{
  "question": "All fields have been filled! You can now export your form.",
  "isComplete": true
}

Be conversational, friendly, and helpful. Explain why each field is needed if it's not obvious.`;

/**
 * Call NVIDIA NIMs API
 * @param {Array} messages - Conversation messages
 * @returns {Promise<object>} API response
 */
async function callNvidiaAPI(messages) {
  try {
    const response = await fetch(NVIDIA_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${NVIDIA_API_KEY}`
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: messages,
        temperature: 0.7,
        max_tokens: 500,
        top_p: 0.9
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('NVIDIA API Error:', errorText);
      throw new Error(`NVIDIA API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('AI Service Error:', error);
    throw error;
  }
}

/**
 * Generate next question for form filling
 * @param {object} session - Current session data
 * @param {string|null} userMessage - User's response (null for first question)
 * @returns {Promise<object>} AI response with next question
 */
export async function generateNextQuestion(session, userMessage = null) {
  try {
    const { formSchema, filledFields, currentFieldIndex, conversationHistory } = session;
    const fields = formSchema.fields;

    // Build context about the form
    let formContext = `Form has ${fields.length} fields:\n`;
    fields.forEach((field, index) => {
      const status = filledFields[field.id] ? '✓ Filled' : '○ Empty';
      formContext += `${index + 1}. ${field.label} (${field.type}) ${field.required ? '[Required]' : '[Optional]'} - ${status}\n`;
    });

    // Build messages for API
    const messages = [
      {
        role: 'system',
        content: SYSTEM_PROMPT
      },
      {
        role: 'system',
        content: formContext
      }
    ];

    // Add conversation history
    conversationHistory.forEach(msg => {
      messages.push({
        role: msg.role,
        content: msg.content
      });
    });

    // Add user message if provided
    if (userMessage) {
      messages.push({
        role: 'user',
        content: userMessage
      });
    } else {
      // First question - ask AI to start
      messages.push({
        role: 'user',
        content: 'Please ask me the first question to fill out this form.'
      });
    }

    // Call NVIDIA API
    const response = await callNvidiaAPI(messages);
    
    // Extract AI response
    const aiMessage = response.choices[0].message.content;

    // Try to parse as JSON
    let parsedResponse;
    try {
      // Extract JSON from response (AI might wrap it in markdown code blocks)
      const jsonMatch = aiMessage.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback: create structured response from text
        parsedResponse = {
          question: aiMessage,
          fieldId: fields[currentFieldIndex]?.id || null,
          fieldLabel: fields[currentFieldIndex]?.label || null,
          fieldType: fields[currentFieldIndex]?.type || 'text',
          isComplete: currentFieldIndex >= fields.length
        };
      }
    } catch (parseError) {
      console.warn('Failed to parse AI response as JSON, using fallback');
      parsedResponse = {
        question: aiMessage,
        fieldId: fields[currentFieldIndex]?.id || null,
        fieldLabel: fields[currentFieldIndex]?.label || null,
        fieldType: fields[currentFieldIndex]?.type || 'text',
        isComplete: currentFieldIndex >= fields.length
      };
    }

    return parsedResponse;
  } catch (error) {
    console.error('Generate Question Error:', error);
    
    // Fallback response in case of API failure
    const { formSchema, currentFieldIndex } = session;
    const fields = formSchema.fields;
    
    if (currentFieldIndex < fields.length) {
      const currentField = fields[currentFieldIndex];
      return {
        question: `Please provide your ${currentField.label}.`,
        fieldId: currentField.id,
        fieldLabel: currentField.label,
        fieldType: currentField.type,
        isComplete: false,
        error: 'Using fallback due to AI service error'
      };
    } else {
      return {
        question: 'All fields have been filled! You can now export your form.',
        isComplete: true
      };
    }
  }
}

/**
 * Validate if NVIDIA API key is configured
 * @returns {boolean} True if API key is set
 */
export function isAPIConfigured() {
  return !!NVIDIA_API_KEY && NVIDIA_API_KEY !== 'your_nvidia_nims_api_key_here';
}
