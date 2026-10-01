import app from "./app.js";
import { connectDB } from "./config/db.js";

const port = Number(process.env.PORT) || 5001;

try {
  await connectDB();
  const server = app.listen(port, () => {
    console.log(`Backend listening on port ${port}`);
  });

  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, () => {
      server.close(() => process.exit(0));
    });
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}