import express from 'express';
import { getHealth } from '../controllers/health.controller';

const healthRoutes = express.Router();

healthRoutes.get('/', getHealth);

export default healthRoutes;
