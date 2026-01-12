const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function base32Decode(encoded: string): Uint8Array {
	const cleaned = encoded.toUpperCase().replace(/[^A-Z2-7]/g, '');
	const bits: number[] = [];

	for (const char of cleaned) {
		const val = BASE32_CHARS.indexOf(char);
		if (val === -1) continue;
		for (let i = 4; i >= 0; i--) {
			bits.push((val >> i) & 1);
		}
	}

	const bytes = new Uint8Array(Math.floor(bits.length / 8));
	for (let i = 0; i < bytes.length; i++) {
		let byte = 0;
		for (let j = 0; j < 8; j++) {
			byte = (byte << 1) | bits[i * 8 + j];
		}
		bytes[i] = byte;
	}

	return bytes;
}

async function hmacSha1(key: Uint8Array, message: Uint8Array): Promise<Uint8Array> {
	const cryptoKey = await crypto.subtle.importKey(
		'raw',
		key.buffer as ArrayBuffer,
		{ name: 'HMAC', hash: 'SHA-1' },
		false,
		['sign']
	);
	const signature = await crypto.subtle.sign('HMAC', cryptoKey, message.buffer as ArrayBuffer);
	return new Uint8Array(signature);
}

function intToBytes(num: number): Uint8Array {
	const bytes = new Uint8Array(8);
	for (let i = 7; i >= 0; i--) {
		bytes[i] = num & 0xff;
		num = Math.floor(num / 256);
	}
	return bytes;
}

export async function generateTOTP(secret: string, timeStep: number = 30, digits: number = 6): Promise<string> {
	const key = base32Decode(secret);
	const time = Math.floor(Date.now() / 1000 / timeStep);
	const timeBytes = intToBytes(time);

	const hmac = await hmacSha1(key, timeBytes);
	const offset = hmac[hmac.length - 1] & 0x0f;

	const code =
		((hmac[offset] & 0x7f) << 24) |
		((hmac[offset + 1] & 0xff) << 16) |
		((hmac[offset + 2] & 0xff) << 8) |
		(hmac[offset + 3] & 0xff);

	const otp = code % Math.pow(10, digits);
	return otp.toString().padStart(digits, '0');
}

export function getTimeRemaining(timeStep: number = 30): number {
	return timeStep - (Math.floor(Date.now() / 1000) % timeStep);
}
