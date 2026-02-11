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

	const displayName = selectedOption?.selection?.modelName?.split('/').pop() || 'Select Model'
	const showBrainIcon = selectedOption ? hasReasoningCapabilities(selectedOption) : false

	return (
		<div className={`relative ${className}`} ref={dropdownRef} style={{ zIndex: 10 }}>
			{/* Trigger Button */}
			<button
				type="button"
				onClick={handleToggle}
				onMouseDown={(e) => {
					console.log('Mouse down on button')
				}}
				className="flex items-center gap-1 h-8 pl-1 pr-2 text-xs rounded-md text-void-fg-1 hover:bg-void-bg-2 transition-all duration-150 cursor-pointer"
				style={{ pointerEvents: 'auto' }}
			>
				{showBrainIcon && <span>🧠</span>}
				<span>{displayName}</span>
				<ChevronDown className="w-3 h-3 opacity-50" />
			</button>

			{/* Dropdown */}
			{isOpen && (
				<div 
					className="absolute top-full left-0 mt-1 min-w-[10rem] border border-void-border-3 rounded-md shadow-lg z-50"
					style={{
						background: '#000000',
						maxHeight: 'none',
						overflow: 'visible',
					}}
				>
					{/* Model List with Fade Gradient */}
					<div 
						className="py-1 relative"
						style={{
							maxHeight: 'none',
							overflow: 'visible',
						}}
					>
						{/* Top fade gradient */}
						<div 
							style={{
								position: 'absolute',
								top: 0,
								left: 0,
								right: 0,
								height: '20px',
								background: 'linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)',
								pointerEvents: 'none',
								zIndex: 1,
							}}
						/>
						
						{allModels.length === 0 ? (
							<div className="px-2 py-1.5 text-center text-void-fg-3 text-xs">
								No models found
							</div>
						) : (
							allModels.map((model) => {
								const isSelected = selectedOption && modelSelectionsEqual(model.selection, selectedOption.selection)
								const modelDisplayName = model.selection.modelName.split('/').pop() || model.selection.modelName
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
											{hasReasoning && <span>🧠</span>}
											<span className="text-void-fg-1">{modelDisplayName}</span>
										</div>
										{isSelected && <Check className="w-4 h-4 text-blue-500" />}
									</div>
								)
							})
						)}
						
						{/* Bottom fade gradient */}
						<div 
							style={{
								position: 'absolute',
								bottom: 0,
								left: 0,
								right: 0,
								height: '20px',
								background: 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0) 100%)',
								pointerEvents: 'none',
								zIndex: 1,
							}}
						/>
					</div>

					{/* Add Models Button */}
					<div className="border-t border-void-border-3 p-1">
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
