import TasksCompletionChart from "./tasks-completion-chart"

// Server component wrapper for SSR + cache
export default async function TasksCompletionChartSSR({
  days = 7,
  title,
  subtitle,
  className,
}: {
  days?: number
  title?: string
  subtitle?: string
  className?: string
}) {
  // Since the charts API now requires user authentication for individual data,
  // we can't pre-fetch data on the server side. Data will be loaded client-side.
  const initial = null

  return <TasksCompletionChart days={days} title={title} subtitle={subtitle} className={className} initial={initial} />
}
