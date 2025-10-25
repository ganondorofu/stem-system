"use client"

import * as React from "react"
import { Check, ChevronsUpDown, User } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Avatar, AvatarFallback, AvatarImage } from "./avatar"

type ComboboxOption = {
  value: string
  label: string
  id?: string
  avatar?: string | null
}

interface ComboboxProps {
  options: ComboboxOption[]
  value?: string
  onSelect: (value: string) => void
  placeholder?: string
  notFoundText?: string
  triggerClass?: string
  disabled?: boolean
}

export function Combobox({
  options,
  value,
  onSelect,
  placeholder = "選択...",
  notFoundText = "見つかりません",
  triggerClass,
  disabled = false,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const selectedLabel = options.find((option) => option.value === value)?.label

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", triggerClass)}
          disabled={disabled}
        >
          {selectedLabel || placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
        <Command
          filter={(value, search) => {
            const option = options.find(o => o.value === value)
            if (!option) return 0
            
            const labelMatch = option.label.toLowerCase().includes(search.toLowerCase()) ? 1 : 0
            const idMatch = option.id?.toLowerCase().includes(search.toLowerCase()) ? 1 : 0

            return labelMatch || idMatch
          }}
        >
          <CommandInput placeholder={placeholder} />
          <CommandList>
            <CommandEmpty>{notFoundText}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  onSelect={(currentValue) => {
                    onSelect(currentValue === value ? "" : currentValue)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex items-center gap-2">
                    {option.avatar && (
                        <Avatar className="h-6 w-6">
                            <AvatarImage src={option.avatar} alt={option.label} />
                            <AvatarFallback><User className="h-4 w-4"/></AvatarFallback>
                        </Avatar>
                    )}
                    <div className="flex flex-col">
                      <span>{option.label}</span>
                      {option.id && <span className="text-xs text-muted-foreground">{option.id}</span>}
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
