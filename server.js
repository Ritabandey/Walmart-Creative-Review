const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const rules = JSON.parse(fs.readFileSync(path.join(__dirname, 'brand-rules.json')));

function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  const bigint = parseInt(clean, 16);
  return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
}

function colorDistance(a, b) {
  return Math.sqrt((a.r - b.r) ** 2 + (a.g - b.g) ** 2 + (a.b - b.b) ** 2);
}

app.use(express.static(path.join(__dirname)));

app.post('/analyze', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const filename = req.file.originalname || 'upload';
  const ext = path.extname(filename).replace('.', '').toLowerCase();

  const checks = [];

  // read asset type (icon | illustration | pdf) from form fields
  const assetType = (req.body && req.body.assetType) ? String(req.body.assetType).trim().toLowerCase() : '';
  checks.push({ id: 'assetType', passed: !!assetType, message: assetType ? `Asset type: ${assetType}` : 'Asset type not provided' });

  // Apply simple per-type overrides
  const typeOverrides = {
    icon: { maxWidth: 512, maxHeight: 512, colorTolerance: 40, minLogoSizePx: 24 },
    illustration: { maxWidth: rules.maxWidth, maxHeight: rules.maxHeight, colorTolerance: rules.colorTolerance },
    pdf: { allowPdf: true }
  };
  const overrides = typeOverrides[assetType] || {};

  // Format check - allow pdf when requested
  const allowed = (ext === 'pdf' && overrides.allowPdf) ? true : rules.allowedFormats.includes(ext);
  const formatPass = allowed;
  checks.push({ id: 'format', passed: formatPass, message: formatPass ? 'Format allowed' : `Disallowed format: .${ext}` });

  // If SVG, do simple SVG checks
  const isSvg = ext === 'svg' || req.file.mimetype === 'image/svg+xml';
  if (isSvg) {
    const txt = req.file.buffer.toString('utf8');
    const hasWideStroke = /stroke-width=\"?\d{3,}\"?/i.test(txt);
    checks.push({ id: 'svg-stroke', passed: !hasWideStroke, message: hasWideStroke ? 'SVG has very wide stroke' : 'SVG stroke sizes look ok' });

    // Attempt to look for font family attributes
    const usesFonts = /font-family=\"?([^\"'>]+)/i.exec(txt);
    checks.push({ id: 'svg-font', passed: !!usesFonts, message: usesFonts ? `SVG uses font-family: ${usesFonts[1]}` : 'No explicit font-family found in SVG' });
  }

  // Raster checks (png/jpg)
  // If PDF, skip raster/SVG pixel analysis and provide simple PDF checks
  if (ext === 'pdf' || assetType === 'pdf') {
    checks.push({ id: 'pdf-check', passed: ext === 'pdf', message: ext === 'pdf' ? 'PDF uploaded — content checks are limited' : 'Asset type is PDF but file is not PDF' });
  } else if (!isSvg) {
    try {
      const image = sharp(req.file.buffer);
      const meta = await image.metadata();
      const maxW = overrides.maxWidth || rules.maxWidth;
      const maxH = overrides.maxHeight || rules.maxHeight;
      checks.push({ id: 'dimensions', passed: (meta.width <= maxW && meta.height <= maxH), message: `Dimensions: ${meta.width}x${meta.height} (limit ${maxW}x${maxH})` });

      // compute average color by resizing to 1x1
      const avgBuf = await image.resize(1, 1).raw().toBuffer();
      const avg = { r: avgBuf[0], g: avgBuf[1], b: avgBuf[2] };

      // compare to brand colors
      let best = { dist: Infinity, hex: null };
      const tolerance = overrides.colorTolerance || rules.colorTolerance;
      for (const hex of rules.brandColors) {
        const rgb = hexToRgb(hex);
        const d = colorDistance(avg, rgb);
        if (d < best.dist) { best = { dist: d, hex }; }
      }

      const colorPass = best.dist <= tolerance;
      checks.push({ id: 'dominantColor', passed: colorPass, message: colorPass ? `Matches brand color ${best.hex}` : `No close brand color (closest: ${best.hex}, dist ${Math.round(best.dist)})` });

    } catch (err) {
      checks.push({ id: 'raster-error', passed: false, message: `Error processing raster image: ${err.message}` });
    }
  }

  // Generic file size check
  const sizePass = req.file.size <= 5 * 1024 * 1024; // 5MB
  checks.push({ id: 'filesize', passed: sizePass, message: sizePass ? `Size OK: ${req.file.size} bytes` : `File too large: ${req.file.size} bytes` });

  res.json({ filename, checks });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Brand-check server listening on http://localhost:${port}`));
