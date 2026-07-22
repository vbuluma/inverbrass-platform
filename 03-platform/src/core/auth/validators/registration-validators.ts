import { z } from "zod";

import { passwordPolicySchema } from "@/core/auth/utils/password-policy";

export const ownerRegistrationSchema = z
  .object({
    firstName: z
      .string()
      .trim()
      .min(1, "First name is required.")
      .max(100, "First name is too long."),
    lastName: z
      .string()
      .trim()
      .min(1, "Last name is required.")
      .max(100, "Last name is too long."),
    mobileNumber: z.string().min(1, "Mobile number is required."),
    countryCode: z
      .string()
      .length(2, "Country code must be a 2-letter ISO code."),
    email: z
      .string()
      .trim()
      .email("Enter a valid email address.")
      .max(255)
      .optional()
      .or(z.literal("")),
    password: passwordPolicySchema,
    confirmPassword: z.string().min(1, "Confirm your password."),
    securityQuestionId: z.string().uuid("Select a security question."),
    securityAnswer: z
      .string()
      .trim()
      .min(2, "Security answer must be at least 2 characters.")
      .max(200, "Security answer is too long."),
    businessName: z
      .string()
      .trim()
      .min(1, "Business name is required.")
      .max(200, "Business name is too long."),
    businessTypeId: z.string().uuid("Select a business type."),
    businessCountryCode: z
      .string()
      .length(2, "Country code must be a 2-letter ISO code."),
    businessMobileNumber: z.string().min(1, "Business mobile number is required."),
    businessEmail: z
      .string()
      .trim()
      .email("Enter a valid business email address.")
      .max(255)
      .optional()
      .or(z.literal("")),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type OwnerRegistrationInput = z.infer<typeof ownerRegistrationSchema>;
