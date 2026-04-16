import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import healthRouter from "./routes/health";
import videoRouter from "./routes/video";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: "50mb" }));

app.use("/health", healthRouter);
app.use("/video", videoRouter);

const port = Number(process.env.PORT || 3005);

app.listen(port, () => {
  console.log(`veo-microservice listening on http://localhost:${port}`);
});