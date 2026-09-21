#!/usr/bin/env node
// Sinh src/api/schema.d.ts từ OpenAPI (URL hoặc file).
// Dùng: npm run api:gen [http://host/openapi.json | ../labasset-api/openapi.json]
import { execFileSync } from 'node:child_process'

const arg = process.argv[2]
const base = process.env.VITE_API_URL || 'http://localhost:3969'
const input = arg ?? `${base}/openapi.json`

console.log(`[api:gen] ${input} -> src/api/schema.d.ts`)
execFileSync('npx', ['openapi-typescript', input, '-o', 'src/api/schema.d.ts', '--alphabetize'], {
  stdio: 'inherit',
})
