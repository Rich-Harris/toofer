import type { Account } from './types';

export interface ParsedOTPAuth {
	type: 'totp' | 'hotp';
	label: string;
	issuer: string;
	secret: string;
	algorithm?: string;
	digits?: number;
	period?: number;
	counter?: number;
}

export function parseOTPAuthURI(uri: string): ParsedOTPAuth {
	if (!uri.startsWith('otpauth://')) {
		throw new Error('Invalid OTPAuth URI: must start with otpauth://');
	}

	const url = new URL(uri);
	const type = url.hostname as 'totp' | 'hotp';

	if (type !== 'totp' && type !== 'hotp') {
		throw new Error('Invalid OTPAuth URI: type must be totp or hotp');
	}

	// Label is in the path, URL-encoded
	// Format: /issuer:account or just /account
	let label = decodeURIComponent(url.pathname.slice(1));
	let issuer = '';
	let accountName = label;

	// Check if label contains issuer prefix (issuer:account)
	if (label.includes(':')) {
		const parts = label.split(':');
		issuer = parts[0];
		accountName = parts.slice(1).join(':');
	}

	// Get parameters
	const params = url.searchParams;
	const secret = params.get('secret');

	if (!secret) {
		throw new Error('Invalid OTPAuth URI: missing secret parameter');
	}

	// Issuer can also be in query params (takes precedence)
	if (params.has('issuer')) {
		issuer = params.get('issuer') || issuer;
	}

	// If still no issuer, use a default
	if (!issuer) {
		issuer = 'Unknown';
	}

	const result: ParsedOTPAuth = {
		type,
		label: accountName,
		issuer,
		secret: secret.toUpperCase().replace(/\s/g, '')
	};

	// Optional parameters
	if (params.has('algorithm')) {
		result.algorithm = params.get('algorithm') || undefined;
	}

	if (params.has('digits')) {
		result.digits = parseInt(params.get('digits') || '6', 10);
	}

	if (params.has('period')) {
		result.period = parseInt(params.get('period') || '30', 10);
	}

	if (params.has('counter')) {
		result.counter = parseInt(params.get('counter') || '0', 10);
	}

	return result;
}

export function otpAuthToAccount(parsed: ParsedOTPAuth): Account {
	return {
		id: crypto.randomUUID(),
		name: parsed.label,
		issuer: parsed.issuer,
		secret: parsed.secret
	};
}

export function isValidOTPAuthURI(uri: string): boolean {
	try {
		parseOTPAuthURI(uri);
		return true;
	} catch {
		return false;
	}
}
