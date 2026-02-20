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
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { submitReport } from '@/data/reports'
import { Loader2 } from 'lucide-react'

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
  const [suggestedAddress, setSuggestedAddress] = useState('')
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<'success' | 'error' | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!suggestedAddress.trim()) return

    setSubmitting(true)
    setResult(null)
    try {
      await submitReport({
        data: {
          restaurantName,
          restaurantAddress,
          suggestedAddress: suggestedAddress.trim(),
          comment: comment.trim(),
        },
      })
      setResult('success')
      setSuggestedAddress('')
      setComment('')
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
      <SheetContent side="bottom" className="sm:max-w-lg sm:mx-auto sm:rounded-t-xl">
        <SheetHeader>
          <SheetTitle>주소 수정 요청</SheetTitle>
          <SheetDescription>
            잘못된 주소를 제보해 주세요. 확인 후 반영됩니다.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 px-4">
          <div className="space-y-1.5">
            <Label htmlFor="restaurant-name">맛집 이름</Label>
            <Input
              id="restaurant-name"
              value={restaurantName}
              readOnly
              className="bg-muted"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="current-address">현재 주소</Label>
            <Input
              id="current-address"
              value={restaurantAddress}
              readOnly
              className="bg-muted"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="suggested-address">수정 주소</Label>
            <Input
              id="suggested-address"
              value={suggestedAddress}
              onChange={(e) => setSuggestedAddress(e.target.value)}
              placeholder="올바른 주소를 입력해 주세요"
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="comment">코멘트 (선택)</Label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="추가 설명이 있다면 적어 주세요"
              rows={2}
            />
          </div>

          <SheetFooter className="p-0 pb-2">
            {result === 'success' ? (
              <p className="text-sm text-green-600 font-medium">
                제보가 접수되었습니다. 감사합니다!
              </p>
            ) : result === 'error' ? (
              <p className="text-sm text-red-600 font-medium">
                오류가 발생했습니다. 다시 시도해 주세요.
              </p>
            ) : null}
            <Button type="submit" disabled={submitting || !suggestedAddress.trim()}>
              {submitting && <Loader2 className="size-4 animate-spin" />}
              제출
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
