# مدی‌لرن (MediLearn)

پلتفرم یادگیری تعاملی برای دانشجویان پزشکی — ساخته‌شده با Next.js 16 (App Router)، RTL فارسی.

ویژگی‌ها:
- نقش‌ها: **ادمین** (اولین کاربر ثبت‌نام‌شده) و **دانشجو**
- مدیریت درس: ساخت درس، آپلود PDF، تبدیل خودکار به تصاویر صفحه (pdf-to-png-converter + ArvanCloud Object Storage)
- ساخت سوال چهارگزینه‌ای و پیوند آن به صفحات خاص + ایمپورت گروهی (CSV/JSON)
- صفحه مطالعه: حاشیه‌نویسی روی تصاویر (قلم، هایلایت، پاک‌کن، حرکت، زوم، undo/redo) با ذخیره خودکار
- آزمون: حالت‌های مطالعه / امتحان / تصادفی / نقاط ضعف، فیلتر بر اساس صفحه و برچسب، آمار با نمودار (Recharts)

## پشته تکنولوژی

- Next.js 16 (App Router, TypeScript strict, Tailwind CSS v4)
- Prisma 6 + PostgreSQL (NeonDB)
- ArvanCloud Object Storage (S3-compatible via @aws-sdk/client-s3)
- JWT (jose) + bcryptjs — سشن httpOnly cookie
- Radix UI + shadcn-style، Framer Motion، Zustand، React Hook Form + Zod، Sonner

> توجه: ساخت پروژکشن (production build) به‌صورت `next build --webpack` اجرا می‌شود، چون `pdf-to-png-converter` شامل ارجاع استاتیک به `node:worker_threads` است که Turbopack نمی‌تواند آن را ردیابی کند.

## راه‌اندازی محلی

پیش‌نیاز: Node.js 20+ و pnpm.

```bash
pnpm install
# pnpm 11: برای اجرای اسکریپت‌های ساخت (prisma/esbuild) باید build ها تأیید شوند:
pnpm approve-builds

cp .env.example .env
```

مقادیر `.env`:
- `DATABASE_URL` — آدرس PostgreSQL (Neon)
- `ARVAN_ENDPOINT` — آدرس S3 (`https://s3.ir-thr-1.arvancloud.ir`)
- `ARVAN_REGION` — ناحیه (`ir-thr-1`)
- `ARVAN_ACCESS_KEY_ID`, `ARVAN_SECRET_ACCESS_KEY` — کلید API از پنل ArvanCloud
- `ARVAN_BUCKET_NAME` — نام باکت
- `ARVAN_PUBLIC_BASE_URL` — آدرس عمومی باکت (برای نمایش تصاویر صفحات)
- `AUTH_SECRET` — یک رشته تصادفی برای امضای JWT
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` — فقط برای seed

سپس:

```bash
pnpm db:push      # اعمال schema روی دیتابیس
pnpm db:seed      # ساخت ادمین اولیه (اختیاری)
pnpm dev
```

اولین کاربری که در `/register` ثبت‌نام می‌کند به‌صورت خودکار **ادمین** می‌شود.

## نحوه ذخیره‌سازی فایل‌ها (ArvanCloud Object Storage)

- ادمین درس را می‌سازد، سپس اپ لینک آپلود امضاشده (presigned PUT) را از `/api/courses/[id]/upload-url` می‌گیرد و PDF مستقیماً از مرورگر به ArvanCloud آپلود می‌شود.
- روت `/api/courses/[id]/process` فایل را می‌خواند، صفحات را PNG می‌کند و در `medilearn/courses/{id}/page-XXX.png` ذخیره می‌کند.
- همه اشیای یک درس زیر پیشوند `medilearn/courses/{id}/` هستند؛ حذف درس، آن پیشوند را پاک می‌کند.
- باکت باید دسترسی عمومی (Public access / CDN) فعال داشته باشد تا تصاویر در مرورگر لود شوند.

## اسکریپت‌ها

| دستور | توضیح |
|---|---|
| `pnpm dev` | سرور توسعه |
| `pnpm build` | ساخت production (webpack) |
| `pnpm start` | اجرای production |
| `pnpm lint` | ESLint |
| `pnpm db:generate` / `db:push` / `db:migrate` / `db:seed` / `db:studio` | ابزارهای Prisma |

## دیپلوی روی Vercel

دیتابیس Neon و باکت ArvanCloud را بسازید، متغیرهای محیطی را ست کنید و پروژه را وصل کنید.
روت `/api/courses/[id]/process` به `maxDuration = 300` نیاز دارد (پلن Vercel مناسب). ساخت به‌صورت خودکار با `pnpm build` (webpack) اجرا می‌شود.

## ساختار

- `prisma/schema.prisma` — مدل‌ها: User, Course, Page, Annotation, Question, QuestionResponse, QuizAttempt
- `lib/` — auth, db, s3, pdf, store (Zustand), utils
- `components/study/` — موتور حاشیه‌نویسی canvas
- `components/quiz/` — آزمون و آمار
- `app/api/` — API routes