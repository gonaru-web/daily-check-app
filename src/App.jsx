import React, { useEffect, useMemo, useState } from "react";
import { db } from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

const USER_ID = "default-user";

const getToday = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const defaultDayData = () => ({
  tasks: Array.from({ length: 5 }, () => ({ text: "", done: false })),
  tomorrow: ["", "", ""],
  gratitude: Array.from({ length: 10 }, () => ""),
  memo: "",
});

export default function App() {
  const [today, setToday] = useState(getToday());
  const [history, setHistory] = useState({});
  const [loading, setLoading] = useState(true);
  const [saveMessage, setSaveMessage] = useState("불러오는 중...");

  // 🔥 Firebase에서 데이터 불러오기
  useEffect(() => {
    const loadData = async () => {
      const ref = doc(db, "dailyCheckUsers", USER_ID);
      const snapshot = await getDoc(ref);

      if (snapshot.exists()) {
        setHistory(snapshot.data().history || {});
      }

      setLoading(false);
      setSaveMessage("불러오기 완료");
    };

    loadData();
  }, []);

  // 🔥 Firebase에 자동 저장
  useEffect(() => {
    if (loading) return;

    const saveData = async () => {
      const ref = doc(db, "dailyCheckUsers", USER_ID);
      await setDoc(ref, { history }, { merge: true });
      setSaveMessage("자동 저장됨");
    };

    const timer = setTimeout(saveData, 500);
    return () => clearTimeout(timer);
  }, [history, loading]);

  const dayData = history[today] || defaultDayData();

  const updateDayData = (newData) => {
    setHistory((prev) => ({
      ...prev,
      [today]: newData,
    }));
  };

  const updateTaskText = (index, value) => {
    const updated = [...dayData.tasks];
    updated[index] = { ...updated[index], text: value };
    updateDayData({ ...dayData, tasks: updated });
  };

  const toggleTask = (index) => {
    const updated = [...dayData.tasks];
    updated[index] = { ...updated[index], done: !updated[index].done };
    updateDayData({ ...dayData, tasks: updated });
  };

  const updateTomorrow = (index, value) => {
    const updated = [...dayData.tomorrow];
    updated[index] = value;
    updateDayData({ ...dayData, tomorrow: updated });
  };

  const updateGratitude = (index, value) => {
    const updated = [...dayData.gratitude];
    updated[index] = value;
    updateDayData({ ...dayData, gratitude: updated });
  };

  const completedCount = dayData.tasks.filter((t) => t.done && t.text.trim()).length;
  const activeTasks = dayData.tasks.filter((t) => t.text.trim()).length;
  const progress = activeTasks ? Math.round((completedCount / activeTasks) * 100) : 0;

  const recentDays = useMemo(() => {
    return Object.keys(history)
      .sort((a, b) => (a < b ? 1 : -1))
      .slice(0, 7);
  }, [history]);

  if (loading) return <div style={{ padding: 20 }}>불러오는 중...</div>;

  return (
    <div style={{ padding: 16 }}>
      <h1>데일리 체크</h1>
      <p>{saveMessage}</p>

      <input type="date" value={today} onChange={(e) => setToday(e.target.value)} />

      <h2>오늘 할 일</h2>
      {dayData.tasks.map((task, i) => (
        <div key={i}>
          <input type="checkbox" checked={task.done} onChange={() => toggleTask(i)} />
          <input value={task.text} onChange={(e) => updateTaskText(i, e.target.value)} />
        </div>
      ))}

      <h2>내일 할 일</h2>
      {dayData.tomorrow.map((t, i) => (
        <input key={i} value={t} onChange={(e) => updateTomorrow(i, e.target.value)} />
      ))}

      <h2>감사일기</h2>
      {dayData.gratitude.map((g, i) => (
        <input key={i} value={g} onChange={(e) => updateGratitude(i, e.target.value)} />
      ))}

      <h2>메모</h2>
      <textarea
        value={dayData.memo}
        onChange={(e) => updateDayData({ ...dayData, memo: e.target.value })}
      />

      <h2>최근 기록</h2>
      {recentDays.map((d) => (
        <div key={d}>{d}</div>
      ))}
    </div>
  );
}
