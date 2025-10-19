from typing import List
from pydantic import BaseModel

class RecognitionHistorySummary(BaseModel):
    id: int
    timestamp: str
    imageCount: int
    detectionTime: int
    overallMatch: float
    recognition: float  # "success" | "warning" | "error"

class HistoryResponse(BaseModel):
    operations: List[RecognitionHistorySummary]

# Модели
class RecognitionResult(BaseModel):
    id: int
    name: str
    confidence: float
    color: str

class ImageRecognitionDataModel(BaseModel):
    imageId: int
    imageUrl: str
    fileName: str
    detectionTime: int
    imageConfidence: float
    imageBase64: str = ""
    results: List[RecognitionResult]

class SummaryModel(BaseModel):
    totalImages: int
    totalDetectionTime: int
    averageMatch: float

class RecognitionOperationModel(BaseModel):
    id: int
    timestamp: str
    images: List[ImageRecognitionDataModel]
    summary: SummaryModel
    toolset: str
    recognition: float = 0.5

class OperationDetailsResponse(BaseModel):
    operation: RecognitionOperationModel

class HistoryStatistics(BaseModel):
    totalOperations: int
    totalImages: int
    averageProcessingTime: int
    averageAccuracy: float