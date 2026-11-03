import {test} from 'node:test'
import assert from 'node:assert/strict'
import {fold, observe, present, RECORD} from '../src/state.js'
const info = {id:'child-a', runId:'run-a', provider:'codex', local:false}
const initial = {inheritedEventCount:5, rows:[]}
const start = observe([], info, 'host-a', 100)
test('live status and terminal outcomes come only from lifecycle observations', () => {
  assert.equal(present(start,'host-a')[0].status,'running')
  for (const [reason,status] of Object.entries({completed:'completed',aborted:'cancelled',error:'failed',refusal:'refused','max-tokens':'limited',future:'unknown'})) {
    const ended = observe(start,{...info,stopReason:reason},'host-a',200,true)
    assert.equal(present(ended,'host-a')[0].status,status)
    assert.equal(ended[0].startedAt,100)
  }
})
test('restart never claims an orphaned run is still running; terminal state remains', () => {
  assert.equal(present(start,'host-b')[0].status,'unknown')
  assert.equal(present(observe(start,{...info,stopReason:'completed'},'host-a',200,true),'host-b')[0].status,'completed')
})
test('local children and duplicate starts do not create observations', () => {
  assert.strictEqual(observe(start,{...info,local:true},'host-a',200),start)
  assert.strictEqual(observe(start,info,'host-a',200),start)
})
test('fork isolation, complete snapshot replay, malformed records and unrelated events', () => {
  const event = {type:RECORD,seq:5,ignorable:true,data:{version:1,rows:start}}
  assert.deepEqual(fold(initial,event).rows,start)
  assert.strictEqual(fold(initial,{...event,seq:4}),initial)
  assert.strictEqual(fold(initial,{...event,type:'user/message'}),initial)
  assert.strictEqual(fold(initial,{...event,data:{version:1,rows:[{}]}}),initial)
  assert.deepEqual(fold(fold(initial,event),{...event,seq:6,data:{version:1,rows:[]}}).rows,[])
})
test('prompt/output/credential fields never enter persisted observations', () => {
  const rows=observe([],{...info,lastAssistantMessage:'secret',prompt:'secret'},'host-a',100)
  assert.ok(!JSON.stringify(rows).includes('secret'))
})
test('late terminal observation does not invent a start time', () => {
  const rows=observe([],{...info,stopReason:'completed'},'host-a',200,true)
  assert.equal(rows[0].startedAt,null)
  assert.equal(present(rows,'host-a')[0].status,'completed')
})
