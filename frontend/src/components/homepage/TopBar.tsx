import { Input, Segmented } from "antd";
import { MODEL_MODE } from "../../constants/homepage-data";
import { NotificationOutlined, SearchOutlined } from '@ant-design/icons';
import { User } from "lucide-react";

export default function TopBar() {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Segmented<string>
          options={MODEL_MODE}
          onChange={(value) => {
            console.log(value);
          }}
        />
        <Input placeholder="Search or Ask AI…" prefix={<SearchOutlined />} />
      </div>

      <div className="flex items-center gap-4">
        <div>
          <NotificationOutlined />
        </div>
        <div>
          <User />
        </div>
      </div>


    </div>
  );
}