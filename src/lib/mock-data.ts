// NeuroQuant Mock Data

export interface Position {
  id: string;
  symbol: string;
  underlying: string;
  type: 'CALL' | 'PUT' | 'STOCK';
  strike?: number;
  expiry?: string;
  quantity: number;
  avgPrice: number;
  marketPrice: number;
  unrealizedPnl: number;
  delta?: number;
  theta?: number;
  gamma?: number;
  vega?: number;
  notional: number;
  strategy: string;
  account: string;
}

export interface Trade {
  id: string;
  date: string;
  symbol: string;
  underlying: string;
  type: 'CALL' | 'PUT' | 'STOCK';
  side: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  commission: number;
  strategy: string;
  account: string;
  source: string;
  isRoll: boolean;
}

export interface ImportBatch {
  id: string;
  sourceId: string;
  sourceName: string;
  fileName: string;
  parserProfile: string;
  mappingVersion: string;
  status: 'completed' | 'failed' | 'processing' | 'pending' | 'partial';
  importedRows: number;
  errorRows: number;
  totalRows: number;
  startedAt: string;
  completedAt?: string;
  triggeredBy: string;
  errors: ImportError[];
}

export interface ImportError {
  row: number;
  field: string;
  message: string;
  value: string;
}

export interface DataSource {
  id: string;
  name: string;
  type: string;
  protocol: string;
  host: string;
  port: number;
  username: string;
  remotePath: string;
  filenamePattern: string;
  pollingSchedule: string;
  active: boolean;
  encrypted: boolean;
  lastConnected?: string;
  lastStatus: 'connected' | 'error' | 'unknown';
  lastError?: string;
}

export interface ParserProfile {
  id: string;
  name: string;
  sourcePattern: string;
  fileType: string;
  delimiter: string;
  headerRow: number;
  skipRows: number;
  dateFormat: string;
  numericFormat: string;
  encoding: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface MappingRule {
  id: string;
  profileId: string;
  profileName: string;
  destinationTable: string;
  sourceField: string;
  targetField: string;
  fieldType: string;
  required: boolean;
  defaultValue?: string;
  transform?: string;
  validation?: string;
  dedup: 'skip' | 'overwrite' | 'append';
}

export interface AuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  eventType: string;
  entityType: string;
  entityId: string;
  source: string;
  metadata: string;
}

export const positions: Position[] = [
  { id: 'p1', symbol: 'SPY 240315C500', underlying: 'SPY', type: 'CALL', strike: 500, expiry: '2026-03-15', quantity: -10, avgPrice: 8.50, marketPrice: 6.20, unrealizedPnl: 2300, delta: -0.42, theta: 0.08, gamma: -0.02, vega: -0.15, notional: -500000, strategy: 'SPY Iron Condor', account: 'IBKR-Main' },
  { id: 'p2', symbol: 'SPY 240315P480', underlying: 'SPY', type: 'PUT', strike: 480, expiry: '2026-03-15', quantity: -10, avgPrice: 5.20, marketPrice: 3.80, unrealizedPnl: 1400, delta: 0.28, theta: 0.06, gamma: -0.01, vega: -0.12, notional: -480000, strategy: 'SPY Iron Condor', account: 'IBKR-Main' },
  { id: 'p3', symbol: 'SPY 240315C510', underlying: 'SPY', type: 'CALL', strike: 510, expiry: '2026-03-15', quantity: 10, avgPrice: 4.10, marketPrice: 2.90, unrealizedPnl: -1200, delta: 0.25, theta: -0.05, gamma: 0.01, vega: 0.10, notional: 510000, strategy: 'SPY Iron Condor', account: 'IBKR-Main' },
  { id: 'p4', symbol: 'SPY 240315P470', underlying: 'SPY', type: 'PUT', strike: 470, expiry: '2026-03-15', quantity: 10, avgPrice: 2.80, marketPrice: 1.90, unrealizedPnl: -900, delta: -0.15, theta: -0.04, gamma: 0.01, vega: 0.08, notional: 470000, strategy: 'SPY Iron Condor', account: 'IBKR-Main' },
  { id: 'p5', symbol: 'AAPL 240419C185', underlying: 'AAPL', type: 'CALL', strike: 185, expiry: '2026-04-19', quantity: -5, avgPrice: 6.80, marketPrice: 8.10, unrealizedPnl: -650, delta: -0.55, theta: 0.04, gamma: -0.03, vega: -0.20, notional: -92500, strategy: 'AAPL Covered Call', account: 'IBKR-Main' },
  { id: 'p6', symbol: 'AAPL', underlying: 'AAPL', type: 'STOCK', quantity: 500, avgPrice: 178.50, marketPrice: 182.30, unrealizedPnl: 1900, delta: 1.0, theta: 0, gamma: 0, vega: 0, notional: 91150, strategy: 'AAPL Covered Call', account: 'IBKR-Main' },
  { id: 'p7', symbol: 'QQQ 240517P400', underlying: 'QQQ', type: 'PUT', strike: 400, expiry: '2026-05-17', quantity: -8, avgPrice: 12.40, marketPrice: 9.80, unrealizedPnl: 2080, delta: 0.35, theta: 0.07, gamma: -0.02, vega: -0.18, notional: -320000, strategy: 'QQQ Put Spread', account: 'IBKR-Strat2' },
  { id: 'p8', symbol: 'QQQ 240517P380', underlying: 'QQQ', type: 'PUT', strike: 380, expiry: '2026-05-17', quantity: 8, avgPrice: 6.20, marketPrice: 4.50, unrealizedPnl: -1360, delta: -0.20, theta: -0.04, gamma: 0.01, vega: 0.12, notional: 304000, strategy: 'QQQ Put Spread', account: 'IBKR-Strat2' },
  { id: 'p9', symbol: 'TSLA 240419C250', underlying: 'TSLA', type: 'CALL', strike: 250, expiry: '2026-04-19', quantity: -3, avgPrice: 15.60, marketPrice: 18.20, unrealizedPnl: -780, delta: -0.48, theta: 0.09, gamma: -0.02, vega: -0.25, notional: -75000, strategy: 'TSLA Strangle', account: 'IBKR-Main' },
  { id: 'p10', symbol: 'TSLA 240419P220', underlying: 'TSLA', type: 'PUT', strike: 220, expiry: '2026-04-19', quantity: -3, avgPrice: 11.30, marketPrice: 8.40, unrealizedPnl: 870, delta: 0.32, theta: 0.07, gamma: -0.01, vega: -0.18, notional: -66000, strategy: 'TSLA Strangle', account: 'IBKR-Main' },
];

export const trades: Trade[] = [
  { id: 't1', date: '2026-03-10', symbol: 'SPY 240315C500', underlying: 'SPY', type: 'CALL', side: 'SELL', quantity: 10, price: 8.50, commission: 12.50, strategy: 'SPY Iron Condor', account: 'IBKR-Main', source: 'IBKR-FTP', isRoll: false },
  { id: 't2', date: '2026-03-10', symbol: 'SPY 240315P480', underlying: 'SPY', type: 'PUT', side: 'SELL', quantity: 10, price: 5.20, commission: 12.50, strategy: 'SPY Iron Condor', account: 'IBKR-Main', source: 'IBKR-FTP', isRoll: false },
  { id: 't3', date: '2026-03-10', symbol: 'SPY 240315C510', underlying: 'SPY', type: 'CALL', side: 'BUY', quantity: 10, price: 4.10, commission: 12.50, strategy: 'SPY Iron Condor', account: 'IBKR-Main', source: 'IBKR-FTP', isRoll: false },
  { id: 't4', date: '2026-03-08', symbol: 'AAPL', underlying: 'AAPL', type: 'STOCK', side: 'BUY', quantity: 500, price: 178.50, commission: 1.00, strategy: 'AAPL Covered Call', account: 'IBKR-Main', source: 'IBKR-FTP', isRoll: false },
  { id: 't5', date: '2026-03-08', symbol: 'AAPL 240419C185', underlying: 'AAPL', type: 'CALL', side: 'SELL', quantity: 5, price: 6.80, commission: 6.25, strategy: 'AAPL Covered Call', account: 'IBKR-Main', source: 'IBKR-FTP', isRoll: false },
  { id: 't6', date: '2026-03-07', symbol: 'QQQ 240517P400', underlying: 'QQQ', type: 'PUT', side: 'SELL', quantity: 8, price: 12.40, commission: 10.00, strategy: 'QQQ Put Spread', account: 'IBKR-Strat2', source: 'IBKR-FTP', isRoll: false },
  { id: 't7', date: '2026-03-05', symbol: 'TSLA 240419C250', underlying: 'TSLA', type: 'CALL', side: 'SELL', quantity: 3, price: 15.60, commission: 3.75, strategy: 'TSLA Strangle', account: 'IBKR-Main', source: 'IBKR-FTP', isRoll: false },
  { id: 't8', date: '2026-03-05', symbol: 'TSLA 240419P220', underlying: 'TSLA', type: 'PUT', side: 'SELL', quantity: 3, price: 11.30, commission: 3.75, strategy: 'TSLA Strangle', account: 'IBKR-Main', source: 'Manual', isRoll: false },
  { id: 't9', date: '2026-03-03', symbol: 'SPY 240215C495', underlying: 'SPY', type: 'CALL', side: 'BUY', quantity: 10, price: 2.10, commission: 12.50, strategy: 'SPY Iron Condor', account: 'IBKR-Main', source: 'IBKR-FTP', isRoll: true },
  { id: 't10', date: '2026-03-03', symbol: 'SPY 240315C500', underlying: 'SPY', type: 'CALL', side: 'SELL', quantity: 10, price: 8.50, commission: 12.50, strategy: 'SPY Iron Condor', account: 'IBKR-Main', source: 'IBKR-FTP', isRoll: true },
];

export const importBatches: ImportBatch[] = [
  { id: 'ib1', sourceId: 's1', sourceName: 'IBKR Daily Activity', fileName: 'U1234567_20260310_activity.csv.pgp', parserProfile: 'IBKR Activity Statement', mappingVersion: 'v2.4', status: 'completed', importedRows: 847, errorRows: 3, totalRows: 850, startedAt: '2026-03-10T06:15:00Z', completedAt: '2026-03-10T06:16:42Z', triggeredBy: 'scheduler', errors: [{ row: 128, field: 'tradePrice', message: 'Invalid numeric format', value: 'N/A' }, { row: 445, field: 'expiry', message: 'Date parse error', value: '02/30/2026' }, { row: 712, field: 'quantity', message: 'Null not allowed', value: '' }] },
  { id: 'ib2', sourceId: 's1', sourceName: 'IBKR Daily Activity', fileName: 'U1234567_20260309_activity.csv.pgp', parserProfile: 'IBKR Activity Statement', mappingVersion: 'v2.4', status: 'completed', importedRows: 623, errorRows: 0, totalRows: 623, startedAt: '2026-03-09T06:15:00Z', completedAt: '2026-03-09T06:16:18Z', triggeredBy: 'scheduler', errors: [] },
  { id: 'ib3', sourceId: 's1', sourceName: 'IBKR Daily Activity', fileName: 'U1234567_20260308_activity.csv.pgp', parserProfile: 'IBKR Activity Statement', mappingVersion: 'v2.3', status: 'completed', importedRows: 1204, errorRows: 12, totalRows: 1216, startedAt: '2026-03-08T06:15:00Z', completedAt: '2026-03-08T06:18:05Z', triggeredBy: 'scheduler', errors: [{ row: 89, field: 'symbol', message: 'Unknown symbol format', value: 'SPX--260315C5000' }] },
  { id: 'ib4', sourceId: 's2', sourceName: 'IBKR Margin Report', fileName: 'U1234567_20260310_margin.xml.pgp', parserProfile: 'IBKR Margin XML', mappingVersion: 'v1.1', status: 'failed', importedRows: 0, errorRows: 1, totalRows: 0, startedAt: '2026-03-10T06:20:00Z', triggeredBy: 'scheduler', errors: [{ row: 0, field: 'file', message: 'PGP decryption failed: invalid passphrase', value: '' }] },
  { id: 'ib5', sourceId: 's1', sourceName: 'IBKR Daily Activity', fileName: 'U1234567_20260307_activity.csv.pgp', parserProfile: 'IBKR Activity Statement', mappingVersion: 'v2.3', status: 'completed', importedRows: 492, errorRows: 1, totalRows: 493, startedAt: '2026-03-07T06:15:00Z', completedAt: '2026-03-07T06:16:02Z', triggeredBy: 'scheduler', errors: [] },
  { id: 'ib6', sourceId: 's1', sourceName: 'IBKR Daily Activity', fileName: 'U1234567_20260311_activity.csv.pgp', parserProfile: 'IBKR Activity Statement', mappingVersion: 'v2.4', status: 'processing', importedRows: 320, errorRows: 0, totalRows: 750, startedAt: '2026-03-11T06:15:00Z', triggeredBy: 'scheduler', errors: [] },
];

export const dataSources: DataSource[] = [
  { id: 's1', name: 'IBKR Daily Activity', type: 'IBKR Activity Statement', protocol: 'SFTP', host: 'ftp.interactivebrokers.com', port: 22, username: 'U1234567', remotePath: '/outgoing/reports/', filenamePattern: 'U1234567_*_activity.csv.pgp', pollingSchedule: '0 6 * * *', active: true, encrypted: true, lastConnected: '2026-03-11T06:15:00Z', lastStatus: 'connected' },
  { id: 's2', name: 'IBKR Margin Report', type: 'IBKR Margin Report', protocol: 'SFTP', host: 'ftp.interactivebrokers.com', port: 22, username: 'U1234567', remotePath: '/outgoing/reports/', filenamePattern: 'U1234567_*_margin.xml.pgp', pollingSchedule: '0 6 * * *', active: true, encrypted: true, lastConnected: '2026-03-10T06:20:00Z', lastStatus: 'error', lastError: 'PGP decryption failed' },
  { id: 's3', name: 'IBKR Position Snapshot', type: 'IBKR Position File', protocol: 'SFTP', host: 'ftp.interactivebrokers.com', port: 22, username: 'U1234567', remotePath: '/outgoing/reports/', filenamePattern: 'U1234567_*_positions.csv.pgp', pollingSchedule: '30 6 * * *', active: false, encrypted: true, lastStatus: 'unknown' },
];

export const parserProfiles: ParserProfile[] = [
  { id: 'pp1', name: 'IBKR Activity Statement', sourcePattern: '*_activity.csv', fileType: 'CSV', delimiter: ',', headerRow: 1, skipRows: 0, dateFormat: 'YYYY-MM-DD', numericFormat: 'US', encoding: 'UTF-8', createdAt: '2026-01-15', updatedAt: '2026-03-08', version: 4 },
  { id: 'pp2', name: 'IBKR Margin XML', sourcePattern: '*_margin.xml', fileType: 'XML', delimiter: 'N/A', headerRow: 0, skipRows: 0, dateFormat: 'YYYY-MM-DD', numericFormat: 'US', encoding: 'UTF-8', createdAt: '2026-02-01', updatedAt: '2026-02-20', version: 2 },
  { id: 'pp3', name: 'IBKR Position CSV', sourcePattern: '*_positions.csv', fileType: 'CSV', delimiter: ',', headerRow: 1, skipRows: 2, dateFormat: 'MM/DD/YYYY', numericFormat: 'US', encoding: 'UTF-8', createdAt: '2026-02-10', updatedAt: '2026-02-10', version: 1 },
];

export const mappingRules: MappingRule[] = [
  { id: 'm1', profileId: 'pp1', profileName: 'IBKR Activity Statement', destinationTable: 'trades', sourceField: 'TradeDate', targetField: 'trade_date', fieldType: 'date', required: true, transform: 'parseDate(YYYY-MM-DD)', dedup: 'skip' },
  { id: 'm2', profileId: 'pp1', profileName: 'IBKR Activity Statement', destinationTable: 'trades', sourceField: 'Symbol', targetField: 'symbol', fieldType: 'string', required: true, dedup: 'skip' },
  { id: 'm3', profileId: 'pp1', profileName: 'IBKR Activity Statement', destinationTable: 'trades', sourceField: 'Quantity', targetField: 'quantity', fieldType: 'integer', required: true, dedup: 'skip' },
  { id: 'm4', profileId: 'pp1', profileName: 'IBKR Activity Statement', destinationTable: 'trades', sourceField: 'TradePrice', targetField: 'price', fieldType: 'decimal', required: true, transform: 'toDecimal(4)', dedup: 'skip' },
  { id: 'm5', profileId: 'pp1', profileName: 'IBKR Activity Statement', destinationTable: 'trades', sourceField: 'Commission', targetField: 'commission', fieldType: 'decimal', required: false, defaultValue: '0', transform: 'abs(toDecimal(2))', dedup: 'skip' },
  { id: 'm6', profileId: 'pp1', profileName: 'IBKR Activity Statement', destinationTable: 'positions', sourceField: 'Symbol', targetField: 'symbol', fieldType: 'string', required: true, dedup: 'overwrite' },
  { id: 'm7', profileId: 'pp1', profileName: 'IBKR Activity Statement', destinationTable: 'positions', sourceField: 'Position', targetField: 'quantity', fieldType: 'integer', required: true, dedup: 'overwrite' },
  { id: 'm8', profileId: 'pp1', profileName: 'IBKR Activity Statement', destinationTable: 'positions', sourceField: 'MarkPrice', targetField: 'market_price', fieldType: 'decimal', required: true, transform: 'toDecimal(4)', dedup: 'overwrite' },
  { id: 'm9', profileId: 'pp2', profileName: 'IBKR Margin XML', destinationTable: 'margin_requirements', sourceField: 'InitMargin', targetField: 'initial_margin', fieldType: 'decimal', required: true, dedup: 'overwrite' },
  { id: 'm10', profileId: 'pp2', profileName: 'IBKR Margin XML', destinationTable: 'margin_requirements', sourceField: 'MaintMargin', targetField: 'maintenance_margin', fieldType: 'decimal', required: true, dedup: 'overwrite' },
];

export const auditLog: AuditEntry[] = [
  { id: 'a1', timestamp: '2026-03-11T06:16:42Z', actor: 'system', eventType: 'import.completed', entityType: 'import_batch', entityId: 'ib6', source: 'scheduler', metadata: '{"rows":750,"errors":0}' },
  { id: 'a2', timestamp: '2026-03-11T06:15:00Z', actor: 'system', eventType: 'import.started', entityType: 'import_batch', entityId: 'ib6', source: 'scheduler', metadata: '{"file":"U1234567_20260311_activity.csv.pgp"}' },
  { id: 'a3', timestamp: '2026-03-10T14:22:10Z', actor: 'admin@neuroquant.io', eventType: 'mapping.updated', entityType: 'mapping_rule', entityId: 'm5', source: 'ui', metadata: '{"field":"commission","change":"added abs() transform"}' },
  { id: 'a4', timestamp: '2026-03-10T06:20:15Z', actor: 'system', eventType: 'import.failed', entityType: 'import_batch', entityId: 'ib4', source: 'scheduler', metadata: '{"error":"PGP decryption failed"}' },
  { id: 'a5', timestamp: '2026-03-10T06:16:42Z', actor: 'system', eventType: 'import.completed', entityType: 'import_batch', entityId: 'ib1', source: 'scheduler', metadata: '{"rows":850,"errors":3}' },
  { id: 'a6', timestamp: '2026-03-09T11:05:00Z', actor: 'admin@neuroquant.io', eventType: 'source.updated', entityType: 'data_source', entityId: 's2', source: 'ui', metadata: '{"change":"updated polling schedule"}' },
  { id: 'a7', timestamp: '2026-03-08T16:30:00Z', actor: 'admin@neuroquant.io', eventType: 'parser.versioned', entityType: 'parser_profile', entityId: 'pp1', source: 'ui', metadata: '{"version":4,"change":"updated date format"}' },
  { id: 'a8', timestamp: '2026-03-07T09:12:00Z', actor: 'ops@neuroquant.io', eventType: 'source.test', entityType: 'data_source', entityId: 's1', source: 'ui', metadata: '{"result":"success","latency":"1.2s"}' },
];

export const strategies = [
  { name: 'SPY Iron Condor', underlying: 'SPY', legs: 4, openPnl: 1600, realizedPnl: 4200, maxRisk: -15000, delta: -0.04, theta: 0.05, status: 'active' as const },
  { name: 'AAPL Covered Call', underlying: 'AAPL', legs: 2, openPnl: 1250, realizedPnl: 8900, maxRisk: -89250, delta: 0.45, theta: 0.04, status: 'active' as const },
  { name: 'QQQ Put Spread', underlying: 'QQQ', legs: 2, openPnl: 720, realizedPnl: 3100, maxRisk: -16000, delta: 0.15, theta: 0.03, status: 'active' as const },
  { name: 'TSLA Strangle', underlying: 'TSLA', legs: 2, openPnl: 90, realizedPnl: 1800, maxRisk: -25000, delta: -0.16, theta: 0.16, status: 'active' as const },
];

export const performanceData = [
  { period: 'Jan 2026', pnl: 12400, cumulative: 12400, return: 1.24 },
  { period: 'Feb 2026', pnl: -3200, cumulative: 9200, return: -0.32 },
  { period: 'Mar 2026 MTD', pnl: 5660, cumulative: 14860, return: 0.57 },
];

export const incomeEvents = [
  { id: 'i1', date: '2026-03-10', type: 'Premium', symbol: 'SPY 240315C500', amount: 8500, strategy: 'SPY Iron Condor' },
  { id: 'i2', date: '2026-03-10', type: 'Premium', symbol: 'SPY 240315P480', amount: 5200, strategy: 'SPY Iron Condor' },
  { id: 'i3', date: '2026-03-08', type: 'Premium', symbol: 'AAPL 240419C185', amount: 3400, strategy: 'AAPL Covered Call' },
  { id: 'i4', date: '2026-03-07', type: 'Premium', symbol: 'QQQ 240517P400', amount: 9920, strategy: 'QQQ Put Spread' },
  { id: 'i5', date: '2026-03-05', type: 'Premium', symbol: 'TSLA 240419C250', amount: 4680, strategy: 'TSLA Strangle' },
  { id: 'i6', date: '2026-03-01', type: 'Dividend', symbol: 'AAPL', amount: 120, strategy: 'AAPL Covered Call' },
  { id: 'i7', date: '2026-02-28', type: 'Interest', symbol: 'Cash', amount: 340, strategy: '-' },
];
