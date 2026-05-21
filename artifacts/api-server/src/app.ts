import express, { type Express, type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use((req: Request, res: Response, next: NextFunction) => {
  const startedAt = Date.now();

  res.on("finish", () => {
    logger.info(
      {
        req: {
          method: req.method,
          url: req.url.split("?")[0],
        },
        res: {
          statusCode: res.statusCode,
        },
        responseTime: Date.now() - startedAt,
      },
      "request completed",
    );
  });

  next();
});
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;
