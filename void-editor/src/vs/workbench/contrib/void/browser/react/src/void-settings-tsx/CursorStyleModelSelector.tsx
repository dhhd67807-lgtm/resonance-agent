/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FeatureName, ModelSelection, modelSelectionsEqual, ProviderName } from '../../../../../../../workbench/contrib/void/common/voidSettingsTypes.js'
import { useSettingsState, useAccessor } from '../util/services.js'
import { ModelOption } from '../../../../../../../workbench/contrib/void/common/voidSettingsService.js'
import { getModelCapabilities } from '../../../../../../../workbench/contrib/void/common/modelCapabilities.js'
import { Check, ChevronDown, Plus } from 'lucide-react'
import { VOID_OPEN_SETTINGS_ACTION_ID } from '../../../voidSettingsPane.js'

// Map model IDs to friendly display names
const getModelDisplayName = (modelId: string): string => {
	const modelMap: Record<string, string> = {
		'claude-3.5-haiku': 'Claude Haiku 3.5',
		'claude-3.5-sonnet': 'Claude Sonnet 3.5',
		'claude-3-7-sonnet-20250219': 'Claude Sonnet 3.7',
		'claude-4-opus': 'Claude Opus 4',
		'claude-4.5-sonnet-think': 'Claude Sonnet 4.5 Think',
		'claude-haiku-4-5-20251001': 'Claude Haiku 4.5',
		'claude-opus-4-1-20250805': 'Claude Opus 4.1',
		'claude-opus-4-5-20251101': 'Claude Opus 4.5',
		'claude-sonnet-4-20250514': 'Claude Sonnet 4',
		'claude-sonnet-4-20250514-think': 'Claude Sonnet 4 Think',
		'claude-sonnet-4-5-20250929': 'Claude Sonnet 4.5',
		'gpt-4o': 'GPT 4o',
		'gpt-4o-mini': 'GPT 4o Mini',
		'gpt-4-turbo': 'GPT 4 Turbo',
		'gpt-3.5-turbo': 'GPT 3.5 Turbo',
		'o1': 'OpenAI o1',
		'o1-mini': 'OpenAI o1 Mini',
		'o3-mini': 'OpenAI o3 Mini',
		'gemini-2.0-flash-exp': 'Gemini Flash 2.0',
		'gemini-exp-1206': 'Gemini Exp',
		'gemini-2.0-flash-thinking-exp-01-21': 'Gemini Flash Thinking 2.0',
		'deepseek-chat': 'DeepSeek Chat',
		'deepseek-reasoner': 'DeepSeek Reasoner',
	}
	
	// Remove provider prefix if present (e.g., "anthropic/claude-3.5-sonnet" -> "claude-3.5-sonnet")
	const cleanId = modelId.split('/').pop() || modelId
	
	// Return mapped name or fallback to cleaned ID
	return modelMap[cleanId] || cleanId
}

export const CursorStyleModelSelector = ({ featureName, className }: { featureName: FeatureName, className?: string }) => {
	const accessor = useAccessor()
	const voidSettingsService = accessor.get('IVoidSettingsService')
	const commandService = accessor.get('ICommandService')
	const settingsState = useSettingsState()

	const [isOpen, setIsOpen] = useState(false)
	const [animatingModel, setAnimatingModel] = useState<string | null>(null)
	const dropdownRef = useRef<HTMLDivElement>(null)

	// Get current selection
	const selection = voidSettingsService.state.modelSelectionOfFeature[featureName]
	const selectedOption = selection ? voidSettingsService.state._modelOptions.find(v => modelSelectionsEqual(v.selection, selection)) : null

	// Get all available models
	const allModels = settingsState._modelOptions

	// Check if model has reasoning capabilities
	const hasReasoningCapabilities = useCallback((model: ModelOption) => {
		const { modelName, providerName } = model.selection
		const overridesOfModel = settingsState.overridesOfModel
		const capabilities = getModelCapabilities(providerName, modelName, overridesOfModel)
		return !!capabilities?.reasoningCapabilities
	}, [settingsState.overridesOfModel])

	// Handle model selection with animation
	const onSelectModel = useCallback((model: ModelOption) => {
		const modelKey = `${model.selection.providerName}-${model.selection.modelName}`
		setAnimatingModel(modelKey)
		
		setTimeout(() => {
			voidSettingsService.setModelSelectionOfFeature(featureName, model.selection)
			setIsOpen(false)
			setAnimatingModel(null)
		}, 150)
	}, [voidSettingsService, featureName])

	// Handle click outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
				setIsOpen(false)
			}
		}

		if (isOpen) {
			document.addEventListener('mousedown', handleClickOutside)
		}

		return () => {
			document.removeEventListener('mousedown', handleClickOutside)
		}
	}, [isOpen])

	const openSettings = () => {
		commandService.executeCommand(VOID_OPEN_SETTINGS_ACTION_ID)
		setIsOpen(false)
	}

	const handleToggle = useCallback((e: React.MouseEvent) => {
		e.preventDefault()
		e.stopPropagation()
		console.log('Toggle clicked!')
		setIsOpen(prev => {
			console.log('Previous state:', prev, 'New state:', !prev)
			return !prev
		})
	}, [])

	const displayName = selectedOption?.selection?.modelName ? getModelDisplayName(selectedOption.selection.modelName) : 'Select Model'
	const showBrainIcon = selectedOption ? hasReasoningCapabilities(selectedOption) : false

	// Group models by family
	const getModelFamily = (modelName: string): string => {
		const cleanId = modelName.split('/').pop() || modelName
		if (cleanId.includes('opus')) return 'Opus Family'
		if (cleanId.includes('sonnet')) return 'Sonnet Family'
		if (cleanId.includes('haiku')) return 'Haiku Family'
		return 'Other Models'
	}

	// Get provider logo
	const getProviderLogo = (modelName: string): React.ReactNode => {
		const cleanId = modelName.split('/').pop() || modelName
		if (cleanId.includes('claude')) {
			return (
				<svg 
					className="w-3.5 h-3.5 flex-shrink-0" 
					viewBox="0 0 300 300" 
					xmlns="http://www.w3.org/2000/svg"
				>
					<path 
						d="M 49.93 246.65 L 47.95 251.00 L 25.98 251.00 C13.89,251.00 4.01,250.66 4.01,250.25 C4.02,249.84 21.97,204.50 43.90,149.50 L 83.78 49.50 L 106.81 49.23 L 129.85 48.96 L 169.82 149.23 C191.81,204.38 209.59,249.84 209.34,250.25 C209.09,250.66 199.26,251.00 187.50,251.00 C171.49,251.00 165.91,250.69 165.31,249.75 C164.87,249.06 161.10,239.73 156.94,229.00 L 149.37 209.50 L 106.93 209.24 L 64.49 208.98 L 62.83 213.24 C61.92,215.58 59.09,223.08 56.54,229.90 C53.99,236.72 51.02,244.26 49.93,246.65 ZM 296.28 250.25 C296.06,250.66 286.28,251.00 274.55,251.00 L 253.22 251.00 L 233.99 202.75 C223.41,176.21 205.80,132.00 194.86,104.50 C183.93,77.00 174.54,53.48 174.00,52.23 L 173.03 49.96 L 195.12 50.23 L 217.22 50.50 L 256.95 150.00 C278.80,204.73 296.50,249.84 296.28,250.25 ZM 80.47 167.75 L 79.03 171.00 L 106.52 171.00 C121.63,171.00 134.00,170.75 134.00,170.45 C134.00,169.73 108.03,102.85 107.28,101.64 C106.65,100.63 104.09,104.73 104.04,106.85 C104.02,107.59 103.38,109.62 102.62,111.35 C99.01,119.60 92.00,137.34 92.00,138.21 C92.00,138.75 91.36,140.62 90.58,142.35 C89.80,144.08 87.53,149.77 85.53,155.00 C83.54,160.23 81.26,165.96 80.47,167.75 Z" 
						className="fill-[#171717] dark:fill-white"
					/>
				</svg>
			)
		}
		return null
	}

	const groupedModels = useMemo(() => {
		const groups: Record<string, typeof allModels> = {}
		allModels.forEach(model => {
			const family = getModelFamily(model.selection.modelName)
			if (!groups[family]) groups[family] = []
			groups[family].push(model)
		})
		return groups
	}, [allModels])

	return (
		<div className={`relative ${className}`} ref={dropdownRef} style={{ zIndex: 10 }}>
			{/* Trigger Button */}
			<button
				type="button"
				onClick={handleToggle}
				onMouseDown={(e) => {
					console.log('Mouse down on button')
				}}
				className="flex items-center gap-1 h-8 pl-1 pr-2 text-xs text-void-fg-1 hover:bg-void-bg-2 transition-all duration-150 cursor-pointer"
				style={{ pointerEvents: 'auto', borderRadius: '4px' }}
			>
				{selectedOption && getProviderLogo(selectedOption.selection.modelName)}
				{showBrainIcon && <span>🧠</span>}
				<span>{displayName}</span>
				<ChevronDown className="w-3 h-3 opacity-50" />
			</button>

			{/* Dropdown */}
			{isOpen && (
				<div 
					className="absolute top-full left-0 mt-1 shadow-lg z-50"
					style={{
						background: '#000000',
						border: '1px solid rgba(255, 255, 255, 0.1)',
						borderRadius: '4px',
						maxHeight: 'none',
						overflow: 'visible',
						padding: '8px',
						width: '320px',
					}}
				>
					{/* Model List */}
					<div 
						className="relative"
						style={{
							maxHeight: 'none',
							overflow: 'visible',
							scrollbarWidth: 'none',
							msOverflowStyle: 'none',
						}}
					>
						
						{allModels.length === 0 ? (
							<div className="px-2 py-1.5 text-center text-void-fg-3 text-xs">
								No models found
							</div>
						) : (
							Object.entries(groupedModels).map(([family, models]) => (
								<div key={family}>
									{/* Category Header */}
									<div className="px-2 py-1 text-xs font-semibold text-void-fg-2 opacity-60 uppercase tracking-wider">
										{family}
									</div>
									{/* Models in this family */}
									{models.map((model) => {
										const isSelected = selectedOption && modelSelectionsEqual(model.selection, selectedOption.selection)
										const modelDisplayName = getModelDisplayName(model.selection.modelName)
										const hasReasoning = hasReasoningCapabilities(model)
										const modelKey = `${model.selection.providerName}-${model.selection.modelName}`
										const isAnimating = animatingModel === modelKey

										return (
											<div
												key={modelKey}
												onClick={(e) => {
													e.preventDefault()
													e.stopPropagation()
													onSelectModel(model)
												}}
												className="flex items-center justify-between gap-2 px-2 py-1.5 text-xs cursor-pointer hover:bg-void-bg-2 transition-colors"
												style={{
													opacity: isAnimating ? 0 : 1,
													transform: isAnimating ? 'translateY(5px)' : 'translateY(0)',
													transition: 'all 0.15s ease-in-out',
												}}
											>
												<div className="flex items-center gap-2">
													{getProviderLogo(model.selection.modelName)}
													{hasReasoning && <span>🧠</span>}
													<span className="text-void-fg-1">{modelDisplayName}</span>
												</div>
												{isSelected && <Check className="w-4 h-4 text-blue-500" />}
											</div>
										)
									})}
								</div>
							))
						)}
					</div>

					{/* Add Models Button */}
					<div className="p-1" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
						<button
							type="button"
							onClick={(e) => {
								e.preventDefault()
								e.stopPropagation()
								openSettings()
							}}
							className="w-full flex items-center justify-center gap-2 px-2 py-1.5 text-xs text-void-fg-1 hover:bg-void-bg-2 rounded transition-all duration-150"
						>
							<Plus size={14} />
							<span>Add Models</span>
						</button>
					</div>
				</div>
			)}
		</div>
	)
}
