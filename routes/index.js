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
        'POST /operations/:id/confirm': 'Confirma uma operação'
      },
      receivers: {
        'GET /receivers/:id': 'Retorna dados do recebedor e histórico de operações'
      }
    }
  });
});

module.exports = router;
