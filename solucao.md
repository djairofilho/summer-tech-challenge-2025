# Solução - LocPay Tech Challenge

Este documento descreve a solução implementada para o LocPay Tech Challenge, incluindo instruções de execução e exemplos de uso da API.

## Instalação e Execução

### Pré-requisitos

- Node.js (versão 14 ou superior)
- npm (Node Package Manager)

### Passos para instalação

1. **Instalar dependências:**

```bash
npm install
```

2. **Iniciar o servidor:**

```bash
npm start
```

O servidor iniciará na porta **3000** por padrão. Você verá mensagens indicando que o banco de dados foi conectado e as tabelas foram criadas.

3. **Executar os testes (opcional):**

```bash
# Executar todos os testes
npm test

# Executar testes em modo watch
npm run test:watch

# Executar testes com cobertura
npm run test:coverage
```

## Estrutura do Projeto

```
.
├── app.js                 # Arquivo principal da aplicação Express
├── db.js                  # Configuração do banco de dados SQLite
├── bin/
│   └── www                # Ponto de entrada do servidor
├── routes/
│   ├── index.js           # Rota raiz (documentação da API)
│   ├── operations.js      # Rotas de operações
│   └── receivers.js       # Rotas de recebedores
├── tests/
│   ├── operations.test.js # Testes das rotas de operações
│   └── receivers.test.js  # Testes das rotas de recebedores
├── db.sqlite              # Arquivo do banco de dados SQLite
└── solucao.md             # Este arquivo
```

## Banco de Dados

O banco de dados SQLite é criado automaticamente quando o servidor inicia. O arquivo `db.sqlite` será gerado na raiz do projeto.

### Schema

#### Tabela: `receivers`
- `id` (INTEGER PRIMARY KEY AUTOINCREMENT)
- `name` (TEXT NOT NULL)
- `balance` (REAL DEFAULT 0)

#### Tabela: `operations`
- `id` (INTEGER PRIMARY KEY AUTOINCREMENT)
- `receiver_id` (INTEGER NOT NULL)
- `gross_value` (REAL NOT NULL)
- `fee` (REAL NOT NULL)
- `net_value` (REAL NOT NULL)
- `status` (TEXT NOT NULL DEFAULT 'pending')
- `created_at` (DATETIME DEFAULT CURRENT_TIMESTAMP)
- FOREIGN KEY (`receiver_id`) REFERENCES `receivers`(`id`)

## Endpoints da API

### 1. GET /
Retorna informações sobre a API e lista de endpoints disponíveis.

**Request:**
```bash
GET http://localhost:3000/
```

**Response:**
```json
{
  "message": "LocPay Tech Challenge API",
  "version": "1.0.0",
  "endpoints": {
    "operations": {
      "POST /operations": "Cria uma nova operação de antecipação",
      "GET /operations/:id": "Retorna os dados de uma operação",
      "POST /operations/:id/confirm": "Confirma uma operação e atualiza saldo do recebedor"
    },
    "receivers": {
      "GET /receivers/:id": "Retorna dados do recebedor (nome, saldo) e histórico de operações",
      "POST /receivers": "Cria um novo recebedor (endpoint auxiliar para testes)"
    }
  }
}
```

---

### 2. POST /receivers
Cria um novo recebedor.

**Request:**
```bash
POST http://localhost:3000/receivers
Content-Type: application/json

{
  "name": "João Silva"
}
```

**Response (201 Created):**
```json
{
  "id": 1,
  "name": "João Silva",
  "balance": 0
}
```

**Erros possíveis:**
- `400 Bad Request`: Se o campo `name` não for fornecido ou estiver vazio
  ```json
  {
    "error": "name é obrigatório"
  }
  ```

---

### 3. GET /receivers/:id
Retorna os dados do recebedor com seu histórico de operações.

**Request:**
```bash
GET http://localhost:3000/receivers/1
```

**Response (200 OK):**
```json
{
  "id": 1,
  "name": "João Silva",
  "balance": 970,
  "operations": [
    {
      "id": 1,
      "receiver_id": 1,
      "gross_value": 1000,
      "fee": 30,
      "net_value": 970,
      "status": "confirmed",
      "created_at": "2025-01-15 10:30:00"
    },
    {
      "id": 2,
      "receiver_id": 1,
      "gross_value": 500,
      "fee": 15,
      "net_value": 485,
      "status": "pending",
      "created_at": "2025-01-15 11:00:00"
    }
  ]
}
```

**Erros possíveis:**
- `400 Bad Request`: Se o ID for inválido
  ```json
  {
    "error": "ID inválido"
  }
  ```
- `404 Not Found`: Se o recebedor não existir
  ```json
  {
    "error": "Recebedor não encontrado"
  }
  ```

---

### 4. POST /operations
Cria uma nova operação de antecipação.

**Regras de negócio:**
- A taxa (`fee`) é calculada automaticamente como **3%** do valor bruto
- O valor líquido (`net_value`) é calculado como `gross_value - fee`
- A operação é criada com status `"pending"`

**Request:**
```bash
POST http://localhost:3000/operations
Content-Type: application/json

{
  "receiver_id": 1,
  "gross_value": 1000
}
```

**Response (201 Created):**
```json
{
  "id": 1,
  "receiver_id": 1,
  "gross_value": 1000,
  "fee": 30,
  "net_value": 970,
  "status": "pending",
  "created_at": "2025-01-15 10:30:00"
}
```

**Erros possíveis:**
- `400 Bad Request`: Se `receiver_id` ou `gross_value` não forem fornecidos
  ```json
  {
    "error": "receiver_id é obrigatório"
  }
  ```
  ```json
  {
    "error": "gross_value é obrigatório e deve ser maior que zero"
  }
  ```
- `404 Not Found`: Se o recebedor não existir
  ```json
  {
    "error": "Recebedor não encontrado"
  }
  ```

---

### 5. GET /operations/:id
Retorna os dados completos de uma operação.

**Request:**
```bash
GET http://localhost:3000/operations/1
```

**Response (200 OK):**
```json
{
  "id": 1,
  "receiver_id": 1,
  "gross_value": 1000,
  "fee": 30,
  "net_value": 970,
  "status": "pending",
  "created_at": "2025-01-15 10:30:00"
}
```

**Erros possíveis:**
- `400 Bad Request`: Se o ID for inválido
  ```json
  {
    "error": "ID inválido"
  }
  ```
- `404 Not Found`: Se a operação não existir
  ```json
  {
    "error": "Operação não encontrada"
  }
  ```

---

### 6. POST /operations/:id/confirm
Confirma uma operação e atualiza o saldo do recebedor.

**Regras de negócio:**
- O status da operação é alterado para `"confirmed"`
- O valor líquido (`net_value`) é somado ao saldo atual do recebedor
- Não é possível confirmar uma operação que já está confirmada

**Request:**
```bash
POST http://localhost:3000/operations/1/confirm
```

**Response (200 OK):**
```json
{
  "id": 1,
  "receiver_id": 1,
  "gross_value": 1000,
  "fee": 30,
  "net_value": 970,
  "status": "confirmed",
  "created_at": "2025-01-15 10:30:00"
}
```

**Erros possíveis:**
- `400 Bad Request`: Se o ID for inválido ou a operação já estiver confirmada
  ```json
  {
    "error": "ID inválido"
  }
  ```
  ```json
  {
    "error": "Operação já está confirmada"
  }
  ```
- `404 Not Found`: Se a operação não existir
  ```json
  {
    "error": "Operação não encontrada"
  }
  ```

---

## Exemplos de Uso Completo

### Exemplo 1: Fluxo completo de uma operação

1. **Criar um recebedor:**
```bash
curl -X POST http://localhost:3000/receivers \
  -H "Content-Type: application/json" \
  -d '{"name": "Maria Santos"}'
```

**Response:**
```json
{
  "id": 1,
  "name": "Maria Santos",
  "balance": 0
}
```

2. **Criar uma operação:**
```bash
curl -X POST http://localhost:3000/operations \
  -H "Content-Type: application/json" \
  -d '{
    "receiver_id": 1,
    "gross_value": 2000
  }'
```

**Response:**
```json
{
  "id": 1,
  "receiver_id": 1,
  "gross_value": 2000,
  "fee": 60,
  "net_value": 1940,
  "status": "pending",
  "created_at": "2025-01-15 10:30:00"
}
```

3. **Confirmar a operação:**
```bash
curl -X POST http://localhost:3000/operations/1/confirm
```

**Response:**
```json
{
  "id": 1,
  "receiver_id": 1,
  "gross_value": 2000,
  "fee": 60,
  "net_value": 1940,
  "status": "confirmed",
  "created_at": "2025-01-15 10:30:00"
}
```

4. **Consultar o recebedor:**
```bash
curl http://localhost:3000/receivers/1
```

**Response:**
```json
{
  "id": 1,
  "name": "Maria Santos",
  "balance": 1940,
  "operations": [
    {
      "id": 1,
      "receiver_id": 1,
      "gross_value": 2000,
      "fee": 60,
      "net_value": 1940,
      "status": "confirmed",
      "created_at": "2025-01-15 10:30:00"
    }
  ]
}
```

### Exemplo 2: Múltiplas operações

1. **Criar recebedor:**
```bash
curl -X POST http://localhost:3000/receivers \
  -H "Content-Type: application/json" \
  -d '{"name": "Pedro Oliveira"}'
```

2. **Criar várias operações:**
```bash
# Operação 1
curl -X POST http://localhost:3000/operations \
  -H "Content-Type: application/json" \
  -d '{"receiver_id": 1, "gross_value": 1000}'

# Operação 2
curl -X POST http://localhost:3000/operations \
  -H "Content-Type: application/json" \
  -d '{"receiver_id": 1, "gross_value": 500}'

# Operação 3
curl -X POST http://localhost:3000/operations \
  -H "Content-Type: application/json" \
  -d '{"receiver_id": 1, "gross_value": 1500}'
```

3. **Confirmar todas as operações:**
```bash
curl -X POST http://localhost:3000/operations/1/confirm
curl -X POST http://localhost:3000/operations/2/confirm
curl -X POST http://localhost:3000/operations/3/confirm
```

4. **Consultar o recebedor:**
```bash
curl http://localhost:3000/receivers/1
```

**Response:**
```json
{
  "id": 1,
  "name": "Pedro Oliveira",
  "balance": 2910,
  "operations": [
    {
      "id": 3,
      "receiver_id": 1,
      "gross_value": 1500,
      "fee": 45,
      "net_value": 1455,
      "status": "confirmed",
      "created_at": "2025-01-15 11:00:00"
    },
    {
      "id": 2,
      "receiver_id": 1,
      "gross_value": 500,
      "fee": 15,
      "net_value": 485,
      "status": "confirmed",
      "created_at": "2025-01-15 10:45:00"
    },
    {
      "id": 1,
      "receiver_id": 1,
      "gross_value": 1000,
      "fee": 30,
      "net_value": 970,
      "status": "confirmed",
      "created_at": "2025-01-15 10:30:00"
    }
  ]
}
```

**Nota:** O saldo total é 2910 (970 + 485 + 1455), que é a soma dos valores líquidos de todas as operações confirmadas.

## Testes

O projeto inclui testes automatizados usando Jest e Supertest. Os testes cobrem:

- Criação de operações
- Busca de operações
- Confirmação de operações
- Criação de recebedores
- Busca de recebedores com histórico
- Validações e tratamento de erros
- Cálculos de fee e net_value
- Atualização de saldo

**Executar testes:**
```bash
npm test
```

**Executar testes com cobertura:**
```bash
npm run test:coverage
```

## Tecnologias Utilizadas

- **Node.js**: Runtime JavaScript
- **Express.js**: Framework web para Node.js
- **SQLite3**: Banco de dados SQLite
- **Jest**: Framework de testes
- **Supertest**: Biblioteca para testar APIs HTTP

## Regras de Negócio Implementadas

1. **Taxa de antecipação:** 3% do valor bruto (`gross_value`)
2. **Valor líquido:** `gross_value - fee`
3. **Status da operação:** 
   - `"pending"`: Operação criada, mas não confirmada
   - `"confirmed"`: Operação confirmada e saldo atualizado
4. **Saldo do recebedor:** Soma dos valores líquidos de todas as operações confirmadas
5. **Validações:**
   - `receiver_id` e `gross_value` são obrigatórios
   - `gross_value` deve ser maior que zero
   - `name` do recebedor é obrigatório
   - Não é possível confirmar uma operação já confirmada
   - Operações são ordenadas por data (mais recente primeiro) no histórico

## Tratamento de Erros

A API retorna códigos HTTP apropriados:

- `200 OK`: Requisição bem-sucedida
- `201 Created`: Recurso criado com sucesso
- `400 Bad Request`: Dados inválidos ou operação inválida
- `404 Not Found`: Recurso não encontrado
- `500 Internal Server Error`: Erro interno do servidor

Todas as respostas de erro incluem uma mensagem descritiva no formato JSON.

## Notas Adicionais

- O banco de dados é criado automaticamente na primeira execução
- As tabelas são criadas automaticamente se não existirem
- O arquivo `db.sqlite` é gerado na raiz do projeto
- Para resetar o banco de dados, basta deletar o arquivo `db.sqlite` e reiniciar o servidor
- Os testes usam um banco de dados separado (`db.test.sqlite`) que é criado e removido automaticamente

## Conclusão

Esta solução implementa todos os requisitos do desafio:

- Banco de dados com tabelas `receivers` e `operations`
- Endpoints REST para gerenciar operações e recebedores
- Cálculo automático de fee (3%) e net_value
- Confirmação de operações e atualização de saldo
- Histórico de operações por recebedor
- Validações e tratamento de erros
- Testes automatizados
- Documentação completa

A solução é simples, eficiente e segue as melhores práticas de desenvolvimento backend com Node.js e Express.

---

**Desenvolvido para o LocPay Tech Challenge - Summer Job 2025**

