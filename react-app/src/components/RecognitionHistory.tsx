import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Download, Eye, History as HistoryIcon, BarChart, Image as ImageIcon, ChevronLeft, ChevronRight, X } from "lucide-react";
import { RecognitionHistorySummary, RecognitionOperation, ImageRecognitionData, HistoryStatistics, HistorySummary, OperationResponse } from "@/types";
import { toast } from "sonner";
import { CheckCircle2, AlertCircle, XCircle } from "lucide-react";

const CLASS_MAP = {
    'Adjustable_wrench': 'Разводной ключ',
    'screwdriver_1': 'Отвертка "-"',
    'screwdriver_2': 'Отвертка "+"',
    'Offset_Phillips': 'Отвертка на смещенный крест',
    'Offset_Phillips_screwdriver': 'Отвертка на смещенный крест',
    'Side_cutters': 'Бокорезы',
    'Shernica': 'Шэрница',
    'Safety_pliers': 'Пассатижи контровочные',
    'Pliers': 'Пассатижи',
    'Rotary_wheel': 'Коловорот',
    'Open_end_wrench': 'Ключ рожковый накидной 3/4',
    'Oil_can_opener': 'Открывашка для банок с маслом'
};

// Базовый URL API
const API_BASE_URL = 'http://192.168.193.130:8001';

// Хук для загрузки изображения с сервера по image_id
const useImageLoader = (imageId: string | null) => {
  const [imageData, setImageData] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!imageId) {
      setImageData(null);
      return;
    }

    const loadImage = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`${API_BASE_URL}/api/images/${imageId}`);
        
        if (!response.ok) {
          throw new Error(`Ошибка загрузки изображения: ${response.status}`);
        }
        
        const blob = await response.blob();
        const imageUrlObject = URL.createObjectURL(blob);
        
        setImageData(imageUrlObject);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ошибка загрузки изображения');
        console.error('Ошибка загрузки изображения:', err);
      } finally {
        setLoading(false);
      }
    };

    loadImage();

    return () => {
      if (imageData) {
        URL.revokeObjectURL(imageData);
      }
    };
  }, [imageId]);

  return { imageData, loading, error };
};

// Функции для определения статуса на основе порога распознавания
const getToolStatus = (confidence: number, recognitionThreshold: number): "detected" | "uncertain" | "missing" => {
  const warningThreshold = Math.max(recognitionThreshold - 15, 50);
  
  if (confidence >= recognitionThreshold) {
    return "detected";
  } else if (confidence >= warningThreshold) {
    return "uncertain";
  } else {
    return "missing";
  }
};

const getOverallStatus = (imageConfidence: number, recognitionThreshold: number): string => {
  const warningThreshold = Math.max(recognitionThreshold - 15, 50);
  
  if (imageConfidence >= recognitionThreshold) {
    return "Все найдены";
  } else if (imageConfidence >= warningThreshold) {
    return "Требуется проверка";
  } else {
    return "Необходим ручной пересчет";
  }
};

const getSafeRecognitionThreshold = (recognition: number | null | undefined): number => {
  return (recognition || 0.5) * 100; // 0.5 = 50% по умолчанию
};

// API функции с обновленными URL
const useRecognitionHistory = () => {
  const [operations, setOperations] = useState<RecognitionHistorySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}/api/history`);
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const data: HistorySummary = await response.json();
        setOperations(data.operations);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        toast.error("Ошибка загрузки истории");
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  return { operations, loading, error };
};

const useHistoryStatistics = () => {
  const [statistics, setStatistics] = useState<HistoryStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_BASE_URL}/api/statistics/history`);
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const data: HistoryStatistics = await response.json();
        setStatistics(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        toast.error("Ошибка загрузки статистики");
      } finally {
        setLoading(false);
      }
    };

    fetchStatistics();
  }, []);

  return { statistics, loading, error };
};

const useOperationDetails = (operationId: string | null) => {
  const [operation, setOperation] = useState<RecognitionOperation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!operationId) {
      setOperation(null);
      return;
    }

    const fetchOperationDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`${API_BASE_URL}/api/history/${operationId}`);
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const data: OperationResponse = await response.json();
        setOperation(data.operation);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        toast.error("Ошибка загрузки деталей операции");
      } finally {
        setLoading(false);
      }
    };

    fetchOperationDetails();
  }, [operationId]);

  return { operation, loading, error };
};

// Компонент для просмотра фото в полноэкранном режиме
const ImagePreviewModal = ({ 
  imageId, 
  isOpen, 
  onClose,
  imageNumber,
  totalImages,
  onNext,
  onPrev
}: { 
  imageId: string; 
  isOpen: boolean; 
  onClose: () => void;
  imageNumber: number;
  totalImages: number;
  onNext: () => void;
  onPrev: () => void;
}) => {
  const { imageData, loading: imageLoading, error: imageError } = useImageLoader(imageId);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft' && totalImages > 1) {
        onPrev();
      } else if (event.key === 'ArrowRight' && totalImages > 1) {
        onNext();
      } else if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isOpen, totalImages, onNext, onPrev, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
      <div className="relative max-w-4xl max-h-full w-full">
        <Button variant="secondary" size="icon" className="absolute top-4 right-4 z-10" onClick={onClose}>
          <X className="h-6 w-6" />
        </Button>
        
        {totalImages > 1 && (
          <>
            <Button variant="secondary" size="icon" onClick={onPrev} className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white">
              <ChevronLeft className="h-6 w-6" />
            </Button>
            <Button variant="secondary" size="icon" onClick={onNext} className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white">
              <ChevronRight className="h-6 w-6" />
            </Button>
          </>
        )}
        
        {imageLoading ? (
          <div className="flex items-center justify-center h-64 text-white">
            <div className="text-center">
              <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              <p>Загрузка изображения...</p>
            </div>
          </div>
        ) : imageError ? (
          <div className="flex items-center justify-center h-64 text-white">
            <div className="text-center">
              <ImageIcon className="h-16 w-16 mx-auto mb-3 opacity-50" />
              <p>Ошибка загрузки изображения</p>
              <p className="text-sm text-muted-foreground mt-2">{imageError}</p>
            </div>
          </div>
        ) : imageData ? (
          <img src={imageData} alt={`Просмотр изображения ${imageNumber}`} className="max-w-full max-h-full object-contain" />
        ) : (
          <div className="flex items-center justify-center h-64 text-white">
            <div className="text-center">
              <ImageIcon className="h-16 w-16 mx-auto mb-3 opacity-50" />
              <p>Изображение не загружено</p>
            </div>
          </div>
        )}
        
        {totalImages > 1 && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-md text-sm">
            {imageNumber} из {totalImages}
          </div>
        )}
      </div>
    </div>
  );
};

interface DetailedHistoryViewProps {
  operation: RecognitionOperation;
}

const DetailedHistoryView = ({ operation }: DetailedHistoryViewProps) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false);

  const currentImage = operation.images[currentImageIndex];
  const { imageData, loading: imageLoading, error: imageError } = useImageLoader(currentImage.imageId);
  
  // Получаем порог распознавания из операции
  const recognitionThreshold = getSafeRecognitionThreshold(operation.recognition);

  // Считаем количество обнаруженных инструментов с учетом порога
  const detectedCount = currentImage.results.filter(tool => 
    (tool.confidence * 100) >= recognitionThreshold
  ).length;

  // Определяем общий статус на основе порога
  const overallStatus = getOverallStatus(currentImage.imageConfidence * 100, recognitionThreshold);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "detected": return <CheckCircle2 className="h-4 w-4 text-success" />;
      case "uncertain": return <AlertCircle className="h-4 w-4 text-warning" />;
      case "missing": return <XCircle className="h-4 w-4 text-destructive" />;
      default: return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "detected": return <Badge className="bg-success text-success-foreground text-xs">Обнаружен</Badge>;
      case "uncertain": return <Badge className="bg-warning text-warning-foreground text-xs">Требует проверки</Badge>;
      case "missing": return <Badge variant="destructive" className="text-xs">Не найден</Badge>;
      default: return null;
    }
  };

  const exportOperationToJSON = () => {
    const exportData = {
      operationId: operation.id,
      timestamp: operation.timestamp,
      totalImages: operation.images.length,
      images: operation.images.map((image, index) => ({
        imageNumber: index + 1,
        imageId: image.imageId,
        fileName: image.fileName,
        detectionTime: image.detectionTime,
        overallMatch: image.imageConfidence,
        results: image.results
      })),
      summary: {
        totalImages: operation.summary.totalImages,
        averageMatch: operation.summary.averageMatch,
        totalDetectionTime: operation.summary.totalDetectionTime
      }
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `operation-${operation.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Операция экспортирована");
  };

  const nextImage = () => setCurrentImageIndex((prev) => (prev + 1) % operation.images.length);
  const prevImage = () => setCurrentImageIndex((prev) => (prev - 1 + operation.images.length) % operation.images.length);
  const openImagePreview = () => setIsImagePreviewOpen(true);

  return (
    <>
      <div className="space-y-4 max-w-6xl">
        {/* Статистика операции */}
        <div className="grid grid-cols-5 gap-3">
          <Card className="p-3">
            <div className="text-center">
              <div className="text-lg font-bold text-primary">{new Date(operation.timestamp).toLocaleDateString('ru-RU')}</div>
              <div className="text-xs text-muted-foreground">{new Date(operation.timestamp).toLocaleTimeString('ru-RU')}</div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="text-center">
              <div className="text-lg font-bold text-primary flex items-center justify-center gap-1">
                <ImageIcon className="h-4 w-4" />
                {operation.images.length}
              </div>
              <div className="text-xs text-muted-foreground">файлов</div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="text-center">
              <div className="text-lg font-bold text-primary">{operation.summary.totalDetectionTime} мс</div>
              <div className="text-xs text-muted-foreground">общее время</div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="text-center">
              <div className="text-lg font-bold text-primary">{(operation.summary.averageMatch*100).toFixed(2)}%</div>
              <div className="text-xs text-muted-foreground">средняя уверенность</div>
            </div>
          </Card>
          <Card className="p-3">
            <div className="text-center">
              <div className="text-lg font-bold text-primary">{recognitionThreshold.toFixed(0)}%</div>
              <div className="text-xs text-muted-foreground">порог распознавания</div>
            </div>
          </Card>
        </div>

        {/* Основной контент - фото и результаты */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <Card className="p-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold">Статус анализа</h3>
                  <Badge variant={
                    overallStatus === "Все найдены" ? "default" : 
                    overallStatus === "Требуется проверка" ? "secondary" : "destructive"
                  }>
                    {overallStatus}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Найдено инструментов:</span>
                    <span className="font-medium">{detectedCount}/11</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Средняя уверенность:</span>
                    <span className="font-medium">{(currentImage.imageConfidence*100).toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Время обработки:</span>
                    <span className="font-medium">{currentImage.detectionTime}мс</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Порог распознавания:</span>
                    <span className="font-medium">{recognitionThreshold.toFixed(0)}%</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Область фото с загрузкой изображения */}
            <Card className="p-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{currentImage.fileName}</h3>
                  {operation.images.length > 1 && (
                    <span className="text-sm text-muted-foreground">{currentImageIndex + 1} из {operation.images.length}</span>
                  )}
                </div>
                
                <div 
                  className="bg-muted/30 rounded-lg p-4 text-center aspect-video flex items-center justify-center cursor-pointer hover:bg-muted/40 transition-colors"
                  onClick={openImagePreview}
                >
                  {imageLoading ? (
                    <div className="flex flex-col items-center justify-center">
                      <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-2"></div>
                      <p className="text-sm text-muted-foreground">Загрузка изображения...</p>
                    </div>
                  ) : imageError ? (
                    <div className="space-y-2 text-destructive">
                      <ImageIcon className="h-16 w-16 mx-auto" />
                      <p className="text-sm">Ошибка загрузки изображения</p>
                      <p className="text-xs text-muted-foreground">{imageError}</p>
                    </div>
                  ) : imageData ? (
                    <img 
                      src={imageData} 
                      alt={currentImage.fileName}
                      className="max-h-full max-w-full object-contain rounded"
                    />
                  ) : (
                    <div className="space-y-2">
                      <ImageIcon className="h-16 w-16 mx-auto text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Изображение не загружено</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-center gap-3">
                  {operation.images.length > 1 && (
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={prevImage}>
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={nextImage}>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  
                  <Button variant="outline" size="sm" onClick={openImagePreview} className="flex items-center gap-2">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                    <span className="hidden sm:inline">Полный экран</span>
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* Правая часть - результаты распознавания */}
          <div className="lg:col-span-2">
            <Card className="p-4 h-full">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold">Результаты для {currentImage.fileName}</h3>
                <Button onClick={exportOperationToJSON} className="gap-2" size="sm">
                  <Download className="h-4 w-4" />Экспорт операции
                </Button>
              </div>
              
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-2">
                  {currentImage.results.map((tool) => {
                    // Динамически определяем статус на основе порога
                    const toolStatus = getToolStatus(tool.confidence * 100, recognitionThreshold);
                    
                    return (
                      <div key={tool.id} className="flex items-center justify-between p-2 rounded-lg bg-background border">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {getStatusIcon(toolStatus)}
                          <span className="font-medium text-sm truncate">{CLASS_MAP[tool.name]}</span>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <div className="w-16"><Progress value={+(tool.confidence*100).toFixed(2)} className="h-1.5" /></div>
                          <span className="text-sm font-medium w-12 text-right">{(tool.confidence*100).toFixed(2)}%</span>
                          {getStatusBadge(toolStatus)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </Card>
          </div>
        </div>
      </div>

      <ImagePreviewModal
        imageId={currentImage.imageId}
        isOpen={isImagePreviewOpen}
        onClose={() => setIsImagePreviewOpen(false)}
        imageNumber={currentImageIndex + 1}
        totalImages={operation.images.length}
        onNext={nextImage}
        onPrev={prevImage}
      />
    </>
  );
};

interface RecognitionHistoryComponentProps {
  onOperationClick?: (operationId: string) => void;
}

export const RecognitionHistoryComponent = ({ onOperationClick }: RecognitionHistoryComponentProps) => {
  const { operations, loading: historyLoading, error: historyError } = useRecognitionHistory();
  const { statistics, loading: statsLoading, error: statsError } = useHistoryStatistics();
  const [selectedOperationId, setSelectedOperationId] = useState<string | null>(null);
  const { operation: selectedOperation, loading: detailsLoading } = useOperationDetails(selectedOperationId);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleOperationClick = (operationId: string) => {
    setSelectedOperationId(operationId);
    setDialogOpen(true);
    onOperationClick?.(operationId);
  };

  // Функция для определения статуса операции на основе порога
  const getOperationStatus = (overallMatch: number, recognition: number): "success" | "warning" | "error" => {
    const warningThreshold = Math.max(recognition - 15, 50);
    
    if (overallMatch >= recognition) {
      return "success";
    } else if (overallMatch >= warningThreshold) {
      return "warning";
    } else {
      return "error";
    }
  };

  // Показываем загрузку, только если оба запроса еще грузятся
  if (historyLoading && statsLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <HistoryIcon className="h-12 w-12 mx-auto mb-3 text-muted-foreground animate-pulse" />
          <p className="text-muted-foreground">Загрузка истории...</p>
        </div>
      </div>
    );
  }

  // Если есть ошибка истории, но статистика загружена - показываем статистику и ошибку истории
  if (historyError && operations.length === 0) {
    return (
      <div className="space-y-6">
        {/* Показываем статистику, если она загрузилась */}
        {statistics && !statsError && (
          <Card className="p-5 bg-gradient-card shadow-md">
            <div className="flex items-center gap-3 mb-4">
              <BarChart className="h-6 w-6 text-primary" />
              <h3 className="text-lg font-semibold">Сводная статистика</h3>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-background rounded-lg">
                <div className="text-2xl font-bold text-primary">{statistics.totalOperations}</div>
                <p className="text-sm text-muted-foreground">Операций</p>
              </div>
              <div className="text-center p-3 bg-background rounded-lg">
                <div className="text-2xl font-bold text-primary">{statistics.totalImages}</div>
                <p className="text-sm text-muted-foreground">Изображений</p>
              </div>
              <div className="text-center p-3 bg-background rounded-lg">
                <div className="text-2xl font-bold text-primary">{statistics.averageProcessingTime}мс</div>
                <p className="text-sm text-muted-foreground">Среднее время</p>
              </div>
              <div className="text-center p-3 bg-background rounded-lg">
                <div className="text-2xl font-bold text-primary">{statistics.averageAccuracy}%</div>
                <p className="text-sm text-muted-foreground">Средняя точность</p>
              </div>
            </div>
          </Card>
        )}

        {/* Ошибка загрузки истории */}
        <Card className="p-5 bg-gradient-card shadow-md">
          <div className="text-center text-destructive py-10">
            <HistoryIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Ошибка загрузки истории</p>
            <p className="text-sm text-muted-foreground mt-2">{historyError}</p>
          </div>
        </Card>
      </div>
    );
  }

  // Если есть ошибка статистики, но история загружена - показываем историю и ошибку статистики
if (statsError && statistics === null) {
    return (
      <div className="space-y-6">
        {/* Ошибка загрузки статистики */}
        <Card className="p-5 bg-gradient-card shadow-md">
          <div className="flex items-center gap-3 mb-4">
            <BarChart className="h-6 w-6 text-primary" />
            <h3 className="text-lg font-semibold">Сводная статистика</h3>
          </div>
          <div className="text-center text-destructive py-4">
            <p>Ошибка загрузки статистики</p>
            <p className="text-sm text-muted-foreground mt-2">{statsError}</p>
          </div>
        </Card>

        {/* Таблица истории (если данные есть) */}
        {operations.length > 0 && (
          <Card className="p-5 bg-gradient-card shadow-md">
            <div className="flex items-center gap-3 mb-4">
              <HistoryIcon className="h-6 w-6 text-primary" />
              <h3 className="text-lg font-semibold">История распознаваний</h3>
            </div>
            
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-3">
                {operations.map((operation) => {
                  const operationDate = new Date(operation.timestamp);
                  // Определяем статус операции на основе порога
                  const operationRecognitionThreshold = getSafeRecognitionThreshold(operation.recognition);
                  const operationStatus = getOperationStatus(
                    operation.overallMatch * 100, 
                    operationRecognitionThreshold
                  );
                  
                  const getStatusVariant = (status: string) => {
                    return status === "success" ? "default" : status === "warning" ? "secondary" : "destructive";
                  };
                  
                  return (
                    <div key={operation.id} className="p-4 rounded-lg bg-background border hover:shadow-sm transition-all">
                      <div className="grid grid-cols-1 md:grid-cols-7 gap-3 items-center">
                        <div className="md:col-span-2">
                          <div className="font-medium">{operationDate.toLocaleDateString('ru-RU')}</div>
                          <div className="text-sm text-muted-foreground">{operationDate.toLocaleTimeString('ru-RU')}</div>
                        </div>
                        
                        <div className="text-center">
                          <div className="font-medium flex items-center justify-center gap-1">
                            <ImageIcon className="h-3 w-3" />{operation.imageCount}
                          </div>
                          <div className="text-xs text-muted-foreground">файлов</div>
                        </div>
                        
                        <div className="text-center">
                          <div className="font-medium">{operation.detectionTime}мс</div>
                          <div className="text-xs text-muted-foreground">время</div>
                        </div>

                        <div className="text-center">
                          <div className="font-medium">{(operation.overallMatch*100).toFixed(2)}%</div>
                          <div className="text-xs text-muted-foreground">уверенность</div>
                        </div>

                        <div className="text-center">
                          <div className="font-medium">{operationRecognitionThreshold.toFixed(0)}%</div>
                          <div className="text-xs text-muted-foreground">порог</div>
                        </div>
                        
                        <div className="flex items-center justify-between gap-2">
                          <Badge variant={getStatusVariant(operationStatus)} className="text-xs">
                            {operationStatus === "success" ? "Успешно" : operationStatus === "warning" ? "Требуется проверка" : "Ошибка"}
                          </Badge>
                          
                          <Dialog open={dialogOpen && selectedOperationId === operation.id} onOpenChange={setDialogOpen}>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" onClick={() => handleOperationClick(operation.id)}>
                                <Eye className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>Подробности распознавания</DialogTitle>
                              </DialogHeader>
                              {detailsLoading ? (
                                <div className="flex justify-center items-center h-64">
                                  <div className="text-center">
                                    <HistoryIcon className="h-12 w-12 mx-auto mb-3 text-muted-foreground animate-pulse" />
                                    <p className="text-muted-foreground">Загрузка деталей...</p>
                                  </div>
                                </div>
                              ) : selectedOperation ? (
                                <DetailedHistoryView operation={selectedOperation} />
                              ) : (
                                <div className="text-center text-destructive">Ошибка загрузки данных</div>
                              )}
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </Card>
        )}
      </div>
    );
  }


  // Основной случай - оба запроса успешны или хотя бы один успешен
 return (
    <div className="space-y-6">
      {/* Сводная статистика (показываем, если данные есть) */}
      {statistics && !statsError && (
        <Card className="p-5 bg-gradient-card shadow-md">
          <div className="flex items-center gap-3 mb-4">
            <BarChart className="h-6 w-6 text-primary" />
            <h3 className="text-lg font-semibold">Сводная статистика</h3>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-background rounded-lg">
              <div className="text-2xl font-bold text-primary">{statistics.totalOperations}</div>
              <p className="text-sm text-muted-foreground">Операций</p>
            </div>
            <div className="text-center p-3 bg-background rounded-lg">
              <div className="text-2xl font-bold text-primary">{statistics.totalImages}</div>
              <p className="text-sm text-muted-foreground">Изображений</p>
            </div>
            <div className="text-center p-3 bg-background rounded-lg">
              <div className="text-2xl font-bold text-primary">{statistics.averageProcessingTime}мс</div>
              <p className="text-sm text-muted-foreground">Среднее время</p>
            </div>
            <div className="text-center p-3 bg-background rounded-lg">
              <div className="text-2xl font-bold text-primary">{(statistics.averageAccuracy*100).toFixed(2)}%</div>
              <p className="text-sm text-muted-foreground">Средняя уверенность</p>
            </div>
          </div>
        </Card>
      )}

      {/* Таблица истории (показываем, если данные есть) */}
      <Card className="p-5 bg-gradient-card shadow-md">
        <div className="flex items-center gap-3 mb-4">
          <HistoryIcon className="h-6 w-6 text-primary" />
          <h3 className="text-lg font-semibold">История распознаваний</h3>
        </div>
        
        {operations.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <HistoryIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>История распознаваний пуста</p>
          </div>
        ) : (
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-3">
              {operations.map((operation) => {
                const operationDate = new Date(operation.timestamp);
                // Определяем статус операции на основе порога
                const operationRecognitionThreshold = getSafeRecognitionThreshold(operation.recognition);
                const operationStatus = getOperationStatus(
                  operation.overallMatch * 100, 
                  operationRecognitionThreshold
                );
                
                const getStatusVariant = (status: string) => {
                  return status === "success" ? "default" : status === "warning" ? "secondary" : "destructive";
                };
                
                return (
                  <div key={operation.id} className="p-4 rounded-lg bg-background border hover:shadow-sm transition-all">
                    <div className="grid grid-cols-1 md:grid-cols-7 gap-3 items-center">
                      <div className="md:col-span-2">
                        <div className="font-medium">{operationDate.toLocaleDateString('ru-RU')}</div>
                        <div className="text-sm text-muted-foreground">{operationDate.toLocaleTimeString('ru-RU')}</div>
                      </div>
                      
                      <div className="text-center">
                        <div className="font-medium flex items-center justify-center gap-1">
                          <ImageIcon className="h-3 w-3" />{operation.imageCount}
                        </div>
                        <div className="text-xs text-muted-foreground">файлов</div>
                      </div>
                      
                      <div className="text-center">
                        <div className="font-medium">{operation.detectionTime}мс</div>
                        <div className="text-xs text-muted-foreground">время</div>
                      </div>

                      <div className="text-center">
                        <div className="font-medium">{(operation.overallMatch*100).toFixed(2)}%</div>
                        <div className="text-xs text-muted-foreground">уверенность</div>
                      </div>

                      <div className="text-center">
                        <div className="font-medium">{operationRecognitionThreshold.toFixed(0)}%</div>
                        <div className="text-xs text-muted-foreground">порог</div>
                      </div>
                      
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant={getStatusVariant(operationStatus)} className="text-xs">
                          {operationStatus === "success" ? "Успешно" : operationStatus === "warning" ? "Проверка" : "Ошибка"}
                        </Badge>
                        
                        <Dialog open={dialogOpen && selectedOperationId === operation.id} onOpenChange={setDialogOpen}>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" onClick={() => handleOperationClick(operation.id)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Подробности распознавания</DialogTitle>
                            </DialogHeader>
                            {detailsLoading ? (
                              <div className="flex justify-center items-center h-64">
                                <div className="text-center">
                                  <HistoryIcon className="h-12 w-12 mx-auto mb-3 text-muted-foreground animate-pulse" />
                                  <p className="text-muted-foreground">Загрузка деталей...</p>
                                </div>
                              </div>
                            ) : selectedOperation ? (
                              <DetailedHistoryView operation={selectedOperation} />
                            ) : (
                              <div className="text-center text-destructive">Ошибка загрузки данных</div>
                            )}
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </Card>
    </div>
  );
};