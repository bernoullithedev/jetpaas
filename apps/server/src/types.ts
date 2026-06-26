import { z } from "zod";

export const deploymentStatusSchema = z.enum([
  "pending",
  "building",
  "deploying",
  "running",
  "failed",
]);

export type DeploymentStatus = z.infer<typeof deploymentStatusSchema>;
export const deploymentSourceSchema = z.union([
  z.object({ type: z.literal("git"), url: z.string().url() }),
  z.object({ type: z.literal("upload"), filename: z.string().min(1) }),
]);

export const deploymentRecordSchema = z.object({
  id: z.string(),
  name: z.string(),
  source: deploymentSourceSchema,
  status: deploymentStatusSchema,
  imageTag: z.string().nullable(),
  liveUrl: z.string().nullable(),
  createdAt: z.string(),
});

export type DeploymentRecord = z.infer<typeof deploymentRecordSchema>;

export const createDeploymentSchema = z
  .object({
    repository: z.string().url().optional(),
    filename: z.string().min(1).optional(),
  })
  .refine(
    (value) => Boolean(value.repository ?? value.filename),
    "Provide either repository (Git URL) or filename (upload)",
  );

export type DeploymentRow = {
  id: string;
  name: string;
  source: string;
  status: string;
  imageTag: string | null;
  liveUrl: string | null;
  createdAt: string;
};
