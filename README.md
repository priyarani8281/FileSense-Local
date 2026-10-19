# FileSense Local — Find Any Document Instantly

> **"Your files. Your computer. Your search. Your privacy."**  
> *A desktop-class, privacy-first AI document intelligence application built for national hackathons and everyday privacy-conscious productivity.*

[![Local AI Stack](https://img.shields.io/badge/Stack-Ollama%20%7C%20React%20%7C%20SQLite%20FTS5-forestgreen.svg)](#)
[![Zero Cloud Egress](https://img.shields.io/badge/Privacy-100%25%20Local%20Offline-success.svg)](#)
[![Hybrid Retrieval](https://img.shields.io/badge/Retrieval-Semantic%20%2B%20Keyword%20%2B%20Exact-blueviolet.svg)](#)
[![Recall@5](https://img.shields.io/badge/Benchmark-100%25%20Recall%405%20%7C%201.000%20MRR-orange.svg)](BENCHMARK_REPORT.md)

---

## 1. Quick Start Guide (Windows 11 / macOS / Linux)

### Prerequisites
1. **Node.js**: v20+ or v24+ ([Download Node.js](https://nodejs.org/))
2. **Ollama**: Running locally ([Download Ollama](https://ollama.com/))
   - Download the models used by FileSense Local:
     ```powershell
     ollama pull nomic-embed-text
     ollama pull qwen2.5:3b
     ```

### Installation & Launch
Open PowerShell or your terminal in the project directory:

```powershell
# 1. Install root, backend, and frontend dependencies
npm run setup

# 2. Run automated test suite (13 comprehensive unit/integration tests)
npm test

# 3. Run the scientific benchmark evaluation suite
npm run benchmark

# 4. Start both backend and frontend development servers concurrently
npm run dev
```

- **Frontend Application**: `http://localhost:5173`
- **Backend REST API**: `http://127.0.0.1:5050`
- **Ollama Local Endpoint**: `http://127.0.0.1:11434`

---

## 2. Tested Natural-Language Queries

You can test any of these queries immediately using the included sample documents in `data/sample_documents`:

| Query | Target Document | Match Type |
|---|---|---|
| *"Find my notes about React hooks"* | `react_hooks_advanced_guide.md` | Semantic + Keyword |
| *"Show me the resume I used for internship applications"* | `resume_software_engineering_internship.txt` | Semantic + Disambiguation |
| *"Find the document about landslide prediction and rainfall data"* | `landslide_prediction_rainfall_analysis.md` | Semantic Paraphrase |
| *"Find the invoice mentioning ₹2,500 from March"* | `invoice_freelance_march_2026.txt` | Exact ₹2,500 + Token Match |
| *"Show me PDFs containing my operating systems revision notes"* | `operating_systems_revision_notes.pdf` | Multipage PDF + FTS |
| *"antecedent precipitation slope instability thresholds"* | `landslide_prediction_rainfall_analysis.md` | Pure Vector Meaning (0 word overlap) |

---

## 3. System Architecture

```
                          ┌────────────────────────────────────────────────────────┐
                          │               Browser Frontend (React / Vite)          │
                          │   Editorial UI • Search • Library • Ask AI • Settings  │
                          └───────────────────────────┬────────────────────────────┘
                                                      │  HTTP (Strictly 127.0.0.1)
                                                      ▼
                          ┌────────────────────────────────────────────────────────┐
                          │             Express Security Middleware                │
                          │   localhostOriginGuard (Blocks CSRF & DNS-Rebinding)  │
                          └───────────────────────────┬────────────────────────────┘
                                                      │
                       ┌──────────────────────────────┴──────────────────────────────┐
                       ▼                                                             ▼
         ┌───────────────────────────┐                                 ┌───────────────────────────┐
         │     Indexing Pipeline     │                                 │   Hybrid Search Engine    │
         │ • SHA-256 Content Hash    │                                 │ • 4-Tier Weight Formula   │
         │ • mtime Change Detection  │                                 │ • Cosine Vector Scoring   │
         │ • Duplicate File Badging  │                                 │ • SQLite FTS5 BM25 Match  │
         │ • PDF/DOCX/MD/TXT Parsing │                                 │ • Exact Token / Currency  │
         └─────────────┬─────────────┘                                 └─────────────┬─────────────┘
                       │                                                             │
                       ├──────────────────────────────┬──────────────────────────────┤
                       ▼                              ▼                              ▼
         ┌───────────────────────────┐  ┌───────────────────────────┐  ┌───────────────────────────┐
         │     SQLite (WAL Mode)     │  │   Ollama Local Vector     │  │    Ollama Local LLM       │
         │ • documents & chunks      │  │ • nomic-embed-text        │  │ • qwen2.5:3b              │
         │ • chunks_fts (FTS5 table) │  │ • 768-dim embeddings      │  │ • Grounded Citations      │
         │ • Float32 binary BLOBs    │  │ • Sub-40ms vectorization  │  │ • Prompt Injection Guard  │
         └───────────────────────────┘  └───────────────────────────┘  └───────────────────────────┘
```

---

## 4. Key Differentiators & Completed Features

### Feature Matrix (Completed vs. Planned)

| Feature | Status | Implementation Details |
|---|---|---|
| **Hybrid Document Retrieval** | **Completed** | Combines 768-dim vector embeddings with SQLite FTS5, exact phrase parsing (`"..."`), and special currency tokens (`₹`, `$`). |
| **Why this result? Scoring Modal** | **Completed** | Full transparent score breakdown: Semantic %, Keyword %, Filename match %, and snippet explanation. |
| **Grounded Ask AI with Citations** | **Completed** | Strict citation grounding (`[1]`, `[2]`), authentic page number attribution, and automatic hallucination refusal. |
| **Prompt Injection Defense** | **Completed** | Document excerpts treated as untrusted data; adversarial system commands inside files are safely neutralized. |
| **Incremental SHA-256 Indexing** | **Completed** | Skips unchanged files via `mtime` and content hash; reuses vector embeddings for duplicate files across folders. |
| **Duplicate File Detection** | **Completed** | Automatic duplicate copy badging on search results and library view. |
| **Localhost Origin Protection** | **Completed** | `localhostOriginGuard` blocks unauthorized cross-origin requests from external web pages. |
| **Corrupted File Resilience** | **Completed** | Invalid or password-locked PDFs are logged gracefully without interrupting the indexing queue. |
| **Desktop-Class UI & Shortcuts** | **Completed** | Warm editorial design system, dark mode, keyboard navigation (`/` or `Ctrl+K` to search, `Escape` to close). |
| **Scientific Benchmark Suite** | **Completed** | Automated benchmark measuring Recall@5, MRR, latency, and comparing Hybrid vs. Semantic vs. Keyword. |
| *Scanned Image OCR (Tesseract/ONNX)* | *Planned* | Optional local OCR plugin for scanned documents without text layers. |
| *Vector Index Extension (HNSW)* | *Planned* | Integration of `sqlite-vec` or `usearch` for scaling beyond 50,000 document chunks. |

---

## 5. Scientific Benchmark Summary

Genuine measurements from our automated benchmark suite (`npm run benchmark`):

```
========================================================================
   BENCHMARK SUMMARY & COMPARISON (Genuine Measurements)
========================================================================
Strategy        | Recall@5  | Mean Recip. Rank (MRR) | Avg Latency
----------------|-----------|------------------------|------------
Hybrid Search   | 100.0%    | 1.000                  | 67 ms
Semantic-Only   | 100.0%    | 0.833                  | 71 ms
Keyword-Only    | 83.3%     | 0.528                  | 1 ms
========================================================================
```

- **Key Takeaway 1**: Hybrid Search achieves a perfect **1.000 MRR** by rescuing exact alphanumeric tokens (like `INV-2026-0318` or `₹2,500`) that dense vector models dilute.
- **Key Takeaway 2**: Keyword search misses 66.7% of paraphrased semantic queries, while FileSense Hybrid matches 100% of concept queries.
- For complete test details and methodology, see [BENCHMARK_REPORT.md](BENCHMARK_REPORT.md).

---

## 6. Security, Localhost Protection & Privacy Guarantees

1. **Zero Cloud Egress**: Document contents, embeddings, queries, and AI answers never leave `127.0.0.1`.
2. **Localhost Origin Shield (`localhostOriginGuard`)**: Modern browsers allow malicious web pages to send fetch requests to `http://localhost`. FileSense Local intercepts all requests and rejects any cross-origin headers not originating from the local client.
3. **Path Traversal & System Folder Protection**: Indexing strictly blocks system directories (`C:\Windows`, `Program Files`, `.git`, `node_modules`) and sanitizes all path operations.
4. **Non-Destructive Operations**: Deleting a document or removing a folder from FileSense Local removes it from the search index only. Your original files on disk are never modified or deleted.
5. **Prompt Injection Boundary Isolation**: Content extracted from indexed documents is labeled as untrusted passive reference data, preventing prompt injection attacks from hijacking system behavior.

---

## 7. Hardware Requirements (Student Laptop Friendly)

FileSense Local is engineered for standard consumer laptops without dedicated GPUs:

- **RAM**: Minimum 4 GB available system RAM (Ollama + Backend + UI consume ~2.6 GB total).
- **CPU**: Standard x86_64 / ARM64 dual-core or quad-core processor (Intel Core i3/i5/i7, AMD Ryzen 3/5/7, or Apple Silicon M-series).
- **Disk**: ~2.5 GB free disk space for local models (`nomic-embed-text` is 274 MB, `qwen2.5:3b` is 1.9 GB).
- **OS**: Windows 10/11, macOS 12+, or Ubuntu/Debian Linux.

---

## 8. Hackathon Presentation & Demo Materials

- **Live Demo Script & Pitch Guide**: [HACKATHON_DEMO_GUIDE.md](HACKATHON_DEMO_GUIDE.md)
  - 3-minute pitch script for judges.
  - Step-by-step walkthrough covering difficult semantic queries, exact token hybrid matches, and grounded citations.
  - Offline verification demonstration protocol.
  - Anticipated judge questions with technically honest answers.
- **Scientific Benchmark Report**: [BENCHMARK_REPORT.md](BENCHMARK_REPORT.md)
  - Detailed empirical analysis of Recall@5, MRR, latency, and hardware profiling.

---

## 9. Author & Project Credits

- **Developer & Architect**: [Priya Rani](https://github.com/priyarani8281)
- **GitHub Profile**: [github.com/priyarani8281](https://github.com/priyarani8281)
- **Project Repository**: [github.com/priyarani8281/FileSense-Local](https://github.com/priyarani8281)
- **Mission**: Delivering private, high-performance, local-first artificial intelligence for students, researchers, and professionals without cloud lock-in.

