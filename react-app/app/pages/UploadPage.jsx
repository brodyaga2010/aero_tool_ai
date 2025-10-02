import React, { useRef, useState } from "react";
import { uploadSingle, uploadArchive, setConfidence } from "../api";

export default function UploadPage({ onResults }) {
  const [mode, setMode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [confidence, setConfidenceState] = useState(0.5);
  const inputRef = useRef();
  const confidenceTimeoutRef = useRef(null);

  function chooseMode(m) {
    setMode(m);
    if (inputRef.current) inputRef.current.value = "";
  }

  function goBack() {
    setMode(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleFiles(files) {
    if (!files || files.length === 0) return;
    setLoading(true);
    
    // Для режима "multiple" будем накапливать результаты
    let accumulatedResults = [];

    try {
      if (mode === "single") {
        const data = await uploadSingle(files[0]);
        onResults({ results: [{ filename: files[0].name, result: data }] });
      } else if (mode === "multiple") {
        // Обрабатываем файлы по одному и сразу обновляем результаты
        for (const file of Array.from(files)) {
          try {
            // eslint-disable-next-line no-await-in-loop
            const data = await uploadSingle(file);
            accumulatedResults = [...accumulatedResults, { filename: file.name, result: data }];
            // Отправляем накопленные результаты в App, который передаст их ResultsPage
            onResults({ results: accumulatedResults });
          } catch (error) {
            console.error(`Ошибка при обработке файла ${file.name}:`, error);
            accumulatedResults = [
              ...accumulatedResults,
              { filename: file.name, error: error.message || "Неизвестная ошибка" }
            ];
            onResults({ results: accumulatedResults });
          }
        }
      } else {
        // archive — single request, server returns all results
        const data = await uploadArchive(files[0]);
        onResults(data);
      }
    } catch (e) {
      console.error(e);
      alert("Ошибка: " + (e.message || e));
    } finally {
      setLoading(false);
    }
  }

  function onInputChange(e) {
    handleFiles(e.target.files);
  }

  function onDrop(e) {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  }

  // Функция для обновления порога уверенности с задержкой
  const handleConfidenceChange = (e) => {
    const newConfidence = parseFloat(e.target.value) / 100;
    setConfidenceState(newConfidence);

    // Очищаем предыдущий таймер
    if (confidenceTimeoutRef.current) {
      clearTimeout(confidenceTimeoutRef.current);
    }

    // Устанавливаем новый таймер
    confidenceTimeoutRef.current = setTimeout(async () => {
      try {
        await setConfidence(newConfidence);
        console.log("Порог уверенности обновлен:", newConfidence);
      } catch (error) {
        console.error("Ошибка при обновлении порога уверенности:", error);
        alert("Ошибка при обновлении порога уверенности: " + (error.message || error));
      }
    }, 1000); // Задержка 1 секунда
  };

  return (
    <div className="page container">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 py-6 px-4 bg-white rounded-lg shadow mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">ToolTrack</h1>
          <p className="text-gray-600 mt-1">Система автоматизации выдачи инструментов</p>
        </div>
        <div className="w-full sm:w-64">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Порог уверенности: {Math.round(confidence*100)}%
          </label>
          <input 
            type="range" 
            min="0" 
            max="100" 
            value={confidence*100} 
            onChange={handleConfidenceChange} 
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
        </div>
      </header>
      
      {!mode ? (
        <div className="format-selection bg-white rounded-lg shadow p-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">Выберите формат загрузки</h1>
          <div className="format-buttons">
            <button 
              className="btn w-full sm:w-auto"
              onClick={() => chooseMode("single")}
            >
              Одно фото
            </button>
            <button 
              className="btn w-full sm:w-auto"
              onClick={() => chooseMode("multiple")}
            >
              Пачка фото
            </button>
            <button 
              className="btn w-full sm:w-auto"
              onClick={() => chooseMode("archive")}
            >
              ZIP архив
            </button>
          </div>
        </div>
      ) : (
        <div className="upload-section">
          <button 
            className="back flex items-center text-sm"
            onClick={goBack}
          >
            ← Назад
          </button>
          
          <div className="bg-white rounded-lg shadow p-6 mt-4">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {mode === "single" 
                ? "Загрузите одно фото" 
                : mode === "multiple" 
                  ? "Загрузите несколько фото" 
                  : "Загрузите ZIP архив"}
            </h2>

            <div
              className="upload-zone"
              onDrop={onDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => inputRef.current && inputRef.current.click()}
            >
              <p className="text-gray-600">
                Перетащите сюда файлы или нажмите для выбора
              </p>
              <input
                ref={inputRef}
                type="file"
                hidden
                multiple={mode === "multiple"}
                accept={mode === "archive" ? ".zip" : "image/*"}
                onChange={onInputChange}
              />
            </div>

            <div className="mt-6">
              <button 
                className="btn"
                onClick={() => inputRef.current && inputRef.current.click()}
              >
                Выбрать файлы
              </button>
            </div>
          </div>

          {loading && (
            <div className="loading mt-6 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600 mb-2"></div>
              <p className="text-lg font-medium text-blue-600">Обработка...</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}