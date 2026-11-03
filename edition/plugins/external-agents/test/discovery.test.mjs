import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtemp, mkdir, writeFile, rm} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {discover, executable, probe} from '../src/discovery.js'

test('passive discovery finds executable CLI only and never executes it', async () => {
  const home = await mkdtemp(join(tmpdir(), 'agent-discovery-'))
  try {
    await mkdir(join(home, '.local/bin'), {recursive:true})
    await writeFile(join(home, '.local/bin/agent'), '#!/bin/sh\nexit 99\n', {mode:0o755})
    const rows = await discover({home, path:'', platform:'linux'})
    assert.equal(rows[1].command, join(home, '.local/bin/agent'))
    assert.deepEqual(rows[1].args, ['acp'])
    assert.equal(rows[0].installed, false)
    assert.equal(await executable('.local/bin/agent'), false)
    assert.equal(await executable(home), false)
  } finally {await rm(home, {recursive:true, force:true})}
})
test('ACP probe accepts initialize only and terminates its child', async () => {
  const script = `process.stdin.on('data', d => { const r=JSON.parse(d); if(r.method!=='initialize')process.exit(2); process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:r.id,result:{protocolVersion:1}})+'\\n') })`
  assert.deepEqual(await probe(process.execPath, ['-e', script], {acp:true}), {ok:true,message:'handshake'})
})
test('probe rejects non-ACP output, missing executable, timeout and wrong protocol', async () => {
  assert.equal((await probe('/nonexistent/agent', [], {acp:true})).ok,false)
  assert.equal((await probe(process.execPath, ['-e', `console.log('bad')`], {acp:true})).message,'invalid_response')
  assert.equal((await probe(process.execPath, ['-e', `setInterval(()=>{},1000)`], {acp:true,timeout:80})).message,'timeout')
  assert.equal((await probe(process.execPath, ['-e', `console.log(JSON.stringify({id:1,result:{protocolVersion:99}}))`], {acp:true})).ok,false)
})
