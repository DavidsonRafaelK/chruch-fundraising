import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const keys = () =>
  createEnv({
    skipValidation: process.env.SKIP_ENV_VALIDATION === "true",
    server: {
      CLOUDINARY_CLOUD_NAME: z.string().optional(),
      CLOUDINARY_API_KEY: z.string().optional(),
      CLOUDINARY_API_SECRET: z.string().optional(),
      CLOUDINARY_UPLOAD_FOLDER: z.string().optional(),
    },
    runtimeEnv: {
      CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
      CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
      CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
      CLOUDINARY_UPLOAD_FOLDER: process.env.CLOUDINARY_UPLOAD_FOLDER,
    },
  });
