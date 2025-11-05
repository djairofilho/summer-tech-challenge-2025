# 🔵 Template — NestJS + Prisma + SQLite

Bem-vindo(a) ao template oficial **NestJS** do LocPay Tech Challenge.

Este projeto foi criado com o CLI oficial do NestJS e já inclui o Prisma configurado com **SQLite** como banco de dados.

---

## 🚀 Como começar

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Gere o banco local:

   ```bash
   npx prisma migrate dev --name init
   ```

3. Rode a aplicação em modo de desenvolvimento:

   ```
   npm run start:dev
   ```

O servidor iniciará por padrão em <http://localhost:3000>

---

## 🧠 O que você precisa fazer

Implemente as rotas e regras de negócio descritas no README principal do desafio:

- `POST /operations` — criar operação
- `GET /operations/:id` — consultar operação
- `POST /operations/:id/confirm` — confirmar operação
- `GET /receivers/:id` — consultar recebedor e histórico

Use o **Prisma** para criar os modelos do banco no arquivo `prisma/schema.prisma`.

---

## 🧩 Dicas

- Para testar rapidamente, use Insomnia ou Postman.
- Você pode alterar o nome do banco no arquivo `.env` (padrão: `file:./dev.db`).
- Caso queira resetar tudo:

   ```bash
   npx prisma migrate reset
   ```

**Boa sorte!** 💙
Equipe LocPay Tech
