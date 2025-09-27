"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import { Video, ExternalLink } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface GatherMeetingProps {
  trigger?: React.ReactNode
}

export function GatherMeeting({ trigger }: GatherMeetingProps) {
  const { toast } = useToast()

  const GATHER_URL = "https://app.gather.town/app/oU5YIYoawE4MV8W0/Spectrum-Mated"

  const handleOpenMeeting = () => {
    window.open(GATHER_URL, '_blank')
    toast({
      title: "Reunião iniciada!",
      description: "Gather.town aberto em nova aba"
    })
  }

  const DefaultTrigger = (
    <Button 
      variant="ghost" 
      className="text-white/60 hover:text-white hover:bg-white/5 border-none"
      onClick={handleOpenMeeting}
    >
      <Video className="h-4 w-4 mr-2" />
      Reunião Gather
    </Button>
  )

  if (trigger) {
    return (
      <div onClick={handleOpenMeeting}>
        {trigger}
      </div>
    )
  }

  return DefaultTrigger
}