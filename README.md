# Ask LLMs: Ethical Reasoning Analysis Across Large Language Models

This project investigates how different LLMs reason ethically when responding to social, political, and moral questions.  

## Overview

**Ask LLMs Web App** compares the ethical alignment of LLMs by analysing their responses across multiple moral frameworks  
The project uses OpenRouter to access multiple AI models, gathers responses in parallel, and visualises the results on an interactive dashboard.

### Key Features
- **Web Application:** Built using **HTML**, **Tailwind CSS**, and **Chart.js** (frontend) with a **Node.js + Express** backend.
- **LLMs Tested:** GPT-4o-mini, Claude 3.5 Sonnet, Grok 4 Fast, Llama 3.1-70B, Cohere R+, Z.AI, Qwen 2.5, DeepSeek Chat, Baidu ERNIE 4.5, and Moonshot Kimi K2.
- **Analysis:** Each model’s response is evaluated using GPT-4o-mini for moral scoring across ethical dimensions.
- **Visualisation:** Displays per-model comparisons using bar charts 

---

## How to Run

### 1. Clone the Repository

git clone https://github.com/Jaimedacruz/Investigation.git

### 2. Install Dependencies
npm install

### 3. Add Environment Variables
Create a .env file inside the /backend directory and add your OpenRouter API key:
OPENROUTER_API_KEY=your_openrouter_api_key_here

### 3. Run Backend
cd backend
npm run dev

### 4. Run Frontend
Open a new terminal window/tab, navigate to the project root, and run:
npx http-server frontend -p 5501 -c-1

# 5. Open Web App
Access the web application at: http://127.0.0.1:5501

### Project Structure
Investigation/
├── backend/
│   ├── server.js
│   ├── package.json
│   └── .env
├── frontend/
│   ├── index.html
│   └── app.js
└── README.md

