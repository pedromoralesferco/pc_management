import type { LucideIcon } from 'lucide-react'

interface Props {
  title: string
  value: string | number
  icon: LucideIcon
  color?: 'blue' | 'green' | 'yellow' | 'red' | 'purple'
  subtitle?: string
}

const colors = {
  blue:   { bg: 'bg-blue-50',   icon: 'bg-blue-100 text-blue-600',   text: 'text-blue-600' },
  green:  { bg: 'bg-green-50',  icon: 'bg-green-100 text-green-600', text: 'text-green-600' },
  yellow: { bg: 'bg-yellow-50', icon: 'bg-yellow-100 text-yellow-600', text: 'text-yellow-600' },
  red:    { bg: 'bg-red-50',    icon: 'bg-red-100 text-red-600',     text: 'text-red-600' },
  purple: { bg: 'bg-purple-50', icon: 'bg-purple-100 text-purple-600', text: 'text-purple-600' },
}

export default function StatCard({ title, value, icon: Icon, color = 'blue', subtitle }: Props) {
  const c = colors[color]
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${c.icon}`}>
        <Icon size={22} />
      </div>
      <div>
        <p className="text-sm text-slate-500">{title}</p>
        <p className={`text-2xl font-bold ${c.text}`}>{value}</p>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  )
}
