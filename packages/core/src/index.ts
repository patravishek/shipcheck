export { scan } from './scanner.js';
export { isInsideStringLiteral, isInsideComment, isInCodeContext, lineNumberAt } from './utils.js';
export { formatReport, formatJson, formatSummary } from './reporter.js';
export { detectFrameworks } from './framework-detect.js';
export { walkProject } from './file-walker.js';
export { ALL_CHECKS } from './checks/index.js';
export type { ScanResult, ScanOptions, Issue, Severity, Framework, Check, CheckContext, FileInfo } from './types.js';
