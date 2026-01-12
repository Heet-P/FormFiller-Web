# Intelligent Form Filler - AI Assistant for Bureaucratic Forms

A production-ready web application that uses AI to intelligently fill bureaucratic forms through conversational interaction. Upload a form image or PDF, answer AI-generated questions, and export a filled PDF.

![Tech Stack](https://img.shields.io/badge/React-18.2-blue)
![Node.js](https://img.shields.io/badge/Node.js-Express-green)
![Tailwind](https://img.shields.io/badge/Tailwind-CSS-cyan)
![NVIDIA](https://img.shields.io/badge/NVIDIA-NIMs-brightgreen)

## 🚀 Features

- **📄 Multi-Format Support**: Upload forms as PNG, JPEG, or PDF
- **🔍 OCR Processing**: Automatic text extraction using Tesseract.js
- **🤖 AI-Powered Chat**: Conversational form filling with NVIDIA NIMs API
- **✅ Smart Validation**: Field-specific validation (email, phone, date, etc.)
- **📊 Real-time Preview**: Live form preview with progress tracking
- **📥 PDF Export**: Generate filled PDF with overlaid data
- **🎨 Premium UI**: Modern glassmorphism design with animations
- **🔒 Secure**: File cleanup after session, environment-based configuration

## 📁 Project Structure

```
FormFiller/
├── backend/
│   ├── routes/
│   │   └── formRoutes.js          # API endpoints
│   ├── services/
│   │   ├── ocrService.js          # OCR & field detection
│   │   ├── aiService.js           # NVIDIA NIMs integration
│   │   └── pdfService.js          # PDF generation
│   ├── utils/
│   │   └── sessionStore.js        # Session management
│   ├── server.js                  # Express server
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── FileUpload.jsx     # File upload UI
│   │   │   ├── ChatInterface.jsx  # Chat UI
│   │   │   └── FormPreview.jsx    # Form preview
│   │   ├── services/
│   │   │   └── api.js             # API client
│   │   ├── App.jsx                # Main component
│   │   ├── main.jsx               # Entry point
│   │   └── index.css              # Tailwind styles
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
├── uploads/                        # Temporary file storage
└── README.md
```

## 🛠️ Tech Stack

### Backend

- **Node.js** + **Express** - Server framework
- **Tesseract.js** - OCR text extraction
- **pdf-lib** - PDF manipulation
- **NVIDIA NIMs API** - AI conversation (Mistral Large 3)
- **Multer** - File upload handling

### Frontend

- **React 18** - UI framework
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **Axios** - HTTP client
- **React Icons** - Icon library

## 📋 Prerequisites

- Node.js 18+ and npm
- NVIDIA NIMs API key ([Get one here](https://build.nvidia.com/))

## ⚙️ Installation

### 1. Clone the repository

```bash
cd FormFiller
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create `.env` file from template:

```bash
cp .env.example .env
```

Edit `.env` and add your NVIDIA API key:

```env
PORT=5000
NODE_ENV=development

# NVIDIA NIMs API Configuration
NVIDIA_API_KEY=your_actual_nvidia_api_key_here
NVIDIA_API_URL=https://integrate.api.nvidia.com/v1/chat/completions
AI_MODEL=mistralai/mistral-large-3-675b-instruct-2512

# CORS Configuration
FRONTEND_URL=http://localhost:5173

# File Upload Configuration
MAX_FILE_SIZE=10485760
UPLOAD_DIR=../uploads
```

### 3. Frontend Setup

```bash
cd ../frontend
npm install
```

## 🚀 Running Locally

### Start Backend Server

```bash
cd backend
npm start
```

Server will run on `http://localhost:5000`

### Start Frontend Development Server

```bash
cd frontend
npm run dev
```

Frontend will run on `http://localhost:5173`

## 📡 API Documentation

### Base URL

```
http://localhost:5000/api
```

### Endpoints

#### 1. Upload Form

**POST** `/upload-form`

Upload and process a form file.

**Request:**

- Content-Type: `multipart/form-data`
- Body: `form` (file) - PNG, JPEG, or PDF

**Response:**

```json
{
  "success": true,
  "sessionId": "uuid-v4",
  "formSchema": {
    "extractedText": "...",
    "fields": [
      {
        "id": "field_1",
        "label": "Full Name",
        "type": "name",
        "required": true,
        "value": null
      }
    ],
    "totalFields": 5
  },
  "firstQuestion": {
    "question": "Please provide your full name.",
    "fieldId": "field_1",
    "fieldLabel": "Full Name",
    "fieldType": "name",
    "isComplete": false
  }
}
```

#### 2. Send Chat Message

**POST** `/chat`

Send user response to AI.

**Request:**

```json
{
  "sessionId": "uuid-v4",
  "message": "John Doe"
}
```

**Response:**

```json
{
  "question": "Great! Now, what is your email address?",
  "fieldId": "field_2",
  "fieldLabel": "Email Address",
  "fieldType": "email",
  "isComplete": false
}
```

**Validation Error Response:**

```json
{
  "question": "Please provide a valid email address. Please try again: Email Address",
  "fieldId": "field_2",
  "fieldLabel": "Email Address",
  "fieldType": "email",
  "isComplete": false,
  "validationError": true
}
```

#### 3. Get Form State

**GET** `/form-state/:sessionId`

Get current form state.

**Response:**

```json
{
  "sessionId": "uuid-v4",
  "formSchema": { ... },
  "filledFields": {
    "field_1": "John Doe",
    "field_2": "john@example.com"
  },
  "currentFieldIndex": 2,
  "isComplete": false,
  "progress": {
    "total": 5,
    "filled": 2
  }
}
```

#### 4. Export PDF

**POST** `/export-pdf`

Generate and download filled PDF.

**Request:**

```json
{
  "sessionId": "uuid-v4"
}
```

**Response:**

- Content-Type: `application/pdf`
- File download: `filled_form.pdf`

#### 5. Delete Session

**DELETE** `/session/:sessionId`

Clean up session and files.

**Response:**

```json
{
  "success": true,
  "message": "Session deleted"
}
```

## 🎯 Usage Flow

1. **Upload Form**: User uploads a form image or PDF
2. **OCR Processing**: Backend extracts text and detects fields
3. **AI Chat Starts**: AI asks first question
4. **User Responds**: User answers in chat
5. **Validation**: Backend validates input based on field type
6. **Repeat**: Continue until all fields filled
7. **Export**: User downloads filled PDF

## 🔒 Security Features

- File type validation (PNG, JPEG, PDF only)
- File size limit (10MB max)
- Automatic file cleanup after session
- Session timeout (1 hour)
- CORS configuration
- Environment-based secrets

## 🎨 UI Features

- **Glassmorphism Design**: Modern frosted glass effect
- **Gradient Animations**: Smooth color transitions
- **Responsive Layout**: Works on desktop and mobile
- **Loading States**: Visual feedback for all actions
- **Error Handling**: User-friendly error messages
- **Progress Tracking**: Real-time form completion status

## 🧪 Testing

### Test with Sample Form

1. Create a simple form in any image editor or Word
2. Add fields like:
   - Full Name: ****\_\_\_****
   - Email: ****\_\_\_****
   - Phone: ****\_\_\_****
   - Date: ****\_\_\_****
3. Save as PNG or PDF
4. Upload to the application
5. Follow AI prompts to fill the form

## 🐛 Troubleshooting

### Backend won't start

- Check if port 5000 is available
- Verify `.env` file exists with NVIDIA API key
- Run `npm install` in backend directory

### Frontend won't start

- Check if port 5173 is available
- Run `npm install` in frontend directory
- Clear browser cache

### OCR not detecting fields

- Ensure form has clear text
- Try higher resolution image
- Check if text is in English
- Verify file is not corrupted

### AI not responding

- Verify NVIDIA API key is valid
- Check internet connection
- Review backend logs for errors

## 📝 Environment Variables

### Backend (.env)

| Variable         | Description              | Default                                                |
| ---------------- | ------------------------ | ------------------------------------------------------ |
| `PORT`           | Server port              | `5000`                                                 |
| `NODE_ENV`       | Environment              | `development`                                          |
| `NVIDIA_API_KEY` | NVIDIA NIMs API key      | Required                                               |
| `NVIDIA_API_URL` | NVIDIA API endpoint      | `https://integrate.api.nvidia.com/v1/chat/completions` |
| `AI_MODEL`       | AI model name            | `mistralai/mistral-large-3-675b-instruct-2512`         |
| `FRONTEND_URL`   | Frontend URL for CORS    | `http://localhost:5173`                                |
| `MAX_FILE_SIZE`  | Max upload size in bytes | `10485760` (10MB)                                      |
| `UPLOAD_DIR`     | Upload directory         | `../uploads`                                           |

## 🚀 Production Deployment

### Backend

1. Set `NODE_ENV=production`
2. Use process manager (PM2, systemd)
3. Configure reverse proxy (nginx)
4. Enable HTTPS
5. Use Redis for session storage (replace in-memory store)

### Frontend

```bash
cd frontend
npm run build
```

Serve `dist/` directory with nginx or similar.

## 🤝 Contributing

This is a production-ready template. Feel free to:

- Add more field types
- Improve OCR accuracy
- Add multi-language support
- Implement user authentication
- Add form templates

## 📄 License

MIT License - feel free to use for personal or commercial projects.

## 🙏 Acknowledgments

- **NVIDIA NIMs** for AI capabilities
- **Tesseract.js** for OCR
- **pdf-lib** for PDF manipulation
- **Tailwind CSS** for styling

## 📞 Support

For issues or questions:

1. Check troubleshooting section
2. Review API documentation
3. Check backend logs
4. Verify environment variables

---

**Built with ❤️ using React, Node.js, and NVIDIA NIMs API**
