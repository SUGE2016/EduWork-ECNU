export const RECORD = 'plugin:ecnu-external-agents/status'
export const KEY = 'ecnuExternalAgents'

// Each record contains the complete plugin-owned observation for this parent.
// Ignore a fork's inherited prefix: those runs belong to its original parent.
export function fold(state, event) {
  if (event.seq < state.inheritedEventCount || event.type !== RECORD || event.ignorable !== true) return state
  const data = event.data
  if (data?.version !== 1 || !Array.isArray(data.rows) || !data.rows.every(validRow)) return state
  return {...state, rows: data.rows}
}
function validRow(row) {
  return row && ['id', 'runId', 'provider', 'epoch'].every(key => typeof row[key] === 'string')
    && (row.startedAt === null || Number.isFinite(row.startedAt))
    && (row.endedAt === null || Number.isFinite(row.endedAt))
    && (row.stopReason === null || typeof row.stopReason === 'string')
}
export function observe(rows, info, epoch, time, terminal = false) {
  if (info.local) return rows
  const previous = rows.find(row => row.runId === info.runId)
  if (!terminal && previous) return rows
  const row = {
    id: info.id, runId: info.runId, provider: info.provider, epoch,
    startedAt: previous?.startedAt ?? (terminal ? null : time),
    endedAt: terminal ? time : null,
    stopReason: terminal ? info.stopReason : null,
  }
  return [...rows.filter(item => item.runId !== info.runId), row]
}
export function present(rows, epoch) {
  return rows.map(({epoch: owner, ...row}) => ({...row,
    status: row.endedAt === null ? owner === epoch ? 'running' : 'unknown'
      : ({completed: 'completed', aborted: 'cancelled', error: 'failed', refusal: 'refused', 'max-tokens': 'limited'}[row.stopReason] ?? 'unknown'),
  }))
}
