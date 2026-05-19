import { ConfigProvider, Radio } from "antd";
import { NotificationOutlined, SearchOutlined } from "@ant-design/icons";
import { User } from "lucide-react";
import { useState } from "react";
import { MODEL_MODE } from "@/constants/homepage-data";

export default function TopBar() {
  const [selectedMode, setSelectedMode] = useState("explain");

  return (
    <ConfigProvider
      theme={{
        components: {
          Radio: {
            buttonBg: "#000000",
            buttonCheckedBg: "#1C398E66",
            buttonColor: "#9CA3AF",
            buttonSolidCheckedColor: "#ffffff",
            buttonSolidCheckedBg: "#9810FA",
            buttonSolidCheckedHoverBg: "#1C398E66",
            colorBorder: "transparent",
            fontSize: 10,
          },
        },
      }}
    >
      <div className="flex-1 mentor-navbar">
        <div className="flex items-center justify-between px-6 py-4 h-16">
          <div className="flex items-center gap-4">
            <div className="flex-1 flex justify-center">
              <Radio.Group
                optionType="button"
                buttonStyle="solid"
                value={selectedMode}
                onChange={(e) => setSelectedMode(e.target.value)}
              >
                {MODEL_MODE.map((mode) => (
                  <Radio.Button
                    key={mode.value}
                    value={mode.value}
                    className="px-5 text-center"
                  >
                    {mode.label}
                  </Radio.Button>
                ))}
              </Radio.Group>
            </div>

            <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-1">
              <button
                type="button"
                className="text-gray-400 hover:text-white transition"
              >
                <SearchOutlined size={12} />
              </button>

              <input
                className="flex-1 bg-transparent text-xs text-white placeholder:text-white/25 focus:outline-none"
                placeholder="Search or Ask AI…"
              />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <NotificationOutlined className="text-lg cursor-pointer hover:text-blue-500 transition" />

            <User className="w-5 h-5 cursor-pointer hover:text-blue-500 transition" />
          </div>
        </div>
      </div>
    </ConfigProvider>
  );
}