import { z } from "zod";

export const loginCredentialsSchema = z.object({
  mobileNumber: z.string().min(1, "Mobile number is required."),
  password: z.string().min(1, "Password is required."),
  countryCode: z
    .string()
    .length(2, "Country code must be a 2-letter ISO code."),
});

export type LoginCredentialsInput = z.infer<typeof loginCredentialsSchema>;
