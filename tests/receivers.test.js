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

describe('Rotas de Recebedores', () => {
  let app;
  let receiverId;
  let receivers;
  let operations;
  let receiversRouter;

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
    receiversRouter = require('../routes/receivers');
    const operationsRouter = require('../routes/operations');

    // Criar aplicação Express para testes
    app = express();
    app.use(logger('dev'));
    app.use(express.json());
    app.use(express.urlencoded({ extended: false }));
    app.use(cookieParser());
    app.use('/receivers', receiversRouter);
    app.use('/operations', operationsRouter); // Necessário para criar operações nos testes

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

  describe('GET /receivers/:id', () => {
    test('deve retornar recebedor com histórico de operações vazio', async () => {
      const response = await request(app)
        .get(`/receivers/${receiverId}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', receiverId);
      expect(response.body).toHaveProperty('name', 'Recebedor Teste');
      expect(response.body).toHaveProperty('balance', 0);
      expect(response.body).toHaveProperty('operations');
      expect(Array.isArray(response.body.operations)).toBe(true);
      expect(response.body.operations).toHaveLength(0);
    });

    test('deve retornar recebedor com histórico de operações', async () => {
      // Criar algumas operações
      const operation1 = await operations.create(receiverId, 1000, 30, 970);
      const operation2 = await operations.create(receiverId, 500, 15, 485);

      const response = await request(app)
        .get(`/receivers/${receiverId}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', receiverId);
      expect(response.body).toHaveProperty('name', 'Recebedor Teste');
      expect(response.body).toHaveProperty('balance', 0);
      expect(response.body).toHaveProperty('operations');
      expect(response.body.operations).toHaveLength(2);
      
      // Verificar se as operações estão no histórico
      const operationIds = response.body.operations.map(op => op.id);
      expect(operationIds).toContain(operation1.id);
      expect(operationIds).toContain(operation2.id);
    });

    test('deve retornar histórico ordenado por data (mais recente primeiro)', async () => {
      // Criar operações com pequeno delay para garantir timestamps diferentes
      const operation1 = await operations.create(receiverId, 1000, 30, 970);
      await new Promise(resolve => setTimeout(resolve, 10));
      const operation2 = await operations.create(receiverId, 500, 15, 485);
      await new Promise(resolve => setTimeout(resolve, 10));
      const operation3 = await operations.create(receiverId, 2000, 60, 1940);

      const response = await request(app)
        .get(`/receivers/${receiverId}`)
        .expect(200);

      expect(response.body.operations).toHaveLength(3);
      
      // Verificar se está ordenado (mais recente primeiro)
      // A operação mais recente deve ser a primeira
      expect(response.body.operations[0].id).toBe(operation3.id);
      expect(response.body.operations[1].id).toBe(operation2.id);
      expect(response.body.operations[2].id).toBe(operation1.id);
    });

    test('deve retornar recebedor com saldo atualizado após confirmar operações', async () => {
      // Criar operação
      const operation = await operations.create(receiverId, 1000, 30, 970);
      
      // Confirmar operação
      await operations.confirm(operation.id);

      const response = await request(app)
        .get(`/receivers/${receiverId}`)
        .expect(200);

      expect(response.body).toHaveProperty('balance', 970);
      expect(response.body.operations).toHaveLength(1);
      expect(response.body.operations[0].status).toBe('confirmed');
    });

    test('deve retornar erro 404 quando recebedor não existe', async () => {
      const response = await request(app)
        .get('/receivers/99999')
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Recebedor não encontrado');
    });

    test('deve retornar erro 400 quando ID for inválido', async () => {
      const response = await request(app)
        .get('/receivers/abc')
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('ID inválido');
    });

    test('deve retornar todas as propriedades das operações no histórico', async () => {
      // Criar operação
      const operation = await operations.create(receiverId, 1000, 30, 970);

      const response = await request(app)
        .get(`/receivers/${receiverId}`)
        .expect(200);

      expect(response.body.operations).toHaveLength(1);
      const operationInHistory = response.body.operations[0];
      
      expect(operationInHistory).toHaveProperty('id');
      expect(operationInHistory).toHaveProperty('receiver_id', receiverId);
      expect(operationInHistory).toHaveProperty('gross_value', 1000);
      expect(operationInHistory).toHaveProperty('fee', 30);
      expect(operationInHistory).toHaveProperty('net_value', 970);
      expect(operationInHistory).toHaveProperty('status', 'pending');
      expect(operationInHistory).toHaveProperty('created_at');
    });
  });

  describe('POST /receivers', () => {
    test('deve criar um novo recebedor com saldo zero', async () => {
      const response = await request(app)
        .post('/receivers')
        .send({
          name: 'Novo Recebedor'
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('name', 'Novo Recebedor');
      expect(response.body).toHaveProperty('balance', 0);
    });

    test('deve retornar erro 400 quando name não for fornecido', async () => {
      const response = await request(app)
        .post('/receivers')
        .send({})
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('name é obrigatório');
    });

    test('deve retornar erro 400 quando name estiver vazio', async () => {
      const response = await request(app)
        .post('/receivers')
        .send({
          name: ''
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('name é obrigatório');
    });

    test('deve retornar erro 400 quando name contiver apenas espaços', async () => {
      const response = await request(app)
        .post('/receivers')
        .send({
          name: '   '
        })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('name é obrigatório');
    });

    test('deve fazer trim no name antes de criar', async () => {
      const response = await request(app)
        .post('/receivers')
        .send({
          name: '  Recebedor com Espaços  '
        })
        .expect(201);

      expect(response.body).toHaveProperty('name', 'Recebedor com Espaços');
    });

    test('deve criar recebedor e poder ser consultado via GET', async () => {
      // Criar recebedor
      const createResponse = await request(app)
        .post('/receivers')
        .send({
          name: 'Recebedor Consultado'
        })
        .expect(201);

      const receiverId = createResponse.body.id;

      // Buscar recebedor criado
      const getResponse = await request(app)
        .get(`/receivers/${receiverId}`)
        .expect(200);

      expect(getResponse.body).toHaveProperty('id', receiverId);
      expect(getResponse.body).toHaveProperty('name', 'Recebedor Consultado');
      expect(getResponse.body).toHaveProperty('balance', 0);
    });

    test('deve criar múltiplos recebedores com IDs diferentes', async () => {
      const receiver1 = await request(app)
        .post('/receivers')
        .send({ name: 'Recebedor 1' })
        .expect(201);

      const receiver2 = await request(app)
        .post('/receivers')
        .send({ name: 'Recebedor 2' })
        .expect(201);

      expect(receiver1.body.id).not.toBe(receiver2.body.id);
      expect(receiver1.body.name).toBe('Recebedor 1');
      expect(receiver2.body.name).toBe('Recebedor 2');
    });
  });
});

