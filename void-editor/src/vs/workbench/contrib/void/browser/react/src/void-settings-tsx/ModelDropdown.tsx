/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FeatureName, featureNames, isFeatureNameDisabled, ModelSelection, modelSelectionsEqual, ProviderName, providerNames, SettingsOfProvider } from '../../../../../../../workbench/contrib/void/common/voidSettingsTypes.js'
import { useSettingsState, useRefreshModelState, useAccessor } from '../util/services.js'
import { _VoidSelectBox, VoidCustomDropdownBox } from '../util/inputs.js'
import { SelectBox } from '../../../../../../../base/browser/ui/selectBox/selectBox.js'
import { IconWarning } from '../sidebar-tsx/SidebarChat.js'
import { VOID_OPEN_SETTINGS_ACTION_ID, VOID_TOGGLE_SETTINGS_ACTION_ID } from '../../../voidSettingsPane.js'
import { modelFilterOfFeatureName, ModelOption } from '../../../../../../../workbench/contrib/void/common/voidSettingsService.js'
import { WarningBox } from './WarningBox.js'
import ErrorBoundary from '../sidebar-tsx/ErrorBoundary.js'

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

const optionsEqual = (m1: ModelOption[], m2: ModelOption[]) => {
	if (m1.length !== m2.length) return false
	for (let i = 0; i < m1.length; i++) {
		if (!modelSelectionsEqual(m1[i].selection, m2[i].selection)) return false
	}
	return true
}

const ModelSelectBox = ({ options, featureName, className }: { options: ModelOption[], featureName: FeatureName, className: string }) => {
	const accessor = useAccessor()
	const voidSettingsService = accessor.get('IVoidSettingsService')

	const selection = voidSettingsService.state.modelSelectionOfFeature[featureName]
	const selectedOption = selection ? voidSettingsService.state._modelOptions.find(v => modelSelectionsEqual(v.selection, selection)) : options[0]
	
	// If no option is selected and no options available, return null
	if (!selectedOption || options.length === 0) {
		return null
	}

	const onChangeOption = useCallback((newOption: ModelOption) => {
		voidSettingsService.setModelSelectionOfFeature(featureName, newOption.selection)
	}, [voidSettingsService, featureName])

	// Function to get logo SVG for provider
	const getProviderLogo = (providerName: string): React.ReactNode => {
		if (providerName === 'anthropic') {
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
			);
		}
		return null;
	};

	return <VoidCustomDropdownBox
		options={options}
		selectedOption={selectedOption}
		onChangeOption={onChangeOption}
		getOptionDisplayName={(option) => getModelDisplayName(option.selection.modelName)}
		getOptionDropdownName={(option) => getModelDisplayName(option.selection.modelName)}
		getOptionDropdownDetail={(option) => ''}
		getOptionLogo={(option) => getProviderLogo(option.selection.providerName)}
		getOptionsEqual={(a, b) => optionsEqual([a], [b])}
		className={className}
		matchInputWidth={false}
	/>
}


const MemoizedModelDropdown = ({ featureName, className }: { featureName: FeatureName, className: string }) => {
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

	if (memoizedOptions.length === 0) { // Pretty sure this will never be reached unless filter is enabled
		return <WarningBox text={emptyMessage?.message || 'No models available'} />
	}

	return <ModelSelectBox featureName={featureName} options={memoizedOptions} className={className} />

}

export const ModelDropdown = ({ featureName, className }: { featureName: FeatureName, className: string }) => {
	const settingsState = useSettingsState()

	const accessor = useAccessor()
	const commandService = accessor.get('ICommandService')

	const openSettings = () => { commandService.executeCommand(VOID_OPEN_SETTINGS_ACTION_ID); };


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
		<MemoizedModelDropdown featureName={featureName} className={className} />
	</ErrorBoundary>
}
