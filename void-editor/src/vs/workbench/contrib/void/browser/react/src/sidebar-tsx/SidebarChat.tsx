/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import React, { ButtonHTMLAttributes, FormEvent, FormHTMLAttributes, Fragment, KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';


import { useAccessor, useChatThreadsState, useChatThreadsStreamState, useSettingsState, useActiveURI, useCommandBarState, useFullChatThreadsStreamState } from '../util/services.js';
import { ScrollType } from '../../../../../../../editor/common/editorCommon.js';

import { ChatMarkdownRender, ChatMessageLocation, getApplyBoxId } from '../markdown/ChatMarkdownRender.js';
import { URI } from '../../../../../../../base/common/uri.js';
import { IDisposable } from '../../../../../../../base/common/lifecycle.js';
import { getIconClasses } from '../../../../../../../editor/common/services/getIconClasses.js';
import { FileKind } from '../../../../../../../platform/files/common/files.js';
import { ErrorDisplay } from './ErrorDisplay.js';
import { BlockCode, TextAreaFns, VoidCustomDropdownBox, VoidInputBox2, VoidSlider, VoidSwitch, VoidDiffEditor } from '../util/inputs.js';
import { ModelDropdownCustom } from '../void-settings-tsx/ModelDropdownCustom.js';
import { PastThreadsList } from './SidebarThreadSelector.js';
import { VOID_CTRL_L_ACTION_ID } from '../../../actionIDs.js';
import { VOID_OPEN_SETTINGS_ACTION_ID } from '../../../voidSettingsPane.js';
import { ChatMode, displayInfoOfProviderName, FeatureName, isFeatureNameDisabled } from '../../../../../../../workbench/contrib/void/common/voidSettingsTypes.js';
import { ICommandService } from '../../../../../../../platform/commands/common/commands.js';
import { WarningBox } from '../void-settings-tsx/WarningBox.js';
import { getModelCapabilities, getIsReasoningEnabledState, modelSupportsVision } from '../../../../common/modelCapabilities.js';
import { AlertTriangle, File, Ban, Check, ChevronRight, Dot, FileIcon, Pencil, Undo, Undo2, X, Flag, Copy as CopyIcon, Info, CirclePlus, Ellipsis, CircleEllipsis, Folder, ALargeSmall, TypeOutline, Text, Eye, Search, FilePlus, Trash2, Terminal, FileEdit, Bug } from 'lucide-react';
import { ChatMessage, CheckpointEntry, StagingSelectionItem, ToolMessage, ImageAttachment } from '../../../../common/chatThreadServiceTypes.js';
import { approvalTypeOfBuiltinToolName, BuiltinToolCallParams, BuiltinToolName, ToolName, LintErrorItem, ToolApprovalType, toolApprovalTypes } from '../../../../common/toolsServiceTypes.js';
import { CopyButton, EditToolAcceptRejectButtonsHTML, IconShell1, JumpToFileButton, JumpToTerminalButton, StatusIndicator, StatusIndicatorForApplyButton, useApplyStreamState, useEditToolStreamState } from '../markdown/ApplyBlockHoverButtons.js';
import { IsRunningType } from '../../../chatThreadService.js';
import { acceptAllBg, acceptBorder, buttonFontSize, buttonTextColor, rejectAllBg, rejectBg, rejectBorder } from '../../../../common/helpers/colors.js';
import { builtinToolNames, isABuiltinToolName, MAX_FILE_CHARS_PAGE, MAX_TERMINAL_INACTIVE_TIME } from '../../../../common/prompt/prompts.js';
import { RawToolCallObj } from '../../../../common/sendLLMMessageTypes.js';
import ErrorBoundary from './ErrorBoundary.js';
import { ToolApprovalTypeSwitch } from '../void-settings-tsx/Settings.js';

import { persistentTerminalNameOfId } from '../../../terminalToolService.js';
import { removeMCPToolNamePrefix } from '../../../../common/mcpServiceTypes.js';



export const IconX = ({ size, className = '', ...props }: { size: number, className?: string } & React.SVGProps<SVGSVGElement>) => {
	return (
		<svg
			xmlns='http://www.w3.org/2000/svg'
			width={size}
			height={size}
			viewBox='0 0 24 24'
			fill='none'
			stroke='currentColor'
			className={className}
			{...props}
		>
			<path
				strokeLinecap='round'
				strokeLinejoin='round'
				d='M6 18 18 6M6 6l12 12'
			/>
		</svg>
	);
};

const IconArrowUp = ({ size, className = '' }: { size: number, className?: string }) => {
	return (
		<svg
			width={size}
			height={size}
			className={className}
			viewBox="0 0 20 20"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
		>
			<path
				fill="black"
				fillRule="evenodd"
				clipRule="evenodd"
				d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z"
			></path>
		</svg>
	);
};


const IconSquare = ({ size, className = '' }: { size: number, className?: string }) => {
	return (
		<svg
			className={className}
			stroke="black"
			fill="black"
			strokeWidth="0"
			viewBox="0 0 24 24"
			width={size}
			height={size}
			xmlns="http://www.w3.org/2000/svg"
		>
			<rect x="2" y="2" width="20" height="20" rx="4" ry="4" />
		</svg>
	);
};

// Component to render VS Code file icons based on filename
const FileIconSpan = ({ filename }: { filename: string }) => {
	const accessor = useAccessor();
	const modelService = accessor.get('IModelService');
	const languageService = accessor.get('ILanguageService');
	
	// Create a URI from the filename to get proper icon classes
	const uri = URI.file(filename);
	const iconClasses = getIconClasses(modelService, languageService, uri, FileKind.FILE);
	
	return (
		<span 
			className={`monaco-icon-label ${iconClasses.join(' ')}`}
			style={{ 
				display: 'inline-flex',
				alignItems: 'center',
				flexShrink: 0,
			}}
		>
			<span 
				className="monaco-icon-label-container"
				style={{
					display: 'inline-flex',
					alignItems: 'center',
				}}
			>
				<span 
					className="monaco-icon-name-container"
					style={{
						display: 'inline-flex',
						alignItems: 'center',
					}}
				/>
			</span>
		</span>
	);
};


export const IconWarning = ({ size, className = '' }: { size: number, className?: string }) => {
	return (
		<svg
			className={className}
			stroke="currentColor"
			fill="currentColor"
			strokeWidth="0"
			viewBox="0 0 16 16"
			width={size}
			height={size}
			xmlns="http://www.w3.org/2000/svg"
		>
			<path
				fillRule="evenodd"
				clipRule="evenodd"
				d="M7.56 1h.88l6.54 12.26-.44.74H1.44L1 13.26 7.56 1zM8 2.28L2.28 13H13.7L8 2.28zM8.625 12v-1h-1.25v1h1.25zm-1.25-2V6h1.25v4h-1.25z"
			/>
		</svg>
	);
};


export const IconLoading = ({ className = '' }: { className?: string }) => {

	const [loadingText, setLoadingText] = useState('.');

	useEffect(() => {
		let intervalId;

		// Function to handle the animation
		const toggleLoadingText = () => {
			if (loadingText === '...') {
				setLoadingText('.');
			} else {
				setLoadingText(loadingText + '.');
			}
		};

		// Start the animation loop
		intervalId = setInterval(toggleLoadingText, 300);

		// Cleanup function to clear the interval when component unmounts
		return () => clearInterval(intervalId);
	}, [loadingText, setLoadingText]);

	return <div className={`${className}`}>{loadingText}</div>;

}



// SLIDER ONLY:
const ReasoningOptionSlider = ({ featureName }: { featureName: FeatureName }) => {
	const accessor = useAccessor()

	const voidSettingsService = accessor.get('IVoidSettingsService')
	const voidSettingsState = useSettingsState()

	const modelSelection = voidSettingsState.modelSelectionOfFeature[featureName]
	const overridesOfModel = voidSettingsState.overridesOfModel

	if (!modelSelection) return null

	const { modelName, providerName } = modelSelection
	const { reasoningCapabilities } = getModelCapabilities(providerName, modelName, overridesOfModel)
	const { canTurnOffReasoning, reasoningSlider: reasoningBudgetSlider } = reasoningCapabilities || {}

	const modelSelectionOptions = voidSettingsState.optionsOfModelSelection[featureName][providerName]?.[modelName]
	const isReasoningEnabled = getIsReasoningEnabledState(featureName, providerName, modelName, modelSelectionOptions, overridesOfModel)

	if (canTurnOffReasoning && !reasoningBudgetSlider) { // if it's just a on/off toggle without a power slider
		return <div className='flex items-center gap-x-2'>
			<span className='text-void-fg-3 text-xs pointer-events-none inline-block w-10 pr-1'>Thinking</span>
			<VoidSwitch
				size='xxs'
				value={isReasoningEnabled}
				onChange={(newVal) => {
					const isOff = canTurnOffReasoning && !newVal
					voidSettingsService.setOptionsOfModelSelection(featureName, modelSelection.providerName, modelSelection.modelName, { reasoningEnabled: !isOff })
				}}
			/>
		</div>
	}

	if (reasoningBudgetSlider?.type === 'budget_slider') { // if it's a slider
		const { min: min_, max, default: defaultVal } = reasoningBudgetSlider

		const nSteps = 8 // only used in calculating stepSize, stepSize is what actually matters
		const stepSize = Math.round((max - min_) / nSteps)

		const valueIfOff = min_ - stepSize
		const min = canTurnOffReasoning ? valueIfOff : min_
		const value = isReasoningEnabled ? voidSettingsState.optionsOfModelSelection[featureName][modelSelection.providerName]?.[modelSelection.modelName]?.reasoningBudget ?? defaultVal
			: valueIfOff

		return <div className='flex items-center gap-x-2'>
			<span className='text-void-fg-3 text-xs pointer-events-none inline-block w-10 pr-1'>Thinking</span>
			<VoidSlider
				width={50}
				size='xs'
				min={min}
				max={max}
				step={stepSize}
				value={value}
				onChange={(newVal) => {
					const isOff = canTurnOffReasoning && newVal === valueIfOff
					voidSettingsService.setOptionsOfModelSelection(featureName, modelSelection.providerName, modelSelection.modelName, { reasoningEnabled: !isOff, reasoningBudget: newVal })
				}}
			/>
			<span className='text-void-fg-3 text-xs pointer-events-none'>{isReasoningEnabled ? `${value} tokens` : 'Thinking disabled'}</span>
		</div>
	}

	if (reasoningBudgetSlider?.type === 'effort_slider') {

		const { values, default: defaultVal } = reasoningBudgetSlider

		const min = canTurnOffReasoning ? -1 : 0
		const max = values.length - 1

		const currentEffort = voidSettingsState.optionsOfModelSelection[featureName][modelSelection.providerName]?.[modelSelection.modelName]?.reasoningEffort ?? defaultVal
		const valueIfOff = -1
		const value = isReasoningEnabled && currentEffort ? values.indexOf(currentEffort) : valueIfOff

		const currentEffortCapitalized = currentEffort.charAt(0).toUpperCase() + currentEffort.slice(1, Infinity)

		return <div className='flex items-center gap-x-2'>
			<span className='text-void-fg-3 text-xs pointer-events-none inline-block w-10 pr-1'>Thinking</span>
			<VoidSlider
				width={30}
				size='xs'
				min={min}
				max={max}
				step={1}
				value={value}
				onChange={(newVal) => {
					const isOff = canTurnOffReasoning && newVal === valueIfOff
					voidSettingsService.setOptionsOfModelSelection(featureName, modelSelection.providerName, modelSelection.modelName, { reasoningEnabled: !isOff, reasoningEffort: values[newVal] ?? undefined })
				}}
			/>
			<span className='text-void-fg-3 text-xs pointer-events-none'>{isReasoningEnabled ? `${currentEffortCapitalized}` : 'Thinking disabled'}</span>
		</div>
	}

	return null
}



const nameOfChatMode = {
	'normal': 'Chat',
	'gather': 'Gather',
	'agent': 'Agent',
}

const detailOfChatMode = {
	'normal': 'Chat only',
	'gather': 'Read files',
	'agent': 'Edit & tools',
}


// Image Upload Button Component
const ImageUploadButton = ({ onImageSelect, disabled }: { 
	onImageSelect: (files: File[]) => void;
	disabled: boolean;
}) => {
	const fileInputRef = useRef<HTMLInputElement>(null);
	
	return (
		<>
			<input
				ref={fileInputRef}
				type="file"
				accept="image/*"
				multiple
				style={{ display: 'none' }}
				onChange={(e) => {
					if (e.target.files) {
						onImageSelect(Array.from(e.target.files));
						// Reset input so same file can be selected again
						e.target.value = '';
					}
				}}
			/>
			<button
				type="button"
				onClick={() => fileInputRef.current?.click()}
				disabled={disabled}
				className={`
					p-1 rounded
					${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-void-bg-2'}
					transition-colors
				`}
				data-tooltip-id='void-tooltip'
				data-tooltip-content='Attach images'
				data-tooltip-place='top'
			>
				<FileIcon size={16} className="text-void-fg-3" />
			</button>
		</>
	);
};

// Image Preview Component
const ImagePreview = ({ image, onRemove }: {
	image: ImageAttachment;
	onRemove: () => void;
}) => {
	return (
		<div className="relative w-20 h-20 rounded border border-void-border-1 overflow-hidden group">
			<img 
				src={image.dataUrl} 
				alt={image.name}
				className="w-full h-full object-cover"
			/>
			<button
				onClick={onRemove}
				className="absolute top-0.5 right-0.5 bg-black bg-opacity-70 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
			>
				<X size={12} className="text-white" />
			</button>
			<div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 px-1 py-0.5">
				<span className="text-white text-[9px] truncate block">{image.name}</span>
			</div>
		</div>
	);
};

// Image Attachments Container
const ImageAttachmentsContainer = ({ images, onRemove }: {
	images: ImageAttachment[];
	onRemove: (id: string) => void;
}) => {
	if (images.length === 0) return null;
	
	return (
		<div className="flex flex-wrap gap-2 pb-1">
			{images.map(image => (
				<ImagePreview
					key={image.id}
					image={image}
					onRemove={() => onRemove(image.id)}
				/>
			))}
		</div>
	);
};


const ChatModeDropdown = ({ className }: { className: string }) => {
	const accessor = useAccessor()

	const voidSettingsService = accessor.get('IVoidSettingsService')
	const settingsState = useSettingsState()

	const options: ChatMode[] = useMemo(() => ['normal', 'gather', 'agent'], [])

	const onChangeOption = useCallback((newVal: ChatMode) => {
		voidSettingsService.setGlobalSetting('chatMode', newVal)
	}, [voidSettingsService])

	return <VoidCustomDropdownBox
		className={className}
		options={options}
		selectedOption={settingsState.globalSettings.chatMode}
		onChangeOption={onChangeOption}
		getOptionDisplayName={(val) => nameOfChatMode[val]}
		getOptionDropdownName={(val) => nameOfChatMode[val]}
		getOptionDropdownDetail={(val) => detailOfChatMode[val]}
		getOptionsEqual={(a, b) => a === b}
	/>

}





interface VoidChatAreaProps {
	// Required
	children: React.ReactNode; // This will be the input component

	// Form controls
	onSubmit: () => void;
	onAbort: () => void;
	isStreaming: boolean;
	isDisabled?: boolean;
	divRef?: React.RefObject<HTMLDivElement | null>;

	// UI customization
	className?: string;
	showModelDropdown?: boolean;
	showSelections?: boolean;
	showProspectiveSelections?: boolean;
	loadingIcon?: React.ReactNode;

	selections?: StagingSelectionItem[]
	setSelections?: (s: StagingSelectionItem[]) => void
	
	// Image attachments
	images?: ImageAttachment[];
	setImages?: (images: ImageAttachment[]) => void;
	showImageUpload?: boolean;

	onClickAnywhere?: () => void;
	// Optional close button
	onClose?: () => void;

	featureName: FeatureName;
}

export const VoidChatArea: React.FC<VoidChatAreaProps> = ({
	children,
	onSubmit,
	onAbort,
	onClose,
	onClickAnywhere,
	divRef,
	isStreaming = false,
	isDisabled = false,
	className = '',
	showModelDropdown = true,
	showSelections = false,
	showProspectiveSelections = false,
	selections,
	setSelections,
	images,
	setImages,
	showImageUpload = false,
	featureName,
	loadingIcon,
}) => {
	const accessor = useAccessor();
	const settingsState = useSettingsState();
	
	// Check if current model supports vision
	const modelSelection = settingsState.modelSelectionOfFeature[featureName];
	const supportsVision = modelSelection ? 
		modelSupportsVision(modelSelection.providerName, modelSelection.modelName, settingsState.overridesOfModel) : 
		false;
	
	const handleImageUpload = async (files: File[]) => {
		if (!setImages) return;
		
		const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
		const newImages: ImageAttachment[] = [];
		
		for (const file of files) {
			if (file.size > MAX_IMAGE_SIZE) {
				console.warn(`Image ${file.name} is too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Maximum size is 5MB.`);
				continue;
			}
			
			if (!file.type.startsWith('image/')) {
				console.warn(`File ${file.name} is not an image.`);
				continue;
			}
			
			try {
				const arrayBuffer = await file.arrayBuffer();
				const uint8Array = new Uint8Array(arrayBuffer);
				const base64 = btoa(String.fromCharCode(...uint8Array));
				const dataUrl = `data:${file.type};base64,${base64}`;
				
				newImages.push({
					id: `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
					name: file.name,
					mimeType: file.type as ImageAttachment['mimeType'],
					data: base64,
					dataUrl,
					size: file.size
				});
			} catch (error) {
				console.error(`Failed to process image ${file.name}:`, error);
			}
		}
		
		if (newImages.length > 0) {
			setImages([...(images || []), ...newImages]);
		}
	};
	
	const handleRemoveImage = (id: string) => {
		if (!setImages || !images) return;
		setImages(images.filter(img => img.id !== id));
	};
	
	return (
		<div
			ref={divRef}
			className={`
				gap-x-1
                flex flex-col p-2 relative input text-left shrink-0
                rounded-md
                bg-void-bg-1
				transition-all duration-200
				border border-void-border-3 focus-within:border-void-border-1 hover:border-void-border-1
				max-h-[80vh] overflow-y-auto
                ${className}
            `}
			onClick={(e) => {
				onClickAnywhere?.()
			}}
		>
			{/* Selections section */}
			{showSelections && selections && setSelections && (
				<SelectedFiles
					type='staging'
					selections={selections}
					setSelections={setSelections}
					showProspectiveSelections={showProspectiveSelections}
				/>
			)}
			
			{/* Image attachments section */}
			{images && images.length > 0 && (
				<ImageAttachmentsContainer
					images={images}
					onRemove={handleRemoveImage}
				/>
			)}

			{/* Input section */}
			<div className="relative w-full">
				{children}

				{/* Close button (X) if onClose is provided */}
				{onClose && (
					<div className='absolute -top-1 -right-1 cursor-pointer z-1'>
						<IconX
							size={12}
							className="stroke-[2] opacity-80 text-void-fg-3 hover:brightness-95"
							onClick={onClose}
						/>
					</div>
				)}
			</div>

			{/* Bottom row */}
			<div className='flex flex-row justify-between items-end gap-1'>
				{showModelDropdown && (
					<div className='flex flex-col gap-y-1'>
						<div className='flex items-center flex-wrap gap-x-2 gap-y-1 text-nowrap '>
							{featureName === 'Chat' && <ChatModeDropdown className='text-xs text-void-fg-3 bg-void-bg-1 border border-void-border-2 rounded py-0.5 px-1' />}
							<ModelDropdownCustom featureName={featureName} className='text-xs text-void-fg-3 bg-void-bg-1 rounded py-0.5 px-1' />
						</div>
					</div>
				)}

				<div className="flex items-center gap-2">
					{/* Image upload button - only show if enabled and model supports vision */}
					{showImageUpload && supportsVision && setImages && (
						<ImageUploadButton
							onImageSelect={handleImageUpload}
							disabled={isStreaming}
						/>
					)}

					{isStreaming && loadingIcon}

					{isStreaming ? (
						<ButtonStop onClick={onAbort} />
					) : (
						<ButtonSubmit
							onClick={onSubmit}
							disabled={isDisabled}
						/>
					)}
				</div>

			</div>
		</div>
	);
};




type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement>
const DEFAULT_BUTTON_SIZE = 22;
export const ButtonSubmit = ({ className, disabled, ...props }: ButtonProps & Required<Pick<ButtonProps, 'disabled'>>) => {

	return <button
		type='button'
		className={`rounded-full flex-shrink-0 flex-grow-0 flex items-center justify-center
			${disabled ? 'bg-vscode-disabled-fg cursor-default' : 'bg-white cursor-pointer'}
			${className}
		`}
		// data-tooltip-id='void-tooltip'
		// data-tooltip-content={'Send'}
		// data-tooltip-place='left'
		{...props}
	>
		<IconArrowUp size={DEFAULT_BUTTON_SIZE} className="stroke-[2] p-[2px]" />
	</button>
}

export const ButtonStop = ({ className, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) => {
	return <button
		className={`rounded-full flex-shrink-0 flex-grow-0 cursor-pointer flex items-center justify-center
			bg-white
			${className}
		`}
		type='button'
		{...props}
	>
		<IconSquare size={DEFAULT_BUTTON_SIZE} className="stroke-[3] p-[7px]" />
	</button>
}



const scrollToBottom = (divRef: { current: HTMLElement | null }) => {
	if (divRef.current) {
		divRef.current.scrollTop = divRef.current.scrollHeight;
	}
};



const ScrollToBottomContainer = ({ children, className, style, scrollContainerRef }: { children: React.ReactNode, className?: string, style?: React.CSSProperties, scrollContainerRef: React.MutableRefObject<HTMLDivElement | null> }) => {
	const [isAtBottom, setIsAtBottom] = useState(true); // Start at bottom

	const divRef = scrollContainerRef

	const onScroll = () => {
		const div = divRef.current;
		if (!div) return;

		const isBottom = Math.abs(
			div.scrollHeight - div.clientHeight - div.scrollTop
		) < 4;

		setIsAtBottom(isBottom);
	};

	// When children change (new messages added)
	useEffect(() => {
		if (isAtBottom) {
			scrollToBottom(divRef);
		}
	}, [children, isAtBottom]); // Dependency on children to detect new messages

	// Initial scroll to bottom
	useEffect(() => {
		scrollToBottom(divRef);
	}, []);

	return (
		<div
			ref={divRef}
			onScroll={onScroll}
			className={className}
			style={style}
		>
			{children}
		</div>
	);
};

export const getRelative = (uri: URI, accessor: ReturnType<typeof useAccessor>) => {
	const workspaceContextService = accessor.get('IWorkspaceContextService')
	
	// Defensive check: ensure uri.fsPath exists and is a string
	if (!uri || !uri.fsPath || typeof uri.fsPath !== 'string') {
		console.error('getRelative received invalid uri:', uri);
		return undefined;
	}
	
	let path: string
	const isInside = workspaceContextService.isInsideWorkspace(uri)
	if (isInside) {
		const f = workspaceContextService.getWorkspace().folders.find(f => uri.fsPath?.startsWith(f.uri.fsPath))
		if (f) { path = uri.fsPath.replace(f.uri.fsPath, '') }
		else { path = uri.fsPath }
	}
	else {
		path = uri.fsPath
	}
	return path || undefined
}

export const getFolderName = (pathStr: string) => {
	// Defensive check: ensure pathStr is a string
	if (typeof pathStr !== 'string' || !pathStr) {
		console.error('getFolderName received non-string path:', pathStr);
		return '/';
	}
	
	// 'unixify' path
	pathStr = pathStr.replace(/[/\\]+/g, '/') // replace any / or \ or \\ with /
	const parts = pathStr.split('/') // split on /
	// Filter out empty parts (the last element will be empty if path ends with /)
	const nonEmptyParts = parts.filter(part => part.length > 0)
	if (nonEmptyParts.length === 0) return '/' // Root directory
	if (nonEmptyParts.length === 1) return nonEmptyParts[0] + '/' // Only one folder
	// Get the last two parts
	const lastTwo = nonEmptyParts.slice(-2)
	return lastTwo.join('/') + '/'
}

export const getBasename = (pathStr: string, parts: number = 1) => {
	// Defensive check: ensure pathStr is a string
	if (typeof pathStr !== 'string' || !pathStr) {
		console.error('getBasename received non-string path:', pathStr);
		return 'unknown';
	}
	
	// 'unixify' path
	pathStr = pathStr.replace(/[/\\]+/g, '/') // replace any / or \ or \\ with /
	const allParts = pathStr.split('/') // split on /
	if (allParts.length === 0) return pathStr
	return allParts.slice(-parts).join('/')
}



// Open file utility function
export const voidOpenFileFn = (
	uri: URI,
	accessor: ReturnType<typeof useAccessor>,
	range?: [number, number]
) => {
	const commandService = accessor.get('ICommandService')
	const editorService = accessor.get('ICodeEditorService')

	// Get editor selection from CodeSelection range
	let editorSelection = undefined;

	// If we have a selection, create an editor selection from the range
	if (range) {
		editorSelection = {
			startLineNumber: range[0],
			startColumn: 1,
			endLineNumber: range[1],
			endColumn: Number.MAX_SAFE_INTEGER,
		};
	}

	// open the file
	commandService.executeCommand('vscode.open', uri).then(() => {

		// select the text
		setTimeout(() => {
			if (!editorSelection) return;

			const editor = editorService.getActiveCodeEditor()
			if (!editor) return;

			editor.setSelection(editorSelection)
			editor.revealRange(editorSelection, ScrollType.Immediate)

		}, 50) // needed when document was just opened and needs to initialize

	})

};


export const SelectedFiles = (
	{ type, selections, setSelections, showProspectiveSelections, messageIdx, }:
		| { type: 'past', selections: StagingSelectionItem[]; setSelections?: undefined, showProspectiveSelections?: undefined, messageIdx: number, }
		| { type: 'staging', selections: StagingSelectionItem[]; setSelections: ((newSelections: StagingSelectionItem[]) => void), showProspectiveSelections?: boolean, messageIdx?: number }
) => {

	const accessor = useAccessor()
	const commandService = accessor.get('ICommandService')
	const modelReferenceService = accessor.get('IVoidModelService')




	// state for tracking prospective files
	const { uri: currentURI } = useActiveURI()
	const [recentUris, setRecentUris] = useState<URI[]>([])
	const maxRecentUris = 10
	const maxProspectiveFiles = 3
	useEffect(() => { // handle recent files
		if (!currentURI) return
		setRecentUris(prev => {
			const withoutCurrent = prev.filter(uri => uri.fsPath !== currentURI.fsPath) // remove duplicates
			const withCurrent = [currentURI, ...withoutCurrent]
			return withCurrent.slice(0, maxRecentUris)
		})
	}, [currentURI])
	const [prospectiveSelections, setProspectiveSelections] = useState<StagingSelectionItem[]>([])


	// handle prospective files
	useEffect(() => {
		const computeRecents = async () => {
			const prospectiveURIs = recentUris
				.filter(uri => !selections.find(s => s.type === 'File' && s.uri.fsPath === uri.fsPath))
				.slice(0, maxProspectiveFiles)

			const answer: StagingSelectionItem[] = []
			for (const uri of prospectiveURIs) {
				answer.push({
					type: 'File',
					uri: uri,
					language: (await modelReferenceService.getModelSafe(uri)).model?.getLanguageId() || 'plaintext',
					state: { wasAddedAsCurrentFile: false },
				})
			}
			return answer
		}

		// add a prospective file if type === 'staging' and if the user is in a file, and if the file is not selected yet
		if (type === 'staging' && showProspectiveSelections) {
			computeRecents().then((a) => setProspectiveSelections(a))
		}
		else {
			setProspectiveSelections([])
		}
	}, [recentUris, selections, type, showProspectiveSelections])


	const allSelections = [...selections, ...prospectiveSelections]

	if (allSelections.length === 0) {
		return null
	}

	return (
		<div className='flex items-center flex-wrap text-left relative gap-x-0.5 gap-y-1 pb-0.5'>

			{allSelections.map((selection, i) => {

				const isThisSelectionProspective = i > selections.length - 1

				const thisKey = selection.type === 'CodeSelection' ? selection.type + selection.language + selection.range + selection.state.wasAddedAsCurrentFile + selection.uri.fsPath
					: selection.type === 'File' ? selection.type + selection.language + selection.state.wasAddedAsCurrentFile + selection.uri.fsPath
						: selection.type === 'Folder' ? selection.type + selection.language + selection.state + selection.uri.fsPath
							: i

				const SelectionIcon = (
					selection.type === 'File' ? File
						: selection.type === 'Folder' ? Folder
							: selection.type === 'CodeSelection' ? Text
								: (undefined as never)
				)

				return <div // container for summarybox and code
					key={thisKey}
					className={`flex flex-col space-y-[1px]`}
				>
					{/* tooltip for file path */}
					<span className="truncate overflow-hidden text-ellipsis"
						data-tooltip-id='void-tooltip'
						data-tooltip-content={getRelative(selection.uri, accessor)}
						data-tooltip-place='top'
						data-tooltip-delay-show={3000}
					>
						{/* summarybox */}
						<div
							className={`
								flex items-center gap-1 relative
								px-1
								w-fit h-fit
								select-none
								text-xs text-nowrap
								border rounded-sm
								${isThisSelectionProspective ? 'bg-void-bg-1 text-void-fg-3 opacity-80' : 'bg-void-bg-1 hover:brightness-95 text-void-fg-1'}
								${isThisSelectionProspective
									? 'border-void-border-2'
									: 'border-void-border-1'
								}
								hover:border-void-border-1
								transition-all duration-150
							`}
							onClick={() => {
								if (type !== 'staging') return; // (never)
								if (isThisSelectionProspective) { // add prospective selection to selections
									setSelections([...selections, selection])
								}
								else if (selection.type === 'File') { // open files
									voidOpenFileFn(selection.uri, accessor);

									const wasAddedAsCurrentFile = selection.state.wasAddedAsCurrentFile
									if (wasAddedAsCurrentFile) {
										// make it so the file is added permanently, not just as the current file
										const newSelection: StagingSelectionItem = { ...selection, state: { ...selection.state, wasAddedAsCurrentFile: false } }
										setSelections([
											...selections.slice(0, i),
											newSelection,
											...selections.slice(i + 1)
										])
									}
								}
								else if (selection.type === 'CodeSelection') {
									voidOpenFileFn(selection.uri, accessor, selection.range);
								}
								else if (selection.type === 'Folder') {
									// TODO!!! reveal in tree
								}
							}}
						>
							{<SelectionIcon size={10} />}

							{ // file name and range
								getBasename(selection.uri.fsPath)
								+ (selection.type === 'CodeSelection' ? ` (${selection.range[0]}-${selection.range[1]})` : '')
							}

							{selection.type === 'File' && selection.state.wasAddedAsCurrentFile && messageIdx === undefined && currentURI?.fsPath === selection.uri.fsPath ?
								<span className={`text-[8px] 'void-opacity-60 text-void-fg-4`}>
									{`(Current File)`}
								</span>
								: null
							}

							{type === 'staging' && !isThisSelectionProspective ? // X button
								<div // box for making it easier to click
									className='cursor-pointer z-1 self-stretch flex items-center justify-center'
									onClick={(e) => {
										e.stopPropagation(); // don't open/close selection
										if (type !== 'staging') return;
										setSelections([...selections.slice(0, i), ...selections.slice(i + 1)])
									}}
								>
									<IconX
										className='stroke-[2]'
										size={10}
									/>
								</div>
								: <></>
							}
						</div>
					</span>
				</div>

			})}


		</div>

	)
}


type ToolHeaderParams = {
	icon?: React.ReactNode;
	title: React.ReactNode;
	desc1: React.ReactNode;
	desc1OnClick?: () => void;
	desc2?: React.ReactNode;
	isError?: boolean;
	info?: string;
	desc1Info?: string;
	isRejected?: boolean;
	isRunning?: boolean;
	numResults?: number;
	hasNextPage?: boolean;
	children?: React.ReactNode;
	bottomChildren?: React.ReactNode;
	onClick?: () => void;
	desc2OnClick?: () => void;
	isOpen?: boolean;
	className?: string;
	badgeColor?: string;
	linesAdded?: number;
	linesDeleted?: number;
}

const ToolHeaderWrapper = ({
	icon,
	title,
	desc1,
	desc1OnClick,
	desc1Info,
	desc2,
	numResults,
	hasNextPage,
	children,
	info,
	bottomChildren,
	isError,
	onClick,
	desc2OnClick,
	isOpen,
	isRejected,
	isRunning,
	className, // applies to the main content
	badgeColor = '#4ADE80', // Green color for terminal
	linesAdded,
	linesDeleted,
}: ToolHeaderParams) => {

	const isExpanded = true
	const isDropdown = false
	const isClickable = !!onClick
	const isDesc1Clickable = !!desc1OnClick
	const isTaskComplete = isError || isRejected || (!isError && !isRejected);

	// Status icon component
	const StatusIcon = () => {
		if (isError) {
			return (
				<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#EF4444] flex-shrink-0">
					<line x1="18" y1="6" x2="6" y2="18"/>
					<line x1="6" y1="6" x2="18" y2="18"/>
				</svg>
			);
		}
		if (isRejected) {
			return (
				<Ban
					className='text-void-fg-4 opacity-70 flex-shrink-0'
					size={16}
				/>
			);
		}
		return null;
	};

	// Check if filename is short (7 characters or less)
	// Don't show badge for search queries (they start with quotes)
	const isSearchQuery = desc1 && typeof desc1 === 'string' && desc1.startsWith('"');
	// Always show filename on same line (removed length check)
	const isShortFilename = desc1 && !isSearchQuery;

	return (<div className='flex flex-col gap-y-0'>
		{/* Clean minimal tool header with vibrant pink-purple-orange gradient */}
		<div 
			className={`w-full flex flex-col transition-all duration-200
				${isClickable ? 'cursor-pointer hover:opacity-95' : ''}
			`}
			style={{
				background: 'linear-gradient(135deg, #FFE5F0 0%, #F3E5FF 40%, #FFE8D9 100%)',
				border: '1px solid rgba(255, 200, 230, 0.3)',
				borderRadius: children ? '8px 8px 0 0' : '8px',
				boxShadow: 'inset 0 1px 3px rgba(255, 105, 180, 0.1), inset 0 0 0 1px rgba(255, 255, 255, 0.6)',
			}}
			onClick={() => {
				if (onClick) { onClick(); }
			}}
		>
			{/* First line: Action and status (with short filename if applicable) */}
			<div className="flex items-center gap-x-2 px-3 py-2">
				{/* Title text - action only (e.g., "Reading", "Editing") with shimmer animation when running */}
				{isRunning ? (
					<motion.span 
						className="flex-shrink-0 text-[12px] font-medium"
						style={{
							background: 'linear-gradient(110deg, rgba(156, 163, 175, 0.4) 0%, rgba(26, 26, 26, 0.6) 50%, rgba(156, 163, 175, 0.4) 100%)',
							backgroundSize: '200% 100%',
							WebkitBackgroundClip: 'text',
							WebkitTextFillColor: 'transparent',
							backgroundClip: 'text',
							color: 'transparent',
							fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
							letterSpacing: '-0.01em',
							fontWeight: 500,
						}}
						initial={{ backgroundPosition: '200% 0' }}
						animate={{ backgroundPosition: '-200% 0' }}
						transition={{
							repeat: Infinity,
							duration: 2,
							ease: 'linear',
						}}
					>
						{title}
					</motion.span>
				) : isError ? (
					<motion.span 
						className="flex-shrink-0 text-[12px] font-medium relative"
						style={{
							color: '#1A1A1A',
							fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
							letterSpacing: '-0.01em',
							fontWeight: 500,
						}}
					>
						{title}
						<motion.div
							style={{
								position: 'absolute',
								top: '50%',
								left: 0,
								right: 0,
								height: '1px',
								background: '#EF4444',
								transformOrigin: 'left',
							}}
							initial={{ scaleX: 0 }}
							animate={{ scaleX: 1 }}
							transition={{
								duration: 0.3,
								ease: 'easeOut',
							}}
						/>
					</motion.span>
				) : (
					<span 
						className="flex-shrink-0 text-[12px] font-medium"
						style={{
							color: '#1A1A1A',
							fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
							letterSpacing: '-0.01em',
							fontWeight: 500,
						}}
					>
						{title}
					</span>
				)}

				{/* Filename with icon on same line */}
				{isShortFilename && typeof desc1 === 'string' && (
					<span 
						className={`inline-flex items-center gap-x-1 text-[11px] font-normal ${desc1OnClick ? 'cursor-pointer hover:opacity-70' : ''}`}
						style={{
							fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
							letterSpacing: '0em',
							color: '#6B6B6B',
						}}
						onClick={desc1OnClick}
					>
						<FileIconSpan filename={desc1} />
						<span>
							{desc1}
						</span>
					</span>
				)}

				{/* Line count badges */}
				{(linesAdded !== undefined && linesAdded > 0) && (
					<span 
						className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded"
						style={{
							background: '#DCFCE7',
							color: '#166534',
							fontFamily: 'SF Mono, Monaco, Consolas, monospace',
						}}
					>
						+{linesAdded}
					</span>
				)}
				{(linesDeleted !== undefined && linesDeleted > 0) && (
					<span 
						className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded"
						style={{
							background: '#FEE2E2',
							color: '#991B1B',
							fontFamily: 'SF Mono, Monaco, Consolas, monospace',
						}}
					>
						-{linesDeleted}
					</span>
				)}

				{/* Spacer */}
				<div className="flex-1" />

				{/* Right side - status and info */}
				<div className="flex items-center gap-x-2 flex-shrink-0">
					{info && <CircleEllipsis
						className='opacity-40 flex-shrink-0 hover:opacity-70 transition-opacity'
						size={13}
						style={{ color: '#9CA3AF' }}
						data-tooltip-id='void-tooltip'
						data-tooltip-content={info}
						data-tooltip-place='top-end'
					/>}

					<StatusIcon />

					{desc2 && <span 
						className="text-xs opacity-50 hover:opacity-80 transition-opacity cursor-pointer truncate max-w-[200px]" 
						style={{ color: '#9CA3AF' }}
						onClick={desc2OnClick}
					>
						{desc2}
					</span>}
					{numResults !== undefined && (
						<span 
							className="text-xs ml-auto opacity-60"
							style={{ color: '#9CA3AF' }}
						>
							{`${numResults}${hasNextPage ? '+' : ''} result${numResults !== 1 ? 's' : ''}`}
					</span>
				)}
			</div>
		</div>
		</div>

		{/* Children content - always shown */}
		{children}

		{bottomChildren}
	</div>);
};



const EditTool = ({ toolMessage, threadId, messageIdx, content }: Parameters<ResultWrapper<'edit_file' | 'rewrite_file'>>[0] & { content: string }) => {
	const accessor = useAccessor()
	const commandService = accessor.get('ICommandService')
	const voidModelService = accessor.get('IVoidModelService')
	const isError = false
	const isRejected = toolMessage.type === 'rejected'

	const title = getTitle(toolMessage)

	const { desc1, desc1Info } = toolNameToDesc(toolMessage.name, toolMessage.params, accessor)
	const icon = null

	const { rawParams, params, name } = toolMessage
	const desc1OnClick = () => voidOpenFileFn(params.uri, accessor)
	const badgeColor = getFilenameBadgeColor(name as BuiltinToolName)
	
	// Calculate line counts from the content
	let linesAdded: number | undefined;
	let linesDeleted: number | undefined;
	
	// Only calculate for completed edits (success or rejected), not while running
	if (content && (toolMessage.type === 'success' || toolMessage.type === 'rejected')) {
		if (toolMessage.name === 'edit_file') {
			// For edit_file, content contains ORIGINAL/UPDATED blocks
			// Parse the blocks to count actual line changes
			const blocks = content.split('<<<<<<< ORIGINAL');
			let totalAdded = 0;
			let totalDeleted = 0;
			
			for (const block of blocks) {
				if (!block.trim()) continue;
				
				const parts = block.split('=======');
				if (parts.length === 2) {
					const originalPart = parts[0].trim();
					const updatedPart = parts[1].split('>>>>>>> UPDATED')[0].trim();
					
					// Count actual lines (not empty strings)
					const originalLines = originalPart ? originalPart.split('\n').filter(l => l.trim()).length : 0;
					const updatedLines = updatedPart ? updatedPart.split('\n').filter(l => l.trim()).length : 0;
					
					// Calculate net change for this block
					if (updatedLines > originalLines) {
						totalAdded += (updatedLines - originalLines);
					} else if (originalLines > updatedLines) {
						totalDeleted += (originalLines - updatedLines);
					}
				}
			}
			
			// Only show if there are actual changes
			if (totalAdded > 0) {
				linesAdded = totalAdded;
			}
			if (totalDeleted > 0) {
				linesDeleted = totalDeleted;
			}
		} else if (toolMessage.name === 'rewrite_file') {
			// For rewrite, compare new content with original file
			const { model } = voidModelService.getModel(params.uri);
			
			// Count lines in new content (filter out empty lines for accurate count)
			const newLines = content.split('\n').filter(l => l.trim()).length;
			
			if (model) {
				// File exists - show the diff
				const originalContent = model.getValue();
				const originalLines = originalContent.split('\n').filter(l => l.trim()).length;
				
				const diff = newLines - originalLines;
				
				// Show net change
				if (diff > 0) {
					linesAdded = diff;
				} else if (diff < 0) {
					linesDeleted = Math.abs(diff);
				}
				// If diff === 0, don't show any badge
			} else {
				// File doesn't exist (new file) - show all lines as added
				linesAdded = newLines;
			}
		}
	}
	
	const componentParams: ToolHeaderParams = { 
		title, 
		desc1, 
		desc1OnClick, 
		desc1Info, 
		isError, 
		icon, 
		isRejected, 
		badgeColor,
		linesAdded,
		linesDeleted,
	}


	const editToolType = toolMessage.name === 'edit_file' ? 'diff' : 'rewrite'
	const isRunning = toolMessage.type === 'running_now' || toolMessage.type === 'tool_request'
	
	// Open file in center editor when editing starts or when complete
	useEffect(() => {
		if (params.uri) {
			commandService.executeCommand('vscode.open', params.uri);
		}
	}, [params.uri, commandService]);
	
	if (isRunning) {
		componentParams.isRunning = true
		// Don't show code preview in chat - it's being edited live in the center editor
	}
	else if (toolMessage.type === 'success' || toolMessage.type === 'rejected' || toolMessage.type === 'tool_error') {
		// add apply box
		const applyBoxId = getApplyBoxId({
			threadId: threadId,
			messageIdx: messageIdx,
			tokenIdx: 'N/A',
		})
		componentParams.desc2 = <EditToolHeaderButtons
			applyBoxId={applyBoxId}
			uri={params.uri}
			codeStr={content}
			toolName={name}
			threadId={threadId}
		/>

		// Don't show code preview in chat when complete - changes are in the editor

		if (toolMessage.type === 'success' || toolMessage.type === 'rejected') {
			const { result } = toolMessage
			const lintErrorCount = result?.lintErrors?.length || 0
			componentParams.bottomChildren = lintErrorCount > 0 ? (
				<BottomChildren title={`!${lintErrorCount}`}>
					{result?.lintErrors?.map((error, i) => (
						<div key={i} className='whitespace-nowrap'>Lines {error.startLineNumber}-{error.endLineNumber}: {error.message}</div>
					))}
				</BottomChildren>
			) : null
		}
		else if (toolMessage.type === 'tool_error') {
			// error
			const { result } = toolMessage
			componentParams.bottomChildren = <BottomChildren title='Error'>
				<CodeChildren>
					{result}
				</CodeChildren>
			</BottomChildren>
		}
	}

	return <ToolHeaderWrapper {...componentParams} />
}

const SimplifiedToolHeader = ({
	title,
	children,
}: {
	title: string;
	children?: React.ReactNode;
}) => {
	const [isOpen, setIsOpen] = useState(false);
	const isDropdown = children !== undefined;
	return (
		<div>
			<div className="w-full">
				{/* header */}
				<div
					className={`select-none flex items-center min-h-[24px] ${isDropdown ? 'cursor-pointer' : ''}`}
					onClick={() => {
						if (isDropdown) { setIsOpen(v => !v); }
					}}
				>
					{isDropdown && (
						<ChevronRight
							className={`text-void-fg-3 mr-0.5 h-4 w-4 flex-shrink-0 transition-transform duration-100 ease-[cubic-bezier(0.4,0,0.2,1)] ${isOpen ? 'rotate-90' : ''}`}
						/>
					)}
					<div className="flex items-center w-full overflow-hidden">
						<span className="text-void-fg-3">{title}</span>
					</div>
				</div>
				{/* children */}
				{<div
					className={`overflow-hidden transition-all duration-200 ease-in-out ${isOpen ? 'opacity-100' : 'max-h-0 opacity-0'} text-void-fg-4`}
				>
					{children}
				</div>}
			</div>
		</div>
	);
};




const UserMessageComponent = ({ chatMessage, messageIdx, isCheckpointGhost, currCheckpointIdx, _scrollToBottom }: { chatMessage: ChatMessage & { role: 'user' }, messageIdx: number, currCheckpointIdx: number | undefined, isCheckpointGhost: boolean, _scrollToBottom: (() => void) | null }) => {

	const accessor = useAccessor()
	const chatThreadsService = accessor.get('IChatThreadService')

	// global state
	let isBeingEdited = false
	let stagingSelections: StagingSelectionItem[] = []
	let setIsBeingEdited = (_: boolean) => { }
	let setStagingSelections = (_: StagingSelectionItem[]) => { }

	if (messageIdx !== undefined) {
		const _state = chatThreadsService.getCurrentMessageState(messageIdx)
		isBeingEdited = _state.isBeingEdited
		stagingSelections = _state.stagingSelections
		setIsBeingEdited = (v) => chatThreadsService.setCurrentMessageState(messageIdx, { isBeingEdited: v })
		setStagingSelections = (s) => chatThreadsService.setCurrentMessageState(messageIdx, { stagingSelections: s })
	}


	// local state
	const mode: ChatBubbleMode = isBeingEdited ? 'edit' : 'display'
	const [isFocused, setIsFocused] = useState(false)
	const [isHovered, setIsHovered] = useState(false)
	const [isDisabled, setIsDisabled] = useState(false)
	const [textAreaRefState, setTextAreaRef] = useState<HTMLTextAreaElement | null>(null)
	const textAreaFnsRef = useRef<TextAreaFns | null>(null)
	// initialize on first render, and when edit was just enabled
	const _mustInitialize = useRef(true)
	const _justEnabledEdit = useRef(false)
	useEffect(() => {
		const canInitialize = mode === 'edit' && textAreaRefState
		const shouldInitialize = _justEnabledEdit.current || _mustInitialize.current
		if (canInitialize && shouldInitialize) {
			setStagingSelections(
				(chatMessage.selections || []).map(s => { // quick hack so we dont have to do anything more
					if (s.type === 'File') return { ...s, state: { ...s.state, wasAddedAsCurrentFile: false, } }
					else return s
				})
			)

			if (textAreaFnsRef.current)
				textAreaFnsRef.current.setValue(chatMessage.displayContent || '')

			textAreaRefState.focus();

			_justEnabledEdit.current = false
			_mustInitialize.current = false
		}

	}, [chatMessage, mode, _justEnabledEdit, textAreaRefState, textAreaFnsRef.current, _justEnabledEdit.current, _mustInitialize.current])

	const onOpenEdit = () => {
		setIsBeingEdited(true)
		chatThreadsService.setCurrentlyFocusedMessageIdx(messageIdx)
		_justEnabledEdit.current = true
	}
	const onCloseEdit = () => {
		setIsFocused(false)
		setIsHovered(false)
		setIsBeingEdited(false)
		chatThreadsService.setCurrentlyFocusedMessageIdx(undefined)

	}

	const EditSymbol = mode === 'display' ? Pencil : X


	let chatbubbleContents: React.ReactNode
	if (mode === 'display') {
		chatbubbleContents = <>
			<SelectedFiles type='past' messageIdx={messageIdx} selections={chatMessage.selections || []} />
			{/* Display attached images */}
			{chatMessage.images && chatMessage.images.length > 0 && (
				<div className="flex flex-wrap gap-2 pb-2">
					{chatMessage.images.map(image => (
						<div key={image.id} className="relative w-32 h-32 rounded border border-void-border-1 overflow-hidden">
							<img 
								src={image.dataUrl} 
								alt={image.name}
								className="w-full h-full object-cover cursor-pointer"
								onClick={() => {
									// Open image in new window for full view
									const win = window.open();
									if (win) {
										win.document.write(`<img src="${image.dataUrl}" style="max-width:100%; max-height:100vh;" />`);
									}
								}}
							/>
							<div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 px-1 py-0.5">
								<span className="text-white text-[9px] truncate block">{image.name}</span>
							</div>
						</div>
					))}
				</div>
			)}
			<span className='px-0.5'>{chatMessage.displayContent}</span>
		</>
	}
	else if (mode === 'edit') {

		const onSubmit = async () => {

			if (isDisabled) return;
			if (!textAreaRefState) return;
			if (messageIdx === undefined) return;

			// cancel any streams on this thread
			const threadId = chatThreadsService.state.currentThreadId

			await chatThreadsService.abortRunning(threadId)

			// update state
			setIsBeingEdited(false)
			chatThreadsService.setCurrentlyFocusedMessageIdx(undefined)

			// stream the edit
			const userMessage = textAreaRefState.value;
			try {
				await chatThreadsService.editUserMessageAndStreamResponse({ userMessage, messageIdx, threadId })
			} catch (e) {
				console.error('Error while editing message:', e)
			}
			await chatThreadsService.focusCurrentChat()
			requestAnimationFrame(() => _scrollToBottom?.())
		}

		const onAbort = async () => {
			const threadId = chatThreadsService.state.currentThreadId
			await chatThreadsService.abortRunning(threadId)
		}

		const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
			if (e.key === 'Escape') {
				onCloseEdit()
			}
			if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
				onSubmit()
			}
		}

		if (!chatMessage.content) { // don't show if empty and not loading (if loading, want to show).
			return null
		}

		chatbubbleContents = <VoidChatArea
			featureName='Chat'
			onSubmit={onSubmit}
			onAbort={onAbort}
			isStreaming={false}
			isDisabled={isDisabled}
			showSelections={true}
			showProspectiveSelections={false}
			selections={stagingSelections}
			setSelections={setStagingSelections}
		>
			<VoidInputBox2
				enableAtToMention
				ref={setTextAreaRef}
				className='min-h-[81px] max-h-[500px] px-0.5'
				placeholder="Edit your message..."
				onChangeText={(text) => setIsDisabled(!text)}
				onFocus={() => {
					setIsFocused(true)
					chatThreadsService.setCurrentlyFocusedMessageIdx(messageIdx);
				}}
				onBlur={() => {
					setIsFocused(false)
				}}
				onKeyDown={onKeyDown}
				fnsRef={textAreaFnsRef}
				multiline={true}
			/>
		</VoidChatArea>
	}

	const isMsgAfterCheckpoint = currCheckpointIdx !== undefined && currCheckpointIdx === messageIdx - 1

	return <div
		// align chatbubble accoridng to role
		className={`
        relative ml-auto
        ${mode === 'edit' ? 'w-full max-w-full'
				: mode === 'display' ? `self-end w-fit max-w-full whitespace-pre-wrap` : '' // user words should be pre
			}

        ${isCheckpointGhost && !isMsgAfterCheckpoint ? 'opacity-50 pointer-events-none' : ''}
    `}
		onMouseEnter={() => setIsHovered(true)}
		onMouseLeave={() => setIsHovered(false)}
	>
		<div
			// style chatbubble according to role
			className={`
            text-left rounded-lg max-w-full
            ${mode === 'edit' ? ''
					: mode === 'display' ? 'p-2 flex flex-col bg-void-bg-1 text-void-fg-1 overflow-x-auto cursor-pointer' : ''
				}
        `}
			onClick={() => { if (mode === 'display') { onOpenEdit() } }}
		>
			{chatbubbleContents}
		</div>



		<div
			className="absolute -top-1 -right-1 translate-x-0 -translate-y-0 z-1"
		// data-tooltip-id='void-tooltip'
		// data-tooltip-content='Edit message'
		// data-tooltip-place='left'
		>
			<EditSymbol
				size={18}
				className={`
                    cursor-pointer
                    p-[2px]
                    bg-void-bg-1 border border-void-border-1 rounded-md
                    transition-opacity duration-200 ease-in-out
                    ${isHovered || (isFocused && mode === 'edit') ? 'opacity-100' : 'opacity-0'}
                `}
				onClick={() => {
					if (mode === 'display') {
						onOpenEdit()
					} else if (mode === 'edit') {
						onCloseEdit()
					}
				}}
			/>
		</div>


	</div>

}

const SmallProseWrapper = ({ children }: { children: React.ReactNode }) => {
	return <div className='
text-void-fg-4
prose
prose-sm
break-words
max-w-none
leading-snug
text-[13px]

[&>:first-child]:!mt-0
[&>:last-child]:!mb-0

prose-h1:text-[14px]
prose-h1:my-4

prose-h2:text-[13px]
prose-h2:my-4

prose-h3:text-[13px]
prose-h3:my-3

prose-h4:text-[13px]
prose-h4:my-2

prose-p:my-2
prose-p:leading-snug
prose-hr:my-2

prose-ul:my-2
prose-ul:pl-4
prose-ul:list-outside
prose-ul:list-disc
prose-ul:leading-snug


prose-ol:my-2
prose-ol:pl-4
prose-ol:list-outside
prose-ol:list-decimal
prose-ol:leading-snug

marker:text-inherit

prose-blockquote:pl-2
prose-blockquote:my-2

prose-code:text-void-fg-3
prose-code:text-[12px]
prose-code:before:content-none
prose-code:after:content-none

prose-pre:text-[12px]
prose-pre:p-2
prose-pre:my-2

prose-table:text-[13px]
'>
		{children}
	</div>
}

const ProseWrapper = ({ children, isStreaming }: { children: React.ReactNode, isStreaming?: boolean }) => {
	return <div className='
text-void-fg-2
prose
prose-sm
break-words
prose-p:block
prose-hr:my-4
prose-pre:my-2
marker:text-inherit
prose-ol:list-outside
prose-ol:list-decimal
prose-ul:list-outside
prose-ul:list-disc
prose-li:my-0
prose-code:before:content-none
prose-code:after:content-none
prose-headings:prose-sm
prose-headings:font-bold

prose-p:leading-normal
prose-ol:leading-normal
prose-ul:leading-normal

max-w-none
'
	>
		{children}
	</div>
}
const AssistantMessageComponent = ({ chatMessage, isCheckpointGhost, isCommitted, messageIdx }: { chatMessage: ChatMessage & { role: 'assistant' }, isCheckpointGhost: boolean, messageIdx: number, isCommitted: boolean }) => {

	const accessor = useAccessor()
	const chatThreadsService = accessor.get('IChatThreadService')

	// Strip <think> tags from reasoning if present
	let reasoningStr = chatMessage.reasoning?.trim() || null
	if (reasoningStr) {
		// Remove <think> and </think> tags
		reasoningStr = reasoningStr.replace(/<\/?think>/gi, '').trim()
	}
	
	// Also check if displayContent has <think> tags (for streaming - extract partial or complete thinking)
	let displayContent = chatMessage.displayContent || ''
	
	// Check for complete <think>...</think> block
	const completeThinkMatch = displayContent.match(/<think>([\s\S]*?)<\/think>/i)
	if (completeThinkMatch) {
		if (!reasoningStr) {
			reasoningStr = completeThinkMatch[1].trim()
		}
		// Remove the complete <think> block from displayContent
		displayContent = displayContent.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
	}
	// Check for incomplete <think> tag (streaming in progress)
	else if (displayContent.includes('<think>')) {
		const thinkStartIdx = displayContent.indexOf('<think>')
		const contentBeforeThink = displayContent.substring(0, thinkStartIdx).trim()
		const thinkingContent = displayContent.substring(thinkStartIdx + 7).trim() // 7 = length of '<think>'
		
		if (!reasoningStr && thinkingContent) {
			reasoningStr = thinkingContent
		}
		// Show content before <think> tag, hide the thinking part during streaming
		displayContent = contentBeforeThink
	}
	
	const hasReasoning = !!reasoningStr
	const isThinkingComplete = isCommitted && hasReasoning
	const thread = chatThreadsService.getCurrentThread()

	const chatMessageLocation: ChatMessageLocation = {
		threadId: thread.id,
		messageIdx: messageIdx,
	}

	const isEmpty = !displayContent && !reasoningStr
	if (isEmpty) return null

	return <>
		{/* reasoning - show expanded while streaming, collapsed after complete */}
		{hasReasoning &&
			<div className={`${isCheckpointGhost ? 'opacity-50' : ''}`}>
				<ReasoningDisplay 
					reasoningStr={reasoningStr}
					isComplete={isThinkingComplete}
					chatMessageLocation={chatMessageLocation}
				/>
			</div>
		}

		{/* assistant message */}
		{displayContent &&
			<div className={`${isCheckpointGhost ? 'opacity-50' : ''}`}>
				<ProseWrapper isStreaming={!isCommitted}>
					<ChatMarkdownRender
						string={displayContent}
						chatMessageLocation={chatMessageLocation}
						isApplyEnabled={true}
						isLinkDetectionEnabled={true}
					/>
				</ProseWrapper>
			</div>
		}
	</>

}

const ReasoningDisplay = ({ reasoningStr, isComplete, chatMessageLocation }: { reasoningStr: string, isComplete: boolean, chatMessageLocation: ChatMessageLocation }) => {
	const [isExpanded, setIsExpanded] = useState(!isComplete)
	const [hasBeenManuallyToggled, setHasBeenManuallyToggled] = useState(false)

	// Auto-collapse when thinking completes with delay for smooth transition
	// BUT only if user hasn't manually toggled it
	useEffect(() => {
		if (isComplete && isExpanded && !hasBeenManuallyToggled) {
			const timer = setTimeout(() => {
				setIsExpanded(false)
			}, 500) // 500ms delay before collapsing
			return () => clearTimeout(timer)
		}
	}, [isComplete, isExpanded, hasBeenManuallyToggled])

	const handleToggle = (e: React.MouseEvent) => {
		e.preventDefault()
		e.stopPropagation()
		setHasBeenManuallyToggled(true)
		setIsExpanded(!isExpanded)
	}

	return (
		<div className="my-2">
			{/* Header with Reasoning label and dropdown button */}
			<div 
				className="flex items-center gap-2 cursor-pointer text-void-fg-3 hover:text-void-fg-2 transition-colors mb-1"
				onClick={handleToggle}
				onMouseDown={(e) => e.stopPropagation()}
			>
				{!isComplete ? (
					<motion.span 
						className="text-sm font-medium"
						style={{
							background: 'linear-gradient(90deg, rgba(156, 163, 175, 0.4) 0%, rgba(100, 116, 139, 0.8) 50%, rgba(156, 163, 175, 0.4) 100%)',
							backgroundSize: '200% 100%',
							WebkitBackgroundClip: 'text',
							WebkitTextFillColor: 'transparent',
							backgroundClip: 'text',
						}}
						initial={{ backgroundPosition: '100% center' }}
						animate={{ backgroundPosition: '-100% center' }}
						transition={{
							repeat: Infinity,
							duration: 2,
							ease: 'linear',
						}}
					>
						Reasoning
					</motion.span>
				) : (
					<span className="text-sm font-medium">Reasoning</span>
				)}
				<motion.div
					animate={{ rotate: isExpanded ? 90 : 0 }}
					transition={{ duration: 0.2, ease: 'easeInOut' }}
				>
					<ChevronRight size={14} />
				</motion.div>
			</div>

			{/* Reasoning content with smooth collapse animation */}
			<motion.div
				initial={false}
				animate={{
					height: isExpanded ? 'auto' : 0,
					opacity: isExpanded ? 1 : 0,
				}}
				transition={{
					height: { duration: 0.3, ease: 'easeInOut' },
					opacity: { duration: 0.2, ease: 'easeInOut' },
				}}
				style={{ overflow: 'hidden' }}
			>
				<div className="text-void-fg-3 text-sm italic">
					<SmallProseWrapper>
						<ChatMarkdownRender
							string={reasoningStr}
							chatMessageLocation={chatMessageLocation}
							isApplyEnabled={false}
							isLinkDetectionEnabled={true}
						/>
					</SmallProseWrapper>
				</div>
			</motion.div>
		</div>
	)
}

const ReasoningWrapper = ({ isDoneReasoning, isStreaming, children }: { isDoneReasoning: boolean, isStreaming: boolean, children: React.ReactNode }) => {
	const [isExpanded, setIsExpanded] = useState(false)
	const [thinkingTime, setThinkingTime] = useState(0)
	const startTimeRef = useRef<number | null>(null)

	// Track thinking time
	useEffect(() => {
		if (isStreaming && !startTimeRef.current) {
			startTimeRef.current = Date.now()
		}

		if (isStreaming) {
			const interval = setInterval(() => {
				if (startTimeRef.current) {
					setThinkingTime(Math.floor((Date.now() - startTimeRef.current) / 1000))
				}
			}, 100)
			return () => clearInterval(interval)
		} else if (startTimeRef.current && thinkingTime === 0) {
			// Finalize time when streaming stops
			setThinkingTime(Math.floor((Date.now() - startTimeRef.current) / 1000))
		}
	}, [isStreaming])

	const displayTime = thinkingTime > 0 ? `${thinkingTime}s` : '0s'

	return (
		<div className="my-2 border border-void-border-3 rounded-lg overflow-hidden" style={{ background: 'transparent' }}>
			{/* Header */}
			<div
				className="flex items-center justify-between px-3 py-2 cursor-pointer transition-colors"
				style={{ background: '#F9FAFB' }}
				onClick={() => setIsExpanded(!isExpanded)}
				onMouseEnter={(e) => e.currentTarget.style.background = '#F3F4F6'}
				onMouseLeave={(e) => e.currentTarget.style.background = '#F9FAFB'}
			>
				<div className="flex items-center gap-2">
					<span className="text-void-fg-2 text-sm font-medium">
						{isStreaming ? `Thinking...` : `Thought for ${displayTime}`}
					</span>
				</div>
				<ChevronRight
					size={16}
					className={`text-void-fg-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
				/>
			</div>

			{/* Content */}
			{isExpanded && (
				<div className="px-3 py-2 border-t border-void-border-3 text-void-fg-3 text-sm" style={{ background: 'transparent' }}>
					{children}
				</div>
			)}
		</div>
	)
}




// should either be past or "-ing" tense, not present tense. Eg. when the LLM searches for something, the user expects it to say "I searched for X" or "I am searching for X". Not "I search X".

const loadingTitleWrapper = (item: React.ReactNode): React.ReactNode => {
	return <span className='flex items-center flex-nowrap'>
		{item}
		<IconLoading className='w-3 text-sm' />
	</span>
}

const titleOfBuiltinToolName = {
	'read_file': { 
		done: (filename?: string) => 'Reading', 
		proposed: (filename?: string) => 'Reading', 
		running: (filename?: string) => loadingTitleWrapper('Reading') 
	},
	'ls_dir': { 
		done: (filename?: string) => 'Inspected', 
		proposed: (filename?: string) => 'Inspect', 
		running: (filename?: string) => loadingTitleWrapper('Inspecting') 
	},
	'get_dir_tree': { 
		done: (filename?: string) => 'Inspected', 
		proposed: (filename?: string) => 'Inspect', 
		running: (filename?: string) => loadingTitleWrapper('Inspecting') 
	},
	'search_pathnames_only': { 
		done: (filename?: string) => 'Searched by file name', 
		proposed: (filename?: string) => 'Search by file name', 
		running: (filename?: string) => loadingTitleWrapper('Searching by file name') 
	},
	'search_for_files': { 
		done: (filename?: string) => 'Searched', 
		proposed: (filename?: string) => 'Search', 
		running: (filename?: string) => loadingTitleWrapper('Searching') 
	},
	'create_file_or_folder': { 
		done: (filename?: string) => 'Created', 
		proposed: (filename?: string) => 'Create', 
		running: (filename?: string) => loadingTitleWrapper('Creating') 
	},
	'delete_file_or_folder': { 
		done: (filename?: string) => 'Deleted', 
		proposed: (filename?: string) => 'Delete', 
		running: (filename?: string) => loadingTitleWrapper('Deleting') 
	},
	'edit_file': { 
		done: (filename?: string) => 'Edited', 
		proposed: (filename?: string) => 'Editing', 
		running: (filename?: string) => loadingTitleWrapper('Editing') 
	},
	'rewrite_file': { 
		done: (filename?: string) => 'Wrote', 
		proposed: (filename?: string) => 'Writing', 
		running: (filename?: string) => loadingTitleWrapper('Writing') 
	},
	'run_command': { 
		done: (command?: string) => 'Ran command', 
		proposed: (command?: string) => 'Run command', 
		running: (command?: string) => loadingTitleWrapper('Running command') 
	},
	'run_persistent_command': { 
		done: (command?: string) => 'Ran command', 
		proposed: (command?: string) => 'Run command', 
		running: (command?: string) => loadingTitleWrapper('Running command') 
	},
	'open_persistent_terminal': { 
		done: (filename?: string) => 'Opened terminal', 
		proposed: (filename?: string) => 'Open terminal', 
		running: (filename?: string) => loadingTitleWrapper('Opening terminal') 
	},
	'kill_persistent_terminal': { 
		done: (filename?: string) => 'Killed terminal', 
		proposed: (filename?: string) => 'Kill terminal', 
		running: (filename?: string) => loadingTitleWrapper('Killing terminal') 
	},
	'read_terminal_output': { 
		done: (filename?: string) => 'Read terminal output', 
		proposed: (filename?: string) => 'Read terminal output', 
		running: (filename?: string) => loadingTitleWrapper('Reading terminal output') 
	},
	'read_lint_errors': { 
		done: (filename?: string) => 'Read lint errors', 
		proposed: (filename?: string) => 'Read lint errors', 
		running: (filename?: string) => loadingTitleWrapper('Reading lint errors') 
	},
	'search_in_file': { 
		done: (filename?: string) => 'Searched in file', 
		proposed: (filename?: string) => 'Search in file', 
		running: (filename?: string) => loadingTitleWrapper('Searching in file') 
	},
} as const satisfies Record<BuiltinToolName, { done: (filename?: string) => any, proposed: (filename?: string) => any, running: (filename?: string) => any }>

// Color mapping for different tool types
const getFilenameBadgeColor = (toolName: BuiltinToolName): string => {
	// Pink (#C71585) - Read operations
	if (toolName === 'read_file' || toolName === 'read_lint_errors') return '#C71585';
	
	// Red (#FF0000) - Delete operations
	if (toolName === 'delete_file_or_folder' || toolName === 'kill_persistent_terminal') return '#FF0000';
	
	// Violet (#9370DB) - Edit/Write operations
	if (toolName === 'edit_file' || toolName === 'rewrite_file') return '#9370DB';
	
	// White (#FFFFFF) - Create, Search, Terminal operations
	return '#FFFFFF';
}

const getTitle = (toolMessage: Pick<ChatMessage & { role: 'tool' }, 'name' | 'type' | 'mcpServerName' | 'params'>): React.ReactNode => {
	const t = toolMessage

	// non-built-in title
	if (!builtinToolNames.includes(t.name as BuiltinToolName)) {
		// descriptor of Running or Ran etc
		const descriptor =
			t.type === 'success' ? 'Called'
				: t.type === 'running_now' ? 'Calling'
					: t.type === 'tool_request' ? 'Call'
						: t.type === 'rejected' ? 'Call'
							: t.type === 'invalid_params' ? 'Call'
								: t.type === 'tool_error' ? 'Call'
									: 'Call'


		const title = `${descriptor} ${toolMessage.mcpServerName || 'MCP'}`
		if (t.type === 'running_now' || t.type === 'tool_request')
			return loadingTitleWrapper(title)
		return title
	}

	// built-in title
	else {
		const toolName = t.name as BuiltinToolName
		const uri = t.params?.uri
		let filename: string | undefined = undefined
		if (uri) {
			if (typeof uri === 'string') {
				filename = getBasename(uri)
			} else if (typeof uri === 'object' && uri !== null && 'fsPath' in uri && typeof uri.fsPath === 'string') {
				filename = getBasename(uri.fsPath)
			}
		}
		
		// For terminal commands, use the command as the display text
		let displayText = filename;
		if ((toolName === 'run_command' || toolName === 'run_persistent_command') && t.params?.command) {
			displayText = t.params.command;
		}
		
		if (t.type === 'success') return titleOfBuiltinToolName[toolName].done(displayText)
		if (t.type === 'running_now') return titleOfBuiltinToolName[toolName].running(displayText)
		return titleOfBuiltinToolName[toolName].proposed(displayText)
	}
}


const toolNameToDesc = (toolName: BuiltinToolName, _toolParams: BuiltinToolCallParams[BuiltinToolName] | undefined, accessor: ReturnType<typeof useAccessor>): {
	desc1: React.ReactNode,
	desc1Info?: string,
} => {

	if (!_toolParams) {
		return { desc1: '', };
	}

	const x = {
		'read_file': () => {
			const toolParams = _toolParams as BuiltinToolCallParams['read_file']
			return {
				desc1: getBasename(toolParams.uri.fsPath),
				desc1Info: getRelative(toolParams.uri, accessor),
			};
		},
		'ls_dir': () => {
			const toolParams = _toolParams as BuiltinToolCallParams['ls_dir']
			return {
				desc1: getFolderName(toolParams.uri.fsPath),
				desc1Info: getRelative(toolParams.uri, accessor),
			};
		},
		'search_pathnames_only': () => {
			const toolParams = _toolParams as BuiltinToolCallParams['search_pathnames_only']
			return {
				desc1: `"${toolParams.query}"`,
			}
		},
		'search_for_files': () => {
			const toolParams = _toolParams as BuiltinToolCallParams['search_for_files']
			return {
				desc1: `"${toolParams.query}"`,
			}
		},
		'search_in_file': () => {
			const toolParams = _toolParams as BuiltinToolCallParams['search_in_file'];
			return {
				desc1: `"${toolParams.query}"`,
				desc1Info: getRelative(toolParams.uri, accessor),
			};
		},
		'create_file_or_folder': () => {
			const toolParams = _toolParams as BuiltinToolCallParams['create_file_or_folder']
			return {
				desc1: toolParams.isFolder ? getFolderName(toolParams.uri.fsPath) ?? '/' : getBasename(toolParams.uri.fsPath),
				desc1Info: getRelative(toolParams.uri, accessor),
			}
		},
		'delete_file_or_folder': () => {
			const toolParams = _toolParams as BuiltinToolCallParams['delete_file_or_folder']
			return {
				desc1: toolParams.isFolder ? getFolderName(toolParams.uri.fsPath) ?? '/' : getBasename(toolParams.uri.fsPath),
				desc1Info: getRelative(toolParams.uri, accessor),
			}
		},
		'rewrite_file': () => {
			const toolParams = _toolParams as BuiltinToolCallParams['rewrite_file']
			return {
				desc1: getBasename(toolParams.uri.fsPath),
				desc1Info: getRelative(toolParams.uri, accessor),
			}
		},
		'edit_file': () => {
			const toolParams = _toolParams as BuiltinToolCallParams['edit_file']
			return {
				desc1: getBasename(toolParams.uri.fsPath),
				desc1Info: getRelative(toolParams.uri, accessor),
			}
		},
		'run_command': () => {
			const toolParams = _toolParams as BuiltinToolCallParams['run_command']
			return {
				desc1: `"${toolParams.command}"`,
			}
		},
		'run_persistent_command': () => {
			const toolParams = _toolParams as BuiltinToolCallParams['run_persistent_command']
			return {
				desc1: `"${toolParams.command}"`,
			}
		},
		'open_persistent_terminal': () => {
			const toolParams = _toolParams as BuiltinToolCallParams['open_persistent_terminal']
			return { desc1: '' }
		},
		'kill_persistent_terminal': () => {
			const toolParams = _toolParams as BuiltinToolCallParams['kill_persistent_terminal']
			return { desc1: toolParams.persistentTerminalId }
		},
		'read_terminal_output': () => {
			const toolParams = _toolParams as BuiltinToolCallParams['read_terminal_output']
			return { desc1: toolParams.persistentTerminalId }
		},
		'get_dir_tree': () => {
			const toolParams = _toolParams as BuiltinToolCallParams['get_dir_tree']
			return {
				desc1: getFolderName(toolParams.uri.fsPath) ?? '/',
				desc1Info: getRelative(toolParams.uri, accessor),
			}
		},
		'read_lint_errors': () => {
			const toolParams = _toolParams as BuiltinToolCallParams['read_lint_errors']
			return {
				desc1: getBasename(toolParams.uri.fsPath),
				desc1Info: getRelative(toolParams.uri, accessor),
			}
		}
	}

	try {
		return x[toolName]?.() || { desc1: '' }
	}
	catch {
		return { desc1: '' }
	}
}

const ToolRequestAcceptRejectButtons = ({ toolName }: { toolName: ToolName }) => {
	const accessor = useAccessor()
	const chatThreadsService = accessor.get('IChatThreadService')
	const metricsService = accessor.get('IMetricsService')
	const voidSettingsService = accessor.get('IVoidSettingsService')
	const voidSettingsState = useSettingsState()

	const onAccept = useCallback(() => {
		try { // this doesn't need to be wrapped in try/catch anymore
			const threadId = chatThreadsService.state.currentThreadId
			chatThreadsService.approveLatestToolRequest(threadId)
			metricsService.capture('Tool Request Accepted', {})
		} catch (e) { console.error('Error while approving message in chat:', e) }
	}, [chatThreadsService, metricsService])

	const onReject = useCallback(() => {
		try {
			const threadId = chatThreadsService.state.currentThreadId
			chatThreadsService.rejectLatestToolRequest(threadId)
		} catch (e) { console.error('Error while approving message in chat:', e) }
		metricsService.capture('Tool Request Rejected', {})
	}, [chatThreadsService, metricsService])

	const approveButton = (
		<button
			onClick={onAccept}
			className={`
                px-2 py-1
                bg-[var(--vscode-button-background)]
                text-[var(--vscode-button-foreground)]
                hover:bg-[var(--vscode-button-hoverBackground)]
                rounded
                text-sm font-medium
            `}
		>
			Approve
		</button>
	)

	const cancelButton = (
		<button
			onClick={onReject}
			className={`
                px-2 py-1
                bg-[var(--vscode-button-secondaryBackground)]
                text-[var(--vscode-button-secondaryForeground)]
                hover:bg-[var(--vscode-button-secondaryHoverBackground)]
                rounded
                text-sm font-medium
            `}
		>
			Cancel
		</button>
	)

	const approvalType = isABuiltinToolName(toolName) ? approvalTypeOfBuiltinToolName[toolName] : 'MCP tools'
	const approvalToggle = approvalType ? <div key={approvalType} className="flex items-center ml-2 gap-x-1">
		<ToolApprovalTypeSwitch size='xs' approvalType={approvalType} desc={`Auto-approve ${approvalType}`} />
	</div> : null

	return <div className="flex gap-2 mx-0.5 items-center">
		{approveButton}
		{cancelButton}
		{approvalToggle}
	</div>
}

export const ToolChildrenWrapper = ({ children, className }: { children: React.ReactNode, className?: string }) => {
	return <div className={`${className ? className : ''} cursor-default select-none`}>
		<div 
			className='rounded-b-lg overflow-hidden'
			style={{
				backgroundColor: '#FFFFFF',
				border: '1px solid #E8E8E8',
				borderTop: 'none',
				boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.08), inset 0 0 0 1px rgba(255, 255, 255, 0.5)',
			}}
		>
			{children}
		</div>
	</div>
}
export const CodeChildren = ({ children, className }: { children: React.ReactNode, className?: string }) => {
	return <div 
		className={`${className ?? ''} px-3 py-2 overflow-auto text-[11px] font-mono`}
		style={{
			backgroundColor: '#FAFAFA',
			color: '#1A1A1A',
			lineHeight: '1.6',
			fontFamily: '"SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, "Courier New", monospace',
			boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.08), inset 0 0 0 1px rgba(255, 255, 255, 0.5)',
		}}
	>
		<div className='!select-text cursor-auto'>
			{children}
		</div>
	</div>
}

export const ListableToolItem = ({ name, onClick, isSmall, className, showDot }: { name: React.ReactNode, onClick?: () => void, isSmall?: boolean, className?: string, showDot?: boolean }) => {
	return <div
		className={`
			${onClick ? 'hover:brightness-125 hover:cursor-pointer transition-all duration-200 ' : ''}
			flex items-center flex-nowrap whitespace-nowrap
			${className ? className : ''}
			`}
		onClick={onClick}
	>
		{showDot === false ? null : <div className="flex-shrink-0"><svg className="w-1 h-1 opacity-60 mr-1.5 fill-current" viewBox="0 0 100 40"><rect x="0" y="15" width="100" height="10" /></svg></div>}
		<div className={`${isSmall ? 'italic text-void-fg-4 flex items-center' : ''}`}>{name}</div>
	</div>
}



const EditToolChildren = ({ uri, code, type }: { uri: URI | undefined, code: string, type: 'diff' | 'rewrite' }) => {

	const content = type === 'diff' ?
		<VoidDiffEditor uri={uri} searchReplaceBlocks={code} />
		: <ChatMarkdownRender string={`\`\`\`\n${code}\n\`\`\``} codeURI={uri} chatMessageLocation={undefined} />

	return <div 
		className='!select-text cursor-auto px-3 py-2'
		style={{
			backgroundColor: '#FAFAFA',
			color: '#1A1A1A',
			boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.04)',
		}}
	>
		<SmallProseWrapper>
			{content}
		</SmallProseWrapper>
	</div>

}


const LintErrorChildren = ({ lintErrors }: { lintErrors: LintErrorItem[] }) => {
	return <div 
		className="text-xs px-3.5 py-2.5 flex flex-col gap-1 overflow-x-auto rounded-b-lg"
		style={{
			backgroundColor: '#FEF2F2',
			color: '#991B1B',
			border: '1px solid #E8E8E8',
			borderTop: 'none',
			borderLeft: '2px solid #F87171',
			boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.04)',
		}}
	>
		{lintErrors.map((error, i) => (
			<div key={i}>Lines {error.startLineNumber}-{error.endLineNumber}: {error.message}</div>
		))}
	</div>
}

const BottomChildren = ({ children, title }: { children: React.ReactNode, title: string }) => {
	const [isOpen, setIsOpen] = useState(false);
	if (!children) return null;
	return (
		<div className="w-full mt-2">
			<div
				className={`flex items-center cursor-pointer select-none transition-all duration-150 px-3.5 py-2 rounded-lg`}
				onClick={() => setIsOpen(o => !o)}
				style={{ 
					background: '#F0F0F0',
					border: '1px solid #E8E8E8',
					boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.04)',
				}}
				onMouseEnter={(e) => e.currentTarget.style.background = '#E8E8E8'}
				onMouseLeave={(e) => e.currentTarget.style.background = '#F0F0F0'}
			>
				<ChevronRight
					className={`mr-2 h-3 w-3 flex-shrink-0 transition-transform duration-150 ${isOpen ? 'rotate-90' : ''}`}
					style={{ color: 'rgba(31, 31, 31, 0.5)' }}
				/>
				<span 
					className="font-normal text-xs"
					style={{ color: 'rgba(31, 31, 31, 0.7)' }}
				>
					{title}
				</span>
			</div>
			<div
				className={`overflow-hidden transition-all duration-200 ease-in-out ${isOpen ? 'opacity-100 mt-2' : 'max-h-0 opacity-0'}`}
			>
				<div 
					className="overflow-x-auto text-xs px-3.5 py-2.5 rounded-lg"
					style={{
						backgroundColor: '#FEF2F2',
						color: '#991B1B',
						border: '1px solid #E8E8E8',
						borderLeft: '2px solid #F87171',
						boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.04)',
					}}
				>
					{children}
				</div>
			</div>
		</div>
	);
}


const EditToolHeaderButtons = ({ applyBoxId, uri, codeStr, toolName, threadId }: { threadId: string, applyBoxId: string, uri: URI, codeStr: string, toolName: 'edit_file' | 'rewrite_file' }) => {
	const { streamState } = useEditToolStreamState({ applyBoxId, uri })
	return <div className='flex items-center gap-1'>
		{/* <StatusIndicatorForApplyButton applyBoxId={applyBoxId} uri={uri} /> */}
		{/* <JumpToFileButton uri={uri} /> */}
		{streamState === 'idle-no-changes' && <CopyButton codeStr={codeStr} toolTipName='Copy' />}
		<EditToolAcceptRejectButtonsHTML type={toolName} codeStr={codeStr} applyBoxId={applyBoxId} uri={uri} threadId={threadId} />
	</div>
}



const InvalidTool = ({ toolName, message, mcpServerName }: { toolName: ToolName, message: string, mcpServerName: string | undefined }) => {
	const accessor = useAccessor()
	const title = getTitle({ name: toolName, type: 'invalid_params', mcpServerName })
	const desc1 = 'Invalid parameters'
	const icon = null
	const isError = true
	const componentParams: ToolHeaderParams = { title, desc1, isError, icon }

	componentParams.children = <ToolChildrenWrapper>
		<CodeChildren>
			{message}
		</CodeChildren>
	</ToolChildrenWrapper>
	return <ToolHeaderWrapper {...componentParams} />
}

const CanceledTool = ({ toolName, mcpServerName }: { toolName: ToolName, mcpServerName: string | undefined }) => {
	const accessor = useAccessor()
	const title = getTitle({ name: toolName, type: 'rejected', mcpServerName })
	const desc1 = ''
	const icon = null
	const isRejected = true
	const componentParams: ToolHeaderParams = { title, desc1, icon, isRejected }
	return <ToolHeaderWrapper {...componentParams} />
}


const CommandTool = ({ toolMessage, type, threadId }: { threadId: string } & ({
	toolMessage: Exclude<ToolMessage<'run_command'>, { type: 'invalid_params' }>
	type: 'run_command'
} | {
	toolMessage: Exclude<ToolMessage<'run_persistent_command'>, { type: 'invalid_params' }>
	type: | 'run_persistent_command'
})) => {
	const accessor = useAccessor()

	const commandService = accessor.get('ICommandService')
	const terminalToolsService = accessor.get('ITerminalToolService')
	const toolsService = accessor.get('IToolsService')
	const isError = false
	const title = getTitle(toolMessage)
	const { desc1, desc1Info } = toolNameToDesc(toolMessage.name, toolMessage.params, accessor)
	const icon = null
	const streamState = useChatThreadsStreamState(threadId)

	const isRejected = toolMessage.type === 'rejected'
	const { rawParams, params } = toolMessage
	const componentParams: ToolHeaderParams = { title, desc1, desc1Info, isError, icon, isRejected, }


	// Focus terminal when command starts running
	const effect = async () => {
		if (streamState?.isRunning !== 'tool') return
		if (toolMessage.type !== 'running_now') return;

		// wait for the interruptor so we know it's running
		await streamState?.interrupt

		let terminal;
		if (type === 'run_command') {
			terminal = terminalToolsService.getTemporaryTerminal(toolMessage.params.terminalId);
		} else {
			terminal = terminalToolsService.getPersistentTerminal(toolMessage.params.persistentTerminalId);
		}
		
		if (!terminal) return;

		// Show terminal in the original terminal panel
		try {
			commandService.executeCommand('workbench.action.terminal.focus');
			terminal.setVisible(true);
		} catch {
		}
	}

	useEffect(() => {
		effect()
	}, [terminalToolsService, toolMessage, toolMessage.type, type, streamState]);

	if (toolMessage.type === 'success') {
		const { result } = toolMessage

		let msg: string
		if (type === 'run_command') msg = toolsService.stringOfResult['run_command'](toolMessage.params, result)
		else msg = toolsService.stringOfResult['run_persistent_command'](toolMessage.params, result)

		if (type === 'run_persistent_command') {
			componentParams.info = persistentTerminalNameOfId(toolMessage.params.persistentTerminalId)
		}

		// Show command that was run
		const command = toolMessage.params.command;
		
		// Detect language from command for better syntax highlighting
		let language = 'shell';
		
		if (command.includes('python') || command.endsWith('.py')) {
			language = 'python';
		} else if (command.includes('node') || command.includes('npm') || command.endsWith('.js') || command.endsWith('.ts')) {
			language = 'javascript';
		} else if (command.includes('ruby') || command.endsWith('.rb')) {
			language = 'ruby';
		} else if (command.includes('java') || command.endsWith('.java')) {
			language = 'java';
		} else if (command.includes('go run') || command.endsWith('.go')) {
			language = 'go';
		} else if (command.includes('cargo') || command.endsWith('.rs')) {
			language = 'rust';
		}

		// Show command with > prefix
		componentParams.children = <ToolChildrenWrapper>
			<CodeChildren>
				<BlockCode initValue={`> ${command}`} language={language} noBg={true} />
			</CodeChildren>
		</ToolChildrenWrapper>
		
		// Don't show status messages - they're redundant
	}
	else if (toolMessage.type === 'tool_error') {
		const { result } = toolMessage
		
		// Hide terminal-related errors (they're internal issues)
		const terminalErrors = [
			'Terminal creation failed',
			'Persistent terminal',
			'does not exist',
			'Please create it first using open_persistent_terminal'
		];
		const isTerminalError = terminalErrors.some(err => result.includes(err));
		
		if (isTerminalError) {
			// Don't show terminal errors - they're confusing to users
			return null;
		}
		
		// Show the command that was run
		const command = toolMessage.params.command;
		let language = 'shell';
		
		if (command.toLowerCase().includes('python') || command.toLowerCase().endsWith('.py')) {
			language = 'python';
		} else if (command.toLowerCase().includes('node') || command.toLowerCase().includes('npm') || command.toLowerCase().endsWith('.js') || command.toLowerCase().endsWith('.ts')) {
			language = 'javascript';
		} else if (command.toLowerCase().includes('ruby') || command.toLowerCase().endsWith('.rb')) {
			language = 'ruby';
		} else if (command.toLowerCase().includes('java') || command.toLowerCase().endsWith('.java')) {
			language = 'java';
		} else if (command.toLowerCase().includes('go run') || command.toLowerCase().endsWith('.go')) {
			language = 'go';
		} else if (command.toLowerCase().includes('cargo') || command.toLowerCase().endsWith('.rs')) {
			language = 'rust';
		}
		
		// Show command in main area
		componentParams.children = <ToolChildrenWrapper>
			<CodeChildren>
				<BlockCode initValue={`> ${command}`} language={language} noBg={true} />
			</CodeChildren>
		</ToolChildrenWrapper>
		
		// Show error in bottom area
		componentParams.bottomChildren = <BottomChildren title='Error'>
			<CodeChildren>
				{result}
			</CodeChildren>
		</BottomChildren>
	}
	else if (toolMessage.type === 'running_now') {
		componentParams.isRunning = true
		// Show command being run
		const command = toolMessage.params.command;
		let language = 'shell';
		
		if (command.includes('python') || command.endsWith('.py')) {
			language = 'python';
		} else if (command.includes('node') || command.includes('npm') || command.endsWith('.js') || command.endsWith('.ts')) {
			language = 'javascript';
		}
		
		componentParams.children = <ToolChildrenWrapper>
			<CodeChildren>
				<BlockCode initValue={`> ${command}`} language={language} noBg={true} />
			</CodeChildren>
		</ToolChildrenWrapper>
		
		// Don't show status message - the shimmer animation is enough
	}
	else if (toolMessage.type === 'rejected' || toolMessage.type === 'tool_request') {
	}

	return <>
		<ToolHeaderWrapper {...componentParams} />
	</>
}

type WrapperProps<T extends ToolName> = { toolMessage: Exclude<ToolMessage<T>, { type: 'invalid_params' }>, messageIdx: number, threadId: string }
const MCPToolWrapper = ({ toolMessage }: WrapperProps<string>) => {
	const accessor = useAccessor()
	const mcpService = accessor.get('IMCPService')

	const title = getTitle(toolMessage)
	const desc1 = removeMCPToolNamePrefix(toolMessage.name)
	const icon = null


	if (toolMessage.type === 'running_now') return null // do not show running

	const isError = false
	const isRejected = toolMessage.type === 'rejected'
	const { rawParams, params } = toolMessage
	const componentParams: ToolHeaderParams = { title, desc1, isError, icon, isRejected, }

	const paramsStr = JSON.stringify(params, null, 2)
	componentParams.desc2 = <CopyButton codeStr={paramsStr} toolTipName={`Copy inputs: ${paramsStr}`} />

	componentParams.info = !toolMessage.mcpServerName ? 'MCP tool not found' : undefined

	// Add copy inputs button in desc2


	if (toolMessage.type === 'success' || toolMessage.type === 'tool_request') {
		const { result } = toolMessage
		const resultStr = result ? mcpService.stringifyResult(result) : 'null'
		componentParams.children = <ToolChildrenWrapper>
			<SmallProseWrapper>
				<ChatMarkdownRender
					string={`\`\`\`json\n${resultStr}\n\`\`\``}
					chatMessageLocation={undefined}
					isApplyEnabled={false}
					isLinkDetectionEnabled={true}
				/>
			</SmallProseWrapper>
		</ToolChildrenWrapper>
	}
	else if (toolMessage.type === 'tool_error') {
		const { result } = toolMessage
		componentParams.bottomChildren = <BottomChildren title='Error'>
			<CodeChildren>
				{result}
			</CodeChildren>
		</BottomChildren>
	}

	return <ToolHeaderWrapper {...componentParams} />

}

type ResultWrapper<T extends ToolName> = (props: WrapperProps<T>) => React.ReactNode

const builtinToolNameToComponent: { [T in BuiltinToolName]: { resultWrapper: ResultWrapper<T>, } } = {
	'read_file': {
		resultWrapper: ({ toolMessage }) => {
			const accessor = useAccessor()
			const commandService = accessor.get('ICommandService')

			const title = getTitle(toolMessage)

			const { desc1, desc1Info } = toolNameToDesc(toolMessage.name, toolMessage.params, accessor);
			const icon = null

			if (toolMessage.type === 'tool_request') return null // do not show past requests

			const isError = false
			const isRejected = toolMessage.type === 'rejected'
			const isRunning = toolMessage.type === 'running_now'
			const { rawParams, params } = toolMessage
			const componentParams: ToolHeaderParams = { title, desc1, desc1Info, isError, icon, isRejected, isRunning, }

			let range: [number, number] | undefined = undefined
			if (toolMessage.params.startLine !== null || toolMessage.params.endLine !== null) {
				const start = toolMessage.params.startLine === null ? `1` : `${toolMessage.params.startLine}`
				const end = toolMessage.params.endLine === null ? `` : `${toolMessage.params.endLine}`
				const addStr = `(${start}-${end})`
				componentParams.desc1 += ` ${addStr}`
				range = [params.startLine || 1, params.endLine || 1]
			}

			if (toolMessage.type === 'success') {
				const { result } = toolMessage
				componentParams.onClick = () => { voidOpenFileFn(params.uri, accessor, range) }
				if (result.hasNextPage && params.pageNumber === 1)  // first page
					componentParams.desc2 = `(truncated after ${Math.round(MAX_FILE_CHARS_PAGE) / 1000}k)`
				else if (params.pageNumber > 1) // subsequent pages
					componentParams.desc2 = `(part ${params.pageNumber})`
			}
			else if (toolMessage.type === 'tool_error') {
				const { result } = toolMessage
				// JumpToFileButton removed in favor of FileLinkText
				componentParams.bottomChildren = <BottomChildren title='Error'>
					<CodeChildren>
						{result}
					</CodeChildren>
				</BottomChildren>
			}

			return <ToolHeaderWrapper {...componentParams} />
		},
	},
	'get_dir_tree': {
		resultWrapper: ({ toolMessage }) => {
			const accessor = useAccessor()
			const commandService = accessor.get('ICommandService')

			const title = getTitle(toolMessage)
			const { desc1, desc1Info } = toolNameToDesc(toolMessage.name, toolMessage.params, accessor)
			const icon = null

			if (toolMessage.type === 'tool_request') return null // do not show past requests

			const isError = false
			const isRejected = toolMessage.type === 'rejected'
			const isRunning = toolMessage.type === 'running_now'
			const { rawParams, params } = toolMessage
			const componentParams: ToolHeaderParams = { title, desc1, desc1Info, isError, icon, isRejected, isRunning, }

			if (params.uri) {
				const rel = getRelative(params.uri, accessor)
				if (rel) componentParams.info = `Only search in ${rel}`
			}

			if (toolMessage.type === 'success') {
				const { result } = toolMessage
				componentParams.children = <ToolChildrenWrapper>
					<SmallProseWrapper>
						<ChatMarkdownRender
							string={`\`\`\`\n${result.str}\n\`\`\``}
							chatMessageLocation={undefined}
							isApplyEnabled={false}
							isLinkDetectionEnabled={true}
						/>
					</SmallProseWrapper>
				</ToolChildrenWrapper>
			}
			else if (toolMessage.type === 'tool_error') {
				const { result } = toolMessage
				componentParams.bottomChildren = <BottomChildren title='Error'>
					<CodeChildren>
						{result}
					</CodeChildren>
				</BottomChildren>
			}

			return <ToolHeaderWrapper {...componentParams} />

		}
	},
	'ls_dir': {
		resultWrapper: ({ toolMessage }) => {
			const accessor = useAccessor()
			const commandService = accessor.get('ICommandService')
			const explorerService = accessor.get('IExplorerService')
			const title = getTitle(toolMessage)
			const { desc1, desc1Info } = toolNameToDesc(toolMessage.name, toolMessage.params, accessor)
			const icon = null

			if (toolMessage.type === 'tool_request') return null // do not show past requests

			const isError = false
			const isRejected = toolMessage.type === 'rejected'
			const isRunning = toolMessage.type === 'running_now'
			const { rawParams, params } = toolMessage
			const componentParams: ToolHeaderParams = { title, desc1, desc1Info, isError, icon, isRejected, isRunning, }

			if (params.uri) {
				const rel = getRelative(params.uri, accessor)
				if (rel) componentParams.info = `Only search in ${rel}`
			}

			if (toolMessage.type === 'success') {
				const { result } = toolMessage
				componentParams.numResults = result.children?.length
				componentParams.hasNextPage = result.hasNextPage
				componentParams.children = !result.children || (result.children.length ?? 0) === 0 ? undefined
					: <ToolChildrenWrapper>
						{result.children.map((child, i) => (<ListableToolItem key={i}
							name={`${child.name}${child.isDirectory ? '/' : ''}`}
							className='w-full overflow-auto'
							onClick={() => {
								voidOpenFileFn(child.uri, accessor)
								// commandService.executeCommand('workbench.view.explorer'); // open in explorer folders view instead
								// explorerService.select(child.uri, true);
							}}
						/>))}
						{result.hasNextPage &&
							<ListableToolItem name={`Results truncated (${result.itemsRemaining} remaining).`} isSmall={true} className='w-full overflow-auto' />
						}
					</ToolChildrenWrapper>
			}
			else if (toolMessage.type === 'tool_error') {
				const { result } = toolMessage
				componentParams.bottomChildren = <BottomChildren title='Error'>
					<CodeChildren>
						{result}
					</CodeChildren>
				</BottomChildren>
			}

			return <ToolHeaderWrapper {...componentParams} />
		}
	},
	'search_pathnames_only': {
		resultWrapper: ({ toolMessage }) => {
			const accessor = useAccessor()
			const commandService = accessor.get('ICommandService')
			const isError = false
			const isRejected = toolMessage.type === 'rejected'
			const isRunning = toolMessage.type === 'running_now'
			const title = getTitle(toolMessage)
			const { desc1, desc1Info } = toolNameToDesc(toolMessage.name, toolMessage.params, accessor)
			const icon = null

			if (toolMessage.type === 'tool_request') return null // do not show past requests

			const { rawParams, params } = toolMessage
			const componentParams: ToolHeaderParams = { title, desc1, desc1Info, isError, icon, isRejected, isRunning, }

			if (params.includePattern) {
				componentParams.info = `Only search in ${params.includePattern}`
			}

			if (toolMessage.type === 'success') {
				const { result, rawParams } = toolMessage
				componentParams.numResults = result.uris.length
				componentParams.hasNextPage = result.hasNextPage
				componentParams.children = result.uris.length === 0 ? undefined
					: <ToolChildrenWrapper>
						{result.uris.map((uri, i) => (<ListableToolItem key={i}
							name={getBasename(uri.fsPath)}
							className='w-full overflow-auto'
							onClick={() => { voidOpenFileFn(uri, accessor) }}
						/>))}
						{result.hasNextPage &&
							<ListableToolItem name={'Results truncated.'} isSmall={true} className='w-full overflow-auto' />
						}

					</ToolChildrenWrapper>
			}
			else if (toolMessage.type === 'tool_error') {
				const { result } = toolMessage
				componentParams.bottomChildren = <BottomChildren title='Error'>
					<CodeChildren>
						{result}
					</CodeChildren>
				</BottomChildren>
			}

			return <ToolHeaderWrapper {...componentParams} />
		}
	},
	'search_for_files': {
		resultWrapper: ({ toolMessage }) => {
			const accessor = useAccessor()
			const commandService = accessor.get('ICommandService')
			const isError = false
			const isRejected = toolMessage.type === 'rejected'
			const isRunning = toolMessage.type === 'running_now'
			const title = getTitle(toolMessage)
			const { desc1, desc1Info } = toolNameToDesc(toolMessage.name, toolMessage.params, accessor)
			const icon = null

			if (toolMessage.type === 'tool_request') return null // do not show past requests

			const { rawParams, params } = toolMessage
			const componentParams: ToolHeaderParams = { title, desc1, desc1Info, isError, icon, isRejected, isRunning, }

			if (params.searchInFolder || params.isRegex) {
				let info: string[] = []
				if (params.searchInFolder) {
					const rel = getRelative(params.searchInFolder, accessor)
					if (rel) info.push(`Only search in ${rel}`)
				}
				if (params.isRegex) { info.push(`Uses regex search`) }
				componentParams.info = info.join('; ')
			}

			if (toolMessage.type === 'success') {
				const { result, rawParams } = toolMessage
				componentParams.numResults = result.uris.length
				componentParams.hasNextPage = result.hasNextPage
				componentParams.children = result.uris.length === 0 ? undefined
					: <ToolChildrenWrapper>
						{result.uris.map((uri, i) => (<ListableToolItem key={i}
							name={getBasename(uri.fsPath)}
							className='w-full overflow-auto'
							onClick={() => { voidOpenFileFn(uri, accessor) }}
						/>))}
						{result.hasNextPage &&
							<ListableToolItem name={`Results truncated.`} isSmall={true} className='w-full overflow-auto' />
						}

					</ToolChildrenWrapper>
			}
			else if (toolMessage.type === 'tool_error') {
				const { result } = toolMessage
				componentParams.bottomChildren = <BottomChildren title='Error'>
					<CodeChildren>
						{result}
					</CodeChildren>
				</BottomChildren>
			}
			return <ToolHeaderWrapper {...componentParams} />
		}
	},

	'search_in_file': {
		resultWrapper: ({ toolMessage }) => {
			const accessor = useAccessor();
			const toolsService = accessor.get('IToolsService');
			const title = getTitle(toolMessage);
			const isError = false
			const isRejected = toolMessage.type === 'rejected'
			const isRunning = toolMessage.type === 'running_now'
			const { desc1, desc1Info } = toolNameToDesc(toolMessage.name, toolMessage.params, accessor);
			const icon = null;

			if (toolMessage.type === 'tool_request') return null // do not show past requests

			const { rawParams, params } = toolMessage;
			const componentParams: ToolHeaderParams = { title, desc1, desc1Info, isError, icon, isRejected, isRunning };

			const infoarr: string[] = []
			const uriStr = getRelative(params.uri, accessor)
			if (uriStr) infoarr.push(uriStr)
			if (params.isRegex) infoarr.push('Uses regex search')
			componentParams.info = infoarr.join('; ')

			if (toolMessage.type === 'success') {
				const { result } = toolMessage; // result is array of snippets
				componentParams.numResults = result.lines.length;
				componentParams.children = result.lines.length === 0 ? undefined :
					<ToolChildrenWrapper>
						<CodeChildren>
							<pre className='font-mono whitespace-pre'>
								{toolsService.stringOfResult['search_in_file'](params, result)}
							</pre>
						</CodeChildren>
					</ToolChildrenWrapper>
			}
			else if (toolMessage.type === 'tool_error') {
				const { result } = toolMessage;
				componentParams.bottomChildren = <BottomChildren title='Error'>
					<CodeChildren>
						{result}
					</CodeChildren>
				</BottomChildren>
			}

			return <ToolHeaderWrapper {...componentParams} />;
		}
	},

	'read_lint_errors': {
		resultWrapper: ({ toolMessage }) => {
			const accessor = useAccessor()
			const commandService = accessor.get('ICommandService')

			const title = getTitle(toolMessage)

			const { uri } = toolMessage.params ?? {}
			const { desc1, desc1Info } = toolNameToDesc(toolMessage.name, toolMessage.params, accessor)
			const icon = null

			if (toolMessage.type === 'tool_request') return null // do not show past requests

			const isError = false
			const isRejected = toolMessage.type === 'rejected'
			const isRunning = toolMessage.type === 'running_now'
			const { rawParams, params } = toolMessage
			const componentParams: ToolHeaderParams = { title, desc1, desc1Info, isError, icon, isRejected, isRunning, }

			componentParams.info = getRelative(uri, accessor) // full path

			if (toolMessage.type === 'success') {
				const { result } = toolMessage
				componentParams.onClick = () => { voidOpenFileFn(params.uri, accessor) }
				if (result.lintErrors)
					componentParams.children = <LintErrorChildren lintErrors={result.lintErrors} />
				else
					componentParams.children = `No lint errors found.`

			}
			else if (toolMessage.type === 'tool_error') {
				const { result } = toolMessage
				// JumpToFileButton removed in favor of FileLinkText
				componentParams.bottomChildren = <BottomChildren title='Error'>
					<CodeChildren>
						{result}
					</CodeChildren>
				</BottomChildren>
			}

			return <ToolHeaderWrapper {...componentParams} />
		},
	},

	// ---

	'create_file_or_folder': {
		resultWrapper: ({ toolMessage }) => {
			const accessor = useAccessor()
			const commandService = accessor.get('ICommandService')
			const isError = false
			const isRejected = toolMessage.type === 'rejected'
			const isRunning = toolMessage.type === 'running_now'
			const title = getTitle(toolMessage)
			const { desc1, desc1Info } = toolNameToDesc(toolMessage.name, toolMessage.params, accessor)
			const icon = null


			const { rawParams, params } = toolMessage
			const componentParams: ToolHeaderParams = { title, desc1, desc1Info, isError, icon, isRejected, isRunning, }

			componentParams.info = getRelative(params.uri, accessor) // full path

			if (toolMessage.type === 'success') {
				const { result } = toolMessage
				componentParams.onClick = () => { voidOpenFileFn(params.uri, accessor) }
			}
			else if (toolMessage.type === 'rejected') {
				componentParams.onClick = () => { voidOpenFileFn(params.uri, accessor) }
			}
			else if (toolMessage.type === 'tool_error') {
				const { result } = toolMessage
				if (params) { componentParams.onClick = () => { voidOpenFileFn(params.uri, accessor) } }
				componentParams.bottomChildren = <BottomChildren title='Error'>
					<CodeChildren>
						{result}
					</CodeChildren>
				</BottomChildren>
			}
			else if (toolMessage.type === 'running_now') {
				// nothing more is needed
			}
			else if (toolMessage.type === 'tool_request') {
				// nothing more is needed
			}

			return <ToolHeaderWrapper {...componentParams} />
		}
	},
	'delete_file_or_folder': {
		resultWrapper: ({ toolMessage }) => {
			const accessor = useAccessor()
			const commandService = accessor.get('ICommandService')
			const isFolder = toolMessage.params?.isFolder ?? false
			const isError = false
			const isRejected = toolMessage.type === 'rejected'
			const isRunning = toolMessage.type === 'running_now'
			const title = getTitle(toolMessage)
			const { desc1, desc1Info } = toolNameToDesc(toolMessage.name, toolMessage.params, accessor)
			const icon = null

			const { rawParams, params } = toolMessage
			const componentParams: ToolHeaderParams = { title, desc1, desc1Info, isError, icon, isRejected, isRunning, }

			componentParams.info = getRelative(params.uri, accessor) // full path

			if (toolMessage.type === 'success') {
				const { result } = toolMessage
				componentParams.onClick = () => { voidOpenFileFn(params.uri, accessor) }
			}
			else if (toolMessage.type === 'rejected') {
				componentParams.onClick = () => { voidOpenFileFn(params.uri, accessor) }
			}
			else if (toolMessage.type === 'tool_error') {
				const { result } = toolMessage
				if (params) { componentParams.onClick = () => { voidOpenFileFn(params.uri, accessor) } }
				componentParams.bottomChildren = <BottomChildren title='Error'>
					<CodeChildren>
						{result}
					</CodeChildren>
				</BottomChildren>
			}
			else if (toolMessage.type === 'running_now') {
				const { result } = toolMessage
				componentParams.onClick = () => { voidOpenFileFn(params.uri, accessor) }
			}
			else if (toolMessage.type === 'tool_request') {
				const { result } = toolMessage
				componentParams.onClick = () => { voidOpenFileFn(params.uri, accessor) }
			}

			return <ToolHeaderWrapper {...componentParams} />
		}
	},
	'rewrite_file': {
		resultWrapper: (params) => {
			return <EditTool {...params} content={params.toolMessage.params.newContent} />
		}
	},
	'edit_file': {
		resultWrapper: (params) => {
			return <EditTool {...params} content={params.toolMessage.params.searchReplaceBlocks} />
		}
	},

	// ---

	'run_command': {
		resultWrapper: (params) => {
			return <CommandTool {...params} type='run_command' />
		}
	},

	'run_persistent_command': {
		resultWrapper: (params) => {
			return <CommandTool {...params} type='run_persistent_command' />
		}
	},
	'open_persistent_terminal': {
		resultWrapper: ({ toolMessage }) => {
			const accessor = useAccessor()
			const terminalToolsService = accessor.get('ITerminalToolService')

			const { desc1, desc1Info } = toolNameToDesc(toolMessage.name, toolMessage.params, accessor)
			const title = getTitle(toolMessage)
			const icon = null

			if (toolMessage.type === 'tool_request') return null // do not show past requests

			const isError = false
			const isRejected = toolMessage.type === 'rejected'
			const isRunning = toolMessage.type === 'running_now'
			const { rawParams, params } = toolMessage
			const componentParams: ToolHeaderParams = { title, desc1, desc1Info, isError, icon, isRejected, isRunning, }

			const relativePath = params.cwd ? getRelative(URI.file(params.cwd), accessor) : ''
			componentParams.info = relativePath ? `Running in ${relativePath}` : undefined

			if (toolMessage.type === 'success') {
				const { result } = toolMessage
				const { persistentTerminalId } = result
				componentParams.desc1 = persistentTerminalNameOfId(persistentTerminalId)
				componentParams.onClick = () => terminalToolsService.focusPersistentTerminal(persistentTerminalId)
			}
			else if (toolMessage.type === 'tool_error') {
				const { result } = toolMessage
				componentParams.bottomChildren = <BottomChildren title='Error'>
					<CodeChildren>
						{result}
					</CodeChildren>
				</BottomChildren>
			}

			return <ToolHeaderWrapper {...componentParams} />
		},
	},
	'kill_persistent_terminal': {
		resultWrapper: ({ toolMessage }) => {
			const accessor = useAccessor()
			const commandService = accessor.get('ICommandService')
			const terminalToolsService = accessor.get('ITerminalToolService')

			const { desc1, desc1Info } = toolNameToDesc(toolMessage.name, toolMessage.params, accessor)
			const title = getTitle(toolMessage)
			const icon = null

			if (toolMessage.type === 'tool_request') return null // do not show past requests

			const isError = false
			const isRejected = toolMessage.type === 'rejected'
			const isRunning = toolMessage.type === 'running_now'
			const { rawParams, params } = toolMessage
			const componentParams: ToolHeaderParams = { title, desc1, desc1Info, isError, icon, isRejected, isRunning, }

			if (toolMessage.type === 'success') {
				const { persistentTerminalId } = params
				componentParams.desc1 = persistentTerminalNameOfId(persistentTerminalId)
				componentParams.onClick = () => terminalToolsService.focusPersistentTerminal(persistentTerminalId)
			}
			else if (toolMessage.type === 'tool_error') {
				const { result } = toolMessage
				componentParams.bottomChildren = <BottomChildren title='Error'>
					<CodeChildren>
						{result}
					</CodeChildren>
				</BottomChildren>
			}

			return <ToolHeaderWrapper {...componentParams} />
		},
	},
	'read_terminal_output': {
		resultWrapper: ({ toolMessage }) => {
			const accessor = useAccessor()
			const terminalToolsService = accessor.get('ITerminalToolService')

			const { desc1, desc1Info } = toolNameToDesc(toolMessage.name, toolMessage.params, accessor)
			const title = getTitle(toolMessage)
			const icon = null

			if (toolMessage.type === 'tool_request') return null // do not show past requests

			const isError = false
			const isRejected = toolMessage.type === 'rejected'
			const isRunning = toolMessage.type === 'running_now'
			const { rawParams, params } = toolMessage
			const componentParams: ToolHeaderParams = { title, desc1, desc1Info, isError, icon, isRejected, isRunning, }

			if (toolMessage.type === 'success') {
				const { result } = toolMessage
				const { persistentTerminalId } = params
				
				// Set terminal name as desc1
				componentParams.desc1 = persistentTerminalNameOfId(persistentTerminalId)
				componentParams.onClick = () => terminalToolsService.focusPersistentTerminal(persistentTerminalId)
				
				// Show full terminal output in the main children area (like run_command)
				if (result && result.output) {
					componentParams.children = <ToolChildrenWrapper>
						<CodeChildren>
							<BlockCode initValue={result.output} language='shell' noBg={true} />
						</CodeChildren>
					</ToolChildrenWrapper>
				} else {
					componentParams.children = <ToolChildrenWrapper>
						<CodeChildren>
							<div style={{ color: '#9CA3AF', fontStyle: 'italic' }}>No output</div>
						</CodeChildren>
					</ToolChildrenWrapper>
				}
			}
			else if (toolMessage.type === 'tool_error') {
				const { result } = toolMessage
				componentParams.bottomChildren = <BottomChildren title='Error'>
					<CodeChildren>
						{result}
					</CodeChildren>
				</BottomChildren>
			}

			return <ToolHeaderWrapper {...componentParams} />
		},
	},
};


const Checkpoint = ({ message, threadId, messageIdx, isCheckpointGhost, threadIsRunning }: { message: CheckpointEntry, threadId: string; messageIdx: number, isCheckpointGhost: boolean, threadIsRunning: boolean }) => {
	const accessor = useAccessor()
	const chatThreadService = accessor.get('IChatThreadService')
	const streamState = useFullChatThreadsStreamState()

	const isRunning = useChatThreadsStreamState(threadId)?.isRunning
	const isDisabled = useMemo(() => {
		if (isRunning) return true
		return !!Object.keys(streamState).find((threadId2) => streamState[threadId2]?.isRunning)
	}, [isRunning, streamState])

	return <div
		className={`flex items-center justify-center px-2 `}
	>
		<div
			className={`
                    text-xs
                    text-void-fg-3
                    select-none
                    ${isCheckpointGhost ? 'opacity-50' : 'opacity-100'}
					${isDisabled ? 'cursor-default' : 'cursor-pointer'}
                `}
			style={{ position: 'relative', display: 'inline-block' }} // allow absolute icon
			onClick={() => {
				if (threadIsRunning) return
				if (isDisabled) return
				chatThreadService.jumpToCheckpointBeforeMessageIdx({
					threadId,
					messageIdx,
					jumpToUserModified: messageIdx === (chatThreadService.state.allThreads[threadId]?.messages.length ?? 0) - 1
				})
			}}
			{...isDisabled ? {
				'data-tooltip-id': 'void-tooltip',
				'data-tooltip-content': `Disabled ${isRunning ? 'when running' : 'because another thread is running'}`,
				'data-tooltip-place': 'top',
			} : {}}
		>
			Checkpoint
		</div>
	</div>
}


type ChatBubbleMode = 'display' | 'edit'
type ChatBubbleProps = {
	chatMessage: ChatMessage,
	messageIdx: number,
	isCommitted: boolean,
	chatIsRunning: IsRunningType,
	threadId: string,
	currCheckpointIdx: number | undefined,
	_scrollToBottom: (() => void) | null,
}

const ChatBubble = (props: ChatBubbleProps) => {
	return <ErrorBoundary>
		<_ChatBubble {...props} />
	</ErrorBoundary>
}

const _ChatBubble = ({ threadId, chatMessage, currCheckpointIdx, isCommitted, messageIdx, chatIsRunning, _scrollToBottom }: ChatBubbleProps) => {
	const role = chatMessage.role

	const isCheckpointGhost = messageIdx > (currCheckpointIdx ?? Infinity) && !chatIsRunning // whether to show as gray (if chat is running, for good measure just dont show any ghosts)

	if (role === 'user') {
		return <UserMessageComponent
			chatMessage={chatMessage}
			isCheckpointGhost={isCheckpointGhost}
			currCheckpointIdx={currCheckpointIdx}
			messageIdx={messageIdx}
			_scrollToBottom={_scrollToBottom}
		/>
	}
	else if (role === 'assistant') {
		return <AssistantMessageComponent
			chatMessage={chatMessage}
			isCheckpointGhost={isCheckpointGhost}
			messageIdx={messageIdx}
			isCommitted={isCommitted}
		/>
	}
	else if (role === 'tool') {

		if (chatMessage.type === 'invalid_params') {
			return <div className={`${isCheckpointGhost ? 'opacity-50' : ''}`}>
				<InvalidTool toolName={chatMessage.name} message={chatMessage.content} mcpServerName={chatMessage.mcpServerName} />
			</div>
		}

		const toolName = chatMessage.name
		const isBuiltInTool = isABuiltinToolName(toolName)
		const ToolResultWrapper = isBuiltInTool ? builtinToolNameToComponent[toolName]?.resultWrapper as ResultWrapper<ToolName>
			: MCPToolWrapper as ResultWrapper<ToolName>

		if (ToolResultWrapper)
			return <>
				<div className={`${isCheckpointGhost ? 'opacity-50' : ''}`}>
					<ToolResultWrapper
						toolMessage={chatMessage}
						messageIdx={messageIdx}
						threadId={threadId}
					/>
				</div>
				{chatMessage.type === 'tool_request' ?
					<div className={`${isCheckpointGhost ? 'opacity-50 pointer-events-none' : ''}`}>
						<ToolRequestAcceptRejectButtons toolName={chatMessage.name} />
					</div> : null}
			</>
		return null
	}

	else if (role === 'interrupted_streaming_tool') {
		return <div className={`${isCheckpointGhost ? 'opacity-50' : ''}`}>
			<CanceledTool toolName={chatMessage.name} mcpServerName={chatMessage.mcpServerName} />
		</div>
	}

	else if (role === 'checkpoint') {
		// Hide checkpoint - don't render anything
		return null
	}

}

const CommandBarInChat = () => {
	const { stateOfURI: commandBarStateOfURI, sortedURIs: sortedCommandBarURIs } = useCommandBarState()
	const numFilesChanged = sortedCommandBarURIs.length

	const accessor = useAccessor()
	const editCodeService = accessor.get('IEditCodeService')
	const commandService = accessor.get('ICommandService')
	const chatThreadsState = useChatThreadsState()
	const commandBarState = useCommandBarState()
	const chatThreadsStreamState = useChatThreadsStreamState(chatThreadsState.currentThreadId)

	// (
	// 	<IconShell1
	// 		Icon={CopyIcon}
	// 		onClick={copyChatToClipboard}
	// 		data-tooltip-id='void-tooltip'
	// 		data-tooltip-place='top'
	// 		data-tooltip-content='Copy chat JSON'
	// 	/>
	// )

	const [fileDetailsOpenedState, setFileDetailsOpenedState] = useState<'auto-opened' | 'auto-closed' | 'user-opened' | 'user-closed'>('auto-closed');
	const isFileDetailsOpened = fileDetailsOpenedState === 'auto-opened' || fileDetailsOpenedState === 'user-opened';


	useEffect(() => {
		// close the file details if there are no files
		// this converts 'user-closed' to 'auto-closed'
		if (numFilesChanged === 0) {
			setFileDetailsOpenedState('auto-closed')
		}
		// open the file details if it hasnt been closed
		if (numFilesChanged > 0 && fileDetailsOpenedState !== 'user-closed') {
			setFileDetailsOpenedState('auto-opened')
		}
	}, [fileDetailsOpenedState, setFileDetailsOpenedState, numFilesChanged])


	const isFinishedMakingThreadChanges = (
		// there are changed files
		commandBarState.sortedURIs.length !== 0
		// none of the files are streaming
		&& commandBarState.sortedURIs.every(uri => !commandBarState.stateOfURI[uri.fsPath]?.isStreaming)
	)

	// ======== status of agent ========
	// This icon answers the question "is the LLM doing work on this thread?"
	// assume it is single threaded for now
	// green = Running
	// orange = Requires action
	// dark = Done

	const threadStatus = (
		chatThreadsStreamState?.isRunning === 'awaiting_user' ? { title: 'Needs Approval', color: 'yellow', } as const
			: chatThreadsStreamState?.isRunning ? { title: 'Running', color: 'green', } as const
				: { title: 'Done', color: 'dark', } as const
	)


	const threadStatusHTML = <StatusIndicator className='mx-1' indicatorColor={threadStatus.color} title={threadStatus.title} />


	// ======== info about changes ========
	// num files changed
	// acceptall + rejectall
	// popup info about each change (each with num changes + acceptall + rejectall of their own)

	const numFilesChangedStr = numFilesChanged === 0 ? 'No files with changes'
		: `${sortedCommandBarURIs.length} file${numFilesChanged === 1 ? '' : 's'} with changes`




	const acceptRejectAllButtons = <div
		// do this with opacity so that the height remains the same at all times
		className={`flex items-center gap-0.5
			${isFinishedMakingThreadChanges ? '' : 'opacity-0 pointer-events-none'}`
		}
	>
		<IconShell1 // RejectAllButtonWrapper
			// text="Reject All"
			// className="text-xs"
			Icon={X}
			onClick={() => {
				sortedCommandBarURIs.forEach(uri => {
					editCodeService.acceptOrRejectAllDiffAreas({
						uri,
						removeCtrlKs: true,
						behavior: "reject",
						_addToHistory: true,
					});
				});
			}}
			data-tooltip-id='void-tooltip'
			data-tooltip-place='top'
			data-tooltip-content='Reject all'
		/>

		<IconShell1 // AcceptAllButtonWrapper
			// text="Accept All"
			// className="text-xs"
			Icon={Check}
			onClick={() => {
				sortedCommandBarURIs.forEach(uri => {
					editCodeService.acceptOrRejectAllDiffAreas({
						uri,
						removeCtrlKs: true,
						behavior: "accept",
						_addToHistory: true,
					});
				});
			}}
			data-tooltip-id='void-tooltip'
			data-tooltip-place='top'
			data-tooltip-content='Accept all'
		/>



	</div>


	// !select-text cursor-auto
	const fileDetailsContent = <div className="px-2 gap-1 w-full overflow-y-auto">
		{sortedCommandBarURIs.map((uri, i) => {
			const basename = getBasename(uri.fsPath)

			const { sortedDiffIds, isStreaming } = commandBarStateOfURI[uri.fsPath] ?? {}
			const isFinishedMakingFileChanges = !isStreaming

			const numDiffs = sortedDiffIds?.length || 0

			const fileStatus = (isFinishedMakingFileChanges
				? { title: 'Done', color: 'dark', } as const
				: { title: 'Running', color: 'green', } as const
			)

			const fileNameHTML = <div
				className="flex items-center gap-1.5 text-void-fg-3 hover:brightness-125 transition-all duration-200 cursor-pointer"
				onClick={() => voidOpenFileFn(uri, accessor)}
			>
				{/* <FileIcon size={14} className="text-void-fg-3" /> */}
				<span className="text-void-fg-3">{basename}</span>
			</div>




			const detailsContent = <div className='flex px-4'>
				<span className="text-void-fg-3 opacity-80">{numDiffs} diff{numDiffs !== 1 ? 's' : ''}</span>
			</div>

			const acceptRejectButtons = <div
				// do this with opacity so that the height remains the same at all times
				className={`flex items-center gap-0.5
					${isFinishedMakingFileChanges ? '' : 'opacity-0 pointer-events-none'}
				`}
			>
				{/* <JumpToFileButton
					uri={uri}
					data-tooltip-id='void-tooltip'
					data-tooltip-place='top'
					data-tooltip-content='Go to file'
				/> */}
				<IconShell1 // RejectAllButtonWrapper
					Icon={X}
					onClick={() => { editCodeService.acceptOrRejectAllDiffAreas({ uri, removeCtrlKs: true, behavior: "reject", _addToHistory: true, }); }}
					data-tooltip-id='void-tooltip'
					data-tooltip-place='top'
					data-tooltip-content='Reject file'

				/>
				<IconShell1 // AcceptAllButtonWrapper
					Icon={Check}
					onClick={() => { editCodeService.acceptOrRejectAllDiffAreas({ uri, removeCtrlKs: true, behavior: "accept", _addToHistory: true, }); }}
					data-tooltip-id='void-tooltip'
					data-tooltip-place='top'
					data-tooltip-content='Accept file'
				/>

			</div>

			const fileStatusHTML = <StatusIndicator className='mx-1' indicatorColor={fileStatus.color} title={fileStatus.title} />

			return (
				// name, details
				<div key={i} className="flex justify-between items-center">
					<div className="flex items-center">
						{fileNameHTML}
						{detailsContent}
					</div>
					<div className="flex items-center gap-2">
						{acceptRejectButtons}
						{fileStatusHTML}
					</div>
				</div>
			)
		})}
	</div>

	const fileDetailsButton = (
		<button
			className={`flex items-center gap-1 rounded ${numFilesChanged === 0 ? 'cursor-pointer' : 'cursor-pointer hover:brightness-125 transition-all duration-200'}`}
			onClick={() => isFileDetailsOpened ? setFileDetailsOpenedState('user-closed') : setFileDetailsOpenedState('user-opened')}
			type='button'
			disabled={numFilesChanged === 0}
		>
			<svg
				className="transition-transform duration-200 size-3.5"
				style={{
					transform: isFileDetailsOpened ? 'rotate(0deg)' : 'rotate(180deg)',
					transition: 'transform 0.2s cubic-bezier(0.25, 0.1, 0.25, 1)'
				}}
				xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"></polyline>
			</svg>
			{numFilesChangedStr}
		</button>
	)

	return (
		<>
			{/* file details */}
			<div className='px-2'>
				<div
					className={`
						select-none
						flex w-full rounded-t-lg bg-void-bg-3
						text-void-fg-3 text-xs text-nowrap

						overflow-hidden transition-all duration-200 ease-in-out
						${isFileDetailsOpened ? 'max-h-24' : 'max-h-0'}
					`}
				>
					{fileDetailsContent}
				</div>
			</div>
			{/* main content */}
			<div
				className={`
					select-none
					flex w-full rounded-t-lg bg-void-bg-3
					text-void-fg-3 text-xs text-nowrap
					border-t border-l border-r border-zinc-300/10

					px-2 py-1
					justify-between
				`}
			>
				<div className="flex gap-2 items-center">
					{fileDetailsButton}
				</div>
				<div className="flex gap-2 items-center">
					{acceptRejectAllButtons}
					{threadStatusHTML}
				</div>
			</div>
		</>
	)
}



const EditToolSoFar = ({ toolCallSoFar, }: { toolCallSoFar: RawToolCallObj }) => {

	if (!isABuiltinToolName(toolCallSoFar.name)) return null

	const accessor = useAccessor()
	const commandService = accessor.get('ICommandService')

	const uri = toolCallSoFar.rawParams.uri ? URI.file(toolCallSoFar.rawParams.uri) : undefined
	const filename = uri ? getBasename(uri.fsPath) : undefined

	const title = titleOfBuiltinToolName[toolCallSoFar.name].proposed(filename)

	const uriDone = toolCallSoFar.doneParams.includes('uri')
	const desc1 = <span className='flex items-center'>
		{uriDone ?
			getBasename(toolCallSoFar.rawParams['uri'] ?? 'unknown')
			: `Generating`}
		<IconLoading />
	</span>

	const desc1OnClick = () => { uri && voidOpenFileFn(uri, accessor) }

	// Open file in center editor when uri is available
	useEffect(() => {
		if (uri) {
			commandService.executeCommand('vscode.open', uri);
		}
	}, [uri, commandService]);

	// Don't show code preview in chat - it's being edited live in the center editor
	return <ToolHeaderWrapper
		title={title}
		desc1={desc1}
		desc1OnClick={desc1OnClick}
		isRunning={true}
	/>

}


export const SidebarChat = () => {
	const textAreaRef = useRef<HTMLTextAreaElement | null>(null)
	const textAreaFnsRef = useRef<TextAreaFns | null>(null)

	const accessor = useAccessor()
	const commandService = accessor.get('ICommandService')
	const chatThreadsService = accessor.get('IChatThreadService')

	const settingsState = useSettingsState()
	// ----- HIGHER STATE -----

	// threads state
	const chatThreadsState = useChatThreadsState()

	const currentThread = chatThreadsService.getCurrentThread()
	const previousMessages = currentThread?.messages ?? []

	const selections = currentThread.state.stagingSelections
	const setSelections = (s: StagingSelectionItem[]) => { chatThreadsService.setCurrentThreadState({ stagingSelections: s }) }

	// Image attachments state
	const [images, setImages] = useState<ImageAttachment[]>([]);

	// stream state
	const currThreadStreamState = useChatThreadsStreamState(chatThreadsState.currentThreadId)
	const isRunning = currThreadStreamState?.isRunning
	const latestError = currThreadStreamState?.error
	const { displayContentSoFar, toolCallSoFar, reasoningSoFar } = currThreadStreamState?.llmInfo ?? {}

	// this is just if it's currently being generated, NOT if it's currently running
	const toolIsGenerating = toolCallSoFar && !toolCallSoFar.isDone // show loading for slow tools (right now just edit)

	// ----- SIDEBAR CHAT state (local) -----

	// state of current message
	const initVal = ''
	const [instructionsAreEmpty, setInstructionsAreEmpty] = useState(!initVal)

	// Rotating placeholder text
	const placeholderTexts = [
		"Hey there! What can I help you build today?",
		"Ready to code something amazing?",
		"What's on your mind?",
		"Let's create something awesome together",
		"How can I assist you today?"
	]
	const [placeholderIndex, setPlaceholderIndex] = useState(0)
	const [placeholderOpacity, setPlaceholderOpacity] = useState(1)

	useEffect(() => {
		const interval = setInterval(() => {
			// Fade out
			setPlaceholderOpacity(0)
			
			// After fade out, change text and fade in
			setTimeout(() => {
				setPlaceholderIndex((prev) => (prev + 1) % placeholderTexts.length)
				setPlaceholderOpacity(1)
			}, 500) // Wait 500ms for fade out to complete
		}, 5000) // Change every 5 seconds

		return () => clearInterval(interval)
	}, [])

	const isDisabled = instructionsAreEmpty || !!isFeatureNameDisabled('Chat', settingsState)

	const sidebarRef = useRef<HTMLDivElement>(null)
	const scrollContainerRef = useRef<HTMLDivElement | null>(null)
	const onSubmit = useCallback(async (_forceSubmit?: string) => {

		if (isDisabled && !_forceSubmit) return
		if (isRunning) return

		const threadId = chatThreadsService.state.currentThreadId

		// send message to LLM
		const userMessage = _forceSubmit || textAreaRef.current?.value || ''

		try {
			await chatThreadsService.addUserMessageAndStreamResponse({ 
				userMessage, 
				threadId,
				images: images.length > 0 ? images : undefined
			})
		} catch (e) {
			console.error('Error while sending message in chat:', e)
		}

		setSelections([]) // clear staging
		setImages([]) // clear images
		textAreaFnsRef.current?.setValue('')
		textAreaRef.current?.focus() // focus input after submit

	}, [chatThreadsService, isDisabled, isRunning, textAreaRef, textAreaFnsRef, setSelections, images, settingsState])

	const onAbort = async () => {
		const threadId = currentThread.id
		await chatThreadsService.abortRunning(threadId)
	}

	const keybindingString = accessor.get('IKeybindingService').lookupKeybinding(VOID_CTRL_L_ACTION_ID)?.getLabel()

	const threadId = currentThread.id
	const currCheckpointIdx = chatThreadsState.allThreads[threadId]?.state?.currCheckpointIdx ?? undefined  // if not exist, treat like checkpoint is last message (infinity)



	// resolve mount info
	const isResolved = chatThreadsState.allThreads[threadId]?.state.mountedInfo?.mountedIsResolvedRef.current
	useEffect(() => {
		if (isResolved) return
		chatThreadsState.allThreads[threadId]?.state.mountedInfo?._whenMountedResolver?.({
			textAreaRef: textAreaRef,
			scrollToBottom: () => scrollToBottom(scrollContainerRef),
		})

	}, [chatThreadsState, threadId, textAreaRef, scrollContainerRef, isResolved])




	const previousMessagesHTML = useMemo(() => {
		// const lastMessageIdx = previousMessages.findLastIndex(v => v.role !== 'checkpoint')
		// tool request shows up as Editing... if in progress
		return previousMessages.map((message, i) => {
			return <ChatBubble
				key={i}
				currCheckpointIdx={currCheckpointIdx}
				chatMessage={message}
				messageIdx={i}
				isCommitted={true}
				chatIsRunning={isRunning}
				threadId={threadId}
				_scrollToBottom={() => scrollToBottom(scrollContainerRef)}
			/>
		})
	}, [previousMessages, threadId, currCheckpointIdx, isRunning])

	const streamingChatIdx = previousMessagesHTML.length
	const currStreamingMessageHTML = reasoningSoFar || displayContentSoFar || isRunning ?
		<ChatBubble
			key={'curr-streaming-msg'}
			currCheckpointIdx={currCheckpointIdx}
			chatMessage={{
				role: 'assistant',
				displayContent: displayContentSoFar ?? '',
				reasoning: reasoningSoFar ?? '',
				anthropicReasoning: null,
			}}
			messageIdx={streamingChatIdx}
			isCommitted={false}
			chatIsRunning={isRunning}

			threadId={threadId}
			_scrollToBottom={null}
		/> : null


	// the tool currently being generated
	const generatingTool = toolIsGenerating ?
		toolCallSoFar.name === 'edit_file' || toolCallSoFar.name === 'rewrite_file' ? <EditToolSoFar
			key={'curr-streaming-tool'}
			toolCallSoFar={toolCallSoFar}
		/>
			: null
		: null

	const messagesHTML = <ScrollToBottomContainer
		key={'messages' + chatThreadsState.currentThreadId} // force rerender on all children if id changes
		scrollContainerRef={scrollContainerRef}
		className={`
			flex flex-col
			px-4 py-4 space-y-2
			w-full h-full
			overflow-x-hidden
			overflow-y-auto
			${previousMessagesHTML.length === 0 && !displayContentSoFar ? 'hidden' : ''}
		`}
	>
		{/* previous messages */}
		{previousMessagesHTML}
		{currStreamingMessageHTML}

		{/* Generating tool */}
		{generatingTool}

		{/* loading indicator */}
		{isRunning === 'LLM' || isRunning === 'idle' && !toolIsGenerating ? <ProseWrapper>
			{<IconLoading className='opacity-50 text-sm' />}
		</ProseWrapper> : null}


		{/* error message */}
		{latestError === undefined ? null :
			<div className='px-2 my-1'>
				<ErrorDisplay
					message={latestError.message}
					fullError={latestError.fullError}
					onDismiss={() => { chatThreadsService.dismissStreamError(currentThread.id) }}
					showDismiss={true}
				/>

				<WarningBox className='text-sm my-2 mx-4' onClick={() => { commandService.executeCommand(VOID_OPEN_SETTINGS_ACTION_ID) }} text='Open settings' />
			</div>
		}
	</ScrollToBottomContainer>


	const onChangeText = useCallback((newStr: string) => {
		setInstructionsAreEmpty(!newStr)
	}, [setInstructionsAreEmpty])
	const onKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
			onSubmit()
		} else if (e.key === 'Escape' && isRunning) {
			onAbort()
		}
	}, [onSubmit, onAbort, isRunning])

	const inputChatArea = <VoidChatArea
		featureName='Chat'
		onSubmit={() => onSubmit()}
		onAbort={onAbort}
		isStreaming={!!isRunning}
		isDisabled={isDisabled}
		showSelections={true}
		// showProspectiveSelections={previousMessagesHTML.length === 0}
		selections={selections}
		setSelections={setSelections}
		images={images}
		setImages={setImages}
		showImageUpload={true}
		onClickAnywhere={() => { textAreaRef.current?.focus() }}
	>
		<VoidInputBox2
			enableAtToMention
			className={`min-h-[81px] px-0.5 py-0.5`}
			placeholder={placeholderTexts[placeholderIndex]}
			onChangeText={onChangeText}
			onKeyDown={onKeyDown}
			onFocus={() => { chatThreadsService.setCurrentlyFocusedMessageIdx(undefined) }}
			ref={textAreaRef}
			fnsRef={textAreaFnsRef}
			multiline={true}
		/>

	</VoidChatArea>


	const isLandingPage = previousMessages.length === 0


	const initiallySuggestedPromptsHTML = <div className='flex flex-col gap-2 w-full text-nowrap text-void-fg-3 select-none'>
		{[
			'Summarize my codebase',
			'How do types work in Rust?',
			'Create a .voidrules file for me'
		].map((text, index) => (
			<div
				key={index}
				className='py-1 px-2 rounded text-sm bg-zinc-700/5 hover:bg-zinc-700/10 dark:bg-zinc-300/5 dark:hover:bg-zinc-300/10 cursor-pointer opacity-80 hover:opacity-100'
				onClick={() => onSubmit(text)}
			>
				{text}
			</div>
		))}
	</div>



	const threadPageInput = <div key={'input' + chatThreadsState.currentThreadId}>
		<div className='px-4'>
			<CommandBarInChat />
		</div>
		<div className='px-2 pb-2'>
			{inputChatArea}
		</div>
	</div>

	const landingPageInput = <div>
		<div className='pt-8'>
			{inputChatArea}
		</div>
	</div>

	const landingPageContent = <div
		ref={sidebarRef}
		className='w-full h-full max-h-full flex flex-col overflow-auto px-4'
	>
		{/* Spacer to push content to center */}
		<div className='flex-1'></div>
		
		{/* Centered Logo */}
		<div className='flex justify-center items-center mb-8'>
			<svg 
				xmlns="http://www.w3.org/2000/svg" 
				width="120" 
				height="120" 
				viewBox="0 0 1408 1408"
				style={{ opacity: 0.6 }}
			>
				<path fill="#000000" fillOpacity="1" d="M669.713 562.531C690.313 563.21 712.512 562.869 733.273 563.013C733.148 581.866 732.485 725.697 734.298 730.454C735.272 733.008 737.971 734.757 740.339 735.811C745.743 732.47 771.967 705.163 778.141 699.007L861.791 615.945C868.186 621.903 902.959 655.188 905.527 660.525C901.421 668.365 876.356 691.741 869.275 698.793L817.557 750.376L785.027 782.599C779.835 787.702 770.091 797.873 764.289 801.348C756.699 802.469 748.001 792.722 741.426 788.906C737.615 786.693 735.304 785.547 731.23 783.686C708.981 774.559 682.192 776.562 661.604 789.203C657.314 791.585 645.462 802.018 640.951 801.377C634.658 800.482 616.454 780.489 612.251 776.294L574.316 738.496L529.499 693.618C522.815 686.926 503.428 669.593 499.378 660.092C498.925 659.03 502.072 654.95 503.025 653.908C508.566 647.849 514.875 642.21 520.683 636.366C527.109 630.175 534.303 621.923 541.062 616.5C546.136 619.978 559.415 633.736 564.617 638.906L625.312 699.589C630.639 704.943 659.733 735.641 664.755 735.742C667.3 734.126 667.635 733.444 669.563 731.019L669.713 562.531Z"/>
				<path fill="#000000" fillOpacity="1" d="M463.306 779.695C475.053 778.931 492.474 779.584 504.703 779.587C514.186 779.589 556.867 778.173 562.771 782.733C577.895 794.411 594.056 812.714 608.053 826.34C613.516 831.658 613.064 837.954 607.206 842.661C597.395 845.171 547.257 843.654 534.474 843.661L490.519 843.666C483.204 843.664 466.826 844.64 461.164 841.87C457.938 840.291 459.217 816.762 459.227 812.938C459.251 803.726 458.228 793.895 459.396 784.731C459.762 781.863 461.123 781.15 463.306 779.695Z"/>
				<path fill="#000000" fillOpacity="1" d="M850.53 780.372C879.707 778.735 911.82 780.967 941.204 780.393C943.235 780.353 945.112 782.418 946.158 783.954C947.139 790.441 947.015 835.569 945.071 840.815C942.143 843.673 937.745 844.011 933.825 844.001C920.328 843.967 906.795 843.848 893.3 843.754L831.053 843.724C823.251 843.728 808.656 844.949 801.641 843.09C799.45 842.509 797.116 840.16 796.09 838.176C794.996 836.059 795.116 833.72 795.949 831.536C798.329 825.297 833.463 791.996 840.814 786.121C843.901 783.653 846.865 781.886 850.53 780.372Z"/>
			</svg>
		</div>
		
		<ErrorBoundary>
			{landingPageInput}
		</ErrorBoundary>
		
		{/* Spacer to push input to bottom */}
		<div className='flex-1'></div>
	</div>


	// const threadPageContent = <div>
	// 	{/* Thread content */}
	// 	<div className='flex flex-col overflow-hidden'>
	// 		<div className={`overflow-hidden ${previousMessages.length === 0 ? 'h-0 max-h-0 pb-2' : ''}`}>
	// 			<ErrorBoundary>
	// 				{messagesHTML}
	// 			</ErrorBoundary>
	// 		</div>
	// 		<ErrorBoundary>
	// 			{inputForm}
	// 		</ErrorBoundary>
	// 	</div>
	// </div>
	const threadPageContent = <div
		ref={sidebarRef}
		className='w-full h-full flex flex-col overflow-hidden'
	>

		<ErrorBoundary>
			{messagesHTML}
		</ErrorBoundary>
		<ErrorBoundary>
			{threadPageInput}
		</ErrorBoundary>
	</div>


	return (
		<Fragment key={threadId} // force rerender when change thread
		>
			{isLandingPage ?
				landingPageContent
				: threadPageContent}
		</Fragment>
	)
}
