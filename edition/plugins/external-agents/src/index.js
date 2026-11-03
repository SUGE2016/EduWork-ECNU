import {randomUUID} from 'node:crypto'
import {z} from 'zod'
import {carrierKeyOf} from '@deepseek-ai/dsh-scope'
import {appendPluginRecord} from '@deepseek-ai/dsh-session'
import {KEY, RECORD, fold, observe, present} from './state.js'

export const name = 'ecnu-external-agent-status'
export const inject = ['subagents', 'sessionProjections']
export function apply(ctx) {
  const epoch = randomUUID()
  const row = z.object({id: z.string(), runId: z.string(), provider: z.string(), epoch: z.string(),
    startedAt: z.number().nullable(), endedAt: z.number().nullable(), stopReason: z.string().nullable()})
  const view = new WeakMap()
  ctx.sessionProjections.register({
    key: KEY, stateVersion: 1,
    stateSchema: z.object({inheritedEventCount: z.number(), rows: z.array(row)}),
    init: (_header, inheritedEventCount) => ({inheritedEventCount, rows: []}),
    apply: fold,
    wire: {
      viewSchema: z.array(row.omit({epoch: true}).extend({status: z.string()})),
      view: state => {
        if (!view.has(state)) view.set(state, present(state.rows, epoch))
        return view.get(state)
      },
    },
  })
  function record(info, terminal) {
    if (info.local) return
    const parent = carrierKeyOf(this)
    if (!parent?.session) return
    const state = ctx.sessionProjections.stateOf(parent.session, KEY)
    const rows = observe(state.rows, info, epoch, Date.now(), terminal)
    if (rows === state.rows) return
    // Only observation metadata, never prompts, credentials or assistant output.
    // This optional experimental record is safely ignored without the plugin.
    appendPluginRecord(parent.session, RECORD, {version: 1, rows})
  }
  ctx.on('subagent/start', function (info) { record.call(this, info, false) })
  ctx.on('subagent/end', function (info) { record.call(this, info, true) })
}
