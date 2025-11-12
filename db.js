const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Caminho para o arquivo do banco de dados
// Em modo de teste, usa banco de teste
const DB_PATH = process.env.TEST_DB_PATH || path.join(__dirname, 'db_testn.sqlite');

// Variável para armazenar a conexão do banco
let db;

// Funções helper para converter callbacks em promessas
function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ lastID: this.lastID, changes: this.changes });
      }
    });
  });
}

function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

// Criar conexão com o banco de dados
db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Erro ao conectar ao banco de dados:', err.message);
  } else {
    console.log('Conectado ao banco de dados SQLite.');
    initializeDatabase();
  }
});

// Função para inicializar o banco de dados
async function initializeDatabase() {
  try {
    // Criar tabela de recebedores
    await dbRun(`
      CREATE TABLE IF NOT EXISTS receivers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        balance REAL DEFAULT 0
      )
    `);
    console.log('Tabela receivers criada/verificada com sucesso.');

    // Criar tabela de operações
    await dbRun(`
      CREATE TABLE IF NOT EXISTS operations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        receiver_id INTEGER NOT NULL,
        gross_value REAL NOT NULL,
        fee REAL NOT NULL,
        net_value REAL NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (receiver_id) REFERENCES receivers(id)
      )
    `);
    console.log('Tabela operations criada/verificada com sucesso.');
  } catch (err) {
    console.error('Erro ao inicializar banco de dados:', err.message);
  }
}

// Funções para operações com recebedores
const receivers = {
  // Criar um novo recebedor
  create: async (name) => {
    const result = await dbRun('INSERT INTO receivers (name, balance) VALUES (?, ?)', [name, 0]);
    return { id: result.lastID, name, balance: 0 };
  },

  // Buscar recebedor por ID
  findById: async (id) => {
    return await dbGet('SELECT * FROM receivers WHERE id = ?', [id]);
  },

  // Atualizar saldo do recebedor
  updateBalance: async (id, newBalance) => {
    await dbRun('UPDATE receivers SET balance = ? WHERE id = ?', [newBalance, id]);
  },

  // Buscar recebedor com operações
  findByIdWithOperations: async (id) => {
    const receiver = await dbGet('SELECT * FROM receivers WHERE id = ?', [id]);
    if (!receiver) {
      return null;
    }
    const operations = await dbAll(
      'SELECT * FROM operations WHERE receiver_id = ? ORDER BY created_at DESC',
      [id]
    );
    return {
      ...receiver,
      operations
    };
  }
};

// Funções para operações
const operations = {
  // Criar uma nova operação
  create: async (receiverId, grossValue, fee, netValue) => {
    const result = await dbRun(
      'INSERT INTO operations (receiver_id, gross_value, fee, net_value, status) VALUES (?, ?, ?, ?, ?)',
      [receiverId, grossValue, fee, netValue, 'pending']
    );
    return {
      id: result.lastID,
      receiver_id: receiverId,
      gross_value: grossValue,
      fee: fee,
      net_value: netValue,
      status: 'pending'
    };
  },

  // Buscar operação por ID
  findById: async (id) => {
    return await dbGet('SELECT * FROM operations WHERE id = ?', [id]);
  },

  // Confirmar operação
  confirm: async (id) => {
    const operation = await dbGet('SELECT * FROM operations WHERE id = ?', [id]);
    if (!operation) {
      return null;
    }
    if (operation.status === 'confirmed') {
      throw new Error('Operação já está confirmada');
    }
    
    // Atualizar status da operação
    await dbRun('UPDATE operations SET status = ? WHERE id = ?', ['confirmed', id]);
    
    // Atualizar saldo do recebedor
    const receiver = await dbGet('SELECT * FROM receivers WHERE id = ?', [operation.receiver_id]);
    if (!receiver) {
      throw new Error('Recebedor não encontrado');
    }
    const newBalance = receiver.balance + operation.net_value;
    await receivers.updateBalance(operation.receiver_id, newBalance);
    
    // Retornar operação atualizada
    return await dbGet('SELECT * FROM operations WHERE id = ?', [id]);
  }
};

// Fechar conexão quando o processo terminar
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error('Erro ao fechar o banco de dados:', err.message);
    } else {
      console.log('Conexão com o banco de dados fechada.');
    }
    process.exit(0);
  });
});

module.exports = {
  db,
  receivers,
  operations
};

