const request = require('supertest');
const express = require('express');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const path = require('path');
const fs = require('fs');

// Definir variável de ambiente para usar banco de teste ANTES de importar qualquer módulo
const TEST_DB_PATH = path.join(__dirname, '..', 'db.test.sqlite');
process.env.TEST_DB_PATH = TEST_DB_PATH;

// Remover banco de teste existente se houver
if (fs.existsSync(TEST_DB_PATH)) {
  try {
    fs.unlinkSync(TEST_DB_PATH);
  } catch (err) {
    // Ignorar erro se arquivo não existir ou estiver em uso
  }
}

describe('Rotas de Operações', () => {
  let app;
  let receiverId;
  let receivers;
  let operations;
  let operationsRouter;

  // Função helper para limpar banco de dados
  async function cleanupDatabase() {
    const dbModule = require('../db');
    const db = dbModule.db;
    
    return new Promise((resolve, reject) => {
      db.run('DELETE FROM operations', (err) => {
        if (err) {
          // Se a tabela não existir, ignora o erro
          if (err.message && err.message.includes('no such table')) {
            db.run('DELETE FROM receivers', (err2) => {
              if (err2 && err2.message && !err2.message.includes('no such table')) {
                return reject(err2);
              }
              resolve();
            });
          } else {
            return reject(err);
          }
        } else {
          db.run('DELETE FROM receivers', (err2) => {
            if (err2) {
              // Se a tabela não existir, ignora o erro
              if (err2.message && err2.message.includes('no such table')) {
                resolve();
              } else {
                return reject(err2);
              }
            } else {
              resolve();
            }
          });
        }
      });
    });
  }

  // Setup antes de todos os testes
  beforeAll(async () => {
    // Importar módulos (a variável de ambiente já foi definida no início do arquivo)
    const dbModule = require('../db');
    receivers = dbModule.receivers;
    operations = dbModule.operations;
    operationsRouter = require('../routes/operations');

    // Criar aplicação Express para testes
    app = express();
    app.use(logger('dev'));
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    app.use(cookieParser());
    app.use('/operations', operationsRouter);

    // Aguardar um pouco para o banco inicializar (as tabelas são criadas assincronamente)
    await new Promise(resolve => setTimeout(resolve, 500));
  });

  // Limpar banco de dados e criar recebedor antes de cada teste
  beforeEach(async () => {
    await cleanupDatabase();
    // Criar um recebedor de teste
    const receiver = await receivers.create('Recebedor Teste');
    receiverId = receiver.id;
  });

  // Limpar banco após todos os testes
  afterAll(async () => {
    return new Promise((resolve) => {
      // Remover arquivo do banco de teste
      if (fs.existsSync(TEST_DB_PATH)) {
        const dbModule = require('../db');
        const db = dbModule.db;
        
        db.close((err) => {
          if (err) {
            console.error('Erro ao fechar banco:', err);
          }
          // Aguardar um pouco antes de remover o arquivo
          setTimeout(() => {
            try {
              if (fs.existsSync(TEST_DB_PATH)) {
                fs.unlinkSync(TEST_DB_PATH);
              }
            } catch (err) {
              // Ignorar erro se arquivo estiver em uso ou não existir
              console.warn('Aviso ao remover arquivo de teste:', err.message);
            }
            resolve();
          }, 200);
        });
      } else {
        resolve();
      }
    });
  });

  describe('POST /operations', () => {
    test('deve criar uma nova operação com status pending', async () => {
      const response = await request(app)
        .post('/operations')
        .send({
          receiver_id: receiverId,
          gross_value: 1000
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.receiver_id).toBe(receiverId);
      expect(response.body.gross_value).toBe(1000);
      expect(response.body.fee).toBe(30); // 3% de 1000
      expect(response.body.net_value).toBe(970); // 1000 - 30
      expect(response.body.status).toBe('pending');
      
      operationId = response.body.id;
    });

    test('deve calcular corretamente fee (3%) e net_value', async () => {
      const grossValue = 2000;
      const expectedFee = grossValue * 0.03;
      const expectedNetValue = grossValue - expectedFee;

      const response = await request(app)
        .post('/operations')
        .send({
          receiver_id: receiverId,
          gross_value: grossValue
        })
        .expect(201);

      expect(response.body.fee).toBe(expectedFee);
      expect(response.body.net_value).toBe(expectedNetValue);
    });

    test('deve retornar erro 400 quando receiver_id não for fornecido', async () => {
      const response = await request(app)
        .post('/operations')
        .send({
          gross_value: 1000
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('receiver_id é obrigatório');
    });

    test('deve retornar erro 400 quando gross_value não for fornecido', async () => {
      const response = await request(app)
        .post('/operations')
        .send({
          receiver_id: receiverId
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('gross_value é obrigatório e deve ser maior que zero');
    });

    test('deve retornar erro 400 quando gross_value for menor ou igual a zero', async () => {
      const response = await request(app)
        .post('/operations')
        .send({
          receiver_id: receiverId,
          gross_value: 0
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    test('deve retornar erro 404 quando receiver_id não existir', async () => {
      const response = await request(app)
        .post('/operations')
        .send({
          receiver_id: 99999,
          gross_value: 1000
        })
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Recebedor não encontrado');
    });
  });

  describe('GET /operations/:id', () => {
    test('deve retornar uma operação existente', async () => {
      // Criar uma operação primeiro
      const createResponse = await request(app)
        .post('/operations')
        .send({
          receiver_id: receiverId,
          gross_value: 1000
        })
        .expect(201);

      const operationId = createResponse.body.id;

      // Buscar a operação
      const response = await request(app)
        .get(`/operations/${operationId}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', operationId);
      expect(response.body.receiver_id).toBe(receiverId);
      expect(response.body.gross_value).toBe(1000);
      expect(response.body.status).toBe('pending');
    });

    test('deve retornar erro 404 quando operação não existir', async () => {
      const response = await request(app)
        .get('/operations/99999')
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Operação não encontrada');
    });

    test('deve retornar erro 400 quando ID for inválido', async () => {
      const response = await request(app)
        .get('/operations/abc')
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('ID inválido');
    });
  });

  describe('POST /operations/:id/confirm', () => {
    test('deve confirmar uma operação e atualizar saldo do recebedor', async () => {
      // Criar uma operação primeiro
      const createResponse = await request(app)
        .post('/operations')
        .send({
          receiver_id: receiverId,
          gross_value: 1000
        })
        .expect(201);

      const operationId = createResponse.body.id;
      const netValue = createResponse.body.net_value;

      // Buscar saldo inicial do recebedor
      const receiverBefore = await receivers.findById(receiverId);
      const initialBalance = receiverBefore.balance;

      // Confirmar a operação
      const response = await request(app)
        .post(`/operations/${operationId}/confirm`)
        .expect(200);

      expect(response.body).toHaveProperty('id', operationId);
      expect(response.body.status).toBe('confirmed');

      // Verificar se o saldo do recebedor foi atualizado
      const receiverAfter = await receivers.findById(receiverId);
      expect(receiverAfter.balance).toBe(initialBalance + netValue);
    });

    test('deve retornar erro 400 ao tentar confirmar operação já confirmada', async () => {
      // Criar e confirmar uma operação
      const createResponse = await request(app)
        .post('/operations')
        .send({
          receiver_id: receiverId,
          gross_value: 1000
        })
        .expect(201);

      const operationId = createResponse.body.id;

      // Confirmar pela primeira vez
      await request(app)
        .post(`/operations/${operationId}/confirm`)
        .expect(200);

      // Tentar confirmar novamente
      const response = await request(app)
        .post(`/operations/${operationId}/confirm`)
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Operação já está confirmada');
    });

    test('deve retornar erro 404 quando operação não existir', async () => {
      const response = await request(app)
        .post('/operations/99999/confirm')
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Operação não encontrada');
    });

    test('deve retornar erro 400 quando ID for inválido', async () => {
      const response = await request(app)
        .post('/operations/abc/confirm')
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('ID inválido');
    });

    test('deve atualizar saldo corretamente com múltiplas confirmações', async () => {
      // Criar duas operações
      const operation1 = await request(app)
        .post('/operations')
        .send({
          receiver_id: receiverId,
          gross_value: 1000
        })
        .expect(201);

      const operation2 = await request(app)
        .post('/operations')
        .send({
          receiver_id: receiverId,
          gross_value: 500
        })
        .expect(201);

      const netValue1 = operation1.body.net_value; // 970
      const netValue2 = operation2.body.net_value; // 485

      // Buscar saldo inicial
      const receiverBefore = await receivers.findById(receiverId);
      const initialBalance = receiverBefore.balance;

      // Confirmar primeira operação
      await request(app)
        .post(`/operations/${operation1.body.id}/confirm`)
        .expect(200);

      // Verificar saldo após primeira confirmação
      const receiverAfter1 = await receivers.findById(receiverId);
      expect(receiverAfter1.balance).toBe(initialBalance + netValue1);

      // Confirmar segunda operação
      await request(app)
        .post(`/operations/${operation2.body.id}/confirm`)
        .expect(200);

      // Verificar saldo após segunda confirmação
      const receiverAfter2 = await receivers.findById(receiverId);
      expect(receiverAfter2.balance).toBe(initialBalance + netValue1 + netValue2);
    });
  });
});

