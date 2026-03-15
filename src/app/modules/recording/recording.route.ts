import express from "express";
import { recordingController } from "./recording.controller";

const router = express.Router();

router.post("/start-record/:id", recordingController.startRecording);
router.post("/stop-record/:id", recordingController.stopRecording);

export const recordingRoutes = router;
