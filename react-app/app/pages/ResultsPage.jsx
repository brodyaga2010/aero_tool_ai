import React from "react";
import { useNavigate } from "react-router-dom";

function resolveImageUrl(API, item) {
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

export default function ResultsPage({ results }) {
  const API = "https://localhost:443/api";
  const navigate = useNavigate();

  if (!results) {
    return (
      <div className="container">
        <h2>Нет результатов</h2>
        <button className="btn" onClick={() => navigate("/")}>Вернуться</button>
      </div>
    );
  }

  let items = [];
  if (Array.isArray(results)) items = results;
  else if (Array.isArray(results.results)) {
    items = results.results.map(r => (r.result ? ({ ...r.result, original_name: r.filename || r.original_name }) : r));
  } else if (results.result) items = Array.isArray(results.result) ? results.result : [results.result];
  else items = [results];

  // mapping from model class names/ids to display names in Russian
  const CLASS_MAP = {
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

  return (
    <div className="container">
      <header style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
        <h2>Результаты</h2>
        <div>
          <button className="btn" onClick={() => navigate("/")}>Новая загрузка</button>
        </div>
      </header>

      <div className="results-list">
        {items.map((it, idx) => {
          const img = resolveImageUrl(API, it);
          // detection items may be array of objects with {class/confidence} or [class,conf,..]
          const detections = it.detections || it.results || it.predictions || it.prediction || [];
          // create a map of all classes with found true/false and confidence
          const allClasses = [
            'Adjustable_wrench','screwdriver_1','screwdriver_2','Offset_Phillips_screwdriver',
            'Side_cutters','Shernica','Safety_pliers','Pliers','Rotary_wheel','Open_end_wrench','Oil_can_opener'
          ];
          const foundMap = {};
          detections.forEach(d => {
            const cls = d.label || d.name || d.class || d.class_name || (typeof d[0] === 'string' ? d[0] : null);
            const conf = d.confidence ?? d.conf ?? (d[1] ?? (d[2] ?? 0));
            if (cls) foundMap[cls] = Math.max(foundMap[cls] || 0, conf || 0);
          });

          return (
            <div className="result-row" key={idx}>
              <div className="result-image">
                {img ? <img src={img} alt={it.original_name || `result-${idx}`} style={{width:'100%',height:'auto'}}/> : <div className="no-image">Изображение отсутствует</div>}
              </div>
              <div className="result-tools">
                <h4>Инструменты</h4>
                <ul>
                  {allClasses.map((c, i) => {
                    const found = !!foundMap[c];
                    const conf = foundMap[c] || 0;
                    const label = CLASS_MAP[c] || c;
                    return (
                      <li key={i} style={{display:'flex',justifyContent:'space-between',padding:'6px 0'}}>
                        <span>{i+1}. {label}</span>
                        <span>{found ? `Найден (${Math.round(conf*1000)/10}%)` : ' Нет'}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}