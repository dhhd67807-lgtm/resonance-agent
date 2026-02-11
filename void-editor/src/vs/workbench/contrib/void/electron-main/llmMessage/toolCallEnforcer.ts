/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

/**
 * Tool Call Enforcer - Detects when a model should have called a tool but didn't,
 * and automatically converts the response into a tool call.
 * 
 * This helps models that don't follow tool calling instructions well.
 */

import { RawToolCallObj } from '../../common/sendLLMMessageTypes.js';
import { generateUuid } from '../../../../../base/common/uuid.js';

interface ToolCallPattern {
	pattern: RegExp;
	toolName: string;
	extractParams: (match: RegExpMatchArray, fullText: string) => Record<string, string>;
}

const toolCallPatterns: ToolCallPattern[] = [
	// Detect "run python3 -m http.server" type commands
	{
		pattern: /(?:run|execute|start)\s+(?:the\s+command\s+)?[`"]?([^`"\n]+)[`"]?/i,
		toolName: 'run_command',
		extractParams: (match) => ({
			command: match[1].trim()
		})
	},
	// Detect "create a file" patterns
	{
		pattern: /create\s+(?:a\s+)?(?:new\s+)?file\s+(?:called\s+|named\s+)?[`"]?([^`"\n]+)[`"]?/i,
		toolName: 'create_file_or_folder',
		extractParams: (match) => ({
			uri: match[1].trim()
		})
	},
	// Detect "edit the file" patterns
	{
		pattern: /edit\s+(?:the\s+)?file\s+[`"]?([^`"\n]+)[`"]?/i,
		toolName: 'read_file',
		extractParams: (match) => ({
			uri: match[1].trim()
		})
	},
	// Detect "read the file" patterns
	{
		pattern: /read\s+(?:the\s+)?file\s+[`"]?([^`"\n]+)[`"]?/i,
		toolName: 'read_file',
		extractParams: (match) => ({
			uri: match[1].trim()
		})
	},
];

/**
 * Attempts to detect if the model's response should have been a tool call
 * and converts it if possible.
 */
export function enforceToolCall(fullText: string, chatMode: string | null): RawToolCallObj | null {
	// Only enforce in agent mode
	if (chatMode !== 'agent') {
		console.log('[VOID DEBUG] Tool call enforcer skipped - not in agent mode:', chatMode);
		return null;
	}
	
	// Don't enforce if the text is very short (likely just a greeting)
	if (fullText.length < 20) {
		console.log('[VOID DEBUG] Tool call enforcer skipped - text too short');
		return null;
	}

	console.log('[VOID DEBUG] Tool call enforcer analyzing text:', fullText.substring(0, 200));

	// Try each pattern
	for (const { pattern, toolName, extractParams } of toolCallPatterns) {
		const match = fullText.match(pattern);
		if (match) {
			try {
				const params = extractParams(match, fullText);
				console.log('[VOID DEBUG] Tool call enforcer detected potential tool call:', {
					toolName,
					params,
					matchedText: match[0]
				});
				
				return {
					name: toolName,
					rawParams: params,
					doneParams: Object.keys(params),
					id: generateUuid(),
					isDone: false
				};
			} catch (e) {
				console.warn('[VOID DEBUG] Tool call enforcer failed to extract params:', e);
			}
		}
	}

	console.log('[VOID DEBUG] Tool call enforcer found no matching patterns');
	return null;
}
