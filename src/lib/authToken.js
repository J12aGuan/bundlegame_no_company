function hashSeed(seed = '') {
	let hash = 0;
	for (let i = 0; i < seed.length; i += 1) {
		hash = (hash * 31 + seed.charCodeAt(i)) % 2147483647;
	}
	return hash;
}

function seededRandom(seed) {
	let x = seed % 2147483647;
	if (x <= 0) x += 2147483646;
	return function nextRandom() {
		x = (x * 16807) % 2147483647;
		return (x - 1) / 2147483646;
	};
}

function digitToHex(digit) {
	switch (digit) {
		case 10:
			return 'A';
		case 11:
			return 'B';
		case 12:
			return 'C';
		case 13:
			return 'D';
		case 14:
			return 'E';
		case 15:
			return 'F';
		default:
			return String(digit);
	}
}

function generateNumber(random, modulo) {
	const first3Digits = [];
	for (let i = 0; i < 3; i += 1) {
		first3Digits.push(Math.floor(random() * 16));
	}

	let total = 0;
	for (let i = 0; i < first3Digits.length; i += 1) {
		let digit = first3Digits[i];
		if (i === 1) {
			digit *= 2;
			if (digit > 15) {
				digit -= 15;
			}
		}
		total += digit;
		first3Digits[i] = digitToHex(digit);
	}

	const checksumDigit = digitToHex(((16 - (total % 16)) + modulo) % 16);
	first3Digits.push(checksumDigit);
	return first3Digits.join('');
}

export function generateAuthToken(id = '') {
	const normalizedId = String(id ?? '');
	const seed = hashSeed(normalizedId);
	const random = seededRandom(seed);
	const first = generateNumber(random, 11);
	const second = generateNumber(random, 0);
	const third = generateNumber(random, 11);
	const fourth = generateNumber(random, 10);
	return `${first}-${second}-${third}-${fourth}`;
}
