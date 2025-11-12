var express = require('express');
var router = express.Router();
const { operations, receivers } = require('../db');

// Taxa de antecipação (3%)
const FEE_RATE = 0.03;

/**
 * POST /operations
 * Cria uma nova operação de antecipação
 * Body: { receiver_id, gross_value }
 */
router.post('/', async function(req, res, next) {
  try {
    const { receiver_id, gross_value } = req.body;

    // Validações
    if (!receiver_id) {
      return res.status(400).json({ 
        error: 'receiver_id é obrigatório' 
      });
    }

    if (!gross_value || gross_value <= 0) {
      return res.status(400).json({ 
        error: 'gross_value é obrigatório e deve ser maior que zero' 
      });
    }

    // Verificar se o recebedor existe
    const receiver = await receivers.findById(receiver_id);
    if (!receiver) {
      return res.status(404).json({ 
        error: 'Recebedor não encontrado' 
      });
    }

    // Calcular fee (3% do valor bruto)
    const fee = gross_value * FEE_RATE;
    
    // Calcular valor líquido
    const net_value = gross_value - fee;

    // Criar operação
    const operation = await operations.create(
      receiver_id,
      gross_value,
      fee,
      net_value
    );

    // Buscar operação criada com todos os dados
    const createdOperation = await operations.findById(operation.id);

    res.status(201).json(createdOperation);
  } catch (error) {
    console.error('Erro ao criar operação:', error);
    res.status(500).json({ 
      error: 'Erro ao criar operação',
      message: error.message 
    });
  }
});

/**
 * GET /operations/:id
 * Retorna os dados completos de uma operação
 */
router.get('/:id', async function(req, res, next) {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({ 
        error: 'ID inválido' 
      });
    }

    const operation = await operations.findById(id);

    if (!operation) {
      return res.status(404).json({ 
        error: 'Operação não encontrada' 
      });
    }

    res.json(operation);
  } catch (error) {
    console.error('Erro ao buscar operação:', error);
    res.status(500).json({ 
      error: 'Erro ao buscar operação',
      message: error.message 
    });
  }
});

/**
 * POST /operations/:id/confirm
 * Confirma uma operação e soma o valor líquido ao saldo do recebedor
 */
router.post('/:id/confirm', async function(req, res, next) {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({ 
        error: 'ID inválido' 
      });
    }

    // Confirmar operação
    const operation = await operations.confirm(id);

    if (!operation) {
      return res.status(404).json({ 
        error: 'Operação não encontrada' 
      });
    }

    res.json(operation);
  } catch (error) {
    console.error('Erro ao confirmar operação:', error);
    
    // Tratar erro específico de operação já confirmada
    if (error.message === 'Operação já está confirmada') {
      return res.status(400).json({ 
        error: error.message 
      });
    }

    res.status(500).json({ 
      error: 'Erro ao confirmar operação',
      message: error.message 
    });
  }
});

module.exports = router;

