import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

const securityMiddleware = (app) => {
  app.use(helmet());
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 100,
      standardHeaders: true,
      legacyHeaders: false,
    })
  );
};

export default securityMiddleware;
