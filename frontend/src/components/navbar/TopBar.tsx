import { Input, Segmented } from "antd";
import { MODEL_MODE } from "../../constants/homepage-data";
import { NotificationOutlined, SearchOutlined } from '@ant-design/icons';
import { User } from "lucide-react";

export default function TopBar() {
  return (
    <div className="fixed top-0 left-55 right-0 z-40 bg-gradient-to-b from-slate-900 to-slate-950">
      <div className="flex items-center justify-between px-6 py-4 h-16">
        <div className="flex items-center gap-4">
          <Segmented<string>
            options={MODEL_MODE}
            onChange={(value) => {
              console.log(value);
            }}
          />
          <Input 
            placeholder="Search or Ask AI…" 
            prefix={<SearchOutlined />}
            className="w-64"
          />
        </div>

        <div className="flex items-center gap-6">
          <NotificationOutlined className="text-lg cursor-pointer hover:text-blue-500 transition" />
          <User className="w-5 h-5 cursor-pointer hover:text-blue-500 transition" />
        </div>
      </div>
    </div>
  );
}