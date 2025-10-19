import { ReactNode } from "react";

export interface Employee {
  id: string;
  name: string;
  position: string;
  department: string;
}

export interface Tool {
  id: number;
  name: string;
  confidence: number;
  status: "detected" | "missing" | "uncertain";
  manuallyMarked?: boolean;
}

export interface ToolSet {
  id: string;
  name: string;
  tools: string[];
}

export interface IssuanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  toolSetId: string;
  toolSetName: string;
  issuedAt: string;
  returnedAt?: string;
  issuedTools: Tool[];
  returnedTools?: Tool[];
  status: "created" | "issued" | "completed";
  matchPercentage?: number;
}

export interface ToolResult {
  id: number;
  name: string;
  confidence: number;
  status: "detected" | "missing" | "uncertain";
}

export interface RecognitionHistory {
  id: string;
  timestamp: string;
  imageCount: number;
  detectionTime: number;
  results:  RecognitionResult[];
  overallMatch: number;
  status: "success" | "warning" | "error";
}

// Сводная информация для списка операций
// Для /api/history - возвращает массив операций для таблицы
export interface RecognitionHistorySummary {
  id: string;
  timestamp: string;
  imageCount: string;  // или number, в зависимости от бекенда
  detectionTime: string; // или number
  overallMatch: number;
  recognition: number;
}

export interface HistorySummary {
  operations: RecognitionHistorySummary[];
}

// Для /api/history/statistics - возвращает общую статистику
export interface HistoryStatistics {
  totalOperations: number;
  totalImages: number;
  averageProcessingTime: number;
  averageAccuracy: number;
}

// Для /api/history/{operationId} - возвращает детали операции
export interface RecognitionOperation {
  id: string;
  operationId: string;
  timestamp: string;
  status: "success" | "warning" | "error";
  recognition: number;
  images: ImageRecognitionData[];
  summary: {
    totalImages: number;
    totalDetectionTime: number;
    averageMatch: number;
  };
}

export interface OperationResponse {
  operation: RecognitionOperation;
}

// Данные для одного изображения в операции
export interface ImageRecognitionData {
  imageId: string;
  imageUrl: string;
  fileName: string;
  detectionTime: number;
  imageConfidence: number;
  imageBase64 : Base64URLString;
  results: RecognitionResult[];
}

export interface ImageResponse {
  imageData: string; // base64 encoded image или blob URL
  contentType: string;
}

// Результат одного инструмента
export interface RecognitionResult {
  id: number;
  name: string;
  confidence: number;
  color: string;
}

// Ответ для списка операций
export interface HistoryResponse {
  operations: RecognitionHistorySummary[];
  statistics: {
    totalOperations: number;
    totalImages: number;
    averageProcessingTime: number;
    averageAccuracy: number;
  };
}

// Ответ для деталей операции
export interface OperationDetailsResponse {
  operation: RecognitionOperation;
}

// Настройки системы
export interface SystemSettings {
  recognition: {
    recognition: number; // 50-100% - ОСНОВНАЯ НАСТРОЙКА
  };
  interface: {
    autoCapture: boolean;
    soundNotifications: boolean;
    showBoundingBoxes: boolean;
  };
}

export interface SystemInfo {
  version: string;
  model: string;
  totalTools: number;
  lastUpdate: string;
}

