# Kaizen-Dhara - Technology Stack & Architecture Information

This document outlines the complete technology stack used in the **Kaizen-Dhara** project (SDLC AI Agent Orchestrator). The project is structured as a full-stack application with a modern React frontend and a Node.js/Express backend.

## 🏗️ Architectural Overview
- **Monorepo Structure**: The application is divided into `frontend` and `backend` directories.
- **AI Agent Integration**: Both the frontend and backend interact heavily with LLM providers (Google Gemini, OpenAI).

---

## 🎨 Frontend Stack (Client-Side)
The frontend is built for performance, utilizing modern tooling and rich interactive libraries:

### Core Frameworks
- **React (v19)**: The foundational UI library for building component-based interfaces.
- **TypeScript**: Provides static typing and enhanced developer experience/safety.
- **Vite & @vitejs/plugin-react**: Super-fast modern build tool and development server.

### Styling & UI
- **Tailwind CSS (v4)**: Utility-first CSS framework for rapid UI styling.
- **PostCSS**: Tool for transforming CSS with JavaScript.
- **Framer Motion**: Enables fluid and complex UI animations/transitions.
- **Lucide React**: Comprehensive icon library used throughout the UI.
- **clsx & tailwind-merge**: Utilities for conditionally joining and merging Tailwind class names efficiently.

### 3D Graphics & Visualization
- **Three.js**: Used for rendering 3D graphics in the browser.
- **React Three Fiber (@react-three/fiber)**: React renderer for Three.js.
- **Drei (@react-three/drei)**: Useful helpers and abstractions for React Three Fiber.
- **Mermaid**: Text-based diagramming tool incorporated for dynamically generating architecture diagrams and flowcharts.

### File Parsing & Handling
- **pdfjs-dist**: For parsing and reading PDF documents.
- **mammoth**: For parsing `.docx` (Word) files.
- **exceljs**: For reading and manipulating Excel spreadsheets.
- **jszip & file-saver**: For handling ZIP file creation/extraction and client-side file downloading.

### AI & LLM Tools
- **@google/genai**: Google's Generative AI SDK (Gemini).
- **OpenAI**: Client for interacting with OpenAI capabilities.
- **@mlc-ai/web-llm**: Enables running Large Language Models directly in the browser using WebGPU.

---

## ⚙️ Backend Stack (Server-Side)
The API service is responsible for handling database actions, secure endpoints, external API proxies, and agent orchestrations.

### Core Frameworks
- **Node.js**: The runtime environment.
- **Express (v4.18)**: Web framework for building RESTful APIs.

### Database & ORM
- **Prisma (@prisma/client)**: Modern database ORM used for strict type-safe database queries, schema migrations, and relational mapping.

### Authentication & Security
- **JSON Web Tokens (jsonwebtoken)**: Used for stateless API authentication and securing endpoints.
- **Bcrypt.js (bcryptjs)**: Used for secure password hashing.
- **CORS**: Handles Cross-Origin Resource Sharing.
- **Dotenv**: For managing environment variables securely.

### Integrations & Utilities
- **@google/genai**: Google's AI SDK utilized on the server-side to orchestrate tasks and process AI-intensive loads.
- **@octokit/rest**: GitHub REST API client for repository interactions, codebase scanning, and version control integrations.
- **Axios**: Promise-based HTTP client for making external API requests (such as fetching Figma structures or other 3rd-party services).
- **Nodemon**: Developer utility that automatically restarts the node application when file changes are detected.

---

## 🚀 Key Features Inferred from Stack
1. **Interactive Architecture**: Using `mermaid` and `three.js`, the UI dynamically visualizing graphs, models, and workflows.
2. **Robust File Intake System**: The frontend is fully equipped to ingest any project context files—including Word, PDFs, ZIP archives, and Excel files.
3. **Hybrid AI Engine**: Leveraging both server-side agents (via Gemini API / OpenAI API) and in-browser local LLM capabilities via `web-llm`.
4. **Figma & GitHub Ready**: The backend supports parsing designs directly from Figma (via custom parsers) and integrating with Git via Octokit.
