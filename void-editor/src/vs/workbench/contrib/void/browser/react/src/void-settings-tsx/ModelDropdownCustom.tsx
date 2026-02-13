/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FeatureName, isFeatureNameDisabled, modelSelectionsEqual } from '../../../../../../../workbench/contrib/void/common/voidSettingsTypes.js'
import { useSettingsState, useAccessor } from '../util/services.js'
import { VOID_OPEN_SETTINGS_ACTION_ID } from '../../../voidSettingsPane.js'
import { modelFilterOfFeatureName, ModelOption } from '../../../../../../../workbench/contrib/void/common/voidSettingsService.js'
import { WarningBox } from './WarningBox.js'
import ErrorBoundary from '../sidebar-tsx/ErrorBoundary.js'
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu"
import { Check } from 'lucide-react'

// Add CSS to hide scrollbar
const style = document.createElement('style')
style.textContent = `
	.hide-scrollbar::-webkit-scrollbar {
		display: none;
	}
	.hide-scrollbar {
		-ms-overflow-style: none;
		scrollbar-width: none;
	}
`
if (!document.head.querySelector('style[data-model-dropdown-custom]')) {
	style.setAttribute('data-model-dropdown-custom', 'true')
	document.head.appendChild(style)
}

// Anthropic logo SVG
const AnthropicIcon = () => (
	<svg
		width="16"
		height="16"
		viewBox="0 0 24 24"
		fill="currentColor"
		xmlns="http://www.w3.org/2000/svg"
		style={{ opacity: 0.7, flexShrink: 0 }}
	>
		<path d="M13.827 3.52h3.603L24 20h-3.603l-6.57-16.48zm-7.258 0h3.767L16.906 20h-3.674l-1.343-3.461H5.017l-1.344 3.46H0L6.57 3.522zm4.132 9.959L8.453 7.687 6.205 13.48H10.7z" />
	</svg>
)

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
	
	const cleanId = modelId.split('/').pop() || modelId
	return modelMap[cleanId] || cleanId
}

const getProviderIcon = (providerName: string): React.ReactNode => {
	console.log('getProviderIcon called with:', providerName)
	if (providerName === 'anthropic') {
		return <AnthropicIcon />
	}
	return null
}

const optionsEqual = (m1: ModelOption[], m2: ModelOption[]) => {
	if (m1.length !== m2.length) return false
	for (let i = 0; i < m1.length; i++) {
		if (!modelSelectionsEqual(m1[i].selection, m2[i].selection)) return false
	}
	return true
}

const ModelSelectBoxCustom = ({ options, featureName, className }: { options: ModelOption[], featureName: FeatureName, className: string }) => {
	const accessor = useAccessor()
	const voidSettingsService = accessor.get('IVoidSettingsService')

	const selection = voidSettingsService.state.modelSelectionOfFeature[featureName]
	const selectedOption = selection ? voidSettingsService.state._modelOptions.find(v => modelSelectionsEqual(v.selection, selection)) : options[0]
	
	if (!selectedOption || options.length === 0) {
		return null
	}

	const onChangeOption = (newOption: ModelOption) => {
		voidSettingsService.setModelSelectionOfFeature(featureName, newOption.selection)
	}

	return (
		<DropdownMenuPrimitive.Root>
			<DropdownMenuPrimitive.Trigger asChild>
				<button
					type='button'
					style={{ 
						display: 'flex',
						alignItems: 'center',
						gap: '6px',
						height: '24px',
						paddingLeft: '6px',
						paddingRight: '8px',
						fontSize: '12px',
						borderRadius: '4px',
						background: 'transparent',
						color: 'var(--vscode-foreground, #cccccc)',
						border: 'none',
						cursor: 'pointer',
						outline: 'none',
						transition: 'background-color 0.15s',
					}}
					onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'}
					onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
				>
					{getProviderIcon(selectedOption.selection.providerName)}
					<span style={{ fontWeight: 500 }}>{getModelDisplayName(selectedOption.selection.modelName)}</span>
					<svg style={{ width: '12px', height: '12px', opacity: 0.4 }} viewBox="0 0 12 12" fill="none">
						<path
							d="M2.5 4.5L6 8L9.5 4.5"
							stroke="currentColor"
							strokeWidth="1.5"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
					</svg>
				</button>
			</DropdownMenuPrimitive.Trigger>

			<DropdownMenuPrimitive.Portal>
				<DropdownMenuPrimitive.Content
					align="start"
					sideOffset={6}
					style={{
						minWidth: '180px',
						maxWidth: '220px',
						maxHeight: '320px',
						padding: '4px',
						zIndex: 9999,
						backgroundColor: 'var(--vscode-dropdown-background, #3c3c3c)',
						border: '1px solid var(--vscode-dropdown-border, #454545)',
						borderRadius: '8px',
						boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
						overflow: 'hidden',
					}}
				>
					<div 
						style={{
							maxHeight: '312px',
							overflowY: 'auto',
							scrollbarWidth: 'none',
							msOverflowStyle: 'none',
						}}
						className="hide-scrollbar"
					>
						{options.map((option) => {
							const thisOptionIsSelected = modelSelectionsEqual(option.selection, selectedOption.selection)
							const optionName = getModelDisplayName(option.selection.modelName)
							const providerIcon = getProviderIcon(option.selection.providerName)

							return (
								<DropdownMenuPrimitive.Item
									key={optionName}
									style={{
										display: 'flex',
										alignItems: 'center',
										justifyContent: 'space-between',
										gap: '8px',
										padding: '6px 10px',
										fontSize: '12px',
										borderRadius: '4px',
										backgroundColor: thisOptionIsSelected ? 'var(--vscode-list-activeSelectionBackground, rgba(255, 255, 255, 0.1))' : 'transparent',
										color: 'var(--vscode-dropdown-foreground, #cccccc)',
										fontWeight: 500,
										cursor: 'pointer',
										outline: 'none',
										transition: 'background-color 0.15s',
									}}
									onMouseEnter={(e) => {
										if (!thisOptionIsSelected) {
											e.currentTarget.style.backgroundColor = 'var(--vscode-list-hoverBackground, rgba(255, 255, 255, 0.05))'
										}
									}}
									onMouseLeave={(e) => {
										if (!thisOptionIsSelected) {
											e.currentTarget.style.backgroundColor = 'transparent'
										}
									}}
									onSelect={() => onChangeOption(option)}
								>
									<div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
										{providerIcon}
										<span>{optionName}</span>
									</div>
									{thisOptionIsSelected && (
										<Check style={{ width: '14px', height: '14px', flexShrink: 0 }} />
									)}
								</DropdownMenuPrimitive.Item>
							)
						})}
					</div>
				</DropdownMenuPrimitive.Content>
			</DropdownMenuPrimitive.Portal>
		</DropdownMenuPrimitive.Root>
	)
}

const MemoizedModelDropdownCustom = ({ featureName, className }: { featureName: FeatureName, className: string }) => {
	const settingsState = useSettingsState()
	const oldOptionsRef = useRef<ModelOption[]>([])
	const [memoizedOptions, setMemoizedOptions] = useState(oldOptionsRef.current)

	const { filter, emptyMessage } = modelFilterOfFeatureName[featureName]

	useEffect(() => {
		const oldOptions = oldOptionsRef.current
		const newOptions = settingsState._modelOptions.filter((o) => filter(o.selection, { chatMode: settingsState.globalSettings.chatMode, overridesOfModel: settingsState.overridesOfModel }))

		if (!optionsEqual(oldOptions, newOptions)) {
			setMemoizedOptions(newOptions)
		}
		oldOptionsRef.current = newOptions
	}, [settingsState._modelOptions, filter])

	if (memoizedOptions.length === 0) {
		return <WarningBox text={emptyMessage?.message || 'No models available'} />
	}

	return <ModelSelectBoxCustom featureName={featureName} options={memoizedOptions} className={className} />
}

export const ModelDropdownCustom = ({ featureName, className }: { featureName: FeatureName, className: string }) => {
	const settingsState = useSettingsState()

	const accessor = useAccessor()
	const commandService = accessor.get('ICommandService')

	const openSettings = () => { commandService.executeCommand(VOID_OPEN_SETTINGS_ACTION_ID) }

	const { emptyMessage } = modelFilterOfFeatureName[featureName]

	const isDisabled = isFeatureNameDisabled(featureName, settingsState)
	if (isDisabled)
		return <WarningBox onClick={openSettings} text={
			emptyMessage && emptyMessage.priority === 'always' ? emptyMessage.message :
				isDisabled === 'needToEnableModel' ? 'Enable a model'
					: isDisabled === 'addModel' ? 'Add a model'
						: (isDisabled === 'addProvider' || isDisabled === 'notFilledIn' || isDisabled === 'providerNotAutoDetected') ? 'Provider required'
							: 'Provider required'
		} />

	return <ErrorBoundary>
		<MemoizedModelDropdownCustom featureName={featureName} className={className} />
	</ErrorBoundary>
}
