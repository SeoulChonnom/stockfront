#!/usr/bin/env node
/**
 * shadcn 레지스트리 드리프트 검사.
 *
 * `src/components/ui/*.tsx`는 shadcn CLI 산출물로만 유지하는 정책이다.
 * 손으로 편집한 파일이 있으면 여기서 잡아 비영(非零)으로 끝낸다.
 *
 * 바이트 비교는 하지 않는다 — CLI는 prettier 계열(쌍따옴표, 세미콜론 없음)로
 * 쓰고 이 레포는 biome(홑따옴표, 세미콜론 있음, import/export 정렬)로 다시
 * 포맷하므로 바이트 diff는 100% 오탐이다. 대신 정규화한 토큰을 비교한다.
 */
import { readdirSync, readFileSync } from 'node:fs';

const UI_DIR = new URL('../src/components/ui/', import.meta.url);
const REGISTRY_BASE = 'https://ui.shadcn.com/r/styles/new-york-v4';

/**
 * 주석 제거 후 토큰화. 문자열은 홑/쌍따옴표를 쌍따옴표로 통일해 quoteStyle
 * 차이(biome 홑따옴표 vs CLI 쌍따옴표)를 흡수한다. 검증된 로직이라 그대로 쓴다.
 */
function normalize(src) {
  let s = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
  s = s.replace(/'((?:[^'\\\n]|\\.)*)'/g, (_, inner) => JSON.stringify(inner.replace(/\\'/g, "'")));
  return s.match(/"(?:[^"\\]|\\.)*"|[A-Za-z_$][\w$]*|\d+(?:\.\d+)?|[^\s]/g) ?? [];
}

/** rsc:false + aliases.utils 매핑 등, CLI가 실제로 수행하는 정상 변형. */
function applyCliTransforms(content) {
  return content
    .replace(/^"use client"\n+/, '')
    .replace(/from "cn"/g, "from '@/lib/utils'")
    .replace(/from "@\/registry\/new-york-v4\/ui\/([\w-]+)"/g, "from '@/components/ui/$1'");
}

const IMPORT_LINE_RE = /^import\s[^;]*?from\s+["'][^"']+["'];?\s*\n?/gm;
const EXPORT_BLOCK_RE = /^export\s*\{[^}]*\};?\s*\n?/gm;
const IMPORT_EXPORT_SYNTAX = new Set(['import', 'export', 'from', 'as', 'type', '{', '}', ',', '*', ';']);

/**
 * import 순서·export 목록 순서는 biome가 알파벳으로 재정렬하므로 위치가
 * 아니라 식별자 "집합"으로만 비교한다. `react` 네임스페이스 import는 제외한다
 * — 이 레포 tsconfig의 verbatimModuleSyntax가 `import type * as React`를
 * 요구/생략하는지를 결정하며, 레지스트리 스냅샷의 유무와는 무관하다
 * (예: button-group 레지스트리 원본은 React.ComponentProps를 쓰면서도
 * import 자체가 없다).
 */
function identifierSet(lines) {
  const kept = lines.filter((line) => !/from\s+["']react["']/.test(line));
  return new Set(normalize(kept.join('\n')).filter((t) => !IMPORT_EXPORT_SYNTAX.has(t)));
}

/**
 * import 문 블록과 export {} 블록을 집합 비교용으로 뽑아내고, 남은 본문은
 * 순서가 의미 있으므로 토큰 배열 그대로 둔다. 세미콜론은 CLI가 세미콜론 없이
 * 쓰고 biome가 항상 붙이는 순수 포맷 차이라(ASI로 의미 불변) 본문 비교에서
 * 제외하지 않으면 그 뒤 모든 토큰이 한 칸씩 밀려 보이는 대량 오탐이 난다.
 */
function splitParts(src) {
  const imports = src.match(IMPORT_LINE_RE) ?? [];
  const withoutImports = src.replace(IMPORT_LINE_RE, '');
  const exportBlocks = withoutImports.match(EXPORT_BLOCK_RE) ?? [];
  const body = withoutImports.replace(EXPORT_BLOCK_RE, '');
  return {
    importIds: identifierSet(imports),
    exportIds: identifierSet(exportBlocks),
    bodyTokens: normalize(body).filter((t) => t !== ';'),
  };
}

function setDiff(local, registry) {
  return {
    onlyLocal: [...local].filter((t) => !registry.has(t)),
    onlyRegistry: [...registry].filter((t) => !local.has(t)),
  };
}

/**
 * 본문 토큰의 최소 편집(LCS 기반)으로 "로컬에만/레지스트리에만" 있는 토큰을
 * 뽑는다. 첫 불일치 지점부터 그대로 잘라 보고하면 뒤 내용이 한 칸씩 밀린
 * 것처럼 보여 실제 변경 지점을 가린다 — 로컬 전용 삽입(예: InputProps
 * 인터페이스)이 있어도 그 뒤 동일한 코드가 다시 정렬되어 보이게 한다.
 */
function diffBodyTokens(local, registry) {
  const n = local.length;
  const m = registry.length;
  const dp = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = local[i] === registry[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const onlyLocal = [];
  const onlyRegistry = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (local[i] === registry[j]) {
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      onlyLocal.push(local[i++]);
    } else {
      onlyRegistry.push(registry[j++]);
    }
  }
  while (i < n) onlyLocal.push(local[i++]);
  while (j < m) onlyRegistry.push(registry[j++]);
  return { onlyLocal, onlyRegistry };
}

function listComponentNames() {
  return readdirSync(UI_DIR)
    .filter((f) => f.endsWith('.tsx') && !f.endsWith('.test.tsx'))
    .map((f) => f.slice(0, -'.tsx'.length))
    .sort();
}

async function fetchRegistry(name) {
  const url = `${REGISTRY_BASE}/${name}.json`;
  let res;
  try {
    res = await fetch(url);
  } catch (err) {
    return { kind: 'network-error', detail: err.message };
  }
  if (res.status === 404) return { kind: 'local-only' };
  if (!res.ok) return { kind: 'network-error', detail: `HTTP ${res.status}` };
  let json;
  try {
    json = await res.json();
  } catch (err) {
    return { kind: 'network-error', detail: `invalid JSON: ${err.message}` };
  }
  const file = json.files?.find((f) => f.path.endsWith(`/${name}.tsx`)) ?? json.files?.[0];
  if (!file?.content) return { kind: 'network-error', detail: 'registry response missing files[]' };
  return { kind: 'ok', content: file.content };
}

const SAMPLE_SIZE = 12;

function reportDrift(name, imp, exp, body) {
  console.log(`DRIFT ${name}`);
  if (imp.onlyLocal.length || imp.onlyRegistry.length) {
    console.log(`  import 전용(local): ${imp.onlyLocal.slice(0, SAMPLE_SIZE).join(', ') || '(없음)'}`);
    console.log(`  import 전용(registry): ${imp.onlyRegistry.slice(0, SAMPLE_SIZE).join(', ') || '(없음)'}`);
  }
  if (exp.onlyLocal.length || exp.onlyRegistry.length) {
    console.log(`  export 전용(local): ${exp.onlyLocal.slice(0, SAMPLE_SIZE).join(', ') || '(없음)'}`);
    console.log(`  export 전용(registry): ${exp.onlyRegistry.slice(0, SAMPLE_SIZE).join(', ') || '(없음)'}`);
  }
  if (body.onlyLocal.length || body.onlyRegistry.length) {
    console.log(`  본문 전용(local, ${body.onlyLocal.length}개 중 샘플): ${body.onlyLocal.slice(0, SAMPLE_SIZE).join(' ')}`);
    console.log(`  본문 전용(registry, ${body.onlyRegistry.length}개 중 샘플): ${body.onlyRegistry.slice(0, SAMPLE_SIZE).join(' ')}`);
  }
}

/** 하나의 컴포넌트를 대조한다. 반환값이 null이면 드리프트 없음. */
function compareComponent(localSrc, registrySrc) {
  const local = splitParts(localSrc);
  const registry = splitParts(applyCliTransforms(registrySrc));
  const imp = setDiff(local.importIds, registry.importIds);
  const exp = setDiff(local.exportIds, registry.exportIds);
  const sameBody = local.bodyTokens.length === registry.bodyTokens.length && local.bodyTokens.every((t, idx) => t === registry.bodyTokens[idx]);
  const hasDrift = imp.onlyLocal.length || imp.onlyRegistry.length || exp.onlyLocal.length || exp.onlyRegistry.length || !sameBody;
  if (!hasDrift) return null;
  const body = sameBody ? { onlyLocal: [], onlyRegistry: [] } : diffBodyTokens(local.bodyTokens, registry.bodyTokens);
  return { imp, exp, body };
}

async function checkOne(name) {
  const localSrc = readFileSync(new URL(`${name}.tsx`, UI_DIR), 'utf8');
  const registry = await fetchRegistry(name);
  if (registry.kind === 'network-error') return { name, status: 'network-error', detail: registry.detail };
  if (registry.kind === 'local-only') return { name, status: 'local-only' };
  const drift = compareComponent(localSrc, registry.content);
  if (!drift) {
    console.log(`OK ${name}`);
    return { name, status: 'ok' };
  }
  reportDrift(name, drift.imp, drift.exp, drift.body);
  return { name, status: 'drift' };
}

async function main() {
  const names = listComponentNames();
  const results = await Promise.all(names.map(checkOne));

  const driftCount = results.filter((r) => r.status === 'drift').length;
  const localOnly = results.filter((r) => r.status === 'local-only');
  const unchecked = results.filter((r) => r.status === 'network-error');

  for (const r of localOnly) console.log(`WARN ${r.name}: 레지스트리에 없음(404) — 로컬 전용 컴포넌트로 간주`);
  for (const r of unchecked) console.log(`WARN ${r.name}: 확인 못 함(${r.detail}) — 네트워크 실패는 게이트를 막지 않음`);

  // 네트워크 실패 자체는 실패가 아니다(오프라인 빌드를 막지 않는다). 하지만
  // 실제로 대조가 끝난 파일에서 드리프트가 나오면 그건 진짜 문제이므로
  // 네트워크 상태와 무관하게 실패시킨다.
  if (driftCount > 0) {
    console.log(`\n${driftCount}개 파일에서 드리프트 발견.`);
    process.exit(1);
  }
  console.log(`\n드리프트 없음 (확인 ${results.length - localOnly.length - unchecked.length}개, 로컬 전용 ${localOnly.length}개, 미확인 ${unchecked.length}개).`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
