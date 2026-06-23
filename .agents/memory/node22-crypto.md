---
name: Node 22 crypto changes
description: createCipher/createDecipher removed in Node 22; must use IV-based variants
---

`createCipher` and `createDecipher` were removed in Node.js 22. Code that imports them throws a SyntaxError at module load time:
`SyntaxError: The requested module 'node:crypto' does not provide an export named 'createCipher'`

**Fix:** Use `createCipheriv` / `createDecipheriv` with a random 16-byte IV:
```ts
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

function encrypt(plaintext: string, key: Buffer): string {
  const iv = randomBytes(16)
  const cipher = createCipheriv('aes-256-cbc', key, iv)
  const encrypted = cipher.update(plaintext, 'utf8', 'hex') + cipher.final('hex')
  return iv.toString('hex') + ':' + encrypted  // prepend IV for decryption
}

function decrypt(stored: string, key: Buffer): string {
  const [ivHex, data] = stored.split(':')
  const iv = Buffer.from(ivHex, 'hex')
  const decipher = createDecipheriv('aes-256-cbc', key, iv)
  return decipher.update(data, 'hex', 'utf8') + decipher.final('utf8')
}
```

**Why:** The old API derived the IV from the key (insecure). Node 22 enforced removal.
