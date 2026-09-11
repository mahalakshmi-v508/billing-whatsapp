/* Convert an amount to English words using the Indian numbering system
   (crore → lakh → thousand → hundred), e.g. 1250 → "One Thousand Two Hundred Fifty Rupees only". */
export function numberToWordsINR(amount) {
  if (!amount || isNaN(amount) || amount === 0) return "Zero Rupees only";
  const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const inWords = (n) => {
    let str = "";
    if (n > 99) {
      str += a[Math.floor(n / 100)] + "Hundred ";
      n %= 100;
    }
    if (n > 19) {
      str += b[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + a[n % 10] : " ");
    } else if (n > 0) {
      str += a[n];
    }
    return str;
  };

  let num = Math.floor(Math.abs(amount));
  let crore = Math.floor(num / 10000000);
  num %= 10000000;
  let lakh = Math.floor(num / 100000);
  num %= 100000;
  let thousand = Math.floor(num / 1000);
  num %= 1000;
  let hundred = num;

  let res = "";
  if (crore > 0) res += inWords(crore) + "Crore ";
  if (lakh > 0) res += inWords(lakh) + "Lakh ";
  if (thousand > 0) res += inWords(thousand) + "Thousand ";
  if (hundred > 0) res += inWords(hundred);

  return (res.trim() || "Zero") + " Rupees only";
}