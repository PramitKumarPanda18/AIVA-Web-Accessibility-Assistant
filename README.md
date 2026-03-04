# 🧬 AIVA: AI-Integrated Voice Assistant
### *Bridging the Accessibility Gap in Global E-Commerce*

**AIVA** (AI-Integrated Voice Assistant) is a next-generation shopping platform designed to empower elderly users and individuals with disabilities. It transforms the often-frustrating experience of online shopping into a natural, empathetic, and fully voice-driven conversation.

---

## 🌟 Why AIVA is Unique?
AIVA isn't just another voice tool; it’s an **Inclusive Ecosystem** built on four revolutionary pillars:

1.  **🎭 Proactive Emotional Empathy:** 
    Using the **Web Audio API**, AIVA analyzes the user's vocal frequencies in real-time. If it detects frustration, stress, or confusion, it automatically simplifies the interface and relaxes its tone to guide the user.
2.  **📊 Retailer Accessibility Scoreboard (World First!):** 
    Not all shops are built equal. AIVA maintains a live ranking of major retailers (Amazon, Target, Walmart) based on their "AI-Readability," directing users toward platforms that respect their accessibility needs.
3.  **🌍 Translation-First Architecture:** 
    Elderly users often prefer their mother tongue. Our **Live Translation Layer** allows users to speak in Hindi, Spanish, or French, while AIVA handles the complex English-based ordering backend seamlessly.
4.  **🧤 Multi-Sensory Feedback:** 
    Designed for the hearing and visually impaired, featuring a **"Haptic Halo"** (visual sound indicator) and **Dynamic Focal Zoom** (automatically magnifying sections of the page as the user speaks about them).

---

## 🛠️ How it Works
AIVA acts as a sophisticated bridge between the user and the chaotic world of the web:
1.  **Voice Input:** Captured via the Web Speech API and analyzed for emotional sentiment.
2.  **Intelligent Processing:** Non-English speech is translated on-the-fly via **Amazon Nova**.
3.  **Reasoning:** The requested action is parsed by **Anthropic Claude 3.5** (via Amazon Bedrock) into structured automation steps.
4.  **Task Execution:** AIVA's headless browser engine executes the clicks and navigation on real retailer websites, shielding the user from complex UI.

---

## ☁️ Powered by AWS Technology
AIVA leverages the cutting-edge power of **Amazon Bedrock** to deliver a "Production-Ready" feel:
-   **Amazon Nova (Lite/Pro):** Powers our high-speed Multilingual Translation and real-time reasoning.
-   **Anthropic Claude 3.5 Sonnet:** The "Brain" that handles complex shopping logic and decision-making.
-   **AWS Bedrock API:** Provides a unified, secure, and scalable interface for all our Generative AI needs.
-   **AWS Infrastructure:** Designed for the cloud, ready to be deployed via Render/Vercel with full environment isolation.

---

## 🚀 Getting Started
### Prerequisites
- Node.js & NPM
- Python 3.10+
- AWS Credentials (for Bedrock access)

### Installation
1.  **Frontend:**
    ```bash
    cd frontend
    npm install
    npm run dev
    ```
2.  **Backend:**
    ```bash
    cd backend
    pip install -r requirements.txt
    uvicorn app:app --reload
    ```

---

## 🏆 Hackathon Entry
Developed for the **AI Bharat Hackathon**, AIVA represents a commitment to digital inclusion—ensuring that the AI revolution leaves no one behind, regardless of physical ability, age, or language.

**Built with ❤️ for the global accessibility community.**
