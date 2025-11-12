/**
 * Serviço para lógica de negócio de operações
 */

// Taxa de antecipação (3%)
const FEE_RATE = 0.03;

/**
 * Calcula a taxa de antecipação (3% do valor bruto)
 * @param {number} grossValue - Valor bruto da operação
 * @returns {number} - Taxa calculada
 */
function calculateFee(grossValue) {
  if (typeof grossValue !== 'number' || grossValue <= 0) {
    throw new Error('Valor bruto inválido');
  }
  return grossValue * FEE_RATE;
}

/**
 * Calcula o valor líquido (valor bruto - taxa)
 * @param {number} grossValue - Valor bruto da operação
 * @param {number} fee - Taxa de antecipação
 * @returns {number} - Valor líquido calculado
 */
function calculateNetValue(grossValue, fee) {
  if (typeof grossValue !== 'number' || grossValue <= 0) {
    throw new Error('Valor bruto inválido');
  }
  if (typeof fee !== 'number' || fee < 0) {
    throw new Error('Taxa inválida');
  }
  return grossValue - fee;
}

/**
 * Calcula fee e net_value a partir do valor bruto
 * @param {number} grossValue - Valor bruto da operação
 * @returns {Object} - Objeto com fee e net_value calculados
 */
function calculateOperationValues(grossValue) {
  const fee = calculateFee(grossValue);
  const netValue = calculateNetValue(grossValue, fee);
  
  return {
    fee,
    netValue
  };
}

/**
 * Valida se uma operação pode ser confirmada
 * @param {Object} operation - Operação a ser validada
 * @throws {Error} - Se a operação não puder ser confirmada
 */
function validateOperationForConfirmation(operation) {
  if (!operation) {
    throw new Error('Operação não encontrada');
  }
  
  if (operation.status === 'confirmed') {
    throw new Error('Operação já está confirmada');
  }
  
  if (operation.status !== 'pending') {
    throw new Error('Operação em estado inválido para confirmação');
  }
}

/**
 * Valida os dados de entrada para criação de operação
 * @param {number|string} receiverId - ID do recebedor
 * @param {number|string} grossValue - Valor bruto
 * @throws {Error} - Se os dados forem inválidos
 */
function validateOperationInput(receiverId, grossValue) {
  if (receiverId === null || receiverId === undefined || receiverId === '') {
    throw new Error('receiver_id é obrigatório');
  }
  
  // Converter para número se for string
  const receiverIdNum = typeof receiverId === 'string' ? parseInt(receiverId) : receiverId;
  if (isNaN(receiverIdNum) || receiverIdNum <= 0) {
    throw new Error('receiver_id deve ser um número válido');
  }
  
  if (grossValue === null || grossValue === undefined || grossValue === '') {
    throw new Error('gross_value é obrigatório e deve ser maior que zero');
  }
  
  // Converter para número se for string
  const grossValueNum = typeof grossValue === 'string' ? parseFloat(grossValue) : grossValue;
  if (isNaN(grossValueNum) || grossValueNum <= 0) {
    throw new Error('gross_value é obrigatório e deve ser maior que zero');
  }
}

module.exports = {
  FEE_RATE,
  calculateFee,
  calculateNetValue,
  calculateOperationValues,
  validateOperationForConfirmation,
  validateOperationInput
};

