VIDEO EDITOR VERCEL READY

Så här använder du mappen:

1. Packa upp zippen.
2. Öppna terminal i mappen.
3. Kör:
   npm install
4. Testa lokalt:
   npm run dev
5. Lägg upp på GitHub.
6. Importera projektet i Vercel.

VIKTIGT:
- Ingen server.js ska finnas.
- Ingen public-mapp behövs.
- Vercel ska använda Vite och outputDirectory dist.

Funktioner:
- Ladda in flera videos
- MTS/M2TS till MP4/MOV/MKV/WEBM
- Ta bort originalljud
- Lägg till nytt ljud
- Fade in/fade out på nytt ljud
- Vattenstämpel-text

All konvertering sker i webbläsaren med FFmpeg WASM.
