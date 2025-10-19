import { Card } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { RecognitionHistory } from "@/types";

interface RecognitionStatisticsProps {
  history: RecognitionHistory[];
}

const COLORS = ["#10b981", "#f59e0b", "#ef4444"];

export const RecognitionStatistics = ({ history }: RecognitionStatisticsProps) => {
  // Подготовка данных для графиков
  const totalImages = history.reduce((sum, h) => sum + h.imageCount, 0);
  
  const avgDetectionTime = history.length > 0
    ? Math.round(history.reduce((sum, h) => sum + h.detectionTime, 0) / history.length)
    : 0;
    
  const avgAccuracy = history.length > 0
    ? Math.round(history.reduce((sum, h) => sum + h.overallMatch, 0) / history.length)
    : 0;

  // Данные для гистограммы по точности
  const accuracyData = history.map((entry, index) => ({
    name: `#${index + 1}`,
    accuracy: entry.overallMatch,
    time: entry.detectionTime
  }));

  // Данные для круговой диаграммы статусов
  const statusCounts = {
    success: history.filter(h => h.overallMatch >= 85).length,
    warning: history.filter(h => h.overallMatch >= 70 && h.overallMatch < 85).length,
    error: history.filter(h => h.overallMatch < 70).length
  };

  const statusData = [
    { name: "Все найдены", value: statusCounts.success },
    { name: "Требуется проверка", value: statusCounts.warning },
    { name: "Ручной пересчет", value: statusCounts.error }
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-5 bg-gradient-card shadow-md">
          <div className="text-center">
            <div className="text-3xl font-bold text-primary">{history.length}</div>
            <p className="text-sm text-muted-foreground mt-1">Всего операций</p>
          </div>
        </Card>
        
        <Card className="p-5 bg-gradient-card shadow-md">
          <div className="text-center">
            <div className="text-3xl font-bold text-primary">{totalImages}</div>
            <p className="text-sm text-muted-foreground mt-1">Всего изображений</p>
          </div>
        </Card>
        
        <Card className="p-5 bg-gradient-card shadow-md">
          <div className="text-center">
            <div className="text-3xl font-bold text-primary">{avgDetectionTime}мс</div>
            <p className="text-sm text-muted-foreground mt-1">Среднее время</p>
          </div>
        </Card>
        
        <Card className="p-5 bg-gradient-card shadow-md">
          <div className="text-center">
            <div className="text-3xl font-bold text-primary">{avgAccuracy}%</div>
            <p className="text-sm text-muted-foreground mt-1">Средняя точность</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-5 bg-gradient-card shadow-md">
          <h3 className="text-lg font-semibold mb-4">Точность по операциям</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={accuracyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 100]} />
                <Tooltip 
                  formatter={(value) => [`${value}%`, 'Точность']}
                  labelFormatter={(value) => `Операция ${value}`}
                />
                <Bar dataKey="accuracy" name="Точность" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5 bg-gradient-card shadow-md">
          <h3 className="text-lg font-semibold mb-4">Распределение статусов</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [value, 'Операций']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="p-5 bg-gradient-card shadow-md">
        <h3 className="text-lg font-semibold mb-4">Детальная статистика</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Операция</th>
                <th className="text-left py-2">Дата</th>
                <th className="text-left py-2">Файлов</th>
                <th className="text-left py-2">Время (мс)</th>
                <th className="text-left py-2">Точность</th>
                <th className="text-left py-2">Статус</th>
              </tr>
            </thead>
            <tbody>
              {history.map((entry, index) => (
                <tr key={entry.id} className="border-b hover:bg-muted/50">
                  <td className="py-3">#{index + 1}</td>
                  <td className="py-3">{entry.timestamp}</td>
                  <td className="py-3">{entry.imageCount}</td>
                  <td className="py-3">{entry.detectionTime}</td>
                  <td className="py-3">{entry.overallMatch}%</td>
                  <td className="py-3">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      entry.overallMatch >= 85 
                        ? "bg-success text-success-foreground" 
                        : entry.overallMatch >= 70 
                          ? "bg-warning text-warning-foreground" 
                          : "bg-destructive text-destructive-foreground"
                    }`}>
                      {entry.overallMatch >= 85 
                        ? "Все найдены" 
                        : entry.overallMatch >= 70 
                          ? "Требуется проверка" 
                          : "Ручной пересчет"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};