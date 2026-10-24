'use client'

import { Printer } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function PrintButton() {
  return (
    <Button variant="outline" size="lg" onClick={() => window.print()} className="no-print">
      <Printer aria-hidden="true" />
      Imprimir o guardar en PDF
    </Button>
  )
}
