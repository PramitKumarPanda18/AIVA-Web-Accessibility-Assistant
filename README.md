# 🤖 AIVA - Web Accessibility Assistant

**AIVA (AI-powered Voice Assistant)** is a high-performance, AI-driven e-commerce automation tool designed to make online shopping as easy as talking. It features a stunning premium dark-mode interface and a state-of-the-art Voice Assistant.

---

## ✨ New in this Version: Improved Voice Agent
*   **🧠 Persistent Context**: The Voice Assistant now remembers your full conversation. It won't forget your product if you suddenly change the quantity.
*   **🌐 Live Preview**: Automatically opens a new browser tab with the retailer's website as soon as you confirm an order.
*   **🛒 Amazon Grocery Support**: Dedicated support for Amazon Fresh/Grocery shopping.
*   **🎙️ 100% Free Voice Logic**: Uses your browser's native **Web Speech API**. No expensive AWS credits required for speech recognition!
*   **💎 Premium Aesthetics**: Overhauled dashboard with deep-dark gradients and glassmorphism UI.

---

## 🚀 Quick Start

### 1. Backend Setup
```bash
cd backend
# Recommended: Use uv for fastest setup
uv sync
uv run app.py
```
*The backend runs on `http://localhost:8000`*

### 2. Frontend Setup
```bash
cd frontend
npm install
npm start
```
*The frontend runs on `http://localhost:3000`*

---

## 🎧 Using the Voice Assistant
1. Ensure your browser (Chrome/Edge recommended) has microphone permissions.
2. Click the **Microphone Icon** on the dashboard.
3. State your product: *"I want to buy Airpods"*.
4. State quantity: *"5"*.
5. State store: *"Amazon Grocery"*.
6. Say **"Yes"** to confirm. The assistant will open the store tab and sync the data to your dashboard!

---

## 📂 Project Structure
- **/frontend**: React application with Cloudscape UI.
- **/backend**: FastAPI server for order management and queueing.
- **walkthrough.md**: Detailed step-by-step setup guide.
- **requirements.md**: Technical prerequisites.

---

## 📜 License
Apache-2.0
