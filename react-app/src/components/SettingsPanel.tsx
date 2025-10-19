// src/components/SettingsPanel.tsx
import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { SystemSettings, SystemInfo } from "@/types";

// API функции
const useSystemSettings = () => {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api2/settings');
        if (!response.ok) throw new Error('Failed to fetch settings');
        
        const data = await response.json();
        setSettings(data.SystemSettings);
        setSystemInfo(data.SystemInfo);
      } catch (err) {
        console.error('Ошибка загрузки настроек:', err);
        // Fallback на дефолтные настройки
        setSettings({
          recognition: { recognition: 85 },
          interface: { 
            autoCapture: false, 
            soundNotifications: true,
            showBoundingBoxes: true
          }
        });
        setSystemInfo({
          version: "1.0.0",
          model: "YOLOv8n Custom",
          totalTools: 11,
          lastUpdate: new Date().toISOString(),
        });
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const saveSettings = async (SystemSettings: SystemSettings) => {
    try {
      setSaving(true);
      // ИСПРАВЛЕНО: порт 8000 вместо 8001
      const response = await fetch('/api2/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ SystemSettings })
      });

      if (!response.ok) throw new Error('Failed to save settings');
      
      toast.success("Настройки сохранены");
    } catch (err) {
      console.error('Ошибка сохранения настроек:', err);
      toast.error("Ошибка сохранения настроек");
    } finally {
      setSaving(false);
    }
  };

  return { settings, systemInfo, loading, saving, saveSettings };
};

export const SettingsPanel = () => {
  const { settings, systemInfo, loading, saving, saveSettings } = useSystemSettings();
  const [localSettings, setLocalSettings] = useState<SystemSettings | null>(null);

  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
    }
  }, [settings]);

  const handleSave = async () => {
    if (localSettings) {
      await saveSettings(localSettings);
    }
  };

  const updateSetting = <K extends keyof SystemSettings>(
    section: K,
    key: keyof SystemSettings[K],
    value: SystemSettings[K][keyof SystemSettings[K]]
  ) => {
    if (localSettings) {
      setLocalSettings(prev => ({
        ...prev!,
        [section]: {
          ...prev![section],
          [key]: value
        }
      }));
    }
  };

  if (loading || !localSettings || !systemInfo) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="h-12 w-12 mx-auto mb-3 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <p className="text-muted-foreground">Загрузка настроек...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Основные настройки - 2/3 ширины */}
      <div className="lg:w-2/3 space-y-6">
        <Card className="p-5 bg-gradient-card shadow-md">
          <h3 className="text-lg font-semibold mb-4">Настройки распознавания</h3>
          
          <div className="space-y-6">
            {/* Порог уверенности - САМАЯ ВАЖНАЯ НАСТРОЙКА */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="confidenceThreshold" className="text-base font-medium">
                  Порог уверенности распознавания
                </Label>
                <span className="text-2xl font-bold text-primary">
                  {localSettings.recognition.recognition}%
                </span>
              </div>
              <Slider
                id="confidenceThreshold"
                min={50}
                max={100}
                step={1}
                value={[localSettings.recognition.recognition]}
                onValueChange={(value) => updateSetting('recognition', 'recognition', value[0])}
                className="py-3"
              />
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Более либерально</span>
                <span>Более строго</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Установите минимальный уровень уверенности для автоматического подтверждения инструментов. 
                При значениях ниже порога система потребует ручной проверки.
              </p>
            </div>

            {/* Группа переключателей
            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-t border-border">
                <div className="space-y-1">
                  <Label htmlFor="autoCapture" className="text-base font-medium">
                    Автоматическое распознавание
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Начинать анализ сразу после загрузки изображения
                  </p>
                </div>
                <Switch
                  id="autoCapture"
                  checked={localSettings.interface.autoCapture}
                  onCheckedChange={(checked) => updateSetting('interface', 'autoCapture', checked)}
                />
              </div>

              <div className="flex items-center justify-between py-3 border-t border-border">
                <div className="space-y-1">
                  <Label htmlFor="soundNotifications" className="text-base font-medium">
                    Звуковые оповещения
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Озвучивать результаты распознавания
                  </p>
                </div>
                <Switch
                  id="soundNotifications"
                  checked={localSettings.interface.soundNotifications}
                  onCheckedChange={(checked) => updateSetting('interface', 'soundNotifications', checked)}
                />
              </div>

              <div className="flex items-center justify-between py-3 border-t border-border">
                <div className="space-y-1">
                  <Label htmlFor="showBoundingBoxes" className="text-base font-medium">
                    Показывать рамки обнаружения
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Отображать границы найденных инструментов на изображениях
                  </p>
                </div>
                <Switch
                  id="showBoundingBoxes"
                  checked={localSettings.interface.showBoundingBoxes}
                  onCheckedChange={(checked) => updateSetting('interface', 'showBoundingBoxes', checked)}
                />
              </div>
            </div> */}
          </div>

          <div className="mt-6 pt-4 border-t border-border">
            <Button onClick={handleSave} disabled={saving} className="w-full" size="lg">
              {saving ? "Сохранение..." : "Применить настройки"}
            </Button>
          </div>
        </Card>
      </div>

      {/* Информация о системе - 1/3 ширины */}
      <div className="lg:w-1/3">
        <Card className="p-5 bg-gradient-card shadow-md h-fit">
          <h3 className="text-lg font-semibold mb-4">Информация о системе</h3>
          <div className="space-y-3">
            
            <div className="space-y-2 text-sm pt-3 border-t border-border">
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Версия системы</span>
                <span className="font-medium">{systemInfo.version}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Модель распознавания</span>
                <span className="font-medium">{systemInfo.model}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Количество инструментов</span>
                <span className="font-medium">{systemInfo.totalTools} шт.</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Последнее обновление</span>
                <span className="font-medium">
                  {new Date().toLocaleDateString('ru-RU')}
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground text-center">
                Статистика производительности доступна во вкладке "История"
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};