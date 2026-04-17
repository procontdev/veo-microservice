import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import healthRouter from "./routes/health";
import videoRouter from "./routes/video";
import imageRouter from "./routes/image";

const app = express();

app.use(cors());
app.use(express.json({ limit: "50mb" }));

app.use("/health", healthRouter);
app.use("/video", videoRouter);
app.use("/image", imageRouter);

const port = Number(process.env.PORT || 3005);

app.listen(port, () => {
  console.log(`veo-microservice listening on http://localhost:${port}`);
});