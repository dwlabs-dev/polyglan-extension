import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import meetRouter from './routes/meet.js';
import authRouter from './routes/auth.js';
import healthRouter from './routes/health.js';
import sessionRouter from './routes/session.js';
import participantsRouter from './routes/participants.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use(authRouter);
app.use(healthRouter);
app.use(sessionRouter);
app.use(meetRouter);
app.use(participantsRouter);

app.listen(PORT, () => {
  console.log(`[API] Polyglan API running on http://localhost:${PORT}`);
});
