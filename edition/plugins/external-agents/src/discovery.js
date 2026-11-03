import {access, stat} from 'node:fs/promises'
import {constants} from 'node:fs'
import {homedir} from 'node:os'
import {delimiter, join, isAbsolute} from 'node:path'
import {spawn} from 'node:child_process'

export async function executable(path) {
  if (!isAbsolute(path)) return false
  try { await access(path, constants.X_OK); return (await stat(path)).isFile() } catch { return false }
}
export async function discover({home = homedir(), path = process.env.PATH ?? '', platform = process.platform} = {}) {
  const dirs = [...new Set([join(home, '.local/bin'), join(home, '.cursor/bin'), ...path.split(delimiter).filter(isAbsolute)])]
  const find = async names => { for (const name of names) if (await executable(name)) return name; return null }
  const suffix = platform === 'win32' ? '.exe' : ''
  const codex = await find(dirs.map(dir => join(dir, 'codex' + suffix)))
  const cursor = await find(dirs.map(dir => join(dir, 'agent' + suffix)))
  const app = platform === 'darwin' && await stat('/Applications/Cursor.app').then(s => s.isDirectory(), () => false)
  return [{id: 'codex', name: 'Codex', kind: 'codex', command: codex, args: [], installed: !!codex},
    {id: 'cursor', name: 'Cursor', kind: 'acp', command: cursor, args: ['acp'], installed: !!cursor || !!app}]
}

// Explicit user-initiated probe only. No shell, task prompt, login or permission grant.
export function probe(command, args, {acp = false, timeout = 10000, env = process.env} = {}) {
  return new Promise(resolve => {
    let output = '', finished = false, result = null
    const child = spawn(command, args, {env, stdio: ['pipe', 'pipe', 'ignore'], windowsHide: true, detached: process.platform !== 'win32'})
    const stop = signal => {
      try {
        if (process.platform !== 'win32' && child.pid) process.kill(-child.pid, signal)
        else child.kill(signal)
      } catch { /* Already exited. */ }
    }
    const finish = value => {
      if (finished) return
      finished = true; result = value; clearTimeout(timer)
      child.stdin.end(); stop('SIGTERM')
      const kill = setTimeout(() => stop('SIGKILL'), 1000)
      child.once('close', () => { clearTimeout(kill); resolve(result) })
      if (child.exitCode !== null || child.signalCode !== null || !child.pid) { clearTimeout(kill); resolve(result) }
    }
    const timer = setTimeout(() => finish({ok: false, message: 'timeout'}), timeout)
    child.on('error', () => finish({ok: false, message: 'unavailable'}))
    child.stdin.on('error', () => {})
    child.stdout.on('data', data => {
      output += data.toString()
      if (output.length > 65536) return finish({ok: false, message: 'invalid_response'})
      if (!acp) return
      let end
      while ((end = output.indexOf('\n')) >= 0) {
        const line = output.slice(0, end); output = output.slice(end + 1)
        try {
          const response = JSON.parse(line)
          if (response.id === 1 && response.result?.protocolVersion === 1) finish({ok: true, message: 'handshake'})
          else if (response.id === 1 && response.error) finish({ok: false, message: 'rejected'})
          else if (response.id !== undefined && response.method) child.stdin.write(JSON.stringify({jsonrpc: '2.0', id: response.id, error: {code: -32601, message: 'Probe does not expose client operations'}}) + '\n')
        } catch { finish({ok: false, message: 'invalid_response'}) }
      }
    })
    child.on('close', code => {
      if (finished) return
      finished = true; clearTimeout(timer)
      resolve({ok: !acp && code === 0, message: !acp && code === 0 ? 'connected' : 'unavailable'})
    })
    if (acp) child.stdin.write(JSON.stringify({jsonrpc: '2.0', id: 1, method: 'initialize', params: {protocolVersion: 1, clientCapabilities: {}, clientInfo: {name: 'eduwork-agent-check', version: '0.1.0'}}}) + '\n')
    else child.stdin.end()
  })
}
