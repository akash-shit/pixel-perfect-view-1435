🛡️ ScamShield

Technology for Social Good — Helping Elderly Users Identify and Respond to Scams

ScamShield is a multilingual scam-safety assistant designed to help elderly and less-tech-savvy users identify suspicious messages, links, and scam attempts.

Instead of simply labeling something as a “scam”, ScamShield explains why the content is suspicious, provides clear safety instructions, and allows users to involve trusted family members when necessary.

⸻

🎯 Problem

Scams targeting elderly users are becoming increasingly sophisticated.

Common examples include:

* Fake KYC/account verification messages
* UPI and payment scams
* Lottery and prize scams
* Fake delivery messages
* Job and investment scams
* Remote-access scams
* Phishing links
* Impersonation messages
* Urgent account-blocking warnings

Many elderly users find it difficult to determine whether a message or link is genuine.

ScamShield aims to make this process simple:

Detect → Explain → Protect → Educate

⸻

✨ Key Features

🔍 Scam Detection

Analyze suspicious content and identify common scam indicators such as:

* Urgency
* Payment requests
* Requests for sensitive information
* Suspicious links
* Threatening language
* Lottery/prize claims
* Fake job offers
* Remote-access requests

The system produces an explainable risk assessment instead of relying on an unexplained prediction.

⸻

🧠 Explainable Risk Analysis

Each analysis provides:

* Risk score
* Risk level
* Detected warning signs
* Explanation of suspicious patterns
* Recommended safety actions
* Matched scam signals

Example:

🚨 HIGH RISK
Why is this suspicious?
• Urgent action requested
• Payment requested
• Sensitive information requested
• Suspicious link detected
What should you do?
• Do not send money
• Do not share OTP/PIN/passwords
• Verify through an official channel
• Contact a trusted person

⸻

👨‍👩‍👦 Trusted Contacts

Users can maintain a list of trusted family members or contacts.

Trusted contacts can be used as an additional safety layer when the user encounters a potentially dangerous situation.

Each user’s contacts are isolated using authenticated user ownership.

⸻

📊 Scam History

Users can review their previous scam checks and understand:

* What they checked
* Risk level
* Detected scam indicators
* Analysis results
* Previous safety recommendations

⸻

📈 Insights

The Insights dashboard provides an overview of the user’s scam-checking activity, including:

* Number of checks
* Risk distribution
* Common scam categories
* Recent activity
* Safety trends

⸻

🚨 Emergency Assistance

A dedicated emergency/safety flow helps users understand what to do if they believe they have already interacted with a scam.

The interface focuses on simple, actionable instructions rather than technical terminology.

⸻

📚 Scam Education

The Learn section provides easy-to-understand information about common scams, including:

* KYC scams
* UPI scams
* Lottery scams
* Delivery scams
* Job scams
* Deepfake-related scams
* Other common social-engineering techniques

⸻

🎯 Scam Awareness Quiz

Users can test their ability to identify scam situations through realistic examples.

The quiz helps users learn the warning signs behind suspicious messages rather than simply memorizing answers.

⸻

🌐 Multilingual Interface

ScamShield supports multiple languages to make the application easier to use for a wider range of users.

The selected language is preserved across navigation and application sessions.

⸻

👴 Elder-Friendly Design

The interface is designed with accessibility and simplicity in mind:

* Large and readable typography
* Clear navigation
* High-contrast options
* Simple language
* Prominent safety actions
* Minimal technical terminology
* Straightforward risk indicators

⸻

🏗️ Architecture

The project uses a separate frontend and backend architecture.
```
ScamShield
│
├── frontend/
│   ├── React
│   ├── TypeScript
│   ├── Vite
│   ├── Tailwind CSS
│   └── API Services
│
└── backend/
    ├── Node.js
    ├── Express.js
    ├── MongoDB
    ├── Mongoose
    ├── JWT Authentication
    └── Scam Detection Engine
```
Request Flow

                    User
                     │
                     ▼
              React Frontend
                     │
                     ▼
              Express API
                     │
          ┌──────────┴──────────┐
          │                     │
          ▼                     ▼
   Authentication          Scam Analysis
          │                     │
          ▼                     ▼
       MongoDB             Rule Engine
                                │
                                ▼
                         Risk Assessment
                                │
                                ▼
                         Explanation +
                       Safety Actions

⸻

🛠️ Technology Stack

Frontend

* React
* TypeScript
* Vite
* Tailwind CSS
* TanStack Router
* React Query

Backend

* Node.js
* Express.js
* Mongoose
* JWT
* bcrypt
* Helmet
* CORS
* Cookie-based authentication

Database

* MongoDB Atlas

⸻

🔐 Authentication & Security

ScamShield uses secure authentication mechanisms including:

* JWT-based authentication
* HTTP-only authentication cookies
* Password hashing using bcrypt
* Protected API routes
* User-specific data isolation
* CORS restrictions
* Helmet security headers
* Request validation
* Rate limiting

Sensitive user information is not exposed unnecessarily in scam-analysis history.

⸻

🧩 Backend API

Health Check

GET /api/health

Authentication

POST /api/auth/register
POST /api/auth/login
GET  /api/auth/me
POST /api/auth/logout

Trusted Contacts

GET    /api/contacts
POST   /api/contacts
PUT    /api/contacts/:id
DELETE /api/contacts/:id

Scam Analysis

POST /api/scam/analyze
GET  /api/scam/history

⸻

📊 Risk Classification

ScamShield uses an explainable scoring system.

Score	Risk Level
0–29	Low
30–59	Suspicious
60–79	High
80–100	Very High

The score represents the application’s risk assessment, not a statistical probability that a message is fraudulent.

⸻

🚀 Getting Started

Prerequisites

Make sure you have installed:

* Node.js
* npm
* MongoDB Atlas account
* Git

⸻

📥 Clone the Repository

git clone https://github.com/akash-shit/pixel-perfect-view-1435.git
cd pixel-perfect-view-1435

⸻

🖥️ Frontend Setup

cd frontend
npm install

Create:

frontend/.env

Add:

VITE_API_BASE_URL=http://localhost:5001/api

Start the development server:

npm run dev

The frontend will normally be available at:

http://localhost:5173

If that port is already occupied, Vite may automatically select another available port.

⸻

⚙️ Backend Setup

Open another terminal:

cd backend
npm install

Create:

backend/.env

Example:

PORT=5001
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_secure_jwt_secret
CLIENT_URL=http://localhost:5173
NODE_ENV=development

Start the backend:

npm run dev

The API will run on:

http://localhost:5001

Check the backend:

http://localhost:5001/api/health

Expected response:

{
  "success": true,
  "message": "Backend is running"
}

⸻

📁 Project Structure
```
pixel-perfect-view-1435/
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── contexts/
│   │   ├── hooks/
│   │   └── ...
│   ├── package.json
│   └── vite.config.ts
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── services/
│   │   └── ...
│   ├── package.json
│   └── .env
│
├── .gitignore
└── README.md
```
⸻

🔒 Environment Variables

Never commit .env files containing credentials.

Example:

MONGODB_URI=...
JWT_SECRET=...

Use .env.example files to document required variables without exposing secrets.

⸻

🧪 Testing

Before submitting or deploying the project, verify:

Frontend

cd frontend
npm run build

Backend

cd backend
npm test

Also verify:

* Registration
* Login/logout
* Authentication persistence
* Trusted contacts
* Scam analysis
* Scam history
* Language switching
* Insights
* Settings
* Emergency flow
* Quiz
* Responsive design

⸻

🌍 Future Improvements

Possible future enhancements include:

* Screenshot-based scam detection using OCR
* URL reputation and phishing checks
* Voice/call transcription and analysis
* AI-assisted scam explanation
* Real-time scam alerts
* Family/guardian dashboard
* Automatic trusted-contact notifications
* Browser/mobile integration
* More regional languages
* Personalized scam-awareness training
* Integration with verified fraud-reporting resources

⸻

🎯 Project Vision

ScamShield is built around a simple principle:

Technology should protect people without making them feel overwhelmed by technology.

The goal is not only to detect suspicious content, but to help users understand the warning signs and make safer decisions.

⸻

👨‍💻 Development

Built as a technology-for-social-good project focused on improving digital safety and scam awareness for elderly users.

Core Concept

                 SCAMSHIELD
                     │
        ┌────────────┼────────────┐
        ▼            ▼            ▼
      Detect       Explain      Educate
        │            │            │
        └────────────┼────────────┘
                     ▼
                  Protect

⸻

📄 License

This project is intended for educational, demonstration, and social-good purposes.
