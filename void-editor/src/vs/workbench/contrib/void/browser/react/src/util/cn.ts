/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

/**
 * Utility function for merging class names
 * Similar to clsx/classnames but lightweight
 */
export function cn(...inputs: (string | undefined | null | false)[]): string {
	return inputs.filter(Boolean).join(' ');
}
