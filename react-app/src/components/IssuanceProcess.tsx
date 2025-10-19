import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, CheckCircle2, AlertCircle, XCircle, User, Package, Plus, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Employee, Tool, ToolSet, IssuanceRecord } from "@/types";

const MOCK_EMPLOYEES: Employee[] = [
  { id: "1", name: "Иванов Иван Петрович", position: "Авиатехник", department: "ТОиР" },
  { id: "2", name: "Петров Алексей Сергеевич", position: "Инженер", department: "ТОиР" },
  { id: "3", name: "Сидоров Владимир Михайлович", position: "Механик", department: "Комплектовка" },
];

const TOOL_SETS: ToolSet[] = [
  {
    id: "1",
    name: "Облегченный набор инструмента для ЦОТО УФ RRJ/737/32S",
    tools: [
      "Отвертка «-»",
      "Отвертка «+»",
      "Отвертка на смещенный крест",
      "Коловорот",
      "Пассатижи контровочные",
      "Пассатижи",
      "Шэрница",
      "Разводной ключ",
      "Открывашка для банок с маслом",
      "Ключ рожковый/накидной ¾",
      "Бокорезы"
    ]
  }
];

export const IssuanceProcess = () => {
  const [records, setRecords] = useState<IssuanceRecord[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [selectedToolSet, setSelectedToolSet] = useState<string>("1");
  const [currentView, setCurrentView] = useState<"list" | "issue" | "return">("list");
  const [currentRecordId, setCurrentRecordId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [issueImage, setIssueImage] = useState<string | null>(null);
  const [returnImage, setReturnImage] = useState<string | null>(null);
  const [analyzedTools, setAnalyzedTools] = useState<Tool[]>([]);
  const [detectionTime, setDetectionTime] = useState<number>(0);
  const issueFileInputRef = useRef<HTMLInputElement>(null);
  const returnFileInputRef = useRef<HTMLInputElement>(null);

  const createNewRecord = () => {
    if (!selectedEmployee) {
      toast.error("Выберите сотрудника");
      return;
    }
    const employee = MOCK_EMPLOYEES.find(e => e.id === selectedEmployee);
    const toolSet = TOOL_SETS.find(ts => ts.id === selectedToolSet);
    const newRecord: IssuanceRecord = {
      id: Date.now().toString(),
      employeeId: selectedEmployee,
      employeeName: employee?.name || "",
      toolSetId: selectedToolSet,
      toolSetName: toolSet?.name || "",
      issuedAt: new Date().toISOString(),
      issuedTools: [],
      status: "created",
    };
    setRecords(prev => [...prev, newRecord]);
    setDialogOpen(false);
    setSelectedEmployee("");
    toast.success("Наряд создан");
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>, isReturn: boolean = false) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imgData = e.target?.result as string;
        if (isReturn) {
          setReturnImage(imgData);
        } else {
          setIssueImage(imgData);
        }
        processImage(isReturn);
      };
      reader.readAsDataURL(file);
    }
  };

  const processImage = (isReturn: boolean = false) => {
    setIsProcessing(true);
    toast.info("Обработка изображения...");
    const startTime = Date.now();

    setTimeout(() => {
      const toolSet = TOOL_SETS.find(ts => ts.id === selectedToolSet);
      const mockResults: Tool[] = toolSet!.tools.map((toolName, index) => {
        const confidence = Math.random() * 100;
        let status: "detected" | "missing" | "uncertain";
        
        if (confidence >= 85) {
          status = "detected";
        } else if (confidence >= 60) {
          status = "uncertain";
        } else {
          status = "missing";
        }

        return {
          id: index + 1,
          name: toolName,
          confidence: Math.round(confidence),
          status,
          manuallyMarked: false
        };
      });

      const detectionTimeMs = Date.now() - startTime;
      setDetectionTime(detectionTimeMs);

      setAnalyzedTools(mockResults);

      setIsProcessing(false);

      toast.success(`Анализ завершен за ${detectionTimeMs}мс`);
    }, 1500);
  };

  const toggleManualMark = (toolId: number) => {
    setAnalyzedTools(prev => prev.map(tool => 
      tool.id === toolId ? { ...tool, manuallyMarked: !tool.manuallyMarked } : tool
    ));
  };

  const startIssue = (recordId: string) => {
    setCurrentRecordId(recordId);
    setCurrentView("issue");
    setIssueImage(null);
    setAnalyzedTools([]);
  };

  const startReturn = (recordId: string) => {
    setCurrentRecordId(recordId);
    setCurrentView("return");
    setReturnImage(null);
    setAnalyzedTools([]);
  };

  const confirmIssuance = () => {
    if (!currentRecordId) return;
    setRecords(prev => prev.map(record => 
      record.id === currentRecordId 
        ? { ...record, status: "issued", issuedTools: analyzedTools, issuedAt: new Date().toISOString() }
        : record
    ));
    toast.success("Инструменты выданы успешно!");
    setCurrentView("list");
    setCurrentRecordId(null);
    setIssueImage(null);
    setAnalyzedTools([]);
  };

  const confirmReturn = () => {
    if (!currentRecordId) return;
    const comparisonMatch = Math.round(Math.random() * 20 + 80);
    setRecords(prev => prev.map(record => 
      record.id === currentRecordId 
        ? { ...record, status: "completed", returnedTools: analyzedTools, returnedAt: new Date().toISOString(), matchPercentage: comparisonMatch }
        : record
    ));
    toast.success(`Инструменты приняты! Совпадение: ${comparisonMatch}%`);
    setCurrentView("list");
    setCurrentRecordId(null);
    setReturnImage(null);
    setAnalyzedTools([]);
  };

  const backToList = () => {
    setCurrentView("list");
    setCurrentRecordId(null);
    setIssueImage(null);
    setReturnImage(null);
    setAnalyzedTools([]);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "detected":
        return <CheckCircle2 className="h-5 w-5 text-success" />;
      case "uncertain":
        return <AlertCircle className="h-5 w-5 text-warning" />;
      case "missing":
        return <XCircle className="h-5 w-5 text-destructive" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "detected":
        return <Badge className="bg-success text-success-foreground">Обнаружен</Badge>;
      case "uncertain":
        return <Badge className="bg-warning text-warning-foreground">Требует проверки</Badge>;
      case "missing":
        return <Badge variant="destructive">Не найден</Badge>;
      default:
        return null;
    }
  };

  const currentRecord = currentRecordId ? records.find(r => r.id === currentRecordId) : null;

  return (
    <div className="space-y-6">
      {/* List View */}
      {currentView === "list" && (
        <>
          <Card className="p-6 bg-gradient-card shadow-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Наряды на выдачу инструментов</h2>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Plus className="h-5 w-5" />
                    Создать новый наряд
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Создание нового наряда</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Сотрудник</label>
                      <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите сотрудника" />
                        </SelectTrigger>
                        <SelectContent>
                          {MOCK_EMPLOYEES.map(emp => (
                            <SelectItem key={emp.id} value={emp.id}>
                              {emp.name} - {emp.position}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">Набор инструментов</label>
                      <Select value={selectedToolSet} onValueChange={setSelectedToolSet}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TOOL_SETS.map(ts => (
                            <SelectItem key={ts.id} value={ts.id}>
                              {ts.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Button className="w-full" onClick={createNewRecord}>
                      Создать наряд
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {records.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>Нет созданных нарядов</p>
                <p className="text-sm mt-2">Создайте новый наряд для начала работы</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Сотрудник</TableHead>
                    <TableHead>Набор</TableHead>
                    <TableHead>Дата создания</TableHead>
                    <TableHead>Статус</TableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((record) => {
                    const employee = MOCK_EMPLOYEES.find(e => e.id === record.employeeId);
                    const toolSet = TOOL_SETS.find(ts => ts.id === record.toolSetId);
                    return (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">
                          {employee?.name}
                          <div className="text-sm text-muted-foreground">{employee?.position}</div>
                        </TableCell>
                        <TableCell className="text-sm">{toolSet?.name}</TableCell>
                        <TableCell>{new Date(record.issuedAt).toLocaleString('ru-RU')}</TableCell>
                        <TableCell>
                          {record.status === "created" && <Badge variant="outline">Создан</Badge>}
                          {record.status === "issued" && <Badge className="bg-warning text-warning-foreground">Выдан</Badge>}
                          {record.status === "completed" && <Badge className="bg-success text-success-foreground">Завершен</Badge>}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            {record.status === "created" && (
                              <Button size="sm" onClick={() => startIssue(record.id)}>
                                Выдать
                              </Button>
                            )}
                            {record.status === "issued" && (
                              <Button size="sm" variant="outline" onClick={() => startReturn(record.id)}>
                                Сдать
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </Card>
        </>
      )}

      {/* Issue Process */}
      {currentView === "issue" && currentRecord && (
        <>
          <Card className="p-6 bg-gradient-card shadow-md">
            <Button variant="ghost" size="sm" onClick={backToList} className="mb-4 gap-2">
              <ArrowLeft className="h-4 w-4" />
              Назад к списку
            </Button>
            <h3 className="text-lg font-semibold mb-2">Выдача инструментов</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Сотрудник: {MOCK_EMPLOYEES.find(e => e.id === currentRecord.employeeId)?.name}
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Загрузите фото инструментов на столе
            </p>
            <input
              ref={issueFileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleFileUpload(e, false)}
              className="hidden"
            />
            <Button
              size="lg"
              onClick={() => issueFileInputRef.current?.click()}
              disabled={isProcessing}
              className="gap-2 w-full"
            >
              <Upload className="h-5 w-5" />
              Загрузить изображение
            </Button>
          </Card>

          {issueImage && (
            <Card className="p-6 bg-gradient-card shadow-md">
              <h3 className="text-lg font-semibold mb-4">Загруженное фото</h3>
              <img src={issueImage} alt="Выдаваемые инструменты" className="w-full max-h-96 object-contain rounded-lg mb-4" />
            </Card>
          )}

          {analyzedTools.length > 0 && (
            <Card className="p-6 bg-gradient-card shadow-md">
              <h3 className="text-lg font-semibold mb-4">Результаты анализа</h3>
              {detectionTime > 0 && (
                <p className="text-sm text-muted-foreground mb-4">
                  Время детекции: {detectionTime}мс
                </p>
              )}
              <div className="space-y-3">
                {analyzedTools.map((tool) => (
                  <div
                    key={tool.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-background border"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      {getStatusIcon(tool.status)}
                      <span className="font-medium">{tool.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-medium">{tool.confidence}%</span>
                      {getStatusBadge(tool.status)}
                      <Button
                        size="sm"
                        variant={tool.manuallyMarked ? "default" : "outline"}
                        onClick={() => toggleManualMark(tool.id)}
                      >
                        {tool.manuallyMarked ? "✓ Отмечено" : "Отметить вручную"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex gap-4">
                <Button size="lg" className="flex-1" onClick={confirmIssuance}>
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                  Подтвердить выдачу
                </Button>
                <Button size="lg" variant="outline" onClick={backToList}>
                  Отмена
                </Button>
              </div>
            </Card>
          )}
        </>
      )}

      {/* Return Process */}
      {currentView === "return" && currentRecord && (
        <>
          <Card className="p-6 bg-gradient-card shadow-md">
            <Button variant="ghost" size="sm" onClick={backToList} className="mb-4 gap-2">
              <ArrowLeft className="h-4 w-4" />
              Назад к списку
            </Button>
            <h3 className="text-lg font-semibold mb-2">Прием инструментов</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Сотрудник: {MOCK_EMPLOYEES.find(e => e.id === currentRecord.employeeId)?.name}
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              Загрузите фото возвращаемых инструментов
            </p>
            <input
              ref={returnFileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => handleFileUpload(e, true)}
              className="hidden"
            />
            <Button
              size="lg"
              onClick={() => returnFileInputRef.current?.click()}
              disabled={isProcessing}
              className="gap-2 w-full"
            >
              <Upload className="h-5 w-5" />
              Загрузить изображение
            </Button>
          </Card>

          {returnImage && (
            <Card className="p-6 bg-gradient-card shadow-md">
              <h3 className="text-lg font-semibold mb-4">Загруженное фото</h3>
              <img src={returnImage} alt="Возвращаемые инструменты" className="w-full max-h-96 object-contain rounded-lg mb-4" />
            </Card>
          )}

          {analyzedTools.length > 0 && (
            <Card className="p-6 bg-gradient-card shadow-md">
              <h3 className="text-lg font-semibold mb-4">Сравнение с выданными инструментами</h3>
              {detectionTime > 0 && (
                <p className="text-sm text-muted-foreground mb-4">
                  Время детекции: {detectionTime}мс
                </p>
              )}
              <div className="space-y-3">
                {analyzedTools.map((tool) => (
                  <div
                    key={tool.id}
                    className="flex items-center justify-between p-4 rounded-lg bg-background border"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      {getStatusIcon(tool.status)}
                      <span className="font-medium">{tool.name}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-medium">{tool.confidence}%</span>
                      {getStatusBadge(tool.status)}
                      <Button
                        size="sm"
                        variant={tool.manuallyMarked ? "default" : "outline"}
                        onClick={() => toggleManualMark(tool.id)}
                      >
                        {tool.manuallyMarked ? "✓ Отмечено" : "Отметить вручную"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex gap-4">
                <Button size="lg" className="flex-1" onClick={confirmReturn}>
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                  Подтвердить возврат
                </Button>
                <Button size="lg" variant="outline" onClick={backToList}>
                  Отмена
                </Button>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
};
