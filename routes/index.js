var express = require('express');
var router = express.Router();

router.get('/', function(req, res, next) {
  res.json({ 
    message: 'LocPay Tech Challenge API',
    version: '1.0.0',
    endpoints: {
      operations: {
        'POST /operations': 'Cria uma nova operação de antecipação',
        'GET /operations/:id': 'Retorna os dados de uma operação',
        'POST /operations/:id/confirm': 'Confirma uma operação e atualiza saldo do recebedor'
      },
      receivers: {
        'GET /receivers/:id': 'Retorna dados do recebedor (nome, saldo) e histórico de operações',
        'POST /receivers': 'Cria um novo recebedor (endpoint auxiliar para testes)'
      }
    }
  });
});

module.exports = router;
