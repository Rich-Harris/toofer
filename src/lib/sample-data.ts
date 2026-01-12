import type { Account } from './types';

// Sample accounts with test TOTP secrets
// These are valid Base32-encoded secrets for testing purposes
export const sampleAccounts: Account[] = [
	{
		id: '1',
		name: 'john.doe@gmail.com',
		issuer: 'Google',
		secret: 'JBSWY3DPEHPK3PXP'
	},
	{
		id: '2',
		name: 'johndoe',
		issuer: 'GitHub',
		secret: 'GEZDGNBVGY3TQOJQ'
	},
	{
		id: '3',
		name: 'john_doe',
		issuer: 'Twitter',
		secret: 'MFRGGZDFMY4TQMJQ'
	},
	{
		id: '4',
		name: 'john.doe@company.com',
		issuer: 'Slack',
		secret: 'NNSXS33VOQXSAZLM'
	},
	{
		id: '5',
		name: 'john.doe',
		issuer: 'Amazon',
		secret: 'KVKFKRCPNZQUYMLX'
	}
];
