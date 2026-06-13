import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import meetingsRouter from "./meetings";

const router: IRouter = Router();
router.use(healthRouter);
router.use(authRouter);
router.use(meetingsRouter);

export default router;
