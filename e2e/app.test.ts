import { test, expect } from '@playwright/test';

test.describe('Toofer', () => {
	test.beforeEach(async ({ page }) => {
		// Clear localStorage before each test
		await page.goto('/');
		await page.evaluate(() => localStorage.clear());
		await page.reload();
	});

	test.describe('vault creation', () => {
		test('shows create vault screen when no vaults exist', async ({ page }) => {
			await page.goto('/');

			await expect(page.getByRole('heading', { name: 'Toofer' })).toBeVisible();
			await expect(page.getByText('Create a new vault')).toBeVisible();
			await expect(page.getByLabel('Vault Name')).toBeVisible();
		});

		test('creates a new vault', async ({ page }) => {
			await page.goto('/');

			await page.getByLabel('Vault Name').fill('Personal');
			await page.getByLabel('Passphrase', { exact: true }).fill('testpass123');
			await page.getByLabel('Confirm Passphrase').fill('testpass123');
			await page.getByRole('button', { name: 'Create Vault' }).click();

			// Should show the main app with empty state
			await expect(page.getByText('No accounts yet')).toBeVisible();
		});

		test('shows error when passphrases do not match', async ({ page }) => {
			await page.goto('/');

			await page.getByLabel('Vault Name').fill('Test');
			await page.getByLabel('Passphrase', { exact: true }).fill('pass1');
			await page.getByLabel('Confirm Passphrase').fill('pass2');
			await page.getByRole('button', { name: 'Create Vault' }).click();

			await expect(page.getByText('Passphrases do not match')).toBeVisible();
		});
	});

	test.describe('vault unlock', () => {
		test.beforeEach(async ({ page }) => {
			// Create a vault first
			await page.goto('/');
			await page.getByLabel('Vault Name').fill('Test Vault');
			await page.getByLabel('Passphrase', { exact: true }).fill('testpass');
			await page.getByLabel('Confirm Passphrase').fill('testpass');
			await page.getByRole('button', { name: 'Create Vault' }).click();
			await expect(page.getByText('No accounts yet')).toBeVisible();

			// Lock the vault
			await page.getByRole('button', { name: 'Lock' }).click();
		});

		test('unlocks vault with correct passphrase', async ({ page }) => {
			await expect(page.getByText('Unlock your vault')).toBeVisible();
			await page.locator('#passphrase').fill('testpass');
			await page.getByRole('button', { name: 'Unlock' }).click();

			await expect(page.getByText('No accounts yet')).toBeVisible();
		});

		test('shows error with wrong passphrase', async ({ page }) => {
			await page.locator('#passphrase').fill('wrongpass');
			await page.getByRole('button', { name: 'Unlock' }).click();

			await expect(page.getByText('Invalid passphrase')).toBeVisible();
		});
	});

	test.describe('account management', () => {
		test.beforeEach(async ({ page }) => {
			// Create and unlock a vault
			await page.goto('/');
			await page.getByLabel('Vault Name').fill('Test');
			await page.getByLabel('Passphrase', { exact: true }).fill('test');
			await page.getByLabel('Confirm Passphrase').fill('test');
			await page.getByRole('button', { name: 'Create Vault' }).click();
			await expect(page.getByText('No accounts yet')).toBeVisible();
		});

		test('adds account via manual entry', async ({ page }) => {
			await page.getByRole('main').getByRole('button', { name: 'Add Account' }).click();

			// Switch to manual entry
			await page.getByRole('button', { name: 'Enter Manually Instead' }).click();

			// Fill in the form
			await page.getByLabel('Service Name').fill('GitHub');
			await page.getByLabel('Account Name').fill('test@example.com');
			await page.getByLabel('Secret Key').fill('JBSWY3DPEHPK3PXP');
			await page.getByRole('dialog').getByRole('button', { name: 'Add Account' }).click();

			// Should navigate to account detail page
			await expect(page.getByRole('heading', { name: 'GitHub' })).toBeVisible();
			await expect(page.getByText('test@example.com')).toBeVisible();
		});

		test('shows OTP code on account detail page', async ({ page }) => {
			// Add an account
			await page.getByRole('main').getByRole('button', { name: 'Add Account' }).click();
			await page.getByRole('button', { name: 'Enter Manually Instead' }).click();
			await page.getByLabel('Service Name').fill('GitHub');
			await page.getByLabel('Account Name').fill('user@test.com');
			await page.getByLabel('Secret Key').fill('JBSWY3DPEHPK3PXP');
			await page.getByRole('dialog').getByRole('button', { name: 'Add Account' }).click();

			// Should show a 6-digit OTP code (formatted as XXX XXX)
			const otpDisplay = page.locator('.otp-value');
			await expect(otpDisplay).toBeVisible();
			await expect(otpDisplay).toHaveText(/^\d{3} \d{3}$/);
		});

		test('shows account in list after adding', async ({ page }) => {
			// Add an account
			await page.getByRole('main').getByRole('button', { name: 'Add Account' }).click();
			await page.getByRole('button', { name: 'Enter Manually Instead' }).click();
			await page.getByLabel('Service Name').fill('Google');
			await page.getByLabel('Account Name').fill('myaccount@gmail.com');
			await page.getByLabel('Secret Key').fill('HXDMVJECJJWSRB3HWIZR4IFUGFTMXBOZ');
			await page.getByRole('dialog').getByRole('button', { name: 'Add Account' }).click();

			// Go back to home
			await page.getByRole('link', { name: 'Toofer' }).click();

			// Should show the account in the list
			await expect(page.getByRole('main').getByText('Google')).toBeVisible();
			await expect(page.getByRole('main').getByText('myaccount@gmail.com')).toBeVisible();
		});

		test('validates secret key format', async ({ page }) => {
			await page.getByRole('main').getByRole('button', { name: 'Add Account' }).click();
			await page.getByRole('button', { name: 'Enter Manually Instead' }).click();

			await page.getByLabel('Service Name').fill('Test');
			await page.getByLabel('Account Name').fill('test');
			await page.getByLabel('Secret Key').fill('invalid!secret');
			await page.getByRole('dialog').getByRole('button', { name: 'Add Account' }).click();

			await expect(page.getByText('Invalid secret key format')).toBeVisible();
		});
	});

	test.describe('settings', () => {
		test.beforeEach(async ({ page }) => {
			await page.goto('/');
			await page.getByLabel('Vault Name').fill('My Vault');
			await page.getByLabel('Passphrase', { exact: true }).fill('pass');
			await page.getByLabel('Confirm Passphrase').fill('pass');
			await page.getByRole('button', { name: 'Create Vault' }).click();
			await expect(page.getByText('No accounts yet')).toBeVisible();
		});

		test('opens and closes settings panel', async ({ page }) => {
			await page.getByRole('button', { name: 'Settings' }).click();
			await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();

			// Close by clicking settings again
			await page.getByRole('button', { name: 'Settings' }).click();
			await expect(page.getByRole('heading', { name: 'Settings' })).not.toBeVisible();
		});

		test('renames vault', async ({ page }) => {
			await page.getByRole('button', { name: 'Settings' }).click();

			// Click the rename button (shows current vault name)
			await page.getByRole('button', { name: 'My Vault' }).click();

			// Fill in new name and save
			await page.getByRole('textbox', { name: 'Vault name' }).fill('Renamed Vault');
			await page.getByRole('button', { name: 'Save' }).click();

			await expect(page.getByText('Vault renamed')).toBeVisible();
		});
	});

	test.describe('navigation', () => {
		test('locks vault and returns to unlock screen', async ({ page }) => {
			await page.goto('/');
			await page.getByLabel('Vault Name').fill('Test');
			await page.getByLabel('Passphrase', { exact: true }).fill('pass');
			await page.getByLabel('Confirm Passphrase').fill('pass');
			await page.getByRole('button', { name: 'Create Vault' }).click();

			await page.getByRole('button', { name: 'Lock' }).click();

			await expect(page.getByText('Unlock your vault')).toBeVisible();
		});

		test('navigates to account detail and back', async ({ page }) => {
			await page.goto('/');
			await page.getByLabel('Vault Name').fill('Test');
			await page.getByLabel('Passphrase', { exact: true }).fill('pass');
			await page.getByLabel('Confirm Passphrase').fill('pass');
			await page.getByRole('button', { name: 'Create Vault' }).click();

			// Add account
			await page.getByRole('main').getByRole('button', { name: 'Add Account' }).click();
			await page.getByRole('button', { name: 'Enter Manually Instead' }).click();
			await page.getByLabel('Service Name').fill('Test Service');
			await page.getByLabel('Account Name').fill('user');
			await page.getByLabel('Secret Key').fill('JBSWY3DPEHPK3PXP');
			await page.getByRole('dialog').getByRole('button', { name: 'Add Account' }).click();

			// Should be on detail page
			await expect(page.getByRole('heading', { name: 'Test Service' })).toBeVisible();

			// Navigate back
			await page.getByRole('link', { name: 'Toofer' }).click();

			// Should be back on list
			await expect(page.getByRole('main').getByText('Test Service')).toBeVisible();
		});
	});
});
