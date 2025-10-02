// src/App.tsx
import React, { useRef, useState } from "react";
import { uploadSingle, uploadArchive, setConfidence } from "./api";

function resolveImageUrl(API: string, item: any) {
  if (!item) return null;
  const candidates = [item.image_url, item.image, item.image_path, item.output_path, item.path, item.url];
  for (const c of candidates) {
    if (!c || typeof c !== "string") continue;
    if (c.startsWith("http://") || c.startsWith("https://")) return c;
    if (c.startsWith("/")) return `${API}${c}`;
    return `${API}/${c}`.replace(/([^:]\/)\/+/, "$1");
  }
  return null;
}

const CLASS_MAP: Record<string, string> = {
  'Adjustable_wrench': 'Разводной ключ',
  'screwdriver_1': 'Отвертка "-"',
  'screwdriver_2': 'Отвертка "+"',
  'Offset_Phillips_screwdriver': 'Отвертка на смещенный крест',
  'Side_cutters': 'Бокорезы',
  'Shernica': 'Шэрница',
  'Safety_pliers': 'Пассатижи контровочные',
  'Pliers': 'Пассатижи',
  'Rotary_wheel': 'Коловорот',
  'Open_end_wrench': 'Ключ рожковый накидной 3/4',
  'Oil_can_opener': 'Открывашка для банок с маслом'
};

const COLOR_MAP: Record<string, string> = {
  "screwdriver_1": "blue",
  "screwdriver_2": "green",
  "Offset_Phillips": "orange",
  "Side_cutters": "purple",
  "Shernica": "pink",
  "Safety_pliers": "cyan",
  "Pliers": "yellow",
  "Rotary_wheel": "brown",
  "Open_end_wrench": "lime",
  "Oil_can_opener": "magenta",
  "Adjustable_wrench": "teal"
};
const allClasses = Object.keys(CLASS_MAP);
const API = "http://localhost:8000";

export default function App() {
  const [mode, setMode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confidence, setConfidenceState] = useState(0.5); // начальное значение — 0.5
  const [results, setResults] = useState<any[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const confidenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const goBack = () => {
    setMode(null);
    setResults([]);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setLoading(true);
    let accumulatedResults: any[] = [];

    try {
      if (mode === "single") {
        const data = await uploadSingle(files[0]);
        accumulatedResults = [{ filename: files[0].name, result: data }];
        setResults(accumulatedResults);
      } else if (mode === "multiple") {
        for (const file of Array.from(files)) {
          try {
            const data = await uploadSingle(file);
            accumulatedResults = [...accumulatedResults, { filename: file.name, result: data }];
            setResults([...accumulatedResults]);
          } catch (error) {
            accumulatedResults = [
              ...accumulatedResults,
              { filename: file.name, error: (error as Error).message || "Ошибка" }
            ];
            setResults([...accumulatedResults]);
          }
        }
      } else if (mode === "archive") {
        const data = await uploadArchive(files[0]);
        // Сервер возвращает { results: [ { filename, result }, ... ] }
        if (data && Array.isArray(data.results)) {
          setResults(data.results); // уже в нужном формате!
        } else {
          // На случай, если сервер вернул что-то неожиданное
          console.warn("Unexpected archive response format:", data);
          setResults([]);
          alert("Неожиданный формат ответа от сервера");
        }
      }
    } catch (e) {
      console.error(e);
      alert("Ошибка: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setLoading(false);
    }
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => handleFiles(e.target.files);
  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };
  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => e.preventDefault();

  const handleConfidenceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newConf = parseFloat(e.target.value) / 100;
    setConfidenceState(newConf);

    if (confidenceTimeoutRef.current) clearTimeout(confidenceTimeoutRef.current);
    confidenceTimeoutRef.current = setTimeout(async () => {
      try {
        await setConfidence(newConf);
      } catch (err) {
        console.error("Ошибка при обновлении порога:", err);
        alert("Не удалось сохранить порог уверенности");
      }
    }, 500);
  };

  const normalizeItems = (resultsList: any[]) => {
    return resultsList.map(r => r.result ? { ...r.result, original_name: r.filename || r.original_name } : r);
  };

  const displayItems = normalizeItems(results);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-5 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">ToolTrack</h1>
            <p className="text-xs text-gray-600 mt-0.5">Система автоматизации выдачи инструментов</p>
          </div>
          <div className="w-full sm:w-56">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Порог уверенности: <span className="font-semibold">{Math.round(confidence * 100)}%</span>
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={confidence * 100}
              onChange={handleConfidenceChange}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* Выбор режима — только если нет режима и нет результатов */}
        {!mode && results.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm p-5 sm:p-6">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 text-center">
              Выберите формат загрузки
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
            { key: "single", label: "Одно фото", desc: "Анализ одного изображения" },
            { key: "multiple", label: "Пачка фото", desc: "Несколько изображений по очереди" },
            { key: "archive", label: "ZIP архив", desc: "Архив с изображениями" }
            ].map((item) => (
            <button
                key={item.key}
                onClick={() => setMode(item.key)}
                className="py-3 px-4 text-center border border-gray-300 rounded-lg bg-white hover:bg-gray-50 hover:border-indigo-500 transition-colors"
            >
                <div className="font-medium text-gray-900">{item.label}</div>
                <div className="text-xs text-gray-500 mt-1">{item.desc}</div>
            </button>
            ))}
            </div>
          </div>
        )}

        {/* Зона загрузки — только если выбран режим и ещё нет результатов */}
        {mode && results.length === 0 && (
          <div className="space-y-5">
            <button
              onClick={goBack}
              className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors"
            >
              ← Назад к выбору режима
            </button>

            <div className="bg-white rounded-xl shadow-sm p-5">
              <h2 className="text-base font-semibold text-gray-900 mb-3">
                {mode === "single"
                  ? "Загрузите одно фото"
                  : mode === "multiple"
                  ? "Загрузите несколько фото"
                  : "Загрузите ZIP архив"}
              </h2>

              <div
                className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
                onDrop={onDrop}
                onDragOver={onDragOver}
                onClick={() => inputRef.current?.click()}
              >
                <p className="text-gray-700 text-sm font-medium">Перетащите файлы сюда</p>
                <p className="text-gray-500 text-xs mt-1">или нажмите, чтобы выбрать</p>
                <input
                  ref={inputRef}
                  type="file"
                  hidden
                  multiple={mode === "multiple"}
                  accept={mode === "archive" ? ".zip" : "image/*"}
                  onChange={onInputChange}
                />
              </div>

              <div className="mt-4 text-center">
                <button
                  onClick={() => inputRef.current?.click()}
                  className="inline-flex items-center px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  Выбрать файлы
                </button>
              </div>
            </div>

            {loading && (
              <div className="text-center py-4">
                <div className="inline-block animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-indigo-600 mb-2"></div>
                <p className="text-gray-600 text-sm">Обработка...</p>
              </div>
            )}
          </div>
        )}

        {/* Результаты — показываем всегда, если есть */}
        {results.length > 0 && (
          <div className="mt-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-5">
              <h2 className="text-xl font-bold text-gray-900">Результаты анализа</h2>
              <button
                onClick={() => {
                  setResults([]);
                  setMode(null);
                }}
                className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              >
                Новая загрузка
              </button>
            </div>

            {/* Легенда классов и цветов (фиксированные цвета) */}
            <div className="mb-6">
              <h3 className="font-semibold text-gray-800 text-sm mb-2">Легенда цветов по классам:</h3>
              <div className="mt-2 text-xs text-gray-500">
                <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-1 mt-1">
                  {allClasses.map((c, i) => {
                    const color = COLOR_MAP[c] || '#e5e7eb';
                    return (
                      <li key={c} className="flex items-center gap-2">
                        <span className="inline-block w-4 h-4 rounded border border-gray-400" style={{ background: color }}></span>
                        <span className="text-gray-700">{i + 1}. {CLASS_MAP[c] || c}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
            <div className="space-y-5">
              {displayItems.map((it, idx) => {
                const img = resolveImageUrl(API, it);
                const detections = it.detections || it.results || it.predictions || it.prediction || [];
                const foundMap: Record<string, number> = {};

                detections.forEach((d: any) => {
                  const cls = d.label || d.name || d.class || d.class_name || (typeof d[0] === 'string' ? d[0] : null);
                  const conf = d.confidence ?? d.conf ?? (d[1] ?? (d[2] ?? 0));
                  if (cls) foundMap[cls] = Math.max(foundMap[cls] || 0, conf || 0);
                });

                return (
                  <div key={idx} className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
                    <div className="p-4 sm:p-5">
                      <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-700 text-sm mb-2 truncate">
                            {it.original_name || `Файл ${idx + 1}`}
                          </h3>
                          {img ? (
                            <div className="border rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center group">
                              <img
                                src={img}
                                alt={it.original_name || `result-${idx}`}
                                className="max-h-96 w-full object-contain transition-transform duration-300 group-hover:scale-110 cursor-pointer"
                              />
                            </div>
                          ) : (
                            <div className="h-48 flex items-center justify-center bg-gray-100 border rounded-lg text-gray-500 text-sm italic">
                              Изображение недоступно
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 text-sm mb-2">Инструменты</h4>
                          <ul className="space-y-1">
                            {allClasses.map((c, i) => {
                              const found = !!foundMap[c];
                              const conf = foundMap[c] || 0;
                              const label = CLASS_MAP[c] || c;
                              return (
                                <li key={i} className="flex justify-between items-center py-1">
                                  <span className="text-gray-700 text-xs">{i + 1}. {label}</span>
                                  {found ? (
                                    <span className="px-1.5 py-0.5 text-[10px] font-medium bg-green-100 text-green-800 rounded">
                                      Найден ({Math.round(conf * 1000) / 10}%)
                                    </span>
                                  ) : (
                                    <span className="text-gray-400 text-xs">Нет</span>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}