/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { safeStorage as safeStorageElectron, app } from 'electron';
import { isMacintosh, isWindows, isLinux } from '../../../base/common/platform.js';
import { KnownStorageProvider, IEncryptionMainService, PasswordStoreCLIOption } from '../common/encryptionService.js';
import { ILogService } from '../../log/common/log.js';

// These APIs are currently only supported in our custom build of electron so
// we need to guard against them not being available.
interface ISafeStorageAdditionalAPIs {
	setUsePlainTextEncryption(usePlainText: boolean): void;
	getSelectedStorageBackend(): string;
}

const safeStorage: typeof import('electron').safeStorage & Partial<ISafeStorageAdditionalAPIs> = safeStorageElectron;

export class EncryptionMainService implements IEncryptionMainService {
	_serviceBrand: undefined;

	constructor(
		@ILogService private readonly logService: ILogService
	) {

		// Void added this as a nice default for linux so you don't need to specify encryption provider
		if (isLinux && !app.commandLine.getSwitchValue('password-store')) {
			this.logService.trace('[EncryptionMainService] No password-store switch, defaulting to basic...');
			app.commandLine.appendSwitch('password-store', PasswordStoreCLIOption.basic);
		}

		// Void: Add macOS fallback for development builds without keychain access
		if (isMacintosh && !safeStorage.isEncryptionAvailable()) {
			this.logService.warn('[EncryptionMainService] Encryption not available on macOS, using plain text');
			// Note: setUsePlainTextEncryption is not available on macOS, so we handle it in encrypt/decrypt
		}

		// if this commandLine switch is set, the user has opted in to using basic text encryption
		if (app.commandLine.getSwitchValue('password-store') === PasswordStoreCLIOption.basic) {
			this.logService.trace('[EncryptionMainService] setting usePlainTextEncryption to true...');
			safeStorage.setUsePlainTextEncryption?.(true);
			this.logService.trace('[EncryptionMainService] set usePlainTextEncryption to true');
		}
	}

	async encrypt(value: string): Promise<string> {
		this.logService.trace('[EncryptionMainService] Encrypting value...');
		try {
			// Check if encryption is available before attempting to encrypt
			if (!safeStorage.isEncryptionAvailable()) {
				this.logService.warn('[EncryptionMainService] Encryption not available, returning plain text');
				// Return the value in the same format but unencrypted
				return JSON.stringify({ data: Buffer.from(value).toString('base64') });
			}
			const result = JSON.stringify(safeStorage.encryptString(value));
			this.logService.trace('[EncryptionMainService] Encrypted value.');
			return result;
		} catch (e) {
			this.logService.error(e);
			// Fallback to base64 encoding if encryption fails
			this.logService.warn('[EncryptionMainService] Encryption failed, falling back to base64');
			return JSON.stringify({ data: Buffer.from(value).toString('base64') });
		}
	}

	async decrypt(value: string): Promise<string> {
		let parsedValue: { data: string };
		try {
			parsedValue = JSON.parse(value);
			if (!parsedValue.data) {
				throw new Error(`[EncryptionMainService] Invalid encrypted value: ${value}`);
			}
			const bufferToDecrypt = Buffer.from(parsedValue.data);

			this.logService.trace('[EncryptionMainService] Decrypting value...');
			
			// Check if encryption is available
			if (!safeStorage.isEncryptionAvailable()) {
				this.logService.warn('[EncryptionMainService] Encryption not available, decoding base64');
				// Assume it's base64 encoded plain text
				return bufferToDecrypt.toString('utf-8');
			}
			
			const result = safeStorage.decryptString(bufferToDecrypt);
			this.logService.trace('[EncryptionMainService] Decrypted value.');
			return result;
		} catch (e) {
			this.logService.error(e);
			// Try to decode as base64 if decryption fails
			try {
				const parsedValue = JSON.parse(value);
				if (parsedValue.data) {
					this.logService.warn('[EncryptionMainService] Decryption failed, trying base64 decode');
					return Buffer.from(parsedValue.data, 'base64').toString('utf-8');
				}
			} catch (fallbackError) {
				this.logService.error('[EncryptionMainService] Fallback decode also failed', fallbackError);
			}
			throw e;
		}
	}

	isEncryptionAvailable(): Promise<boolean> {
		this.logService.trace('[EncryptionMainService] Checking if encryption is available...');
		const result = safeStorage.isEncryptionAvailable();
		this.logService.trace('[EncryptionMainService] Encryption is available: ', result);
		return Promise.resolve(result);
	}

	getKeyStorageProvider(): Promise<KnownStorageProvider> {
		if (isWindows) {
			return Promise.resolve(KnownStorageProvider.dplib);
		}
		if (isMacintosh) {
			return Promise.resolve(KnownStorageProvider.keychainAccess);
		}
		if (safeStorage.getSelectedStorageBackend) {
			try {
				this.logService.trace('[EncryptionMainService] Getting selected storage backend...');
				const result = safeStorage.getSelectedStorageBackend() as KnownStorageProvider;
				this.logService.trace('[EncryptionMainService] Selected storage backend: ', result);
				return Promise.resolve(result);
			} catch (e) {
				this.logService.error(e);
			}
		}
		return Promise.resolve(KnownStorageProvider.unknown);
	}

	async setUsePlainTextEncryption(): Promise<void> {
		if (isWindows) {
			throw new Error('Setting plain text encryption is not supported on Windows.');
		}

		if (isMacintosh) {
			throw new Error('Setting plain text encryption is not supported on macOS.');
		}

		if (!safeStorage.setUsePlainTextEncryption) {
			throw new Error('Setting plain text encryption is not supported.');
		}

		this.logService.trace('[EncryptionMainService] Setting usePlainTextEncryption to true...');
		safeStorage.setUsePlainTextEncryption(true);
		this.logService.trace('[EncryptionMainService] Set usePlainTextEncryption to true');
	}
}
