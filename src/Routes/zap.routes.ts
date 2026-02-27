import express from "express";
import rateLimit from "express-rate-limit";

import upload from "../middlewares/upload";
import {
  sanitizeBody,
  sanitizeQuery,
  sanitizeParams,
} from "../middlewares/sanitizeInput";

import {
  createZap,
  getZapByShortId,
  getZapMetadata,
  verifyQuizForZap,
  shortenUrl,
} from "../controllers/zap.controller";

import {
  uploadLimiter,
  downloadLimiter,
} from "../middlewares/rateLimiter";

import { validate } from "../middlewares/validate.middleware";

import {
  createZapSchema,
  getZapMetadataSchema,
  verifyQuizForZapSchema,
  getZapByShortIdSchema,
} from "../validations/zap.validation";

const router = express.Router();

/* -----------------------------------------
   🔒 Not Found Limiter (for invalid IDs)
------------------------------------------ */
const notFoundLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip ?? "unknown",
  requestWasSuccessful: (_req, res) => res.statusCode !== 404,
  message: {
    error: "Too many invalid Zap IDs. Slow down.",
  },
});

/* -----------------------------------------
   ✅ TEST ROUTE (Important for browser test)
------------------------------------------ */
router.get("/", (_req, res) => {
  res.status(200).json({ message: "Zaps API working" });
});

/* -----------------------------------------
   📤 POST /api/zaps/upload
------------------------------------------ */
router.post(
  "/upload",
  uploadLimiter,
  upload.single("file"),
  sanitizeBody,
  validate(createZapSchema),
  createZap
);

/* -----------------------------------------
   📄 GET /api/zaps/:shortId/metadata
------------------------------------------ */
router.get(
  "/:shortId/metadata",
  sanitizeParams,
  downloadLimiter,
  validate(getZapMetadataSchema),
  getZapMetadata
);

/* -----------------------------------------
   🧠 POST /api/zaps/:shortId/verify-quiz
------------------------------------------ */
router.post(
  "/:shortId/verify-quiz",
  sanitizeParams,
  sanitizeBody,
  downloadLimiter,
  validate(verifyQuizForZapSchema),
  verifyQuizForZap
);

/* -----------------------------------------
   🔗 POST /api/zaps/shorten
------------------------------------------ */
router.post(
  "/shorten",
  sanitizeBody,
  downloadLimiter,
  shortenUrl
);

/* -----------------------------------------
   🔍 GET /api/zaps/:shortId
------------------------------------------ */
router.get(
  "/:shortId",
  sanitizeParams,
  sanitizeQuery,
  downloadLimiter,
  notFoundLimiter,
  validate(getZapByShortIdSchema),
  getZapByShortId
);

export default router;