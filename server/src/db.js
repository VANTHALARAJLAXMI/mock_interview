import { config } from './config.js';

let state = null;

/** Connects to MongoDB only when MONGODB_URI is set. The app works fine without it. */
export async function connectDb() {
  if (!config.mongoUri) return false;
  try {
    const { default: mongoose } = await import('mongoose');
    await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 8000 });

    const interviewSchema = new mongoose.Schema({
      clientId: { type: String, required: true, index: true },
      role: String,
      topic: String,
      difficulty: String,
      interviewType: String,
      status: { type: String, default: 'completed' },
      createdAt: { type: Date, default: Date.now },
      completedAt: Date,
    });

    const answerSchema = new mongoose.Schema({
      interviewId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
      clientId: { type: String, required: true },
      question: String,
      userAnswer: String,
      feedback: mongoose.Schema.Types.Mixed,
      scoreEstimate: Number,
      createdAt: { type: Date, default: Date.now },
    });

    state = {
      mongoose,
      Interview: mongoose.models.Interview || mongoose.model('Interview', interviewSchema),
      Answer: mongoose.models.Answer || mongoose.model('Answer', answerSchema),
    };
    console.log('[db] MongoDB connected — history is stored in the database.');
    return true;
  } catch (err) {
    console.error('[db] MongoDB connection failed; falling back to browser-only history:', err.message);
    state = null;
    return false;
  }
}

export const getDb = () => state;
