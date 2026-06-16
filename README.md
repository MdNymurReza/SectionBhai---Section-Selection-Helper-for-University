<div align="center">
  <img src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" alt="SectionBhai Banner" width="800" />

  <h1>🎓 SectionBhai</h1>
  <p><strong>The Ultimate University Routine Optimization & Scheduling Platform</strong></p>

  <p>
    <a href="#features">Features</a> •
    <a href="#tech-stack">Tech Stack</a> •
    <a href="#getting-started">Getting Started</a> •
    <a href="#developer">Developer</a>
  </p>
</div>

---

## 📖 Overview

**SectionBhai** is an intelligent academic scheduling system designed to solve the chaotic university course registration process. It allows students to generate conflict-free schedules, evaluate faculty ratings, manage their academic credits, and even track their personalized exam schedules. 

By leveraging a powerful internal constraint satisfaction engine, SectionBhai processes PDF routine dumps, extracts faculty details, and automatically matches students with the best possible academic schedules in milliseconds!

---

## ✨ Key Features

### 🎓 Student Portal
- **Automated Routine Generator:** Upload your desired courses, set preferences, and generate a 100% conflict-free timeline instantly.
- **Credit & Exam Tracker:** Keep track of total trimester credits and auto-generate personalized midterm/final exam schedules.
- **Faculty Reviews:** Rate and read reviews for course faculty to make informed registration choices.
- **Social Sharing:** Generate unique shareable links for your optimized schedule to show your friends.

### 👑 Admin Hub
- **AI PDF Ingestion:** Upload the university's raw PDF schedule. SectionBhai parses, formats, and seeds the entire database automatically.
- **Communication & Announcements:** Broadcast critical notices directly to the student dashboard.
- **Exam Master Schedule:** Define and manage midterm/final dates centrally to sync with student portals.
- **Analytics Dashboard:** Visualize real-time course ingestion metrics and system utilization.

---

## 🛠 Tech Stack

- **Frontend:** React, TypeScript, Tailwind CSS, Lucide Icons, Vite
- **Backend:** Node.js, Express, Firebase Firestore
- **AI & Automation:** Google Gemini AI (for PDF unstructured data extraction)
- **Deployment Structure:** Unified Full-Stack Node Environment

---

## 🚀 Getting Started

Follow these instructions to run the SectionBhai application on your local machine.

### Prerequisites
- Node.js (v18+)
- Firebase Project configured (or running locally)
- Gemini API Key (for PDF extraction)

### Installation

1. **Clone the repository and install dependencies:**
   ```bash
   npm install
   ```

2. **Configure your Environment Variables:**
   Create a `.env` file in the root directory and add your API keys:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   PORT=3000
   ```

3. **Start the Development Server:**
   ```bash
   npm run dev
   ```

4. **Access the Application:**
   Open your browser and navigate to `http://localhost:5173/`

---

## 👨‍💻 Developer

**Developed by:** NYMUR REZA  
**University:** United International University, Dhaka, Bangladesh  
**Contact:** [dev.nymurreza@gmail.com](mailto:dev.nymurreza@gmail.com)

---

<div align="center">
  <p><i>"PDF Dao, Routine Nao."</i></p>
</div>
