import React, {useEffect, useRef, useState} from 'react'
const h = React.createElement
export const inject = ['slots', 'locale']
const NS = 'ecnu-external-agents'
const zh = {title: '外部任务', running: '运行中', completed: '已完成', failed: '失败', cancelled: '已取消', refused: '已拒绝', limited: '达到输出上限', unknown: '状态未知', empty: '此任务没有当前插件的状态记录。', note: '结果在主聊天中查看；此面板只展示宿主观测到的状态。', unknownNote: '宿主重启或未记录状态，不能据此判断任务仍在运行。', close: '关闭任务面板'}
const en = {title: 'External tasks', running: 'Running', completed: 'Completed', failed: 'Failed', cancelled: 'Cancelled', refused: 'Refused', limited: 'Output limit', unknown: 'Unknown', empty: 'No status observation is available for this task.', note: 'Results appear in the main chat. This panel shows host-observed status only.', unknownNote: 'The host restarted or no observation was recorded; this does not mean the task is still running.', close: 'Close task panel'}
const css = `
.ecnu-agent-trigger{font:inherit;font-size:12px;border:1px solid var(--dsw-alias-border-l4,#ddd);border-radius:8px;padding:5px 9px;background:transparent;color:inherit;cursor:pointer}
.ecnu-agent-panel{position:fixed;margin:0;width:360px;max-width:calc(100vw - 24px);max-height:min(480px,70vh);overflow:auto;box-sizing:border-box;padding:16px;border:1px solid var(--dsw-alias-border-l4,#ddd);border-radius:12px;background:var(--dsw-alias-bg-layer-1,#fff);color:var(--dsw-alias-label-primary,#222);box-shadow:0 8px 30px #0002;font:13px/1.5 system-ui}
.ecnu-agent-panel header{display:flex;align-items:center;justify-content:space-between;gap:12px}.ecnu-agent-panel header button{border:0;background:none;color:inherit;font-size:20px;cursor:pointer}
.ecnu-agent-row{padding:12px 0;border-bottom:1px solid var(--dsw-alias-border-l4,#ddd)}.ecnu-agent-row div{display:flex;align-items:center;justify-content:space-between;gap:12px}.ecnu-agent-row strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;font-weight:500}.ecnu-agent-row small,.ecnu-agent-panel p{color:var(--dsw-alias-label-tertiary,#777);font-size:11px;overflow-wrap:anywhere}.ecnu-agent-state{white-space:nowrap;font-size:11px;border-radius:6px;padding:2px 6px;background:#8881}.ecnu-agent-state[data-status=running]{color:#2563a6;background:#2563a610}.ecnu-agent-state[data-status=completed]{color:#26734a;background:#26734a10}.ecnu-agent-state[data-status=failed]{color:#b23a40;background:#b23a4010}
`
function Panel({sessionId, useSessions, t}) {
  const snapshot = useSessions(s => s.projectionsBySession[sessionId])
  const rows = snapshot?.values.ecnuExternalAgents ?? []
  const catalog = (snapshot?.values.subagentCatalog ?? []).filter(row => row.mode === 'external')
  const running = rows.filter(row => row.status === 'running').length
  const [now, setNow] = useState(Date.now)
  const panel = useRef(null)
  const trigger = useRef(null)
  const [position, setPosition] = useState({top: 80, left: 20})
  useEffect(() => {
    if (!running) return
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [running])
  useEffect(() => {panel.current?.hidePopover()}, [sessionId])
  if (!catalog.length) return null
  const toggle = () => {
    const rect = trigger.current.getBoundingClientRect()
    setPosition({top: Math.max(12, Math.min(rect.bottom + 8, innerHeight - 120)), left: Math.max(12, Math.min(rect.left, innerWidth - 384))})
    panel.current.togglePopover()
  }
  return h(React.Fragment, null,
    h('button', {ref: trigger, className: 'ecnu-agent-trigger', onClick: toggle, 'aria-haspopup': 'dialog'}, `${t('title')} ${catalog.length}${running ? ` · ${running} ${t('running')}` : ''}`),
    h('div', {ref: panel, popover: 'auto', role: 'dialog', 'aria-label': t('title'), className: 'ecnu-agent-panel', style: position},
      h('header', null, h('strong', null, t('title')), h('button', {'aria-label': t('close'), onClick: () => panel.current.hidePopover()}, '×')),
      ...catalog.map(item => {
        const row = rows.find(row => row.id === item.id)
        const status = row?.status ?? 'unknown'
        const elapsed = row?.startedAt != null && status !== 'unknown' ? Math.max(0, Math.round(((row.endedAt ?? now) - row.startedAt) / 1000)) : null
        return h('section', {key: item.id, className: 'ecnu-agent-row'},
          h('div', null, h('strong', {title: item.label ?? item.id}, item.label ?? item.id), h('span', {className: 'ecnu-agent-state', 'data-status': status}, t(status))),
          h('small', null, [row?.provider, elapsed === null ? null : `${elapsed}s`].filter(Boolean).join(' · ')),
          h('small', {style: {display: 'block'}}, item.id),
          status === 'unknown' && h('p', null, t('unknownNote')))
      }), h('p', null, t('note'))))
}
export function apply(ctx) {
  ctx.locale.register(NS, {zh, en})
  ctx.effect(() => {
    const style = document.createElement('style')
    style.textContent = css; document.head.append(style)
    return () => style.remove()
  })
  ctx.slots.inject('conversation.session.header.actions', () => ctx.slots.register({
    name: 'conversation.session.header.actions', id: NS, order: 11, locale: NS,
  }, Panel))
}
