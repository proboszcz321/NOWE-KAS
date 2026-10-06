# Golden Fake Casino – wersja online z kontami

Lokalnie: `npm install` i `npm start` → http://localhost:3000 (konta w pliku data.json)

## Wdrożenie na Render.com (darmowo)
1. Wgraj pliki do repozytorium na GitHubie.
2. Render: New → Web Service → repozytorium. Build: `npm install`, Start: `npm start`, plan Free.

## Żeby konta NIE znikały (ważne!)
Darmowy Render kasuje pliki przy każdym restarcie, więc konta trzeba trzymać w darmowym Redisie:
1. Załóż konto na upstash.com → Create Database (Redis, Free).
2. W zakładce REST API skopiuj `UPSTASH_REDIS_REST_URL` i `UPSTASH_REDIS_REST_TOKEN`.
3. W Render: Environment → dodaj obie zmienne → zapisz (serwer się zrestartuje).
