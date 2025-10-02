const API = "http://localhost:8000";

export async function uploadSingle(file: File): Promise<any> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${API}/detect/single`, {
    method: "POST",
    body: fd,
  });
  if (!res.ok) {
    throw new Error(`Server responded with status ${res.status}`);
  }
  return res.json();
}

export async function uploadArchive(file: File): Promise<any> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${API}/detect/archive`, {
    method: "POST",
    body: fd,
  });
  if (!res.ok) {
    throw new Error(`Server responded with status ${res.status}`);
  }
  return res.json();
}

// Эта функция НЕ используется в одностаничном варианте (мы обрабатываем файлы по одному),
// но оставлена для полноты или будущего использования.
export async function uploadMultiple(files: FileList): Promise<any> {
  const fd = new FormData();
  Array.from(files).forEach((file) => {
    fd.append("files", file);
  });
  const res = await fetch(`${API}/detect/multiple`, {
    method: "POST",
    body: fd,
  });
  if (!res.ok) {
    throw new Error(`Server responded with status ${res.status}`);
  }
  return res.json();
}

export async function setConfidence(confidenceFraction: number): Promise<void> {
  // confidenceFraction: число от 0 до 1
  const res = await fetch(`${API}/settings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      confidence_threshold: confidenceFraction,
    }),
  });
  if (!res.ok) {
    throw new Error("Failed to update confidence threshold");
  }
  // Можно ничего не возвращать, но если сервер возвращает данные — можно вернуть res.json()
}