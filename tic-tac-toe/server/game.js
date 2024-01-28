
// Класс игры "крестики-нолики"
class TicTacToeGame {
    constructor(size) {
      this.size = size;
      this.winningCombos = this.generateWinningCombos(size);
    }
  
    generateWinningCombos() { 
        const winningCombos = [];
        const size = this.size;
        // Rows (Горизонтали)
        for (let i = 0; i < size; i++) {
          winningCombos.push(Array.from({ length: size }, (_, j) => i * size + j));
        }
    
        // Columns (Вертикали)
        for (let i = 0; i < size; i++) {
          winningCombos.push(Array.from({ length: size }, (_, j) => i + j * size));
        }
    
        // Diagonals (Диагонали)
        winningCombos.push(Array.from({ length: size }, (_, i) => i * (size + 1)));  // Главная диагональ
        winningCombos.push(Array.from({ length: size }, (_, i) => (size - 1) * (i + 1)));  // Побочная диагональ
    
        return winningCombos;
      }
    
      renewSize(size){
        this.generateWinningCombos;
        this.size=size;
      }
    
      checkWin(field) {
        const winningCombos = this.winningCombos;
        // Проверка по горизонтали, вертикали и диагонали
        const checkCombo = (combo) => {
          const symbols = combo.map(index => field[index]);
          return symbols.every(symbol => symbol !== "" && symbol === symbols[0]);
        };
        return winningCombos.some(combo => checkCombo(combo));
      }
    
      checkDraw(field) {
        // Проверяем, что все ячейки заполнены
        const isFieldFilled = field.every(symbol => symbol === "X" || symbol === "O");
      
        // Если поле заполнено и при этом нет победителя, то это ничья
        return isFieldFilled && !this.checkWin(field);
      }
  }

  module.exports=TicTacToeGame;