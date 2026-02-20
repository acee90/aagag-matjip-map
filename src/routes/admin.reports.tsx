import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { getReports, fixReportLocation } from '@/data/reports'
import type { AddressReport } from '@/types/restaurant'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, ShieldCheck, Loader2, MapPin, CheckCircle } from 'lucide-react'

const ADMIN_PASSWORD = 'aagag2024'

export const Route = createFileRoute('/admin/reports')({
  component: AdminReportsPage,
})

function AdminReportsPage() {
  const navigate = useNavigate()
  const [authed, setAuthed] = useState(false)
  const [password, setPassword] = useState('')
  const [reports, setReports] = useState<AddressReport[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fixingId, setFixingId] = useState<number | null>(null)
  const [fixResults, setFixResults] = useState<
    Record<number, { success: boolean; message: string; prevLat?: number; prevLng?: number; newLat?: number; newLng?: number }>
  >({})

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== ADMIN_PASSWORD) {
      setError('비밀번호가 틀렸습니다.')
      return
    }
    setAuthed(true)
    setError('')
    setLoading(true)
    try {
      const data = await getReports()
      setReports(data)
    } catch {
      setError('데이터를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleFix = async (reportId: number) => {
    setFixingId(reportId)
    try {
      const result = await fixReportLocation({ data: { reportId } })
      setFixResults((prev) => ({
        ...prev,
        [reportId]: {
          success: true,
          message: `좌표 수정 완료: (${result.prevLat?.toFixed(5)}, ${result.prevLng?.toFixed(5)}) → (${result.newLat?.toFixed(5)}, ${result.newLng?.toFixed(5)})`,
          prevLat: result.prevLat,
          prevLng: result.prevLng,
          newLat: result.newLat,
          newLng: result.newLng,
        },
      }))
      setReports((prev) =>
        prev.map((r) => (r.id === reportId ? { ...r, status: 'fixed' } : r))
      )
    } catch (e) {
      setFixResults((prev) => ({
        ...prev,
        [reportId]: {
          success: false,
          message: e instanceof Error ? e.message : '수정 실패',
        },
      }))
    } finally {
      setFixingId(null)
    }
  }

  if (!authed) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background p-4">
        <form
          onSubmit={handleAuth}
          className="w-full max-w-sm space-y-4 rounded-xl border p-6 shadow-sm"
        >
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-orange-500" />
            <h1 className="font-bold text-lg">관리자 인증</h1>
          </div>
          <Input
            type="password"
            placeholder="비밀번호"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full">
            확인
          </Button>
        </form>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-background">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b bg-white px-4 py-3">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => navigate({ to: '/' })}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="font-bold text-base">주소 수정 제보 목록</h1>
        <Badge variant="secondary" className="ml-auto">
          {reports.length}건
        </Badge>
      </header>

      <main className="p-4">
        {loading ? (
          <p className="text-center text-sm text-muted-foreground py-12">
            불러오는 중...
          </p>
        ) : reports.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-12">
            제보 내역이 없습니다.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">맛집명</th>
                  <th className="py-2 pr-3 font-medium">현재 주소</th>
                  <th className="py-2 pr-3 font-medium">수정 요청 주소</th>
                  <th className="py-2 pr-3 font-medium">코멘트</th>
                  <th className="py-2 pr-3 font-medium">날짜</th>
                  <th className="py-2 pr-3 font-medium">상태</th>
                  <th className="py-2 font-medium">액션</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr key={r.id} className="border-b">
                    <td className="py-2 pr-3 font-medium whitespace-nowrap">
                      {r.restaurant_name}
                    </td>
                    <td className="py-2 pr-3 text-muted-foreground max-w-48 truncate">
                      {r.restaurant_address}
                    </td>
                    <td className="py-2 pr-3 text-orange-600 max-w-48 truncate">
                      {r.suggested_address}
                    </td>
                    <td className="py-2 pr-3 text-muted-foreground max-w-32 truncate">
                      {r.comment || '-'}
                    </td>
                    <td className="py-2 pr-3 text-muted-foreground whitespace-nowrap">
                      {r.created_at?.slice(0, 10) ?? '-'}
                    </td>
                    <td className="py-2 pr-3">
                      <Badge
                        variant={r.status === 'pending' ? 'secondary' : 'default'}
                        className="text-[10px]"
                      >
                        {r.status === 'pending' ? '대기' : r.status === 'fixed' ? '완료' : r.status}
                      </Badge>
                    </td>
                    <td className="py-2">
                      {r.status === 'pending' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={fixingId === r.id}
                          onClick={() => handleFix(r.id)}
                          className="h-7 text-xs gap-1"
                        >
                          {fixingId === r.id ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            <MapPin className="size-3" />
                          )}
                          수정
                        </Button>
                      ) : (
                        <CheckCircle className="size-4 text-green-600" />
                      )}
                      {fixResults[r.id] && (
                        <p
                          className={`mt-1 text-[10px] max-w-48 ${fixResults[r.id].success ? 'text-green-600' : 'text-red-600'}`}
                        >
                          {fixResults[r.id].message}
                        </p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}
