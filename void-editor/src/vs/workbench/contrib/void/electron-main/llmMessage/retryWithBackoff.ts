/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

export type RetryConfig = {
	maxRetries?: number;
	initialDelayMs?: number;
	maxDelayMs?: number;
	backoffMultiplier?: number;
	retryableStatusCodes?: number[];
};

const defaultRetryConfig: Required<RetryConfig> = {
	maxRetries: 3,
	initialDelayMs: 1000,
	maxDelayMs: 10000,
	backoffMultiplier: 2,
	retryableStatusCodes: [429, 503, 504],
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const isRetryableError = (error: any, retryableStatusCodes: number[]): boolean => {
	// Check for status code in various error formats
	if (error?.status && retryableStatusCodes.includes(error.status)) {
		return true;
	}
	if (error?.response?.status && retryableStatusCodes.includes(error.response.status)) {
		return true;
	}
	// Check for 429 in error message (for cases where status isn't directly available)
	if (error?.message && typeof error.message === 'string' && error.message.includes('429')) {
		return true;
	}
	return false;
};

export async function retryWithExponentialBackoff<T>(
	fn: () => Promise<T>,
	config: RetryConfig = {}
): Promise<T> {
	const {
		maxRetries,
		initialDelayMs,
		maxDelayMs,
		backoffMultiplier,
		retryableStatusCodes,
	} = { ...defaultRetryConfig, ...config };

	let lastError: any;
	let delayMs = initialDelayMs;

	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		try {
			return await fn();
		} catch (error) {
			lastError = error;

			// Don't retry if this is the last attempt
			if (attempt === maxRetries) {
				break;
			}

			// Only retry on specific error codes
			if (!isRetryableError(error, retryableStatusCodes)) {
				throw error;
			}

			console.log(`[Retry] Attempt ${attempt + 1}/${maxRetries + 1} failed with retryable error. Retrying in ${delayMs}ms...`);

			// Wait before retrying
			await sleep(delayMs);

			// Increase delay for next attempt (exponential backoff)
			delayMs = Math.min(delayMs * backoffMultiplier, maxDelayMs);
		}
	}

	// If we get here, all retries failed
	throw lastError;
}
