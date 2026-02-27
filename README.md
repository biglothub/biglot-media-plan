# BigLot Idea Backlog (Svelte + Supabase)

MVP สำหรับเก็บ `idea backlog` จากลิงก์วิดีโอ YouTube / Facebook / Instagram / TikTok

Workflow:
1. วางลิงก์
2. กด `Analyze Link`
3. ตรวจ/แก้ค่า engagement
4. กด `Save To Backlog`

## Tech Stack
- SvelteKit
- Supabase (`@supabase/supabase-js`)
- API route ภายใน SvelteKit: `GET /api/enrich` สำหรับดึง metadata + engagement แบบ best-effort

## Setup
1. ติดตั้ง dependency
```bash
npm install
```

2. ตั้งค่า environment
```bash
cp .env.example .env
```
จากนั้นแก้ค่าใน `.env`:
- `PUBLIC_SUPABASE_URL`
- `PUBLIC_SUPABASE_ANON_KEY`

3. สร้างตารางบน Supabase
- เปิด SQL Editor ใน Supabase
- รันไฟล์ [`supabase/schema.sql`](./supabase/schema.sql)

4. รันโปรเจกต์
```bash
npm run dev
```

## โครงสร้างสำคัญ
- หน้า UI: [`src/routes/+page.svelte`](./src/routes/+page.svelte)
- Supabase client: [`src/lib/supabase.ts`](./src/lib/supabase.ts)
- Type definitions: [`src/lib/types.ts`](./src/lib/types.ts)
- Enrichment API: [`src/routes/api/enrich/+server.ts`](./src/routes/api/enrich/+server.ts)
- DB schema + policies: [`supabase/schema.sql`](./supabase/schema.sql)

## หมายเหตุ
- การดึง engagement จากบางแพลตฟอร์มอาจถูกจำกัด (private post, geo-block, anti-bot)
- endpoint ตอนนี้เป็น `best-effort` จาก JSON-LD/meta tags/regex fallback
- ถ้าต้องการความแม่นยำระดับ production ควรเชื่อม official API ของแต่ละแพลตฟอร์ม
