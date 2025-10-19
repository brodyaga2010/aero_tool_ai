// src/components/ToolRecognition.tsx
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  Upload,
  Camera,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Download,
  Archive,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ImageIcon,
  FileArchive,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { RecognitionOperation, ImageRecognitionData } from "@/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CLASS_MAP = {
  Adjustable_wrench: "Разводной ключ",
  screwdriver_1: 'Отвертка "-"',
  screwdriver_2: 'Отвертка "+"',
  Offset_Phillips: "Отвертка на смещенный крест",
  Offset_Phillips_screwdriver: "Отвертка на смещенный крест",
  Side_cutters: "Бокорезы",
  Shernica: "Шэрница",
  Safety_pliers: "Пассатижи контровочные",
  Pliers: "Пассатижи",
  Rotary_wheel: "Коловорот",
  Open_end_wrench: "Ключ рожковый накидной 3/4",
  Oil_can_opener: "Открывашка для банок с маслом",
};

// Наборы инструментов для распознавания (пока только один)
const TOOLSETS = [
  {
    id: "lightweight",
    name: "Облегченный набор инструмента для ЦОТО УФ RRJ/737/32S",
    description: "Специализированный набор для авиационного инструмента",
  },
];

// Хук для преобразования base64 в URL
const useBase64Image = (base64Data: string | null) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!base64Data) {
      setImageUrl(null);
      return;
    }

    const dataUrl = `data:image/jpeg;base64,${base64Data}`;
    setImageUrl(dataUrl);

    return () => {
      if (imageUrl && imageUrl.startsWith("data:")) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [base64Data]);

  return { imageUrl };
};

// Валидация файлов
const validateFiles = (
  files: File[]
): { isValid: boolean; error?: string; type?: "images" | "archive" } => {
  if (files.length === 0) {
    return { isValid: false, error: "Нет файлов для обработки" };
  }

  // Проверяем типы файлов
  const hasImages = files.some((file) => file.type.startsWith("image/"));
  const hasArchives = files.some((file) =>
    file.name.match(/\.(zip|rar|7z)$/i)
  );

  // Смешанные типы не допускаются
  if (hasImages && hasArchives) {
    return {
      isValid: false,
      error: "Нельзя смешивать изображения и архивы в одной загрузке",
    };
  }

  // Проверяем количество архивов (максимум 1)
  const archiveCount = files.filter((file) =>
    file.name.match(/\.(zip|rar|7z)$/i)
  ).length;
  if (archiveCount > 1) {
    return {
      isValid: false,
      error: "Можно загрузить только один архив за раз",
    };
  }

  // Определяем тип загрузки
  if (hasArchives) {
    return { isValid: true, type: "archive" };
  } else if (hasImages) {
    return { isValid: true, type: "images" };
  }

  return { isValid: false, error: "Неподдерживаемые форматы файлов" };
};

// Компонент для зоны drag-and-drop
const DropZone = ({
  onFilesSelected,
  isProcessing,
}: {
  onFilesSelected: (files: FileList, type: "images" | "archive") => void;
  isProcessing: boolean;
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [currentType, setCurrentType] = useState<"images" | "archive" | null>(
    null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFiles(Array.from(files));
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFiles(Array.from(files));
    }
  };

  const handleFiles = (fileArray: File[]) => {
    const validation = validateFiles(fileArray);

    if (!validation.isValid) {
      toast.error(validation.error || "Ошибка валидации файлов");
      return;
    }

    // Если уже есть файлы другого типа, очищаем
    if (currentType && validation.type !== currentType) {
      setSelectedFiles([]);
      setCurrentType(null);
    }

    setSelectedFiles(fileArray);
    setCurrentType(validation.type || null);

    // Создаем новый FileList для передачи в родительский компонент
    const dataTransfer = new DataTransfer();
    fileArray.forEach((file) => dataTransfer.items.add(file));
    onFilesSelected(dataTransfer.files, validation.type!);
  };

  const removeFile = (index: number) => {
    const newFiles = [...selectedFiles];
    newFiles.splice(index, 1);
    setSelectedFiles(newFiles);

    if (newFiles.length === 0) {
      setCurrentType(null);
      onFilesSelected(new DataTransfer().files, "images");
    } else {
      const validation = validateFiles(newFiles);
      if (validation.isValid) {
        const dataTransfer = new DataTransfer();
        newFiles.forEach((file) => dataTransfer.items.add(file));
        onFilesSelected(dataTransfer.files, validation.type!);
      }
    }
  };

  const clearAllFiles = () => {
    setSelectedFiles([]);
    setCurrentType(null);
    onFilesSelected(new DataTransfer().files, "images");
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith("image/")) {
      return <ImageIcon className="h-4 w-4" />;
    } else {
      return <Archive className="h-4 w-4" />;
    }
  };

  const getFileType = (file: File) => {
    if (file.type.startsWith("image/")) {
      return "Изображение";
    } else if (file.name.match(/\.zip$/i)) {
      return "ZIP архив";
    } else if (file.name.match(/\.rar$/i)) {
      return "RAR архив";
    } else if (file.name.match(/\.7z$/i)) {
      return "7z архив";
    }
    return "Файл";
  };

  const getZoneText = () => {
    if (currentType === "archive") {
      return "Архив выбран";
    } else if (currentType === "images") {
      return selectedFiles.length > 1
        ? "Изображения выбраны"
        : "Изображение выбрано";
    }
    return "Перетащите файлы сюда";
  };

  const getZoneSubtext = () => {
    if (currentType === "archive") {
      return "Только один архив за раз";
    } else if (currentType === "images") {
      return selectedFiles.length > 1
        ? `Выбрано ${selectedFiles.length} изображений`
        : "или нажмите для выбора файлов";
    }
    return "или нажмите для выбора файлов";
  };

  return (
    <div className="space-y-4">
      {/* Зона перетаскивания */}
      <div
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all
          ${
            isDragOver
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25 hover:border-primary/50 hover:bg-primary/5"
          }
          ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isProcessing && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.zip,.rar,.7z"
          multiple
          onChange={handleFileInput}
          className="hidden"
          disabled={isProcessing}
        />

        <div className="space-y-3">
          <div className="h-12 w-12 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
            <Upload className="h-6 w-6 text-primary" />
          </div>

          <div>
            <p className="font-medium text-lg">{getZoneText()}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {getZoneSubtext()}
            </p>
          </div>

          <div className="flex justify-center gap-6 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <ImageIcon className="h-3 w-3" />
              <span>Изображения (1+)</span>
            </div>
            <div className="flex items-center gap-1">
              <Archive className="h-3 w-3" />
              <span>Архив (1)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Список выбранных файлов */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <p className="text-sm font-medium">
              {currentType === "archive" ? "Архив:" : "Изображения:"}
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFiles}
              className="h-6 text-xs"
            >
              Очистить все
            </Button>
          </div>
          <div className="max-h-32 overflow-y-auto space-y-1">
            {selectedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-muted/30 rounded text-sm"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {getFileIcon(file)}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {getFileType(file)} •{" "}
                      {(file.size / 1024 / 1024).toFixed(2)} МБ
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(index);
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const ToolRecognition = ({}: {}) => {
  const [operation, setOperation] = useState<RecognitionOperation | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImagePreviewOpen, setIsImagePreviewOpen] = useState(false);
  const [processingProgress, setProcessingProgress] = useState({
    current: 0,
    total: 0,
  });
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [selectedToolset, setSelectedToolset] = useState("lightweight");
  const [fileType, setFileType] = useState<"images" | "archive" | null>(null);

  const currentImage = operation?.images[currentImageIndex];
  const { imageUrl: currentImageUrl } = useBase64Image(
    currentImage?.imageBase64 || null
  );

  // Функция для определения статуса инструмента на основе порога распознавания
  const getToolStatus = (
    confidence: number,
    recognitionThreshold: number
  ): "detected" | "uncertain" | "missing" => {
    const warningThreshold = Math.max(recognitionThreshold - 15, 50);

    if (confidence >= recognitionThreshold) {
      return "detected";
    } else if (confidence >= warningThreshold) {
      return "uncertain";
    } else {
      return "missing";
    }
  };

  // Функция для определения общего статуса изображения на основе количества найденных инструментов
  const getOverallStatus = (detectedCount: number): string => {
    if (detectedCount >= 11) {
      return "Все найдены";
    } else if (detectedCount >= 8) {
      return "Требуется проверка";
    } else {
      return "Необходим ручной пересчет";
    }
  };

  // Обработка выбранных файлов
  const handleFilesSelected = (
    files: FileList,
    type: "images" | "archive"
  ) => {
    setSelectedFiles(files);
    setFileType(type);
  };

  // Универсальная функция загрузки файлов
  const handleProcessFiles = async () => {
    if (!selectedFiles || selectedFiles.length === 0) {
      toast.error("Выберите файлы для обработки");
      return;
    }

    setIsProcessing(true);

    try {
      const formData = new FormData();
      formData.append("toolset", selectedToolset);

      // Определяем тип загрузки на основе валидации
      if (fileType === "archive") {
        // Архив
        formData.append("file", selectedFiles[0]);
        await processRecognition(formData, "archive");
      } else if (fileType === "images") {
        if (selectedFiles.length === 1) {
          // Одиночное изображение
          formData.append("file", selectedFiles[0]);
          await processRecognition(formData, "single");
        } else {
          // Пачка изображений
          for (let i = 0; i < selectedFiles.length; i++) {
            formData.append("files", selectedFiles[i]);
          }
          await processRecognition(formData, "multiple");
        }
      }
    } catch (error) {
      toast.error(
        `Ошибка обработки: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      console.error("Ошибка:", error);
    } finally {
      setIsProcessing(false);
      setProcessingProgress({ current: 0, total: 0 });
    }
  };

  // Функция обработки распознавания
  const processRecognition = async (
    formData: FormData,
    endpoint: "single" | "multiple" | "archive"
  ) => {
    let apiEndpoint = "";

    switch (endpoint) {
      case "single":
        apiEndpoint = "http://192.168.193.130:8000/api/recognize/single";
        break;
      case "multiple":
        apiEndpoint = "http://192.168.193.130:8000/api/recognize/multiple";
        setProcessingProgress({
          current: 0,
          total: formData.getAll("files").length,
        });
        break;
      case "archive":
        apiEndpoint = "http://192.168.193.130:8000/api/recognize/archive";
        break;
    }

    const response = await fetch(apiEndpoint, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: RecognitionOperation = await response.json();

    // Получаем порог распознавания из ответа сервера
    const recognitionThreshold = data.recognition || 0.5;

    // Обновляем статусы инструментов на основе порога распознавания с сервера
    const updatedData = {
      ...data,
      images: data.images.map((image) => ({
        ...image,
        results: image.results.map((tool) => ({
          ...tool,
          status: getToolStatus(tool.confidence * 100, recognitionThreshold * 100),
        })),
      })),
    };

    setOperation(updatedData);

    // Показываем соответствующее сообщение
    const message =
      endpoint === "single"
        ? `Обработано 1 изображение за ${data.summary.totalDetectionTime}мс`
        : `Обработано ${data.summary.totalImages} изображений за ${data.summary.totalDetectionTime}мс`;

    toast.success(message);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "detected":
        return <CheckCircle2 className="h-4 w-4 text-success" />;
      case "uncertain":
        return <AlertCircle className="h-4 w-4 text-warning" />;
      case "missing":
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "detected":
        return (
          <Badge className="bg-success text-success-foreground text-xs">
            Обнаружен
          </Badge>
        );
      case "uncertain":
        return (
          <Badge className="bg-warning text-warning-foreground text-xs">
            Требует проверки
          </Badge>
        );
      case "missing":
        return (
          <Badge variant="destructive" className="text-xs">
            Не найден
          </Badge>
        );
      default:
        return null;
    }
  };

  const exportToJSON = () => {
    if (!operation) return;

    const exportData = {
      operationId: operation.operationId,
      timestamp: operation.timestamp,
      toolset: TOOLSETS.find((t) => t.id === selectedToolset)?.name,
      recognitionThreshold: operation.recognition,
      summary: operation.summary,
      images: operation.images.map((image, index) => ({
        imageNumber: index + 1,
        fileName: image.fileName,
        detectionTime: image.detectionTime,
        overallMatch: image.imageConfidence,
        results: image.results,
      })),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `recognition-${operation.operationId}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Результаты экспортированы");
  };

  const nextImage = () =>
    setCurrentImageIndex(
      (prev) => (prev + 1) % (operation?.images.length || 1)
    );
  const prevImage = () =>
    setCurrentImageIndex(
      (prev) => (prev - 1 + (operation?.images.length || 1)) % (operation?.images.length || 1)
    );
  const openImagePreview = () => setIsImagePreviewOpen(true);

  // Получаем порог распознавания из операции или используем значение по умолчанию
  const recognitionThreshold = operation?.recognition || 0.5;

  // Вычисляем количество найденных инструментов (с учетом порога распознавания)
  const detectedCount =
    currentImage?.results.filter(
      (tool) => tool.confidence >= recognitionThreshold
    ).length || 0;

  // Определяем общий статус на основе количества найденных инструментов
  const overallStatus = getOverallStatus(detectedCount);

  // Компонент для просмотра фото в полноэкранном режиме с легендой
  const ImagePreviewModal = () => {
    if (!isImagePreviewOpen || !currentImage || !currentImageUrl) return null;

    // Получаем уникальные инструменты с цветами
    const uniqueTools = Array.from(
      new Map(
        currentImage.results.map((tool) => [
          tool.name,
          {
            name: CLASS_MAP[tool.name] || tool.name,
            color: tool.color,
          },
        ])
      ).values()
    );

    return (
      <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4">
        <div className="relative max-w-4xl max-h-full w-full">
          {/* Легенда в левом верхнем углу */}
          <div className="absolute top-4 left-4 z-10 bg-black/70 text-white p-3 rounded-md max-h-60 overflow-y-auto shadow-lg">
            <h4 className="font-semibold text-sm mb-2">Легенда инструментов</h4>
            <div className="space-y-1 text-xs">
              {uniqueTools.map((tool, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full border border-white/30"
                    style={{ backgroundColor: tool.color }}
                  />
                  <span>{tool.name}</span>
                </div>
              ))}
            </div>
          </div>

          <Button
            variant="secondary"
            size="icon"
            className="absolute top-4 right-4 z-10"
            onClick={() => setIsImagePreviewOpen(false)}
          >
            <X className="h-6 w-6" />
          </Button>

          {operation && operation.images.length > 1 && (
            <>
              <Button
                variant="secondary"
                size="icon"
                onClick={prevImage}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white"
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                onClick={nextImage}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 bg-black/50 hover:bg-black/70 text-white"
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            </>
          )}

          <img
            src={currentImageUrl}
            alt={currentImage.fileName}
            className="max-w-full max-h-full object-contain"
          />

          {operation && operation.images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-md text-sm">
              {currentImageIndex + 1} из {operation.images.length}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      {!operation && (
        <Card className="p-8 bg-gradient-card shadow-md">
          <div className="flex flex-col items-center justify-center space-y-6">
            {/* Выбор набора инструментов - растянут на всю ширину */}
            <div className="w-full">
              <div className="space-y-2 mb-4">
                <label className="text-left font-semibold block">
                  Набор инструментов для распознавания
                </label>
                <Select
                  value={selectedToolset}
                  onValueChange={setSelectedToolset}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Выберите набор инструментов" />
                  </SelectTrigger>
                  <SelectContent>
                    {TOOLSETS.map((toolset) => (
                      <SelectItem key={toolset.id} value={toolset.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{toolset.name}</span>
                          <span className="text-xs text-muted-foreground">
                            {toolset.description}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Зона drag-and-drop */}
            <div className="w-full">
              <DropZone
                onFilesSelected={handleFilesSelected}
                isProcessing={isProcessing}
              />

              {/* Кнопка обработки */}
              <Button
                onClick={handleProcessFiles}
                disabled={!selectedFiles || selectedFiles.length === 0 || isProcessing}
                className="w-full gap-2 h-12 mt-4"
              >
                {isProcessing ? (
                  <>
                    <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    Обработка...
                  </>
                ) : (
                  <>
                    <Camera className="h-5 w-5" />
                    Начать распознавание
                  </>
                )}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-muted-foreground text-center">
              <div>
                <ImageIcon className="h-4 w-4 mx-auto mb-1" />
                <p>JPG, PNG, JPEG</p>
                <p className="text-xs">(1+ файлов)</p>
              </div>
              <div>
                <FileArchive className="h-4 w-4 mx-auto mb-1" />
                <p>Несколько фото</p>
                <p className="text-xs">(пачка)</p>
              </div>
              <div>
                <Archive className="h-4 w-4 mx-auto mb-1" />
                <p>ZIP, RAR, 7z</p>
                <p className="text-xs">(1 архив)</p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Progress Indicator */}
      {isProcessing && processingProgress.total > 1 && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold">Обработка изображений</h4>
              <p className="text-sm text-muted-foreground">
                {processingProgress.current} из {processingProgress.total}
              </p>
            </div>
            <Progress
              value={(processingProgress.current / processingProgress.total) * 100}
              className="w-32"
            />
          </div>
        </Card>
      )}

      {/* Results Section */}
      {operation && currentImage && (
        <div className="space-y-4 max-w-6xl mx-auto">
          <Card className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-semibold">Результаты распознавания</h3>
                <p className="text-sm text-muted-foreground">
                  {TOOLSETS.find((t) => t.id === selectedToolset)?.name} •{" "}
                  {new Date(operation.timestamp).toLocaleString("ru-RU")}
                  {operation.images.length > 1 &&
                    ` • ${operation.images.length} изображений`}
                </p>
              </div>
              <Badge variant="default">Завершено</Badge>
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Левая часть - фото и статус */}
            <div className="lg:col-span-1 space-y-4">
              <Card className="p-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold">Статус анализа</h3>
                    <Badge
                      variant={
                        overallStatus === "Все найдены"
                          ? "default"
                          : overallStatus === "Требуется проверка"
                          ? "secondary"
                          : "destructive"
                      }
                    >
                      {overallStatus}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Найдено инструментов:
                      </span>
                      <span className="font-medium">{detectedCount}/11</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Средняя уверенность:
                      </span>
                      <span className="font-medium">
                        {(currentImage.imageConfidence * 100).toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Время обработки:
                      </span>
                      <span className="font-medium">
                        {currentImage.detectionTime}мс
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Порог распознавания:
                      </span>
                      <span className="font-medium">
                        {(recognitionThreshold * 100).toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{currentImage.fileName}</h3>
                    {operation.images.length > 1 && (
                      <span className="text-sm text-muted-foreground">
                        {currentImageIndex + 1} из {operation.images.length}
                      </span>
                    )}
                  </div>

                  <div
                    className="bg-muted/30 rounded-lg p-4 text-center aspect-video flex items-center justify-center cursor-pointer hover:bg-muted/40 transition-colors"
                    onClick={openImagePreview}
                  >
                    {currentImageUrl ? (
                      <img
                        src={currentImageUrl}
                        alt={currentImage.fileName}
                        className="max-h-full max-w-full object-contain rounded"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <ImageIcon className="h-12 w-12 mb-2 opacity-50" />
                        <span>Изображение не загружено</span>
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

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={openImagePreview}
                      className="flex items-center gap-2"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                        />
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
                  <h3 className="font-semibold">
                    Результаты для {currentImage.fileName}
                  </h3>
                  <div className="flex gap-2">
                    <Button onClick={exportToJSON} className="gap-2" size="sm">
                      <Download className="h-4 w-4" />
                      Экспорт
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setOperation(null);
                        setCurrentImageIndex(0);
                        setSelectedFiles(null);
                        setFileType(null);
                      }}
                    >
                      <RotateCcw className="h-4 w-4" />
                      Новое
                    </Button>
                  </div>
                </div>

                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-2">
                    {currentImage.results.map((tool) => {
                      const toolStatus = getToolStatus(
                        tool.confidence * 100,
                        recognitionThreshold * 100
                      );

                      return (
                        <div
                          key={tool.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-background border"
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {getStatusIcon(toolStatus)}
                            <span className="font-medium text-sm truncate">
                              {CLASS_MAP[tool.name]}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <div className="w-16">
                              <Progress
                                value={+(tool.confidence * 100).toFixed(2)}
                                className="h-1.5"
                              />
                            </div>
                            <span className="text-sm font-medium w-12 text-right">
                              {(tool.confidence * 100).toFixed(2)}%
                            </span>
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

          {operation.images.length > 1 && (
            <Card className="p-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-primary">
                    {operation.summary.totalImages}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Изображений
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary">
                    {operation.summary.totalDetectionTime}мс
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Общее время
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary">
                    {(operation.summary.averageMatch * 100).toFixed(2)}%
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Средняя уверенность
                  </div>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      <ImagePreviewModal />
    </div>
  );
};