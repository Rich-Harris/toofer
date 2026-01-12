export interface Account {
	id: string;
	name: string;
	issuer: string;
	secret: string; // Base32 encoded TOTP secret
}

export interface EncryptedVault {
	iv: string; // Base64 encoded IV
	data: string; // Base64 encoded encrypted data
	salt: string; // Base64 encoded salt for key derivation
}

export interface AppState {
	unlocked: boolean;
	accounts: Account[];
}
