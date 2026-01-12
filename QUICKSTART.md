# Intelligent Form Filler - Quick Start Guide

## 🚀 Quick Start (5 minutes)

### Step 1: Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend (in new terminal)
cd frontend
npm install
```

### Step 2: Configure Environment

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` and add your NVIDIA API key:

```env
NVIDIA_API_KEY=your_actual_api_key_here
```

**Get API Key:** https://build.nvidia.com/

### Step 3: Run Application

**Terminal 1 - Backend:**

```bash
cd backend
npm start
```

**Terminal 2 - Frontend:**

```bash
cd frontend
npm run dev
```

### Step 4: Open Browser

Navigate to: `http://localhost:5173`

## 📝 Example Request/Response

### Upload Form

**Request:**

```bash
curl -X POST http://localhost:5000/api/upload-form \
  -F "form=@sample_form.pdf"
```

**Response:**

```json
{
  "success": true,
  "sessionId": "abc-123-def",
  "formSchema": {
    "fields": [
      {
        "id": "field_1",
        "label": "Full Name",
        "type": "name",
        "required": true
      }
    ]
  },
  "firstQuestion": {
    "question": "Please provide your full name.",
    "fieldId": "field_1"
  }
}
```

### Send Chat Message

**Request:**

```bash
curl -X POST http://localhost:5000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "abc-123-def",
    "message": "John Doe"
  }'
```

**Response:**

```json
{
  "question": "Great! What is your email address?",
  "fieldId": "field_2",
  "fieldLabel": "Email Address",
  "fieldType": "email",
  "isComplete": false
}
```

### Export PDF

**Request:**

```bash
curl -X POST http://localhost:5000/api/export-pdf \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "abc-123-def"}' \
  --output filled_form.pdf
```

## 🎯 Test Flow

1. Create a simple form with fields:

   ```
   Name: ___________
   Email: ___________
   Phone: ___________
   ```

2. Save as PNG or PDF

3. Upload to application

4. Answer AI questions:

   - "John Doe"
   - "john@example.com"
   - "555-1234"

5. Export filled PDF

## 🔧 Common Issues

**Port already in use:**

```bash
# Change PORT in backend/.env
PORT=5001
```

**NVIDIA API error:**

- Verify API key is correct
- Check internet connection
- Ensure you have API credits

**OCR not working:**

- Use clear, high-resolution images
- Ensure text is in English
- Try PDF instead of image

## 📚 Next Steps

- Read full [README.md](./README.md)
- Review API documentation
- Customize field types
- Deploy to production

---

**Need Help?** Check the troubleshooting section in README.md
