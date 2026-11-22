import express from 'express';
import { geminiApiRouter } from '../src/server/geminiApi.js';

const app = express();

app.use(express.json({ limit: '10mb' }));
app.use('/api/gemini', geminiApiRouter);
app.use('/gemini', geminiApiRouter);

export default app;
