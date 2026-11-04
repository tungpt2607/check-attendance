// Chạy API như một máy chủ Node thường (không cần Vercel): dùng cho kiểm thử đầu-cuối (e2e/) và chạy thử trên máy.
//   PORT=8787 MONGODB_URI=... AUTH_SECRET=... npx tsx apps/api/scripts/serve.ts
import { serve } from "@hono/node-server";
import app from "../src/index.ts";

const port = Number(process.env.PORT || 8787);
serve({ fetch: app.fetch, port }, () => console.log(`API chạy ở http://localhost:${port}`));
