var express = require('express');
var router = express.Router();
const { operations, receivers } = require('../db');
const operationService = require('../services/operationService');

/**
 * POST /operations
 * Cria uma nova operação de antecipação
 * Body: { receiver_id, gross_value }
 */
router.post('/', async function(req, res, next) {
  try {
    const { receiver_id, gross_value } = req.body;

    // Validar dados de entrada
    try {
      operationService.validateOperationInput(receiver_id, gross_value);
    } catch (validationError) {
      return res.status(400).json({ 
        error: validationError.message 
      });
    }

    // Converter para número
    const receiverId = parseInt(receiver_id);
    const grossValue = parseFloat(gross_value);

    // Verificar se o recebedor existe
    const receiver = await receivers.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ 
        error: 'Recebedor não encontrado' 
      });
    }

    // Calcular fee e net_value usando o serviço
    const { fee, netValue } = operationService.calculateOperationValues(grossValue);
    const net_value = netValue;

    // Criar operação
    const operation = await operations.create(
      receiverId,
      grossValue,
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

    // Buscar operação antes de confirmar para validar
    const operation = await operations.findById(id);
    
    if (!operation) {
      return res.status(404).json({ 
        error: 'Operação não encontrada' 
      });
    }

    // Validar se a operação pode ser confirmada
    try {
      operationService.validateOperationForConfirmation(operation);
    } catch (validationError) {
      return res.status(400).json({ 
        error: validationError.message 
      });
    }

    // Confirmar operação
    const confirmedOperation = await operations.confirm(id);

    res.json(confirmedOperation);
  } catch (error) {
    console.error('Erro ao confirmar operação:', error);
    
    res.status(500).json({ 
      error: 'Erro ao confirmar operação',
      message: error.message 
    });
  }
});

module.exports = router;

