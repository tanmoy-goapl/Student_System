"use client";

import { ConfigProvider, Radio } from "antd";
import { NotificationOutlined, SearchOutlined } from "@ant-design/icons";
import { User, PanelRightOpen, PanelRightClose } from "lucide-react";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { MODEL_MODE } from "@/constants/homepage-data";

interface TopBarProps {
  rightOpen?: boolean;
  onRightOpenChange?: (open: boolean) => void;
}

export default function TopBar({ rightOpen = false, onRightOpenChange }: TopBarProps) {
  const [selectedMode, setSelectedMode] = useState("explain");
  const pathname = usePathname();
  const isHomePage = pathname === "/";
  const isChatPage = pathname?.startsWith("/chat");

  return (
    <ConfigProvider
      theme={{
        components: {
          Radio: {
            buttonBg: "#000000",
            buttonCheckedBg: "#5B5FFF33",
            buttonColor: "#9CA3AF",
            buttonSolidCheckedColor: "#ffffff",
            buttonSolidCheckedBg: "#5B5FFF",
            buttonSolidCheckedHoverBg: "#4c4fdb",
            colorBorder: "transparent",
            fontSize: 10,
          },
        },
      }}
    >
      <div className="flex-1 mentor-navbar h-full">
        <div className="flex items-center justify-between px-6 py-4 h-full">
          {/* LEFT: Mode toggle (centered) */}
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

          {/* CENTER: Search bar (only on home page) */}
          {isHomePage && (
            <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-4 py-1 mx-6">
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
          )}

          {/* RIGHT: Icons + Insights button */}
          <div className="flex items-center gap-4">
            <NotificationOutlined className="text-lg cursor-pointer hover:text-blue-500 transition" />

            <User className="w-5 h-5 cursor-pointer hover:text-blue-500 transition" />

            {/* Insights button — only on chat page */}
            {isChatPage && (
              <button
                onClick={() => onRightOpenChange?.(!rightOpen)}
                title={rightOpen ? "Close insights panel" : "Open insights panel"}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all
                  ${rightOpen
                    ? "bg-blue-500/20 border-blue-500/40 text-blue-300"
                    : "bg-white/5 border-white/10 text-white/50 hover:text-white hover:bg-white/10"
                  }`}
              >
                {rightOpen
                  ? <PanelRightClose size={14} />
                  : <PanelRightOpen size={14} />
                }
                <span className="hidden sm:inline">{rightOpen ? "Close" : "Insights"}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </ConfigProvider>
  );
}
