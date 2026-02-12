/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import { useEffect, useRef, useState } from 'react';
import { useAccessor, useIsDark, useSettingsState } from '../util/services.js';
import { Brain, Check, ChevronRight, DollarSign, ExternalLink, Lock, X, Folder, GitBranch, Server } from 'lucide-react';
import { displayInfoOfProviderName, ProviderName, providerNames, localProviderNames, featureNames, FeatureName, isFeatureNameDisabled } from '../../../../common/voidSettingsTypes.js';
import { ChatMarkdownRender } from '../markdown/ChatMarkdownRender.js';
import { OllamaSetupInstructions, OneClickSwitchButton, SettingsForProvider, ModelDump } from '../void-settings-tsx/Settings.js';
import { ColorScheme } from '../../../../../../../platform/theme/common/theme.js';
import ErrorBoundary from '../sidebar-tsx/ErrorBoundary.js';
import { isLinux, isMacintosh, isNative } from '../../../../../../../base/common/platform.js';

const OVERRIDE_VALUE = true

export const VoidOnboarding = () => {

	const voidSettingsState = useSettingsState()
	const accessor = useAccessor()
	const workspaceContextService = accessor.get('IWorkspaceContextService')
	
	// Check if a workspace/folder is open
	const workspace = workspaceContextService.getWorkspace()
	const hasWorkspaceOpen = workspace.folders.length > 0
	
	const isOnboardingComplete = voidSettingsState.globalSettings.isOnboardingComplete || OVERRIDE_VALUE
	const isWelcomeScreenComplete = voidSettingsState.globalSettings.isWelcomeScreenComplete || OVERRIDE_VALUE
	
	// Show welcome screen if onboarding is complete but no workspace is open
	const shouldShowWelcomeScreen = isOnboardingComplete && !hasWorkspaceOpen

	const isDark = useIsDark()

	return (
		<div className={`@@void-scope ${isDark ? 'dark' : ''}`}>
			{/* Onboarding Overlay */}
			<div
				className={`
					bg-void-bg-3 fixed top-0 right-0 bottom-0 left-0 width-full z-[99999]
					${isOnboardingComplete ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'}
				`}
				style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
			>
				<ErrorBoundary>
					<VoidOnboardingContent />
				</ErrorBoundary>
			</div>

			{/* Welcome Screen Overlay - Shows when no workspace is open */}
			<div
				className={`
					bg-void-bg-3 fixed top-0 right-0 bottom-0 left-0 width-full z-[99998]
					${shouldShowWelcomeScreen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
				`}
				style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
			>
				<ErrorBoundary>
					<WelcomeScreen />
				</ErrorBoundary>
			</div>
		</div>
	)
}

const VoidIcon = () => {
	const accessor = useAccessor()
	const themeService = accessor.get('IThemeService')

	const divRef = useRef<HTMLDivElement | null>(null)

	useEffect(() => {
		// void icon style
		const updateTheme = () => {
			const theme = themeService.getColorTheme().type
			const isDark = theme === ColorScheme.DARK || theme === ColorScheme.HIGH_CONTRAST_DARK
			if (divRef.current) {
				divRef.current.style.maxWidth = '220px'
				divRef.current.style.opacity = '50%'
				divRef.current.style.filter = isDark ? '' : 'invert(1)' //brightness(.5)
			}
		}
		updateTheme()
		const d = themeService.onDidColorThemeChange(updateTheme)
		return () => d.dispose()
	}, [])

	return <div ref={divRef} className='@@void-void-icon' />
}

const FADE_DURATION_MS = 2000

const FadeIn = ({ children, className, delayMs = 0, durationMs, ...props }: { children: React.ReactNode, delayMs?: number, durationMs?: number, className?: string } & React.HTMLAttributes<HTMLDivElement>) => {

	const [opacity, setOpacity] = useState(0)

	const effectiveDurationMs = durationMs ?? FADE_DURATION_MS

	useEffect(() => {

		const timeout = setTimeout(() => {
			setOpacity(1)
		}, delayMs)

		return () => clearTimeout(timeout)
	}, [setOpacity, delayMs])


	return (
		<div className={className} style={{ opacity, transition: `opacity ${effectiveDurationMs}ms ease-in-out` }} {...props}>
			{children}
		</div>
	)
}

// Onboarding

// =============================================
//  New AddProvidersPage Component and helpers
// =============================================

const tabNames = ['Free', 'Paid', 'Local'] as const;

type TabName = typeof tabNames[number] | 'Cloud/Other';

// Data for cloud providers tab
const cloudProviders: ProviderName[] = ['googleVertex', 'liteLLM', 'microsoftAzure', 'awsBedrock', 'openAICompatible'];

// Data structures for provider tabs
const providerNamesOfTab: Record<TabName, ProviderName[]> = {
	Free: ['gemini', 'openRouter'],
	Local: localProviderNames,
	Paid: providerNames.filter(pn => !(['gemini', 'openRouter', ...localProviderNames, ...cloudProviders] as string[]).includes(pn)) as ProviderName[],
	'Cloud/Other': cloudProviders,
};

const descriptionOfTab: Record<TabName, string> = {
	Free: `Providers with a 100% free tier. Add as many as you'd like!`,
	Paid: `Connect directly with any provider (bring your own key).`,
	Local: `Active providers should appear automatically. Add as many as you'd like! `,
	'Cloud/Other': `Add as many as you'd like! Reach out for custom configuration requests.`,
};


const featureNameMap: { display: string, featureName: FeatureName }[] = [
	{ display: 'Chat', featureName: 'Chat' },
	{ display: 'Quick Edit', featureName: 'Ctrl+K' },
	{ display: 'Autocomplete', featureName: 'Autocomplete' },
	{ display: 'Fast Apply', featureName: 'Apply' },
	{ display: 'Source Control', featureName: 'SCM' },
];

const AddProvidersPage = ({ pageIndex, setPageIndex }: { pageIndex: number, setPageIndex: (index: number) => void }) => {
	const [currentTab, setCurrentTab] = useState<TabName>('Free');
	const settingsState = useSettingsState();
	const [errorMessage, setErrorMessage] = useState<string | null>(null);

	// Clear error message after 5 seconds
	useEffect(() => {
		let timeoutId: NodeJS.Timeout | null = null;

		if (errorMessage) {
			timeoutId = setTimeout(() => {
				setErrorMessage(null);
			}, 5000);
		}

		// Cleanup function to clear the timeout if component unmounts or error changes
		return () => {
			if (timeoutId) {
				clearTimeout(timeoutId);
			}
		};
	}, [errorMessage]);

	return (<div className="flex flex-col md:flex-row w-full h-[80vh] gap-6 max-w-[900px] mx-auto relative">
		{/* Left Column */}
		<div className="md:w-1/4 w-full flex flex-col gap-6 p-6 border-none border-void-border-2 h-full overflow-y-auto">
			{/* Tab Selector */}
			<div className="flex md:flex-col gap-2">
				{[...tabNames, 'Cloud/Other'].map(tab => (
					<button
						key={tab}
						className={`py-2 px-4 rounded-md text-left ${currentTab === tab
							? 'bg-[#0e70c0]/80 text-white font-medium shadow-sm'
							: 'bg-void-bg-2 hover:bg-void-bg-2/80 text-void-fg-1'
							} transition-all duration-200`}
						onClick={() => {
							setCurrentTab(tab as TabName);
							setErrorMessage(null); // Reset error message when changing tabs
						}}
					>
						{tab}
					</button>
				))}
			</div>

			{/* Feature Checklist */}
			<div className="flex flex-col gap-1 mt-4 text-sm opacity-80">
				{featureNameMap.map(({ display, featureName }) => {
					const hasModel = settingsState.modelSelectionOfFeature[featureName] !== null;
					return (
						<div key={featureName} className="flex items-center gap-2">
							{hasModel ? (
								<Check className="w-4 h-4 text-emerald-500" />
							) : (
								<div className="w-3 h-3 rounded-full flex items-center justify-center">
									<div className="w-1 h-1 rounded-full bg-white/70"></div>
								</div>
							)}
							<span>{display}</span>
						</div>
					);
				})}
			</div>
		</div>

		{/* Right Column */}
		<div className="flex-1 flex flex-col items-center justify-start p-6 h-full overflow-y-auto">
			<div className="text-5xl mb-2 text-center w-full">Add a Provider</div>

			<div className="w-full max-w-xl mt-4 mb-10">
				<div className="text-4xl font-light my-4 w-full">{currentTab}</div>
				<div className="text-sm opacity-80 text-void-fg-3 my-4 w-full">{descriptionOfTab[currentTab]}</div>
			</div>

			{providerNamesOfTab[currentTab].map((providerName) => (
				<div key={providerName} className="w-full max-w-xl mb-10">
					<div className="text-xl mb-2">
						Add {displayInfoOfProviderName(providerName).title}
						{providerName === 'gemini' && (
							<span
								data-tooltip-id="void-tooltip-provider-info"
								data-tooltip-content="Gemini 2.5 Pro offers 25 free messages a day, and Gemini 2.5 Flash offers 500. We recommend using models down the line as you run out of free credits."
								data-tooltip-place="right"
								className="ml-1 text-xs align-top text-blue-400"
							>*</span>
						)}
						{providerName === 'openRouter' && (
							<span
								data-tooltip-id="void-tooltip-provider-info"
								data-tooltip-content="OpenRouter offers 50 free messages a day, and 1000 if you deposit $10. Only applies to models labeled ':free'."
								data-tooltip-place="right"
								className="ml-1 text-xs align-top text-blue-400"
							>*</span>
						)}
					</div>
					<div>
						<SettingsForProvider providerName={providerName} showProviderTitle={false} showProviderSuggestions={true} />

					</div>
					{providerName === 'ollama' && <OllamaSetupInstructions />}
				</div>
			))}

			{(currentTab === 'Local' || currentTab === 'Cloud/Other') && (
				<div className="w-full max-w-xl mt-8 bg-void-bg-2/50 rounded-lg p-6 border border-void-border-4">
					<div className="flex items-center gap-2 mb-4">
						<div className="text-xl font-medium">Models</div>
					</div>

					{currentTab === 'Local' && (
						<div className="text-sm opacity-80 text-void-fg-3 my-4 w-full">Local models should be detected automatically. You can add custom models below.</div>
					)}

					{currentTab === 'Local' && <ModelDump filteredProviders={localProviderNames} />}
					{currentTab === 'Cloud/Other' && <ModelDump filteredProviders={cloudProviders} />}
				</div>
			)}



			{/* Navigation buttons in right column */}
			<div className="flex flex-col items-end w-full mt-auto pt-8">
				{errorMessage && (
					<div className="text-amber-400 mb-2 text-sm opacity-80 transition-opacity duration-300">{errorMessage}</div>
				)}
				<div className="flex items-center gap-2">
					<PreviousButton onClick={() => setPageIndex(pageIndex - 1)} />
					<NextButton
						onClick={() => {
							const isDisabled = isFeatureNameDisabled('Chat', settingsState)

							if (!isDisabled) {
								setPageIndex(pageIndex + 1);
								setErrorMessage(null);
							} else {
								// Show error message
								setErrorMessage("Please set up at least one Chat model before moving on.");
							}
						}}
					/>
				</div>
			</div>
		</div>
	</div>);
};
// =============================================
// 	OnboardingPage
// 		title:
// 			div
// 				"Welcome to Void"
// 			image
// 		content:<></>
// 		title
// 		content
// 		prev/next

// 	OnboardingPage
// 		title:
// 			div
// 				"How would you like to use Void?"
// 		content:
// 			ModelQuestionContent
// 				|
// 					div
// 						"I want to:"
// 					div
// 						"Use the smartest models"
// 						"Keep my data fully private"
// 						"Save money"
// 						"I don't know"
// 				| div
// 					| div
// 						"We recommend using "
// 						"Set API"
// 					| div
// 						""
// 					| div
//
// 		title
// 		content
// 		prev/next
//
// 	OnboardingPage
// 		title
// 		content
// 		prev/next

const NextButton = ({ onClick, ...props }: { onClick: () => void } & React.ButtonHTMLAttributes<HTMLButtonElement>) => {

	// Create a new props object without the disabled attribute
	const { disabled, ...buttonProps } = props;

	return (
		<button
			onClick={disabled ? undefined : onClick}
			onDoubleClick={onClick}
			className={`px-6 py-2 bg-zinc-100 ${disabled
				? 'bg-zinc-100/40 cursor-not-allowed'
				: 'hover:bg-zinc-100'
				} rounded text-white duration-600 transition-all
			`}
			{...disabled && {
				'data-tooltip-id': 'void-tooltip',
				"data-tooltip-content": 'Please enter all required fields or choose another provider', // (double-click to proceed anyway, can come back in Settings)
				"data-tooltip-place": 'top',
			}}
			{...buttonProps}
		>
			Next
		</button>
	)
}

const PreviousButton = ({ onClick, ...props }: { onClick: () => void } & React.ButtonHTMLAttributes<HTMLButtonElement>) => {
	return (
		<button
			onClick={onClick}
			className="px-6 py-2 rounded text-void-fg-3 opacity-80 hover:brightness-115 duration-600 transition-all"
			{...props}
		>
			Back
		</button>
	)
}



const OnboardingPageShell = ({ top, bottom, content, hasMaxWidth = true, className = '', }: {
	top?: React.ReactNode,
	bottom?: React.ReactNode,
	content?: React.ReactNode,
	hasMaxWidth?: boolean,
	className?: string,
}) => {
	return (
		<div className={`h-[80vh] text-lg flex flex-col gap-4 w-full mx-auto ${hasMaxWidth ? 'max-w-[600px]' : ''} ${className}`}>
			{top && <FadeIn className='w-full mb-auto pt-16'>{top}</FadeIn>}
			{content && <FadeIn className='w-full my-auto'>{content}</FadeIn>}
			{bottom && <div className='w-full pb-8'>{bottom}</div>}
		</div>
	)
}

const OllamaDownloadOrRemoveModelButton = ({ modelName, isModelInstalled, sizeGb }: { modelName: string, isModelInstalled: boolean, sizeGb: number | false | 'not-known' }) => {
	// for now just link to the ollama download page
	return <a
		href={`https://ollama.com/library/${modelName}`}
		target="_blank"
		rel="noopener noreferrer"
		className="flex items-center justify-center text-void-fg-2 hover:text-void-fg-1"
	>
		<ExternalLink className="w-3.5 h-3.5" />
	</a>

}


const YesNoText = ({ val }: { val: boolean | null }) => {

	return <div
		className={
			val === true ? "text text-emerald-500"
				: val === false ? 'text-rose-600'
					: "text text-amber-300"
		}
	>
		{
			val === true ? "Yes"
				: val === false ? 'No'
					: "Yes*"
		}
	</div>

}



const abbreviateNumber = (num: number): string => {
	if (num >= 1000000) {
		// For millions
		return Math.floor(num / 1000000) + 'M';
	} else if (num >= 1000) {
		// For thousands
		return Math.floor(num / 1000) + 'K';
	} else {
		// For numbers less than 1000
		return num.toString();
	}
}





const PrimaryActionButton = ({ children, className, ringSize, ...props }: { children: React.ReactNode, ringSize?: undefined | 'xl' | 'screen' } & React.ButtonHTMLAttributes<HTMLButtonElement>) => {


	return (
		<button
			type='button'
			className={`
				flex items-center justify-center

				text-white dark:text-white
				bg-black/90 dark:bg-white/90

				${ringSize === 'xl' ? `
					gap-2 px-16 py-8
					transition-all duration-300 ease-in-out
					`
					: ringSize === 'screen' ? `
					gap-2 px-16 py-8
					transition-all duration-1000 ease-in-out
					`: ringSize === undefined ? `
					gap-1 px-4 py-2
					transition-all duration-300 ease-in-out
				`: ''}

				rounded-lg
				group
				${className}
			`}
			{...props}
		>
			{children}
			<ChevronRight
				className={`
					transition-all duration-300 ease-in-out

					transform
					group-hover:translate-x-1
					group-active:translate-x-1
				`}
			/>
		</button>
	)
}

// Welcome Screen - Shows after onboarding is complete
const WelcomeScreen = () => {
	const accessor = useAccessor();
	const commandService = accessor.get('ICommandService');
	const viewsService = accessor.get('IViewsService');

	const handleOpenFolder = () => {
		const commandId = isMacintosh && isNative 
			? 'workbench.action.files.openFileFolder' 
			: 'workbench.action.files.openFolder';
		commandService.executeCommand(commandId);
	};

	const handleCloneRepo = () => {
		commandService.executeCommand('git.clone');
	};

	const handleOpenSSH = () => {
		viewsService.openViewContainer('workbench.view.remote');
	};

	return (
		<div className="flex flex-col items-center justify-center w-full h-full px-6" style={{ gap: 0 }}>
			<style>{`
				@keyframes logo-shimmer {
					0%, 100% { 
						opacity: 0.3;
						filter: brightness(1);
					}
					50% { 
						opacity: 0.5;
						filter: brightness(1.4);
					}
				}
			`}</style>
			{/* Logo at top - SVG with CSS shimmer animation */}
			<svg 
				xmlns="http://www.w3.org/2000/svg" 
				width="200" 
				height="200" 
				viewBox="0 0 1408 1408" 
				style={{ 
					display: 'block', 
					margin: '0 0 24px 0', 
					padding: 0,
					
				}}
			>
				<path fill="#000000" fillOpacity="1" d="M669.713 562.531C690.313 563.21 712.512 562.869 733.273 563.013C733.148 581.866 732.485 725.697 734.298 730.454C735.272 733.008 737.971 734.757 740.339 735.811C745.743 732.47 771.967 705.163 778.141 699.007L861.791 615.945C868.186 621.903 902.959 655.188 905.527 660.525C901.421 668.365 876.356 691.741 869.275 698.793L817.557 750.376L785.027 782.599C779.835 787.702 770.091 797.873 764.289 801.348C756.699 802.469 748.001 792.722 741.426 788.906C737.615 786.693 735.304 785.547 731.23 783.686C708.981 774.559 682.192 776.562 661.604 789.203C657.314 791.585 645.462 802.018 640.951 801.377C634.658 800.482 616.454 780.489 612.251 776.294L574.316 738.496L529.499 693.618C522.815 686.926 503.428 669.593 499.378 660.092C498.925 659.03 502.072 654.95 503.025 653.908C508.566 647.849 514.875 642.21 520.683 636.366C527.109 630.175 534.303 621.923 541.062 616.5C546.136 619.978 559.415 633.736 564.617 638.906L625.312 699.589C630.639 704.943 659.733 735.641 664.755 735.742C667.3 734.126 667.635 733.444 669.563 731.019L669.713 562.531Z"/>
				<path fill="#000000" fillOpacity="1" d="M463.306 779.695C475.053 778.931 492.474 779.584 504.703 779.587C514.186 779.589 556.867 778.173 562.771 782.733C577.895 794.411 594.056 812.714 608.053 826.34C613.516 831.658 613.064 837.954 607.206 842.661C597.395 845.171 547.257 843.654 534.474 843.661L490.519 843.666C483.204 843.664 466.826 844.64 461.164 841.87C457.938 840.291 459.217 816.762 459.227 812.938C459.251 803.726 458.228 793.895 459.396 784.731C459.762 781.863 461.123 781.15 463.306 779.695Z"/>
				<path fill="#000000" fillOpacity="1" d="M850.53 780.372C879.707 778.735 911.82 780.967 941.204 780.393C943.235 780.353 945.112 782.418 946.158 783.954C947.139 790.441 947.015 835.569 945.071 840.815C942.143 843.673 937.745 844.011 933.825 844.001C920.328 843.967 906.795 843.848 893.3 843.754L831.053 843.724C823.251 843.728 808.656 844.949 801.641 843.09C799.45 842.509 797.116 840.16 796.09 838.176C794.996 836.059 795.116 833.72 795.949 831.536C798.329 825.297 833.463 791.996 840.814 786.121C843.901 783.653 846.865 781.886 850.53 780.372Z"/>
			</svg>

			{/* Action Cards - Centered horizontally, text only */}
			<div className="flex flex-row gap-3 w-full max-w-[800px]">
				{/* Open Project Card */}
				<button
					onClick={handleOpenFolder}
					className="flex items-center justify-center bg-pink-500 hover:bg-pink-600 rounded-lg py-3 px-4 flex-1 transition-all duration-150 cursor-pointer"
					tabIndex={0}
					role="button"
					aria-label="Open a folder or project"
					style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif', boxShadow: 'none', outline: 'none' }}
				>
					<div className="text-sm font-medium text-white tracking-wide" style={{ letterSpacing: '0.02em' }}>Open project</div>
				</button>

				{/* Clone Repo Card */}
				<button
					onClick={handleCloneRepo}
					className="flex items-center justify-center bg-pink-500 hover:bg-pink-600 rounded-lg py-3 px-4 flex-1 transition-all duration-150 cursor-pointer"
					tabIndex={0}
					role="button"
					aria-label="Clone a git repository"
					style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif', boxShadow: 'none', outline: 'none' }}
				>
					<div className="text-sm font-medium text-white tracking-wide" style={{ letterSpacing: '0.02em' }}>Clone repo</div>
				</button>

				{/* Connect via SSH Card */}
				<button
					onClick={handleOpenSSH}
					className="flex items-center justify-center bg-pink-500 hover:bg-pink-600 rounded-lg py-3 px-4 flex-1 transition-all duration-150 cursor-pointer"
					tabIndex={0}
					role="button"
					aria-label="Connect to a remote server via SSH"
					style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif', boxShadow: 'none', outline: 'none' }}
				>
					<div className="text-sm font-medium text-white tracking-wide" style={{ letterSpacing: '0.02em' }}>Connect via SSH</div>
				</button>
			</div>
		</div>
	);
};

// Action Cards Page Component (now only used in onboarding)
const ActionCardsPage = ({ pageIndex, setPageIndex }: { pageIndex: number, setPageIndex: (index: number) => void }) => {
	const accessor = useAccessor();
	const commandService = accessor.get('ICommandService');
	const viewsService = accessor.get('IViewsService');
	const voidSettingsService = accessor.get('IVoidSettingsService');

	const handleOpenFolder = () => {
		// Mark onboarding as complete before opening folder
		voidSettingsService.setGlobalSetting('isOnboardingComplete', true);
		const commandId = isMacintosh && isNative 
			? 'workbench.action.files.openFileFolder' 
			: 'workbench.action.files.openFolder';
		commandService.executeCommand(commandId);
	};

	const handleCloneRepo = () => {
		// Mark onboarding as complete before cloning
		voidSettingsService.setGlobalSetting('isOnboardingComplete', true);
		commandService.executeCommand('git.clone');
	};

	const handleOpenSSH = () => {
		// Mark onboarding as complete before opening SSH
		voidSettingsService.setGlobalSetting('isOnboardingComplete', true);
		viewsService.openViewContainer('workbench.view.remote');
	};

	return (
		<div className="flex flex-col items-center justify-center w-full h-full px-6" style={{ gap: 0 }}>
			<style>{`
				@keyframes logo-shimmer {
					0%, 100% { 
						opacity: 0.3;
						filter: brightness(1);
					}
					50% { 
						opacity: 0.5;
						filter: brightness(1.4);
					}
				}
			`}</style>
			{/* Logo at top - SVG with CSS shimmer animation */}
			<svg 
				xmlns="http://www.w3.org/2000/svg" 
				width="200" 
				height="200" 
				viewBox="0 0 1408 1408" 
				style={{ 
					display: 'block', 
					margin: '0 0 24px 0', 
					padding: 0,
					
				}}
			>
				<path fill="#000000" fillOpacity="1" d="M669.713 562.531C690.313 563.21 712.512 562.869 733.273 563.013C733.148 581.866 732.485 725.697 734.298 730.454C735.272 733.008 737.971 734.757 740.339 735.811C745.743 732.47 771.967 705.163 778.141 699.007L861.791 615.945C868.186 621.903 902.959 655.188 905.527 660.525C901.421 668.365 876.356 691.741 869.275 698.793L817.557 750.376L785.027 782.599C779.835 787.702 770.091 797.873 764.289 801.348C756.699 802.469 748.001 792.722 741.426 788.906C737.615 786.693 735.304 785.547 731.23 783.686C708.981 774.559 682.192 776.562 661.604 789.203C657.314 791.585 645.462 802.018 640.951 801.377C634.658 800.482 616.454 780.489 612.251 776.294L574.316 738.496L529.499 693.618C522.815 686.926 503.428 669.593 499.378 660.092C498.925 659.03 502.072 654.95 503.025 653.908C508.566 647.849 514.875 642.21 520.683 636.366C527.109 630.175 534.303 621.923 541.062 616.5C546.136 619.978 559.415 633.736 564.617 638.906L625.312 699.589C630.639 704.943 659.733 735.641 664.755 735.742C667.3 734.126 667.635 733.444 669.563 731.019L669.713 562.531Z"/>
				<path fill="#000000" fillOpacity="1" d="M463.306 779.695C475.053 778.931 492.474 779.584 504.703 779.587C514.186 779.589 556.867 778.173 562.771 782.733C577.895 794.411 594.056 812.714 608.053 826.34C613.516 831.658 613.064 837.954 607.206 842.661C597.395 845.171 547.257 843.654 534.474 843.661L490.519 843.666C483.204 843.664 466.826 844.64 461.164 841.87C457.938 840.291 459.217 816.762 459.227 812.938C459.251 803.726 458.228 793.895 459.396 784.731C459.762 781.863 461.123 781.15 463.306 779.695Z"/>
				<path fill="#000000" fillOpacity="1" d="M850.53 780.372C879.707 778.735 911.82 780.967 941.204 780.393C943.235 780.353 945.112 782.418 946.158 783.954C947.139 790.441 947.015 835.569 945.071 840.815C942.143 843.673 937.745 844.011 933.825 844.001C920.328 843.967 906.795 843.848 893.3 843.754L831.053 843.724C823.251 843.728 808.656 844.949 801.641 843.09C799.45 842.509 797.116 840.16 796.09 838.176C794.996 836.059 795.116 833.72 795.949 831.536C798.329 825.297 833.463 791.996 840.814 786.121C843.901 783.653 846.865 781.886 850.53 780.372Z"/>
			</svg>

			{/* Action Cards - Centered horizontally, text only */}
			<div className="flex flex-row gap-3 w-full max-w-[800px]">
				{/* Open Project Card */}
				<button
					onClick={handleOpenFolder}
					className="flex items-center justify-center bg-pink-500 hover:bg-pink-600 rounded-lg py-3 px-4 flex-1 transition-all duration-150 cursor-pointer"
					tabIndex={0}
					role="button"
					aria-label="Open a folder or project"
					style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif', boxShadow: 'none', outline: 'none' }}
				>
					<div className="text-sm font-medium text-white tracking-wide" style={{ letterSpacing: '0.02em' }}>Open project</div>
				</button>

				{/* Clone Repo Card */}
				<button
					onClick={handleCloneRepo}
					className="flex items-center justify-center bg-pink-500 hover:bg-pink-600 rounded-lg py-3 px-4 flex-1 transition-all duration-150 cursor-pointer"
					tabIndex={0}
					role="button"
					aria-label="Clone a git repository"
					style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif', boxShadow: 'none', outline: 'none' }}
				>
					<div className="text-sm font-medium text-white tracking-wide" style={{ letterSpacing: '0.02em' }}>Clone repo</div>
				</button>

				{/* Connect via SSH Card */}
				<button
					onClick={handleOpenSSH}
					className="flex items-center justify-center bg-pink-500 hover:bg-pink-600 rounded-lg py-3 px-4 flex-1 transition-all duration-150 cursor-pointer"
					tabIndex={0}
					role="button"
					aria-label="Connect to a remote server via SSH"
					style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif', boxShadow: 'none', outline: 'none' }}
				>
					<div className="text-sm font-medium text-white tracking-wide" style={{ letterSpacing: '0.02em' }}>Connect via SSH</div>
				</button>
			</div>
		</div>
	);
};


type WantToUseOption = 'smart' | 'private' | 'cheap' | 'all'

const VoidOnboardingContent = () => {


	const accessor = useAccessor()
	const voidSettingsService = accessor.get('IVoidSettingsService')
	const voidMetricsService = accessor.get('IMetricsService')

	const voidSettingsState = useSettingsState()

	const [pageIndex, setPageIndex] = useState(0)


	// page 1 state
	const [wantToUseOption, setWantToUseOption] = useState<WantToUseOption>('smart')

	// Replace the single selectedProviderName with four separate states
	// page 2 state - each tab gets its own state
	const [selectedIntelligentProvider, setSelectedIntelligentProvider] = useState<ProviderName>('anthropic');
	const [selectedPrivateProvider, setSelectedPrivateProvider] = useState<ProviderName>('ollama');
	const [selectedAffordableProvider, setSelectedAffordableProvider] = useState<ProviderName>('gemini');
	const [selectedAllProvider, setSelectedAllProvider] = useState<ProviderName>('anthropic');

	// Helper function to get the current selected provider based on active tab
	const getSelectedProvider = (): ProviderName => {
		switch (wantToUseOption) {
			case 'smart': return selectedIntelligentProvider;
			case 'private': return selectedPrivateProvider;
			case 'cheap': return selectedAffordableProvider;
			case 'all': return selectedAllProvider;
		}
	}

	// Helper function to set the selected provider for the current tab
	const setSelectedProvider = (provider: ProviderName) => {
		switch (wantToUseOption) {
			case 'smart': setSelectedIntelligentProvider(provider); break;
			case 'private': setSelectedPrivateProvider(provider); break;
			case 'cheap': setSelectedAffordableProvider(provider); break;
			case 'all': setSelectedAllProvider(provider); break;
		}
	}

	const providerNamesOfWantToUseOption: { [wantToUseOption in WantToUseOption]: ProviderName[] } = {
		smart: ['anthropic', 'openAI', 'gemini', 'openRouter'],
		private: ['ollama', 'vLLM', 'openAICompatible', 'lmStudio'],
		cheap: ['gemini', 'deepseek', 'openRouter', 'ollama', 'vLLM'],
		all: providerNames,
	}


	const selectedProviderName = getSelectedProvider();
	const didFillInProviderSettings = selectedProviderName && voidSettingsState?.settingsOfProvider?.[selectedProviderName]?._didFillInProviderSettings
	const isApiKeyLongEnoughIfApiKeyExists = selectedProviderName && voidSettingsState?.settingsOfProvider?.[selectedProviderName]?.apiKey ? voidSettingsState.settingsOfProvider[selectedProviderName].apiKey.length > 15 : true
	const isAtLeastOneModel = selectedProviderName && voidSettingsState?.settingsOfProvider?.[selectedProviderName]?.models?.length >= 1

	const didFillInSelectedProviderSettings = !!(didFillInProviderSettings && isApiKeyLongEnoughIfApiKeyExists && isAtLeastOneModel)

	const prevAndNextButtons = <div className="max-w-[600px] w-full mx-auto flex flex-col items-end">
		<div className="flex items-center gap-2">
			<PreviousButton
				onClick={() => { setPageIndex(pageIndex - 1) }}
			/>
			<NextButton
				onClick={() => { setPageIndex(pageIndex + 1) }}
			/>
		</div>
	</div>


	const lastPagePrevAndNextButtons = <div className="max-w-[600px] w-full mx-auto flex flex-col items-end">
		<div className="flex items-center gap-2">
			<PreviousButton
				onClick={() => { setPageIndex(pageIndex - 1) }}
			/>
			<button
				onClick={() => {
					console.log('Enter Resonance clicked!');
					voidSettingsService.setGlobalSetting('isOnboardingComplete', true);
					voidMetricsService.capture('Completed Onboarding', { selectedProviderName: 'none', wantToUseOption: 'smart' })
				}}
				className="px-6 py-2 bg-zinc-100 hover:bg-zinc-200 rounded text-white transition-all"
			>
				Enter Resonance
			</button>
		</div>
	</div>


	// cannot be md
	const basicDescOfWantToUseOption: { [wantToUseOption in WantToUseOption]: string } = {
		smart: "Models with the best performance on benchmarks.",
		private: "Host on your computer or local network for full data privacy.",
		cheap: "Free and affordable options.",
		all: "",
	}

	// can be md
	const detailedDescOfWantToUseOption: { [wantToUseOption in WantToUseOption]: string } = {
		smart: "Most intelligent and best for agent mode.",
		private: "Private-hosted so your data never leaves your computer or network. [Email us](mailto:founders@voideditor.com) for help setting up at your company.",
		cheap: "Use great deals like Gemini 2.5 Pro, or self-host a model with Ollama or vLLM for free.",
		all: "",
	}

	// Modified: initialize separate provider states on initial render instead of watching wantToUseOption changes
	useEffect(() => {
		if (selectedIntelligentProvider === undefined) {
			setSelectedIntelligentProvider(providerNamesOfWantToUseOption['smart'][0]);
		}
		if (selectedPrivateProvider === undefined) {
			setSelectedPrivateProvider(providerNamesOfWantToUseOption['private'][0]);
		}
		if (selectedAffordableProvider === undefined) {
			setSelectedAffordableProvider(providerNamesOfWantToUseOption['cheap'][0]);
		}
		if (selectedAllProvider === undefined) {
			setSelectedAllProvider(providerNamesOfWantToUseOption['all'][0]);
		}
	}, []);

	// reset the page to page 0 if the user redos onboarding
	useEffect(() => {
		if (!voidSettingsState.globalSettings.isOnboardingComplete) {
			setPageIndex(0)
		}
	}, [setPageIndex, voidSettingsState.globalSettings.isOnboardingComplete])


	const contentOfIdx: { [pageIndex: number]: React.ReactNode } = {
		0: <OnboardingPageShell
			content={
				<div className='flex flex-col items-center gap-8'>
					<div className="text-5xl font-light text-center">Welcome to Resonance</div>

					{/* Slice of Void image */}
					<div className='max-w-md w-full h-[30vh] mx-auto flex items-center justify-center'>
						{!isLinux && <VoidIcon />}
					</div>


					<FadeIn
						delayMs={1000}
					>
						<PrimaryActionButton
							onClick={() => { setPageIndex(1) }}
						>
							Get Started
						</PrimaryActionButton>
					</FadeIn>

				</div>
			}
		/>,

		1: <OnboardingPageShell

			content={
				<div>
					<div className="text-5xl font-light text-center">Settings and Themes</div>

					<div className="mt-8 text-center flex flex-col items-center gap-4 w-full max-w-md mx-auto">
						<h4 className="text-void-fg-3 mb-4">Transfer your settings from an existing editor?</h4>
						<OneClickSwitchButton className='w-full px-4 py-2' fromEditor="VS Code" />
						<OneClickSwitchButton className='w-full px-4 py-2' fromEditor="Cursor" />
						<OneClickSwitchButton className='w-full px-4 py-2' fromEditor="Windsurf" />
					</div>
				</div>
			}
			bottom={
				<div className="max-w-[600px] w-full mx-auto flex flex-col items-end">
					<div className="flex items-center gap-2">
						<PreviousButton
							onClick={() => { setPageIndex(pageIndex - 1) }}
						/>
						<button
							onClick={() => {
								console.log('Complete onboarding clicked!');
								voidSettingsService.setGlobalSetting('isOnboardingComplete', true);
								voidMetricsService.capture('Completed Onboarding', { selectedProviderName: 'none', wantToUseOption: 'smart' })
							}}
							className="px-6 py-2 bg-zinc-100 hover:bg-zinc-200 rounded text-white transition-all"
						>
							Continue
						</button>
					</div>
				</div>
			}
		/>,
	}


	return <div key={pageIndex} className="w-full h-[80vh] text-left mx-auto flex flex-col items-center justify-center">
		<ErrorBoundary>
			{contentOfIdx[pageIndex]}
		</ErrorBoundary>
	</div>

}
