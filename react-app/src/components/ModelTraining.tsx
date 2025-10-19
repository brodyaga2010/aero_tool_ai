// src/components/ModelTraining.tsx
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { 
  Brain, 
  Clock, 
  RefreshCw,
  FileArchive,
  Database,
  Play,
  History,
  Upload,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TrainingStatus {
  status: "idle" | "uploading" | "training" | "completed" | "error";
  progress: number;
  message: string;
  trainingId?: string;
  startTime?: string;
  endTime?: string;
}

export const ModelTrainingComponent = () => {
  const [toolsetName, setToolsetName] = useState("");
  const [datasetFile, setDatasetFile] = useState<File | null>(null);
  const [annotationFile, setAnnotationFile] = useState<File | null>(null);
  const [trainingStatus, setTrainingStatus] = useState<TrainingStatus>({
    status: "idle",
    progress: 0,
    message: "Готов к загрузке данных"
  });
  const [trainingHistory, setTrainingHistory] = useState<any[]>([]);
  
  const datasetInputRef = useRef<HTMLInputElement>(null);
  const annotationInputRef = useRef<HTMLInputElement>(null);
  
  // Список доступных наборов инструментов
  const availableToolsets = [
    { id: "basic", name: "Базовый набор" },
    { id: "construction", name: "Строительные инструменты" },
    { id: "automotive", name: "Автомобильные инструменты" },
    { id: "custom", name: "Пользовательский набор" }
  ];

  // Наборы инструментов для распознавания (пока только один)
  const TOOLSETS = [
      { 
          id: "lightweight", 
          name: "Облегченный набор инструмента для ЦОТО УФ RRJ/737/32S", 
          description: "Специализированный набор для авиационного инструмента"
      }
  ];

  // Тестовый пример для истории
  const mockTrainingHistory = [
    {
      id: "train_001",
      toolset: "Базовый набор",
      status: "completed",
      progress: 100,
      message: "Дообучение завершено успешно",
      startTime: "2024-01-15T10:30:00Z",
      endTime: "2024-01-15T11:45:00Z"
    },
    {
      id: "train_002",
      toolset: "Строительные инструменты",
      status: "training",
      progress: 65,
      message: "Обучение на эпохе 15 из 25",
      startTime: "2024-01-16T09:15:00Z"
    }
  ];

  // Функция для отправки данных на дообучение
  const handleTrainingSubmit = async () => {
    if (!toolsetName) {
      toast.error("Выберите набор инструментов");
      return;
    }
    
    if (!datasetFile || !annotationFile) {
      toast.error("Загрузите оба файла: датасет и разметку");
      return;
    }

    setTrainingStatus({
      status: "uploading",
      progress: 0,
      message: "Загрузка файлов на сервер..."
    });

    const formData = new FormData();
    formData.append("archive1", datasetFile);
    formData.append("archive2", annotationFile);
    formData.append("toolset", toolsetName);

    try {
      const response = await fetch("http://192.168.193.130:8002/api/extract-archives", {
        method: "POST",
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Ошибка сервера: ${response.status}`);
      }

      const data = await response.json();
      
      setTrainingStatus({
        status: "training",
        progress: 10,
        message: "Начато дообучение модели",
        trainingId: data.trainingId,
        startTime: new Date().toISOString()
      });

      toast.success("Данные успешно отправлены на дообучение");
      
      // Начинаем отслеживание статуса
      startStatusPolling(data.trainingId);
      
    } catch (error) {
      setTrainingStatus({
        status: "error",
        progress: 0,
        message: `Ошибка: ${error instanceof Error ? error.message : "Неизвестная ошибка"}`
      });
      toast.error("Ошибка при отправке данных");
    }
  };

  // Функция для проверки статуса обучения
  const checkTrainingStatus = async (trainingId: string) => {
    try {
      const response = await fetch(`http://192.168.193.130:8002/api/training/status/${trainingId}`);
      
      if (!response.ok) {
        throw new Error(`Ошибка получения статуса: ${response.status}`);
      }

      const data = await response.json();
      
      setTrainingStatus(prev => ({
        ...prev,
        progress: data.progress || prev.progress,
        message: data.message || prev.message,
        status: data.status || prev.status
      }));

      // Если обучение завершено, останавливаем опрос
      if (data.status === "completed" || data.status === "error") {
        setTrainingStatus(prev => ({
          ...prev,
          endTime: new Date().toISOString(),
          progress: data.status === "completed" ? 100 : prev.progress
        }));
        
        if (data.status === "completed") {
          toast.success("Дообучение модели завершено успешно!");
        }
        
        return true; // Останавливаем опрос
      }
      
      return false; // Продолжаем опрос
      
    } catch (error) {
      console.error("Ошибка проверки статуса:", error);
      return false;
    }
  };

  // Функция для запуска периодической проверки статуса
  const startStatusPolling = (trainingId: string) => {
    const pollInterval = setInterval(async () => {
      const shouldStop = await checkTrainingStatus(trainingId);
      if (shouldStop) {
        clearInterval(pollInterval);
      }
    }, 30000);

    return () => clearInterval(pollInterval);
  };

  // Ручная проверка статуса
  const handleManualStatusCheck = async () => {
    if (trainingStatus.trainingId) {
      await checkTrainingStatus(trainingStatus.trainingId);
      toast.info("Статус обновлен");
    }
  };

  // Загрузка истории дообучений
  useEffect(() => {
    const loadTrainingHistory = async () => {
      try {
        const response = await fetch("http://192.168.193.130:8002/api/training/history");
        if (response.ok) {
          const history = await response.json();
          setTrainingHistory(history);
        } else {
          setTrainingHistory(mockTrainingHistory);
        }
      } catch (error) {
        console.error("Ошибка загрузки истории:", error);
        setTrainingHistory(mockTrainingHistory);
      }
    };

    loadTrainingHistory();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "training": return <RefreshCw className="h-4 w-4 text-orange-500 animate-spin" />;
      case "error": return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "uploading": return <Upload className="h-4 w-4 text-blue-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "idle": return <Badge variant="outline">Ожидание</Badge>;
      case "uploading": return <Badge className="bg-blue-500">Загрузка</Badge>;
      case "training": return <Badge className="bg-orange-500">Обучение</Badge>;
      case "completed": return <Badge className="bg-green-500">Завершено</Badge>;
      case "error": return <Badge variant="destructive">Ошибка</Badge>;
      default: return <Badge variant="outline">Неизвестно</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Форма дообучения */}
      <Card className="p-6 bg-gradient-card shadow-md">
        <div className="flex items-center gap-3 mb-6">
          <Brain className="h-6 w-6 text-primary" />
          <h2 className="text-xl font-semibold">Дообучение модели</h2>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Выбор набора инструментов */}
          <div className="lg:col-span-1 space-y-2">
            <Label htmlFor="toolset">Набор инструментов</Label>
            <Select value={toolsetName} onValueChange={setToolsetName}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите набор" />
              </SelectTrigger>
              <SelectContent>
                {TOOLSETS.map((toolset) => (
                  <SelectItem key={toolset.id} value={toolset.id}>
                    {toolset.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Датасет изображений */}
          <div className="space-y-2">
            <Label>Датасет изображений</Label>
            <input
              ref={datasetInputRef}
              type="file"
              accept=".zip,.tar.gz"
              onChange={(e) => setDatasetFile(e.target.files?.[0] || null)}
              className="hidden"
            />
            <Button
              variant="outline"
              className="w-full gap-2 h-10"
              onClick={() => datasetInputRef.current?.click()}
            >
              <Database className="h-4 w-4" />
              {datasetFile ? datasetFile.name : "Загрузить датасет"}
            </Button>
          </div>
          
          {/* Разметка данных */}
          <div className="space-y-2">
            <Label>Разметка данных</Label>
            <input
              ref={annotationInputRef}
              type="file"
              accept=".zip,.tar.gz"
              onChange={(e) => setAnnotationFile(e.target.files?.[0] || null)}
              className="hidden"
            />
            <Button
              variant="outline"
              className="w-full gap-2 h-10"
              onClick={() => annotationInputRef.current?.click()}
            >
              <FileArchive className="h-4 w-4" />
              {annotationFile ? annotationFile.name : "Загрузить разметку"}
            </Button>
          </div>
          
          {/* Кнопка запуска */}
          <div className="space-y-2">
            <Label>&nbsp;</Label>
            <Button
              onClick={handleTrainingSubmit}
              disabled={trainingStatus.status === "uploading" || trainingStatus.status === "training"}
              className="w-full gap-2 h-10"
            >
              <Play className="h-4 w-4" />
              Начать дообучение
            </Button>
          </div>
        </div>
      </Card>

      {/* Статус обучения и история в одной строке */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Статус обучения */}
        <Card className="p-4 bg-gradient-card shadow-md">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">Статус обучения</h3>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualStatusCheck}
              disabled={!trainingStatus.trainingId}
              className="gap-1 h-8"
            >
              <RefreshCw className="h-3 w-3" />
              Обновить
            </Button>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Статус:</span>
              {getStatusBadge(trainingStatus.status)}
            </div>
            
            <div className="text-sm">
              <span className="font-medium">Сообщение:</span>
              <p className="text-muted-foreground mt-1">{trainingStatus.message}</p>
            </div>
            
            {trainingStatus.trainingId && (
              <div className="text-sm">
                <span className="font-medium">ID:</span>
                <span className="text-muted-foreground ml-2 text-xs font-mono">{trainingStatus.trainingId}</span>
              </div>
            )}
          </div>
        </Card>

        {/* История дообучений */}
        <Card className="p-4 bg-gradient-card shadow-md">
          <div className="flex items-center gap-2 mb-3">
            <History className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">История дообучений</h3>
            <Badge variant="outline" className="text-xs">{trainingHistory.length}</Badge>
          </div>
          
          {trainingHistory.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Brain className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">История пуста</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {trainingHistory.map((training) => (
                <div key={training.id} className="p-2 border rounded text-sm">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(training.status)}
                      <span className="font-medium">{training.toolset}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(training.startTime).toLocaleDateString('ru-RU')}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{training.message}</span>
                    <span>{training.progress}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};