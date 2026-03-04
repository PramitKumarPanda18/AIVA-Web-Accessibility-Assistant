# 📋 Project Requirements

This document lists everything you need to run AIVA (Web Accessibility Assistant) successfully.

## 🛠️ Software Prerequisites
*   **OS**: Windows, macOS, or Linux.
*   **Node.js**: Version 16.0 or higher (for the React frontend).
*   **Python**: Version 3.13 or higher (for the FastAPI backend).
*   **Browser**: Modern Chrome, Edge, or Safari (required for **Web Speech API** support).

## 📦 Key Dependencies
### Frontend
*   **React**: UI Library.
*   **Cloudscape Design System**: For the premium AWS-style interface.
*   **Web Speech API**: (Native browser API) No install needed.

### Backend
*   **FastAPI**: High-performance web framework.
*   **SQLAlchemy**: Database management (SQLite by default).
*   **Uvicorn**: ASGI server.
*   **Pydantic**: Data validation.

## 🔑 Environment Variables
You must create `.env` files in both folders.

### `frontend/.env`
```env
REACT_APP_API_URL=http://localhost:8000
REACT_APP_WS_URL=ws://localhost:8000/ws
```

### `backend/.env`
```env
ALLOWED_ORIGINS=http://localhost:3000
DATABASE_URL=sqlite:///./order_automation.db
```

## 🎙️ Hardware Requirements
*   **Microphone**: A functional microphone is required for the Voice Assistant features.
*   **Internet Connection**: Required for looking up products on Amazon, Walmart, etc.
