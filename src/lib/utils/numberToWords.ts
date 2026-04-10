/**
 * Converts a number to standard English words (Million, Thousand, etc.)
 * Example: 4150 -> Four thousand one hundred and fifty only
 */
export function numberToWordsUSD(num: number): string {
    const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
    const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
    const scales = ['', 'thousand', 'million', 'billion'];

    if (num === 0) return 'zero';

    let numStr = Math.floor(num).toString();
    let words: string[] = [];

    // Split into groups of three
    let groups: string[] = [];
    while (numStr.length > 0) {
        groups.push(numStr.slice(-3));
        numStr = numStr.slice(0, -3);
    }

    for (let i = 0; i < groups.length; i++) {
        let n = parseInt(groups[i]);
        if (n === 0) continue;

        let groupWords: string[] = [];

        // Hundreds
        if (n >= 100) {
            groupWords.push(ones[Math.floor(n / 100)]);
            groupWords.push('hundred');
            n %= 100;
        }

        // Tens and Ones
        if (n > 0) {
            if (groupWords.length > 0) groupWords.push('and');
            if (n < 20) {
                groupWords.push(ones[n]);
            } else {
                groupWords.push(tens[Math.floor(n / 10)]);
                if (n % 10 > 0) groupWords.push(ones[n % 10]);
            }
        }

        if (scales[i]) groupWords.push(scales[i]);
        words.unshift(groupWords.join(' '));
    }

    const result = words.join(' ').trim();
    return (result.charAt(0).toUpperCase() + result.slice(1) + ' only').replace(/\s+/g, ' ');
}

/**
 * Specifically for USD to match the format in the image:
 * "USD Four thousand one hundred and fifty only"
 */
export function formatUSDAmountInWords(amount: number): string {
    if (amount === 0) return "USD Zero only";
    return `USD ${numberToWordsUSD(amount)}`;
}
