import React, { useEffect, useMemo, useState } from "react";
import { db } from "./firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

const USER_ID = "default-user";
const REMINDER_STORAGE_KEY = "daily-check-reminder";

const getToday = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const getCurrentTime = () => {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
};

const getTodayString = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const defaultDayData = () => ({
  tasks: Array.from({ length: 5 }, () => ({ text: "", done: false })),
  tomorrow: ["", "", ""],
  gratitude: Array.from({ length: 10 }, () => ""),
  memo: "",
  migratedFromYesterday: false,
});

const getYesterday = (dateString) => {
  const d = new Date(dateString);
  d.setDate(d.getDate() - 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const mergeTomorrowToTasks = (todayData, yesterdayData) => {
  const baseToday = todayData || defaultDayData();
  const carryItems = (yesterdayData?.tomorrow || [])
    .map((item) => item.trim())
    .filter(Boolean);

  if (carryItems.length === 0) return baseToday;

  const tasks = [...baseToday.tasks];
  let carryIndex = 0;

  for (let i = 0; i < tasks.length && carryIndex < carryItems.length; i++) {
    if (!tasks[i].text.trim()) {
      tasks[i] = { text: carryItems[carryIndex], done: false };
      carryIndex += 1;
    }
  }

  return {
    ...baseToday,
    tasks,
    migratedFromYesterday: true,
  };
};

const loadReminderSettings = () => {
  try {
    const saved = localStorage.getItem(REMINDER_STORAGE_KEY);
    return saved
      ? JSON.parse(saved)
      : { enabled: false, time: "", lastTriggeredDate: "" };
  } catch {
    return { enabled: false, time: "", lastTriggeredDate: "" };
  }
};

const saveReminderSettingsToStorage = (settings) => {
  localStorage.setItem(REMINDER_STORAGE_KEY, JSON.stringify(settings));
};

const requestNotificationPermission = async () => {
  if (!("Notification" in window)) return;

  if (Notification.permission === "default") {
    try {
      await Notification.requestPermission();
    } catch (error) {
      console.error("알림 권한 요청 실패:", error);
    }
  }
};

const showReminderNotification = () => {
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification("데일리 체크 알림", {
      body: "오늘 할 일을 확인할 시간이에요.",
    });
  } else {
    alert("오늘 할 일을 확인할 시간이에요.");
  }
};

export default function App() {
  const [today, setToday] = useState(getToday());
  const [history, setHistory] = useState({});
  const [loading, setLoading] = useState(true);
  const [saveMessage, setSaveMessage] = useState("불러오는 중...");
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState("");

  useEffect(() => {
    const loadData = async () => {
      try {
        const ref = doc(db, "dailyCheckUsers", USER_ID);
        const snapshot = await getDoc(ref);

        if (snapshot.exists()) {
          const data = snapshot.data();
          setHistory(data.history || {});
        } else {
          setHistory({});
        }

        setSaveMessage("불러오기 완료");
      } catch (error) {
        console.error("불러오기 오류:", error);
        setSaveMessage("불러오기 실패");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  useEffect(() => {
    const reminder = loadReminderSettings();
    setReminderEnabled(reminder.enabled);
    setReminderTime(reminder.time);
    requestNotificationPermission();
  }, []);

  useEffect(() => {
    if (loading) return;

    const saveData = async () => {
      try {
        const ref = doc(db, "dailyCheckUsers", USER_ID);
        await setDoc(ref, { history }, { merge: true });
        setSaveMessage("자동 저장됨");
      } catch (error) {
        console.error("저장 오류:", error);
        setSaveMessage("저장 실패");
      }
    };

    const timer = setTimeout(() => {
      saveData();
    }, 500);

    return () => clearTimeout(timer);
  }, [history, loading]);

  useEffect(() => {
    if (loading) return;

    setHistory((prev) => {
      const current = prev[today];
      if (current?.migratedFromYesterday) return prev;

      const yesterday = prev[getYesterday(today)];
      const updatedToday = mergeTomorrowToTasks(current, yesterday);

      const currentJson = JSON.stringify(current || defaultDayData());
      const updatedJson = JSON.stringify(updatedToday);

      if (currentJson === updatedJson) return prev;

      return {
        ...prev,
        [today]: updatedToday,
      };
    });
  }, [today, loading]);

  useEffect(() => {
    const timer = setInterval(() => {
      const settings = loadReminderSettings();

      if (!settings.enabled || !settings.time) return;

      const nowTime = getCurrentTime();
      const todayString = getTodayString();

      if (
        nowTime === settings.time &&
        settings.lastTriggeredDate !== todayString
      ) {
        showReminderNotification();

        saveReminderSettingsToStorage({
          ...settings,
          lastTriggeredDate: todayString,
        });
      }
    }, 30000);

    return () => clearInterval(timer);
  }, []);

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

  const saveReminder = async () => {
    const current = loadReminderSettings();

    const next = {
      ...current,
      enabled: reminderEnabled,
      time: reminderTime,
    };

    saveReminderSettingsToStorage(next);
    setSaveMessage("알람 설정 저장됨");

    await requestNotificationPermission();
  };

  const completedCount = dayData.tasks.filter(
    (task) => task.done && task.text.trim()
  ).length;
  const activeTasks = dayData.tasks.filter((task) => task.text.trim()).length;
  const progress = activeTasks
    ? Math.round((completedCount / activeTasks) * 100)
    : 0;

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

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f5f5f5",
        }}
      >
        <div style={{ ...cardStyle, maxWidth: "420px", textAlign: "center" }}>
          <h2 style={{ marginTop: 0 }}>데이터 불러오는 중</h2>
          <p style={{ marginBottom: 0, color: "#666" }}>잠시만 기다려 주세요.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f5f5f5", padding: "16px" }}>
      <div
        style={{
          maxWidth: "720px",
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <div style={cardStyle}>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "12px",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <h1 style={{ margin: 0, fontSize: "28px" }}>나의 데일리 체크 앱</h1>
              <p style={{ margin: "8px 0 0", color: "#666", fontSize: "14px" }}>
                복잡한 시간표 말고, 오늘 했는지 체크만 하자.
              </p>
              <p style={{ margin: "8px 0 0", color: "#666", fontSize: "13px" }}>
                상태: {saveMessage}
              </p>
            </div>
            <input
              type="date"
              value={today}
              onChange={(e) => setToday(e.target.value)}
              style={{ ...inputStyle, width: "auto", minWidth: "180px" }}
            />
          </div>

          <div
            style={{
              marginTop: "16px",
              display: "flex",
              flexWrap: "wrap",
              gap: "12px",
              alignItems: "center",
            }}
          >
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "14px",
                color: "#333",
              }}
            >
              <input
                type="checkbox"
                checked={reminderEnabled}
                onChange={(e) => setReminderEnabled(e.target.checked)}
              />
              알람 사용
            </label>

            <input
              type="time"
              value={reminderTime}
              onChange={(e) => setReminderTime(e.target.value)}
              style={{ ...inputStyle, width: "160px" }}
            />

            <button
              onClick={saveReminder}
              style={{
                border: "none",
                background: "#222",
                color: "#fff",
                borderRadius: "14px",
                padding: "12px 16px",
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              알람 저장
            </button>
          </div>
        </div>

        <div style={cardStyle}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "16px",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <h2 style={{ margin: 0, fontSize: "20px" }}>오늘 할 일</h2>
            <span
              style={{
                background: "#f2f2f2",
                padding: "8px 12px",
                borderRadius: "999px",
                fontSize: "14px",
              }}
            >
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
              <p style={{ color: "#666", fontSize: "14px", margin: 0 }}>
                아직 기록이 없어요.
              </p>
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
