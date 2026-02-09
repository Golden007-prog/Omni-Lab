export enum MessageRole {
  USER = 'user',
  MODEL = 'model',
  SYSTEM = 'system'
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  text: string;
  timestamp: Date;
  isToolCall?: boolean;
  toolResult?: string;
  groundingUrls?: string[];
}

export interface SourceFile {
  id: string;
  name: string;
  type: string;
  data: string; // Base64
  size: number;
  /**
   * Original uploaded File (kept in-memory for Gemini file ingestion).
   * Optional so existing code paths that only store base64 keep working.
   */
  file?: File;
}

export enum SimulationStatus {
  IDLE = 'idle',
  PLANNING = 'planning',
  CODING = 'coding',
  EXECUTING = 'executing',
  VERIFYING = 'verifying',
  RETRYING = 'retrying',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export enum VisualizationStatus {
  IDLE = 'IDLE',
  WORKING = 'WORKING',
  READY = 'READY'
}

export interface ThoughtLog {
  id: string;
  level: number; // 1-4
  message: string;
  timestamp: Date;
  status: 'info' | 'success' | 'warning' | 'error';
}

export interface SimulationResult {
  code: string;
  data: any[]; // Array of objects for Recharts
  chartType: 'line' | 'scatter' | 'bar';
  xAxisKey: string;
  yAxisKey: string;
  explanation: string;
}

export interface ScientistState {
  status: SimulationStatus;
  visualizationStatus: VisualizationStatus;
  thoughts: ThoughtLog[];
  result: SimulationResult | null;
  attemptCount: number;
}