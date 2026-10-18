# EquiScore — An AI-Powered Credit Scoring & Microfinance Ecosystem

> **Track Focus:** Sustainable FinTech & Economic Inclusion (Built for Hack the Valley XI)
> **Live Site:** [amazing-project-drab.vercel.app](https://vercel.app)

Traditional banks lock out small businesses and minority groups like women. **EquiScore** fixes this! Using a unified stack of React and localized AI models, we convert alternative micro-enterprise data points into an inclusive, predictive credit wellness score, paired with an active conversational chatbot coach to ensure users build healthy financial habits and remain completely debt-free.

---

## 🎯 The Problem & Our Inspiration
Traditional credit scoring models (like FICO) operate on a structural paradox: *you need credit to get an initial loan*. This systemic bias locks out the world's "active poor"—specifically women micro-entrepreneurs in rural pockets of Africa, the Pacific, and Latin America who have:
1. **Total Exclusion:** Zero traditional brick-and-mortar credit histories.
2. **Asset Limitations:** Lack of standard physical collateral.
3. **High Entry Barriers:** Inability to meet steep minimum deposit thresholds.
4. **Tool Dependence:** A vital reliance on small capital injections to purchase basic inventory (e.g., sewing machines, agricultural tools) to drive immediate household welfare.

Inspired by pioneering models like the **Grameen Bank**—which proved that prioritizing women (who represent **68% to 90%** of microfinance borrowers) leads to near-perfect repayment rates—we built EquiScore to transition underwriting from *predictive discrimination* to *true economic mobility*.

---

## ⚙️ Core Application Functions

EquiScore breaks away from standard "black-box" risk scoring by tracking borrower metrics across a three-pronged system:

*   📊 **Alternative Underwriting Engine:** Ingests alternative financial inputs—including exact current savings, daily micro-enterprise profit velocities, localized mobile wallet cadence, and utility bill tracking.
*   📈 **Repayment Dashboard UI:** A low-friction interface allowing users to easily view their active microloans, track outstanding balances, visualize exact repayment timelines, and watch their creditworthiness grow in real-time.
*   🤖 **AI Financial Assistant:** A local conversational guide optimized to break the cycle of chronic debt. Trained on past cashflow patterns, it gives situational budgeting suggestions, logs friendly repayment timers, and issues structural warnings before cash buffers run low.

---

## 📂 Project Architecture

```text
EquiScore/ (Repository Root)
├── frontend/             # Vite + React + Tailwind CSS client dashboard
│   ├── src/              # Application components, forms, and charting views
│   └── vercel.json       # Routing configurations for deployment
├── backend/              # FastAPI Python Microservice
│   ├── app.py            # API routing maps (/api/score) and CORS policies
│   └── ml_model.py       # Scikit-Learn RandomForest & LightGBM training core
├── equiscore.db          # Structured SQLite local transaction cache database
├── requirements.txt      # Backend Python environment dependencies list
└── README.md             # Project roadmap and technical overview
```

---

## 🛠️ Tech Stack & Implementation Details

*   **Frontend Panel:** `Vite` + `React` + `Tailwind CSS` + `Vercel` (Optimized for fast rendering on mobile browsers in low-bandwidth areas)
*   **API Layer Microservice:** `Python` + `FastAPI` + `Uvicorn` + `SQLite` (Handles concurrent JSON payloads)
*   **Machine Learning Frame:** `Scikit-Learn` (`RandomForestClassifier`), `LightGBM`, `XGBoost` (Trained on tabular financial risk distributions)
*   **Local AI Execution:** `Ollama` + `PyTorch` (Powers the custom prompt boundaries of our offline financial accountability chatbot)

---

## ⚙️ Quick Start Setup Instructions

### 1. Ingest and Boot the Python Backend
Ensure you are in the root directory and activate your Python virtual environment container:
```bash
# Set up isolated workspace container
python3 -m venv .venv
source .venv/bin/activate

# Install machine learning and router libraries
pip install -r requirements.txt

# Run the Scikit-Learn training step and launch the server
python backend/app.py
```
*The local underwriting API service will bind to `http://localhost:8080`.*

### 2. Launch the Client Dashboard
Open a second terminal window to ignite your interactive user panel:
```bash
cd frontend
npm install
npm run dev
```
*The development interface will host locally at `http://localhost:5173`.*

---

## 🧠 Strategic Hackathon Retrospective

### 🛑 Challenges We Ran Into
*   **Contextualizing AI Advice Safely:** Standard large language models default to corporate advice tailored for high-income users. It was highly challenging to tune our **Ollama AI Chatbot prompt parameters** to deliver hyper-practical, empathetic, and localized micro-enterprise guidance suited for a marketplace vendor without introducing high-interest debt risk.
*   **Data Isolation Hooks:** Aligning historical tabular feature matrices within our runtime server while keeping dependencies strictly separated took highly specific modular engineering.

### 🏆 Accomplishments & Lessons Learned
*   **Architecture Over Bias:** We proved that algorithmic fairness is a conscious design choice. By intentionally stripping out demographic data points and focusing purely on cashflow velocity, we created an ethical risk-tracking pattern.
*   **Gamifying Literacy:** Integrating progress-oriented repayment markers directly with real-time text interactions significantly drops the cognitive stress associated with microfinance debts.

---

## 🔮 What's Next for EquiScore
We plan to scale EquiScore to support **Offline USSD  / SMS Interactivity**. This will allow women in deep rural communities without access to stable data networks or modern smartphones to easily text our accountability bot, query their current inclusive scores, and log loan repayment goals via basic text commands.
