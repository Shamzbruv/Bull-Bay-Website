import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// The quiz is served by the church platform at /tools/quiz: its assets are
// built into the platform's public folder, and the HTML page is handed out
// by app/tools/quiz/[[...path]]/route.ts, which checks the visitor is an admin
// (scripts/move-shell.mjs moves it out of public so it can't be fetched
// around that check).
//
// Without the Supabase settings the quiz quietly runs on each browser's own
// storage, so a deploy that lost them would look fine while every quiz
// vanished. On Railway that is a failed build instead.
const onRailway = Boolean(process.env.RAILWAY_ENVIRONMENT_NAME || process.env.RAILWAY_ENVIRONMENT)
if (onRailway && !(process.env.VITE_SUPABASE_URL && process.env.VITE_SUPABASE_ANON_KEY)) {
  throw new Error('Quiz Night: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY on the Railway service (the Bull Bay NTCOG Games project).')
}

export default defineConfig({
  base: '/tools/quiz/',
  plugins: [react(), tailwindcss()],
  build: {
    outDir: '../../public/tools/quiz',
    emptyOutDir: true,
  },
})
