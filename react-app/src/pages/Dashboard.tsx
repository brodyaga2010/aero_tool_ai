// src/pages/Dashboard.tsx
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Camera, 
  Settings, 
  History,
  Wrench,
  ClipboardList,
  Users,
  Package,
  ChevronLeft,
  Video,
  Brain
} from "lucide-react";
import { ToolRecognition } from "@/components/ToolRecognition";
import { ToolHistory } from "@/components/ToolHistory";
import { SettingsPanel } from "@/components/SettingsPanel";
import { IssuanceProcess } from "@/components/IssuanceProcess";
import { EmployeeManagement } from "@/components/EmployeeManagement";
import { ToolManagement } from "@/components/ToolManagement";
import { RecognitionHistoryComponent } from "@/components/RecognitionHistory";
import { ModelTrainingComponent } from "@/components/ModelTraining";
import { motion, AnimatePresence } from "framer-motion";
import { RecognitionHistory } from "@/types";

const Dashboard = () => {
  const [activeSection, setActiveSection] = useState<"recognition" | "issuance" | null>(null);
  const [activeTab, setActiveTab] = useState("main");
  
  // Состояние для хранения истории распознаваний
  const [recognitionHistory, setRecognitionHistory] = useState<RecognitionHistory[]>([]);
  
  // Состояние для сохранения предыдущей вкладки при переходе в настройки
  const [previousState, setPreviousState] = useState<{
    section: "recognition" | "issuance" | null;
    tab: string;
  }>({ section: null, tab: "main" });

  const recognitionTabsAndVideo = [
    { id: "recognition", label: "Фото", icon: Camera },
    // { id: "video-recognition", label: "Видео", icon: Video },
    { id: "training", label: "Дообучение", icon: Brain },
    { id: "history", label: "История", icon: History }
  ];

  const issuanceTabs = [
    { id: "issuance", label: "Выдача/Прием", icon: ClipboardList },
    { id: "issuance-history", label: "История", icon: History },
    { id: "employees", label: "Сотрудники", icon: Users },
    { id: "tools", label: "Инструменты", icon: Package }
  ];

  // Обработчик перехода в раздел
  const handleSectionChange = (section: "recognition" | "issuance") => {
    setActiveSection(section);
    // Автоматически устанавливаем первую вкладку раздела
    if (section === "recognition") {
      setActiveTab("recognition");
    } else {
      setActiveTab("issuance");
    }
  };

  // Обработчик перехода в настройки
  const handleSettingsClick = () => {
    // Сохраняем текущее состояние перед переходом в настройки
    setPreviousState({
      section: activeSection,
      tab: activeTab
    });
    setActiveTab("settings");
  };

  // Обработчик возврата из настроек
  const handleBackFromSettings = () => {
    // Восстанавливаем предыдущее состояние
    setActiveSection(previousState.section);
    setActiveTab(previousState.tab);
  };

  // Обработчик возврата на главную страницу
  const handleBackToMain = () => {
    setActiveSection(null);
    setActiveTab("main");
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gradient-primary flex items-center justify-center">
                <Wrench className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold">ToolTrack</h1>
                <p className="text-sm text-muted-foreground">Система учета инструментов</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="gap-2">
                <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
                Система активна
              </Badge>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={handleSettingsClick}
              >
                <Settings className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          {!activeSection && activeTab === "main" ? (
            <motion.div
              key="main"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="pt-8"
            >
              <div className="text-center mb-12">
                <h2 className="text-3xl font-bold mb-4">Добро пожаловать в ToolTrack</h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Выберите раздел для работы с системой распознавания и учета инструментов
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-8 w-full max-w-4xl mx-auto">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1"
                >
                  <Button
                    onClick={() => handleSectionChange("recognition")}
                    className="w-full h-32 flex flex-col gap-3 text-lg font-semibold bg-gradient-to-br from-blue-500 to-blue-700 text-white hover:from-blue-500 hover:to-blue-800 transition-all"
                    size="lg"
                  >
                    <Camera className="h-8 w-8" />
                    Распознавание
                  </Button>
                </motion.div>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1"
                >
                  <Button
                    onClick={() => handleSectionChange("issuance")}
                    className="w-full h-32 flex flex-col gap-3 text-lg font-semibold bg-gradient-to-br from-purple-500 to-purple-700 text-white hover:from-purple-500 hover:to-purple-800 transition-all"
                    size="lg"
                  >
                    <ClipboardList className="h-8 w-8" />
                    Выдача/Прием
                  </Button>
                </motion.div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="section"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <Button
                  variant="ghost"
                  onClick={() => {
                    if (activeTab === "settings") {
                      handleBackFromSettings();
                    } else {
                      handleBackToMain();
                    }
                  }}
                  className="w-fit"
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Назад
                </Button>
                
                {/* Показываем вкладки только если активен раздел распознавания или выдачи */}
                {activeSection && activeTab !== "settings" && (
                  <div className="flex flex-wrap gap-2 justify-center">
                    {(activeSection === "recognition" ? recognitionTabsAndVideo : issuanceTabs).map((tab) => {
                      const Icon = tab.icon;
                      return (
                        <Button
                          key={tab.id}
                          variant={activeTab === tab.id ? "default" : "outline"}
                          onClick={() => setActiveTab(tab.id)}
                          className="gap-2"
                        >
                          <Icon className="h-4 w-4" />
                          <span className="hidden sm:inline">{tab.label}</span>
                        </Button>
                      );
                    })}
                  </div>
                )}

              </div>
              
              <div className="mt-6">
                {/* Вкладки распознавания */}
                {activeTab === "recognition" && activeSection === "recognition" && (
                  <ToolRecognition />
                )}
                {/* {activeTab === "video-recognition" && activeSection === "recognition" && (
                  <div className="bg-card p-8 rounded-lg border text-center">
                    <h3 className="text-xl font-semibold mb-2">Распознавание видео</h3>
                    <p className="text-muted-foreground">Здесь будет функционал распознавания видео</p>
                  </div>
                )} */}
                {activeTab === "training" && activeSection === "recognition" && (
                  <ModelTrainingComponent />
                )}
                {activeTab === "history" && activeSection === "recognition" && (
                  <RecognitionHistoryComponent />
                )}
                
                {/* Вкладки выдачи/приема */}
                {activeTab === "issuance" && activeSection === "issuance" && <IssuanceProcess />}
                {activeTab === "issuance-history" && activeSection === "issuance" && <ToolHistory />}
                {activeTab === "employees" && activeSection === "issuance" && <EmployeeManagement />}
                {activeTab === "tools" && activeSection === "issuance" && <ToolManagement />}
                
                {/* Настройки - доступны из хедера на стартовой странице */}
                {activeTab === "settings" && <SettingsPanel />}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default Dashboard;