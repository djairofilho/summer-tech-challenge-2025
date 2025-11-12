var express = require('express');
var router = express.Router();
const { receivers } = require('../db');

/**
 * GET /receivers/:id
 * Retorna o nome e saldo do recebedor, além do histórico de operações
 */
router.get('/:id', async function(req, res, next) {
  try {
    const id = parseInt(req.params.id);

    if (isNaN(id)) {
      return res.status(400).json({ 
        error: 'ID inválido' 
      });
    }

    // Buscar recebedor com histórico de operações
    const receiver = await receivers.findByIdWithOperations(id);

    if (!receiver) {
      return res.status(404).json({ 
        error: 'Recebedor não encontrado' 
      });
    }

    res.json(receiver);
  } catch (error) {
    console.error('Erro ao buscar recebedor:', error);
    res.status(500).json({ 
      error: 'Erro ao buscar recebedor',
      message: error.message 
    });
  }
});

/**
 * POST /receivers
 * Cria um novo recebedor (endpoint auxiliar para testes)
 * Body: { name }
 */
router.post('/', async function(req, res, next) {
  try {
    const { name } = req.body;

    // Validações
    if (!name || name.trim() === '') {
      return res.status(400).json({ 
        error: 'name é obrigatório' 
      });
    }

    // Criar recebedor
    const receiver = await receivers.create(name.trim());

    res.status(201).json(receiver);
  } catch (error) {
    console.error('Erro ao criar recebedor:', error);
    res.status(500).json({ 
      error: 'Erro ao criar recebedor',
      message: error.message 
    });
  }
});

module.exports = router;

