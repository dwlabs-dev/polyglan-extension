import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.post('/api/session/start-debate', (req, res) => {
  const { meetingId } = req.body;
  
  console.log(`[API] Iniciar Modo Debate para meetingId: ${meetingId}`);
  
  if (!meetingId) {
    return res.status(400).json({ error: 'meetingId is required' });
  }

  res.json({
    status: "debate_started",
    timestamp: Date.now(),
    meetingId: meetingId
  });
});

app.listen(PORT, () => {
  console.log(`[API] Add-on server running on http://localhost:${PORT}`);
});
