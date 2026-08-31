const express = require('express');
const multer = require('multer');
const path = require('path');
const { parsePdf } = require('../services/pdfParser');
const { diffPdfs } = require('../services/diffEngine');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (path.extname(file.originalname).toLowerCase() !== '.pdf') {
      return cb(Object.assign(new Error('Only .pdf files are allowed'), { statusCode: 400 }));
    }
    return cb(null, true);
  },
});

router.post(
  '/diff',
  upload.fields([
    { name: 'original', maxCount: 1 },
    { name: 'modified', maxCount: 1 },
  ]),
  async (req, res, next) => {
    try {
      const original = req.files?.original?.[0];
      const modified = req.files?.modified?.[0];

      if (!original || !modified) {
        return res.status(400).json({ error: 'Both original and modified .pdf files are required' });
      }

      const [originalPdf, modifiedPdf] = await Promise.all([
        parsePdf(original.buffer),
        parsePdf(modified.buffer),
      ]);

      return res.json({ success: true, ...diffPdfs(originalPdf, modifiedPdf) });
    } catch (error) {
      return next(error);
    }
  }
);

module.exports = router;
