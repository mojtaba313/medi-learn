import { z } from "zod";

export const questionSchema = z.object({
  text: z.string().trim().min(3, "متن سوال باید حداقل ۳ کاراکتر باشد").max(5000),
  optionA: z.string().trim().min(1, "گزینه ۱ را وارد کنید").max(1000),
  optionB: z.string().trim().min(1, "گزینه ۲ را وارد کنید").max(1000),
  optionC: z.string().trim().min(1, "گزینه ۳ را وارد کنید").max(1000),
  optionD: z.string().trim().min(1, "گزینه ۴ را وارد کنید").max(1000),
  correctOption: z.enum(["A", "B", "C", "D"], {
    message: "پاسخ صحیح باید یکی از گزینه‌های A تا D باشد",
  }),
  explanation: z.string().trim().max(5000).optional().default(""),
  pageNumber: z.number().int().positive().nullable().optional(),
  tags: z.array(z.string().trim().max(50)).max(10).optional().default([]),
});

export type QuestionFormInput = z.infer<typeof questionSchema>;