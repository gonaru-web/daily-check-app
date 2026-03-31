import React, { useEffect, useMemo, useState } from "react";

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

  useEffect(() => {
    const saved = localStorage.getItem("daily-check-history");
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch {
        setHistory({});
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("daily-check-history", JSON.stringify(history));
  }, [history]);

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

  const completedCount = dayData.tasks.filter((task) => task.done && task.text.trim()).length;
  const activeTasks = dayData.tasks.filter((task) => task.text.trim()).length;
  const progress = activeTasks ? Math.round((completedCount / activeTasks) * 100) : 0;

  const recentDays = useMemo(() => {
    return Object.keys(history)
      .sort((a, b) => (a < b ? 1 : -1))
      .slice(0, 7);
  }, [history]);

  const cardStyle = {
    background: "#fff",
    borderRadius: "24px",
    padding: "24px",
    boxShadow: "0 2px 12px rgba(0,0,0,0.05)",
  };

  const inputStyle = {
    width: "100%",
    border: "1px solid #e5e5e5",
    borderRadius: "16px",
    padding: "14px",
    fontSize: "14px",
    outline: "none",
    background: "#fff",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f5", padding: "16px" }}>
      <div style={{ maxWidth: "720px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={cardStyle}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h1 style={{ margin: 0, fontSize: "28px" }}>나의 데일리 체크 앱</h1>
              <p style={{ margin: "8px 0 0", color: "#666", fontSize: "14px" }}>
                복잡한 시간표 말고, 오늘 했는지 체크만 하자.
              </p>
            </div>
            <input
              type="date"
              value={today}
              onChange={(e) => setToday(e.target.value)}
              style={{ ...inputStyle, width: "auto", minWidth: "180px" }}
            />
          </div>
        </div>

        <div style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", gap: "12px", flexWrap: "wrap" }}>
            <h2 style={{ margin: 0, fontSize: "20px" }}>오늘 할 일</h2>
            <span style={{ background: "#f2f2f2", padding: "8px 12px", borderRadius: "999px", fontSize: "14px" }}>
              {completedCount}/{activeTasks || 0} 완료 ({progress}%)
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {dayData.tasks.map((task, index) => (
              <div
                key={index}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  border: "1px solid #eee",
                  borderRadius: "16px",
                  padding: "12px",
                  background: "#fff",
                }}
              >
                <input
                  type="checkbox"
                  checked={task.done}
                  onChange={() => toggleTask(index)}
                  style={{ width: "18px", height: "18px" }}
                />
                <input
                  type="text"
                  value={task.text}
                  onChange={(e) => updateTaskText(index, e.target.value)}
                  placeholder={`할 일 ${index + 1}`}
                  style={{
                    border: "none",
                    outline: "none",
                    width: "100%",
                    fontSize: "14px",
                    textDecoration: task.done ? "line-through" : "none",
                    color: task.done ? "#999" : "#222",
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        <div style={cardStyle}>
          <h2 style={{ marginTop: 0, fontSize: "20px" }}>내일 할 일 3가지</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {dayData.tomorrow.map((item, index) => (
              <input
                key={index}
                type="text"
                value={item}
                onChange={(e) => updateTomorrow(index, e.target.value)}
                placeholder={`내일 할 일 ${index + 1}`}
                style={inputStyle}
              />
            ))}
          </div>
        </div>

        <div style={cardStyle}>
          <h2 style={{ marginTop: 0, fontSize: "20px" }}>감사일기 10개</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {dayData.gratitude.map((item, index) => (
              <input
                key={index}
                type="text"
                value={item}
                onChange={(e) => updateGratitude(index, e.target.value)}
                placeholder={`감사한 것 ${index + 1}`}
                style={inputStyle}
              />
            ))}
          </div>
        </div>

        <div style={cardStyle}>
          <h2 style={{ marginTop: 0, fontSize: "20px" }}>짧은 메모</h2>
          <textarea
            value={dayData.memo}
            onChange={(e) => updateDayData({ ...dayData, memo: e.target.value })}
            placeholder="오늘 느낀 점 / 떠오른 아이디어 / 놓치기 싫은 생각"
            rows={4}
            style={{ ...inputStyle, resize: "vertical" }}
          />
        </div>

        <div style={cardStyle}>
          <h2 style={{ marginTop: 0, fontSize: "20px" }}>최근 기록</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {recentDays.length === 0 ? (
              <p style={{ color: "#666", fontSize: "14px", margin: 0 }}>아직 기록이 없어요.</p>
            ) : (
              recentDays.map((date) => {
                const item = history[date];
                const total = item.tasks.filter((t) => t.text.trim()).length;
                const done = item.tasks.filter((t) => t.done && t.text.trim()).length;

                return (
                  <div
                    key={date}
                    style={{
                      border: "1px solid #eee",
                      borderRadius: "16px",
                      padding: "14px",
                    }}
                  >
                    <div style={{ fontWeight: "600", fontSize: "14px" }}>{date}</div>
                    <div style={{ color: "#666", fontSize: "14px", marginTop: "4px" }}>
                      오늘 할 일 {done}/{total || 0} 완료
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}