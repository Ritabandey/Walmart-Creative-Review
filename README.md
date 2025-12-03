# Walmart Creative Review — Brand Compliance Checker (MVP)

This project contains a minimal web UI and Node.js backend that accepts image uploads and checks them against simple brand rules (format, dimensions, dominant color, filesize, basic SVG checks).

Quick start

1. Install dependencies:

```bash
npm install
```

2. Start the server:

```bash
npm start
```

3. Open http://localhost:3000 in your browser and upload an image.

Notes
- This is an MVP. It performs simple checks and is intended for internal use. Do not send images to external services unless permitted by company policy.
- Next steps: add logo detection, OCR, and more robust SVG/font checks.
