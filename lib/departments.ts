export type Department = "copy" | "edicao" | "gestor" | "particular"

export const DEPARTMENTS: { id: Department; label: string }[] = [
  { id: "copy", label: "Copy" },
  { id: "edicao", label: "Edição" },
  { id: "gestor", label: "Gestor de Tráfego" },
  { id: "particular", label: "Particular" },
]

export function departmentToTag(d: Exclude<Department, "particular">): string {
  // Valores usados em tasks.tag
  switch (d) {
    case "copy":
      return "copy"
    case "edicao":
      return "edicao"
    case "gestor":
      return "gestor"
  }
}

export function isTaskInDepartment(
  task: { tag: string | null; assignee_id?: string | null; user_id: string },
  dept: Department,
  currentUserId: string | null,
) {
  if (dept === "particular") {
    // Preferimos assignee_id. Se não existir, caímos para user_id.
    if ("assignee_id" in task && task.assignee_id != null) {
      return currentUserId ? task.assignee_id === currentUserId : false
    }
    return currentUserId ? task.user_id === currentUserId : false
  }
  const tag = task.tag || ""
  if (dept === "copy") return tag === "copy"
  if (dept === "edicao") return tag === "edicao"
  if (dept === "gestor") return tag === "gestor"
  return false
}

export type PriorityFilter = "all" | "low" | "med" | "high"

export const PRIORITY_LABEL: Record<Exclude<PriorityFilter, "all">, string> = {
  low: "Normal",
  med: "Prioridade",
  high: "Urgente",
}
