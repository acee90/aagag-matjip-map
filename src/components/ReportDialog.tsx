import { useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { submitReport } from '@/data/reports'
import { Loader2, MapPinOff } from 'lucide-react'

interface ReportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  restaurantName: string
  restaurantAddress: string
}

export function ReportDialog({
  open,
  onOpenChange,
  restaurantName,
  restaurantAddress,
}: ReportDialogProps) {
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<'success' | 'error' | null>(null)

  const handleConfirm = async () => {
    setSubmitting(true)
    setResult(null)
    try {
      await submitReport({
        data: {
          restaurantName,
          restaurantAddress,
          suggestedAddress: '지도 위치 불일치',
          comment: '',
        },
      })
      setResult('success')
      setTimeout(() => {
        onOpenChange(false)
        setResult(null)
      }, 1500)
    } catch {
      setResult('error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="sm:max-w-md sm:mx-auto sm:rounded-t-xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <MapPinOff className="size-5 text-orange-500" />
            지도 위치가 다른가요?
          </SheetTitle>
          <SheetDescription>
            <strong>{restaurantName}</strong>의 주소와 지도에 표시된 위치가 다를 경우 제보해 주세요. 확인 후 수정하겠습니다.
          </SheetDescription>
        </SheetHeader>

        <SheetFooter className="flex-row gap-2 px-4 pb-2">
          {result === 'success' ? (
            <p className="w-full text-center text-sm text-green-600 font-medium py-2">
              제보 감사합니다!
            </p>
          ) : result === 'error' ? (
            <p className="w-full text-center text-sm text-red-600 font-medium py-2">
              오류가 발생했습니다. 다시 시도해 주세요.
            </p>
          ) : (
            <>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
              >
                아니요
              </Button>
              <Button
                className="flex-1"
                onClick={handleConfirm}
                disabled={submitting}
              >
                {submitting && <Loader2 className="size-4 animate-spin" />}
                네, 위치가 달라요
              </Button>
            </>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
