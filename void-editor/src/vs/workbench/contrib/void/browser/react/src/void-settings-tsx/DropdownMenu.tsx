/*--------------------------------------------------------------------------------------
 *  Copyright 2025 Glass Devtools, Inc. All rights reserved.
 *  Licensed under the Apache License, Version 2.0. See LICENSE.txt for more information.
 *--------------------------------------------------------------------------------------*/

import * as React from "react"
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu"
import { Check, ChevronRight, Circle } from "lucide-react"
import { cn } from "../util/cn.js"

const DropdownMenu = DropdownMenuPrimitive.Root
const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger
const DropdownMenuGroup = DropdownMenuPrimitive.Group
const DropdownMenuPortal = DropdownMenuPrimitive.Portal
const DropdownMenuSub = DropdownMenuPrimitive.Sub
const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup

const DropdownMenuSubTrigger = React.forwardRef<
	React.ElementRef<typeof DropdownMenuPrimitive.SubTrigger>,
	React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubTrigger> & {
		inset?: boolean
	}
>(({ className, inset, children, ...props }, ref) => (
	<DropdownMenuPrimitive.SubTrigger
		ref={ref}
		className={cn(
			"flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none",
			inset && "pl-8",
			className,
		)}
		style={{
			borderRadius: '6px',
			padding: '6px 8px',
			fontSize: '13px',
			cursor: 'pointer',
			display: 'flex',
			alignItems: 'center',
			outline: 'none',
			transition: 'background-color 0.15s ease',
		}}
		{...props}
	>
		{children}
		<ChevronRight style={{ marginLeft: 'auto', width: '16px', height: '16px' }} />
	</DropdownMenuPrimitive.SubTrigger>
))
DropdownMenuSubTrigger.displayName = DropdownMenuPrimitive.SubTrigger.displayName

const DropdownMenuSubContent = React.forwardRef<
	React.ElementRef<typeof DropdownMenuPrimitive.SubContent>,
	React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubContent>
>(({ className, ...props }, ref) => (
	<DropdownMenuPrimitive.SubContent
		ref={ref}
		className={cn(
			"z-50 min-w-[8rem] overflow-hidden rounded-md border p-1 shadow-lg",
			className,
		)}
		style={{
			zIndex: 50,
			minWidth: '8rem',
			overflow: 'hidden',
			borderRadius: '12px',
			border: '1px solid var(--vscode-menu-border)',
			backgroundColor: 'var(--vscode-menu-background)',
			color: 'var(--vscode-menu-foreground)',
			padding: '4px',
			boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
		}}
		{...props}
	/>
))
DropdownMenuSubContent.displayName = DropdownMenuPrimitive.SubContent.displayName

const DropdownMenuContent = React.forwardRef<
	React.ElementRef<typeof DropdownMenuPrimitive.Content>,
	React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
	<DropdownMenuPrimitive.Portal>
		<DropdownMenuPrimitive.Content
			ref={ref}
			sideOffset={sideOffset}
			className={cn(
				"z-50 min-w-[8rem] overflow-hidden rounded-md border p-1 shadow-md",
				className,
			)}
			style={{
				zIndex: 50,
				minWidth: '220px',
				overflow: 'hidden',
				borderRadius: '12px',
				border: '1px solid var(--vscode-menu-border)',
				backgroundColor: 'var(--vscode-menu-background)',
				color: 'var(--vscode-menu-foreground)',
				padding: '6px',
				boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
			}}
			{...props}
		/>
	</DropdownMenuPrimitive.Portal>
))
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName

const DropdownMenuItem = React.forwardRef<
	React.ElementRef<typeof DropdownMenuPrimitive.Item>,
	React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & {
		inset?: boolean
	}
>(({ className, inset, ...props }, ref) => (
	<DropdownMenuPrimitive.Item
		ref={ref}
		className={cn(
			"relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors",
			inset && "pl-8",
			className,
		)}
		style={{
			position: 'relative',
			display: 'flex',
			cursor: 'pointer',
			userSelect: 'none',
			alignItems: 'center',
			borderRadius: '6px',
			padding: '6px 8px',
			fontSize: '13px',
			outline: 'none',
			transition: 'background-color 0.15s ease, color 0.15s ease',
			margin: '2px 0',
		}}
		onMouseEnter={(e) => {
			e.currentTarget.style.backgroundColor = 'var(--vscode-list-hoverBackground)';
		}}
		onMouseLeave={(e) => {
			e.currentTarget.style.backgroundColor = 'transparent';
		}}
		{...props}
	/>
))
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName

const DropdownMenuCheckboxItem = React.forwardRef<
	React.ElementRef<typeof DropdownMenuPrimitive.CheckboxItem>,
	React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem>
>(({ className, children, checked, ...props }, ref) => (
	<DropdownMenuPrimitive.CheckboxItem
		ref={ref}
		className={cn(
			"relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors",
			className,
		)}
		style={{
			position: 'relative',
			display: 'flex',
			cursor: 'pointer',
			userSelect: 'none',
			alignItems: 'center',
			borderRadius: '6px',
			padding: '6px 32px 6px 8px',
			fontSize: '13px',
			outline: 'none',
			transition: 'background-color 0.15s ease, color 0.15s ease',
			margin: '2px 0',
		}}
		checked={checked}
		onMouseEnter={(e) => {
			if (checked) {
				e.currentTarget.style.backgroundColor = '#000000';
				e.currentTarget.style.color = '#FFFFFF';
			} else {
				e.currentTarget.style.backgroundColor = 'var(--vscode-list-hoverBackground)';
			}
		}}
		onMouseLeave={(e) => {
			if (checked) {
				e.currentTarget.style.backgroundColor = '#000000';
				e.currentTarget.style.color = '#FFFFFF';
			} else {
				e.currentTarget.style.backgroundColor = 'transparent';
				e.currentTarget.style.color = 'var(--vscode-menu-foreground)';
			}
		}}
		{...props}
	>
		<span style={{
			position: 'absolute',
			left: '8px',
			display: 'flex',
			height: '14px',
			width: '14px',
			alignItems: 'center',
			justifyContent: 'center',
		}}>
			<DropdownMenuPrimitive.ItemIndicator>
				<Check style={{ width: '16px', height: '16px' }} />
			</DropdownMenuPrimitive.ItemIndicator>
		</span>
		{children}
	</DropdownMenuPrimitive.CheckboxItem>
))
DropdownMenuCheckboxItem.displayName = DropdownMenuPrimitive.CheckboxItem.displayName

const DropdownMenuRadioItem = React.forwardRef<
	React.ElementRef<typeof DropdownMenuPrimitive.RadioItem>,
	React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem>
>(({ className, children, ...props }, ref) => (
	<DropdownMenuPrimitive.RadioItem
		ref={ref}
		className={cn(
			"relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors",
			className,
		)}
		style={{
			position: 'relative',
			display: 'flex',
			cursor: 'pointer',
			userSelect: 'none',
			alignItems: 'center',
			borderRadius: '6px',
			padding: '6px 32px 6px 8px',
			fontSize: '13px',
			outline: 'none',
			transition: 'background-color 0.15s ease, color 0.15s ease',
			margin: '2px 0',
		}}
		onMouseEnter={(e) => {
			e.currentTarget.style.backgroundColor = 'var(--vscode-list-hoverBackground)';
		}}
		onMouseLeave={(e) => {
			e.currentTarget.style.backgroundColor = 'transparent';
		}}
		{...props}
	>
		<span style={{
			position: 'absolute',
			left: '8px',
			display: 'flex',
			height: '14px',
			width: '14px',
			alignItems: 'center',
			justifyContent: 'center',
		}}>
			<DropdownMenuPrimitive.ItemIndicator>
				<Circle style={{ width: '8px', height: '8px', fill: 'currentColor' }} />
			</DropdownMenuPrimitive.ItemIndicator>
		</span>
		{children}
	</DropdownMenuPrimitive.RadioItem>
))
DropdownMenuRadioItem.displayName = DropdownMenuPrimitive.RadioItem.displayName

const DropdownMenuLabel = React.forwardRef<
	React.ElementRef<typeof DropdownMenuPrimitive.Label>,
	React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label> & {
		inset?: boolean
	}
>(({ className, inset, ...props }, ref) => (
	<DropdownMenuPrimitive.Label
		ref={ref}
		className={cn(
			"px-2 py-1.5 text-sm font-semibold",
			inset && "pl-8",
			className,
		)}
		style={{
			padding: '6px 8px',
			fontSize: '12px',
			fontWeight: 600,
			color: 'var(--vscode-descriptionForeground)',
		}}
		{...props}
	/>
))
DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName

const DropdownMenuSeparator = React.forwardRef<
	React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
	React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
	<DropdownMenuPrimitive.Separator
		ref={ref}
		className={cn("-mx-1 my-1 h-px", className)}
		style={{
			marginLeft: '-4px',
			marginRight: '-4px',
			marginTop: '4px',
			marginBottom: '4px',
			height: '1px',
			backgroundColor: 'var(--vscode-menu-separatorBackground)',
		}}
		{...props}
	/>
))
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName

const DropdownMenuShortcut = ({
	className,
	...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
	return (
		<span
			className={cn("ml-auto text-xs tracking-widest opacity-60", className)}
			style={{
				marginLeft: 'auto',
				fontSize: '11px',
				letterSpacing: '0.05em',
				opacity: 0.6,
			}}
			{...props}
		/>
	)
}
DropdownMenuShortcut.displayName = "DropdownMenuShortcut"

export {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuCheckboxItem,
	DropdownMenuRadioItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuGroup,
	DropdownMenuPortal,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuRadioGroup,
}
