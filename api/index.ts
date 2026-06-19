// Vercel serverless entry point.
// Re-exports the Express app so @vercel/node can invoke it as a function.
// server.ts skips DB.init() / port-listening when process.env.VERCEL is set;
// the ensureDbInit middleware in server.ts handles DB init per-request instead.
export { default } from '../server.js';
