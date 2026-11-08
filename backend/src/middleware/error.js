import { ZodError } from "zod";
import prismaPkg from "@prisma/client";
const { Prisma } = prismaPkg;
import { HttpError } from "../lib/http.js";

export function notFoundHandler(req, res) {
  res.status(404).json({ error: `No route for ${req.method} ${req.path}` });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err, _req, res, _next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, details: err.details });
  }
  if (err instanceof ZodError) {
    const first = err.issues[0];
    return res.status(400).json({
      error: first ? `${first.path.join(".") || "input"}: ${first.message}` : "Invalid input",
      details: err.issues,
    });
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
    const target = err.meta?.target?.join(", ") ?? "field";
    return res.status(409).json({ error: `That ${target} is already taken` });
  }
  console.error(err);
  res.status(500).json({ error: "Something went wrong on our side. Please try again" });
}
