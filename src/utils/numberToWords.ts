const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen'
];

const TENS = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'
];

function convertIntegerToWords(num: number): string {
  if (num === 0) return 'Zero';

  let words = '';

  // Crores (10,000,000+)
  if (num >= 10000000) {
    words += convertIntegerToWords(Math.floor(num / 10000000)) + ' Crore ';
    num %= 10000000;
  }

  // Lakhs (100,000 - 9,999,999)
  if (num >= 100000) {
    words += convertIntegerToWords(Math.floor(num / 100000)) + ' Lakh ';
    num %= 100000;
  }

  // Thousands (1,000 - 99,999)
  if (num >= 1000) {
    words += convertIntegerToWords(Math.floor(num / 1000)) + ' Thousand ';
    num %= 1000;
  }

  // Hundreds (100 - 999)
  if (num >= 100) {
    words += convertIntegerToWords(Math.floor(num / 100)) + ' Hundred ';
    num %= 100;
  }

  // Tens and Ones (1 - 99)
  if (num > 0) {
    if (num < 20) {
      words += ONES[num];
    } else {
      words += TENS[Math.floor(num / 10)];
      if (num % 10 > 0) {
        words += ' ' + ONES[num % 10];
      }
    }
  }

  return words.trim();
}

/**
 * Converts a numeric amount to Indian Rupee Words format
 * e.g., 87500 -> "Rupees Eighty Seven Thousand Five Hundred Only"
 * e.g., 87500.50 -> "Rupees Eighty Seven Thousand Five Hundred and Fifty Paise Only"
 */
export function convertAmountToWords(amount: number): string {
  if (isNaN(amount) || amount === 0) {
    return 'Rupees Zero Only';
  }

  // Clean the number
  const cleanAmount = Math.max(0, amount);
  const integerPart = Math.floor(cleanAmount);
  const decimalPart = Math.round((cleanAmount - integerPart) * 100);

  let result = 'Rupees ' + convertIntegerToWords(integerPart);

  if (decimalPart > 0) {
    result += ' and ' + convertIntegerToWords(decimalPart) + ' Paise';
  }

  result += ' Only';
  
  // Clean double spaces if any
  return result.replace(/\s+/g, ' ');
}
