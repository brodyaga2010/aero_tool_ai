import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, Clock } from "lucide-react";

interface HistoryEntry {
  id: number;
  engineer: string;
  action: "issue" | "return";
  timestamp: string;
  matchPercentage: number;
  status: "success" | "warning" | "pending";
}

const MOCK_HISTORY: HistoryEntry[] = [
  {
    id: 1,
    engineer: "Иванов И.П.",
    action: "return",
    timestamp: "2025-01-15 14:32",
    matchPercentage: 95,
    status: "success"
  },
  {
    id: 2,
    engineer: "Петров А.С.",
    action: "issue",
    timestamp: "2025-01-15 13:15",
    matchPercentage: 100,
    status: "success"
  },
  {
    id: 3,
    engineer: "Сидоров В.М.",
    action: "return",
    timestamp: "2025-01-15 12:45",
    matchPercentage: 78,
    status: "warning"
  },
  {
    id: 4,
    engineer: "Козлов Д.Н.",
    action: "issue",
    timestamp: "2025-01-15 11:20",
    matchPercentage: 92,
    status: "success"
  },
  {
    id: 5,
    engineer: "Морозов К.А.",
    action: "return",
    timestamp: "2025-01-15 10:05",
    matchPercentage: 88,
    status: "success"
  }
];

export const ToolHistory = () => {
  const getActionText = (action: string) => {
    return action === "issue" ? "Выдача" : "Возврат";
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "success":
        return <CheckCircle2 className="h-5 w-5 text-success" />;
      case "warning":
        return <AlertCircle className="h-5 w-5 text-warning" />;
      case "pending":
        return <Clock className="h-5 w-5 text-muted-foreground" />;
      default:
        return null;
    }
  };

  return (
    <Card className="p-6 bg-gradient-card shadow-md">
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-2">История операций</h3>
        <p className="text-sm text-muted-foreground">
          Последние операции выдачи и возврата инструментов
        </p>
      </div>

      <div className="space-y-3">
        {MOCK_HISTORY.map((entry) => (
          <div
            key={entry.id}
            className="flex items-center justify-between p-4 rounded-lg bg-background border transition-all hover:shadow-sm"
          >
            <div className="flex items-center gap-4 flex-1">
              {getStatusIcon(entry.status)}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">{entry.engineer}</span>
                  <Badge variant={entry.action === "issue" ? "secondary" : "outline"}>
                    {getActionText(entry.action)}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{entry.timestamp}</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold mb-1">
                {entry.matchPercentage}%
              </div>
              <p className="text-xs text-muted-foreground">совпадение</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-6 border-t">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-primary">47</div>
            <p className="text-sm text-muted-foreground">Операций сегодня</p>
          </div>
          <div>
            <div className="text-2xl font-bold text-success">93%</div>
            <p className="text-sm text-muted-foreground">Средняя точность</p>
          </div>
          <div>
            <div className="text-2xl font-bold text-warning">2</div>
            <p className="text-sm text-muted-foreground">Требуют проверки</p>
          </div>
        </div>
      </div>
    </Card>
  );
};
