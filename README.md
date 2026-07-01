# GeoOlymp MVP

MVP образовательной платформы для подготовки олимпиадников по географии.

## Стек

- Next.js 15 App Router
- TypeScript
- Tailwind CSS
- Prisma
- PostgreSQL (Neon)

## Запуск

```bash
npm install
copy .env.example .env
npx prisma generate
npx prisma migrate deploy
npm run prisma:seed
npm run dev
```

Сайт откроется на `http://localhost:3000`.

## Демо-аккаунты

Учитель:

```txt
teacher@geoolymp.kz
123456
```

Ученик:

```txt
student@geoolymp.kz
123456
```

Seed создаёт группу, материалы и задачи по географии Казахстана.
